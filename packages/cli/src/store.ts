import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { UsageEvent, UserConfig } from '@ecoliko/core';

const ECOLIKO_DIR = join(homedir(), '.ecoliko');
const DATA_FILE = join(ECOLIKO_DIR, 'data.json');
const CONFIG_FILE = join(ECOLIKO_DIR, 'config.json');

interface StoreData {
  events: UsageEvent[];
}

function ensureDir(): void {
  if (!existsSync(ECOLIKO_DIR)) {
    mkdirSync(ECOLIKO_DIR, { recursive: true });
  }
}

export function loadEvents(): UsageEvent[] {
  ensureDir();
  if (!existsSync(DATA_FILE)) return [];
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    const data: StoreData = JSON.parse(raw);
    const events = data.events ?? [];
    // Deduplicate by ID to prevent inflated counts from repeated saves
    const seen = new Set<string>();
    return events.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveEvent(event: UsageEvent): void {
  const events = loadEvents();
  if (events.some(e => e.id === event.id)) return; // Skip duplicates
  events.push(event);
  ensureDir();
  writeFileSync(DATA_FILE, JSON.stringify({ events }, null, 2), 'utf-8');
}

export function saveEvents(newEvents: UsageEvent[]): void {
  if (newEvents.length === 0) return;
  const events = loadEvents();
  const existingIds = new Set(events.map(e => e.id));
  for (const event of newEvents) {
    if (!existingIds.has(event.id)) {
      events.push(event);
      existingIds.add(event.id);
    }
  }
  ensureDir();
  writeFileSync(DATA_FILE, JSON.stringify({ events }, null, 2), 'utf-8');
}

export function loadConfig(): UserConfig {
  ensureDir();
  if (!existsSync(CONFIG_FILE)) return {};
  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(raw);
}

export function saveConfig(config: UserConfig): void {
  ensureDir();
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
}

/** Get events from today only */
export function getTodayEvents(): UsageEvent[] {
  const events = loadEvents();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const startMs = todayStart.getTime();
  return events.filter(e => e.timestamp >= startMs);
}

/** Get events within a date range */
export function getEventsByRange(startMs: number, endMs: number): UsageEvent[] {
  const events = loadEvents();
  return events.filter(e => e.timestamp >= startMs && e.timestamp <= endMs);
}
