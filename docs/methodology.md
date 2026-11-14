# Methodology

How EcoLiko estimates the environmental impact of AI usage.

## Pipeline

```
tokens → energy → water → CO₂ → score
```

Every estimate comes as a single central number (`estimateImpact`) and, if you want it, as a low / central / high range (`estimateImpactRange`). The central number is what all EcoLiko apps show; the range shows how far published sources disagree.

### 1. Token Counting

EcoLiko reads token counts from AI tool logs (Claude Code, Codex CLI) or intercepts streaming API responses (ChatGPT, Claude.ai, Gemini). It does not call any external APIs — all data stays local.

Hidden reasoning tokens are reported by providers as output tokens, and EcoLiko counts them. Per-token energy profiles therefore must not also include the length of a reasoning chain, or reasoning would be counted twice (see "Reasoning models" below).

### 2. Energy Estimation

Each model has an energy profile specifying kWh per 1,000 input and output tokens. Output tokens cost roughly 5x more than input due to autoregressive generation vs. parallel prefill.

The central calibration is GPT-4o at about 0.3 Wh for a 500-output-token query (Epoch AI, 2025). With the default PUE of 1.15 that is 0.345 Wh, in line with the 0.34 Wh "average ChatGPT query" OpenAI reported in June 2025.

Each profile can carry a `source` and a `basis`:

- `measured`: derived from a published energy measurement of that model (e.g. ML.ENERGY Benchmark v3.0 for DeepSeek-V3 and R1)
- `provider-reported`: published by the model's provider
- `inferred`: scaled from another model's figure or from model size

Most proprietary models are `inferred`: no paper has measured their per-token energy directly. Newer Claude (4.5 and later, including 5.x) and OpenAI (GPT-5.x after GPT-5, GPT-6) models have no published per-model figure and fall back to the `default` (GPT-4o-class) profile.

**Primary sources:**

