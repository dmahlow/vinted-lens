import {
  Message,
  Selectors,
  GridItem,
  ExtensionState,
  GridAnalysis,
  GridAnalysisItem,
  AnalysisCompletePayload,
  UpdatePreferencesPayload,
  UpdateSearchPayload,
  ShowToastPayload,
  ViewportData,
  GridPosition
} from '../types';
import { debounce } from '../utils';

class VintedLensContent {
  private state: ExtensionState = {
    isEnabled: true,
    isAnalyzing: false,
    preferences: [],
    currentSearch: null
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load initial state from storage
    const storage = await browser.storage.local.get(['preferences', 'currentSearch']);
    this.state.preferences = storage.preferences || [];
    this.state.currentSearch = storage.currentSearch || null;

    // Set up message listeners
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Set up mutation observer for dynamic content
    this.setupGridObserver();

    // Initial check for product grid
    this.checkForProductGrid();
  }

  private setupGridObserver(): void {
    const observer = new MutationObserver(
      debounce(() => {
        if (!this.state.isAnalyzing) {
          this.checkForProductGrid();
        }
      }, 500)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private checkForProductGrid(): void {
    const grid = document.querySelector(Selectors.ProductGrid);
    if (!grid) return;

    const items = this.getVisibleGridItems();
    if (items.length >= 10) { // 5x2 grid
      this.analyzeGrid(items);
    }
  }

  private getVisibleGridItems(): GridItem[] {
    const items: GridItem[] = [];
    const gridItems = document.querySelectorAll(Selectors.ProductItem);
    const gridSize = { rows: 2, columns: 5 }; // Fixed 5x2 grid

    gridItems.forEach((item, index) => {
      if (this.isElementInViewport(item)) {
        // Calculate grid position
        const position: GridPosition = {
          row: Math.floor(index / gridSize.columns),
          column: index % gridSize.columns
        };

        // Only include items that fit in our 5x2 grid
        if (position.row < gridSize.rows && position.column < gridSize.columns) {
          items.push({
            id: `item-${index}`,
            position,
            element: item as HTMLElement
          });
        }
      }
    });

    return items;
  }

  private isElementInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  private async captureViewport(): Promise<ViewportData | null> {
    try {
      // Get current window ID
      const currentWindow = await browser.windows.getCurrent();
      if (!currentWindow.id) {
        throw new Error('Could not determine window ID');
      }

      // Capture the visible viewport
      const screenshot = await browser.tabs.captureVisibleTab(currentWindow.id, {
        format: 'jpeg',
        quality: 85
      });

      return {
        screenshot,
        gridSize: {
          rows: 2,
          columns: 5
        }
      };
    } catch (error) {
      console.error('Failed to capture viewport:', error);
      return null;
    }
  }

  private async analyzeGrid(items: GridItem[]): Promise<void> {
    if (this.state.isAnalyzing) return;

    this.state.isAnalyzing = true;
    items.forEach(item => {
      item.element.classList.add('vinted-lens-analyzing');
    });

    try {
      // Capture viewport screenshot
      const viewport = await this.captureViewport();
      if (!viewport) {
        throw new Error('Failed to capture viewport');
      }

      // Send message to background script for analysis
      await browser.runtime.sendMessage({
        type: 'ANALYZE_GRID',
        payload: { viewport }
      });
    } catch (error) {
      console.error('Failed to analyze grid:', error);
      this.showToast({
        message: 'Failed to analyze items',
        type: 'error'
      });
    } finally {
      this.state.isAnalyzing = false;
      items.forEach(item => {
        item.element.classList.remove('vinted-lens-analyzing');
      });
    }
  }

  private handleMessage(message: Message): void {
    switch (message.type) {
      case 'ANALYSIS_COMPLETE':
        this.handleAnalysisComplete(message.payload as AnalysisCompletePayload);
        break;
      case 'UPDATE_PREFERENCES':
        this.handlePreferencesUpdate(message.payload as UpdatePreferencesPayload);
        break;
      case 'UPDATE_SEARCH':
        this.handleSearchUpdate(message.payload as UpdateSearchPayload);
        break;
      case 'SHOW_TOAST':
        this.showToast(message.payload as ShowToastPayload);
        break;
    }
  }

  private handleAnalysisComplete(payload: AnalysisCompletePayload): void {
    const { analysis } = payload;
    const gridItems = document.querySelectorAll(Selectors.ProductItem);

    analysis.items.forEach((item: GridAnalysisItem) => {
      const index = (item.position.row * 5) + item.position.column;
      const element = gridItems[index];
      if (!element) return;

      if (item.matches) {
        element.classList.add('vinted-lens-match');
        if (item.confidence < 0.8) {
          element.classList.add('vinted-lens-low-confidence');
        }
      } else {
        element.classList.add('vinted-lens-hidden');
      }
    });
  }

  private handlePreferencesUpdate(payload: UpdatePreferencesPayload): void {
    this.state.preferences = payload.preferences;
    this.resetAnalysis();
  }

  private handleSearchUpdate(payload: UpdateSearchPayload): void {
    this.state.currentSearch = payload.search;
    this.resetAnalysis();
  }

  private resetAnalysis(): void {
    document.querySelectorAll('.vinted-lens-match, .vinted-lens-hidden, .vinted-lens-low-confidence')
      .forEach(element => {
        element.classList.remove('vinted-lens-match', 'vinted-lens-hidden', 'vinted-lens-low-confidence');
      });
    this.checkForProductGrid();
  }

  private showToast(options: ShowToastPayload): void {
    const toast = document.createElement('div');
    toast.className = `vinted-lens-toast ${options.type || ''}`;
    toast.textContent = options.message;
    document.body.appendChild(toast);

    // Force reflow to trigger animation
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, options.duration || 3000);
  }
}

// Initialize content script
new VintedLensContent();
