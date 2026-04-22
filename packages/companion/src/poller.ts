/**
 * Log poller — periodically reads desktop AI tool logs and saves new events.
 *
 * Each poller tracks the last-seen timestamp so it never double-counts.
 * New tools are added by implementing the LogPoller interface.
 */

import { saveEvent, saveEvents } from './store.js';
import { parseClaudeCodeLogs, parseCodexLogs } from 'ecoliko/parsers';
import type { UsageEvent, Platform } from '@ecoliko/core';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const POLL_INTERVAL_MS = 60_000; // 1 minute

// Track highest timestamp seen per source to avoid re-importing
const highWatermarks = new Map<string, number>();

// Default token estimates for tools that don't provide token counts
const DEFAULT_INPUT_TOKENS = 1000;
const DEFAULT_OUTPUT_TOKENS = 300;

export async function pollClaudeCode(): Promise<void> {
  const key = 'claude-code';
  const since = highWatermarks.get(key) ?? 0;

  try {
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

export async function pollCodex(): Promise<void> {
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

async function pollCursor(): Promise<void> {
  const key = 'cursor';
  const since = highWatermarks.get(key) ?? 0;

  try {
    const home = homedir();
    const cursorDir = join(home, '.cursor');
    const aiTrackingDb = join(cursorDir, 'ai-tracking', 'ai-code-tracking.db');

    if (!existsSync(aiTrackingDb)) return;

    const stats = statSync(aiTrackingDb);
    const dbMtime = stats.mtimeMs;

    // Skip if DB hasn't been modified since last poll
    if (dbMtime <= since) return;

    // Check for any project directories modified since last poll
    const projectsDir = join(cursorDir, 'projects');
    if (!existsSync(projectsDir)) return;

    let hasRecentActivity = false;
    try {
      const projectDirs = readdirSync(projectsDir).filter(f => {
        try { return statSync(join(projectsDir, f)).isDirectory(); } catch { return false; }
      });

      for (const projectDir of projectDirs) {
        const projectPath = join(projectsDir, projectDir);
        try {
          const projectStats = statSync(projectPath);
          if (projectStats.mtimeMs > since) {
            hasRecentActivity = true;
            break;
          }
          // Also check subdirectories
          const subDirs = readdirSync(projectPath).filter(f => {
            try { return statSync(join(projectPath, f)).isDirectory(); } catch { return false; }
          });
          for (const subDir of subDirs) {
            const subStats = statSync(join(projectPath, subDir));
            if (subStats.mtimeMs > since) {
              hasRecentActivity = true;
              break;
            }
          }
          if (hasRecentActivity) break;
        } catch { /* skip unreadable */ }
      }
    } catch { /* skip if projects dir not readable */ }

    if (!hasRecentActivity) return;

    // Record an event with default token estimates
    const event: UsageEvent = {
      id: `cursor:${dbMtime}`,
      timestamp: dbMtime,
      platform: 'cursor' as Platform,
      model: 'cursor',
      inputTokens: DEFAULT_INPUT_TOKENS,
      outputTokens: DEFAULT_OUTPUT_TOKENS,
      source: 'cli',
    };

    saveEvent(event);
    highWatermarks.set(key, Math.max(since, dbMtime));
  } catch {
    // Cursor not installed or logs not readable — silently skip
  }
}

async function pollOllama(): Promise<void> {
  const key = 'ollama';
  const since = highWatermarks.get(key) ?? 0;

  try {
    const home = homedir();
    const ollamaDir = join(home, '.ollama');

    if (!existsSync(ollamaDir)) return;

    // Check server.log for recent modifications
    const serverLog = join(ollamaDir, 'logs', 'server.log');
    if (!existsSync(serverLog)) return;

    const stats = statSync(serverLog);
    const logMtime = stats.mtimeMs;

    // Skip if log hasn't been modified since last poll
    if (logMtime <= since) return;

    // Read the last few lines of the log to check for recent API activity
    try {
      const content = readFileSync(serverLog, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      const recentLines = lines.slice(-50); // Last 50 lines

      let hasApiActivity = false;
      for (const line of recentLines) {
        // Look for indicators of API requests
        if (line.includes('POST') || line.includes('generating') || line.includes('model')) {
          hasApiActivity = true;
          break;
        }
      }

      if (!hasApiActivity) return;
    } catch { /* skip unreadable log */ }

    const event: UsageEvent = {
      id: `ollama:${logMtime}`,
      timestamp: logMtime,
      platform: 'ollama' as Platform,
      model: 'ollama',
      inputTokens: DEFAULT_INPUT_TOKENS,
      outputTokens: DEFAULT_OUTPUT_TOKENS,
      source: 'cli',
    };

    saveEvent(event);
    highWatermarks.set(key, Math.max(since, logMtime));
  } catch {
    // Ollama not installed or logs not readable — silently skip
  }
}

export async function pollOpenCode(): Promise<void> {
  const key = 'opencode';
  const since = highWatermarks.get(key) ?? 0;
  console.log('[pollOpenCode] Starting, since:', since);

  try {
    // Get OpenCode database path
    let dbPath: string;
    try {
      dbPath = execSync('opencode db path', { encoding: 'utf-8', timeout: 5000 }).trim();
      console.log('[pollOpenCode] dbPath:', dbPath);
    } catch (e) {
      console.log('[pollOpenCode] opencode CLI not available:', e);
      return; // opencode CLI not available
    }

    if (!existsSync(dbPath)) {
      console.log('[pollOpenCode] dbPath does not exist');
      return;
    }

    // Query messages since 'since' timestamp
    // Each message has: id, time_created, data (JSON with modelID, tokens, role)
    const sinceClause = since > 0 ? `AND time_created > ${since}` : '';
    const query = `
      SELECT
        id,
        time_created as timestamp,
        json_extract(data, '$.modelID') as model,
        json_extract(data, '$.tokens.input') as input_tokens,
        json_extract(data, '$.tokens.output') as output_tokens,
        json_extract(data, '$.tokens.cache.read') as cache_read,
        json_extract(data, '$.tokens.cache.write') as cache_write
      FROM message
      WHERE json_extract(data, '$.role') = 'assistant'
        AND (
          json_extract(data, '$.tokens.input') > 0
          OR json_extract(data, '$.tokens.output') > 0
          OR json_extract(data, '$.tokens.cache.read') > 0
          OR json_extract(data, '$.tokens.cache.write') > 0
        )
        ${sinceClause}
      ORDER BY time_created ASC
    `.replace(/\s+/g, ' ').trim();

    const raw = execSync(`opencode db "${query.replace(/"/g, '\\"')}" --format json`, {
      encoding: 'utf-8',
      timeout: 10000,
    });

    interface OpenCodeMessage {
      id: string;
      timestamp: number;
      model: string;
      input_tokens: number;
      output_tokens: number;
      cache_read: number;
      cache_write: number;
    }

    let messages: OpenCodeMessage[] = [];
    try {
      messages = JSON.parse(raw) as OpenCodeMessage[];
      console.log('[pollOpenCode] Query returned', messages.length, 'messages');
    } catch (e) {
      console.log('[pollOpenCode] JSON parse error:', e, 'raw:', raw?.slice(0, 200));
      return; // invalid JSON response
    }

    let newest = since;
    const eventsToSave: UsageEvent[] = [];
    for (const msg of messages) {
      // Count all input tokens (regular + cache read) - cache write is output overhead
      const inputTokens = (msg.input_tokens ?? 0) + (msg.cache_read ?? 0);
      const outputTokens = (msg.output_tokens ?? 0) + (msg.cache_write ?? 0);

      if (inputTokens === 0 && outputTokens <= 2) continue;

      const event: UsageEvent = {
        id: `opencode:${msg.id}`,
        timestamp: msg.timestamp,
        platform: 'minimax' as Platform, // OpenCode is being used with MiniMax API
        model: msg.model ?? 'unknown',
        inputTokens,
        outputTokens,
        source: 'cli',
      };

      eventsToSave.push(event);
      if (msg.timestamp > newest) newest = msg.timestamp;
    }

    if (eventsToSave.length > 0) {
      saveEvents(eventsToSave);
    }
    console.log('[pollOpenCode] Saving', eventsToSave.length, 'events, newest watermark:', newest);
    if (newest > since) highWatermarks.set(key, newest);
  } catch (e) {
    console.log('[pollOpenCode] Error:', e);
    // OpenCode not installed or database not readable — silently skip
  }
}

export async function triggerImmediatePoll(): Promise<void> {
  await Promise.all([
    pollClaudeCode(),
    pollCodex(),
    pollCursor(),
    pollOllama(),
    pollOpenCode(),
  ]);
}

export function startPollers(): void {
  // Run immediately on startup, then on interval
  void triggerImmediatePoll();

  setInterval(() => {
    void triggerImmediatePoll();
  }, POLL_INTERVAL_MS);

  console.log(`[companion] Log pollers started (interval: ${POLL_INTERVAL_MS / 1000}s)`);
}