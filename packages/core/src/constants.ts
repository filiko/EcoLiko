import type { ModelEnergyProfile } from './models.js';

/**
 * Energy consumption per 1K tokens by model.
 *
 * Output tokens cost ~5x more than input (autoregressive generation vs. parallel prefill).
 * This ratio is supported by "From Prompts to Power" (arXiv 2511.05597, Nov 2025).
 *
 * Primary sources (most recent first):
 * - Jegham et al., "How Hungry is AI?" (arXiv 2505.09598, May 2025) — API-level measurements
 * - "From Prompts to Power" (arXiv 2511.05597, Nov 2025) — 32K measurements, 21 GPU configs
 * - Epoch AI (2025) — GPT-4o ~0.3 Wh per typical query
 * - TokenPowerBench (arXiv 2512.03024, Dec 2024) — H100 cluster benchmarks
 * - Luccioni et al., "Power Hungry Processing" (arXiv 2311.16863, 2023)
 *
 * These are estimates with significant uncertainty (0.3x-3x range).
 * No paper has directly measured proprietary model energy — all cloud model
 * figures are inferred from external observations.
 *
 * Updated March 2026 based on "How Hungry is AI?" and Epoch AI data.
 */
export const MODEL_ENERGY_PROFILES: Record<string, ModelEnergyProfile> = {
  // OpenAI models
  // GPT-4o: "How Hungry is AI?" reports 1.215 Wh for 1K in + 1K out (medium prompt)
  // Epoch AI: ~0.3 Wh for 500 output tokens. Implies ~0.0006 kWh/1K combined.
  'gpt-4o':        { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'gpt-4.1':       { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'gpt-4o-mini':   { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'gpt-4.1-mini':  { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  // "How Hungry is AI?": GPT-4.1-nano short prompt 0.271 Wh (~300 out tokens)
  'gpt-4.1-nano':  { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00009 },
  // o3: "How Hungry is AI?" reports 5.153 Wh for medium prompt (1K in + 1K out)
  'o1':            { inputKwhPer1kTokens: 0.0005,  outputKwhPer1kTokens: 0.0025 },
  'o3':            { inputKwhPer1kTokens: 0.0005,  outputKwhPer1kTokens: 0.0025 },
  'o3-mini':       { inputKwhPer1kTokens: 0.00015, outputKwhPer1kTokens: 0.00075 },
  'o4-mini':       { inputKwhPer1kTokens: 0.00015, outputKwhPer1kTokens: 0.00075 },

  // Anthropic models
  // "How Hungry is AI?": Claude-3.7 Sonnet ~2.989 Wh for 1K+1K tokens
  // Opus estimated ~2x Sonnet based on model size scaling
  'claude-opus-4':    { inputKwhPer1kTokens: 0.0005,  outputKwhPer1kTokens: 0.0025 },
  'claude-sonnet-4':  { inputKwhPer1kTokens: 0.00025, outputKwhPer1kTokens: 0.0015 },
  'claude-haiku-4.5': { inputKwhPer1kTokens: 0.00006, outputKwhPer1kTokens: 0.00030 },
  'claude-haiku-3.5': { inputKwhPer1kTokens: 0.00005, outputKwhPer1kTokens: 0.00025 },

  // Google models
  // Gemini Pro estimated similar to GPT-4o class; Flash much smaller
  'gemini-2.5-pro':   { inputKwhPer1kTokens: 0.00015, outputKwhPer1kTokens: 0.00075 },
  'gemini-2.5-flash': { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'gemini-2.0-flash': { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'gemini-1.5-pro':   { inputKwhPer1kTokens: 0.00015, outputKwhPer1kTokens: 0.00075 },
  'gemini-1.5-flash': { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },

  // Mistral AI hosted models (cloud inference, not local)
  // Estimated relative to GPT-4o class based on model size and architecture
  'mistral-large':        { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'mistral-large-2':      { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'mistral-small':        { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'mistral-small-3':      { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'mistral-nemo':         { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },
  'codestral':            { inputKwhPer1kTokens: 0.00004, outputKwhPer1kTokens: 0.00020 },
  'devstral':             { inputKwhPer1kTokens: 0.00004, outputKwhPer1kTokens: 0.00020 },
  'mixtral-8x7b':         { inputKwhPer1kTokens: 0.00005, outputKwhPer1kTokens: 0.00025 },
  'mixtral-8x22b':        { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },

  // Cohere models
  'command-r-plus':       { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'command-r':            { inputKwhPer1kTokens: 0.00005, outputKwhPer1kTokens: 0.00025 },
  'command-r7b':          { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },

  // xAI Grok models
  // Grok-3 estimated similar to GPT-4o based on capability tier
  'grok-3':               { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'grok-3-mini':          { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'grok-2':               { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },

  // DeepSeek cloud API (different from local — hyperscaler-optimized batching)
  'deepseek-v3':          { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  'deepseek-v2':          { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  // DeepSeek R1 reasoning: "How Hungry is AI?" reports 24.6 Wh — very high due to reasoning chains
  'deepseek-r1':          { inputKwhPer1kTokens: 0.00050, outputKwhPer1kTokens: 0.00250 },
  'deepseek-r1-zero':     { inputKwhPer1kTokens: 0.00050, outputKwhPer1kTokens: 0.00250 },

  // Meta Llama — cloud-hosted (Groq, Together, etc. run these on optimized hardware)
  // Cloud-hosted Llama is more efficient than running locally due to batching & H100s
  'llama-3.3-70b':        { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  'llama-3.1-70b':        { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  'llama-3.1-8b':         { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },
  'llama-3.1-405b':       { inputKwhPer1kTokens: 0.00040, outputKwhPer1kTokens: 0.00200 },
  'llama-4-scout':        { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'llama-4-maverick':     { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },

  // Local models — consumer GPU (batch=1, no optimization)
  // Much LESS efficient than cloud due to low utilization
  // "From Prompts to Power": Llama 3.1 8B single-prompt 0.2788 Wh (~300 tokens)
  // "From Prompts to Power": Llama 3.1 405B single-prompt 21.67 Wh
  // Local 70B on RTX 4090 at batch=1 estimated ~2-5 Wh per 1K output tokens
  'llama-3-70b':          { inputKwhPer1kTokens: 0.0005, outputKwhPer1kTokens: 0.0025, isLocal: true },
  'llama-3-8b':           { inputKwhPer1kTokens: 0.0001, outputKwhPer1kTokens: 0.0005, isLocal: true },
  'mistral-7b':           { inputKwhPer1kTokens: 0.0001, outputKwhPer1kTokens: 0.0005, isLocal: true },
  'qwen-72b':             { inputKwhPer1kTokens: 0.0005, outputKwhPer1kTokens: 0.0025, isLocal: true },
  'qwen-7b':              { inputKwhPer1kTokens: 0.0001, outputKwhPer1kTokens: 0.0005, isLocal: true },
  'phi-4':                { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040, isLocal: true },
  'phi-3.5':              { inputKwhPer1kTokens: 0.00006, outputKwhPer1kTokens: 0.00030, isLocal: true },
  'gemma-2-27b':          { inputKwhPer1kTokens: 0.0003, outputKwhPer1kTokens: 0.0015, isLocal: true },
  'gemma-2-9b':           { inputKwhPer1kTokens: 0.0001, outputKwhPer1kTokens: 0.0005, isLocal: true },
  'deepseek-r1-local':    { inputKwhPer1kTokens: 0.001, outputKwhPer1kTokens: 0.005, isLocal: true },

  // Mercury by Inception Labs (diffusion LLM)
  // Diffusion LLMs run multiple denoising passes vs. 1 autoregressive pass per token.
  // Mercury achieves high speed through hardware opt but per-token energy estimated
  // ~1.5-2x a mid-tier autoregressive model pending published benchmarks.
  'mercury':            { inputKwhPer1kTokens: 0.00015, outputKwhPer1kTokens: 0.00075 },
  'mercury-coder':      { inputKwhPer1kTokens: 0.00015, outputKwhPer1kTokens: 0.00075 },

  // AI21 Labs — Jamba (SSM/Transformer hybrid)
  'jamba-1.5-large':    { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },
  'jamba-1.5-mini':     { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },
  'jamba-instruct':     { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },

  // Reka AI
  'reka-core':          { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'reka-flash':         { inputKwhPer1kTokens: 0.00003, outputKwhPer1kTokens: 0.00015 },
  'reka-edge':          { inputKwhPer1kTokens: 0.00001, outputKwhPer1kTokens: 0.00006 },

  // Moonshot AI (Kimi)
  'moonshot-v1-8k':     { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  'moonshot-v1-32k':    { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  'moonshot-v1-128k':   { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },
  'kimi-k1.5':          { inputKwhPer1kTokens: 0.00020, outputKwhPer1kTokens: 0.00100 },

  // Alibaba Qwen (cloud API)
  'qwen-max':           { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'qwen-plus':          { inputKwhPer1kTokens: 0.00005, outputKwhPer1kTokens: 0.00025 },
  'qwen-turbo':         { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },
  'qwen-long':          { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'qwq-32b':            { inputKwhPer1kTokens: 0.00020, outputKwhPer1kTokens: 0.00100 },

  // Zhipu AI (GLM series)
  'glm-4':              { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },
  'glm-4-flash':        { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },

  // 01.AI (Yi)
  'yi-large':           { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },
  'yi-medium':          { inputKwhPer1kTokens: 0.00004, outputKwhPer1kTokens: 0.00020 },

  // MiniMax (based on "How Hungry is AI?" and infrastructure specs)
  // MiniMax MoE models use different architecture — estimated similar to mid-tier models
  'minimax-01':         { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },
  'minimax-02':         { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'MiniMax-M2.7':       { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
  'MiniMax-M2.5':       { inputKwhPer1kTokens: 0.00010, outputKwhPer1kTokens: 0.00050 },
  'minimax-m3':         { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  'abab6.5-chat':       { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },

  // Image/video generation — energy per "token equivalent" (1K tokens ≈ 1 image step)
  // These are rough estimates; image/video gen has very different compute profiles.
  // A single Stable Diffusion image (50 steps, 1024px) ≈ 0.002-0.006 kWh
  'stable-diffusion-3': { inputKwhPer1kTokens: 0.00200, outputKwhPer1kTokens: 0.00500 },
  'midjourney-6':       { inputKwhPer1kTokens: 0.00200, outputKwhPer1kTokens: 0.00500 },

  // Default fallback — conservative estimate based on GPT-4o class
  'default': { inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060 },
};

/**
 * Water Usage Effectiveness (WUE) by datacenter operator.
 * Units: liters of water consumed on-site per kWh of IT electricity.
 * This is scope-1 (direct cooling water) only — does NOT include
 * scope-2 water consumed at power plants for electricity generation.
 *
 * Sources (most recent first):
 * - AWS 2024 Sustainability Report: WUE 0.15 L/kWh (17% improvement YoY)
 * - Microsoft FY2024 Environmental Sustainability Report: WUE 0.30 L/kWh
 * - Google 2024 Environmental Report: ~0.28 L/kWh (fleet-wide estimate, not prominently published)
 * - Meta 2024 Sustainability Report: ~0.24 L/kWh
 * - Uptime Institute 2024: industry average ~1.8 L/kWh
 * - Li et al., "Making AI Less Thirsty" (arXiv 2304.03271, 2023)
 *
 * Updated March 2026.
 */
export const WATER_FACTORS: Record<string, number> = {
  microsoft: 0.30,   // Microsoft FY2024 — fleet average, improved from 0.49 in 2021
  google:    0.28,    // Google 2024 — estimate; Google does not prominently publish fleet WUE
  amazon:    0.15,    // AWS 2024 — 40% improvement since 2021
  meta:      0.24,    // Meta 2024 Sustainability Report
  average:   0.26,    // Hyperscaler average (weighted across major providers)
  industry:  1.80,    // Non-hyperscaler industry average (Uptime Institute 2024)
  local:     0.00,    // Local models have no datacenter cooling water
};

/**
 * Maps AI platforms to their datacenter operators.
 *
 * Updated March 2026:
 * - Anthropic uses both GCP (TPUs for inference) and AWS (Trainium for training).
 *   Mapped to 'average' to reflect multi-cloud reality.
 * - Perplexity primarily uses AWS with a Microsoft Azure expansion (Jan 2026).
 *
 * Sources:
 * - Anthropic Oct 2025: "Expanding our use of Google Cloud TPUs"
 * - Anthropic AWS Project Rainier partnership
 * - Perplexity $750M Microsoft Azure deal (Jan 2026)
 * - Cursor uses AWS (CPU), Azure (GPU), GCP (backend) per cursor.com/security
 */
/**
 * Maps platform identifiers to datacenter operators.
 * Open-ended Record — any string platform key is valid.
 * Falls back to 'average' in estimator.ts for unknown platforms.
 */
export const PLATFORM_OPERATOR: Record<string, string> = {
  // OpenAI / Microsoft Azure
  chatgpt:        'microsoft',
  openai:         'microsoft',
  copilot:        'microsoft',
  codex:          'microsoft',
  'github-copilot': 'microsoft',

  // Anthropic (GCP + AWS multi-cloud)
  claude:         'average',
  anthropic:      'average',
  'claude-code':  'average',

  // Google
  gemini:         'google',
  google:         'google',
  'ai-studio':    'google',
  antigravity:    'google',   // Google Antigravity IDE — runs on Google Cloud

  // Amazon AWS
  perplexity:     'amazon',

  // Mixed/average (uses multiple clouds or undisclosed)
  cursor:         'average',   // AWS + Azure + GCP per cursor.com/security
  mistral:        'average',
  groq:           'average',
  openrouter:     'average',   // aggregator — depends on routed model
  cohere:         'average',
  together:       'average',
  deepseek:       'average',
  grok:           'average',   // xAI — undisclosed, assumed hyperscaler
  huggingface:    'average',
  poe:            'amazon',
  windsurf:       'average',
  'continue-dev': 'average',
  codeium:        'average',
  tabnine:        'average',

  // Local inference — no datacenter water
  ollama:         'local',
  'lm-studio':    'local',
  jan:            'local',

  // Mercury / Inception Labs
  mercury:        'average',

  // AI21 Labs
  ai21:           'average',

  // Cerebras (custom silicon, primarily US-based)
  cerebras:       'average',

  // SambaNova
  sambanova:      'average',

  // Reka AI
  reka:           'average',

  // NVIDIA NIM
  'nvidia-nim':   'average',

  // Amazon AI tools (Amazon Q / Bedrock)
  'kiro':         'amazon',    // Kiro standalone IDE — Amazon Q backend on Bedrock
  'amazon-q':     'amazon',    // Amazon Q Developer extension in VS Code / Cursor

  // Cloud provider AI services
  'aws-bedrock':  'amazon',
  'azure-openai': 'microsoft',

  // East Asian providers (undisclosed DC; use industry average)
  moonshot:       'average',
  qwen:           'average',
  zhipu:          'average',
  '01ai':         'average',
  minimax:        'average',

  // Image/video/audio generation
  stability:      'average',
  runway:         'average',
  midjourney:     'average',
  elevenlabs:     'average',
  replicate:      'average',
  fireworks:      'average',

  // Fallback
  other:          'average',
};

/**
 * CO2 intensity by region (grams CO2 per kWh).
 *
 * Sources (most recent first):
 * - Ember Global Electricity Review 2025
 * - IEA Electricity 2025 report / Mid-Year Update 2025
 * - EPA eGRID 2023 data (released January 2025)
 * - European Environment Agency (EEA) 2024
 *
 * Updated March 2026. Grids are decarbonizing; these values reflect 2024-2025 data.
 */
export const CO2_INTENSITY: Record<string, number> = {
  'us-average':  370,   // EPA eGRID 2023: ~367 g/kWh national average
  'us-west':     230,   // WECC region — hydro, solar, wind
  'us-east':     350,   // SERC/RFC — gas-heavy, declining coal
  'us-midwest':  630,   // MROE — still coal-heavy (eGRID 2023: ~634 g/kWh)
  'eu-average':  175,   // IEA/Ember 2024-2025: declining rapidly with renewables
  'eu-nordic':   30,    // Norway/Sweden/Iceland — hydro and wind dominant
  'eu-germany':  330,   // Coal transition ongoing, accelerating renewables
  'uk':          170,   // Offshore wind growth, declining steadily
  'india':       650,   // Coal-dominated but adding solar rapidly
  'china':       565,   // IEA 2024: declining to ~505 by 2026
  'japan':       450,   // Gas + nuclear restart
  'brazil':      75,    // ~80% hydro
  'canada':      120,   // Hydro + nuclear
  'australia':   530,   // Coal + gas, rapid solar adoption
  default:       370,   // US average as fallback
};

/**
 * Default PUE for cloud datacenters.
 * Google 2024: 1.09, AWS 2024: 1.15, industry: 1.10-1.20 range.
 * Using 1.15 as a reasonable hyperscaler default.
 *
 * Source: Google Environmental Report 2024, AWS 2024 Sustainability Report,
 *         Uptime Institute 2024 Global Data Center Survey (industry avg: 1.56)
 */
export const DEFAULT_PUE = 1.15;

/** Default PUE for local inference */
export const LOCAL_PUE = 1.0;
