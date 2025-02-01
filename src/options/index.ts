import { StorageKeys, UserPreferences, CostTracking } from '../types';
import { getStoredPreferences } from '../utils';

interface ExtendedPreferences extends UserPreferences {
  imageDetail: 'low' | 'high' | 'auto';
  costLimit: number;
}

class VintedLensOptions {
  private apiKeyInput: HTMLInputElement;
  private imageDetailSelect: HTMLSelectElement;
  private costLimitInput: HTMLInputElement;
  private usageStatsElement: HTMLElement;
  private saveButton: HTMLButtonElement;
  private statusElement: HTMLElement;

  constructor() {
    this.apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    this.imageDetailSelect = document.getElementById('imageDetail') as HTMLSelectElement;
    this.costLimitInput = document.getElementById('costLimit') as HTMLInputElement;
    this.usageStatsElement = document.getElementById('usageStats') as HTMLElement;
    this.saveButton = document.getElementById('save') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load stored preferences
    const storage = await browser.storage.local.get([
      StorageKeys.ApiKey,
      StorageKeys.ImageDetail,
      StorageKeys.CostLimit,
      StorageKeys.MonthlyUsage
    ]);

    this.apiKeyInput.value = storage[StorageKeys.ApiKey] || '';
    this.imageDetailSelect.value = storage[StorageKeys.ImageDetail] || 'auto';
    this.costLimitInput.value = storage[StorageKeys.CostLimit]?.toString() || '';

    // Update usage stats
    await this.updateUsageStats(storage[StorageKeys.MonthlyUsage]);

    // Setup event listeners
    this.saveButton.addEventListener('click', () => this.saveOptions());
  }

  private async updateUsageStats(usage?: CostTracking): Promise<void> {
    if (!usage) {
      this.usageStatsElement.innerHTML = 'No usage data available';
      return;
    }

    const lastReset = new Date(usage.lastReset);
    const formattedDate = lastReset.toLocaleDateString();

    this.usageStatsElement.innerHTML = `
      <ul>
        <li>Monthly Tokens: ${usage.monthlyTokens.toLocaleString()}</li>
        <li>Images Analyzed: ${usage.monthlyImages.toLocaleString()}</li>
        <li>Estimated Cost: $${usage.estimatedCost.toFixed(2)}</li>
        <li>Last Reset: ${formattedDate}</li>
      </ul>
    `;
  }

  private async saveOptions(): Promise<void> {
    const apiKey = this.apiKeyInput.value.trim();
    const imageDetail = this.imageDetailSelect.value as 'low' | 'high' | 'auto';
    const costLimit = parseFloat(this.costLimitInput.value);

    if (!apiKey) {
      this.showStatus('API key is required', 'error');
      return;
    }

    try {
      // Print full API key for debugging
      console.log('🔑 Raw API key:', apiKey);
      console.log('🔑 API key details:', {
        length: apiKey.length,
        startsWith: apiKey.substring(0, 7),
        includes_bearer: apiKey.toLowerCase().includes('bearer'),
        trimmed_length: apiKey.trim().length
      });

      // Validate API key format
      if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-proj-')) {
        this.showStatus('API key must start with "sk-" or "sk-proj-"', 'error');
        return;
      }

      // Validate cost limit
      if (isNaN(costLimit) || costLimit < 0) {
        this.showStatus('Cost limit must be a positive number', 'error');
        return;
      }

      // Save settings first
      await browser.storage.local.set({
        [StorageKeys.ApiKey]: apiKey,
        [StorageKeys.ImageDetail]: imageDetail,
        [StorageKeys.CostLimit]: costLimit
      });

      // Then reload background script to apply changes
      await browser.runtime.reload();

      this.showStatus('Settings saved', 'success');
    } catch (error) {
      console.error('Failed to save options:', error);
      this.showStatus('Failed to save options', 'error');
    }
  }

  private showStatus(message: string, type: 'success' | 'error' = 'success'): void {
    this.statusElement.textContent = message;
    this.statusElement.className = type;

    setTimeout(() => {
      this.statusElement.textContent = '';
      this.statusElement.className = '';
    }, 3000);
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new VintedLensOptions();
});
