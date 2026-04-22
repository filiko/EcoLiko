import { Command } from 'commander';
import { randomUUID } from 'node:crypto';
import type { Platform, UsageEvent } from '@ecoliko/core';
import { estimateImpact } from '@ecoliko/core';
import { saveEvent, loadConfig } from '../store.js';
import { formatImpact } from '../display/formatters.js';
import chalk from 'chalk';

export const logCommand = new Command('log')
  .description('Manually log an AI usage event')
  .argument('<inputTokens>', 'Number of input tokens', parseInt)
  .argument('<outputTokens>', 'Number of output tokens', parseInt)
  .option('-m, --model <model>', 'Model name (e.g. gpt-4o, claude-sonnet-4)', 'default')
  .option('-p, --platform <platform>', 'Platform (chatgpt, claude, gemini, copilot, ollama, other)', 'other')
  .action((inputTokens: number, outputTokens: number, opts: { model: string; platform: string }) => {
    const event: UsageEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      platform: opts.platform as Platform,
      model: opts.model,
      inputTokens,
      outputTokens,
      source: 'cli',
    };

    saveEvent(event);
    const config = loadConfig();
    const impact = estimateImpact(event, config);

    console.log('');
    console.log(chalk.green('  ✓ Logged usage event'));
    console.log(chalk.gray(`    Model: ${opts.model} | Platform: ${opts.platform}`));
    console.log(chalk.gray(`    Tokens: ${inputTokens} in / ${outputTokens} out`));
    console.log('');
    console.log(chalk.bold('  Environmental impact:'));
    console.log(formatImpact(impact));
    console.log('');
  });
