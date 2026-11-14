import { describe, it, expect } from 'vitest';
import { estimateSimpleUsage, SIMPLE_USAGE_ASSUMPTIONS, SIMPLE_USAGE_PLATFORM } from './simple-usage.js';
import { estimateImpactRange } from './range.js';
import { estimateImpact } from './estimator.js';
import { MODEL_ENERGY_PROFILES } from './constants.js';
import type { ModelClass } from './models.js';

const CLASSES: ModelClass[] = ['small', 'standard', 'reasoning'];

describe('estimateSimpleUsage', () => {
  it('every class uses an existing energy profile', () => {
    for (const c of CLASSES) {
      expect(MODEL_ENERGY_PROFILES[SIMPLE_USAGE_ASSUMPTIONS[c].model], c).toBeDefined();
    }
  });

  it('defaults to 365 days', () => {
    for (const c of CLASSES) {
      expect(estimateSimpleUsage({ messagesPerDay: 10, modelClass: c }))
        .toStrictEqual(estimateSimpleUsage({ messagesPerDay: 10, modelClass: c, days: 365 }));
    }
  });

  it('equals estimateImpactRange for the implied tokens; central equals estimateImpact', () => {
    const a = SIMPLE_USAGE_ASSUMPTIONS.standard;
    const event = {
      id: 'x', timestamp: 0, platform: SIMPLE_USAGE_PLATFORM, model: a.model,
      inputTokens: 20 * 30 * a.inputTokensPerMessage,
      outputTokens: 20 * 30 * a.outputTokensPerMessage,
      source: 'skill' as const,
    };
    const r = estimateSimpleUsage({ messagesPerDay: 20, modelClass: 'standard', days: 30 }, { region: 'uk' });
    expect(r).toStrictEqual(estimateImpactRange(event, { region: 'uk' }));
    expect(r.central).toStrictEqual(estimateImpact(event, { region: 'uk' }));
  });

  it('scales linearly with messages and days', () => {
    const one = estimateSimpleUsage({ messagesPerDay: 1, modelClass: 'standard', days: 1 });
    const many = estimateSimpleUsage({ messagesPerDay: 12, modelClass: 'standard', days: 10 });
    for (const k of ['low', 'central', 'high'] as const) {
      expect(many[k].energyKwh).toBeCloseTo(one[k].energyKwh * 120, 12);
    }
  });

  it('a standard message lands within published per-query figures', () => {
    // Google median 0.24 Wh; Oviedo et al. >200B IQR up to 0.60 Wh
    const wh = estimateSimpleUsage({ messagesPerDay: 1, modelClass: 'standard', days: 1 }).central.energyKwh * 1000;
    expect(wh).toBeGreaterThanOrEqual(0.24);
    expect(wh).toBeLessThanOrEqual(0.60);
  });

  it('a reasoning message lands within the published test-time-scaling IQR', () => {
    // Oviedo et al.: 3.91 Wh median, IQR 2.15-7.05 Wh
    const wh = estimateSimpleUsage({ messagesPerDay: 1, modelClass: 'reasoning', days: 1 }).central.energyKwh * 1000;
    expect(wh).toBeGreaterThanOrEqual(2.15);
    expect(wh).toBeLessThanOrEqual(7.05);
  });

  it('orders classes small < standard < reasoning', () => {
    const e = (c: ModelClass) => estimateSimpleUsage({ messagesPerDay: 5, modelClass: c }).central.energyKwh;
    expect(e('small')).toBeLessThan(e('standard'));
    expect(e('standard')).toBeLessThan(e('reasoning'));
  });

  it('returns zeros for zero messages', () => {
    const r = estimateSimpleUsage({ messagesPerDay: 0, modelClass: 'reasoning' });
    for (const c of [r.low, r.central, r.high]) expect(c.energyKwh).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => estimateSimpleUsage({ messagesPerDay: -1, modelClass: 'standard' })).toThrow(RangeError);
    expect(() => estimateSimpleUsage({ messagesPerDay: NaN, modelClass: 'standard' })).toThrow(RangeError);
    expect(() => estimateSimpleUsage({ messagesPerDay: 1, modelClass: 'standard', days: -2 })).toThrow(RangeError);
    expect(() => estimateSimpleUsage({ messagesPerDay: 1, modelClass: 'huge' as ModelClass })).toThrow(RangeError);
  });
});
