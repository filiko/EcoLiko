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
 * Added November 2026:
 * - Jegham et al. v6 (arXiv 2505.09598v6, 24 Nov 2025), Table 4 — per-model
 *   Wh per query at 100/300, 1k/1k and 10k/1.5k input/output tokens
 * - Oviedo et al., "Energy Use of AI Inference, Efficiency Pathways, and
 *   Test-Time Scaling", Joule (2026) 102430 (arXiv 2509.20241v2), Table 1,
 *   which also compiles ML.ENERGY Benchmark v3.0 measurements
 * - Elsworth et al. (Google), arXiv 2508.15734 (Aug 2025) — median Gemini
 *   Apps text prompt 0.24 Wh (no token count given, so not usable per token)
 *
 * The range these estimates can be off by is encoded in range.ts
 * (estimateImpactRange), not here. Only some figures are measured; `basis`
 * says which. Proprietary models have no direct measurement: their figures
 * are inferred from external throughput-based estimates or from model size.
 *
 * Reasoning models: providers report hidden reasoning tokens as output
 * tokens, and EcoLiko counts them. A per-token profile must therefore NOT
 * also bake the longer reasoning output into the per-token figure, or that
 * output is counted twice. Per-query figures for reasoning models (o3,
 * DeepSeek-R1, GPT-5 high) in Jegham et al. include hidden reasoning tokens
 * that their stated output-token count does not, so they cannot be turned
 * into per-token figures.
 *
 * Updated March 2026 based on "How Hungry is AI?" and Epoch AI data;
 * November 2026 additions marked with `source`/`basis`.
 */
