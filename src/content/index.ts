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
  AnalysisStage,
  StorageKeys
} from '../types';

class VintedLensContent {
  private state: ExtensionState = {
    isEnabled: true,
    isScanning: false,
    preferences: [],
    currentSearch: null,
    scanProgress: null,
    endlessScroll: false
  };

  private scanQueue: ProductItem[] = [];
  private activeProducts = new Set<string>();
  private readonly MAX_CONCURRENT = 8;
  private observer: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private observedProducts = new Set<string>();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔍 Vinted Lens: Initializing content script');

    // Load initial state from storage
    const storage = await browser.storage.local.get([
      StorageKeys.Preferences,
      StorageKeys.CurrentSearch,
      StorageKeys.EndlessScroll
    ]);
    this.state.preferences = storage[StorageKeys.Preferences] || [];
    this.state.currentSearch = storage[StorageKeys.CurrentSearch] || null;
    this.state.endlessScroll = storage[StorageKeys.EndlessScroll] || false;
    console.log('📋 Loaded preferences:', this.state.preferences);
    console.log('🔎 Current search:', this.state.currentSearch);
    console.log('♾️ Endless scroll:', this.state.endlessScroll);

    // Set up message listeners
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    console.log('👂 Message listener set up');

    // Set up observers if endless scroll is enabled
    if (this.state.endlessScroll) {
      console.log('♾️ Setting up endless scroll mode');
      this.state.isScanning = true;

      // Clear any stale analysis classes
      console.log('🧹 Clearing stale analysis classes');
      document.querySelectorAll('.vinted-lens-analyzed').forEach(element => {
        element.classList.remove(
          'vinted-lens-match',
          'vinted-lens-hidden',
          'vinted-lens-low-confidence',
          'vinted-lens-analyzed'
        );
        element.removeAttribute('data-vinted-lens-id');
      });

      this.setupIntersectionObserver();
      this.setupMutationObserver();
    }
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

  private setupIntersectionObserver(): void {
    console.log('🔍 Setting up intersection observer');
    this.observer = new IntersectionObserver(entries => {
      console.log('🔍 Intersection observer triggered:', {
        entries: entries.length,
        intersecting: entries.filter(e => e.isIntersecting).length
      });
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          console.log('🔍 Element intersecting:', {
            id: element.id,
            hasId: !!element.id,
            classes: element.classList.toString()
          });
          const productId = element.getAttribute('data-vinted-lens-id');
          console.log('🔍 Checking product:', {
            productId,
            isObserved: productId ? this.observedProducts.has(productId) : false,
            classes: element.classList.toString()
          });
          if (!productId || !this.observedProducts.has(productId)) {
            this.queueProductForAnalysis(element);
          }
        }
      });
    }, {
      rootMargin: '50px', // Start loading slightly before elements come into view
      threshold: 0.1 // Trigger when even a small part is visible
    });

    // Start observing existing products
    document.querySelectorAll(Selectors.ProductItem).forEach(element => {
      if (!element.classList.contains('vinted-lens-analyzed')) {
        this.observer!.observe(element);
      }
    });
  }

  private setupMutationObserver(): void {
    console.log('🔍 Setting up mutation observer');
    this.mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement && node.matches(Selectors.ProductItem)) {
            if (!node.classList.contains('vinted-lens-analyzed')) {
              this.observer?.observe(node);
            }
          }
        });
      });
    });

    const productGrid = document.querySelector(Selectors.ProductGrid);
    if (productGrid) {
      this.mutationObserver.observe(productGrid, {
        childList: true,
        subtree: true
      });
    }
  }

  private queueProductForAnalysis(element: HTMLElement): void {
    const productId = element.getAttribute('data-vinted-lens-id');
    console.log('🔄 Queueing product:', {
      productId,
      isScanning: this.state.isScanning,
      queueLength: this.scanQueue.length,
      activeProducts: this.activeProducts.size
    });

    const imgElement = element.querySelector(Selectors.ProductImage) as HTMLImageElement;
    const titleElement = element.querySelector(Selectors.ProductTitle);
    const descElement = element.querySelector(Selectors.ProductDescription);

    if (!imgElement || !titleElement || !descElement) {
      console.log('⚠️ Missing required elements:', {
        hasImage: !!imgElement,
        hasTitle: !!titleElement,
        hasDescription: !!descElement
      });
      return;
    }

    if (imgElement && titleElement && descElement) {
      const product: ProductItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        element,
        imageUrl: imgElement.src,
        title: titleElement.textContent || '',
        description: descElement.getAttribute('title') || ''
      };

      element.setAttribute('data-vinted-lens-id', product.id);
      this.observedProducts.add(product.id);
      this.scanQueue.push(product);

      // Start processing if we have capacity
      if (this.activeProducts.size < this.MAX_CONCURRENT) {
        this.processNextProduct();
      }
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

    // Set up observers for endless scroll if enabled
    if (this.state.endlessScroll && !this.observer) {
      this.setupIntersectionObserver();
      this.setupMutationObserver();
    }

    this.processNextProduct();
  }

  private handleStopScan(payload: StopScanPayload): void {
    if (!this.state.isScanning) return;

    console.log('🛑 Stopping scan:', {
      reason: payload.reason,
      endlessScroll: this.state.endlessScroll
    });

    this.scanQueue = [];
    this.activeProducts.clear();

    // Only set scanning false if not in endless scroll mode
    if (!this.state.endlessScroll) {
      this.state.isScanning = false;
      this.state.scanProgress = null;
    }

    // Clean up observers if not in endless scroll mode
    if (!this.state.endlessScroll) {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      this.observedProducts.clear();
    }

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

    // Process up to MAX_CONCURRENT products at once
    while (this.scanQueue.length > 0 && this.activeProducts.size < this.MAX_CONCURRENT) {
      const product = this.scanQueue.shift()!;
      console.log('🔄 Processing product:', product.id, {
        activeProducts: this.activeProducts.size,
        queueLength: this.scanQueue.length
      });

      // Update progress
      if (this.state.scanProgress) {
        this.state.scanProgress.current++;
        this.state.scanProgress.currentItem = product.title;
        this.updateProgress();
      }

      // Add analyzing class
      product.element.setAttribute('data-vinted-lens-id', product.id);
      product.element.classList.add('vinted-lens-analyzing');

      // Track active product
      this.activeProducts.add(product.id);

      // Start analysis (don't await)
      this.analyzeProduct(product).catch(error => {
        console.error('❌ Analysis failed:', error);
        this.activeProducts.delete(product.id);
        product.element.classList.remove('vinted-lens-analyzing');
        // Try next product immediately
        this.processNextProduct();
      });
    }

    // If queue is empty and no active products, we're done
    if (this.scanQueue.length === 0 && this.activeProducts.size === 0) {
      this.handleStopScan({ reason: 'complete' });
    }
  }

  private async analyzeProduct(product: ProductItem): Promise<void> {
    console.log('📤 Sending product for analysis:', {
      id: product.id,
      imageUrl: product.imageUrl,
      title: product.title,
      queueLength: this.scanQueue.length,
      activeProducts: this.activeProducts.size
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
      this.activeProducts.delete(productId);
      this.processNextProduct();
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

      // Remove from active products and process next
      this.activeProducts.delete(productId);
      this.processNextProduct();
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
