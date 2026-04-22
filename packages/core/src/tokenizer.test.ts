import { describe, it, expect } from 'vitest';
import { estimateTokenCount, detectContentType } from './tokenizer.js';

describe('estimateTokenCount', () => {
  it('estimates text tokens at ~4 chars per token', () => {
    const text = 'Hello, how are you doing today?'; // 30 chars
    const tokens = estimateTokenCount(text, 'text');
    expect(tokens).toBe(Math.ceil(30 / 4)); // 8
  });

  it('estimates code tokens at ~3.5 chars per token', () => {
    const code = 'const x = 42;'; // 14 chars
    const tokens = estimateTokenCount(code, 'code');
    expect(tokens).toBe(Math.ceil(14 / 3.5)); // 4
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('defaults to text mode', () => {
    const text = 'some text here';
    expect(estimateTokenCount(text)).toBe(estimateTokenCount(text, 'text'));
  });
});

describe('detectContentType', () => {
  it('detects JavaScript code', () => {
    const code = `const foo = bar();
    if (foo) {
      console.log(foo);
    }`;
    expect(detectContentType(code)).toBe('code');
  });

  it('detects Python code', () => {
    const code = `def hello():
    print("hello")
    return True`;
    expect(detectContentType(code)).toBe('code');
  });

  it('detects plain text', () => {
    const text = 'This is a regular sentence about programming concepts and ideas.';
    expect(detectContentType(text)).toBe('text');
  });
});
