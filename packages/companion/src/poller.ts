/**
 * Log poller — periodically reads desktop AI tool logs and saves new events.
 *
 * Each poller tracks the last-seen timestamp so it never double-counts.
 * New tools are added by implementing the LogPoller interface.
 */

import { saveEvent } from './store.js';
import { parseClaudeCodeLogs, parseCodexLogs } from 'ecoliko/parsers';
import type { UsageEvent } from '@ecoliko/core';

const POLL_INTERVAL_MS = 60_000; // 1 minute

// Track highest timestamp seen per source to avoid re-importing
const highWatermarks = new Map<string, number>();

async function pollClaudeCode(): Promise<void> {
  const key = 'claude-code';
  const since = highWatermarks.get(key) ?? 0;

  try {
    // parseClaudeCodeLogs handles all project dirs internally + deduplication
    const events = parseClaudeCodeLogs(since);
    let newest = since;

    for (const event of events) {
      saveEvent(event);
      if (event.timestamp > newest) newest = event.timestamp;
    }

    if (newest > since) highWatermarks.set(key, newest);
  } catch {
    // Claude Code not installed or logs not readable — silently skip
  }
}

async function pollCodex(): Promise<void> {
  const key = 'codex';
  const since = highWatermarks.get(key) ?? 0;
  try {
    const events = parseCodexLogs(since);
    let newest = since;
    for (const event of events) {
      saveEvent(event);
      if (event.timestamp > newest) newest = event.timestamp;
    }
    if (newest > since) highWatermarks.set(key, newest);
  } catch {
    // Codex CLI not installed or logs not readable — silently skip
  }
}

// Future pollers slot in here, same pattern:
// async function pollOllama(): Promise<void> { ... }

export function startPollers(): void {
  // Run immediately on startup, then on interval
  void pollClaudeCode();
  void pollCodex();

  setInterval(() => {
    void pollClaudeCode();
    void pollCodex();
  }, POLL_INTERVAL_MS);

  console.log(`[companion] Log pollers started (interval: ${POLL_INTERVAL_MS / 1000}s)`);
}
