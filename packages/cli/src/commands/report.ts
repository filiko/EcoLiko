import { Command } from 'commander';
import { aggregateEvents } from '@ecoliko/core';
import { getEventsByRange, loadConfig } from '../store.js';
import { renderReport } from '../display/dashboard.js';
import chalk from 'chalk';

export const reportCommand = new Command('report')
  .description('Show historical usage report')
  .option('-p, --period <period>', 'Report period: day, week, month', 'week')
  .option('--json', 'Output as JSON')
  .action((opts: { period: string; json?: boolean }) => {
    const config = loadConfig();
    const now = new Date();
    const rows: Array<{ label: string; totals: ReturnType<typeof aggregateEvents> }> = [];

    let days: number;
    switch (opts.period) {
      case 'day':   days = 1; break;
      case 'month': days = 30; break;
      default:      days = 7; break;
    }

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const events = getEventsByRange(dayStart.getTime(), dayEnd.getTime());
      const totals = aggregateEvents(events, config);

      const label = dayStart.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      rows.push({ label, totals });
    }

    if (opts.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    console.log('');
    console.log(chalk.bold.green('  EcoLiko') + chalk.gray(` — ${opts.period} report`));
    console.log('');
    console.log(renderReport(rows));
    console.log('');
  });
