import {
  app,
  BrowserWindow,
  Tray,
  nativeImage,
  ipcMain,
  screen,
  shell,
  Menu,
} from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync, watch } from 'node:fs';
import { homedir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { request } from 'node:http';
import { aggregateEvents, type UsageTotals, type UsageEvent } from '@ecoliko/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPANION_PORT = 7432;

interface Snapshot {
  capturedAt: number;
  totals: UsageTotals;
}

type SnapshotWithSource = Snapshot & { _source: string };

/** Try companion HTTP API first, fall back to data.json on disk */
async function fetchLatestData(): Promise<SnapshotWithSource | null> {
  try {
    const data = await httpGet(`http://127.0.0.1:${COMPANION_PORT}/status`);
    const parsed = JSON.parse(data) as { totals: UsageTotals };
    return { capturedAt: Date.now(), totals: parsed.totals, _source: 'companion' };
  } catch { /* companion not running */ }

  return buildTotalsFromDisk();
}

function buildTotalsFromDisk(): SnapshotWithSource | null {
  const dataFile = join(homedir(), '.ecoliko', 'data.json');
  if (!existsSync(dataFile)) {
    console.log('[EcoLiko main] buildTotalsFromDisk: data.json not found');
    return null;
  }
  try {
    const raw = readFileSync(dataFile, 'utf8');
    const json = JSON.parse(raw) as { events?: UsageEvent[] };
    const events = json.events ?? [];
    console.log('[EcoLiko main] buildTotalsFromDisk: total events in file:', events.length);
    if (events.length === 0) return null;

    // Deduplicate by ID
    const seen = new Set<string>();
    const uniqueEvents = events.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    console.log('[EcoLiko main] buildTotalsFromDisk: unique events:', uniqueEvents.length);

    // Show all available data (not filtered by date)
    const totals = aggregateEvents(uniqueEvents);
    console.log('[EcoLiko main] buildTotalsFromDisk: totalTokens =', totals.totalTokens, 'eventCount =', totals.eventCount);
    return { capturedAt: Date.now(), totals, _source: 'disk' };
  } catch (e) {
    console.log('[EcoLiko main] buildTotalsFromDisk: error:', e);
    return null;
  }
}

/** Fetch per-day breakdown from companion, fall back to local data file */
async function fetchDays(period: string = 'week', offset: number = 0): Promise<unknown[] | null> {
  console.log('[EcoLiko main] fetchDays() called with period:', period, 'offset:', offset);
  try {
    const data = await httpGet(`http://127.0.0.1:${COMPANION_PORT}/status/days?period=${period}&offset=${offset}`);
    console.log('[EcoLiko main] fetchDays() got response from companion');
    const parsed = JSON.parse(data) as { days: unknown[] };
    return parsed.days;
  } catch (e) {
    console.log('[EcoLiko main] fetchDays() companion not available, falling back to disk:', e);
  }

  return buildDaysFromDisk(period, offset);
}

function buildWeekTotalsFromDisk(): UsageTotals | null {
  const dataFile = join(homedir(), '.ecoliko', 'data.json');
  if (!existsSync(dataFile)) return null;
  try {
    const raw = JSON.parse(readFileSync(dataFile, 'utf8')) as { events?: UsageEvent[] };
    const events = raw.events ?? [];
    if (events.length === 0) return null;

    // Deduplicate by ID to prevent inflated counts
    const seen = new Set<string>();
    const uniqueEvents = events.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    const now = Date.now();
    const sixDaysAgo = now - 6 * 24 * 60 * 60 * 1000;
    let weekEvents = uniqueEvents.filter(e => e.timestamp >= sixDaysAgo);

    // If no events in past 6 days, show all available data so the UI isn't blank
    if (weekEvents.length === 0) {
      weekEvents = uniqueEvents;
    }

    return aggregateEvents(weekEvents);
  } catch { return null; }
}

function buildDaysFromDisk(period: string = 'week', offset: number = 0): unknown[] | null {
  console.log('[EcoLiko main] buildDaysFromDisk() called with period:', period, 'offset:', offset);
  const dataFile = join(homedir(), '.ecoliko', 'data.json');
  if (!existsSync(dataFile)) {
    console.log('[EcoLiko main] data.json does not exist at', dataFile);
    return null;
  }
  try {
    const raw = JSON.parse(readFileSync(dataFile, 'utf8')) as { events?: UsageEvent[] };
    const events = raw.events ?? [];
    console.log('[EcoLiko main] Total events in data.json:', events.length);
    if (events.length === 0) return null;

    // Deduplicate by ID to prevent inflated counts
    const seen = new Set<string>();
    const uniqueEvents = events.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    console.log('[EcoLiko main] Unique events after deduplication:', uniqueEvents.length);

    let numDays: number;
    switch (period) {
      case 'day':   numDays = 1;  break;
      case 'month': numDays = 30; break;
      case 'hour':  numDays = 24; break;
      case 'week':
      default:      numDays = 7; break;
    }

    const days = [];
    if (period === 'hour') {
      const baseDay = new Date();
      baseDay.setDate(baseDay.getDate() - offset);
      baseDay.setHours(0, 0, 0, 0);
      const dateStr = `${baseDay.getFullYear()}-${String(baseDay.getMonth() + 1).padStart(2, '0')}-${String(baseDay.getDate()).padStart(2, '0')}`;
      for (let h = 0; h < 24; h++) {
        const hStart = new Date(baseDay); hStart.setHours(h, 0, 0, 0);
        const hEnd   = new Date(baseDay); hEnd.setHours(h, 59, 59, 999);
        const hourEvents = uniqueEvents.filter(e => e.timestamp >= hStart.getTime() && e.timestamp <= hEnd.getTime());
        const totals = aggregateEvents(hourEvents);
        days.push({ date: dateStr, hour: h, totals });
      }
    } else {
      for (let i = numDays - 1; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i - (offset * numDays));
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const dayEvents = uniqueEvents.filter(e => e.timestamp >= dayStart.getTime() && e.timestamp <= dayEnd.getTime());
        console.log(`[EcoLiko main] Day ${dayStart.toISOString().slice(0,10)}: ${dayEvents.length} events (ts range: ${dayStart.getTime()} to ${dayEnd.getTime()})`);
        const totals = aggregateEvents(dayEvents);
        const year = dayStart.getFullYear();
        const month = String(dayStart.getMonth() + 1).padStart(2, '0');
        const day = String(dayStart.getDate()).padStart(2, '0');
        days.push({ date: `${year}-${month}-${day}`, totals });
      }
    }

    console.log('[EcoLiko main] buildDaysFromDisk() returning', days.length, 'days');
    console.log('[EcoLiko main] First 3 days:', JSON.stringify(days.slice(0, 3)));
    return days;
  } catch (e) {
    console.log('[EcoLiko main] buildDaysFromDisk() error:', e);
    return null;
  }
}