- Jegham et al., "How Hungry is AI?" ([arXiv 2505.09598](https://arxiv.org/abs/2505.09598), v6 Nov 2025) — per-model Wh per query at 100/300, 1k/1k and 10k/1.5k tokens, from API throughput and inferred hardware
- Oviedo et al. (Microsoft), "Energy Use of AI Inference, Efficiency Pathways, and Test-Time Scaling", Joule (2026) 102430 ([arXiv 2509.20241](https://arxiv.org/abs/2509.20241)) — bottom-up production estimate; compiles ML.ENERGY v3.0 measurements
- Elsworth et al. (Google), "Measuring the environmental impact of delivering AI at Google Scale" ([arXiv 2508.15734](https://arxiv.org/abs/2508.15734), Aug 2025) — median Gemini Apps text prompt 0.24 Wh, 0.26 mL
- "From Prompts to Power" ([arXiv 2511.05597](https://arxiv.org/abs/2511.05597), Nov 2025) — 32,000 measurements across 21 GPU configurations
- Epoch AI (2025) — GPT-4o per-query energy estimate
- TokenPowerBench ([arXiv 2512.03024](https://arxiv.org/abs/2512.03024), Dec 2025) — H100 cluster benchmarks
- Luccioni et al., "Power Hungry Processing" ([arXiv 2311.16863](https://arxiv.org/abs/2311.16863), 2023)

Local models use separate profiles that account for consumer GPU inefficiency (batch size 1, no optimization).

**Reasoning models.** Jegham et al.'s per-query figures for o3, DeepSeek-R1 and GPT-5 at high reasoning include hidden reasoning tokens that their stated output-token count does not, so they cannot be converted to per-token energy. DeepSeek-R1 used to be profiled from such a figure (24.6 Wh per query), which double counted its reasoning; it now uses ML.ENERGY's measured 0.66 Wh per 1,000 output tokens (1.8x DeepSeek-V3 per token, same base model). The o-series profiles are still inferred and may have the same problem; no per-token source exists to correct them.

### 3. Water

Multiplies energy by the datacenter operator's Water Usage Effectiveness (WUE) — liters of cooling water consumed per kWh.

| Operator | WUE (L/kWh) | Source |
|----------|-------------|--------|
| AWS | 0.15 | AWS 2024 Sustainability Report |
| Meta | 0.24 | Meta 2024 Sustainability Report |
| Google | 0.28 | Google 2024 Environmental Report (estimate) |
| Microsoft | 0.30 | Microsoft FY2024 Environmental Sustainability Report |
| Industry avg | 1.80 | Uptime Institute 2024 |
| Local | 0.00 | No datacenter cooling |

EcoLiko maps platforms to operators (e.g., ChatGPT → Microsoft, Claude → average of Google + AWS). Unknown platforms use the hyperscaler average (0.26 L/kWh).

The central estimate is on-site (scope-1) cooling water consumed only. It does not include water consumed at power plants generating the electricity (scope-2), which is usually larger. The high end of the range includes it (see "Ranges").

Known discrepancy: Google's own paper (arXiv 2508.15734, Sec. 3.3) gives Google's fleet WUE as 1.15 L/kWh, about four times the 0.28 above. The central table is unchanged so existing results stay stable; the range uses 1.15 as its high on-site bound.

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

Known discrepancy: the eGRID2023 rev2 summary tables (EPA, June 2025) give the US total output CO₂ rate as 767.2 lb/MWh = 348 g/kWh, below the 370 used for `us-average`. The range uses 348 as its low US bound.

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

## Ranges (low / central / high)

`estimateImpactRange(event, config)` returns `{ low, central, high }`. `central` is exactly `estimateImpact(event, config)`. `low` and `high` move four inputs to sourced bounds:

| Input | Low | High | Sources |
|-------|-----|------|---------|
| Energy per token | ~0.28x central | ~1.92x central, or the model's own published ratio if higher | Low: smallest ratio of an ML.ENERGY v3.0 production measurement (GPU only) to the central profile at the same output tokens — Llama 3.1 70B 0.04 Wh at 361 tokens, 405B 0.21 Wh at 367 (via Oviedo et al. Table 1). High: Jegham et al. v6 GPT-4o 0.423 Wh at 100/300 tokens vs EcoLiko's 0.221 Wh. Models in `HIGH_ENERGY_ANCHORS` use their own Jegham ratio when larger (gpt-4o-mini 10.4x, gpt-4.1-mini 8.2x, llama-3.1-70b 8.6x, gpt-4.1-nano 6.2x, gpt-4.1 3.9x, llama-3.1-405b 3.0x, deepseek-v3 18.9x on DeepSeek's own servers). |
| PUE | 1.09 | 1.56 | Google fleet average (arXiv 2508.15734); Uptime Institute 2024 survey industry average |
| On-site WUE | 0.15 L/kWh | 1.15 L/kWh | AWS 2024; Google fleet (arXiv 2508.15734) |
| Off-site water | — | + 4.35 L/kWh | LBNL 2024 US Data Center Energy Usage Report, as cited by Li et al. v5 (arXiv 2304.03271), who use a lower 3.14 L/kWh as conservative |
| Grid (US / unset) | 348 g/kWh | 623 g/kWh | eGRID2023 rev2 US total output rate (767.2 lb/MWh); US non-baseload rate (1,372.5 lb/MWh), the generation that responds to added demand |

Rules:

- Inputs the user set explicitly (`pue`, `wueFactor`, `co2IntensityGPerKwh`, or a non-US `region`) stay fixed in all three cases.
- Local inference keeps PUE 1.0 and zero on-site water, but its high case still includes off-site water for the electricity.
- Water kinds differ by case (`IMPACT_RANGE_WATER_KIND`): low and central are on-site consumed; high is total consumed (on-site plus power generation).
- Reasoning models get only the global high factor; their published per-query figures are not per-token comparable.

What the range is and is not: it spans the disagreement between published estimates and between data-center operators. The low end leans on production measurements and provider disclosures; the high end on independent academic estimates (Jegham et al.), which Oviedo et al. argue overstate production energy by 4-20x. Inferred profiles carry further uncertainty that no source quantifies, so a true value outside the range is possible.

## Everyday usage (`estimateSimpleUsage`)

`estimateSimpleUsage({ messagesPerDay, modelClass, days = 365 }, config)` converts messages to tokens and returns `estimateImpactRange` for them. Assumptions (`SIMPLE_USAGE_ASSUMPTIONS`):

| Class | Profile | Input tokens / message | Output tokens / message | Basis |
|-------|---------|------------------------|-------------------------|-------|
| small | gpt-4o-mini | 500 | 433 | Same as standard (assumption) |
| standard | gpt-4o | 500 | 433 | Oviedo et al. (Joule 2026): 500 input; output exponential with median 300; mean = 300 / ln 2 |
| reasoning | deepseek-r1 | 500 | 7,213 | Oviedo et al. test-time scaling: median 5,000 output; mean = 5,000 / ln 2 |

Means are used because yearly totals sum messages; the median-to-mean conversion is EcoLiko's. The platform is `other` (hyperscaler-average water factor). One standard message comes out at 0.37 Wh central (published per-query figures: 0.24 Wh Google median, 0.31 Wh Oviedo median, 0.34 Wh OpenAI average); one reasoning message at 5.5 Wh (Oviedo median 3.91 Wh, IQR 2.15-7.05).

Note: because Jegham et al. estimate GPT-4o-mini above GPT-4o, the small class's high bound is higher than the standard class's.

## Comparison dataset (`COMPARISONS`)

`COMPARISONS` holds sourced reference points: everyday water uses, foods per kg, whole sectors per year, and published AI figures. Each entry has a source URL and year, and every water figure states its kind:

- `onsite-consumed` — evaporated or used up on site (data-center cooling), excluding power-plant water
- `total-consumed` — on-site plus off-site (power generation; for lifecycle studies also manufacturing)
- `withdrawn` — taken from rivers or aquifers, whether or not returned (household tap water, irrigation)
- `footprint-incl-rain` — water footprint including rainwater used by crops and pasture

These kinds are not interchangeable. A beef water footprint of 15,400 L/kg is 94% rainwater and cannot be compared with litres from a tap or a cooling tower; the Poore & Nemecek withdrawals (1,451 L/kg for beef-herd beef) can. Single published values have low = central = high; published ranges without a central value use the midpoint, and the entry's note says so.

## Uncertainty

Key sources of error:

- **Model energy**: No public measurements exist for proprietary model architectures. Estimates are inferred from external observations and scaling.
- **Datacenter efficiency**: WUE and PUE vary by season, location, and workload. Published figures are fleet averages.
- **Grid intensity**: Varies hourly with weather and demand. We use annual averages.
- **Token counting**: Log formats vary and may not capture all usage (e.g., system prompts, retries).

Use `estimateImpactRange` to see the spread. This tool is designed for directional awareness, not precise carbon accounting.

## Further Reading

- [Research survey](research-survey.md) — survey of existing water/electricity footprint tools
- Li et al., "Making AI Less Thirsty" ([arXiv 2304.03271](https://arxiv.org/abs/2304.03271), v5 2025)
- de Vries-Gao, "The carbon and water footprints of data centers and what this could mean for artificial intelligence", Patterns 7(1) (2025), [doi:10.1016/j.patter.2025.101430](https://doi.org/10.1016/j.patter.2025.101430)
