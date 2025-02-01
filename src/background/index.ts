import {
  Message,
  AnthropicMessage,
  AnthropicResponse,
  ProductAnalysis,
  AnalyzeProductPayload,
  ProductItem,
  ShowToastPayload,
  StorageKeys
} from '../types';
import { imageUrlToBase64 } from '../utils';

class VintedLensBackground {
  private apiKey: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔍 Vinted Lens: Initializing background script');

    // Load API key from storage
    const storage = await browser.storage.local.get(StorageKeys.ApiKey);
    this.apiKey = storage[StorageKeys.ApiKey] || null;

    // Debug logging
    console.log('🔑 Raw API key from storage:', this.apiKey);
    console.log('🔑 API key details:', {
      present: !!this.apiKey,
      value: this.apiKey,
      keyType: this.apiKey ? typeof this.apiKey : 'null',
      startsWith: this.apiKey ? this.apiKey.substring(0, 7) : 'n/a',
      length: this.apiKey ? this.apiKey.length : 0,
      storage_key_used: StorageKeys.ApiKey
    });

    // Set up message listeners
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    console.log('👂 Message listener set up');
  }

  private async handleMessage(message: Message): Promise<void> {
    switch (message.type) {
      case 'ANALYZE_PRODUCT':
        await this.handleProductAnalysis(message.payload as AnalyzeProductPayload);
        break;
    }
  }

  private async handleProductAnalysis(payload: AnalyzeProductPayload): Promise<void> {
    console.log('📦 Analyzing product:', payload.product.id);

    if (!this.apiKey) {
      console.error('❌ No API key found');
      await this.showToast({
        message: 'Please set your API key in the extension options',
        type: 'error'
      });
      return;
    }

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
    }
  }

  private async sendToActiveTab(message: Message): Promise<void> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, message);
    }
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
    const messages: AnthropicMessage[] = [
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
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg', // Will be updated with actual type
              data: '' // Will be filled with base64 data
            }
          }
        ]
      }
    ];

    let response;
    let result: AnthropicResponse;

    try {
      // Convert image to base64
      const { data: base64Data, mediaType } = await imageUrlToBase64(product.imageUrl);

      // Update the image source with base64 data
      messages[0].content[1] = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data
        }
      };

      const requestBody = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages
      };

      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': this.apiKey,
        'anthropic-dangerous-direct-browser-access': 'true'
      };

      // Debug logging
      console.log('🔄 Claude API Request:', {
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody, null, 2)
      });

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log('🔄 Claude API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });

      if (!response.ok) {
        let errorMessage = `API request failed (${response.status})`;

        if (response.status === 401 || response.status === 403) {
          errorMessage = 'Invalid API key. Make sure you\'re using a valid API key from console.anthropic.com';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
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

      result = JSON.parse(responseText) as AnthropicResponse;
      const apiCallTime = performance.now() - startApiCall;
      const analysisText = result.content[0].text;

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
        const analysis = JSON.parse(analysisText) as ProductAnalysis;
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
              error: 'Failed to parse Claude response'
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