interface DayRangeResult {
  days: unknown[];
  startDate: string;
  endDate: string;
}

function buildRangeFromDisk(startDate: string, endDate: string): DayRangeResult | null {
  const dataFile = join(homedir(), '.ecoliko', 'data.json');
  if (!existsSync(dataFile)) return null;
  try {
    const raw = JSON.parse(readFileSync(dataFile, 'utf8')) as { events?: UsageEvent[] };
    const events = raw.events ?? [];
    if (events.length === 0) return null;

    const seen = new Set<string>();
    const uniqueEvents = events.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dayEvents = uniqueEvents.filter(e => e.timestamp >= start.getTime() && e.timestamp <= end.getTime());
    const totals = aggregateEvents(dayEvents);

    return {
      days: [{ date: startDate, totals }],
      startDate,
      endDate,
    };
  } catch { return null; }
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(url, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function httpPost(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'POST' }, res => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ── Tray icon: generate a leaf-shaped RGBA PNG at runtime ──────────────────

function createLeafPng(size: number): Buffer {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  const crc32 = (buf: Buffer): number => {
    let c = 0xFFFFFFFF;
    for (const byte of buf) c = table[(c ^ byte) & 0xFF]! ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  // Forest green #3d6b4f, light vein #6aaa7f
  const [lr, lg, lb] = [0x3d, 0x6b, 0x4f];
  const [vr, vg, vb] = [0x6a, 0xaa, 0x7f];

  const half = size / 2;
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x++) {
      const cx = x - half + 0.5;
      const cy = y - half + 0.5;

      // Rotate coords -45° to get leaf axis aligned to top-right
      const lx = (cx - cy) / Math.SQRT2;
      const ly = (cx + cy) / Math.SQRT2;

      // Leaf body: ellipse semi-axes a (long) and b (short)
      const a = half * 0.82, b = half * 0.42;
      const inLeaf = (lx / a) * (lx / a) + (ly / b) * (ly / b) <= 1;

      // Midrib vein: thin line along the leaf axis (lx axis)
      const onVein = inLeaf && Math.abs(ly) < half * 0.07;

      // Stem: short nub below leaf tip (bottom-left corner)
      const stemCx = cx + half * 0.3, stemCy = cy - half * 0.3;
      const onStem = stemCx * stemCx + stemCy * stemCy >= (half * 0.6) * (half * 0.6)
        && Math.abs(stemCx / 1.5 - stemCy / 3) < 1.2
        && stemCy < 0 && stemCy > -half * 0.55;

      const off = y * rowSize + 1 + x * 4;
      if (onVein) {
        raw[off] = vr; raw[off+1] = vg; raw[off+2] = vb; raw[off+3] = 200;
      } else if (inLeaf) {
        raw[off] = lr; raw[off+1] = lg; raw[off+2] = lb; raw[off+3] = 255;
      } else if (onStem) {
        raw[off] = lr; raw[off+1] = lg; raw[off+2] = lb; raw[off+3] = 220;
      }
      // else: fully transparent
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── App bootstrap ────────────────────────────────────────────────────────────

// Hide from dock/taskbar — tray-only app
app.setLoginItemSettings?.({ openAtLogin: false });
if (process.platform === 'darwin') app.dock?.hide();

let tray: Tray;
let win: BrowserWindow;
let isPinned = false;
let displayMode: 'popup' | 'toolbar' = 'toolbar';

function getWindowConfig() {
  const isToolbar = displayMode === 'toolbar';
  return {
    width: 380,
    height: 580,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: !isToolbar,
    alwaysOnTop: !isToolbar,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  };
}

app.whenReady().then(() => {
  // Tray icon: forest green leaf
  const iconBuf = createLeafPng(32);
  const icon = nativeImage.createFromBuffer(iconBuf);
  tray = new Tray(icon);
  tray.setToolTip('EcoLiko — AI Impact Tracker');
  void refreshTrayTooltip();

  // Context menu (right-click)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => showWindow() },
    { label: 'Poll Now', click: () => triggerPoll() },
    { type: 'separator' },
    { label: 'Display Mode', submenu: [
      { label: 'Tray Popup', type: 'radio', checked: displayMode === 'popup', click: () => { displayMode = 'popup'; win.setSkipTaskbar(true); win.setAlwaysOnTop(true); } },
      { label: 'Floating Toolbar', type: 'radio', checked: displayMode === 'toolbar', click: () => { displayMode = 'toolbar'; win.setSkipTaskbar(false); win.setAlwaysOnTop(false); } },
    ]},
    { type: 'separator' },
    { label: 'Quit EcoLiko', click: () => app.quit() },
  ]));

  // Left-click shows window (or focuses if already visible)
  tray.on('click', () => {
    if (!win.isVisible()) {
      showWindow();
    } else if (!isPinned) {
      win.focus();
      void pushSnapshot();
    }
  });

  // Create popup window
  win = new BrowserWindow(getWindowConfig());

  win.loadFile(join(__dirname, '../renderer/index.html'));

  if (!app.isPackaged) {
    watch(join(__dirname, '../renderer'), { recursive: true }, () => {
      win.webContents.reload();
    });
  }

  // IPC handlers
  ipcMain.handle('ecoliko:get-data', () => fetchLatestData());
  ipcMain.handle('ecoliko:get-days', (_, period: string, offset: number = 0) => fetchDays(period, offset));
  ipcMain.handle('ecoliko:get-week', () => buildWeekTotalsFromDisk());
  ipcMain.handle('ecoliko:get-range', (_, startDate: string, endDate: string) => buildRangeFromDisk(startDate, endDate));
  ipcMain.handle('ecoliko:poll-now', async () => {
    await triggerPoll();
    // Wait a beat then push fresh data
    setTimeout(() => {
      void refreshTrayTooltip();
      void pushSnapshot();
    }, 3000);
    return true;
  });
  ipcMain.on('ecoliko:open-external', (_, url: string) => shell.openExternal(url));
  ipcMain.on('ecoliko:hide', () => win.hide());
  ipcMain.on('ecoliko:minimize', () => win.minimize());
  ipcMain.on('ecoliko:close', () => {
    isPinned = false;
    win.setSkipTaskbar(true);
    win.minimize();
  });
  ipcMain.handle('ecoliko:set-pinned', (_, pinned: boolean) => {
    isPinned = pinned;
    win.setSkipTaskbar(!pinned);
  });

  ipcMain.handle('ecoliko:set-display-mode', (_, mode: 'popup' | 'toolbar') => {
    displayMode = mode;
    const cfg = getWindowConfig();
    win.setSkipTaskbar(cfg.skipTaskbar);
    win.setAlwaysOnTop(cfg.alwaysOnTop);
  });

  ipcMain.on('ecoliko:set-startup', (_, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
  });

  // Poll companion every 60s for live tray tooltip updates
  setInterval(async () => {
    const snap = await fetchLatestData();
    setTrayTooltip(snap);
    if (win.isVisible()) pushSnapshot();
  }, 60_000);
});

app.on('window-all-closed', () => { /* keep alive in tray */ });

// ── Helpers ──────────────────────────────────────────────────────────────────

function showWindow(): void {
  // When pinned and already visible, just focus — don't snap back to tray position
  if (isPinned && win.isVisible()) {
    win.focus();
    void pushSnapshot();
    return;
  }

  if (!isPinned) {
    const bounds = tray.getBounds();
    const winBounds = win.getBounds();
    const { workArea } = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });

    // Position popup above tray (Windows) or below menu bar (macOS)
    let x = Math.round(bounds.x + bounds.width / 2 - winBounds.width / 2);
    let y = process.platform === 'darwin'
      ? Math.round(bounds.y + bounds.height + 4)
      : Math.round(bounds.y - winBounds.height - 4);

    // Clamp to screen work area
    x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - winBounds.width));
    y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - winBounds.height));

    win.setPosition(x, y);
  }

  void pushSnapshot();
  win.show();
  win.focus();
}

async function pushSnapshot(): Promise<void> {
  const snap = await fetchLatestData();
  setTrayTooltip(snap);
  win.webContents.send('ecoliko:snapshot', snap);
}

async function refreshTrayTooltip(): Promise<void> {
  setTrayTooltip(await fetchLatestData());
}

function setTrayTooltip(snap: SnapshotWithSource | null): void {
  if (!snap) {
    tray.setToolTip('EcoLiko — AI Impact Tracker');
    return;
  }

  const grade = snap.totals.ecoScore.grade;
  tray.setToolTip(`EcoLiko ${grade} — ${snap.totals.eventCount} interactions today`);
}

async function triggerPoll(): Promise<void> {
  try {
    await httpPost(`http://127.0.0.1:${COMPANION_PORT}/poll`);
    console.log('[desktop] Poll triggered successfully');
  } catch (err) {
    console.warn('[desktop] Poll trigger failed:', err);
  }
}
