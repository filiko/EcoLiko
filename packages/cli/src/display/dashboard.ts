import chalk from 'chalk';
import Table from 'cli-table3';
import type { UsageTotals, UsageEvent } from '@ecoliko/core';
import type { DetectedTool } from '../discovery.js';
import {
  formatEnergy,
  formatWater,
  formatCO2,
  formatGrade,
  formatNumber,
  progressBar,
} from './formatters.js';

/** Daily usage budgets for the progress bars */
const DAILY_BUDGETS = {
  energyKwh: 0.5,     // 0.5 kWh daily budget
  waterLiters: 1.0,   // 1 liter daily budget
  co2Grams: 200,      // 200g CO2 daily budget
};

/** Render the main status dashboard */
export function renderDashboard(totals: UsageTotals, period: string = 'Today', knownTools?: DetectedTool[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold.green('  EcoLiko') + chalk.gray(' — AI Environmental Impact Tracker'));
  lines.push(chalk.gray('  ' + '═'.repeat(48)));
  lines.push('');

  // Eco Score
  lines.push(`  Eco Score:  ${formatGrade(totals.ecoScore)}`);
  lines.push('');

  // Period header
  lines.push(chalk.bold(`  ${period}'s Impact`) + chalk.gray(` (${totals.eventCount} interactions)`));
  lines.push(chalk.gray('  ' + '─'.repeat(40)));
  lines.push('');

  // Tokens
  lines.push(`  Tokens     ${chalk.cyan('In:')} ${formatNumber(totals.totalInputTokens)}   ${chalk.cyan('Out:')} ${formatNumber(totals.totalOutputTokens)}   ${chalk.cyan('Total:')} ${formatNumber(totals.totalTokens)}`);
  lines.push('');

  // Impact with progress bars
  const energyFrac = totals.impact.energyKwh / DAILY_BUDGETS.energyKwh;
  const waterFrac = totals.impact.waterLiters / DAILY_BUDGETS.waterLiters;
  const co2Frac = totals.impact.co2Grams / DAILY_BUDGETS.co2Grams;

  lines.push(`  ${chalk.yellow('⚡')} Energy:  ${formatEnergy(totals.impact.energyKwh).padEnd(12)} ${progressBar(energyFrac)} ${Math.round(energyFrac * 100)}%`);
  lines.push(`  ${chalk.blue('💧')} Water:   ${formatWater(totals.impact.waterLiters).padEnd(12)} ${progressBar(waterFrac)} ${Math.round(waterFrac * 100)}%`);
  lines.push(`  ${chalk.gray('☁')}  CO₂:     ${formatCO2(totals.impact.co2Grams).padEnd(12)} ${progressBar(co2Frac)} ${Math.round(co2Frac * 100)}%`);
  lines.push('');

  // Eco tip
  const tip = getEcoTip(totals);
  if (tip) {
    lines.push(chalk.gray(`  💡 ${tip}`));
    lines.push('');
  }

  // Tracker breakdown tabs
  if (knownTools) {
    lines.push(chalk.bold('  Breakdown by Tracker'));
    lines.push(chalk.gray('  ' + '─'.repeat(48)));
    lines.push('');

    // Map platform id → display name from knownTools
    const toolNameMap = new Map<string, string>();
    for (const tool of knownTools) {
      toolNameMap.set(tool.platform, tool.name);
    }

    // Render active platforms (have events)
    const activePlatformKeys = new Set(totals.byPlatform.map(p => p.platform));

    for (const pb of totals.byPlatform) {
      const displayName = toolNameMap.get(pb.platform) ?? pb.platform;
      lines.push(
        `  ${chalk.green('●')} ${chalk.bold(displayName)}` +
        chalk.gray(`  ·  ${pb.events} events  ·  `) +
        formatEnergy(pb.impact.energyKwh) +
        chalk.gray('  ·  ') +
        formatWater(pb.impact.waterLiters) +
        chalk.gray('  ·  ') +
        formatCO2(pb.impact.co2Grams)
      );
      lines.push('');

      // Per-model table
      const table = new Table({
        head: ['    Model', 'Events', 'Energy', 'Water', 'CO₂'],
        style: { head: ['gray'], border: ['gray'], compact: true },
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      });
      for (const m of pb.models) {
        table.push([
          `    ${m.model}`,
          m.events.toLocaleString(),
          formatEnergy(m.impact.energyKwh),
          formatWater(m.impact.waterLiters),
          formatCO2(m.impact.co2Grams),
        ]);
      }
      // Indent each line of the table by 2 spaces
      const tableStr = table.toString().split('\n').map(l => '  ' + l).join('\n');
      lines.push(tableStr);
      lines.push('');
    }

    // Render inactive (coming soon) tools
    for (const tool of knownTools) {
      if (!activePlatformKeys.has(tool.platform)) {
        const status = tool.supported
          ? chalk.gray('no events today')
          : chalk.gray('coming soon');
        lines.push(`  ${chalk.gray('○')} ${chalk.gray(tool.name)}  ${status}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Render a tabular report */
export function renderReport(
  rows: Array<{ label: string; totals: UsageTotals }>
): string {
  const table = new Table({
    head: ['Period', 'Tokens', 'Energy', 'Water', 'CO₂', 'Grade'],
    style: { head: ['cyan'] },
  });

  for (const row of rows) {
    table.push([
      row.label,
      formatNumber(row.totals.totalTokens),
      formatEnergy(row.totals.impact.energyKwh),
      formatWater(row.totals.impact.waterLiters),
      formatCO2(row.totals.impact.co2Grams),
      row.totals.ecoScore.grade,
    ]);
  }

  return table.toString();
}

function getEcoTip(totals: UsageTotals): string | null {
  if (totals.totalTokens === 0) return 'Start using AI tools — EcoLiko will track your impact!';
  if (totals.ecoScore.grade === 'A+' || totals.ecoScore.grade === 'A') return 'Great job! Your AI usage is eco-friendly.';
  if (totals.ecoScore.grade === 'F') return 'Consider using smaller models (e.g. Haiku, Flash, Mini) for simple tasks to reduce impact.';
  if (totals.totalTokens > 100000) return 'Reduce token usage with smarter memory management: github.com/mem0ai/mem0';
  return 'Using smaller models for simple tasks can save ~60% energy.';
}
