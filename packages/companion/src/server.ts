/**
 * Companion HTTP server — localhost:7432
 *
 * Single source of truth for all EcoLiko data sources:
 *   - Browser extension (POSTs events here)
 *   - VS Code extension (POSTs events here)
 *   - Log pollers (Claude Code, etc.) write directly to store
 *
 * Endpoints:
 *   POST /events          — ingest a usage event from any source
 *   GET  /status          — today's aggregated totals (all sources)
 *   GET  /status/week     — last 7 days
 *   GET  /status/month    — last 30 days
 *   GET  /health          — liveness check (used by extension to detect companion)
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { aggregateEvents, type UsageEvent } from '@ecoliko/core';
import { saveEvent, getTodayEvents, getEventsByRange } from './store.js';

const PORT = 7432;

function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',    // Allow browser extension to reach us
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET';
  const url = req.url ?? '/';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // POST /events — ingest a usage event
  if (method === 'POST' && url === '/events') {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body) as Partial<UsageEvent>;

      if (!payload.platform || payload.inputTokens == null || payload.outputTokens == null) {
        json(res, 400, { error: 'Missing required fields: platform, inputTokens, outputTokens' });
        return;
      }

      const event: UsageEvent = {
        id: payload.id ?? crypto.randomUUID(),
        timestamp: payload.timestamp ?? Date.now(),
        platform: payload.platform,
        model: payload.model ?? 'default',
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        source: payload.source ?? 'extension',
      };

      saveEvent(event);
      json(res, 201, { ok: true, id: event.id });
    } catch (err) {
      json(res, 400, { error: 'Invalid JSON body' });
    }
    return;
  }

  // GET /status — today's totals
  if (method === 'GET' && url === '/status') {
    const events = getTodayEvents();
    const totals = aggregateEvents(events);
    json(res, 200, { totals, eventCount: events.length, period: 'today' });
    return;
  }

  // GET /status/week
  if (method === 'GET' && url === '/status/week') {
    const start = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const events = getEventsByRange(start, Date.now());
    const totals = aggregateEvents(events);
    json(res, 200, { totals, eventCount: events.length, period: 'week' });
    return;
  }

  // GET /status/month
  if (method === 'GET' && url === '/status/month') {
    const start = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const events = getEventsByRange(start, Date.now());
    const totals = aggregateEvents(events);
    json(res, 200, { totals, eventCount: events.length, period: 'month' });
    return;
  }

  // GET /status/days — last 7 days, one entry per day (for chart)
  if (method === 'GET' && url === '/status/days') {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const events = getEventsByRange(dayStart.getTime(), dayEnd.getTime());
      const totals = aggregateEvents(events);
      const year = dayStart.getFullYear();
      const month = String(dayStart.getMonth() + 1).padStart(2, '0');
      const day = String(dayStart.getDate()).padStart(2, '0');
      days.push({ date: `${year}-${month}-${day}`, totals });
    }
    json(res, 200, { days });
    return;
  }

  // GET /health
  if (method === 'GET' && url === '/health') {
    json(res, 200, { ok: true, version: '0.2.0', name: 'ecoliko-companion' });
    return;
  }

  json(res, 404, { error: 'Not found' });
}

export function startServer(): void {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      console.error('[companion] Request error:', err);
      try { json(res, 500, { error: 'Internal server error' }); } catch { /* already sent */ }
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[companion] HTTP server listening on http://127.0.0.1:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[companion] Port ${PORT} already in use — another instance may be running`);
    } else {
      console.error('[companion] Server error:', err);
    }
  });
}
