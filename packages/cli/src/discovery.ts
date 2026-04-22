import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface DetectedTool {
  name: string;
  platform: string;
  logPath: string;
  supported: boolean;
}

/**
 * Auto-detect installed AI coding tools by checking for their config/log directories.
 */
export function discoverTools(): DetectedTool[] {
  const home = homedir();
  const tools: DetectedTool[] = [];

  // Claude Code
  const claudeDir = join(home, '.claude', 'projects');
  tools.push({
    name: 'Claude Code',
    platform: 'claude-code',
    logPath: claudeDir,
    supported: existsSync(claudeDir),
  });

  // Cursor
  const cursorDir = join(home, '.cursor');
  tools.push({
    name: 'Cursor',
    platform: 'cursor',
    logPath: cursorDir,
    supported: false, // Parser not yet implemented
  });

  // OpenAI Codex CLI — sessions dir contains exact token counts
  const codexSessionsDir = join(home, '.codex', 'sessions');
  tools.push({
    name: 'OpenAI Codex CLI',
    platform: 'codex',
    logPath: codexSessionsDir,
    supported: existsSync(codexSessionsDir),
  });

  // Ollama
  const ollamaDir = join(home, '.ollama');
  tools.push({
    name: 'Ollama',
    platform: 'ollama',
    logPath: ollamaDir,
    supported: false,
  });

  // Amazon Kiro IDE (standalone VS Code fork — Amazon Q backend on Bedrock)
  const kiroDir = process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local'), 'Kiro')
    : process.platform === 'darwin'
      ? join(home, 'Library', 'Application Support', 'Kiro')
      : join(home, '.config', 'Kiro');
  tools.push({
    name: 'Amazon Kiro IDE',
    platform: 'kiro',
    logPath: kiroDir,
    supported: existsSync(kiroDir),
  });

  // Amazon Q Developer extension (installs into VS Code / Cursor)
  // Detected by presence of the extension directory
  const amazonQPaths = [
    join(home, '.vscode', 'extensions'),
    join(home, '.cursor', 'extensions'),
  ].flatMap(dir => {
    try {
      return readdirSync(dir)
        .filter(f => f.startsWith('amazonwebservices.amazon-q'))
        .map(f => join(dir, f));
    } catch { return []; }
  });
  tools.push({
    name: 'Amazon Q Extension',
    platform: 'amazon-q',
    logPath: amazonQPaths[0] ?? '',
    supported: amazonQPaths.length > 0,
  });

  return tools;
}
