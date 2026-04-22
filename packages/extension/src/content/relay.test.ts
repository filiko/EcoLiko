import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chromeMock } from '../__mocks__/chrome';

/**
 * Tests for the relay logic.
 * The relay script listens for window 'message' events and forwards
 * ECOLIKO_USAGE_EVENT messages to chrome.runtime.sendMessage.
 *
 * Since relay.ts depends on `window`, we test the core forwarding logic
 * directly without importing the module.
 */

// Extract the relay handler logic (mirrors relay.ts behavior)
function relayHandler(eventData: any, eventSource: any): void {
  if (eventSource !== 'self') return;
  if (eventData?.type !== 'ECOLIKO_USAGE_EVENT') return;

  chrome.runtime.sendMessage({
    type: 'ECOLIKO_USAGE_EVENT',
    payload: eventData.payload,
  });
}

describe('relay logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards ECOLIKO_USAGE_EVENT to chrome.runtime', () => {
    const payload = {
      platform: 'chatgpt',
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
      timestamp: Date.now(),
    };

    relayHandler({ type: 'ECOLIKO_USAGE_EVENT', payload }, 'self');

    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'ECOLIKO_USAGE_EVENT',
      payload,
    });
  });

  it('ignores messages with wrong type', () => {
    relayHandler({ type: 'SOME_OTHER_EVENT', payload: {} }, 'self');
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('ignores messages without data', () => {
    relayHandler(null, 'self');
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('ignores messages from other sources', () => {
    const payload = {
      platform: 'chatgpt',
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
      timestamp: Date.now(),
    };

    relayHandler({ type: 'ECOLIKO_USAGE_EVENT', payload }, 'other-frame');
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
  });
});
