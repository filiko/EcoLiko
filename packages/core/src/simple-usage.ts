import type { ModelClass, SimpleUsageInput, UserConfig, ImpactRange, UsageEvent } from './models.js';
import { estimateImpactRange } from './range.js';

/** How one message of a model class is turned into tokens and a profile. */
export interface ModelClassAssumption {
  /** MODEL_ENERGY_PROFILES key whose energy per token is used */
  model: string;
  inputTokensPerMessage: number;
  outputTokensPerMessage: number;
  /** Where the token counts come from, or that they are an assumption */
  basis: string;
}

/**
 * Per-message assumptions for estimateSimpleUsage().
 *
 * Token counts follow Oviedo et al., "Energy Use of AI Inference, Efficiency
 * Pathways, and Test-Time Scaling", Joule (2026) 102430 (arXiv
 * 2509.20241v2), Methods: input fixed at 500 tokens; output drawn from an
 * exponential distribution with median 300 tokens (IQR 129-618) for
 * conversational queries and median 5,000 (IQR 2,040-9,717) for
 * test-time-scaling (reasoning) queries. Yearly totals need the mean, not
 * the median: for an exponential distribution mean = median / ln 2, giving
 * 433 and 7,213 output tokens. That conversion is ours, not the paper's.
 *
 * Model choice per class is an EcoLiko assumption:
 * - small: gpt-4o-mini profile; same token counts as standard (assumed:
 *   small models answer the same kind of chat message).
 * - standard: gpt-4o profile (the Epoch AI-anchored central calibration).
 * - reasoning: deepseek-r1 profile, the only reasoning model with a measured
 *   per-token figure (ML.ENERGY v3.0). The o-series profiles are inferred
 *   and may already include reasoning length in their per-token energy.
 */
export const SIMPLE_USAGE_ASSUMPTIONS: Record<ModelClass, ModelClassAssumption> = {
  small: {
    model: 'gpt-4o-mini',
    inputTokensPerMessage: 500,
    outputTokensPerMessage: 433,
    basis: 'Assumed equal to standard; tokens from Oviedo et al. (Joule 2026) conversational regime',
  },
  standard: {
    model: 'gpt-4o',
    inputTokensPerMessage: 500,
    outputTokensPerMessage: 433,
    basis: 'Oviedo et al. (Joule 2026): 500 input; output exponential, median 300, mean 300/ln2 = 433',
  },
  reasoning: {
    model: 'deepseek-r1',
    inputTokensPerMessage: 500,
    outputTokensPerMessage: 7213,
    basis: 'Oviedo et al. (Joule 2026) test-time scaling: 500 input; output exponential, median 5,000, mean 5000/ln2 = 7,213',
  },
};

/**
 * Platform used for simple-usage estimates. Maps to the hyperscaler-average
 * water factor, since the provider is unknown.
 */
export const SIMPLE_USAGE_PLATFORM = 'other';

/** Default number of days covered by estimateSimpleUsage() */
export const SIMPLE_USAGE_DEFAULT_DAYS = 365;

/**
 * Turn everyday usage ("about 20 messages a day with a standard model") into
 * a low / central / high impact range over `days` (default 365).
 */
export function estimateSimpleUsage(input: SimpleUsageInput, config?: UserConfig): ImpactRange {
  const { messagesPerDay, modelClass } = input;
  const days = input.days ?? SIMPLE_USAGE_DEFAULT_DAYS;
  const a = SIMPLE_USAGE_ASSUMPTIONS[modelClass];
  if (!a) throw new RangeError(`Unknown modelClass: ${String(modelClass)}`);
  if (!Number.isFinite(messagesPerDay) || messagesPerDay < 0) {
    throw new RangeError('messagesPerDay must be a finite number >= 0');
  }
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError('days must be a finite number >= 0');
  }

  const messages = messagesPerDay * days;
  const event: UsageEvent = {
    id: `simple-usage-${modelClass}`,
    timestamp: 0,
    platform: SIMPLE_USAGE_PLATFORM,
    model: a.model,
    inputTokens: messages * a.inputTokensPerMessage,
    outputTokens: messages * a.outputTokensPerMessage,
    source: 'skill',
  };
  return estimateImpactRange(event, config);
}
