import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { UsageEvent, Platform } from '@ecoliko/core';

function getCodexSessionsDir(): string {
  return join(homedir(), '.codex', 'sessions');
}

/**
 * Read the model name from ~/.codex/config.toml.
 * Uses a simple regex — no TOML parser dependency needed for a single field.
 */
function getCodexModel(): string {
  const configPath = join(homedir(), '.codex', 'config.toml');
  try {
    const content = readFileSync(configPath, 'utf-8');
    const match = /^model\s*=\s*"([^"]+)"/m.exec(content);
    return match ? normalizeCodexModel(match[1]) : 'gpt-4o';
  } catch {
    return 'gpt-4o';
  }
}

function normalizeCodexModel(model: string): string {
  if (model.startsWith('gpt-4.1-nano'))  return 'gpt-4.1-nano';
  if (model.startsWith('gpt-4.1-mini') || model.startsWith('gpt-4o-mini')) return 'gpt-4o-mini';
  if (model.startsWith('gpt-4.1') || model.startsWith('gpt-4o')) return 'gpt-4o';
  if (model.startsWith('o4-mini'))  return 'o4-mini';
  if (model.startsWith('o3-mini'))  return 'o3-mini';
  if (model.startsWith('o3'))       return 'o3';
  if (model.startsWith('o1'))       return 'o1';
  // gpt-5.x and future models pass through; estimator falls back to 'default' profile
  return model;
}

interface CodexEntry {
  timestamp?: string;
  type?: string;
  payload?: {
    type?: string;
    info?: {
      last_token_usage?: {
        input_tokens?: number;
        cached_input_tokens?: number;
        output_tokens?: number;
        reasoning_output_tokens?: number;
      };
    } | null;
  };
}

/**
 * Extract session ID from the rollout filename.
 * e.g. rollout-2026-03-30T17-34-28-019d4150-34d0-7662-8092-fc7f98e5d460.jsonl
 *   → 019d4150-34d0-7662-8092-fc7f98e5d460
 */
function sessionIdFromFilename(filename: string): string {
  // Last 36 chars before .jsonl are a UUID-style ID (may have dashes in different positions)
  const base = filename.replace(/\.jsonl$/, '');
  // Split by '-' and take last 5 segments which form the UUID
  const parts = base.split('-');
  if (parts.length >= 5) {
    return parts.slice(-5).join('-');
  }
  return base;
}

/**
 * Walk the 3-level YYYY/MM/DD session directory structure and return all .jsonl files,
 * sorted by modification time (oldest first) so the since filter works correctly.
 */
function listSessionFiles(sessionsDir: string): string[] {
  const files: string[] = [];
  try {
    for (const year of readdirSync(sessionsDir)) {
      const yearPath = join(sessionsDir, year);
      if (!statSync(yearPath).isDirectory()) continue;
      for (const month of readdirSync(yearPath)) {
        const monthPath = join(yearPath, month);
        if (!statSync(monthPath).isDirectory()) continue;
        for (const day of readdirSync(monthPath)) {
          const dayPath = join(monthPath, day);
          if (!statSync(dayPath).isDirectory()) continue;
          for (const file of readdirSync(dayPath)) {
            if (file.endsWith('.jsonl')) files.push(join(dayPath, file));
          }
        }
      }
    }
  } catch { /* sessions dir unreadable */ }

  files.sort((a, b) => {
    try { return statSync(a).mtimeMs - statSync(b).mtimeMs; } catch { return 0; }
  });
  return files;
}

/**
 * Parse OpenAI Codex CLI session logs into UsageEvents.
 *
 * Session files live at: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 * Each file contains one JSON object per line. Token usage is in entries where:
 *   type === "event_msg" AND payload.type === "token_count" AND payload.info !== null
 *
 * Uses last_token_usage (delta per turn), NOT total_token_usage (cumulative).
 * Reasoning tokens are included in outputTokens (they're autoregressive and expensive).
 *
 * @param since  Only return events after this timestamp (ms). Used by the poller.
 */
export function parseCodexLogs(since?: number): UsageEvent[] {
  const sessionsDir = getCodexSessionsDir();
  if (!existsSync(sessionsDir)) return [];

  const model = getCodexModel();
  const events: UsageEvent[] = [];
  const seen = new Set<string>();

  for (const filePath of listSessionFiles(sessionsDir)) {
    const sessionId = sessionIdFromFilename(filePath.split(/[\\/]/).pop() ?? '');

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch { continue; }

    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      let entry: CodexEntry;
      try { entry = JSON.parse(line) as CodexEntry; } catch { continue; }

      if (entry.type !== 'event_msg') continue;
      if (entry.payload?.type !== 'token_count') continue;
      if (!entry.payload.info) continue; // null info = rate-limit-only entry, no token data

      const usage = entry.payload.info.last_token_usage;
      if (!usage) continue;

      const timestamp = entry.timestamp
        ? new Date(entry.timestamp).getTime()
        : Date.now();

      if (since != null && timestamp < since) continue;

      const inputTokens =
        (usage.input_tokens ?? 0) +
        (usage.cached_input_tokens ?? 0);
      // reasoning_output_tokens are autoregressive — must be included for accurate energy estimates
      const outputTokens =
        (usage.output_tokens ?? 0) +
        (usage.reasoning_output_tokens ?? 0);

      if (inputTokens === 0 && outputTokens <= 2) continue; // trivial entries

      // Deterministic ID: sessionId + entry timestamp (unique per turn)
      const id = `codex:${sessionId}:${entry.timestamp ?? timestamp}`;
      if (seen.has(id)) continue;
      seen.add(id);

      events.push({
        id,
        timestamp,
        platform: 'codex' as Platform,
        model,
        inputTokens,
        outputTokens,
        source: 'cli',
      });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}
