import {
  Message,
  OpenAIMessage,
  OpenAIResponse,
  ProductAnalysis,
  AnalyzeProductPayload,
  ProductItem,
  ShowToastPayload,
  StorageKeys,
  CostTracking
} from '../types';
import { imageUrlToBase64 } from '../utils';

class VintedLensBackground {
  private apiKey: string | null = null;
  private imageDetail: 'low' | 'high' | 'auto' = 'auto';
  private costLimit: number = 0;
  private costTracking: CostTracking = {
    monthlyTokens: 0,
    monthlyImages: 0,
    estimatedCost: 0,
    lastReset: new Date().toISOString()
  };

  // Parallel processing
  private requestQueue: AnalyzeProductPayload[] = [];
  private activeRequests = new Set<string>();
  private readonly MAX_CONCURRENT = 8;
  private queueProcessor: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔍 Vinted Lens: Initializing background script');

    // Load settings from storage
    const storage = await browser.storage.local.get([
      StorageKeys.ApiKey,
      StorageKeys.ImageDetail,
      StorageKeys.CostLimit,
      StorageKeys.MonthlyUsage
    ]);

    // Load and validate API key
    const rawApiKey = storage[StorageKeys.ApiKey];
    console.log('🔑 Raw API key from storage:', rawApiKey);
    console.log('🔑 API key details:', {
      present: !!rawApiKey,
      value: rawApiKey,
      keyType: rawApiKey ? typeof rawApiKey : 'null',
      startsWith: rawApiKey ? rawApiKey.substring(0, 7) : 'n/a',
      length: rawApiKey ? rawApiKey.length : 0,
      storage_key_used: StorageKeys.ApiKey
    });

    this.apiKey = rawApiKey || null;
    console.log('🔑 API key after assignment:', {
      value: this.apiKey,
      valid: this.isValidApiKey(this.apiKey)
    });
    this.imageDetail = storage[StorageKeys.ImageDetail] || 'auto';
    this.costLimit = storage[StorageKeys.CostLimit] || 0;
    this.costTracking = storage[StorageKeys.MonthlyUsage] || {
      monthlyTokens: 0,
      monthlyImages: 0,
      estimatedCost: 0,
      lastReset: new Date().toISOString()
    };

