/**
 * Local HTTPS interception proxy — port 7433
 *
 * Sits between any app on this machine and AI API endpoints.
 * Intercepts requests to known AI domains, counts tokens, saves usage events.
 * Everything else is passed through untouched.
 *
 * How it works:
 *   1. HTTP CONNECT tunnel: client sends CONNECT api.openai.com:443
 *   2. Proxy establishes TLS to the real server using our local CA cert
 *   3. Proxy presents its own cert (signed by local CA) to the client
 *   4. Proxy reads plaintext, detects AI API calls, counts tokens
 *   5. Forwards to real server transparently
 *
 * Setup for non-tech users:
 *   - Companion generates a CA cert on first run (~/.ecoliko/ca.crt)
 *   - Installer calls trustCert() to add it to the OS trust store
 *   - User sets system proxy to localhost:7433 (installer does this too)
 *
 * On uninstall: installer calls revokeSystemProxy() and removeTrustedCert()
 */

import * as net from 'node:net';
import * as tls from 'node:tls';
import * as http from 'node:http';
import * as https from 'node:https';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { estimateTokenCount } from '@ecoliko/core';
import { saveEvent } from './store.js';
import type { UsageEvent } from '@ecoliko/core';

const PROXY_PORT = 7433;
const ECOLIKO_DIR = path.join(homedir(), '.ecoliko');
const CA_KEY_FILE = path.join(ECOLIKO_DIR, 'ca.key');
const CA_CERT_FILE = path.join(ECOLIKO_DIR, 'ca.crt');

// AI API domains to intercept (subset — proxied transparently if not listed)
const AI_DOMAINS = new Set([
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.groq.com',
  'openrouter.ai',
  'api.cohere.com',
  'api.together.xyz',
  'api.perplexity.ai',
  'api.deepseek.com',
  'api.x.ai',
  'api-inference.huggingface.co',
  'api.fireworks.ai',
]);

// ── Certificate management ────────────────────────────────────────────────────

export function ensureCaCert(): { key: Buffer; cert: Buffer } {
  if (!fs.existsSync(ECOLIKO_DIR)) fs.mkdirSync(ECOLIKO_DIR, { recursive: true });

  if (fs.existsSync(CA_KEY_FILE) && fs.existsSync(CA_CERT_FILE)) {
    return {
      key: fs.readFileSync(CA_KEY_FILE),
      cert: fs.readFileSync(CA_CERT_FILE),
    };
  }

  console.log('[proxy] Generating local CA certificate...');

  // Generate CA key pair and self-signed cert using Node's built-in crypto
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

  // Build a minimal self-signed CA cert using openssl (available on all platforms)
  // This is the simplest cross-platform approach
  const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  fs.writeFileSync(CA_KEY_FILE, keyPem, { mode: 0o600 });

  try {
    execSync(
      `openssl req -new -x509 -days 3650 -key "${CA_KEY_FILE}" ` +
      `-out "${CA_CERT_FILE}" ` +
      `-subj "/CN=EcoLiko Local CA/O=EcoLiko/C=US" ` +
      `-addext "basicConstraints=critical,CA:TRUE" ` +
      `-addext "keyUsage=critical,keyCertSign,cRLSign"`,
      { stdio: 'pipe' }
    );
    console.log(`[proxy] CA cert generated: ${CA_CERT_FILE}`);
  } catch (err) {
    console.error('[proxy] Failed to generate CA cert (openssl required):', err);
    throw err;
  }

  return {
    key: fs.readFileSync(CA_KEY_FILE),
    cert: fs.readFileSync(CA_CERT_FILE),
  };
}

/** Trust the EcoLiko CA cert in the OS certificate store. */
export function trustCaCert(): void {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync(`certutil -addstore -user Root "${CA_CERT_FILE}"`, { stdio: 'inherit' });
    } else if (platform === 'darwin') {
      execSync(
        `security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain-db "${CA_CERT_FILE}"`,
        { stdio: 'inherit' }
      );
    } else {
      // Linux — varies by distro
      execSync(`cp "${CA_CERT_FILE}" /usr/local/share/ca-certificates/ecoliko.crt && update-ca-certificates`, { stdio: 'inherit' });
    }
    console.log('[proxy] CA cert trusted in OS store');
  } catch (err) {
    console.error('[proxy] Could not auto-trust cert. Install manually:', CA_CERT_FILE);
  }
}

