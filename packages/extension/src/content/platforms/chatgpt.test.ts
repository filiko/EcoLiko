import { describe, it, expect } from 'vitest';
import { parseChatGPTStream } from './chatgpt';
import {
  CHATGPT_CONTENT_EVENT,
  CHATGPT_PARTIAL_EVENT,
  CHATGPT_EMPTY_PARTS,
  CHATGPT_NO_MESSAGE,
  CHATGPT_DONE,
} from './__fixtures__/chatgpt-stream';

describe('parseChatGPTStream', () => {
  it('extracts text and model from a content event', () => {
    const result = parseChatGPTStream(CHATGPT_CONTENT_EVENT);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Hello! How can I help you today?');
    expect(result!.model).toBe('gpt-4o');
  });

  it('extracts text from a partial streaming event', () => {
    const result = parseChatGPTStream(CHATGPT_PARTIAL_EVENT);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Hello! How can I help');
    expect(result!.model).toBe('gpt-4o-mini');
  });

  it('returns null for empty parts array', () => {
    const result = parseChatGPTStream(CHATGPT_EMPTY_PARTS);
    // Empty parts array → no text to extract
    expect(result).toBeNull();
  });

  it('returns null when no message field', () => {
    const result = parseChatGPTStream(CHATGPT_NO_MESSAGE);
    expect(result).toBeNull();
  });

  it('returns null for [DONE] marker', () => {
    const result = parseChatGPTStream(CHATGPT_DONE);
    expect(result).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const result = parseChatGPTStream('not valid json {{{');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseChatGPTStream('');
    expect(result).toBeNull();
  });

  it('normalizes model slugs correctly', () => {
    const event = JSON.stringify({
      message: {
        content: { parts: ['test'] },
        metadata: { model_slug: 'gpt-4.1-mini' },
      },
    });
    const result = parseChatGPTStream(event);
    expect(result!.model).toBe('gpt-4.1-mini');
  });

  it('normalizes o3-mini model slug', () => {
    const event = JSON.stringify({
      message: {
        content: { parts: ['test'] },
        metadata: { model_slug: 'o3-mini-high' },
      },
    });
    const result = parseChatGPTStream(event);
    expect(result!.model).toBe('o3-mini');
  });

  it('defaults model to gpt-4o when slug is missing', () => {
    const event = JSON.stringify({
      message: {
        content: { parts: ['test'] },
        metadata: {},
      },
    });
    const result = parseChatGPTStream(event);
    expect(result!.model).toBe('gpt-4o');
  });
});
