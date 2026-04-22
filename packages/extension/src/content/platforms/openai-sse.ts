/**
 * Generic OpenAI-compatible SSE parser.
 *
 * Handles the standard format used by OpenAI and most compatible providers:
 * Mistral, Groq, Together, Fireworks, DeepSeek, Cohere (v2), xAI, OpenRouter, etc.
 *
 * SSE format:
 *   data: {"id":"...","choices":[{"delta":{"content":"...","role":"assistant"},...}],"model":"..."}
 *   data: {"usage":{"prompt_tokens":N,"completion_tokens":N,"total_tokens":N}}  ← end chunk
 *   data: [DONE]
 *
 * When stream_options.include_usage is set, the final chunk contains real token counts —
 * these are far more accurate than text-based estimation, so we extract them eagerly.
 */

export interface ParsedChunk {
  text: string;
  model?: string;
  /** Exact input token count from usage field, when available */
  exactInputTokens?: number;
  /** Exact output token count from usage field, when available */
  exactOutputTokens?: number;
}

export function parseOpenAISSE(data: string): ParsedChunk | null {
  if (data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data);

    // Usage-only chunk (end of stream with include_usage=true)
    if (parsed.usage && !parsed.choices) {
      return {
        text: '',
        exactInputTokens: parsed.usage.prompt_tokens,
        exactOutputTokens: parsed.usage.completion_tokens,
      };
    }

    const choices = parsed.choices;
    if (!Array.isArray(choices) || choices.length === 0) return null;

    const delta = choices[0]?.delta;
    const text = delta?.content ?? '';
    const model = parsed.model ? normalizeModel(parsed.model) : undefined;

    // Some providers send usage on the final non-empty chunk
    const usage = parsed.usage ?? choices[0]?.usage;
    if (usage?.prompt_tokens != null) {
      return {
        text,
        model,
        exactInputTokens: usage.prompt_tokens,
        exactOutputTokens: usage.completion_tokens ?? 0,
      };
    }

    return { text, model };
  } catch {
    return null;
  }
}

/**
 * Normalize model identifiers from various providers into the canonical
 * keys used in MODEL_ENERGY_PROFILES.
 */
function normalizeModel(model: string): string {
  const m = model.toLowerCase();

  // OpenAI
  if (m.includes('gpt-4.1-nano'))  return 'gpt-4.1-nano';
  if (m.includes('gpt-4.1-mini'))  return 'gpt-4.1-mini';
  if (m.includes('gpt-4.1'))       return 'gpt-4.1';
  if (m.includes('gpt-4o-mini'))   return 'gpt-4o-mini';
  if (m.includes('gpt-4o'))        return 'gpt-4o';
  if (m.includes('o4-mini'))       return 'o4-mini';
  if (m.includes('o3-mini'))       return 'o3-mini';
  if (m.includes('o3'))            return 'o3';
  if (m.includes('o1'))            return 'o1';

  // Anthropic
  if (m.includes('claude-opus-4'))    return 'claude-opus-4';
  if (m.includes('claude-sonnet-4') || m.includes('claude-3-7') || m.includes('claude-3.7')) return 'claude-sonnet-4';
  if (m.includes('haiku'))            return 'claude-haiku-3.5';

  // Google
  if (m.includes('gemini-2.5-pro'))   return 'gemini-2.5-pro';
  if (m.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';
  if (m.includes('gemini-2.0-flash')) return 'gemini-2.0-flash';
  if (m.includes('gemini-1.5-pro'))   return 'gemini-1.5-pro';
  if (m.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';

  // Mistral
  if (m.includes('mistral-large'))    return 'mistral-large';
  if (m.includes('mistral-small'))    return 'mistral-small';
  if (m.includes('codestral'))        return 'codestral';
  if (m.includes('devstral'))         return 'devstral';
  if (m.includes('mixtral-8x22b'))    return 'mixtral-8x22b';
  if (m.includes('mixtral'))          return 'mixtral-8x7b';
  if (m.includes('mistral-nemo'))     return 'mistral-nemo';

  // Cohere
  if (m.includes('command-r-plus') || m.includes('command-r7b') === false && m.includes('command-r')) return 'command-r-plus';
  if (m.includes('command-r7b'))    return 'command-r7b';

  // xAI
  if (m.includes('grok-3-mini'))    return 'grok-3-mini';
  if (m.includes('grok-3'))         return 'grok-3';
  if (m.includes('grok-2'))         return 'grok-2';

  // DeepSeek
  if (m.includes('deepseek-r1'))    return 'deepseek-r1';
  if (m.includes('deepseek-v3'))    return 'deepseek-v3';
  if (m.includes('deepseek-v2'))    return 'deepseek-v2';

  // Meta Llama (cloud-hosted)
  if (m.includes('llama-4-maverick'))  return 'llama-4-maverick';
  if (m.includes('llama-4-scout'))     return 'llama-4-scout';
  if (m.includes('llama-3.3-70b') || m.includes('llama3.3-70b')) return 'llama-3.3-70b';
  if (m.includes('llama-3.1-405b'))    return 'llama-3.1-405b';
  if (m.includes('llama-3.1-70b') || m.includes('llama3.1-70b')) return 'llama-3.1-70b';
  if (m.includes('llama-3.1-8b'))      return 'llama-3.1-8b';
  if (m.includes('llama-3') && m.includes('70b')) return 'llama-3.3-70b';
  if (m.includes('llama-3') && m.includes('8b'))  return 'llama-3.1-8b';

  // Mercury / Inception Labs
  if (m.includes('mercury-coder'))  return 'mercury-coder';
  if (m.includes('mercury'))        return 'mercury';

  // AI21 Labs
  if (m.includes('jamba-1.5-large') || m.includes('jamba-large')) return 'jamba-1.5-large';
  if (m.includes('jamba-1.5-mini')  || m.includes('jamba-mini'))  return 'jamba-1.5-mini';
  if (m.includes('jamba'))          return 'jamba-instruct';

  // Reka
  if (m.includes('reka-core'))      return 'reka-core';
  if (m.includes('reka-flash'))     return 'reka-flash';
  if (m.includes('reka-edge'))      return 'reka-edge';

  // Moonshot / Kimi
  if (m.includes('kimi-k1.5'))           return 'kimi-k1.5';
  if (m.includes('moonshot-v1-128k'))    return 'moonshot-v1-128k';
  if (m.includes('moonshot-v1-32k'))     return 'moonshot-v1-32k';
  if (m.includes('moonshot-v1-8k'))      return 'moonshot-v1-8k';

  // Qwen
  if (m.includes('qwq'))            return 'qwq-32b';
  if (m.includes('qwen-max'))       return 'qwen-max';
  if (m.includes('qwen-plus'))      return 'qwen-plus';
  if (m.includes('qwen-turbo'))     return 'qwen-turbo';
  if (m.includes('qwen-long'))      return 'qwen-long';

  // GLM (Zhipu)
  if (m.includes('glm-4-flash'))    return 'glm-4-flash';
  if (m.includes('glm-4'))          return 'glm-4';

  // Yi
  if (m.includes('yi-large'))       return 'yi-large';
  if (m.includes('yi-medium'))      return 'yi-medium';

  // Return raw model string — estimator will fall back to 'default' profile
  return model;
}
