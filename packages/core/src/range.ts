import type { UsageEvent, UserConfig, ImpactEstimate, ImpactRange } from './models.js';
import {
  MODEL_ENERGY_PROFILES,
  WATER_FACTORS,
  PLATFORM_OPERATOR,
  CO2_INTENSITY,
  DEFAULT_PUE,
  LOCAL_PUE,
} from './constants.js';
import { estimateImpact } from './estimator.js';

/**
 * Low / central / high estimates.
 *
 * `central` is exactly estimateImpact(). `low` and `high` move four inputs
 * to sourced bounds: per-token energy, PUE, water per kWh, and grid carbon
 * intensity. Inputs the user set explicitly in UserConfig (pue, wueFactor,
 * co2IntensityGPerKwh, or a non-US region) are held at that value in all
 * three cases; only the remaining inputs vary.
 *
 * Water kinds differ by case (see IMPACT_RANGE_WATER_KIND): low and central
 * count on-site cooling water consumed, as estimateImpact() always has; high
 * adds off-site water consumed at power plants generating the electricity.
 */

/** What `waterLiters` measures in each case of an ImpactRange. */
export const IMPACT_RANGE_WATER_KIND = {
  low: 'onsite-consumed',
  central: 'onsite-consumed',
  high: 'total-consumed',
} as const;

/** A published per-query energy figure at a stated token count. */
export interface PublishedQueryEnergy {
  whPerQuery: number;
  inputTokens: number;
  outputTokens: number;
  /** Whether whPerQuery already includes datacenter overhead (PUE) */
  includesPue: boolean;
}

/**
 * Production measurements that sit BELOW EcoLiko's central profiles.
 * ML.ENERGY Benchmark v3.0 medians, as compiled in Oviedo et al.,
 * "Energy Use of AI Inference, Efficiency Pathways, and Test-Time Scaling",
 * Joule (2026) 102430 (arXiv 2509.20241v2), Table 1. GPU energy only.
 * Input-token counts are not reported, so only output tokens are compared,
 * which if anything overstates the ratio (makes the low bound less extreme).
 */
export const LOW_ENERGY_ANCHORS: Record<string, PublishedQueryEnergy> = {
  // 0.04 Wh, 361 average output tokens (4xH100, BF16)
  'llama-3.1-70b':  { whPerQuery: 0.04, inputTokens: 0, outputTokens: 361, includesPue: false },
  // 0.21 Wh, 367 average output tokens (FP8)
  'llama-3.1-405b': { whPerQuery: 0.21, inputTokens: 0, outputTokens: 367, includesPue: false },
};

/**
 * Published estimates that sit ABOVE EcoLiko's central profiles.
 * Jegham et al., "How Hungry is AI?" v6 (arXiv 2505.09598v6, 24 Nov 2025),
 * Table 4, short prompt: 100 input / 300 output tokens, means, including the
 * provider's PUE. These are derived from API throughput and inferred
 * hardware; Oviedo et al. (Joule 2026) argue that method overstates
 * production energy by 4-20x, which is why they bound rather than set the
 * central estimate.
 *
 * gpt-4o is the global anchor: its ratio to the central profile applies to
 * every model. A model listed here gets its own ratio when that is higher.
 * Reasoning models (o3, o4-mini, DeepSeek-R1, GPT-5 high) are excluded on
 * purpose: their per-query figures include hidden reasoning tokens that the
 * stated 300 output tokens do not, so they are not per-token comparable.
 */
