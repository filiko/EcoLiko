import { Command } from 'commander';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseClaudeCodeLogs, listClaudeProjects, parseCodexLogs } from '../parsers/index.js';
import chalk from 'chalk';

function countFiles(dir: string, ext: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      try {
        const stat = statSync(p);
        if (stat.isDirectory()) count += countFiles(p, ext);
        else if (entry.endsWith(ext)) count++;
      } catch { /* skip */ }
    }
  } catch { /* unreadable */ }
  return count;
}

function fmtTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export const doctorCommand = new Command('doctor')
  .description('Verify EcoLiko can read AI tool logs and show what was found')
  .action(() => {
    console.log(chalk.bold('\n  EcoLiko Diagnostic\n'));

    // ── Claude Code ──────────────────────────────────────────────────────────
    console.log(chalk.cyan('  Claude Code'));
    const claudeProjects = listClaudeProjects();

    const home = homedir();
    const claudeCandidates = [
      join(home, '.claude', 'projects'),
      join(home, '.config', 'claude', 'projects'),
      ...(process.platform === 'win32'
        ? [join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Claude', 'projects')]
        : []),
    ];
    for (const dir of claudeCandidates) {
      const exists = existsSync(dir);
      console.log(`    ${exists ? chalk.green('✓') : chalk.gray('○')} ${dir}`);
    }

    const claudeFileCount = claudeProjects.reduce((n, p) => n + countFiles(p, '.jsonl'), 0);
    console.log(chalk.gray(`    ${claudeProjects.length} project dir(s), ${claudeFileCount} .jsonl file(s)`));

    try {
      const ccEvents = parseClaudeCodeLogs();
      if (ccEvents.length > 0) {
        const last = ccEvents[ccEvents.length - 1];
        console.log(chalk.green(`    ✓ ${ccEvents.length} event(s) found`));
        console.log(chalk.gray(`      Most recent: ${fmtTimestamp(last.timestamp)} — ${last.model} (${last.inputTokens}in / ${last.outputTokens}out tokens)`));
      } else {
        console.log(chalk.gray('    No events found (no Claude Code sessions yet, or logs are in another location)'));
      }
    } catch (e) {
      console.log(chalk.red(`    ✗ Parse error: ${e}`));
    }

    // ── OpenAI Codex CLI ─────────────────────────────────────────────────────
    console.log(chalk.cyan('\n  OpenAI Codex CLI'));
    const codexSessionsDir = join(home, '.codex', 'sessions');
    const codexInstalled = existsSync(codexSessionsDir);
    console.log(`    ${codexInstalled ? chalk.green('✓') : chalk.gray('○')} ${codexSessionsDir}`);

    if (codexInstalled) {
      const codexFileCount = countFiles(codexSessionsDir, '.jsonl');
      console.log(chalk.gray(`    ${codexFileCount} session file(s)`));

      try {
        const codexEvents = parseCodexLogs();
        if (codexEvents.length > 0) {
          const last = codexEvents[codexEvents.length - 1];
          console.log(chalk.green(`    ✓ ${codexEvents.length} event(s) found`));
          console.log(chalk.gray(`      Most recent: ${fmtTimestamp(last.timestamp)} — ${last.model} (${last.inputTokens}in / ${last.outputTokens}out tokens)`));
        } else {
          console.log(chalk.gray('    No token_count entries found in session files'));
        }
      } catch (e) {
        console.log(chalk.red(`    ✗ Parse error: ${e}`));
      }
    } else {
      console.log(chalk.gray('    Codex CLI not installed'));
    }

    // ── Cursor ───────────────────────────────────────────────────────────────
    console.log(chalk.cyan('\n  Cursor'));
    const cursorDir = join(home, '.cursor');
    const cursorInstalled = existsSync(cursorDir);
    console.log(`    ${cursorInstalled ? chalk.green('✓') : chalk.gray('○')} ${cursorDir}`);
    if (cursorInstalled) {
      console.log(chalk.green('    ✓ Tracked via VS Code extension (vscode.lm API)'));
      console.log(chalk.yellow('    ⚠  Cursor native AI (Tab/Composer/Chat) is NOT tracked via extension'));
      console.log(chalk.gray('       To capture it: configure the companion proxy at localhost:7433 as your system HTTPS proxy'));
    }

    // ── Amazon Kiro IDE ──────────────────────────────────────────────────────
    console.log(chalk.cyan('\n  Amazon Kiro IDE'));
    const kiroDir = process.platform === 'win32'
      ? join(process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'Kiro')
      : process.platform === 'darwin'
        ? join(home, 'Library', 'Application Support', 'Kiro')
        : join(home, '.config', 'Kiro');
    const kiroInstalled = existsSync(kiroDir);
    console.log(`    ${kiroInstalled ? chalk.green('✓') : chalk.gray('○')} ${kiroDir}`);
    if (kiroInstalled) {
      console.log(chalk.green('    ✓ Tracked via VS Code extension (vscode.lm API)'));
    } else {
      console.log(chalk.gray('    Not installed — will auto-detect when installed'));
    }

    // ── Amazon Q Extension ───────────────────────────────────────────────────
    console.log(chalk.cyan('\n  Amazon Q Developer Extension'));
    const amazonQDirs = [
      join(home, '.vscode', 'extensions'),
      join(home, '.cursor', 'extensions'),
    ];
    let amazonQFound = false;
    for (const dir of amazonQDirs) {
      try {
        const matches = readdirSync(dir).filter(f => f.startsWith('amazonwebservices.amazon-q'));
        for (const m of matches) {
          console.log(chalk.green(`    ✓ ${join(dir, m)}`));
          amazonQFound = true;
        }
      } catch { /* dir doesn't exist */ }
    }
    if (!amazonQFound) {
      console.log(chalk.gray('    Not installed — will auto-detect when installed'));
    }

    console.log('');
  });
