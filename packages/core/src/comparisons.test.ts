import { describe, it, expect } from 'vitest';
import { COMPARISONS } from './comparisons.js';
import type { ComparisonEntry, Range } from './comparisons.js';
import { WATER_BENCHMARKS } from './constants.js';

const RANGE_KEYS = ['co2eKg', 'waterLiters', 'landM2', 'energyKwh'] as const;
const WATER_KINDS = ['onsite-consumed', 'total-consumed', 'withdrawn', 'footprint-incl-rain'];

function ranges(e: ComparisonEntry): [string, Range][] {
  return RANGE_KEYS.filter(k => e[k] !== undefined).map(k => [k, e[k] as Range]);
}

describe('COMPARISONS', () => {
  it('every entry has a source URL and a plausible year', () => {
    for (const e of COMPARISONS) {
      expect(e.source?.url, `${e.id} url`).toMatch(/^https:\/\/\S+$/);
      expect(Number.isInteger(e.source?.year), `${e.id} year`).toBe(true);
      expect(e.source.year, `${e.id} year`).toBeGreaterThanOrEqual(1990);
      expect(e.source.year, `${e.id} year`).toBeLessThanOrEqual(new Date().getFullYear());
      expect(e.source.title.length, `${e.id} title`).toBeGreaterThan(5);
    }
  });

  it('every entry with water states the kind of water', () => {
    for (const e of COMPARISONS) {
      if (e.waterLiters !== undefined) {
        expect(e.waterKind, `${e.id} has water but no waterKind`).toBeDefined();
        expect(WATER_KINDS, e.id).toContain(e.waterKind);
      } else {
        expect(e.waterKind, `${e.id} has waterKind but no water`).toBeUndefined();
      }
    }
  });

  it('ids are unique and every entry has at least one metric', () => {
    const ids = COMPARISONS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of COMPARISONS) {
      expect(ranges(e).length, `${e.id} has no metric`).toBeGreaterThan(0);
      expect(e.unit.length, `${e.id} unit`).toBeGreaterThan(0);
    }
  });

  it('ranges are finite, non-negative and ordered low <= central <= high', () => {
    for (const e of COMPARISONS) {
      for (const [k, r] of ranges(e)) {
        for (const v of [r.low, r.central, r.high]) {
          expect(Number.isFinite(v), `${e.id}.${k}`).toBe(true);
          expect(v, `${e.id}.${k}`).toBeGreaterThanOrEqual(0);
        }
        expect(r.low, `${e.id}.${k}`).toBeLessThanOrEqual(r.central);
        expect(r.central, `${e.id}.${k}`).toBeLessThanOrEqual(r.high);
      }
    }
  });

  it('covers the required entries', () => {
    const required = [
      'water-jug', 'toilet-flush', 'shower',
      'beef-beef-herd', 'beef-dairy-herd', 'lamb', 'cheese', 'pork', 'poultry', 'tofu', 'peas',
      'beef-patty-quarter-pound',
      'global-livestock-emissions',
      'global-datacenter-electricity', 'global-datacenter-emissions',
      'global-aviation-co2',
      'global-agriculture-water-withdrawal', 'global-datacenter-water-onsite',
    ];
    const ids = new Set(COMPARISONS.map(e => e.id));
    for (const id of required) expect(ids.has(id), `missing ${id}`).toBe(true);
  });

  it('keeps the Poore & Nemecek values as published (OWID, 2010 data)', () => {
    const byId = Object.fromEntries(COMPARISONS.map(e => [e.id, e]));
    expect(byId['beef-beef-herd'].co2eKg?.central).toBe(99.48);
    expect(byId['beef-dairy-herd'].co2eKg?.central).toBe(33.3);
    expect(byId['lamb'].co2eKg?.central).toBe(39.72);
    expect(byId['cheese'].co2eKg?.central).toBe(23.88);
    expect(byId['pork'].co2eKg?.central).toBe(12.31);
    expect(byId['poultry'].co2eKg?.central).toBe(9.87);
    expect(byId['tofu'].co2eKg?.central).toBe(3.16);
    expect(byId['peas'].co2eKg?.central).toBe(0.98);
    // patty = 0.25 lb of beef-herd beef
    expect(byId['beef-patty-quarter-pound'].co2eKg?.central).toBeCloseTo(99.48 * 0.11339809, 6);
  });

  it('does not mix rain-inclusive footprints with piped water', () => {
    for (const e of COMPARISONS.filter(c => c.waterKind === 'footprint-incl-rain')) {
      expect(e.note ?? '', e.id).toMatch(/rain/i);
    }
  });

  it('leaves WATER_BENCHMARKS values unchanged', () => {
    expect(WATER_BENCHMARKS).toEqual({ jug: 4, flush: 2, shower: 50 });
  });
});
