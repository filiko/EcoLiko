/**
 * AI platform identifier — open string so any provider works without code changes.
 * Well-known values: 'chatgpt', 'claude', 'gemini', 'copilot', 'claude-code',
 * 'cursor', 'codex', 'perplexity', 'ollama', 'openai', 'anthropic', 'google',
 * 'mistral', 'groq', 'openrouter', 'cohere', 'together', 'deepseek', 'grok',
 * 'huggingface', 'poe', 'other'
 */
export type Platform = string;

/** A single AI interaction event */
export interface UsageEvent {
  id: string;
  timestamp: number;
  platform: Platform;
  model: string;
  inputTokens: number;
  outputTokens: number;
  source: 'extension' | 'cli' | 'skill';
}

/** Environmental impact estimate for a usage event */
export interface ImpactEstimate {
  energyKwh: number;
  waterLiters: number;
  co2Grams: number;
}

/** Per-model breakdown within a platform */
export interface ModelBreakdown {
  model: string;
  events: number;
  inputTokens: number;
  outputTokens: number;
  impact: ImpactEstimate;
}

/** Per-platform breakdown */
export interface PlatformBreakdown {
  platform: Platform;
  events: number;
  inputTokens: number;
  outputTokens: number;
  impact: ImpactEstimate;
  models: ModelBreakdown[];
}

/** Aggregated totals over a time period */
export interface UsageTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  impact: ImpactEstimate;
  ecoScore: EcoScore;
  eventCount: number;
  byPlatform: PlatformBreakdown[];
}

/** Eco-score letter grade with breakdown */
export interface EcoScore {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  value: number; // 0-100, higher is greener
}

/** User-configurable settings for estimation */
export interface UserConfig {
  /** Power Usage Effectiveness (default 1.2 for cloud, 1.0 for local) */
  pue?: number;
  /** Water Usage Effectiveness override (liters per kWh) */
  wueFactor?: number;
  /** Grid CO2 intensity (grams per kWh, default 400 for US average) */
  co2IntensityGPerKwh?: number;
  /** User's region for CO2 lookup */
  region?: string;
}

/** Energy profile for a specific model */
export interface ModelEnergyProfile {
  inputKwhPer1kTokens: number;
  outputKwhPer1kTokens: number;
  /** Whether this is a local model (affects water/PUE defaults) */
  isLocal?: boolean;
}
