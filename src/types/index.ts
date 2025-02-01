// Storage keys
export const enum StorageKeys {
  Preferences = 'preferences',
  ApiKey = 'apiKey',
  CurrentSearch = 'currentSearch'
}

// User preferences
export interface UserPreferences {
  defaultPreferences: string[];
  apiKey: string;
}

// Message types for communication between components
export type MessageType =
  | 'START_SCAN'
  | 'STOP_SCAN'
  | 'ANALYZE_PRODUCT'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_STATUS'
  | 'UPDATE_PREFERENCES'
  | 'UPDATE_SEARCH'
  | 'SCAN_PROGRESS'
  | 'SHOW_TOAST';

export type AnalysisStage = 'start' | 'complete' | 'error';

export interface AnalysisStatusPayload {
  stage: AnalysisStage;
  productId: string;
  data?: {
    prompt?: string;
    response?: string;
    error?: string;
    timing?: {
      apiCall: number;
    };
  };
}

export interface Message {
  type: MessageType;
  payload: any;
}

// Product analysis types
export interface ProductItem {
  id: string;
  element: HTMLElement;
  imageUrl: string;
  title: string;
  description: string;
}

export interface ProductAnalysis {
  matches: boolean;
  confidence: number;
  matchedCriteria: string[];
  description?: string;
  timing?: {
    total: number;
    apiCall: number;
  };
}

// Analysis request payload
export interface AnalyzeProductPayload {
  product: ProductItem;
  preferences: string[];
  searchTerm: string | null;
}

// API types
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[];
}

export interface AnthropicContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    url?: string;
    media_type?: string;
    data?: string;
  };
}

export interface AnthropicResponse {
  id: string;
  model: string;
  role: 'assistant';
  content: AnthropicResponseContent[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicResponseContent {
  text: string;
  type: 'text';
}

// Toast notification
export interface ToastOptions {
  message: string;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

// DOM selectors
export const enum Selectors {
  ProductGrid = '.feed-grid',
  ProductItem = '.feed-grid__item',
  ProductImage = 'img[data-testid="feed-item--image--img"]',
  ProductTitle = '[data-testid="feed-item--description-title"]',
  ProductDescription = '[data-testid="feed-item--overlay-link"]'
}

// Extension state
export interface ExtensionState {
  isEnabled: boolean;
  isScanning: boolean;
  preferences: string[];
  currentSearch: string | null;
  scanProgress: ScanProgress | null;
}

// Scan progress
export interface ScanProgress {
  total: number;
  current: number;
  currentItem: string | null;
  startTime: number;
}

// Message payloads
export interface StartScanPayload {
  preferences: string[];
  searchTerm: string | null;
}

export interface StopScanPayload {
  reason: 'user' | 'error' | 'complete';
}

export interface ScanProgressPayload {
  progress: ScanProgress;
}

export interface AnalysisCompletePayload {
  productId: string;
  analysis: ProductAnalysis;
}

export interface UpdatePreferencesPayload {
  preferences: string[];
}

export interface UpdateSearchPayload {
  search: string;
}

export interface ShowToastPayload extends ToastOptions {}
