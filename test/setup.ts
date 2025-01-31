import { jest } from '@jest/globals';
import { StorageKeys } from '../src/types';
import type { Browser, Storage, Tabs, Runtime } from 'webextension-polyfill';

// Mock browser.storage API
const storage = {
  local: {
    get: jest.fn<Promise<Record<string, any>>, [string[] | undefined]>(),
    set: jest.fn<Promise<void>, [Record<string, any>]>(),
    remove: jest.fn<Promise<void>, [string]>()
  },
  sync: {
    get: jest.fn<Promise<Record<string, any>>, [string[] | undefined]>(),
    set: jest.fn<Promise<void>, [Record<string, any>]>(),
    remove: jest.fn<Promise<void>, [string]>()
  },
  managed: {
    get: jest.fn<Promise<Record<string, any>>, [string[] | undefined]>()
  },
  session: {
    get: jest.fn<Promise<Record<string, any>>, [string[] | undefined]>(),
    set: jest.fn<Promise<void>, [Record<string, any>]>(),
    remove: jest.fn<Promise<void>, [string]>()
  },
  onChanged: {
    addListener: jest.fn<void, [Function]>(),
    removeListener: jest.fn<void, [Function]>(),
    hasListener: jest.fn<boolean, [Function]>()
  }
};

// Mock browser.runtime API
const runtime = {
  sendMessage: jest.fn<Promise<any>, [any]>(),
  onMessage: {
    addListener: jest.fn<void, [Function]>(),
    removeListener: jest.fn<void, [Function]>(),
    hasListener: jest.fn<boolean, [Function]>()
  },
  openOptionsPage: jest.fn<Promise<void>, []>()
};

// Mock browser.tabs API
const tabs = {
  query: jest.fn<Promise<Tabs.Tab[]>, [Record<string, any>]>(),
  sendMessage: jest.fn<Promise<any>, [number, any]>(),
  captureVisibleTab: jest.fn<Promise<string>, []>(),
  create: jest.fn<Promise<Tabs.Tab>, [Record<string, any>]>(),
  remove: jest.fn<Promise<void>, [number]>(),
  update: jest.fn<Promise<Tabs.Tab>, [number, Record<string, any>]>(),
  get: jest.fn<Promise<Tabs.Tab>, [number]>(),
  getCurrent: jest.fn<Promise<Tabs.Tab>, []>(),
  duplicate: jest.fn<Promise<Tabs.Tab>, [number]>(),
  highlight: jest.fn<Promise<Windows.Window>, [Record<string, any>]>(),
  move: jest.fn<Promise<Tabs.Tab | Tabs.Tab[]>, [number | number[], Record<string, any>]>(),
  reload: jest.fn<Promise<void>, [number]>(),
  warmup: jest.fn<Promise<void>, [number]>()
};

// Create global browser object
(global as any).browser = {
  storage,
  runtime,
  tabs
};

// Reset all mocks before each test
beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  jest.clearAllMocks();

  // Setup default storage behavior
  storage.local.get.mockResolvedValue({} as Record<string, any>);
  storage.local.set.mockResolvedValue();

  // Setup default runtime behavior
  runtime.sendMessage.mockResolvedValue(undefined);

  // Setup default tabs behavior
  tabs.query.mockResolvedValue([]);
  tabs.sendMessage.mockResolvedValue(undefined);
  tabs.captureVisibleTab.mockResolvedValue('data:image/png;base64,mock');
});

afterEach(() => {
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

// Mock fetch API
const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
  .mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({}), {
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }))
  );
global.fetch = mockFetch as typeof fetch;

// Mock FileReader
class MockFileReader {
  onloadend: (() => void) | null = null;
  result: string = 'data:image/jpeg;base64,mock';
  readAsDataURL(blob: Blob) {
    setTimeout(() => this.onloadend?.(), 0);
  }
}

(global as any).FileReader = MockFileReader;

// Helper to simulate storage changes
export const simulateStorageChange = (changes: Record<string, { newValue: any }>) => {
  const listeners = (storage.onChanged.addListener as jest.Mock).mock.calls
    .map(call => call[0])
    .filter((listener): listener is Function => typeof listener === 'function');

  listeners.forEach(listener => {
    listener(changes, 'local');
  });
};

// Helper to simulate incoming messages
export const simulateMessage = (message: any) => {
  const listeners = (runtime.onMessage.addListener as jest.Mock).mock.calls
    .map(call => call[0])
    .filter((listener): listener is Function => typeof listener === 'function');

  listeners.forEach(listener => {
    listener(message);
  });
};

// Helper to simulate DOM content loaded
export const simulateDOMContentLoaded = () => {
  document.dispatchEvent(new Event('DOMContentLoaded'));
};

// Export mocks with proper typing
export const mocks = {
  storage,
  runtime,
  tabs,
  fetch: mockFetch
};
