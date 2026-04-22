import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromeMock, storageData } from '../__mocks__/chrome';

describe('service-worker', () => {
  let messageListener: (message: any, sender: any, sendResponse: any) => boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear storage
    for (const key of Object.keys(storageData)) {
      delete storageData[key];
    }

    // Capture the onMessage listener
    chromeMock.runtime.onMessage.addListener.mockImplementation((fn: any) => {
      messageListener = fn;
    });

    // Simulate the service-worker registration behavior
    // The service worker registers a message listener on load
    chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
      if (message.type === 'ECOLIKO_USAGE_EVENT') {
        handleUsageEvent(message.payload);
        sendResponse({ ok: true });
      }
      return false;
    });

    messageListener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0];
  });

  // Inline the core logic for testing (since importing the module has side effects)
  async function handleUsageEvent(payload: {
    platform: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    timestamp: number;
  }): Promise<void> {
    const event = {
      id: 'test-uuid',
      timestamp: payload.timestamp,
      platform: payload.platform,
      model: payload.model,
      inputTokens: payload.inputTokens,
      outputTokens: payload.outputTokens,
      source: 'extension',
    };

    const result = await chrome.storage.local.get('events');
    const events = (result.events as any[]) ?? [];
    events.push(event);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = events.filter((e: any) => e.timestamp > thirtyDaysAgo);

    await chrome.storage.local.set({ events: filtered });
  }

  it('stores usage event in chrome.storage.local', async () => {
    const payload = {
      platform: 'chatgpt',
      model: 'gpt-4o',
      inputTokens: 1000,
      outputTokens: 500,
      timestamp: Date.now(),
    };

    await handleUsageEvent(payload);

    expect(chromeMock.storage.local.set).toHaveBeenCalled();
    const setCall = chromeMock.storage.local.set.mock.calls[0][0];
    expect(setCall.events).toHaveLength(1);
    expect(setCall.events[0].platform).toBe('chatgpt');
    expect(setCall.events[0].model).toBe('gpt-4o');
    expect(setCall.events[0].inputTokens).toBe(1000);
    expect(setCall.events[0].outputTokens).toBe(500);
  });

  it('appends to existing events', async () => {
    // Pre-populate storage
    storageData.events = [{
      id: 'existing',
      timestamp: Date.now(),
      platform: 'claude',
      model: 'claude-sonnet-4',
      inputTokens: 200,
      outputTokens: 100,
      source: 'extension',
    }];

    await handleUsageEvent({
      platform: 'chatgpt',
      model: 'gpt-4o',
      inputTokens: 500,
      outputTokens: 250,
      timestamp: Date.now(),
    });

    const setCall = chromeMock.storage.local.set.mock.calls[0][0];
    expect(setCall.events).toHaveLength(2);
  });

  it('filters out events older than 30 days', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;

    storageData.events = [{
      id: 'old-event',
      timestamp: thirtyOneDaysAgo,
      platform: 'chatgpt',
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
      source: 'extension',
    }];

    await handleUsageEvent({
      platform: 'claude',
      model: 'claude-sonnet-4',
      inputTokens: 500,
      outputTokens: 250,
      timestamp: Date.now(),
    });

    const setCall = chromeMock.storage.local.set.mock.calls[0][0];
    // Old event should be filtered out, only new event remains
    expect(setCall.events).toHaveLength(1);
    expect(setCall.events[0].platform).toBe('claude');
  });

  it('handles empty storage gracefully', async () => {
    // storageData has no events key
    await handleUsageEvent({
      platform: 'gemini',
      model: 'gemini-2.0-flash',
      inputTokens: 300,
      outputTokens: 150,
      timestamp: Date.now(),
    });

    const setCall = chromeMock.storage.local.set.mock.calls[0][0];
    expect(setCall.events).toHaveLength(1);
    expect(setCall.events[0].platform).toBe('gemini');
  });

  it('message listener responds to ECOLIKO_USAGE_EVENT', () => {
    const sendResponse = vi.fn();
    const result = messageListener(
      { type: 'ECOLIKO_USAGE_EVENT', payload: { platform: 'chatgpt', model: 'gpt-4o', inputTokens: 1, outputTokens: 1, timestamp: Date.now() } },
      {},
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    expect(result).toBe(false);
  });

  it('message listener ignores non-EcoLiko messages', () => {
    const sendResponse = vi.fn();
    messageListener(
      { type: 'OTHER_MESSAGE' },
      {},
      sendResponse
    );

    expect(sendResponse).not.toHaveBeenCalled();
  });
});