export const HIGH_ENERGY_ANCHORS: Record<string, PublishedQueryEnergy> = {
  'gpt-4o':         { whPerQuery: 0.423, inputTokens: 100, outputTokens: 300, includesPue: true },
  'gpt-4o-mini':    { whPerQuery: 0.577, inputTokens: 100, outputTokens: 300, includesPue: true },
  'gpt-4.1':        { whPerQuery: 0.871, inputTokens: 100, outputTokens: 300, includesPue: true },
  'gpt-4.1-mini':   { whPerQuery: 0.450, inputTokens: 100, outputTokens: 300, includesPue: true },
  'gpt-4.1-nano':   { whPerQuery: 0.207, inputTokens: 100, outputTokens: 300, includesPue: true },
  'llama-3.1-8b':   { whPerQuery: 0.052, inputTokens: 100, outputTokens: 300, includesPue: true },
  'llama-3.3-70b':  { whPerQuery: 0.237, inputTokens: 100, outputTokens: 300, includesPue: true },
  'llama-3.1-70b':  { whPerQuery: 1.271, inputTokens: 100, outputTokens: 300, includesPue: true },
  'llama-3.1-405b': { whPerQuery: 2.226, inputTokens: 100, outputTokens: 300, includesPue: true },
  // Served from DeepSeek's own API (Azure-hosted: 0.742 Wh)
  'deepseek-v3':    { whPerQuery: 2.777, inputTokens: 100, outputTokens: 300, includesPue: true },
};

/** Ratio of a published figure to EcoLiko's central estimate at the same tokens. */
function anchorRatio(model: string, anchor: PublishedQueryEnergy): number {
  const p = MODEL_ENERGY_PROFILES[model];
  if (!p) return NaN;
  const kwh = (anchor.inputTokens / 1000) * p.inputKwhPer1kTokens
    + (anchor.outputTokens / 1000) * p.outputKwhPer1kTokens;
  const centralWh = kwh * 1000 * (anchor.includesPue ? DEFAULT_PUE : 1);
  return anchor.whPerQuery / centralWh;
}

const LOW_FACTOR = Math.min(
  ...Object.entries(LOW_ENERGY_ANCHORS).map(([m, a]) => anchorRatio(m, a)),
);
const HIGH_FACTOR = anchorRatio('gpt-4o', HIGH_ENERGY_ANCHORS['gpt-4o']);

/**
 * Bounds used by estimateImpactRange(). Each bound's source:
 *
 * energyFactor.low  ~0.28: smallest ratio of an ML.ENERGY v3.0 production
 *                   measurement to EcoLiko's central profile at the same
 *                   output tokens (LOW_ENERGY_ANCHORS).
 * energyFactor.high ~1.92: Jegham et al. v6 GPT-4o vs EcoLiko's gpt-4o at
 *                   100/300 tokens; models in HIGH_ENERGY_ANCHORS use their
 *                   own ratio when larger.
 * pue.low  1.09: Google fleet-wide average PUE (Elsworth et al., arXiv
 *                2508.15734, Sec. 4.3).
 * pue.high 1.56: industry average PUE, Uptime Institute Global Data Center
 *                Survey 2024.
 * onsiteWue.low  0.15 L/kWh: AWS global WUE 2024 (Amazon 2024 Sustainability
 *                Report, AWS summary).
 * onsiteWue.high 1.15 L/kWh: Google fleet WUE (Elsworth et al., arXiv
 *                2508.15734, Sec. 3.3).
 * offsiteWater   4.35 L/kWh: US water consumption per kWh of electricity
 *                serving data centers, LBNL 2024 United States Data Center
 *                Energy Usage Report (Shehabi et al.), as cited by Li et al.,
 *                "Making AI Less Thirsty" v5 (arXiv 2304.03271), which
 *                itself uses a lower 3.14 L/kWh (WRI) as conservative.
 * usGrid.low  348 g/kWh: eGRID2023 rev2 US total output CO2 rate,
 *                767.2 lb/MWh (EPA, June 2025).
 * usGrid.high 623 g/kWh: eGRID2023 rev2 US non-baseload CO2 rate,
 *                1,372.5 lb/MWh — the rate of generation that responds to
 *                added demand, such as new AI load.
 */