    // Add storage change listener
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[StorageKeys.ApiKey]) {
        console.log('🔄 API key changed:', {
          oldValue: changes[StorageKeys.ApiKey].oldValue ? '[REDACTED]' : null,
          newValue: changes[StorageKeys.ApiKey].newValue ? '[REDACTED]' : null
        });
        this.apiKey = changes[StorageKeys.ApiKey].newValue || null;
        console.log('🔄 API key after change:', {
          value: this.apiKey,
          valid: this.isValidApiKey(this.apiKey)
        });
      }
    });

    // Check if we need to reset monthly tracking
    const lastReset = new Date(this.costTracking.lastReset);
    const now = new Date();
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      this.costTracking = {
        monthlyTokens: 0,
        monthlyImages: 0,
        estimatedCost: 0,
        lastReset: now.toISOString()
      };
      await this.saveCostTracking();
    }

    // Debug logging
    console.log('🔑 Settings loaded:', {
      apiKeyPresent: !!this.apiKey,
      apiKeyValid: this.isValidApiKey(this.apiKey),
      imageDetail: this.imageDetail,
      costLimit: this.costLimit,
      costTracking: this.costTracking
    });

    // Set up message listeners
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    console.log('👂 Message listener set up');
  }

  private async saveCostTracking(): Promise<void> {
    await browser.storage.local.set({
      [StorageKeys.MonthlyUsage]: this.costTracking
    });
  }

  private async updateCostTracking(tokens: number): Promise<void> {
    // Update tracking
    this.costTracking.monthlyTokens += tokens;
    this.costTracking.monthlyImages += 1;

    // Calculate cost (GPT-4o-mini pricing)
    // Input: $0.15 per 1M tokens = $0.00015 per 1K tokens
    // Output: $0.60 per 1M tokens = $0.0006 per 1K tokens
    const costPerInputToken = 0.00015; // $0.15 per 1M tokens
    const costPerOutputToken = 0.0006; // $0.60 per 1M tokens
    this.costTracking.estimatedCost = (
      (this.costTracking.monthlyTokens * 0.8 * costPerInputToken) + // Assuming 80% input tokens
      (this.costTracking.monthlyTokens * 0.2 * costPerOutputToken)  // Assuming 20% output tokens
    );

    await this.saveCostTracking();

    // Check if we've exceeded the cost limit
    if (this.costLimit > 0 && this.costTracking.estimatedCost > this.costLimit) {
      throw new Error('Monthly cost limit exceeded');
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    switch (message.type) {
      case 'ANALYZE_PRODUCT':
        this.handleProductAnalysis(message.payload as AnalyzeProductPayload);
        break;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0 || this.activeRequests.size >= this.MAX_CONCURRENT) {
      console.log('⏸️ Queue processing paused:', {
        queueLength: this.requestQueue.length,
        activeRequests: this.activeRequests.size,
        maxConcurrent: this.MAX_CONCURRENT
      });
      return;
    }

    const payload = this.requestQueue.shift()!;
    this.activeRequests.add(payload.product.id);
    console.log('🔄 Processing from queue:', {
      productId: payload.product.id,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      maxConcurrent: this.MAX_CONCURRENT
    });

    try {
      const startTime = performance.now();
      const analysis = await this.analyzeProduct(payload);
      const totalTime = performance.now() - startTime;

      // Send results back to content script
      await this.sendToActiveTab({
        type: 'ANALYSIS_COMPLETE',
        payload: {
          productId: payload.product.id,
          analysis: {
            ...analysis,
            timing: {
              ...analysis.timing,
              total: totalTime
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      await this.showToast({
        message: 'Failed to analyze product',
        type: 'error'
      });
    } finally {
      this.activeRequests.delete(payload.product.id);

      // Process next item immediately
      this.processQueue();
    }

    // Process next item if we have capacity
    if (this.activeRequests.size < this.MAX_CONCURRENT) {
      this.processQueue();
    }
  }

  private isValidApiKey(key: string | null): boolean {
    return !!key && (key.startsWith('sk-') || key.startsWith('sk-proj-'));
  }

  private handleProductAnalysis(payload: AnalyzeProductPayload): void {
    console.log('📦 Queueing product:', payload.product.id);

    if (!this.isValidApiKey(this.apiKey)) {
      console.error('❌ No valid API key found');
      this.showToast({
        message: 'Please set your API key in the extension options',
        type: 'error'
      });
      return;
    }

    // Add to queue
    this.requestQueue.push(payload);
    console.log('📥 Added to queue:', {
      productId: payload.product.id,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      maxConcurrent: this.MAX_CONCURRENT
    });

    // Start processing if we have capacity
    if (this.activeRequests.size < this.MAX_CONCURRENT) {
      console.log('▶️ Starting queue processing');
      this.processQueue();
    }
  }

  private async sendToActiveTab(message: Message): Promise<void> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, message);
    }
  }

  private extractJsonFromResponse(text: string): string {
    // Remove markdown code block if present
    const jsonMatch = text.match(/```(?:json)?\n?(.*?)```/s);
    return jsonMatch ? jsonMatch[1].trim() : text.trim();
  }

  private async analyzeProduct(payload: AnalyzeProductPayload): Promise<ProductAnalysis> {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const { product, preferences, searchTerm } = payload;

    // Send analysis start status
    await this.sendToActiveTab({
      type: 'ANALYSIS_STATUS',
      payload: {
        stage: 'start',
        productId: product.id,
        data: {
          prompt: `Analyzing if product matches either:
${searchTerm ? `- Search term: "${searchTerm}"` : ''}
${preferences.length > 0 ? `- Preferences: ${preferences.join(', ')}` : ''}`
        }
      }
    });

    const startApiCall = performance.now();
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze if this product matches either:
${searchTerm ? `- Search term: "${searchTerm}"` : ''}
${preferences.length > 0 ? `- Preferences: ${preferences.join(', ')}` : ''}

Product details:
Title: ${product.title}
Description: ${product.description}

Respond in JSON format:
{
  "matches": boolean,
  "confidence": number between 0 and 1,
  "matchedCriteria": string[], // "search" or the specific preference that matched
  "description": string explaining why it matched or didn't match
}`
            }
          ]
        }
      ];

      let response;
      let result: OpenAIResponse;

      try {
        // Convert image to base64
        const { data: base64Data, mediaType } = await imageUrlToBase64(product.imageUrl);

        // Add image to message content
        messages[0].content.push({
          type: 'image_url',
          image_url: {
            url: `data:${mediaType};base64,${base64Data}`,
            detail: this.imageDetail
          }
        });

        const requestBody = {
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 300
        };

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        };

        // Debug logging
        console.log('🔄 OpenAI API Request:', {
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: { ...headers, Authorization: 'Bearer [REDACTED]' },
          body: JSON.stringify(requestBody, null, 2)
        });

        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('🔄 OpenAI API Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });

        if (!response.ok) {
          let errorMessage = `API request failed (${response.status})`;

          if (response.status === 401) {
            errorMessage = 'Invalid API key. Make sure you\'re using a valid API key from platform.openai.com';
          } else if (response.status === 429) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (response.status === 400) {
            errorMessage = 'Invalid request format';
          } else {
            try {
              const errorJson = JSON.parse(responseText);
              errorMessage += `: ${errorJson.error?.message || responseText}`;
            } catch {
              errorMessage += `: ${responseText}`;
            }
          }

          throw new Error(errorMessage);
        }

        result = JSON.parse(responseText) as OpenAIResponse;
        const apiCallTime = performance.now() - startApiCall;

        // Calculate and track token usage
        const totalTokens = result.usage.total_tokens;
        await this.updateCostTracking(totalTokens);

        const analysisText = result.choices[0].message.content;

        // Send analysis complete status
        await this.sendToActiveTab({
          type: 'ANALYSIS_STATUS',
          payload: {
            stage: 'complete',
            productId: product.id,
            data: {
              response: analysisText,
              timing: {
                apiCall: apiCallTime
              }
            }
          }
        });

        try {
          // Extract JSON from potential code block and parse
          const cleanJson = this.extractJsonFromResponse(analysisText);
          console.log('🔄 Extracted JSON:', {
            original: analysisText,
            cleaned: cleanJson
          });
          const analysis = JSON.parse(cleanJson) as ProductAnalysis;
          return {
            ...analysis,
            timing: {
              total: apiCallTime,
              apiCall: apiCallTime
            }
          };
        } catch (error: unknown) {
          await this.sendToActiveTab({
            type: 'ANALYSIS_STATUS',
            payload: {
              stage: 'error',
              productId: product.id,
              data: {
                error: 'Failed to parse OpenAI response'
              }
            }
          });
          throw new Error('Invalid analysis response format');
        }
    } catch (error: unknown) {
      await this.sendToActiveTab({
        type: 'ANALYSIS_STATUS',
        payload: {
          stage: 'error',
          productId: product.id,
          data: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      });
      throw error;
    }
  }

  private async showToast(options: ShowToastPayload): Promise<void> {
    await this.sendToActiveTab({
      type: 'SHOW_TOAST',
      payload: options
    });
  }
}

// Initialize background script
new VintedLensBackground();
