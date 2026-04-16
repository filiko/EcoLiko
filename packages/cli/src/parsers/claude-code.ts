import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { UsageEvent, Platform } from '@ecoliko/core';
import { randomUUID } from 'node:crypto';

/**
 * All directories where Claude Code may write session logs.
 * Mirrors ccusage's multi-path discovery logic.
 */
function getClaudeDirs(): string[] {
  const dirs: string[] = [];
  const home = homedir();

  // Respect CLAUDE_CONFIG_DIR env var (comma-separated, same as ccusage)
  const envDirs = process.env.CLAUDE_CONFIG_DIR;
  if (envDirs) {
    for (const d of envDirs.split(',').map(s => s.trim()).filter(Boolean)) {
      dirs.push(join(d, 'projects'));
    }
    return dirs;
  }

  // Default locations
  dirs.push(join(home, '.claude', 'projects'));          // macOS / Linux default
  dirs.push(join(home, '.config', 'claude', 'projects')); // XDG base dir spec
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming');
    dirs.push(join(appData, 'Claude', 'projects'));        // Windows
  }

  return dirs.filter(existsSync);
}

interface ClaudeLogEntry {
  type?: string;
  timestamp?: string;
  uuid?: string;
  requestId?: string;
  sessionId?: string;
  isApiErrorMessage?: boolean;
  message?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
    };
  };
}

/**
 * Parse Claude Code JSONL session logs into UsageEvents.
 *
 * Aligned with ccusage's parsing approach:
 * - Deduplicates by message.id + requestId (same request in multiple files = 1 event)
 * - Skips <synthetic> model entries (Claude Code internal messages)
 * - Skips isApiErrorMessage entries
 * - Scans all Claude config directories including XDG and Windows paths
 *
 * @param since  Only return events after this timestamp (ms). Used by the poller
 *               to avoid re-ingesting already-seen events.
 */
export function parseClaudeCodeLogs(since?: number): UsageEvent[] {
  const dirs = getClaudeDirs();
  if (dirs.length === 0) return [];

  const events: UsageEvent[] = [];
  // Dedup key = message.id + requestId (mirrors ccusage's dedup logic)
  const seen = new Set<string>();

  for (const claudeDir of dirs) {
    const projects = readdirSync(claudeDir).filter(f => {
      try { return statSync(join(claudeDir, f)).isDirectory(); } catch { return false; }
    });

    for (const projectDir of projects) {
      const projectPath = join(claudeDir, projectDir);
      const files = readdirSync(projectPath)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => join(projectPath, f));

      // Sort files by their last-modified time so we process in chronological order
      files.sort((a, b) => {
        try { return statSync(a).mtimeMs - statSync(b).mtimeMs; } catch { return 0; }
      });

      for (const filePath of files) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            try {
              parseEntry(JSON.parse(line) as ClaudeLogEntry, seen, since, events);
            } catch { /* skip malformed line */ }
          }
        } catch { /* skip unreadable file */ }
      }
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

function parseEntry(
  entry: ClaudeLogEntry,
  seen: Set<string>,
  since: number | undefined,
  out: UsageEvent[],
): void {
  // Only assistant messages contain token usage
  if (entry.type !== 'assistant') return;
  if (!entry.message?.usage) return;

  // Skip error messages (rate limits etc) — they don't represent real AI usage
  if (entry.isApiErrorMessage) return;

  // Skip <synthetic> — Claude Code's internal tool-call messages
  const model = entry.message.model ?? '';
  if (model === '<synthetic>') return;

  // Deduplication: same message appearing in multiple project dirs/files
  const dedupKey = [entry.message.id, entry.requestId].filter(Boolean).join(':');
  if (dedupKey) {
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
  }

  const timestamp = entry.timestamp
    ? new Date(entry.timestamp).getTime()
    : Date.now();

  if (since != null && timestamp < since) return;

  const usage = entry.message.usage;
  // Count all token types — cache tokens still consumed energy
  const inputTokens =
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const outputTokens = usage.output_tokens ?? 0;

  if (inputTokens === 0 && outputTokens <= 2) return; // trivial stop-token entries

  out.push({
    id: entry.uuid ?? entry.requestId ?? randomUUID(),
    timestamp,
    platform: 'claude-code' as Platform,
    model: normalizeModel(model),
    inputTokens,
    outputTokens,
    source: 'cli',
  });
}

function normalizeModel(model: string): string {
  if (model.startsWith('claude-opus-4'))   return 'claude-opus-4';
  if (model.startsWith('claude-sonnet-4')) return 'claude-sonnet-4';
  if (model.startsWith('claude-haiku-4'))  return 'claude-haiku-4.5';
  if (model.startsWith('claude-haiku-3'))  return 'claude-haiku-3.5';
  return model;
}

/**
 * Returns full paths to all Claude project directories across all config dirs.
 */
export function listClaudeProjects(): string[] {
  const dirs = getClaudeDirs();
  const paths: string[] = [];
  for (const claudeDir of dirs) {
    for (const f of readdirSync(claudeDir)) {
      const p = join(claudeDir, f);
      try { if (statSync(p).isDirectory()) paths.push(p); } catch { /* skip */ }
    }
  }
  return paths;
}
