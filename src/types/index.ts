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
  | 'ANALYZE_GRID'
  | 'ANALYSIS_COMPLETE'
  | 'UPDATE_PREFERENCES'
  | 'UPDATE_SEARCH'
  | 'SHOW_TOAST';

export interface Message {
  type: MessageType;
  payload: any;
}

// Grid analysis types
export interface GridPosition {
  row: number;    // 0-1 for 5x2 grid
  column: number; // 0-4 for 5x2 grid
}

export interface GridItem {
  id: string;
  position: GridPosition;
  element: HTMLElement;
}

export interface GridAnalysis {
  items: GridAnalysisItem[];
  timestamp: string;
}

export interface GridAnalysisItem {
  position: GridPosition;
  matches: boolean;
  confidence: number;
  matchedCriteria: string[];
  description?: string;
}

// Viewport screenshot data
export interface ViewportData {
  screenshot: string; // base64 image data
  gridSize: {
    rows: number;
    columns: number;
  };
}

// Analysis request payload
export interface AnalyzeGridPayload {
  viewport: ViewportData;
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
    type: 'base64';
    media_type: string;
    data: string;
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

// Specific type for our grid analysis response
export interface GridAnalysisResponse {
  id: string;
  matches: boolean;
  confidence: number;
  matchedCriteria: string[];
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
  ProductImage = '.item-thumbnail__image'
}

// Extension state
export interface ExtensionState {
  isEnabled: boolean;
  isAnalyzing: boolean;
  preferences: string[];
  currentSearch: string | null;
}

// Message payloads
export interface AnalyzeGridPayload {
  items: GridItem[];
}

export interface AnalysisCompletePayload {
  analysis: GridAnalysis;
}

export interface UpdatePreferencesPayload {
  preferences: string[];
}

export interface UpdateSearchPayload {
  search: string;
}

export interface ShowToastPayload extends ToastOptions {}
