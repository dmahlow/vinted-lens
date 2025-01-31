import {
  getStoredPreferences,
  savePreferences,
  imageToBase64,
  showToast,
  callAnthropic,
  isElementInViewport
} from '../src/utils';
import { mocks } from './setup';
import { StorageKeys, UserPreferences } from '../src/types';

describe('Utils', () => {
  describe('getStoredPreferences', () => {
    it('should return default values when storage is empty', async () => {
      const mockStorage = { [StorageKeys.Preferences]: [], [StorageKeys.ApiKey]: '' };
      mocks.storage.local.get.mockImplementation(() => Promise.resolve(mockStorage));
      const prefs = await getStoredPreferences();
      expect(prefs).toEqual({
        defaultPreferences: [],
        apiKey: ''
      });
    });

    it('should return stored values', async () => {
      const mockStorage = {
        [StorageKeys.Preferences]: ['wool', 'silk'],
        [StorageKeys.ApiKey]: 'test-key'
      };
      mocks.storage.local.get.mockImplementation(() => Promise.resolve(mockStorage));
      const prefs = await getStoredPreferences();
      expect(prefs).toEqual({
        defaultPreferences: mockStorage[StorageKeys.Preferences],
        apiKey: mockStorage[StorageKeys.ApiKey]
      });
    });
  });

  describe('savePreferences', () => {
    it('should save preferences to storage', async () => {
      const prefs: UserPreferences = {
        defaultPreferences: ['wool', 'silk'],
        apiKey: 'test-key'
      };
      await savePreferences(prefs);
      expect(mocks.storage.local.set).toHaveBeenCalledWith({
        [StorageKeys.Preferences]: prefs.defaultPreferences,
        [StorageKeys.ApiKey]: prefs.apiKey
      });
    });
  });

  describe('imageToBase64', () => {
    it('should convert image URL to base64', async () => {
      const result = await imageToBase64('test.jpg');
      expect(result).toBe('data:image/jpeg;base64,mock');
    });
  });

  describe('callAnthropic', () => {
    it('should make API call with correct parameters', async () => {
      const mockResponse = { content: '[{"id":"item-0","matches":true}]' };
      mocks.fetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' })
        }))
      );

      const result = await callAnthropic(
        'test-key',
        ['data:image/jpeg;base64,test'],
        ['wool'],
        'red wool'
      );

      expect(result).toBe(mockResponse.content);
      expect(mocks.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key'
          })
        })
      );
    });

    it('should throw error on API failure', async () => {
      mocks.fetch.mockImplementation(() =>
        Promise.resolve(new Response(null, {
          status: 400,
          statusText: 'Bad Request'
        }))
      );

      await expect(
        callAnthropic('test-key', [], [], null)
      ).rejects.toThrow('Anthropic API error: Bad Request');
    });
  });

  describe('isElementInViewport', () => {
    it('should return true for element in viewport', () => {
      const element = document.createElement('div');
      jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });

      expect(isElementInViewport(element)).toBe(true);
    });

    it('should return false for element outside viewport', () => {
      const element = document.createElement('div');
      jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        top: -200,
        left: 0,
        bottom: -100,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: -200,
        toJSON: () => ({})
      });

      expect(isElementInViewport(element)).toBe(false);
    });
  });

  describe('showToast', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create and remove toast element', () => {
      const message = 'Test message';
      showToast({ message });

      const toast = document.querySelector('.vinted-lens-toast');
      expect(toast).toBeTruthy();
      expect(toast?.textContent).toBe(message);

      // Fast-forward timers
      jest.advanceTimersByTime(3300);
      expect(document.querySelector('.vinted-lens-toast')).toBeFalsy();
    });

    it('should remove existing toast before showing new one', () => {
      showToast({ message: 'First' });
      showToast({ message: 'Second' });

      const toasts = document.querySelectorAll('.vinted-lens-toast');
      expect(toasts.length).toBe(1);
      expect(toasts[0].textContent).toBe('Second');
    });
  });
});
