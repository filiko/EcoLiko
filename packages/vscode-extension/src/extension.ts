/**
 * EcoLiko VS Code Extension
 *
 * Works in VS Code, Cursor, Windsurf, Void, and any other VS Code fork.
 * No fork-specific code — all VS Code forks share the same extension API.
 *
 * Tracking approach:
 *   1. vscode.lm API hook — intercepts Language Model requests made by
 *      any extension (GitHub Copilot, Continue, Codeium, etc.)
 *   2. Reports events to companion at localhost:7432, or writes directly
 *      to ~/.ecoliko/data.json when companion is unavailable
 *   3. Shows eco score in the status bar
 */

import * as vscode from 'vscode';
import { estimateTokenCount, estimateImpact } from '@ecoliko/core';
import { writeEventToFile } from './store';

const COMPANION_URL = 'http://127.0.0.1:7432';

let statusBarItem: vscode.StatusBarItem;
let companionAvailable = false;

// ── Activation ────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  // Status bar item — shows today's eco score
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.tooltip = 'EcoLiko — AI Environmental Impact (click to refresh)';
  statusBarItem.command = 'ecoliko.showStatus';
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ecoliko.showStatus', showStatusPanel),
  );

  // Hook VS Code Language Model API (available in VS Code 1.90+)
  hookLanguageModelApi(context);

  // Check companion and update status bar
  void checkCompanionAndRefresh();
  const timer = setInterval(() => void checkCompanionAndRefresh(), 60_000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  console.log('EcoLiko extension activated');
}

export function deactivate(): void {
  statusBarItem?.dispose();
}

// ── Language Model API hook ───────────────────────────────────────────────────

function hookLanguageModelApi(context: vscode.ExtensionContext): void {
  // vscode.lm is available in VS Code 1.90+ (and all forks based on it)
  // It fires for any extension using the Language Model API — Copilot, Continue, etc.
  if (!('lm' in vscode)) return;

  const lm = (vscode as unknown as { lm: { onDidChangeChatModels: vscode.Event<unknown> } }).lm;

  // We intercept via the workspace edit / output channel approach:
  // VS Code doesn't expose a direct "on request sent" hook yet,
  // so we use the available diagnostics + document change heuristics
  // as a lightweight signal. Full token counting uses the request/response
  // objects when vscode.lm.sendRequest is available.
  try {
    // Monkey-patch vscode.lm.sendRequest if available (VS Code 1.90+)
    patchLmSendRequest(context);
  } catch {
    // lm API not available in this fork/version — fall back to passive estimation
    watchDocumentChangesForActivity(context);
  }
}

function patchLmSendRequest(context: vscode.ExtensionContext): void {
  const lmApi = (vscode as unknown as Record<string, Record<string, unknown>>)['lm'];
  if (!lmApi || typeof lmApi['sendRequest'] !== 'function') return;

  const originalSendRequest = lmApi['sendRequest'] as Function;

  lmApi['sendRequest'] = async function (...args: unknown[]) {
    const startTime = Date.now();
    const result = await originalSendRequest.apply(this, args);

    // Extract model and token info from the request args
    const modelOrFamily = (args[0] as { id?: string; family?: string } | undefined);
    const model = modelOrFamily?.id ?? modelOrFamily?.family ?? 'default';
    const messages = args[1] as { content?: string }[] | undefined;

    const inputText = Array.isArray(messages)
      ? messages.map(m => m?.content ?? '').join(' ')
      : '';
    const inputTokens = estimateTokenCount(inputText);

    // Collect output from the stream
    let outputText = '';
    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      const originalResult = result;
      // Wrap the async iterator to intercept output chunks
      return wrapStream(originalResult, model, inputTokens, startTime);
    }

    return result;
  };

  context.subscriptions.push({
    dispose: () => { lmApi['sendRequest'] = originalSendRequest; },
  });
}

async function wrapStream(
  stream: AsyncIterable<{ value?: string }>,
  model: string,
  inputTokens: number,
  _startTime: number,
): Promise<AsyncIterable<{ value?: string }>> {
  // Return a new async generator that proxies the stream and counts tokens
  const chunks: Array<{ value?: string }> = [];

  async function* proxy() {
    let outputText = '';
    for await (const chunk of stream) {
      chunks.push(chunk);
      outputText += chunk.value ?? '';
      yield chunk;
    }
    const outputTokens = estimateTokenCount(outputText);
    await reportEvent(detectPlatform(), normalizeVscodeModel(model), inputTokens, outputTokens);
  }

  return proxy();
}

