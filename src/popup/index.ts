import {
  Message,
  StorageKeys,
  UpdatePreferencesPayload,
  UpdateSearchPayload,
  StartScanPayload,
  StopScanPayload,
  ScanProgressPayload,
  ScanProgress
} from '../types';
import { debounce } from '../utils';

class VintedLensPopup {
  private preferencesInput: HTMLInputElement;
  private searchInput: HTMLInputElement;
  private scanButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private settingsButton: HTMLButtonElement;
  private statusElement: HTMLElement;
  private progressSection: HTMLElement;
  private progressBar: HTMLElement;
  private progressCount: HTMLElement;
  private progressPercent: HTMLElement;
  private currentItem: HTMLElement;

  constructor() {
    this.preferencesInput = document.getElementById('preferences') as HTMLInputElement;
    this.searchInput = document.getElementById('search') as HTMLInputElement;
    this.scanButton = document.getElementById('scan') as HTMLButtonElement;
    this.stopButton = document.getElementById('stop') as HTMLButtonElement;
    this.settingsButton = document.getElementById('settings') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;
    this.progressSection = document.querySelector('.progress-section') as HTMLElement;
    this.progressBar = document.querySelector('.progress-bar-fill') as HTMLElement;
    this.progressCount = document.querySelector('.progress-count') as HTMLElement;
    this.progressPercent = document.querySelector('.progress-percent') as HTMLElement;
    this.currentItem = document.querySelector('.current-item') as HTMLElement;

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

    // Handle scan button click
    this.scanButton.addEventListener('click', async () => {
      // Disable scan button while scanning
      this.scanButton.disabled = true;
      this.scanButton.style.display = 'none';
      this.stopButton.style.display = 'block';

      // Show progress section
      this.progressSection.classList.add('active');

      await this.startScan();
    });

    // Handle stop button click
    this.stopButton.addEventListener('click', () => {
      this.stopScan('user');

      // Re-enable scan button
      this.scanButton.disabled = false;
      this.scanButton.style.display = 'block';
      this.stopButton.style.display = 'none';

      // Hide progress section
      this.progressSection.classList.remove('active');
    });

    // Handle settings button click
    this.settingsButton.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });

    // Listen for progress updates
    browser.runtime.onMessage.addListener((message: Message) => {
      if (message.type === 'SCAN_PROGRESS') {
        this.handleProgress(message.payload as ScanProgressPayload);
      }
    });
  }

  private handleProgress(payload: ScanProgressPayload): void {
    const { progress } = payload;
    const percent = Math.round((progress.current / progress.total) * 100);

    // Update progress bar
    this.progressBar.style.width = `${percent}%`;

    // Update text
    this.progressCount.textContent = `${progress.current}/${progress.total} items`;
    this.progressPercent.textContent = `${percent}%`;

    // Update current item
    this.currentItem.textContent = progress.currentItem ?
      `Analyzing: ${progress.currentItem}` :
      'Scanning items...';

    // If scan is complete, reset UI
    if (progress.current === progress.total) {
      setTimeout(() => {
        this.scanButton.disabled = false;
        this.scanButton.style.display = 'block';
        this.stopButton.style.display = 'none';
        this.progressSection.classList.remove('active');
        this.updateStatus('Scan complete');
      }, 1000);
    }
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

  private async startScan(): Promise<void> {
    // Get current preferences and search
    const preferences = this.preferencesInput.value
      .split(',')
      .map(pref => pref.trim())
      .filter(pref => pref.length > 0);

    const searchTerm = this.searchInput.value.trim() || null;

    // Update UI
    this.scanButton.style.display = 'none';
    this.stopButton.style.display = 'block';
    this.progressSection.classList.add('active');
    this.updateStatus('Scanning items...');

    // Start scan
    await this.broadcastMessage({
      type: 'START_SCAN',
      payload: {
        preferences,
        searchTerm
      } as StartScanPayload
    });
  }

  private async stopScan(reason: 'user' | 'error' | 'complete'): Promise<void> {
    // Update UI
    this.scanButton.style.display = 'block';
    this.stopButton.style.display = 'none';
    this.progressSection.classList.remove('active');
    this.updateStatus(reason === 'complete' ? 'Scan complete' : 'Scan stopped');

    // Stop scan
    await this.broadcastMessage({
      type: 'STOP_SCAN',
      payload: { reason } as StopScanPayload
    });
  }

  private updateStatus(message: string): void {
    this.statusElement.textContent = message;
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
