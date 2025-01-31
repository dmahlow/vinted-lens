import { StorageKeys, UserPreferences } from '../types';
import { getStoredPreferences, savePreferences } from '../utils';

class VintedLensOptions {
  private apiKeyInput: HTMLInputElement;
  private defaultPreferencesInput: HTMLInputElement;
  private saveButton: HTMLButtonElement;
  private statusElement: HTMLElement;

  constructor() {
    this.apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    this.defaultPreferencesInput = document.getElementById('defaultPreferences') as HTMLInputElement;
    this.saveButton = document.getElementById('save') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load stored preferences
    const prefs = await getStoredPreferences();

    // Set initial values
    this.apiKeyInput.value = prefs.apiKey || '';
    this.defaultPreferencesInput.value = (prefs.defaultPreferences || []).join(', ');

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.saveButton.addEventListener('click', () => {
      this.saveSettings();
    });

    // Save on Enter key in inputs
    this.apiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveSettings();
      }
    });

    this.defaultPreferencesInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveSettings();
      }
    });
  }

  private async saveSettings(): Promise<void> {
    const apiKey = this.apiKeyInput.value.trim();
    const preferences = this.defaultPreferencesInput.value
      .split(',')
      .map(pref => pref.trim())
      .filter(pref => pref.length > 0);

    try {
      // Validate API key format (basic check)
      if (!this.validateApiKey(apiKey)) {
        throw new Error('Invalid API key format');
      }

      // Save settings
      await savePreferences({
        apiKey,
        defaultPreferences: preferences
      });

      this.showStatus('Settings saved successfully', 'success');
    } catch (error) {
      this.showStatus(
        error instanceof Error ? error.message : 'Failed to save settings',
        'error'
      );
    }
  }

  private validateApiKey(apiKey: string): boolean {
    // Basic validation for Anthropic API key format
    // Should start with 'sk-ant-' and be at least 32 chars
    return apiKey.startsWith('sk-ant-') && apiKey.length >= 32;
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;

    if (type === 'success') {
      setTimeout(() => {
        this.statusElement.className = 'status';
        this.statusElement.textContent = '';
      }, 3000);
    }
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new VintedLensOptions();
});