/**
 * Fallback for forks where lm.sendRequest isn't patchable.
 * Watches for rapid document changes as a proxy for AI activity.
 * Less accurate but better than nothing.
 */
function watchDocumentChangesForActivity(context: vscode.ExtensionContext): void {
  let pendingChange: { charCount: number; timestamp: number } | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
    const change = event.contentChanges[0];
    if (!change || change.text.length < 50) return; // ignore small edits

    const charCount = change.text.length;
    if (!pendingChange) {
      pendingChange = { charCount, timestamp: Date.now() };
    } else {
      pendingChange.charCount += charCount;
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!pendingChange) return;
      const outputTokens = estimateTokenCount(pendingChange.charCount.toString().padEnd(pendingChange.charCount, 'x'));
      void reportEvent(detectPlatform(), 'default', 0, outputTokens);
      pendingChange = null;
    }, 2000);
  });

  context.subscriptions.push(disposable);
}

// ── Event reporting ───────────────────────────────────────────────────────────

async function reportEvent(
  platform: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const event = {
    id: generateId(),
    timestamp: Date.now(),
    platform,
    model,
    inputTokens,
    outputTokens,
    source: 'cli' as const,
  };

  if (companionAvailable) {
    try {
      await fetch(`${COMPANION_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(3000),
      });
      void checkCompanionAndRefresh();
      return;
    } catch {
      companionAvailable = false;
    }
  }

  // Fallback: write directly to ~/.ecoliko/data.json
  writeEventToFile(event);
  void refreshStatusBar();
}

// ── Companion check + status bar ──────────────────────────────────────────────

async function checkCompanionAndRefresh(): Promise<void> {
  try {
    const res = await fetch(`${COMPANION_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    companionAvailable = res.ok;
  } catch {
    companionAvailable = false;
  }
  await refreshStatusBar();
}

async function refreshStatusBar(): Promise<void> {
  const config = vscode.workspace.getConfiguration('ecoliko');
  if (!config.get('showStatusBar')) {
    statusBarItem.hide();
    return;
  }

  try {
    if (companionAvailable) {
      const res = await fetch(`${COMPANION_URL}/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = (await res.json()) as { totals: { ecoScore: { grade: string } } };
        statusBarItem.text = `$(leaf) ${data.totals.ecoScore.grade}`;
        statusBarItem.show();
        return;
      }
    }
  } catch { /* ignore */ }

  statusBarItem.text = '$(leaf) EcoLiko';
  statusBarItem.show();
}

function showStatusPanel(): void {
  const url = `${COMPANION_URL}/status`;
  vscode.env.openExternal(vscode.Uri.parse(url));
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Detect which AI coding tool we're running inside.
 * Checks VS Code fork identity first (appName), then falls back to
 * checking whether Amazon Q extension is installed in this instance.
 */
function detectPlatform(): string {
  const appName = vscode.env.appName.toLowerCase();
  if (appName.includes('cursor'))   return 'cursor';
  if (appName.includes('kiro'))     return 'kiro';
  if (appName.includes('windsurf')) return 'windsurf';
  // Amazon Q Developer extension installed in this VS Code/Cursor instance?
  if (vscode.extensions.getExtension('amazonwebservices.amazon-q-vscode')) return 'amazon-q';
  return 'vscode-lm';
}

function normalizeVscodeModel(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('gpt-4o-mini') || m.includes('gpt4o-mini')) return 'gpt-4o-mini';
  if (m.includes('gpt-4o') || m.includes('gpt4o'))           return 'gpt-4o';
  if (m.includes('claude-opus'))   return 'claude-opus-4';
  if (m.includes('claude-sonnet')) return 'claude-sonnet-4';
  if (m.includes('claude-haiku'))  return 'claude-haiku-3.5';
  if (m.includes('gemini-flash'))  return 'gemini-2.0-flash';
  if (m.includes('gemini-pro'))    return 'gemini-2.5-pro';
  if (m.includes('o3-mini'))       return 'o3-mini';
  if (m.includes('o3'))            return 'o3';
  return model;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
