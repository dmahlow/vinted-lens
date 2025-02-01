import { StorageKeys, UserPreferences } from '../types';
import { getStoredPreferences } from '../utils';

class VintedLensOptions {
  private apiKeyInput: HTMLInputElement;
  private saveButton: HTMLButtonElement;
  private statusElement: HTMLElement;

  constructor() {
    this.apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    this.saveButton = document.getElementById('save') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load stored preferences
    const prefs = await getStoredPreferences();
    this.apiKeyInput.value = prefs.apiKey;

    // Setup event listeners
    this.saveButton.addEventListener('click', () => this.saveOptions());
  }

  private async saveOptions(): Promise<void> {
    const apiKey = this.apiKeyInput.value.trim();

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
      if (!apiKey.startsWith('sk-ant-')) {
        this.showStatus('API key must start with "sk-ant-"', 'error');
        return;
      }

      await browser.storage.local.set({
        [StorageKeys.ApiKey]: apiKey
      });

      this.showStatus('API key saved', 'success');
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
