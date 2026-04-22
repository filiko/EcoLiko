#!/usr/bin/env node

import { Command } from 'commander';
import { statusCommand } from './commands/status.js';
import { logCommand } from './commands/log.js';
import { reportCommand } from './commands/report.js';
import { configCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
  .name('ecoliko')
  .description('Track the environmental impact of your AI/LLM usage')
  .version('0.1.0');

program.addCommand(statusCommand);
program.addCommand(logCommand);
program.addCommand(reportCommand);
program.addCommand(configCommand);
program.addCommand(doctorCommand);

program.parse();
