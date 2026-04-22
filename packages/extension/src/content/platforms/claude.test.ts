import { describe, it, expect } from 'vitest';
import { parseClaudeStream } from './claude';
import {
  CLAUDE_MESSAGE_START,
  CLAUDE_TEXT_DELTA,
  CLAUDE_TEXT_DELTA_PARTIAL,
  CLAUDE_CONTENT_BLOCK_START,
  CLAUDE_CONTENT_BLOCK_STOP,
  CLAUDE_MESSAGE_DELTA,
  CLAUDE_PING,
} from './__fixtures__/claude-stream';

describe('parseClaudeStream', () => {
  it('extracts model from message_start event', () => {
    const result = parseClaudeStream(CLAUDE_MESSAGE_START);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('');
    expect(result!.model).toBe('claude-sonnet-4');
  });

  it('extracts text from content_block_delta', () => {
    const result = parseClaudeStream(CLAUDE_TEXT_DELTA);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Hello! How can I assist you today?');
    expect(result!.model).toBeUndefined();
  });

  it('extracts partial text deltas', () => {
    const result = parseClaudeStream(CLAUDE_TEXT_DELTA_PARTIAL);
    expect(result).not.toBeNull();
    expect(result!.text).toBe(' Let me know');
  });

  it('returns null for content_block_start (no text)', () => {
    const result = parseClaudeStream(CLAUDE_CONTENT_BLOCK_START);
    expect(result).toBeNull();
  });

  it('returns null for content_block_stop', () => {
    const result = parseClaudeStream(CLAUDE_CONTENT_BLOCK_STOP);
    expect(result).toBeNull();
  });

  it('returns null for message_delta (stop reason)', () => {
    const result = parseClaudeStream(CLAUDE_MESSAGE_DELTA);
    expect(result).toBeNull();
  });

  it('returns null for ping event', () => {
    const result = parseClaudeStream(CLAUDE_PING);
    expect(result).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const result = parseClaudeStream('not json');
    expect(result).toBeNull();
  });

  it('normalizes claude-opus model names', () => {
    const event = JSON.stringify({
      type: 'message_start',
      message: { model: 'claude-opus-4-20250514' },
    });
    const result = parseClaudeStream(event);
    expect(result!.model).toBe('claude-opus-4');
  });

  it('normalizes haiku model names', () => {
    const event = JSON.stringify({
      type: 'message_start',
      message: { model: 'claude-3-5-haiku-20241022' },
    });
    const result = parseClaudeStream(event);
    expect(result!.model).toBe('claude-haiku-3.5');
  });
});
