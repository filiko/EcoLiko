import { describe, it, expect } from 'vitest';
import { MODEL_ENERGY_PROFILES, PLATFORM_OPERATOR, WATER_FACTORS, CO2_INTENSITY } from './constants.js';
import { estimateImpact } from './estimator.js';
import type { UsageEvent } from './models.js';

function makeEvent(model: string, platform = 'chatgpt'): UsageEvent {
  return {
    id: 'test',
    timestamp: Date.now(),
    platform,
    model,
    inputTokens: 1000,
    outputTokens: 1000,
    source: 'cli',
  };
}

describe('MODEL_ENERGY_PROFILES coverage', () => {
  const models = Object.keys(MODEL_ENERGY_PROFILES);

  it('has a default fallback profile', () => {
    expect(MODEL_ENERGY_PROFILES['default']).toBeDefined();
  });

  it('has profiles for all major model families', () => {
    const requiredModels = [
      'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini',
      'claude-opus-4', 'claude-sonnet-4', 'claude-haiku-3.5',
      'gemini-2.5-pro', 'gemini-2.5-flash',
      'mistral-large', 'mistral-small',
      'deepseek-v3', 'deepseek-r1',
      'grok-3',
      'llama-3.3-70b',
    ];
    for (const model of requiredModels) {
      expect(MODEL_ENERGY_PROFILES[model], `Missing profile for ${model}`).toBeDefined();
    }
  });

  it('all profiles have positive energy values', () => {
    for (const [name, profile] of Object.entries(MODEL_ENERGY_PROFILES)) {
      expect(profile.inputKwhPer1kTokens, `${name} inputKwh`).toBeGreaterThan(0);
      expect(profile.outputKwhPer1kTokens, `${name} outputKwh`).toBeGreaterThan(0);
    }
  });

  it('output tokens cost more than input tokens for all models', () => {
    for (const [name, profile] of Object.entries(MODEL_ENERGY_PROFILES)) {
      expect(
        profile.outputKwhPer1kTokens,
        `${name}: output should cost >= input`,
      ).toBeGreaterThanOrEqual(profile.inputKwhPer1kTokens);
    }
  });

  it('every model produces a valid impact estimate', () => {
    for (const model of models) {
      const event = makeEvent(model);
      const impact = estimateImpact(event);
      expect(impact.energyKwh, `${model} energy`).toBeGreaterThan(0);
      expect(impact.co2Grams, `${model} CO2`).toBeGreaterThan(0);
      expect(Number.isFinite(impact.energyKwh), `${model} energy finite`).toBe(true);
      expect(Number.isFinite(impact.waterLiters), `${model} water finite`).toBe(true);
      expect(Number.isFinite(impact.co2Grams), `${model} CO2 finite`).toBe(true);
    }
  });

  it('unknown models fall back to default profile', () => {
    const event = makeEvent('some-future-model-9000');
    const impact = estimateImpact(event);
    expect(impact.energyKwh).toBeGreaterThan(0);

    const defaultEvent = makeEvent('default');
    const defaultImpact = estimateImpact(defaultEvent);
    expect(impact.energyKwh).toBeCloseTo(defaultImpact.energyKwh, 10);
  });

  it('local models have isLocal flag and zero water', () => {
    const localModels = Object.entries(MODEL_ENERGY_PROFILES)
      .filter(([, p]) => p.isLocal)
      .map(([name]) => name);
    expect(localModels.length).toBeGreaterThan(0);

    for (const model of localModels) {
      const event = makeEvent(model, 'ollama');
      const impact = estimateImpact(event);
      expect(impact.waterLiters, `${model} should have 0 water`).toBe(0);
    }
  });

  it('reasoning models cost more than standard models', () => {
    const o3Impact = estimateImpact(makeEvent('o3'));
    const gpt4oImpact = estimateImpact(makeEvent('gpt-4o'));
    expect(o3Impact.energyKwh).toBeGreaterThan(gpt4oImpact.energyKwh);

    const r1Impact = estimateImpact(makeEvent('deepseek-r1'));
    const v3Impact = estimateImpact(makeEvent('deepseek-v3'));
    expect(r1Impact.energyKwh).toBeGreaterThan(v3Impact.energyKwh);
  });
});

describe('PLATFORM_OPERATOR coverage', () => {
  it('all platforms map to a known water factor operator', () => {
    for (const [platform, operator] of Object.entries(PLATFORM_OPERATOR)) {
      expect(
        WATER_FACTORS[operator],
        `${platform} -> ${operator}: missing water factor`,
      ).toBeDefined();
    }
  });

  it('includes all AI coding tools', () => {
    const requiredPlatforms = [
      'claude-code', 'codex', 'cursor', 'kiro', 'amazon-q',
      'copilot', 'github-copilot', 'windsurf', 'codeium', 'tabnine',
    ];
    for (const platform of requiredPlatforms) {
      expect(PLATFORM_OPERATOR[platform], `Missing operator for ${platform}`).toBeDefined();
    }
  });

  it('kiro and amazon-q map to amazon', () => {
    expect(PLATFORM_OPERATOR['kiro']).toBe('amazon');
    expect(PLATFORM_OPERATOR['amazon-q']).toBe('amazon');
  });

  it('codex maps to microsoft', () => {
    expect(PLATFORM_OPERATOR['codex']).toBe('microsoft');
  });
});

describe('CO2_INTENSITY coverage', () => {
  it('has a default fallback', () => {
    expect(CO2_INTENSITY['default']).toBeDefined();
    expect(CO2_INTENSITY['default']).toBeGreaterThan(0);
  });

  it('all values are positive', () => {
    for (const [region, intensity] of Object.entries(CO2_INTENSITY)) {
      expect(intensity, `${region}`).toBeGreaterThan(0);
    }
  });

  it('nordic is cleaner than US average', () => {
    expect(CO2_INTENSITY['eu-nordic']).toBeLessThan(CO2_INTENSITY['us-average']);
  });
});
