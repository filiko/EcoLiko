/**
 * Content script running in MAIN world.
 *
 * Intercepts fetch() calls and detects AI API requests by checking the URL
 * against AI_PROVIDERS domain list — no hardcoded per-platform patterns.
 * Adding a new AI provider = one line in ai-domains.ts.
 *
 * Communication: MAIN world cannot use chrome.runtime.sendMessage,
 * so events are postMessage'd to window; the ISOLATED relay picks them up.
 */

import { estimateTokenCount, detectContentType } from '@ecoliko/core';
import { detectProvider, isCompletionRequest } from './ai-domains.js';
import { parseOpenAISSE } from './platforms/openai-sse.js';
import { parseClaudeStream } from './platforms/claude.js';
import { parseGeminiStream } from './platforms/gemini.js';
import { parseChatGPTStream } from './platforms/chatgpt.js';

const ECOLIKO_MSG_TYPE = 'ECOLIKO_USAGE_EVENT';

// ── Fetch interception ────────────────────────────────────────────────────────

const originalFetch = window.fetch.bind(window);

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === 'string' ? input
    : input instanceof URL    ? input.href
    : (input as Request).url;

  const provider = detectProvider(url);
  if (!provider || !isCompletionRequest(url)) {
    return originalFetch(input, init);
  }

  // Estimate input tokens from request body before sending
  const inputTokens = extractInputTokens(init?.body);

  const response = await originalFetch(input, init);

  if (!response.body) return response;

  // Clone so the page still gets the full stream
  const [pageBody, ourBody] = response.body.tee();

  processStream(ourBody, provider.name, provider.format, provider.defaultModel, inputTokens);

  return new Response(pageBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

// ── Input token extraction ────────────────────────────────────────────────────

function extractInputTokens(body: BodyInit | null | undefined): number {
  if (!body) return 0;
  try {
    const text = typeof body === 'string' ? body
      : body instanceof ArrayBuffer ? new TextDecoder().decode(body)
      : null;
    if (!text) return 0;

    const parsed = JSON.parse(text);

    // Gather all message content regardless of provider format
    const messages =
      parsed.messages    ?? // OpenAI / Anthropic / most providers
      parsed.contents    ?? // Gemini
      parsed.prompt      ?? // Legacy completions
      [];

    let allText = '';
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (typeof m.content === 'string') {
          allText += m.content + ' ';
        } else if (Array.isArray(m.content)) {
          // OpenAI vision / multi-part content blocks
          for (const block of m.content) {
            if (block.text) allText += block.text + ' ';
          }
        } else if (Array.isArray(m.parts)) {
          // Gemini parts format
          for (const part of m.parts) {
            if (part.text) allText += part.text + ' ';
          }
        }
      }
    } else if (typeof messages === 'string') {
      allText = messages;
    }

    return estimateTokenCount(allText.trim(), detectContentType(allText));
  } catch {
    return 0;
  }
}

// ── Stream processing ─────────────────────────────────────────────────────────

async function processStream(
  body: ReadableStream<Uint8Array>,
  platformName: string,
  format: string,
  defaultModel: string,
  inputTokens: number,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedText = '';
  let detectedModel: string | undefined;
  let exactInputTokens: number | undefined;
  let exactOutputTokens: number | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue;

        const data = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;

        const chunk = parseChunk(data, format, platformName);
        if (!chunk) continue;

        accumulatedText += chunk.text;
        if (chunk.model) detectedModel = chunk.model;
        if (chunk.exactInputTokens != null) exactInputTokens = chunk.exactInputTokens;
        if (chunk.exactOutputTokens != null) exactOutputTokens = chunk.exactOutputTokens;
      }
    }
  } catch {
    // Stream read error — emit whatever we have
  } finally {
    reader.releaseLock();
  }

  const finalOutputTokens = exactOutputTokens
    ?? estimateTokenCount(accumulatedText, detectContentType(accumulatedText));
  const finalInputTokens = exactInputTokens ?? inputTokens;

  if (finalOutputTokens === 0 && finalInputTokens === 0) return;

  window.postMessage({
    type: ECOLIKO_MSG_TYPE,
    payload: {
      platform: platformName,
      model: detectedModel ?? defaultModel,
      inputTokens: finalInputTokens,
      outputTokens: finalOutputTokens,
      timestamp: Date.now(),
    },
  }, '*');
}

// ── Per-format chunk parsing ──────────────────────────────────────────────────

interface ChunkResult {
  text: string;
  model?: string;
  exactInputTokens?: number;
  exactOutputTokens?: number;
}

function parseChunk(data: string, format: string, platformName: string): ChunkResult | null {
  switch (format) {
    case 'openai-sse':
      // ChatGPT web UI uses a non-standard envelope; OpenAI API uses the standard one
      if (platformName === 'chatgpt') {
        return parseChatGPTStream(data) ?? parseOpenAISSE(data);
      }
      return parseOpenAISSE(data);

    case 'anthropic-sse':
      return parseClaudeStream(data);

    case 'gemini-json':
      return parseGeminiStream(data);

    default:
      // Unknown provider — try all parsers, return first match
      return (
        parseOpenAISSE(data) ??
        parseClaudeStream(data) ??
        parseGeminiStream(data) ??
        parseChatGPTStream(data) ??
        null
      );
  }
}
