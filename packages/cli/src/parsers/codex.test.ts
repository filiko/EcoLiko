import { describe, it, expect } from 'vitest';
import { parseCodexLogs } from './codex.js';

describe('parseCodexLogs', () => {
  it('returns an array', () => {
    const events = parseCodexLogs();
    expect(Array.isArray(events)).toBe(true);
  });

  it('finds events from installed Codex CLI', () => {
    const events = parseCodexLogs();
    // Codex CLI is installed on this machine with active sessions
    expect(events.length).toBeGreaterThan(0);
  });

  it('every event has required fields', () => {
    const events = parseCodexLogs();
    for (const event of events.slice(0, 50)) {
      expect(event.id).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.platform).toBe('codex');
      expect(typeof event.model).toBe('string');
      expect(event.model.length).toBeGreaterThan(0);
      expect(typeof event.inputTokens).toBe('number');
      expect(typeof event.outputTokens).toBe('number');
      expect(event.inputTokens).toBeGreaterThanOrEqual(0);
      expect(event.outputTokens).toBeGreaterThanOrEqual(0);
      expect(event.source).toBe('cli');
    }
  });

  it('events are sorted by timestamp ascending', () => {
    const events = parseCodexLogs();
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
    }
  });

  it('since filter excludes older events', () => {
    const all = parseCodexLogs();
    if (all.length < 2) return;
    const midpoint = all[Math.floor(all.length / 2)].timestamp;
    const filtered = parseCodexLogs(midpoint);
    expect(filtered.length).toBeLessThan(all.length);
    for (const event of filtered) {
      expect(event.timestamp).toBeGreaterThanOrEqual(midpoint);
    }
  });

  it('no duplicate IDs', () => {
    const events = parseCodexLogs();
    const ids = new Set(events.map(e => e.id));
    expect(ids.size).toBe(events.length);
  });

  it('IDs are deterministic (same parse = same IDs)', () => {
    const first = parseCodexLogs();
    const second = parseCodexLogs();
    expect(first.length).toBe(second.length);
    for (let i = 0; i < Math.min(first.length, 20); i++) {
      expect(first[i].id).toBe(second[i].id);
    }
  });

  it('no trivial events', () => {
    const events = parseCodexLogs();
    for (const event of events) {
      const isTrivial = event.inputTokens === 0 && event.outputTokens <= 2;
      expect(isTrivial).toBe(false);
    }
  });

  it('token counts are reasonable (not absurdly large per-turn)', () => {
    const events = parseCodexLogs();
    for (const event of events) {
      // A single turn should not exceed 1M tokens (sanity check for using
      // last_token_usage instead of accidentally using total_token_usage)
      expect(event.inputTokens).toBeLessThan(1_000_000);
      expect(event.outputTokens).toBeLessThan(1_000_000);
    }
  });
});
