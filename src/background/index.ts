import {
  Message,
  GridAnalysis,
  AnalyzeGridPayload,
  StorageKeys,
  ExtensionState,
  ViewportData
} from '../types';
import { callAnthropic } from '../utils';

class VintedLensBackground {
  private state: ExtensionState = {
    isEnabled: true,
    isAnalyzing: false,
    preferences: [],
    currentSearch: null
  };

  private lastAnalysisTime: number = 0;
  private readonly ANALYSIS_COOLDOWN = 2000; // 2 seconds between analyses

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load initial state from storage
    const storage = await browser.storage.local.get([
      StorageKeys.Preferences,
      StorageKeys.CurrentSearch
    ]);

    this.state.preferences = storage[StorageKeys.Preferences] || [];
    this.state.currentSearch = storage[StorageKeys.CurrentSearch] || null;

    // Set up message listeners
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Set up storage change listener
    browser.storage.onChanged.addListener(this.handleStorageChange.bind(this));
  }

  private async handleMessage(
    message: Message,
    sender: browser.runtime.MessageSender
  ): Promise<void> {
    switch (message.type) {
      case 'ANALYZE_GRID':
        await this.handleAnalyzeGrid(message.payload as AnalyzeGridPayload, sender.tab?.id);
        break;
    }
  }

  private async handleAnalyzeGrid(payload: AnalyzeGridPayload, tabId?: number): Promise<void> {
    if (!tabId || this.state.isAnalyzing) return;

    // Check cooldown period
    const now = Date.now();
    const timeSinceLastAnalysis = now - this.lastAnalysisTime;
    if (timeSinceLastAnalysis < this.ANALYSIS_COOLDOWN) {
      console.log(`Skipping analysis - cooldown period (${Math.round(timeSinceLastAnalysis)}ms elapsed)`);
      return;
    }

    this.state.isAnalyzing = true;
    this.lastAnalysisTime = now;

    try {
      const { viewport } = payload;
      const storage = await browser.storage.local.get(StorageKeys.ApiKey);
      const apiKey = storage[StorageKeys.ApiKey];

      if (!apiKey) {
        throw new Error('API key not configured');
      }

      // Call Claude API with viewport screenshot
      const analysisResult = await callAnthropic(
        apiKey,
        [viewport.screenshot],
        this.state.preferences,
        this.state.currentSearch
      );

      // Parse and validate the analysis result
      let gridItems: any[];
      try {
        gridItems = JSON.parse(analysisResult);
        if (!Array.isArray(gridItems) || !gridItems.every(item =>
          typeof item.position === 'object' &&
          typeof item.position.row === 'number' &&
          typeof item.position.column === 'number' &&
          typeof item.matches === 'boolean' &&
          typeof item.confidence === 'number' &&
          Array.isArray(item.matchedCriteria)
        )) {
          throw new Error('Invalid analysis format');
        }
      } catch (parseError) {
        throw new Error('Failed to parse analysis result');
      }

      // Send results back to content script
      const analysis: GridAnalysis = {
        items: gridItems,
        timestamp: new Date().toISOString()
      };

      await browser.tabs.sendMessage(tabId, {
        type: 'ANALYSIS_COMPLETE',
        payload: { analysis }
      });
    } catch (error) {
      console.error('Analysis failed:', error);

      // Notify content script of failure
      await browser.tabs.sendMessage(tabId, {
        type: 'SHOW_TOAST',
        payload: {
          message: error instanceof Error ? error.message : 'Analysis failed',
          type: 'error'
        }
      });
    } finally {
      this.state.isAnalyzing = false;
    }
  }

  private handleStorageChange(
    changes: { [key: string]: browser.storage.StorageChange },
    areaName: string
  ): void {
    if (areaName !== 'local') return;

    // Update preferences if changed
    if (changes[StorageKeys.Preferences]) {
      this.state.preferences = changes[StorageKeys.Preferences].newValue || [];
    }

    // Update search if changed
    if (changes[StorageKeys.CurrentSearch]) {
      this.state.currentSearch = changes[StorageKeys.CurrentSearch].newValue || null;
    }
  }
}

// Initialize background script
new VintedLensBackground();
