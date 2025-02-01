import { StorageKeys, UserPreferences } from '../types';

/**
 * Debounce function to limit the rate at which a function can fire
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get stored preferences from browser storage
 */
export async function getStoredPreferences(): Promise<UserPreferences> {
  const storage = await browser.storage.local.get([
    StorageKeys.Preferences,
    StorageKeys.ApiKey,
    StorageKeys.ImageDetail,
    StorageKeys.CostLimit
  ]);

  return {
    defaultPreferences: storage[StorageKeys.Preferences] || [],
    apiKey: storage[StorageKeys.ApiKey] || '',
    imageDetail: storage[StorageKeys.ImageDetail] || 'auto',
    costLimit: storage[StorageKeys.CostLimit] || 0
  };
}

/**
 * Format a timestamp in milliseconds to a human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format a number as a percentage with specified decimal places
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Convert an image URL to base64
 */
export async function imageUrlToBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const mediaType = blob.type || 'image/jpeg'; // Default to JPEG if type is not available

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Clean = base64data.split(',')[1];
      resolve({ data: base64Clean, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
