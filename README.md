<div align="center">

# ecoliko

**what your AI actually costs**

Track the water, electricity, and CO2 footprint of your AI usage across every tool you use.

[Getting Started](#getting-started) · [Packages](#packages) · [How It Works](#how-it-works) · [Contributing](CONTRIBUTING.md)

</div>

---

EcoLiko is a monorepo of tools that estimate the environmental impact of AI/LLM usage. It reads logs from Claude Code, Codex CLI, and browser-based AI tools, then converts token counts into energy, water, and carbon estimates using peer-reviewed research.

## Getting Started

```bash
git clone https://github.com/filiko/EcoLiko.git
cd EcoLiko
npm install
npm run build
```

Requires Node.js 18+.

### Quick check

```bash
npx ecoliko status
```

```
  Eco Score:  B (62/100)

  Today's Impact (12 interactions)
  ────────────────────────────────────────
  Tokens     In: 45,200   Out: 12,800

  ⚡ Energy:  10.42 Wh
  💧 Water:   2.7 mL
  ☁  CO₂:     3.9 g
```

Auto-detects Claude Code and Codex CLI logs. No API keys or config needed.

## Packages

| Package | Description |
|---------|-------------|
| [`packages/core`](packages/core) | Estimation engine — energy profiles for 60+ models, water/CO2 factors, scoring |
| [`packages/cli`](packages/cli) | Command-line interface — `status`, `report`, `log`, `doctor`, `config` |
| [`packages/desktop`](packages/desktop) | Electron tray app — system tray icon with a live dashboard popup |
| [`packages/companion`](packages/companion) | Background service — HTTP API, log polling, system tray (headless or with UI) |
| [`packages/extension`](packages/extension) | Browser extension — intercepts ChatGPT, Claude.ai, and Gemini traffic |
| [`packages/vscode-extension`](packages/vscode-extension) | VS Code/Cursor/Windsurf extension — status bar widget with live impact |
| [`packages/openclaw`](packages/openclaw) | Snapshot daemon — periodic log collection for offline/remote machines |

## How It Works

```
token count → energy per model (kWh/1K tokens) → water (datacenter WUE) → CO₂ (grid intensity)
```

1. **Token counting** — parses logs or intercepts API streams to extract input/output token counts per model.
2. **Energy estimation** — multiplies tokens by model-specific energy profiles sourced from peer-reviewed measurements ([arXiv 2505.09598](https://arxiv.org/abs/2505.09598), [arXiv 2511.05597](https://arxiv.org/abs/2511.05597), Epoch AI 2025).
3. **Water** — applies datacenter Water Usage Effectiveness (WUE) factors per cloud provider (AWS, Google, Microsoft, Meta sustainability reports).
4. **CO2** — applies regional grid carbon intensity (EPA eGRID 2023, IEA 2025, Ember 2025).
5. **Scoring** — rolls everything into a daily eco score (A+ through F) based on total token volume and model efficiency.

All estimates carry ~2-5x uncertainty. This is for awareness, not precision accounting. See [`docs/methodology.md`](docs/methodology.md) for the full breakdown.

## CLI Usage

```bash
npx ecoliko status                              # today's impact
npx ecoliko report --period week                 # weekly breakdown
npx ecoliko log 1500 3000 --model gpt-4o         # manual entry
npx ecoliko config set region eu-nordic          # set your grid region
npx ecoliko doctor                               # verify log detection
```

## Browser Extension

```bash
cd packages/extension
npm run build
```

Load `packages/extension/dist/` as an unpacked extension in Chrome/Edge, or `dist-firefox/` in Firefox. Tracks ChatGPT, Claude.ai, and Gemini automatically.

## Desktop App

```bash
cd packages/desktop
npm run start
```

Adds a leaf icon to your system tray. Click it for a live dashboard popup showing today's impact, 7-day history, and per-model breakdowns.

## Supported Models

60+ models including GPT-4o/4.1, Claude Opus/Sonnet/Haiku, Gemini 2.5, Llama 3/4, DeepSeek, Mistral, Grok, Qwen, and more. Local models (Ollama, LM Studio) use separate energy profiles that account for consumer GPU efficiency. Unknown models fall back to a conservative default.

## Eco Score

| Grade | Daily Tokens |
|-------|-------------|
| A+ | < 500 |
| A | < 5,000 |
| B | < 25,000 |
| C | < 100,000 |
| D | < 500,000 |
| F | >= 500,000 |

Smaller, more efficient models score better at the same token count.

## Configuration

Set your region for more accurate CO2 estimates:

```bash
npx ecoliko config set region us-west
```

| Region | g CO2/kWh |
|--------|-----------|
| eu-nordic | 30 |
| brazil | 75 |
| canada | 120 |
| uk | 170 |
| us-west | 230 |
| us-average | 370 |
| australia | 530 |
| india | 650 |

## Development

```bash
npm install          # install all workspace deps
npm run build        # build all packages
npm test             # run all tests
```

Individual packages:

```bash
npm run build --workspace=packages/core
npm test --workspace=packages/cli
npm run dev --workspace=packages/extension
```

## License

[MIT](LICENSE)
