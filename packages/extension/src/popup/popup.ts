import {
  aggregateEvents,
  type UsageEvent,
  type EcoScore,
  type UsageTotals,
} from '@ecoliko/core';

// DOM elements
const scoreBadge    = document.getElementById('score-badge')!;
const energyValue   = document.getElementById('energy-value')!;
const waterValue    = document.getElementById('water-value')!;
const waterRaw      = document.getElementById('water-raw')!;
const co2Value      = document.getElementById('co2-value')!;
const interactions  = document.getElementById('interactions')!;
const interactionsS = document.getElementById('interactions-s')!;
const totalTokens   = document.getElementById('total-tokens')!;
const scoreText     = document.getElementById('score-text')!;
const chart         = document.getElementById('chart')!;
const tipText       = document.getElementById('tip-text')!;

function formatEnergy(kwh: number): string {
  if (kwh < 0.001) return `${(kwh * 1_000_000).toFixed(1)} μWh`;
  if (kwh < 1)     return `${(kwh * 1000).toFixed(1)} Wh`;
  return `${kwh.toFixed(3)} kWh`;
}

function formatWaterRaw(liters: number): string {
  const ml = liters * 1000;
  if (ml < 1)    return `${(ml * 1000).toFixed(1)} μL`;
  if (ml < 1000) return `${ml.toFixed(1)} mL`;
  return `${liters.toFixed(2)} L`;
}

function describeWater(liters: number): string {
  const ml = liters * 1000;
  if (ml < 5)    return formatWaterRaw(liters);
  if (ml < 44)   return '< 1 shot glass';
  if (ml < 88)   return '~1 shot glass';
  if (ml < 500)  return `${(ml / 44).toFixed(1)} shot glasses`;
  if (ml < 1000) return `${(ml / 500).toFixed(1)} water bottle${ml >= 1050 ? 's' : ''}`;
  if (ml < 3785) return `${(ml / 1000).toFixed(2)} L`;
  return `${(ml / 3785).toFixed(2)} gallons`;
}

function formatCO2(grams: number): string {
  if (grams < 1)    return `${(grams * 1000).toFixed(1)} mg`;
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams.toFixed(1)} g`;
}

function getChipClass(grade: EcoScore['grade']): string {
  const map: Record<string, string> = {
    'A+': 'chip-a-plus', 'A': 'chip-a', 'B': 'chip-b',
    'C': 'chip-c', 'D': 'chip-d', 'F': 'chip-f',
  };
  return map[grade] ?? 'chip-a';
}

function getTip(totals: UsageTotals): string {
  if (totals.eventCount === 0)  return 'Start using AI tools — EcoLiko will track your impact.';
  if (totals.ecoScore.grade === 'A+' || totals.ecoScore.grade === 'A') return 'Your AI usage is on the low-impact end today.';
  if (totals.ecoScore.grade === 'F')  return 'Consider switching to smaller models (Haiku, Flash, Mini) for simple tasks.';
  if (totals.totalTokens > 100000)    return 'Reduce token usage with smarter memory management: github.com/mem0ai/mem0';
  return 'Smaller models use ~60% less energy for equivalent simple tasks.';
}

function renderChart(allEvents: UsageEvent[]): void {
  chart.innerHTML = '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTokens: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const dayEvents = allEvents.filter(
      e => e.timestamp >= dayStart.getTime() && e.timestamp <= dayEnd.getTime()
    );
    dailyTokens.push(dayEvents.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0));
  }

  const maxTokens = Math.max(...dailyTokens, 1);

  for (let i = 0; i < 7; i++) {
    const dayIndex = (new Date().getDay() - 6 + i + 7) % 7;
    const height = Math.max(3, (dailyTokens[i] / maxTokens) * 52);
    const fraction = dailyTokens[i] / maxTokens;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${height}px`;
    bar.style.background = fraction > 0.7 ? '#a63d3d' : fraction > 0.3 ? '#b5883a' : '#3d6b4f';
    bar.title = `${days[dayIndex]}: ${dailyTokens[i].toLocaleString()} tokens`;

    const label = document.createElement('div');
    label.className = 'chart-bar-label';
    label.textContent = days[dayIndex];
    bar.appendChild(label);

    chart.appendChild(bar);
  }
}

const COMPANION_URL = 'http://127.0.0.1:7432';

// Connection status indicator
const statusDot = document.getElementById('connection-dot');
const statusLabel = document.getElementById('connection-label');

function setConnectionStatus(connected: boolean): void {
  if (!statusDot || !statusLabel) return;
  statusDot.className = connected ? 'dot dot-connected' : 'dot dot-browser';
  statusLabel.textContent = connected ? 'All sources' : 'Browser only';
  statusLabel.title = connected
    ? 'Connected to EcoLiko Desktop — showing all AI usage'
    : 'Install EcoLiko Desktop to also track Claude Code, Cursor, and other desktop tools';
}

async function tryFetchCompanion(): Promise<UsageTotals | null> {
  try {
    const res = await fetch(`${COMPANION_URL}/status`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { totals: UsageTotals };
    return data.totals;
  } catch {
    return null;
  }
}

async function render(): Promise<void> {
  // Try companion first (unified data from all sources)
  const companionTotals = await tryFetchCompanion();

  if (companionTotals) {
    setConnectionStatus(true);
    renderTotals(companionTotals);
    // Still render chart from companion week data if possible
    await renderChartFromCompanion();
    return;
  }

  // Fallback: browser-only chrome.storage data
  setConnectionStatus(false);
  const { events = [] }: { events?: UsageEvent[] } = await chrome.storage.local.get('events');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEvents = events.filter(e => e.timestamp >= todayStart.getTime());
  const totals = aggregateEvents(todayEvents);
  renderTotals(totals);
  renderChart(events);
}

function renderTotals(totals: UsageTotals): void {
  scoreBadge.textContent = totals.ecoScore.grade;
  scoreBadge.className = `score-chip ${getChipClass(totals.ecoScore.grade)}`;

  energyValue.textContent = formatEnergy(totals.impact.energyKwh);
  waterValue.textContent  = describeWater(totals.impact.waterLiters);
  waterRaw.textContent    = formatWaterRaw(totals.impact.waterLiters);
  co2Value.textContent    = formatCO2(totals.impact.co2Grams);

  const count = totals.eventCount;
  interactions.textContent  = count.toString();
  interactionsS.textContent = count === 1 ? '' : 's';
  totalTokens.textContent   = totals.totalTokens.toLocaleString();
  scoreText.textContent     = `${totals.ecoScore.grade} (${totals.ecoScore.value}/100)`;
  tipText.textContent       = getTip(totals);
}

async function renderChartFromCompanion(): Promise<void> {
  try {
    const res = await fetch(`${COMPANION_URL}/status/week`, {
      signal: AbortSignal.timeout(1500),
    });
    // If companion returns all events we'd render the chart — for now show static placeholder
    // TODO: companion /status/week should return per-day breakdown
  } catch { /* ignore */ }
}

render();

// Re-render when local storage changes (fallback path)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.events) void render();
});

// Re-render every 60s to pick up desktop tool events from companion
setInterval(() => void render(), 60_000);