export const RANGE_BOUNDS = {
  energyFactor: { low: LOW_FACTOR, high: HIGH_FACTOR },
  pue: { low: 1.09, high: 1.56 },
  onsiteWueLPerKwh: { low: 0.15, high: 1.15 },
  offsiteWaterLPerKwh: 4.35,
  usGridGPerKwh: { low: 348, high: 623 },
} as const;

/** High energy factor for a model: the global anchor, or its own if higher. */
function highFactorFor(model: string): number {
  const own = HIGH_ENERGY_ANCHORS[model];
  if (!own || !MODEL_ENERGY_PROFILES[model]) return HIGH_FACTOR;
  return Math.max(HIGH_FACTOR, anchorRatio(model, own));
}

/** Regions where the eGRID US bounds apply when no intensity is fixed. */
const US_DEFAULT_REGIONS = new Set(['default', 'us-average']);

/**
 * Estimate low / central / high impact for one usage event.
 * `central` equals estimateImpact(event, config) exactly.
 */
export function estimateImpactRange(event: UsageEvent, config?: UserConfig): ImpactRange {
  const central = estimateImpact(event, config);

  const profile = MODEL_ENERGY_PROFILES[event.model] ?? MODEL_ENERGY_PROFILES['default'];
  const rawKwh =
    (event.inputTokens / 1000) * profile.inputKwhPer1kTokens +
    (event.outputTokens / 1000) * profile.outputKwhPer1kTokens;

  // PUE: a user-set value or local inference (no datacenter) stays fixed.
  const centralPue = config?.pue ?? (profile.isLocal ? LOCAL_PUE : DEFAULT_PUE);
  const pueFixed = config?.pue !== undefined || profile.isLocal === true;
  const pueLow = pueFixed ? centralPue : Math.min(RANGE_BOUNDS.pue.low, centralPue);
  const pueHigh = pueFixed ? centralPue : Math.max(RANGE_BOUNDS.pue.high, centralPue);

  const modelKey = MODEL_ENERGY_PROFILES[event.model] ? event.model : 'default';
  const energyLow = rawKwh * RANGE_BOUNDS.energyFactor.low * pueLow;
  const energyHigh = rawKwh * highFactorFor(modelKey) * pueHigh;

  // On-site water: a user-set WUE, or an operator with none (local), stays fixed.
  const operator = PLATFORM_OPERATOR[event.platform] ?? 'average';
  const centralWue = config?.wueFactor ?? WATER_FACTORS[operator] ?? WATER_FACTORS['average'];
  const wueFixed = config?.wueFactor !== undefined || centralWue === 0;
  const wueLow = wueFixed ? centralWue : Math.min(RANGE_BOUNDS.onsiteWueLPerKwh.low, centralWue);
  const wueHigh = wueFixed ? centralWue : Math.max(RANGE_BOUNDS.onsiteWueLPerKwh.high, centralWue);

  // Grid intensity: a user-set intensity or a known non-US region stays fixed.
  const centralCi = config?.co2IntensityGPerKwh
    ?? CO2_INTENSITY[config?.region ?? 'default']
    ?? CO2_INTENSITY['default'];
  const region = config?.region ?? 'default';
  const ciFixed = config?.co2IntensityGPerKwh !== undefined
    || (CO2_INTENSITY[region] !== undefined && !US_DEFAULT_REGIONS.has(region));
  const ciLow = ciFixed ? centralCi : Math.min(RANGE_BOUNDS.usGridGPerKwh.low, centralCi);
  const ciHigh = ciFixed ? centralCi : Math.max(RANGE_BOUNDS.usGridGPerKwh.high, centralCi);

  const low: ImpactEstimate = {
    energyKwh: energyLow,
    waterLiters: energyLow * wueLow,
    co2Grams: energyLow * ciLow,
  };
  const high: ImpactEstimate = {
    energyKwh: energyHigh,
    // Off-site water applies to all electricity, including local inference.
    waterLiters: energyHigh * (wueHigh + RANGE_BOUNDS.offsiteWaterLPerKwh),
    co2Grams: energyHigh * ciHigh,
  };

  return { low, central, high };
}
