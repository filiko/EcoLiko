# Methodology

How EcoLiko estimates the environmental impact of AI usage.

## Pipeline

```
tokens → energy → water → CO₂ → score
```

### 1. Token Counting

EcoLiko reads token counts from AI tool logs (Claude Code, Codex CLI) or intercepts streaming API responses (ChatGPT, Claude.ai, Gemini). It does not call any external APIs — all data stays local.

### 2. Energy Estimation

Each model has an energy profile specifying kWh per 1,000 input and output tokens. Output tokens cost roughly 5x more than input due to autoregressive generation vs. parallel prefill.

**Primary sources:**

- Jegham et al., "How Hungry is AI?" ([arXiv 2505.09598](https://arxiv.org/abs/2505.09598), May 2025) — API-level energy measurements across multiple providers
- "From Prompts to Power" ([arXiv 2511.05597](https://arxiv.org/abs/2511.05597), Nov 2025) — 32,000 measurements across 21 GPU configurations
- Epoch AI (2025) — GPT-4o per-query energy estimates
- TokenPowerBench ([arXiv 2512.03024](https://arxiv.org/abs/2512.03024), Dec 2024) — H100 cluster benchmarks
- Luccioni et al., "Power Hungry Processing" ([arXiv 2311.16863](https://arxiv.org/abs/2311.16863), 2023)

No paper has directly measured proprietary model energy. All cloud model figures are inferred from external observations. Local models use separate profiles that account for consumer GPU inefficiency (batch size 1, no optimization).

### 3. Water

Multiplies energy by the datacenter operator's Water Usage Effectiveness (WUE) — liters of cooling water consumed per kWh of IT electricity.

| Operator | WUE (L/kWh) | Source |
|----------|-------------|--------|
| AWS | 0.15 | AWS 2024 Sustainability Report |
| Meta | 0.24 | Meta 2024 Sustainability Report |
| Google | 0.28 | Google 2024 Environmental Report |
| Microsoft | 0.30 | Microsoft FY2024 Environmental Sustainability Report |
| Industry avg | 1.80 | Uptime Institute 2024 |
| Local | 0.00 | No datacenter cooling |

EcoLiko maps platforms to operators (e.g., ChatGPT → Microsoft, Claude → average of Google + AWS). Unknown platforms use the hyperscaler average (0.26 L/kWh).

This is scope-1 (direct cooling water) only. It does not include scope-2 water consumed at power plants for electricity generation.

### 4. CO₂

Multiplies total energy (including PUE overhead) by regional grid carbon intensity.

| Region | g CO₂/kWh | Source |
|--------|-----------|--------|
| EU Nordic | 30 | Ember 2025 |
| Brazil | 75 | IEA 2025 |
| Canada | 120 | IEA 2025 |
| UK | 170 | EEA 2024 |
| US West | 230 | EPA eGRID 2023 |
| US Average | 370 | EPA eGRID 2023 |
| Australia | 530 | IEA 2025 |
| India | 650 | IEA 2025 |

Default PUE (Power Usage Effectiveness): 1.15 for cloud, 1.0 for local.

### 5. Eco Score

A daily score (0-100) mapped to letter grades based on total token volume, weighted by model efficiency.

| Grade | Daily Tokens |
|-------|-------------|
| A+ | < 500 |
| A | < 5,000 |
| B | < 25,000 |
| C | < 100,000 |
| D | < 500,000 |
| F | >= 500,000 |

## Uncertainty

All estimates carry approximately 2-5x uncertainty. Key sources of error:

- **Model energy**: No public benchmarks exist for proprietary model architectures. Estimates are inferred from external measurements and scaling laws.
- **Datacenter efficiency**: WUE and PUE vary by season, location, and workload. Published figures are fleet averages.
- **Grid intensity**: Varies hourly with weather and demand. We use annual averages.
- **Token counting**: Log formats vary and may not capture all usage (e.g., system prompts, retries).

This tool is designed for directional awareness, not precise carbon accounting.

## Further Reading

- [Research survey](research-survey.md) — survey of existing water/electricity footprint tools
- Li et al., "Making AI Less Thirsty" ([arXiv 2304.03271](https://arxiv.org/abs/2304.03271), 2023)
