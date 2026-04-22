import { describe, it, expect } from 'vitest';
import { parseGeminiStream } from './gemini';
import {
  GEMINI_CONTENT_EVENT,
  GEMINI_MULTI_PART,
  GEMINI_EMPTY_CANDIDATES,
  GEMINI_NO_TEXT_PARTS,
  GEMINI_NO_CANDIDATES,
} from './__fixtures__/gemini-stream';

describe('parseGeminiStream', () => {
  it('extracts text and model from content event', () => {
    const result = parseGeminiStream(GEMINI_CONTENT_EVENT);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('Hello! I am Gemini. How can I help?');
    expect(result!.model).toBe('gemini-2.0-flash');
  });

  it('concatenates multiple text parts', () => {
    const result = parseGeminiStream(GEMINI_MULTI_PART);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('First part. Second part.');
    expect(result!.model).toBe('gemini-2.5-pro');
  });

  it('returns null for empty candidates array', () => {
    const result = parseGeminiStream(GEMINI_EMPTY_CANDIDATES);
    expect(result).toBeNull();
  });

  it('returns null when parts have no text (e.g. function calls)', () => {
    const result = parseGeminiStream(GEMINI_NO_TEXT_PARTS);
    // Parts exist but none have .text — should return empty or null
    expect(result === null || result!.text === '').toBe(true);
  });

  it('returns null when no candidates field', () => {
    const result = parseGeminiStream(GEMINI_NO_CANDIDATES);
    expect(result).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const result = parseGeminiStream('broken json {{');
    expect(result).toBeNull();
  });

  it('handles missing modelVersion gracefully', () => {
    const event = JSON.stringify({
      candidates: [{
        content: { parts: [{ text: 'test' }], role: 'model' },
      }],
    });
    const result = parseGeminiStream(event);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('test');
    expect(result!.model).toBeUndefined();
  });

  it('normalizes pro model version', () => {
    const event = JSON.stringify({
      candidates: [{
        content: { parts: [{ text: 'x' }] },
      }],
      modelVersion: 'gemini-2.5-pro-exp-03-25',
    });
    const result = parseGeminiStream(event);
    expect(result!.model).toBe('gemini-2.5-pro');
  });
});
