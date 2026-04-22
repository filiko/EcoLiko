# Contributing to EcoLiko

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/filiko/EcoLiko.git
cd EcoLiko
npm install
npm run build
npm test
```

Requires Node.js 18+.

## Project Structure

This is an npm workspaces monorepo. All packages live under `packages/`:

```
packages/
  core/         — estimation engine (energy, water, CO2 math)
  cli/          — command-line tool
  desktop/      — Electron tray app
  companion/    — background service + HTTP API
  extension/    — Chrome/Firefox browser extension
  vscode-extension/ — VS Code/Cursor status bar widget
  openclaw/     — snapshot daemon for offline machines
```

`core` is the shared dependency — if you're changing estimation logic, start there.

## Making Changes

1. Fork the repo and create a branch from `main`.
2. Make your changes.
3. Run `npm test` to make sure tests pass.
4. Run `npm run build` to verify the build.
5. Open a pull request.

## Adding a Model

To add energy profiles for a new model, edit `packages/core/src/constants.ts`. Each entry needs:

- `inputKwhPer1kTokens` — energy per 1,000 input tokens
- `outputKwhPer1kTokens` — energy per 1,000 output tokens (typically ~5x input)

Include a comment citing the source. See existing entries for examples.

## Adding a Parser

To support a new AI tool's log format, add a parser in `packages/cli/src/parsers/`. Look at `claude-code.ts` or `codex.ts` for the pattern — each parser reads log files and returns an array of usage events.

## Code Style

- TypeScript strict mode, ESM modules
- Tests use Vitest, co-located with source files (`*.test.ts`)
- No specific formatter enforced — just be consistent with surrounding code

## Reporting Issues

Open an issue on GitHub. For estimation accuracy questions, include the model name and any reference data you have.
