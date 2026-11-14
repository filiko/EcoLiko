import { describe, it, expect } from 'vitest';
import { parseClaudeCodeLogs, listClaudeProjects, normalizeModel } from './claude-code.js';

// These are integration tests over the real ~/.claude/projects logs on the
// machine running them, so their duration scales with local log volume
// (hundreds of MB on a heavy user's machine). The default 5 s per-test limit
// is too tight for that; the parser itself is not the bottleneck (file I/O is).
describe('parseClaudeCodeLogs', { timeout: 30_000 }, () => {
  it('returns an array', () => {
    const events = parseClaudeCodeLogs();
    expect(Array.isArray(events)).toBe(true);
  });

  it('every event has required fields', () => {
    const events = parseClaudeCodeLogs();
    for (const event of events.slice(0, 50)) {
      expect(event.id).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.platform).toBe('claude-code');
      expect(typeof event.model).toBe('string');
      expect(event.model.length).toBeGreaterThan(0);
      expect(event.model).not.toBe('<synthetic>');
      expect(typeof event.inputTokens).toBe('number');
      expect(typeof event.outputTokens).toBe('number');
      expect(event.source).toBe('cli');
    }
  });

  it('events are sorted by timestamp ascending', () => {
    const events = parseClaudeCodeLogs();
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
    }
  });

  it('since filter excludes older events', () => {
    const all = parseClaudeCodeLogs();
    if (all.length < 2) return; // skip if not enough data
    const midpoint = all[Math.floor(all.length / 2)].timestamp;
    const filtered = parseClaudeCodeLogs(midpoint);
    expect(filtered.length).toBeLessThan(all.length);
    for (const event of filtered) {
      expect(event.timestamp).toBeGreaterThanOrEqual(midpoint);
    }
  });

  it('no duplicate IDs', () => {
    const events = parseClaudeCodeLogs();
    const ids = new Set(events.map(e => e.id));
    expect(ids.size).toBe(events.length);
  });

  it('no trivial events (0 input + <=2 output)', () => {
    const events = parseClaudeCodeLogs();
    for (const event of events) {
      const isTrivial = event.inputTokens === 0 && event.outputTokens <= 2;
      expect(isTrivial).toBe(false);
    }
  });

  it('model names are normalized', () => {
    const events = parseClaudeCodeLogs();
    const claudeModels = events.filter(e => e.model.startsWith('claude-'));
    for (const event of claudeModels) {
      // No dated snapshot suffix (claude-sonnet-4-20260301) or context tag ([1m])
      expect(event.model).not.toMatch(/-\d{8}$/);
      expect(event.model).not.toMatch(/\[.*\]$/);
      expect(event.model).toBe(normalizeModel(event.model));
    }
  });
});

describe('normalizeModel', () => {
  it('collapses Claude 4.x and 3.x ids to profile keys', () => {
    expect(normalizeModel('claude-sonnet-4-20250514')).toBe('claude-sonnet-4');
    expect(normalizeModel('claude-opus-4-1-20250805')).toBe('claude-opus-4');
    expect(normalizeModel('claude-haiku-4-5-20251001')).toBe('claude-haiku-4.5');
    expect(normalizeModel('claude-3-5-haiku-20241022')).toBe('claude-haiku-3.5');
  });

  it('turns newer ids into dotted versions without suffixes', () => {
    expect(normalizeModel('claude-opus-5-5')).toBe('claude-opus-5.5');
    expect(normalizeModel('claude-opus-5-5[1m]')).toBe('claude-opus-5.5');
    expect(normalizeModel('claude-sonnet-5-5-20260901')).toBe('claude-sonnet-5.5');
    expect(normalizeModel('claude-fable-5-2')).toBe('claude-fable-5.2');
    expect(normalizeModel('claude-opus-6')).toBe('claude-opus-6');
  });

  it('is idempotent', () => {
    for (const id of ['claude-opus-5.5', 'claude-sonnet-4', 'claude-haiku-4.5', 'opus']) {
      expect(normalizeModel(id)).toBe(id);
    }
  });
});

describe('listClaudeProjects', () => {
  it('returns project directory paths', () => {
    const projects = listClaudeProjects();
    expect(Array.isArray(projects)).toBe(true);
    // On this machine, Claude Code is installed
    expect(projects.length).toBeGreaterThan(0);
  });
});
