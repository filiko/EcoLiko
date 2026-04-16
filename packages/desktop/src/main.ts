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
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { spawn } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { request } from 'node:http';
import { aggregateEvents, type UsageTotals, type UsageEvent } from '@ecoliko/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMPANION_PORT = 7432;
const SNAPSHOTS_DIR = join(homedir(), '.ecoliko', 'openclaw', 'snapshots');

interface Snapshot {
  capturedAt: number;
  totals: UsageTotals;
}

type SnapshotWithSource = Snapshot & { _source: string };

/** Try companion HTTP API first, fall back to latest openclaw snapshot on disk */
async function fetchLatestData(): Promise<SnapshotWithSource | null> {
  try {
    const data = await httpGet(`http://127.0.0.1:${COMPANION_PORT}/status`);
    const parsed = JSON.parse(data) as { totals: UsageTotals };
    return { capturedAt: Date.now(), totals: parsed.totals, _source: 'companion' };
  } catch { /* companion not running */ }

  if (!existsSync(SNAPSHOTS_DIR)) return null;
  const files = readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) return null;
  try {
    const snap = JSON.parse(readFileSync(join(SNAPSHOTS_DIR, files[0]!), 'utf8')) as Snapshot;
    return { ...snap, _source: 'openclaw' };
  } catch { return null; }
}

/** Fetch 7-day per-day breakdown from companion, fall back to local data file */
async function fetchDays(): Promise<unknown[] | null> {
  try {
    const data = await httpGet(`http://127.0.0.1:${COMPANION_PORT}/status/days`);
    const parsed = JSON.parse(data) as { days: unknown[] };
    return parsed.days;
  } catch { /* companion not running — fall back to local data */ }

  return buildDaysFromDisk();
}

function buildDaysFromDisk(): unknown[] | null {
  const dataFile = join(homedir(), '.ecoliko', 'data.json');
  if (!existsSync(dataFile)) return null;
  try {
    const raw = JSON.parse(readFileSync(dataFile, 'utf8')) as { events?: UsageEvent[] };
    const events = raw.events ?? [];
    if (events.length === 0) return null;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayEvents = events.filter(e => e.timestamp >= dayStart.getTime() && e.timestamp <= dayEnd.getTime());
      const totals = aggregateEvents(dayEvents);
      const year = dayStart.getFullYear();
      const month = String(dayStart.getMonth() + 1).padStart(2, '0');
      const day = String(dayStart.getDate()).padStart(2, '0');
      days.push({ date: `${year}-${month}-${day}`, totals });
    }
    return days;
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
let displayMode: 'popup' | 'toolbar' = 'popup';

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

  // Hide on blur (click outside) — unless pinned or in toolbar mode
  win.on('blur', () => {
    if (isPinned) return;
    const dm = displayMode as string;
    if (dm === 'toolbar') return;
    if (!win.webContents.isDevToolsOpened()) win.minimize();
  });

  // IPC handlers
  ipcMain.handle('ecoliko:get-data', () => fetchLatestData());
  ipcMain.handle('ecoliko:get-days', () => fetchDays());
  ipcMain.handle('ecoliko:poll-now', async () => {
    triggerPoll();
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

function triggerPoll(): void {
  const openclawCli = join(__dirname, '../../openclaw/dist/index.js');
  if (!existsSync(openclawCli)) {
    console.warn('[desktop] openclaw CLI not found at', openclawCli);
    return;
  }
  const child = spawn(process.execPath, [openclawCli, 'run'], { stdio: 'ignore' });
  child.unref();
}