// ── Dynamic cert generation per-host ─────────────────────────────────────────

const certCache = new Map<string, { key: Buffer; cert: Buffer }>();

function getCertForHost(hostname: string, caKey: Buffer, caCert: Buffer): { key: Buffer; cert: Buffer } {
  if (certCache.has(hostname)) return certCache.get(hostname)!;

  const keyFile = path.join(ECOLIKO_DIR, `host_${hostname}.key`);
  const certFile = path.join(ECOLIKO_DIR, `host_${hostname}.crt`);

  if (!fs.existsSync(keyFile)) {
    execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: 'pipe' });
    execSync(
      `openssl req -new -key "${keyFile}" -subj "/CN=${hostname}" | ` +
      `openssl x509 -req -days 365 -CA "${CA_CERT_FILE}" -CAkey "${CA_KEY_FILE}" ` +
      `-CAcreateserial -out "${certFile}" ` +
      `-extfile <(echo "subjectAltName=DNS:${hostname}")`,
      { stdio: 'pipe', shell: '/bin/bash' }
    );
  }

  const entry = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  certCache.set(hostname, entry);
  return entry;
}

// ── Proxy server ──────────────────────────────────────────────────────────────

export function startProxy(): void {
  let caKey: Buffer;
  let caCert: Buffer;

  try {
    const ca = ensureCaCert();
    caKey = ca.key;
    caCert = ca.cert;
  } catch {
    console.log('[proxy] Skipping proxy startup (CA cert generation failed)');
    return;
  }

  const server = net.createServer((clientSocket) => {
    // Read the first line (CONNECT host:port HTTP/1.1)
    clientSocket.once('data', (data) => {
      const firstLine = data.toString().split('\r\n')[0];
      const connectMatch = firstLine.match(/^CONNECT ([^:]+):(\d+) HTTP/);

      if (!connectMatch) {
        // Plain HTTP (non-CONNECT) — pass through
        clientSocket.destroy();
        return;
      }

      const hostname = connectMatch[1];
      const port = parseInt(connectMatch[2], 10);
      const isAiDomain = AI_DOMAINS.has(hostname);

      // Acknowledge the CONNECT
      clientSocket.write('HTTP/1.1 200 Connection established\r\n\r\n');

      if (!isAiDomain) {
        // Not an AI domain — transparent tunnel, don't intercept
        const remote = net.createConnection(port, hostname);
        clientSocket.pipe(remote);
        remote.pipe(clientSocket);
        remote.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => remote.destroy());
        return;
      }

      // AI domain — intercept with TLS MITM
      try {
        const hostCert = getCertForHost(hostname, caKey, caCert);

        const serverTls = tls.createServer({
          key: hostCert.key,
          cert: hostCert.cert,
        });

        serverTls.on('secureConnection', (tlsSocket) => {
          interceptAiTraffic(tlsSocket, hostname, port);
        });

        serverTls.emit('connection', clientSocket);
      } catch (err) {
        // Can't generate cert — fall back to transparent tunnel
        const remote = net.createConnection(port, hostname);
        clientSocket.pipe(remote);
        remote.pipe(clientSocket);
      }
    });

    clientSocket.on('error', () => { /* ignore */ });
  });

  server.listen(PROXY_PORT, '127.0.0.1', () => {
    console.log(`[proxy] HTTPS interception proxy listening on localhost:${PROXY_PORT}`);
    console.log(`[proxy] Set system proxy to localhost:${PROXY_PORT} to enable desktop-app tracking`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[proxy] Port ${PROXY_PORT} in use — proxy already running`);
    } else {
      console.error('[proxy] Error:', err.message);
    }
  });
}

// ── AI traffic interception ───────────────────────────────────────────────────

function interceptAiTraffic(
  clientTls: tls.TLSSocket,
  hostname: string,
  port: number,
): void {
  // Connect to the real server
  const remoteTls = tls.connect(port, hostname, { servername: hostname });

  let requestBuffer = '';
  let responseBuffer = '';
  let requestMethod = '';
  let requestPath = '';
  let inBody = false;
  let contentLength = 0;
  let bodyBuffer = '';

  clientTls.on('data', (data: Buffer) => {
    const text = data.toString('utf-8');
    remoteTls.write(data); // forward to real server

    if (!inBody) {
      requestBuffer += text;
      if (requestBuffer.includes('\r\n\r\n')) {
        const headerEnd = requestBuffer.indexOf('\r\n\r\n');
        const headers = requestBuffer.slice(0, headerEnd);
        const firstLine = headers.split('\r\n')[0];
        [requestMethod, requestPath] = firstLine.split(' ');

        const clMatch = headers.match(/content-length:\s*(\d+)/i);
        contentLength = clMatch ? parseInt(clMatch[1], 10) : 0;
        bodyBuffer = requestBuffer.slice(headerEnd + 4);
        inBody = true;
      }
    } else {
      bodyBuffer += text;
    }
  });

  remoteTls.on('data', (data: Buffer) => {
    clientTls.write(data); // forward to client

    if (isCompletionPath(requestPath)) {
      responseBuffer += data.toString('utf-8');
    }
  });

  remoteTls.on('end', () => {
    clientTls.end();
    if (isCompletionPath(requestPath)) {
      processInterceptedExchange(hostname, requestPath, bodyBuffer, responseBuffer);
    }
  });

  clientTls.on('end', () => remoteTls.end());
  clientTls.on('error', () => remoteTls.destroy());
  remoteTls.on('error', () => clientTls.destroy());
}

function isCompletionPath(path: string): boolean {
  return (
    path.includes('/v1/chat/completions') ||
    path.includes('/v1/completions') ||
    path.includes('/v1/messages') ||
    path.includes('/generate_content') ||
    path.includes('/streamGenerateContent') ||
    path.includes('/chat/completions') ||
    path.includes('/inference')
  );
}

function processInterceptedExchange(
  hostname: string,
  path: string,
  requestBody: string,
  responseBody: string,
): void {
  try {
    let inputTokens = 0;
    let outputTokens = 0;
    let model = 'default';

    // Parse request for input tokens
    const reqJson = JSON.parse(requestBody);
    const messages = reqJson.messages ?? reqJson.contents ?? [];
    const inputText = Array.isArray(messages)
      ? messages.map((m: { content?: string }) => m.content ?? '').join(' ')
      : '';
    inputTokens = estimateTokenCount(inputText);
    if (reqJson.model) model = reqJson.model;

    // Parse SSE response for output tokens
    let outputText = '';
    let exactInput: number | undefined;
    let exactOutput: number | undefined;

    for (const line of responseBody.split('\n')) {
      const data = line.startsWith('data: ') ? line.slice(6).trim() : line.trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        // OpenAI-compatible delta
        const content = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.text ?? '';
        outputText += content;
        if (parsed.model) model = parsed.model;
        // Real token counts
        if (parsed.usage) {
          exactInput = parsed.usage.prompt_tokens;
          exactOutput = parsed.usage.completion_tokens;
        }
        // Anthropic SSE
        if (parsed.type === 'content_block_delta') outputText += parsed.delta?.text ?? '';
        if (parsed.type === 'message_start' && parsed.message?.model) model = parsed.message.model;
      } catch { /* not JSON */ }
    }

    outputTokens = exactOutput ?? estimateTokenCount(outputText);
    inputTokens = exactInput ?? inputTokens;

    if (inputTokens === 0 && outputTokens === 0) return;

    const platform = hostnameToplatform(hostname);

    const event: UsageEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      platform,
      model,
      inputTokens,
      outputTokens,
      source: 'cli',
    };

    saveEvent(event);
    console.log(`[proxy] Logged ${platform} ${model} — in:${inputTokens} out:${outputTokens}`);
  } catch {
    // Parse error — skip this exchange
  }
}

function hostnameToplatform(hostname: string): string {
  if (hostname.includes('openai'))      return 'openai';
  if (hostname.includes('anthropic'))   return 'anthropic';
  if (hostname.includes('google'))      return 'google';
  if (hostname.includes('mistral'))     return 'mistral';
  if (hostname.includes('groq'))        return 'groq';
  if (hostname.includes('openrouter'))  return 'openrouter';
  if (hostname.includes('cohere'))      return 'cohere';
  if (hostname.includes('together'))    return 'together';
  if (hostname.includes('perplexity'))  return 'perplexity';
  if (hostname.includes('deepseek'))    return 'deepseek';
  if (hostname.includes('x.ai'))        return 'grok';
  if (hostname.includes('huggingface')) return 'huggingface';
  if (hostname.includes('fireworks'))   return 'fireworks';
  return 'other';
}
