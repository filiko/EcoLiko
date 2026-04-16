import type { UsageEvent, ImpactEstimate, UserConfig, UsageTotals, PlatformBreakdown, ModelBreakdown } from './models.js';
import {
  MODEL_ENERGY_PROFILES,
  WATER_FACTORS,
  PLATFORM_OPERATOR,
  CO2_INTENSITY,
  DEFAULT_PUE,
  LOCAL_PUE,
} from './constants.js';
import { calculateEcoScore } from './score.js';

/**
 * Estimate the environmental impact of a single AI usage event.
 */
export function estimateImpact(event: UsageEvent, config?: UserConfig): ImpactEstimate {
  const profile = MODEL_ENERGY_PROFILES[event.model] ?? MODEL_ENERGY_PROFILES['default'];

  // Energy from token processing
  const rawEnergyKwh =
    (event.inputTokens / 1000) * profile.inputKwhPer1kTokens +
    (event.outputTokens / 1000) * profile.outputKwhPer1kTokens;

  // Apply PUE (datacenter overhead)
  const defaultPue = profile.isLocal ? LOCAL_PUE : DEFAULT_PUE;
  const pue = config?.pue ?? defaultPue;
  const energyKwh = rawEnergyKwh * pue;

  // Water consumption
  const operator = PLATFORM_OPERATOR[event.platform] ?? 'average';
  const wueFactor = config?.wueFactor ?? WATER_FACTORS[operator] ?? WATER_FACTORS['average'];
  const waterLiters = energyKwh * wueFactor;

  // CO2 emissions
  const co2Intensity = config?.co2IntensityGPerKwh
    ?? CO2_INTENSITY[config?.region ?? 'default']
    ?? CO2_INTENSITY['default'];
  const co2Grams = energyKwh * co2Intensity;

  return { energyKwh, waterLiters, co2Grams };
}

/**
 * Aggregate multiple usage events into totals with an eco-score.
 */
export function aggregateEvents(events: UsageEvent[], config?: UserConfig): UsageTotals {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalEnergy = 0;
  let totalWater = 0;
  let totalCo2 = 0;

  for (const event of events) {
    totalInputTokens += event.inputTokens;
    totalOutputTokens += event.outputTokens;
    const impact = estimateImpact(event, config);
    totalEnergy += impact.energyKwh;
    totalWater += impact.waterLiters;
    totalCo2 += impact.co2Grams;
  }

  const totalTokens = totalInputTokens + totalOutputTokens;

  // Build per-platform / per-model breakdown
  const platformMap = new Map<string, Map<string, { inputTokens: number; outputTokens: number; energyKwh: number; waterLiters: number; co2Grams: number; events: number }>>();

  for (const event of events) {
    if (!platformMap.has(event.platform)) platformMap.set(event.platform, new Map());
    const modelMap = platformMap.get(event.platform)!;
    if (!modelMap.has(event.model)) modelMap.set(event.model, { inputTokens: 0, outputTokens: 0, energyKwh: 0, waterLiters: 0, co2Grams: 0, events: 0 });
    const m = modelMap.get(event.model)!;
    const impact = estimateImpact(event, config);
    m.inputTokens += event.inputTokens;
    m.outputTokens += event.outputTokens;
    m.energyKwh += impact.energyKwh;
    m.waterLiters += impact.waterLiters;
    m.co2Grams += impact.co2Grams;
    m.events += 1;
  }

  const byPlatform: PlatformBreakdown[] = [];
  for (const [platform, modelMap] of platformMap) {
    let pIn = 0, pOut = 0, pEnergy = 0, pWater = 0, pCo2 = 0, pEvents = 0;
    const models: ModelBreakdown[] = [];
    for (const [model, s] of modelMap) {
      pIn += s.inputTokens; pOut += s.outputTokens;
      pEnergy += s.energyKwh; pWater += s.waterLiters; pCo2 += s.co2Grams;
      pEvents += s.events;
      models.push({ model, events: s.events, inputTokens: s.inputTokens, outputTokens: s.outputTokens, impact: { energyKwh: s.energyKwh, waterLiters: s.waterLiters, co2Grams: s.co2Grams } });
    }
    // Sort models by energy desc
    models.sort((a, b) => b.impact.energyKwh - a.impact.energyKwh);
    byPlatform.push({ platform, events: pEvents, inputTokens: pIn, outputTokens: pOut, impact: { energyKwh: pEnergy, waterLiters: pWater, co2Grams: pCo2 }, models });
  }
  byPlatform.sort((a, b) => b.impact.energyKwh - a.impact.energyKwh);

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    impact: {
      energyKwh: totalEnergy,
      waterLiters: totalWater,
      co2Grams: totalCo2,
    },
    ecoScore: calculateEcoScore(totalTokens, events),
    eventCount: events.length,
    byPlatform,
  };
}
