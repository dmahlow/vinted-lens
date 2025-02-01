// Storage keys
export const enum StorageKeys {
  Preferences = 'preferences',
  ApiKey = 'apiKey',
  CurrentSearch = 'currentSearch',
  ImageDetail = 'imageDetail',
  CostLimit = 'costLimit',
  MonthlyUsage = 'monthlyUsage'
}

// User preferences
export interface UserPreferences {
  defaultPreferences: string[];
  apiKey: string;
  imageDetail: 'low' | 'high' | 'auto';
  costLimit: number;
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
export interface OpenAIMessage {
  role: 'user' | 'assistant';
  content: OpenAIContent[];
}

export interface OpenAIContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: [{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CostTracking {
  monthlyTokens: number;
  monthlyImages: number;
  estimatedCost: number;
  lastReset: string; // ISO date string
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
