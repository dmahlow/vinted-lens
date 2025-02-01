import {
  Message,
  Selectors,
  ProductItem,
  ExtensionState,
  ProductAnalysis,
  AnalysisCompletePayload,
  UpdatePreferencesPayload,
  UpdateSearchPayload,
  ShowToastPayload,
  StartScanPayload,
  StopScanPayload,
  ScanProgress,
  ScanProgressPayload,
  AnalysisStatusPayload,
  AnalysisStage
} from '../types';

class VintedLensContent {
  private state: ExtensionState = {
    isEnabled: true,
    isScanning: false,
    preferences: [],
    currentSearch: null,
    scanProgress: null
  };

  private scanQueue: ProductItem[] = [];
  private currentProduct: ProductItem | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔍 Vinted Lens: Initializing content script');

    // Load initial state from storage
    const storage = await browser.storage.local.get(['preferences', 'currentSearch']);
    this.state.preferences = storage.preferences || [];
    this.state.currentSearch = storage.currentSearch || null;
    console.log('📋 Loaded preferences:', this.state.preferences);
    console.log('🔎 Current search:', this.state.currentSearch);

    // Set up message listeners
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    console.log('👂 Message listener set up');
  }

  private handleMessage(message: Message): void {
    switch (message.type) {
      case 'START_SCAN':
        this.handleStartScan(message.payload as StartScanPayload);
        break;
      case 'STOP_SCAN':
        this.handleStopScan(message.payload as StopScanPayload);
        break;
      case 'ANALYSIS_COMPLETE':
        this.handleAnalysisComplete(message.payload as AnalysisCompletePayload);
        break;
      case 'ANALYSIS_STATUS':
        this.handleAnalysisStatus(message.payload as AnalysisStatusPayload);
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

  private handleAnalysisStatus(payload: AnalysisStatusPayload): void {
    const { stage, productId, data } = payload;

    switch (stage) {
      case 'start':
        console.log(`🤖 Analyzing product ${productId}:`, {
          prompt: data?.prompt
        });
        break;

      case 'complete':
        console.log(`✅ Claude response for ${productId}:`, {
          response: data?.response,
          timing: data?.timing
        });
        break;

      case 'error':
        console.error(`❌ Analysis failed for ${productId}:`, {
          error: data?.error
        });
        break;
    }
  }

  private handleStartScan(payload: StartScanPayload): void {
    if (this.state.isScanning) {
      console.log('⏳ Scan already in progress');
      return;
    }

    // Update preferences and search term
    this.state.preferences = payload.preferences;
    this.state.currentSearch = payload.searchTerm;

    // Get all unanalyzed products
    this.scanQueue = this.getUnanalyzedProducts();

    if (this.scanQueue.length === 0) {
      this.showToast({
        message: 'No items to analyze',
        type: 'info'
      });
      return;
    }

    // Start scanning
    this.state.isScanning = true;
    this.state.scanProgress = {
      total: this.scanQueue.length,
      current: 0,
      currentItem: null,
      startTime: Date.now()
    };

    this.updateProgress();
    this.processNextProduct();
  }

  private handleStopScan(payload: StopScanPayload): void {
    if (!this.state.isScanning) return;

    console.log('🛑 Stopping scan:', payload.reason);
    this.scanQueue = [];
    this.currentProduct = null;
    this.state.isScanning = false;
    this.state.scanProgress = null;

    this.showToast({
      message: payload.reason === 'complete'
        ? 'Scan complete'
        : 'Scan stopped',
      type: payload.reason === 'error' ? 'error' : 'info'
    });

    this.updateProgress();
  }

  private getUnanalyzedProducts(): ProductItem[] {
    const items: ProductItem[] = [];
    const productElements = document.querySelectorAll(
      `${Selectors.ProductItem}:not(.vinted-lens-analyzed)`
    );

    productElements.forEach((element, index) => {
      const imgElement = element.querySelector(Selectors.ProductImage) as HTMLImageElement;
      const titleElement = element.querySelector(Selectors.ProductTitle);
      const descElement = element.querySelector(Selectors.ProductDescription);

      if (imgElement && titleElement && descElement) {
        items.push({
          id: `item-${Date.now()}-${index}`,
          element: element as HTMLElement,
          imageUrl: imgElement.src,
          title: titleElement.textContent || '',
          description: descElement.getAttribute('title') || ''
        });
      }
    });

    return items;
  }

  private async processNextProduct(): Promise<void> {
    if (!this.state.isScanning) return;

    // If we have a current product, wait for it to finish
    if (this.currentProduct) {
      console.log('⏳ Waiting for current product to finish:', this.currentProduct.id);
      return;
    }

    this.currentProduct = this.scanQueue.shift() || null;
    if (!this.currentProduct) {
      this.handleStopScan({ reason: 'complete' });
      return;
    }

    const product = this.currentProduct;
    console.log('🔄 Processing product:', product.id);

    // Update progress
    if (this.state.scanProgress) {
      this.state.scanProgress.current++;
      this.state.scanProgress.currentItem = product.title;
      this.updateProgress();
    }

    // Add analyzing class
    product.element.setAttribute('data-vinted-lens-id', product.id);
    product.element.classList.add('vinted-lens-analyzing');

    try {
      // Send message to background script for analysis
      console.log('📤 Sending product for analysis:', {
        id: product.id,
        imageUrl: product.imageUrl,
        title: product.title,
        queueSize: this.scanQueue.length
      });

      await browser.runtime.sendMessage({
        type: 'ANALYZE_PRODUCT',
        payload: {
          product: {
            ...product,
            element: undefined // Can't send DOM elements
          },
          preferences: this.state.preferences,
          searchTerm: this.state.currentSearch
        }
      });
    } catch (error) {
      console.error('❌ Product analysis failed:', error);
      this.showToast({
        message: 'Failed to analyze product',
        type: 'error'
      });
      product.element.classList.remove('vinted-lens-analyzing');
      this.currentProduct = null;
      // Try next product after a short delay
      setTimeout(() => this.processNextProduct(), 1000);
    }
  }

  private handleAnalysisComplete(payload: AnalysisCompletePayload): void {
    const { productId, analysis } = payload;
    console.log('📥 Analysis complete:', {
      productId,
      matches: analysis.matches,
      confidence: analysis.confidence,
      timing: analysis.timing,
      queueSize: this.scanQueue.length
    });

    // Find the product element
    const productElement = document.querySelector(
      `${Selectors.ProductItem}[data-vinted-lens-id="${productId}"]`
    ) as HTMLElement;

    if (!productElement) {
      console.warn('⚠️ No element found for product:', productId);
      this.currentProduct = null;
      setTimeout(() => this.processNextProduct(), 1000);
      return;
    }

    // Remove analyzing state
    productElement.classList.remove('vinted-lens-analyzing');
    productElement.classList.add('vinted-lens-analyzed');

    // Apply transition class first
    productElement.classList.add('vinted-lens-transition');

    // Use setTimeout to ensure transition is applied
    setTimeout(() => {
      if (analysis.matches) {
        productElement.classList.add('vinted-lens-match');
        if (analysis.confidence < 0.8) {
          productElement.classList.add('vinted-lens-low-confidence');
        }
      } else {
        productElement.classList.add('vinted-lens-hidden');
      }

      // Clear current product and process next after a short delay
      this.currentProduct = null;
      setTimeout(() => this.processNextProduct(), 500);
    }, 0);
  }

  private updateProgress(): void {
    if (!this.state.scanProgress) return;

    // Send progress update
    browser.runtime.sendMessage({
      type: 'SCAN_PROGRESS',
      payload: {
        progress: this.state.scanProgress
      } as ScanProgressPayload
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
    // Stop any ongoing scan
    if (this.state.isScanning) {
      this.handleStopScan({ reason: 'user' });
    }

    // Clear analysis classes
    document.querySelectorAll('.vinted-lens-match, .vinted-lens-hidden, .vinted-lens-low-confidence, .vinted-lens-analyzed')
      .forEach(element => {
        element.classList.remove(
          'vinted-lens-match',
          'vinted-lens-hidden',
          'vinted-lens-low-confidence',
          'vinted-lens-analyzed'
        );
        element.removeAttribute('data-vinted-lens-id');
      });
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
