/**
 * Fallback store for when companion is unavailable.
 * Writes directly to ~/.ecoliko/data.json — same file the CLI reads.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { UsageEvent } from '@ecoliko/core';

const ECOLIKO_DIR = join(homedir(), '.ecoliko');
const DATA_FILE = join(ECOLIKO_DIR, 'data.json');

function ensureDir(): void {
  if (!existsSync(ECOLIKO_DIR)) mkdirSync(ECOLIKO_DIR, { recursive: true });
}

export function writeEventToFile(event: UsageEvent): void {
  try {
    ensureDir();
    const raw = existsSync(DATA_FILE) ? readFileSync(DATA_FILE, 'utf-8') : '{"events":[]}';
    const data = JSON.parse(raw) as { events: UsageEvent[] };
    data.events.push(event);
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // File system error — silently ignore, don't crash the editor
  }
}
