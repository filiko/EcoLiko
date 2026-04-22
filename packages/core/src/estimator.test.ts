import { describe, it, expect } from 'vitest';
import { estimateImpact, aggregateEvents } from './estimator.js';
import type { UsageEvent } from './models.js';

function makeEvent(overrides: Partial<UsageEvent> = {}): UsageEvent {
  return {
    id: 'test-1',
    timestamp: Date.now(),
    platform: 'chatgpt',
    model: 'gpt-4o',
    inputTokens: 1000,
    outputTokens: 500,
    source: 'cli',
    ...overrides,
  };
}

describe('estimateImpact', () => {
  it('calculates energy for known model', () => {
    const event = makeEvent({ inputTokens: 1000, outputTokens: 1000, model: 'gpt-4o' });
    const result = estimateImpact(event);

    // gpt-4o: (1000/1000)*0.00012 + (1000/1000)*0.00060 = 0.00072 kWh raw, * 1.15 PUE = 0.000828
    expect(result.energyKwh).toBeCloseTo(0.000828, 5);
  });

  it('calculates water using platform operator WUE', () => {
    const event = makeEvent({ platform: 'chatgpt', inputTokens: 1000, outputTokens: 1000, model: 'gpt-4o' });
    const result = estimateImpact(event);

    // chatgpt → microsoft → 0.30 L/kWh, energy = 0.000828
    expect(result.waterLiters).toBeCloseTo(0.000828 * 0.30, 6);
  });

  it('calculates CO2 with default US intensity', () => {
    const event = makeEvent({ inputTokens: 1000, outputTokens: 1000, model: 'gpt-4o' });
    const result = estimateImpact(event);

    // 0.000828 kWh * 370 g/kWh = 0.30636g
    expect(result.co2Grams).toBeCloseTo(0.30636, 3);
  });

  it('uses default profile for unknown models', () => {
    const event = makeEvent({ model: 'some-unknown-model' });
    const result = estimateImpact(event);
    expect(result.energyKwh).toBeGreaterThan(0);
  });

  it('applies custom PUE from config', () => {
    const event = makeEvent({ inputTokens: 1000, outputTokens: 1000, model: 'gpt-4o' });
    const withDefaultPue = estimateImpact(event);
    const withHighPue = estimateImpact(event, { pue: 1.5 });

    expect(withHighPue.energyKwh).toBeGreaterThan(withDefaultPue.energyKwh);
    // 0.00072 * 1.5 = 0.00108
    expect(withHighPue.energyKwh).toBeCloseTo(0.00108, 5);
  });

  it('uses LOCAL_PUE for local models', () => {
    const event = makeEvent({ model: 'llama-3-8b', platform: 'ollama' });
    const result = estimateImpact(event);

    // llama-3-8b: (1000/1000)*0.0001 + (500/1000)*0.0005 = 0.00035 kWh, PUE=1.0
    expect(result.energyKwh).toBeCloseTo(0.00035, 5);
    // ollama → local → 0.0 water
    expect(result.waterLiters).toBe(0);
  });

  it('respects custom CO2 region', () => {
    const event = makeEvent({ inputTokens: 1000, outputTokens: 1000, model: 'gpt-4o' });
    const result = estimateImpact(event, { region: 'eu-nordic' });

    // 0.000828 kWh * 30 g/kWh = 0.02484g
    expect(result.co2Grams).toBeCloseTo(0.02484, 4);
  });

  it('returns zero for zero tokens', () => {
    const event = makeEvent({ inputTokens: 0, outputTokens: 0 });
    const result = estimateImpact(event);
    expect(result.energyKwh).toBe(0);
    expect(result.waterLiters).toBe(0);
    expect(result.co2Grams).toBe(0);
  });

  it('output tokens cost more than input tokens', () => {
    const inputOnly = makeEvent({ inputTokens: 1000, outputTokens: 0, model: 'gpt-4o' });
    const outputOnly = makeEvent({ inputTokens: 0, outputTokens: 1000, model: 'gpt-4o' });

    const inputResult = estimateImpact(inputOnly);
    const outputResult = estimateImpact(outputOnly);

    // Output should cost ~5x more than input per token
    expect(outputResult.energyKwh / inputResult.energyKwh).toBeCloseTo(5, 0);
  });

  it('claude uses average WUE (multi-cloud)', () => {
    const event = makeEvent({ platform: 'claude', model: 'claude-sonnet-4', inputTokens: 1000, outputTokens: 1000 });
    const result = estimateImpact(event);

    // claude → average → 0.26 L/kWh
    const rawEnergy = 0.00025 + 0.0015; // 0.00175
    const withPue = rawEnergy * 1.15;
    expect(result.waterLiters).toBeCloseTo(withPue * 0.26, 6);
  });
});

describe('aggregateEvents', () => {
  it('sums up multiple events', () => {
    const events = [
      makeEvent({ inputTokens: 1000, outputTokens: 500 }),
      makeEvent({ inputTokens: 2000, outputTokens: 1000 }),
    ];
    const totals = aggregateEvents(events);

    expect(totals.totalInputTokens).toBe(3000);
    expect(totals.totalOutputTokens).toBe(1500);
    expect(totals.totalTokens).toBe(4500);
    expect(totals.eventCount).toBe(2);
    expect(totals.impact.energyKwh).toBeGreaterThan(0);
  });

  it('handles empty event list', () => {
    const totals = aggregateEvents([]);
    expect(totals.totalTokens).toBe(0);
    expect(totals.impact.energyKwh).toBe(0);
    expect(totals.eventCount).toBe(0);
  });

  it('includes eco score', () => {
    const events = [makeEvent({ inputTokens: 500, outputTokens: 200 })];
    const totals = aggregateEvents(events);
    expect(totals.ecoScore.grade).toBeDefined();
    expect(totals.ecoScore.value).toBeGreaterThanOrEqual(0);
    expect(totals.ecoScore.value).toBeLessThanOrEqual(100);
  });
});
