# Water Usage Constants

This document describes the water usage benchmarks used across the EcoLiko project for displaying water impact in UI elements (widget and popup).

## Reference File

All water benchmarks are defined in:
```
packages/core/src/constants.ts
```

```typescript
export const WATER_BENCHMARKS = {
  jug: 4,      // liters — threshold for switching from bottles to toilet icon
  flush: 2,    // liters — toilet flush volume (with hand washing)
  shower: 50, // liters — reference for decimal calculations (= 1.0)
};
```

## How Calculations Work

### Primary Reference: `shower` (50L)
The `shower` value of 50 liters is used as the **decimal reference**. All water usage is expressed as a fraction of 50L.

**Formula:** `decimal = waterLiters / 50`

| Water (L) | Decimal | Calculation |
|-----------|---------|-------------|
| 8L  | 0.16 | 8 / 50 |
| 10L | 0.20 | 10 / 50 |
| 17L | 0.34 | 17 / 50 |
| 50L | 1.00 | 50 / 50 |
| 64L | 1.28 | 64 / 50 |
| 100L| 2.00 | 100 / 50 |

### Icon Display Logic

**Below 1 liter (1000mL):** Shows bottles/shots/mL (existing behavior)
```typescript
if (ml < 1000) {
  if (ml < 44)   return { icon: '', value: `${ml.toFixed(0)} mL` };
  if (ml < 500)  return { icon: '', value: `${(ml / 44).toFixed(1)} shots` };
  return { icon: '', value: `${(ml / 500).toFixed(1)} bottles` };
}
```

**1 liter to 50 liters:** Shows toilet icon + decimal
```typescript
if (liters < shower) {  // < 50L
  return { icon: TOILET_SVG, value: `${litersDisplay} ${decimal}` };
}
```

**50 liters and above:** Shows shower icon + toilet icon (if remainder) + decimal
```typescript
const showers = Math.floor(fraction);
const remainder = liters - (showers * shower);
return {
  icon: showers > 0 ? SHOWER_SVG + (remainderDecimal ? TOILET_SVG : '') : TOILET_SVG,
  value: remainderDecimal ? `${showers}.${remainderDecimal}` : `${showers}.0`,
};
```

## Files That Use WATER_BENCHMARKS

| File | Usage |
|------|-------|
| `packages/core/src/constants.ts` | Definition |
| `packages/core/src/index.ts` | Exports `WATER_BENCHMARKS` |
| `packages/extension/src/content/widget.ts` | Formats water for floating widget |
| `packages/extension/src/popup/popup.ts` | Formats water for extension popup |

## Key Values

| Constant | Value | Purpose |
|----------|-------|---------|
| `shower` | 50L | **Primary reference** — all decimals are relative to this |
| `jug` | 4L | Threshold below which liters are shown alongside decimal |
| `flush` | 2L | Currently **unused** in calculations — intended for flush count display |

## Example Outputs

| Water | Icon(s) | Value | Notes |
|-------|---------|-------|-------|
| 500mL | (none) | `1 bottle` | Below 1L threshold |
| 8L | 🚽 | `0.16` | 8L / 50L = 0.16 |
| 10L | 🚽 | `0.2` | 10L / 50L = 0.2 |
| 17L | 🚽 | `0.34` | 17L / 50L = 0.34 |
| 50L | 🚿 | `1.0` | 1 full shower |
| 64L | 🚿 + 🚽 | `1.28` | 1 shower + 14L remainder |
| 100L | 🚿 + 🚽 | `2.0` | 2 showers exactly |

## SVG Icons

Located in `widget.ts` and `popup.ts`:

**Toilet SVG** — simple toilet bowl outline
**Shower SVG** — showerhead with droplet lines

Both use 24x24 viewBox with 1.5 stroke width, matching existing icon style (LEAF_SVG, ZAP_SVG, etc.).

## Notes

- The `flush` benchmark (2L) is defined but **not currently used** in any calculation
- The toilet icon appears for all water usage above 1L, not just at the flush threshold
- The decimal is always relative to `shower` (50L), not `flush` (2L)
- If you want flush-based display (e.g., "4 flushes" instead of "0.16"), the logic would need to be updated