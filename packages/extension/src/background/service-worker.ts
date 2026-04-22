/**
 * Background service worker.
 *
 * Receives usage events from content scripts, computes impact estimates,
 * and routes them to the right store:
 *
 *   Companion running  →  POST localhost:7432/events  (unified store)
 *   Companion absent   →  chrome.storage.local        (browser-only fallback)
 *
 * The popup reads from /status when companion is available, chrome.storage otherwise.
 */

import {
  aggregateEvents,
  type UsageEvent,
  type Platform,
  type UsageTotals,
} from '@ecoliko/core';

const ECOLIKO_MSG_TYPE = 'ECOLIKO_USAGE_EVENT';
const COMPANION_URL = 'http://127.0.0.1:7432';
const COMPANION_SYNC_ALARM = 'companion-sync';
const CLEANUP_ALARM = 'cleanup';
const COMPANION_SYNC_INTERVAL_MINUTES = 1;

// Cached companion availability — refreshed during startup sync and alarm ticks
let companionAvailable = false;

async function checkCompanionHealth(): Promise<void> {
  try {
    const res = await fetch(`${COMPANION_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    companionAvailable = res.ok;
  } catch {
    companionAvailable = false;
  }

  // Broadcast updated connection state to popup
  chrome.runtime.sendMessage({ type: 'COMPANION_STATUS', available: companionAvailable })
    .catch(() => { /* popup not open */ });
}

async function syncBadgeSnapshot(): Promise<void> {
  await checkCompanionHealth();
  if (companionAvailable) {
    const refreshed = await refreshBadgeFromCompanion();
    if (refreshed) return;
  }

  const result = await chrome.storage.local.get('events');
  const events: UsageEvent[] = (result.events as UsageEvent[]) ?? [];
  await updateBadge(events);
}

function ensureRecurringAlarms(): void {
  chrome.alarms.create(COMPANION_SYNC_ALARM, {
    periodInMinutes: COMPANION_SYNC_INTERVAL_MINUTES,
  });
  chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 * 24 });
}

// MV3 service workers are suspended when idle, so alarms are more reliable
// than setInterval for keeping the badge current.
ensureRecurringAlarms();
void syncBadgeSnapshot();

chrome.runtime.onStartup.addListener(() => {
  ensureRecurringAlarms();
  void syncBadgeSnapshot();
});

chrome.runtime.onInstalled.addListener(() => {
  ensureRecurringAlarms();
  void syncBadgeSnapshot();
});

// ── Event handling ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === ECOLIKO_MSG_TYPE) {
    handleUsageEvent(message.payload).then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_COMPANION_STATUS') {
    sendResponse({ available: companionAvailable });
    return false;
  }

  return false;
});

async function handleUsageEvent(payload: {
  platform: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
}): Promise<void> {
  const event: UsageEvent = {
    id: crypto.randomUUID(),
    timestamp: payload.timestamp,
    platform: payload.platform as Platform,
    model: payload.model,
    inputTokens: payload.inputTokens,
    outputTokens: payload.outputTokens,
    source: 'extension',
  };

  if (companionAvailable) {
    // Primary path: send to companion so all sources are unified
    try {
      await fetch(`${COMPANION_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(3000),
      });
      await refreshBadgeFromCompanion();
      return;
    } catch {
      // Companion became unavailable — fall through to local storage
      companionAvailable = false;
    }
  }

  // Fallback: store locally in chrome.storage
  await storeLocally(event);
}

async function storeLocally(event: UsageEvent): Promise<void> {
  const result = await chrome.storage.local.get('events');
  const events: UsageEvent[] = (result.events as UsageEvent[]) ?? [];
  events.push(event);

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = events.filter(e => e.timestamp > thirtyDaysAgo);
  await chrome.storage.local.set({ events: filtered });
  await updateBadge(filtered);
}

async function updateBadge(allEvents: UsageEvent[]): Promise<void> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEvents = allEvents.filter(e => e.timestamp >= todayStart.getTime());
  const totals = aggregateEvents(todayEvents);
  await setBadge(totals);
}

async function setBadge(totals: UsageTotals): Promise<void> {
  const colors: Record<string, string> = {
    'A+': '#22c55e', 'A': '#4ade80', 'B': '#facc15',
    'C': '#fb923c', 'D': '#ef4444', 'F': '#dc2626',
  };
  await chrome.action.setBadgeText({ text: totals.ecoScore.grade });
  await chrome.action.setBadgeBackgroundColor({
    color: colors[totals.ecoScore.grade] ?? '#6b7280',
  });
}

// Update badge from companion data when available
async function refreshBadgeFromCompanion(): Promise<boolean> {
  if (!companionAvailable) return false;
  try {
    const res = await fetch(`${COMPANION_URL}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = (await res.json()) as { totals: UsageTotals };
      await setBadge(data.totals);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === COMPANION_SYNC_ALARM) {
    await syncBadgeSnapshot();
    return;
  }

  if (alarm.name === CLEANUP_ALARM) {
    const result = await chrome.storage.local.get('events');
    const events: UsageEvent[] = (result.events as UsageEvent[]) ?? [];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = events.filter(e => e.timestamp > thirtyDaysAgo);
    await chrome.storage.local.set({ events: filtered });
    if (!companionAvailable) {
      await updateBadge(filtered);
    }
  }
});
