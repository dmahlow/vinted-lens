import {
  StorageKeys,
  UserPreferences,
  ToastOptions,
  AnthropicResponse,
  GridAnalysisResponse
} from '../types';

// Storage utilities
export async function getStoredPreferences(): Promise<UserPreferences> {
  const result = await browser.storage.local.get([
    StorageKeys.Preferences,
    StorageKeys.ApiKey
  ]);

  return {
    defaultPreferences: result[StorageKeys.Preferences] || [],
    apiKey: result[StorageKeys.ApiKey] || ''
  };
}

export async function savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
  await browser.storage.local.set({
    [StorageKeys.Preferences]: preferences.defaultPreferences,
    [StorageKeys.ApiKey]: preferences.apiKey
  });
}

// Image utilities
export async function imageToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// UI utilities
export function showToast(options: ToastOptions): void {
  const existingToast = document.querySelector('.vinted-lens-toast');
  if (existingToast) {
    existingToast.remove();
  }

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

// Anthropic API utilities
export async function callAnthropic(
  apiKey: string,
  base64Images: string[],
  preferences: string[],
  searchTerms: string | null
): Promise<string> {
  const prompt = `Analyze these product images from Vinted.com.
User preferences: ${preferences.join(', ')}
${searchTerms ? `Search terms: ${searchTerms}` : ''}

For each product, determine if it matches the preferences${searchTerms ? ' and search terms' : ''}.
Respond with a JSON array where each item has:
{
  "id": "item-[index]",
  "matches": boolean,
  "confidence": number (0-1),
  "matchedCriteria": string[]
}`;

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...base64Images.map(image => ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: image.split(',')[1]
          }
        }))
      ]
    }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error?.message ||
        `Anthropic API error (${response.status}): ${response.statusText}`
      );
    }

    const data = await response.json() as AnthropicResponse;

    if (!data.content || !Array.isArray(data.content)) {
      throw new Error('Invalid response format from Claude API');
    }

    // Get the last message content which contains our analysis
    const lastMessage = data.content[data.content.length - 1];

    if (!lastMessage.text) {
      throw new Error('No text content in Claude response');
    }

    // Parse the response as our expected grid analysis format
    let gridAnalysis: GridAnalysisResponse[];
    try {
      gridAnalysis = JSON.parse(lastMessage.text);
      if (!Array.isArray(gridAnalysis) || !gridAnalysis.every(item =>
        typeof item.id === 'string' &&
        typeof item.matches === 'boolean' &&
        typeof item.confidence === 'number' &&
        Array.isArray(item.matchedCriteria)
      )) {
        throw new Error('Invalid grid analysis format');
      }
    } catch (parseError) {
      throw new Error('Failed to parse Claude response as grid analysis');
    }

    return JSON.stringify(gridAnalysis);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to communicate with Claude API');
  }
}

// Function utilities
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// DOM utilities
export function isElementInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
