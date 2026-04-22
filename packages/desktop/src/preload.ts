import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ecoliko', {
  /** Fetch the latest snapshot from disk */
  getData: (): Promise<unknown> => ipcRenderer.invoke('ecoliko:get-data'),

  /** Fetch per-day breakdown for chart (period: 'day' | 'week' | 'month', offset: number for period shifting) */
  getDays: (period: string = 'week', offset: number = 0): Promise<unknown> => ipcRenderer.invoke('ecoliko:get-days', period, offset),

  /** Fetch aggregated totals for the past 7 days */
  getWeek: (): Promise<unknown> => ipcRenderer.invoke('ecoliko:get-week'),

  /** Fetch data for an arbitrary date range */
  getRange: (startDate: string, endDate: string): Promise<unknown> => ipcRenderer.invoke('ecoliko:get-range', startDate, endDate),

  /** Trigger an immediate poll via companion server */
  pollNow: (): Promise<void> => ipcRenderer.invoke('ecoliko:poll-now'),

  /** Open a URL in the default browser */
  openExternal: (url: string): void => ipcRenderer.send('ecoliko:open-external', url),

  /** Hide the popup window */
  hide: (): void => ipcRenderer.send('ecoliko:hide'),

  /** Close the popup window */
  close: (): void => ipcRenderer.send('ecoliko:close'),

  /** Minimize the popup window */
  minimize: (): void => ipcRenderer.send('ecoliko:minimize'),

  /** Pin/unpin the window (stay visible, show in taskbar) */
  setPin: (pinned: boolean): Promise<void> => ipcRenderer.invoke('ecoliko:set-pinned', pinned),

  /** Set display mode: 'popup' (tray popup) or 'toolbar' (floating taskbar app) */
  setDisplayMode: (mode: 'popup' | 'toolbar'): Promise<void> => ipcRenderer.invoke('ecoliko:set-display-mode', mode),

  /** Enable/disable launch at login */
  setStartup: (enabled: boolean): Promise<void> => ipcRenderer.invoke('ecoliko:set-startup', enabled),

  /** Subscribe to live snapshot updates pushed from main */
  onSnapshot: (cb: (snap: unknown) => void): (() => void) => {
    const handler = (_: unknown, snap: unknown) => cb(snap);
    ipcRenderer.on('ecoliko:snapshot', handler);
    return () => ipcRenderer.off('ecoliko:snapshot', handler);
  },
});
