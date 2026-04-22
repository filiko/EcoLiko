import { Command } from 'commander';
import { aggregateEvents } from '@ecoliko/core';
import { getTodayEvents, loadConfig } from '../store.js';
import { parseClaudeCodeLogs, parseCodexLogs } from '../parsers/index.js';
import { discoverTools } from '../discovery.js';
import { renderDashboard } from '../display/dashboard.js';
import chalk from 'chalk';

export const statusCommand = new Command('status')
  .description('Show today\'s AI usage impact (auto-reads Claude Code logs)')
  .option('--manual-only', 'Only show manually logged events')
  .action((opts: { manualOnly?: boolean }) => {
    const config = loadConfig();

    // Start of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Gather events from all sources
    const manualEvents = getTodayEvents();
    let allEvents = [...manualEvents];
    const tools = discoverTools();

    if (!opts.manualOnly) {
      // Auto-parse log-based sources
      const ccEvents = parseClaudeCodeLogs(todayStart.getTime());
      const codexEvents = parseCodexLogs(todayStart.getTime());
      allEvents = [...allEvents, ...ccEvents, ...codexEvents];

      // Show detected tools
      const active = tools.filter(t => t.supported);
      if (active.length > 0) {
        console.log(chalk.gray(`  Auto-detected: ${active.map(t => t.name).join(', ')}`));
      }
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    allEvents = allEvents.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    const totals = aggregateEvents(allEvents, config);
    console.log(renderDashboard(totals, 'Today', tools));
  });
