import { vi } from 'vitest';

/**
 * Lightweight Chrome API mock for unit testing.
 * Stubs chrome.storage.local, chrome.runtime, chrome.action, chrome.alarms.
 */

const storageData: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          return { [keys]: storageData[keys] };
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          result[key] = storageData[key];
        }
        return result;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  action: {
    setBadgeText: vi.fn(async () => {}),
    setBadgeBackgroundColor: vi.fn(async () => {}),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
};

// Expose on globalThis so extension code can reference `chrome.*`
(globalThis as any).chrome = chromeMock;

// Also expose for direct import in tests
export { chromeMock, storageData };
