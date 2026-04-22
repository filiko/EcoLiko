/**
 * Authoritative list of AI provider domains and their metadata.
 *
 * Adding a new provider = one entry here. Nothing else needs to change.
 *
 * format:
 *   'openai-sse'    — OpenAI-compatible streaming: data: {"choices":[{"delta":{...}}]}
 *   'anthropic-sse' — Anthropic streaming: data: {"type":"content_block_delta",...}
 *   'gemini-json'   — Google streaming: JSON array of candidates
 *   'unknown'       — Try all parsers in order, use text estimation as fallback
 */
export type ResponseFormat = 'openai-sse' | 'anthropic-sse' | 'gemini-json' | 'unknown';

export interface AiProvider {
  domain: string;
  name: string;
  operator: string;
  format: ResponseFormat;
  defaultModel: string;
}

export const AI_PROVIDERS: AiProvider[] = [
  // ── OpenAI ────────────────────────────────────────────────────────────────
  { domain: 'api.openai.com',                    name: 'openai',      operator: 'microsoft', format: 'openai-sse',    defaultModel: 'gpt-4o' },
  { domain: 'chatgpt.com',                       name: 'chatgpt',     operator: 'microsoft', format: 'openai-sse',    defaultModel: 'gpt-4o' },
  { domain: 'chat.openai.com',                   name: 'chatgpt',     operator: 'microsoft', format: 'openai-sse',    defaultModel: 'gpt-4o' },

  // ── Anthropic ─────────────────────────────────────────────────────────────
  { domain: 'api.anthropic.com',                 name: 'anthropic',   operator: 'average',   format: 'anthropic-sse', defaultModel: 'claude-sonnet-4' },
  { domain: 'claude.ai',                         name: 'claude',      operator: 'average',   format: 'anthropic-sse', defaultModel: 'claude-sonnet-4' },

  // ── Google ────────────────────────────────────────────────────────────────
  { domain: 'generativelanguage.googleapis.com', name: 'google',      operator: 'google',    format: 'gemini-json',   defaultModel: 'gemini-2.0-flash' },
  { domain: 'gemini.google.com',                 name: 'gemini',      operator: 'google',    format: 'gemini-json',   defaultModel: 'gemini-2.0-flash' },
  { domain: 'aistudio.google.com',               name: 'ai-studio',   operator: 'google',    format: 'gemini-json',   defaultModel: 'gemini-2.5-pro' },

  // ── Microsoft / Copilot ───────────────────────────────────────────────────
  { domain: 'copilot.microsoft.com',             name: 'copilot',     operator: 'microsoft', format: 'openai-sse',    defaultModel: 'gpt-4o' },
  { domain: 'github.com',                        name: 'github-copilot', operator: 'microsoft', format: 'openai-sse', defaultModel: 'gpt-4o' },

  // ── Mistral ───────────────────────────────────────────────────────────────
  { domain: 'api.mistral.ai',                    name: 'mistral',     operator: 'average',   format: 'openai-sse',    defaultModel: 'mistral-large' },
  { domain: 'chat.mistral.ai',                   name: 'mistral',     operator: 'average',   format: 'openai-sse',    defaultModel: 'mistral-large' },

  // ── Groq ──────────────────────────────────────────────────────────────────
  { domain: 'api.groq.com',                      name: 'groq',        operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.3-70b' },
  { domain: 'console.groq.com',                  name: 'groq',        operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.3-70b' },

  // ── OpenRouter (aggregates many models) ───────────────────────────────────
  { domain: 'openrouter.ai',                     name: 'openrouter',  operator: 'average',   format: 'openai-sse',    defaultModel: 'gpt-4o' },

  // ── Cohere ────────────────────────────────────────────────────────────────
  { domain: 'api.cohere.com',                    name: 'cohere',      operator: 'average',   format: 'openai-sse',    defaultModel: 'command-r-plus' },
  { domain: 'api.cohere.ai',                     name: 'cohere',      operator: 'average',   format: 'openai-sse',    defaultModel: 'command-r-plus' },
  { domain: 'coral.cohere.com',                  name: 'cohere',      operator: 'average',   format: 'openai-sse',    defaultModel: 'command-r-plus' },

  // ── Together AI ───────────────────────────────────────────────────────────
  { domain: 'api.together.xyz',                  name: 'together',    operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.1-70b' },
  { domain: 'app.together.ai',                   name: 'together',    operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.1-70b' },

  // ── Perplexity ────────────────────────────────────────────────────────────
  { domain: 'api.perplexity.ai',                 name: 'perplexity',  operator: 'amazon',    format: 'openai-sse',    defaultModel: 'llama-3.1-70b' },
  { domain: 'www.perplexity.ai',                 name: 'perplexity',  operator: 'amazon',    format: 'openai-sse',    defaultModel: 'llama-3.1-70b' },

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  { domain: 'api.deepseek.com',                  name: 'deepseek',    operator: 'average',   format: 'openai-sse',    defaultModel: 'deepseek-v3' },
  { domain: 'chat.deepseek.com',                 name: 'deepseek',    operator: 'average',   format: 'openai-sse',    defaultModel: 'deepseek-v3' },

  // ── xAI / Grok ────────────────────────────────────────────────────────────
  { domain: 'api.x.ai',                          name: 'grok',        operator: 'average',   format: 'openai-sse',    defaultModel: 'grok-3' },
  { domain: 'grok.com',                          name: 'grok',        operator: 'average',   format: 'openai-sse',    defaultModel: 'grok-3' },

  // ── Hugging Face Inference ────────────────────────────────────────────────
  { domain: 'api-inference.huggingface.co',      name: 'huggingface', operator: 'average',   format: 'openai-sse',    defaultModel: 'default' },
  { domain: 'huggingface.co',                    name: 'huggingface', operator: 'average',   format: 'unknown',       defaultModel: 'default' },

  // ── Poe ───────────────────────────────────────────────────────────────────
  { domain: 'poe.com',                           name: 'poe',         operator: 'amazon',    format: 'unknown',       defaultModel: 'default' },

  // ── Fireworks AI ──────────────────────────────────────────────────────────
  { domain: 'api.fireworks.ai',                  name: 'fireworks',   operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.1-70b' },

  // ── Replicate ─────────────────────────────────────────────────────────────
  { domain: 'api.replicate.com',                 name: 'replicate',   operator: 'average',   format: 'unknown',       defaultModel: 'default' },

  // ── Google Antigravity (VS Code-based agentic coding IDE, Gemini 3) ─────────
  { domain: 'antigravity.google',                name: 'antigravity',  operator: 'google',   format: 'gemini-json',   defaultModel: 'gemini-2.5-pro' },
  // Antigravity's cloud backend (language server → Gemini inference)
  { domain: 'daily-cloudcode-pa.googleapis.com', name: 'antigravity',  operator: 'google',   format: 'gemini-json',   defaultModel: 'gemini-2.5-pro' },
  { domain: 'cloudcode-pa.googleapis.com',       name: 'antigravity',  operator: 'google',   format: 'gemini-json',   defaultModel: 'gemini-2.5-pro' },

  // ── Mercury / Inception Labs (diffusion LLM) ──────────────────────────────
  { domain: 'api.inceptionlabs.ai',              name: 'mercury',     operator: 'average',   format: 'openai-sse',    defaultModel: 'mercury' },

  // ── AI21 Labs (Jamba) ─────────────────────────────────────────────────────
  { domain: 'api.ai21.com',                      name: 'ai21',        operator: 'average',   format: 'openai-sse',    defaultModel: 'jamba-1.5-large' },
  { domain: 'studio.ai21.com',                   name: 'ai21',        operator: 'average',   format: 'openai-sse',    defaultModel: 'jamba-1.5-large' },

  // ── Cerebras (wafer-scale fast inference) ────────────────────────────────
  { domain: 'api.cerebras.ai',                   name: 'cerebras',    operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.3-70b' },
  { domain: 'inference.cerebras.ai',             name: 'cerebras',    operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.3-70b' },

  // ── Reka AI ───────────────────────────────────────────────────────────────
  { domain: 'api.reka.ai',                       name: 'reka',        operator: 'average',   format: 'openai-sse',    defaultModel: 'reka-core' },

  // ── SambaNova ─────────────────────────────────────────────────────────────
  { domain: 'api.sambanova.ai',                  name: 'sambanova',   operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.1-405b' },
  { domain: 'cloud.sambanova.ai',                name: 'sambanova',   operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.1-405b' },

  // ── NVIDIA NIM ────────────────────────────────────────────────────────────
  { domain: 'integrate.api.nvidia.com',          name: 'nvidia-nim',  operator: 'average',   format: 'openai-sse',    defaultModel: 'llama-3.1-70b' },

  // ── AWS Bedrock ───────────────────────────────────────────────────────────
  { domain: 'amazonaws.com',                     name: 'aws-bedrock', operator: 'amazon',    format: 'openai-sse',    defaultModel: 'default' },

  // ── Azure OpenAI ──────────────────────────────────────────────────────────
  { domain: 'openai.azure.com',                  name: 'azure-openai', operator: 'microsoft', format: 'openai-sse',  defaultModel: 'gpt-4o' },

  // ── Moonshot AI (Kimi) ────────────────────────────────────────────────────
  { domain: 'api.moonshot.cn',                   name: 'moonshot',    operator: 'average',   format: 'openai-sse',    defaultModel: 'moonshot-v1-128k' },
  { domain: 'kimi.ai',                           name: 'moonshot',    operator: 'average',   format: 'openai-sse',    defaultModel: 'moonshot-v1-128k' },

  // ── Alibaba Qwen / DashScope ──────────────────────────────────────────────
  { domain: 'dashscope.aliyuncs.com',            name: 'qwen',        operator: 'average',   format: 'openai-sse',    defaultModel: 'qwen-max' },
  { domain: 'bailian.aliyun.com',                name: 'qwen',        operator: 'average',   format: 'openai-sse',    defaultModel: 'qwen-max' },

  // ── Zhipu AI (GLM) ────────────────────────────────────────────────────────
  { domain: 'open.bigmodel.cn',                  name: 'zhipu',       operator: 'average',   format: 'openai-sse',    defaultModel: 'glm-4' },

  // ── 01.AI (Yi models) ─────────────────────────────────────────────────────
  { domain: 'api.01.ai',                         name: '01ai',        operator: 'average',   format: 'openai-sse',    defaultModel: 'yi-large' },

  // ── MiniMax ───────────────────────────────────────────────────────────────
  { domain: 'api.minimax.chat',                  name: 'minimax',     operator: 'average',   format: 'openai-sse',    defaultModel: 'abab6.5-chat' },

  // ── Stability AI (Stable Diffusion / Stable LM) ──────────────────────────
  { domain: 'api.stability.ai',                  name: 'stability',   operator: 'average',   format: 'unknown',       defaultModel: 'default' },

  // ── Runway ML (video generation) ─────────────────────────────────────────
  { domain: 'api.runwayml.com',                  name: 'runway',      operator: 'average',   format: 'unknown',       defaultModel: 'default' },
  { domain: 'runwayml.com',                      name: 'runway',      operator: 'average',   format: 'unknown',       defaultModel: 'default' },

  // ── Midjourney ────────────────────────────────────────────────────────────
  { domain: 'midjourney.com',                    name: 'midjourney',  operator: 'average',   format: 'unknown',       defaultModel: 'midjourney-6' },

  // ── ElevenLabs (voice/audio AI) ───────────────────────────────────────────
  { domain: 'api.elevenlabs.io',                 name: 'elevenlabs',  operator: 'average',   format: 'unknown',       defaultModel: 'default' },

  // ── Ollama & local inference (localhost) ──────────────────────────────────
  { domain: 'localhost',                         name: 'ollama',      operator: 'local',     format: 'openai-sse',    defaultModel: 'llama-3-8b' },
  { domain: '127.0.0.1',                        name: 'ollama',      operator: 'local',     format: 'openai-sse',    defaultModel: 'llama-3-8b' },
];

/**
 * Returns the provider config for a given request URL.
 * Matches by hostname — subdomains of listed domains are also matched.
 */
export function detectProvider(url: string): AiProvider | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      AI_PROVIDERS.find(p => host === p.domain || host.endsWith('.' + p.domain)) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Returns true if the URL path looks like a chat/completion endpoint.
 * Prevents noisy interception of asset/auth/analytics requests.
 */
const COMPLETION_PATH_PATTERNS = [
  /\/v1\/chat\/completions/,
  /\/v1\/completions/,
  /\/v1\/messages/,
  /\/generate_content/,
  /\/streamGenerateContent/,
  /\/backend-api\/conversation/,
  /\/backend-anon\/conversation/,
  /\/api\/.*\/completion/,
  /\/chat\/completions/,
  /\/v1\/generate/,
  /\/inference/,
  /\/predictions/,
];

export function isCompletionRequest(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return COMPLETION_PATH_PATTERNS.some(p => p.test(path));
  } catch {
    return false;
  }
}
