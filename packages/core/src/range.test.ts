import { describe, it, expect } from 'vitest';
import { estimateImpactRange, RANGE_BOUNDS, IMPACT_RANGE_WATER_KIND } from './range.js';
import { estimateImpact } from './estimator.js';
import { MODEL_ENERGY_PROFILES, PLATFORM_OPERATOR } from './constants.js';
import type { UsageEvent, UserConfig } from './models.js';

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    id: 'range-test',
    timestamp: 0,
    platform: 'chatgpt',
    model: 'gpt-4o',
    inputTokens: 1000,
    outputTokens: 1000,
    source: 'cli',
    ...overrides,
  };
}

const CONFIGS: (UserConfig | undefined)[] = [
  undefined,
  {},
  { pue: 1.4 },
  { wueFactor: 0.5 },
  { region: 'eu-nordic' },
  { region: 'us-average' },
  { region: 'not-a-region' },
  { co2IntensityGPerKwh: 800 },
  { pue: 1.2, wueFactor: 0, region: 'india' },
];
const PLATFORMS = ['chatgpt', 'claude', 'gemini', 'ollama', 'perplexity', 'unknown-platform'];
const MODELS = [...Object.keys(MODEL_ENERGY_PROFILES), 'some-future-model'];

describe('estimateImpactRange', () => {
  it('central equals estimateImpact exactly for every model, platform and config', () => {
    for (const model of MODELS) {
      for (const platform of PLATFORMS) {
        for (const config of CONFIGS) {
          const event = makeEvent({ model, platform, inputTokens: 1234, outputTokens: 567 });
          expect(estimateImpactRange(event, config).central).toStrictEqual(estimateImpact(event, config));
        }
      }
    }
  });

  it('low <= central <= high on every metric', () => {
    for (const model of MODELS) {
      for (const platform of PLATFORMS) {
        for (const config of CONFIGS) {
          const r = estimateImpactRange(makeEvent({ model, platform }), config);
          for (const k of ['energyKwh', 'waterLiters', 'co2Grams'] as const) {
            expect(r.low[k], `${model}/${platform}/${JSON.stringify(config)} low ${k}`).toBeLessThanOrEqual(r.central[k]);
            expect(r.central[k], `${model}/${platform}/${JSON.stringify(config)} high ${k}`).toBeLessThanOrEqual(r.high[k]);
          }
        }
      }
    }
  });

  it('returns zeros for zero tokens', () => {
    const r = estimateImpactRange(makeEvent({ inputTokens: 0, outputTokens: 0 }));
    for (const c of [r.low, r.central, r.high]) {
      expect(c).toStrictEqual({ energyKwh: 0, waterLiters: 0, co2Grams: 0 });
    }
  });

  it('computes the documented bounds for gpt-4o on ChatGPT with defaults', () => {
    const r = estimateImpactRange(makeEvent());
    const raw = 0.00012 + 0.0006; // 1k in + 1k out
    const lowE = raw * RANGE_BOUNDS.energyFactor.low * 1.09;
    const highE = raw * RANGE_BOUNDS.energyFactor.high * 1.56;
    expect(r.low.energyKwh).toBeCloseTo(lowE, 12);
    expect(r.high.energyKwh).toBeCloseTo(highE, 12);
    // chatgpt -> microsoft WUE 0.30; low takes AWS 0.15, high Google 1.15 + 4.35 off-site
    expect(r.low.waterLiters).toBeCloseTo(lowE * 0.15, 12);
    expect(r.high.waterLiters).toBeCloseTo(highE * (1.15 + 4.35), 12);
    // default grid: eGRID2023 US average (low) and non-baseload (high)
    expect(r.low.co2Grams).toBeCloseTo(lowE * 348, 9);
    expect(r.high.co2Grams).toBeCloseTo(highE * 623, 9);
  });

  it('energy factors come from the published anchors', () => {
    // ML.ENERGY v3.0 Llama 3.1 70B: 0.04 Wh / (361 tokens * 0.0004 kWh per 1k) = 0.277
    expect(RANGE_BOUNDS.energyFactor.low).toBeCloseTo(0.277, 2);
    // Jegham v6 GPT-4o 0.423 Wh / (0.192 Wh * 1.15) = 1.916
    expect(RANGE_BOUNDS.energyFactor.high).toBeCloseTo(1.916, 2);
  });

  it('uses a model-specific high factor when the published estimate is higher', () => {
    const mini = estimateImpactRange(makeEvent({ model: 'gpt-4o-mini' }));
    // Jegham v6: 0.577 Wh vs 0.0552 Wh central at 100/300 tokens = 10.45x
    expect(mini.high.energyKwh / mini.central.energyKwh).toBeCloseTo(10.45 * 1.56 / 1.15, 1);
    // Reasoning models are not anchored per model: global factor only
    const o3 = estimateImpactRange(makeEvent({ model: 'o3' }));
    expect(o3.high.energyKwh / o3.central.energyKwh)
      .toBeCloseTo(RANGE_BOUNDS.energyFactor.high * 1.56 / 1.15, 6);
  });

  it('high water includes off-site water even for local inference', () => {
    const r = estimateImpactRange(makeEvent({ model: 'llama-3-8b', platform: 'ollama' }));
    expect(r.central.waterLiters).toBe(0);
    expect(r.low.waterLiters).toBe(0);
    expect(r.high.waterLiters).toBeCloseTo(r.high.energyKwh * RANGE_BOUNDS.offsiteWaterLPerKwh, 12);
    // local inference: PUE fixed at 1.0
    expect(r.low.energyKwh / r.central.energyKwh).toBeCloseTo(RANGE_BOUNDS.energyFactor.low, 9);
  });

  it('holds user-set inputs fixed across the range', () => {
    const r = estimateImpactRange(makeEvent(), { pue: 1.3, wueFactor: 0.5, co2IntensityGPerKwh: 500 });
    expect(r.low.energyKwh / r.central.energyKwh).toBeCloseTo(RANGE_BOUNDS.energyFactor.low, 9);
    expect(r.high.energyKwh / r.central.energyKwh).toBeCloseTo(RANGE_BOUNDS.energyFactor.high, 9);
    expect(r.low.waterLiters / r.low.energyKwh).toBeCloseTo(0.5, 12);
    expect(r.high.waterLiters / r.high.energyKwh).toBeCloseTo(0.5 + 4.35, 12);
    for (const c of [r.low, r.central, r.high]) expect(c.co2Grams / c.energyKwh).toBeCloseTo(500, 9);
  });

  it('a non-US region keeps its intensity in all cases; US regions get eGRID bounds', () => {
    const nordic = estimateImpactRange(makeEvent(), { region: 'eu-nordic' });
    for (const c of [nordic.low, nordic.central, nordic.high]) expect(c.co2Grams / c.energyKwh).toBeCloseTo(30, 9);
    const us = estimateImpactRange(makeEvent(), { region: 'us-average' });
    expect(us.high.co2Grams / us.high.energyKwh).toBeCloseTo(623, 9);
  });

  it('documents the water kind of each case', () => {
    expect(IMPACT_RANGE_WATER_KIND).toEqual({
      low: 'onsite-consumed', central: 'onsite-consumed', high: 'total-consumed',
    });
  });

  it('every platform operator gives finite ranges', () => {
    for (const platform of Object.keys(PLATFORM_OPERATOR)) {
      const r = estimateImpactRange(makeEvent({ platform }));
      for (const c of [r.low, r.high]) {
        for (const v of Object.values(c)) expect(Number.isFinite(v), platform).toBe(true);
      }
    }
  });
});
