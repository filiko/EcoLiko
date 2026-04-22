import { describe, it, expect } from 'vitest';
import { parseClaudeCodeLogs, listClaudeProjects } from './claude-code.js';

describe('parseClaudeCodeLogs', () => {
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
      // Should not have version suffixes like claude-sonnet-4-20260301
      expect(event.model).toMatch(/^claude-(opus-4|sonnet-4|haiku-4\.5|haiku-3\.5)$/);
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
