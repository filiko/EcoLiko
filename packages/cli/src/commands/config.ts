import { Command } from 'commander';
import { loadConfig, saveConfig } from '../store.js';
import { CO2_INTENSITY } from '@ecoliko/core';
import chalk from 'chalk';

export const configCommand = new Command('config')
  .description('View or update EcoLiko configuration');

configCommand
  .command('set <key> <value>')
  .description('Set a config value (region, pue, wueFactor, co2IntensityGPerKwh)')
  .action((key: string, value: string) => {
    const numericKeys = ['pue', 'wueFactor', 'co2IntensityGPerKwh'];
    const config: Record<string, unknown> = {};

    if (numericKeys.includes(key)) {
      const num = parseFloat(value);
      if (isNaN(num)) {
        console.error(chalk.red(`  Error: ${key} must be a number`));
        process.exit(1);
      }
      config[key] = num;
    } else if (key === 'region') {
      if (!CO2_INTENSITY[value]) {
        console.log(chalk.yellow(`  Warning: Unknown region "${value}". Available regions:`));
        console.log(chalk.gray(`    ${Object.keys(CO2_INTENSITY).join(', ')}`));
      }
      config[key] = value;
    } else {
      console.error(chalk.red(`  Unknown config key: ${key}`));
      console.log(chalk.gray('  Available keys: region, pue, wueFactor, co2IntensityGPerKwh'));
      process.exit(1);
    }

    saveConfig(config);
    console.log(chalk.green(`  ✓ Set ${key} = ${value}`));
  });

configCommand
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = loadConfig();
    console.log('');
    console.log(chalk.bold('  EcoLiko Configuration'));
    console.log(chalk.gray('  ' + '─'.repeat(30)));

    const entries = Object.entries(config);
    if (entries.length === 0) {
      console.log(chalk.gray('  (using defaults)'));
    } else {
      for (const [key, value] of entries) {
        console.log(`  ${chalk.cyan(key)}: ${value}`);
      }
    }
    console.log('');
  });
