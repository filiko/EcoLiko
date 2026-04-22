#!/usr/bin/env node
/**
 * EcoLiko Companion — entry point
 *
 * Starts:
 *   1. HTTP server on localhost:7432 (unified event ingestion + status API)
 *   2. Log pollers (Claude Code, and future: Codex, Ollama, etc.)
 *   3. System tray icon (optional — degrades gracefully)
 *
 * Non-tech usage: double-click the bundled .exe / run from installer.
 * Power user usage: ecoliko-companion (auto-starts with system)
 */

import { startServer } from './server.js';
import { startPollers } from './poller.js';
import { startTray } from './tray.js';
import { startProxy } from './proxy.js';

console.log('EcoLiko Companion v0.2.0 starting...');

startServer();   // localhost:7432 — unified event API
startPollers();  // reads Claude Code logs every 60s
startProxy();    // localhost:7433 — HTTPS MITM proxy (optional, requires cert trust)
void startTray();

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n[companion] Shutting down');
  process.exit(0);
});
