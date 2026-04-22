import { describe, it, expect } from 'vitest';
import { discoverTools } from './discovery.js';

describe('discoverTools', () => {
  it('returns an array of detected tools', () => {
    const tools = discoverTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    const tools = discoverTools();
    for (const tool of tools) {
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.platform).toBe('string');
      expect(typeof tool.logPath).toBe('string');
      expect(typeof tool.supported).toBe('boolean');
    }
  });

  it('detects Claude Code as supported (installed on this machine)', () => {
    const tools = discoverTools();
    const claude = tools.find(t => t.platform === 'claude-code');
    expect(claude).toBeDefined();
    expect(claude!.supported).toBe(true);
  });

  it('detects OpenAI Codex CLI as supported (installed on this machine)', () => {
    const tools = discoverTools();
    const codex = tools.find(t => t.platform === 'codex');
    expect(codex).toBeDefined();
    expect(codex!.supported).toBe(true);
    expect(codex!.logPath).toContain('sessions');
  });

  it('detects Cursor (installed on this machine)', () => {
    const tools = discoverTools();
    const cursor = tools.find(t => t.platform === 'cursor');
    expect(cursor).toBeDefined();
  });

  it('includes Amazon Kiro IDE entry', () => {
    const tools = discoverTools();
    const kiro = tools.find(t => t.platform === 'kiro');
    expect(kiro).toBeDefined();
    expect(kiro!.name).toBe('Amazon Kiro IDE');
  });

  it('includes Amazon Q Extension entry', () => {
    const tools = discoverTools();
    const amazonQ = tools.find(t => t.platform === 'amazon-q');
    expect(amazonQ).toBeDefined();
    expect(amazonQ!.name).toBe('Amazon Q Extension');
  });

  it('includes Ollama entry', () => {
    const tools = discoverTools();
    const ollama = tools.find(t => t.platform === 'ollama');
    expect(ollama).toBeDefined();
  });

  it('platform values are unique', () => {
    const tools = discoverTools();
    const platforms = tools.map(t => t.platform);
    expect(new Set(platforms).size).toBe(platforms.length);
  });
});
