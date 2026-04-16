import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ecoliko', {
  /** Fetch the latest snapshot from disk */
  getData: (): Promise<unknown> => ipcRenderer.invoke('ecoliko:get-data'),

  /** Fetch 7-day per-day breakdown for chart */
  getDays: (): Promise<unknown> => ipcRenderer.invoke('ecoliko:get-days'),

  /** Trigger an immediate poll via openclaw */
  pollNow: (): Promise<void> => ipcRenderer.invoke('ecoliko:poll-now'),

  /** Open a URL in the default browser */
  openExternal: (url: string): void => ipcRenderer.send('ecoliko:open-external', url),

  /** Hide the popup window */
  hide: (): void => ipcRenderer.send('ecoliko:hide'),

  /** Minimize the popup window */
  minimize: (): void => ipcRenderer.send('ecoliko:minimize'),

  /** Pin/unpin the window (stay visible, show in taskbar) */
  setPin: (pinned: boolean): Promise<void> => ipcRenderer.invoke('ecoliko:set-pinned', pinned),

  /** Set display mode: 'popup' (tray popup) or 'toolbar' (floating taskbar app) */
  setDisplayMode: (mode: 'popup' | 'toolbar'): Promise<void> => ipcRenderer.invoke('ecoliko:set-display-mode', mode),

  /** Subscribe to live snapshot updates pushed from main */
  onSnapshot: (cb: (snap: unknown) => void): (() => void) => {
    const handler = (_: unknown, snap: unknown) => cb(snap);
    ipcRenderer.on('ecoliko:snapshot', handler);
    return () => ipcRenderer.off('ecoliko:snapshot', handler);
  },
});
