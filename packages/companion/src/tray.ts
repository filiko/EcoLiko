/**
 * System tray integration.
 *
 * Uses node-systray when available (optional dependency).
 * Falls back to a no-op if not installed, so the companion works
 * as a headless background process too.
 *
 * Tray shows a live status row and refreshes frequently.
 */

import { getTodayEvents } from './store.js';
import { aggregateEvents } from '@ecoliko/core';

const GRADE_EMOJI: Record<string, string> = {
  'A+': '🌿', 'A': '🌱', 'B': '🍃',
  'C': '⚠️', 'D': '🔴', 'F': '💀',
};

const TRAY_REFRESH_INTERVAL_MS = 15_000;

function currentTotals() {
  return aggregateEvents(getTodayEvents());
}

function getStatusLabel(): string {
  const totals = currentTotals();
  const grade = totals.ecoScore.grade;
  const count = totals.eventCount;
  const suffix = count === 1 ? '' : 's';
  return `Status: ${GRADE_EMOJI[grade] ?? ''} ${grade} | ${count} interaction${suffix} today`;
}

function getTrayTooltip(): string {
  const totals = currentTotals();
  const count = totals.eventCount;
  const suffix = count === 1 ? '' : 's';
  return `EcoLiko ${totals.ecoScore.grade} - ${count} interaction${suffix} today`;
}

export async function startTray(): Promise<void> {
  try {
    // Dynamic import - optional dep, fails gracefully if not installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { default: SysTray } = await import('systray2' as string) as any;

    const statusItem = {
      title: getStatusLabel(),
      tooltip: getTrayTooltip(),
      checked: false,
      enabled: false,
    };

    const tray = new SysTray({
      menu: {
        icon: '', // no icon path - uses default
        title: 'EcoLiko',
        tooltip: getTrayTooltip(),
        items: [
          statusItem,
          SysTray.separator,
          { title: 'Open Dashboard', tooltip: '', checked: false, enabled: true },
          { title: 'Refresh Status', tooltip: '', checked: false, enabled: true },
          SysTray.separator,
          { title: 'Quit EcoLiko', tooltip: '', checked: false, enabled: true },
        ],
      },
      debug: false,
      copyDir: true,
    });

    const refreshTray = (): void => {
      statusItem.title = getStatusLabel();
      statusItem.tooltip = getTrayTooltip();
      tray.sendAction({
        type: 'update-item',
        item: statusItem,
      });
    };

    tray.onClick((action: { item?: { title?: string } }) => {
      const title = action.item?.title ?? '';
      if (title === 'Open Dashboard') {
        // Electron/desktop UI can hook here later.
        console.log('[companion] Dashboard requested');
        return;
      }

      if (title === 'Refresh Status') {
        refreshTray();
        return;
      }

      if (title === 'Quit EcoLiko') {
        tray.kill(false);
        process.exit(0);
      }
    });

    refreshTray();

    // Refresh often enough that extension writes feel live.
    setInterval(() => {
      refreshTray();
    }, TRAY_REFRESH_INTERVAL_MS);

    console.log('[companion] System tray started');
  } catch {
    // systray2 not installed or unsupported platform - run headless
    console.log('[companion] Tray unavailable - running headless');
  }
}