export const MODEL_ENERGY_PROFILES: Record<string, ModelEnergyProfile> = {
  // OpenAI models
  // GPT-4o: "How Hungry is AI?" reports 1.215 Wh for 1K in + 1K out (medium prompt)
  // Epoch AI: ~0.3 Wh for 500 output tokens. Implies ~0.0006 kWh/1K combined.
  // With DEFAULT_PUE this gives 0.345 Wh for 500 output tokens, in line with
  // the 0.34 Wh "average ChatGPT query" OpenAI's CEO reported in June 2025.
  'gpt-4o': {
    inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060,
    source: 'Epoch AI (You, Feb 2025): ~0.3 Wh per GPT-4o query of 500 output tokens; input set at 1/5 of output per arXiv 2511.05597',
    basis: 'inferred',
  },
  // Jegham et al. v6 put GPT-4.1 at 2.6x GPT-4o per query (1k/1k: 3.161 vs
  // 1.215 Wh). Not adopted as central: those figures come from API
  // throughput, which Oviedo et al. (Joule 2026) find overstates production
  // energy. The 2.6x is carried as this model's high bound in range.ts.
  'gpt-4.1': {
    inputKwhPer1kTokens: 0.00012, outputKwhPer1kTokens: 0.00060,
    source: 'Assumed equal to gpt-4o; Jegham et al. v6 (arXiv 2505.09598) estimate is higher, used as high bound',
    basis: 'inferred',
  },
  // GPT-5 (minimal reasoning): Jegham et al. v6, Sec. 7: 2.33 Wh for 1k in +
  // 1k out vs 1.215 Wh for GPT-4o under the same method = 1.92x. Scaled from
  // the gpt-4o profile so the central calibration stays on the Epoch anchor.
  // At minimal reasoning effort few hidden tokens are generated, so this is a
  // per-token comparison; higher reasoning effort adds tokens, not per-token
  // energy, and those tokens are counted separately.
  'gpt-5': {
    inputKwhPer1kTokens: 0.00023, outputKwhPer1kTokens: 0.00115,
    source: 'Jegham et al. v6 (arXiv 2505.09598v6, Nov 2025): GPT-5 minimal 2.33 Wh vs GPT-4o 1.215 Wh at 1k/1k tokens (1.92x), applied to gpt-4o profile',
    basis: 'inferred',
  },
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
  // Consistent with Jegham et al. v6: Claude 3.7 Sonnet 2.989 Wh vs GPT-4o
  // 1.215 Wh at 1k/1k tokens (2.46x); this profile is 2.43x gpt-4o at 1k/1k.
  'claude-sonnet-4': {
    inputKwhPer1kTokens: 0.00025, outputKwhPer1kTokens: 0.0015,
    source: 'Scaled from Claude 3.7 Sonnet / GPT-4o ratio in Jegham et al. v6 (arXiv 2505.09598v6); no Claude 4 measurement published',
    basis: 'inferred',
  },
  // No published energy figure exists for Claude 4.5+ or Claude 5.x models
  // (claude-opus-5.5, claude-sonnet-5.5, claude-haiku-5.5, claude-fable-5.2 as
  // normalized by the CLI). They fall back to 'default' until one does.
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
  // ML.ENERGY Benchmark v3.0 (as compiled in Oviedo et al., Joule 2026,
  // Table 1): DeepSeek-V3 median 3.32 Wh per query at 8,968 average output
  // tokens on B200, FP8 = 0.37 Wh per 1k output tokens (GPU energy only).
  // Existing 0.40 kept: it matches the measurement.
  'deepseek-v3': {
    inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040,
    source: 'ML.ENERGY v3.0 via Oviedo et al. (Joule 2026) Table 1: 3.32 Wh / 8,968 output tokens on B200 (GPU only)',
    basis: 'measured',
  },
  'deepseek-v2':          { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  // DeepSeek-R1: previously 0.0025 kWh/1k output, derived from Jegham et al.'s
  // 24.6 Wh per query — a figure that includes R1's long hidden reasoning
  // chain, which EcoLiko already counts as output tokens. That double counted.
  // ML.ENERGY v3.0 (via Oviedo et al., Table 1): R1 median 7.45 Wh at 11,287
  // average output tokens on B200, FP8 = 0.66 Wh per 1k output tokens (GPU
  // only), 1.8x V3 per token under the same setup. Input kept at 1/5 output.
  'deepseek-r1': {
    inputKwhPer1kTokens: 0.00013, outputKwhPer1kTokens: 0.00066,
    source: 'ML.ENERGY v3.0 via Oviedo et al. (Joule 2026) Table 1: 7.45 Wh / 11,287 output tokens on B200 (GPU only)',
    basis: 'measured',
  },
  'deepseek-r1-zero': {
    inputKwhPer1kTokens: 0.00013, outputKwhPer1kTokens: 0.00066,
    source: 'Same architecture as deepseek-r1; see that entry',
    basis: 'inferred',
  },

  // Meta Llama — cloud-hosted (Groq, Together, etc. run these on optimized hardware)
  // Cloud-hosted Llama is more efficient than running locally due to batching & H100s
  'llama-3.3-70b':        { inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040 },
  // ML.ENERGY v3.0 (via Oviedo et al., Joule 2026, Table 1) measured GPU-only
  // energy well below these: Llama 3.1 70B 0.04 Wh at 361 output tokens,
  // 405B 0.21 Wh at 367 (about 0.28x the profiles below). Jegham et al. v6
  // estimate them far above (8.6x and 3.0x). The profiles are kept; both
  // published bounds feed estimateImpactRange (range.ts).
  'llama-3.1-70b': {
    inputKwhPer1kTokens: 0.00008, outputKwhPer1kTokens: 0.00040,
    source: 'Size-scaled estimate; bracketed by ML.ENERGY v3.0 (lower) and Jegham et al. v6 (higher)',
    basis: 'inferred',
  },
  'llama-3.1-8b':         { inputKwhPer1kTokens: 0.00002, outputKwhPer1kTokens: 0.00010 },
  'llama-3.1-405b': {
    inputKwhPer1kTokens: 0.00040, outputKwhPer1kTokens: 0.00200,
    source: 'Size-scaled estimate; bracketed by ML.ENERGY v3.0 (lower) and Jegham et al. v6 (higher)',
    basis: 'inferred',
  },
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
  // NOTE (Nov 2026): Google's own paper (Elsworth et al., arXiv 2508.15734,
  // Sec. 3.3) gives its fleet WUE as 1.15 L/kWh, about 4x this value. Kept
  // unchanged so estimateImpact() results stay stable; estimateImpactRange()
  // uses 1.15 as the high on-site bound.
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
  // NOTE (Nov 2026): eGRID2023 rev2 summary tables (June 2025) give the US
  // total output CO2 rate as 767.2 lb/MWh = 348 g/kWh. Kept at 370 so
  // estimateImpact() results stay stable; estimateImpactRange() uses 348 as
  // the low bound for US/default grids.
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

/**
 * Water usage benchmarks for displaying icons.
 * All values in liters.
 *
 * Reference: Shower = 50L (≈13.2 gallons)
 * Toilet flush = 2L (with hand washing)
 * Jug = 4L threshold for bottle display
 *
 * These are display thresholds. Sourced household figures for the same
 * things (US gallon jug 3.785 L; flush 4.8-22.7 L, 6.1 L federal standard;
 * average US shower 59.8 L) are in COMPARISONS (comparisons.ts), with the
 * differences noted there.
 */
export const WATER_BENCHMARKS = {
  jug: 4,
  flush: 2,
  shower: 50,
};
