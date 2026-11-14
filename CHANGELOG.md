# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-11-14

### Added
- `packages/core`: `estimateImpactRange(event, config)` returns low / central / high estimates. `central` equals `estimateImpact` exactly; low and high use sourced bounds for per-token energy, PUE, on-site water per kWh and grid intensity, and the high case adds off-site (power-plant) water. Bounds and their sources are exported as `RANGE_BOUNDS`, `LOW_ENERGY_ANCHORS`, `HIGH_ENERGY_ANCHORS`; water kind per case as `IMPACT_RANGE_WATER_KIND`.
- `packages/core`: `estimateSimpleUsage({ messagesPerDay, modelClass, days })` for everyday usage ("20 messages a day"), with per-message token assumptions exported as `SIMPLE_USAGE_ASSUMPTIONS`.
- `packages/core`: `COMPARISONS` dataset (31 entries: everyday water uses, foods per kg, global sector totals, published AI figures), each with source URL and year and an explicit water kind. Types `ComparisonEntry`, `Range`, `WaterKind`.
- `packages/core`: `ModelEnergyProfile` gains optional `source` and `basis`; new `gpt-5` profile.
- Water benchmarks (`WATER_BENCHMARKS`) and toilet/shower icons in the browser extension (IconUpdate).

### Changed
- `deepseek-r1` / `deepseek-r1-zero` energy per output token lowered from 0.0025 to 0.00066 kWh per 1k (ML.ENERGY v3.0 measurement). The old figure counted R1's reasoning chain twice.
- `packages/core` build no longer emits compiled test files into `dist/`.
- CLI: Claude Code parser normalizes current model ids (e.g. `claude-opus-5-5[1m]` → `claude-opus-5.5`), maps `claude-3-5-haiku-*` ids to `claude-haiku-3.5`, and parses large log folders faster.

### Documented, not changed
- Google's own paper gives its fleet WUE as 1.15 L/kWh (EcoLiko central uses 0.28); eGRID2023 gives a US average of 348 g CO2/kWh (central uses 370). Central values are kept stable; the range uses the newer figures as bounds.
- `WATER_BENCHMARKS.flush` (2 L) is below every sourced flush volume and `shower` (50 L) is about 16% below the sourced US average; values kept as display thresholds.

## [1.0.0] - 2026-04-16

### Added
- Initial release
- `packages/core` - Estimation engine with energy profiles for 60+ models
- `packages/cli` - Command-line interface (status, report, log, doctor, config)
- `packages/desktop` - Electron tray app with live dashboard
- `packages/companion` - Background service with HTTP API
- `packages/extension` - Browser extension for ChatGPT, Claude.ai, Gemini
- `packages/vscode-extension` - VS Code/Cursor/Windsurf status bar widget
- `packages/openclaw` - Snapshot daemon for offline/remote machines
- Support for Claude Code and Codex CLI log detection
- Eco Score grading system (A+ through F)
- Regional CO2 estimation support