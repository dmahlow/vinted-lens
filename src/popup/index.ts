import {
  Message,
  StorageKeys,
  UpdatePreferencesPayload,
  UpdateSearchPayload
} from '../types';
import { getStoredPreferences, debounce } from '../utils';

class VintedLensPopup {
  private preferencesInput: HTMLInputElement;
  private searchInput: HTMLInputElement;
  private settingsButton: HTMLButtonElement;
  private statusElement: HTMLElement;

  constructor() {
    this.preferencesInput = document.getElementById('preferences') as HTMLInputElement;
    this.searchInput = document.getElementById('search') as HTMLInputElement;
    this.settingsButton = document.getElementById('settings') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load stored values
    const storage = await browser.storage.local.get([
      StorageKeys.Preferences,
      StorageKeys.CurrentSearch
    ]);

    // Set initial values
    this.preferencesInput.value = (storage[StorageKeys.Preferences] || []).join(', ');
    this.searchInput.value = storage[StorageKeys.CurrentSearch] || '';

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Handle preference changes
    this.preferencesInput.addEventListener('input', debounce(() => {
      this.updatePreferences();
    }, 500));

    // Handle search changes
    this.searchInput.addEventListener('input', debounce(() => {
      this.updateSearch();
    }, 500));

    // Handle settings button click
    this.settingsButton.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
  }

  private async updatePreferences(): Promise<void> {
    const preferences = this.preferencesInput.value
      .split(',')
      .map(pref => pref.trim())
      .filter(pref => pref.length > 0);

    await browser.storage.local.set({
      [StorageKeys.Preferences]: preferences
    });

    this.updateStatus('Preferences updated');

    // Notify content script
    await this.broadcastMessage({
      type: 'UPDATE_PREFERENCES',
      payload: { preferences } as UpdatePreferencesPayload
    });
  }

  private async updateSearch(): Promise<void> {
    const search = this.searchInput.value.trim();

    await browser.storage.local.set({
      [StorageKeys.CurrentSearch]: search
    });

    this.updateStatus('Search updated');

    // Notify content script
    await this.broadcastMessage({
      type: 'UPDATE_SEARCH',
      payload: { search } as UpdateSearchPayload
    });
  }

  private updateStatus(message: string): void {
    this.statusElement.textContent = message;
    setTimeout(() => {
      this.statusElement.textContent = 'Ready to analyze';
    }, 2000);
  }

  private async broadcastMessage(message: Message): Promise<void> {
    // Send message to background script
    await browser.runtime.sendMessage(message);

    // Get all Vinted tabs
    const tabs = await browser.tabs.query({
      url: [
        '*://*.vinted.com/*',
        '*://*.vinted.fr/*',
        '*://*.vinted.de/*'
      ]
    });

    // Send message to each tab
    await Promise.all(
      tabs.map(tab => {
        if (tab.id) {
          return browser.tabs.sendMessage(tab.id, message).catch(() => {
            // Ignore errors from inactive tabs
          });
        }
      })
    );
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new VintedLensPopup();
});
