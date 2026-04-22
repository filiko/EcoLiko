import chalk from 'chalk';
import type { EcoScore, ImpactEstimate, UsageTotals } from '@ecoliko/core';

/** Format a number with locale-aware separators */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format kWh with appropriate precision */
export function formatEnergy(kwh: number): string {
  if (kwh < 0.001) return `${(kwh * 1_000_000).toFixed(1)} μWh`;
  if (kwh < 1) return `${(kwh * 1000).toFixed(2)} Wh`;
  return `${kwh.toFixed(3)} kWh`;
}

/** Format liters with appropriate precision */
export function formatWater(liters: number): string {
  if (liters < 0.001) return `${(liters * 1000).toFixed(2)} mL`;
  if (liters < 1) return `${(liters * 1000).toFixed(1)} mL`;
  return `${liters.toFixed(2)} L`;
}

/** Format CO2 grams */
export function formatCO2(grams: number): string {
  if (grams < 1) return `${(grams * 1000).toFixed(1)} mg`;
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams.toFixed(1)} g`;
}

/** Color-code the eco-score grade */
export function formatGrade(score: EcoScore): string {
  const { grade, value } = score;
  const label = `${grade} (${value}/100)`;
  switch (grade) {
    case 'A+': return chalk.bold.green(label);
    case 'A':  return chalk.green(label);
    case 'B':  return chalk.yellow(label);
    case 'C':  return chalk.hex('#FFA500')(label); // orange
    case 'D':  return chalk.red(label);
    case 'F':  return chalk.bold.red(label);
  }
}

/** Create a visual progress bar */
export function progressBar(fraction: number, width: number = 20): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  if (fraction < 0.3) return chalk.green(bar);
  if (fraction < 0.6) return chalk.yellow(bar);
  return chalk.red(bar);
}

/** Format the full impact summary */
export function formatImpact(impact: ImpactEstimate): string {
  return [
    `  ${chalk.yellow('⚡')} Energy:  ${formatEnergy(impact.energyKwh)}`,
    `  ${chalk.blue('💧')} Water:   ${formatWater(impact.waterLiters)}`,
    `  ${chalk.gray('☁')}  CO₂:     ${formatCO2(impact.co2Grams)}`,
  ].join('\n');
}
