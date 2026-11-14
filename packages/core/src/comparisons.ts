/**
 * Comparison dataset: everyday water uses, foods, whole sectors and AI.
 *
 * Rules this file follows (and comparisons.test.ts enforces):
 * - Every entry cites a source with a URL and a year (the year the source was
 *   published or released, or for an undated web page the year it was
 *   accessed; the year the data refers to is in `unit`/`note`).
 * - Every entry with water states what kind of water it is (WaterKind).
 *   Kinds are not interchangeable: a rain-inclusive water footprint is not
 *   comparable with piped water, withdrawals are not consumption, and on-site
 *   data-center water excludes the water used to generate the electricity.
 * - Where a source gives a single number, low = central = high. Where it gives
 *   a range without a central value, central is the midpoint and the note says
 *   so.
 * - Values derived by arithmetic from a source (unit conversions, a patty's
 *   share of a per-kg figure) are computed below from the sourced numbers.
 */

export interface Range { low: number; central: number; high: number }

/**
 * - 'onsite-consumed': water evaporated or otherwise used up at the site
 *   (e.g. data-center cooling), excluding power-plant water.
 * - 'total-consumed': consumed on site plus consumed off site (power
 *   generation, and for lifecycle studies, manufacturing).
 * - 'withdrawn': taken from surface or ground water, whether or not returned.
 * - 'footprint-incl-rain': water footprint including rainwater used by crops
 *   and pasture (green water), plus blue and sometimes grey water.
 */
export type WaterKind = 'onsite-consumed' | 'total-consumed' | 'withdrawn' | 'footprint-incl-rain';

export interface ComparisonEntry {
  id: string;
  label: string;
  category: 'everyday' | 'food' | 'sector' | 'ai';
  /** What one unit is, e.g. "per kg", "per quarter-pound patty", "global, per year" */
  unit: string;
  co2eKg?: Range;
  waterLiters?: Range;
  waterKind?: WaterKind;
  landM2?: Range;
  /** Electricity, where the source reports it (addition to the base shape) */
  energyKwh?: Range;
  source: { title: string; url: string; year: number };
  note?: string;
}

const one = (v: number): Range => ({ low: v, central: v, high: v });
const span = (low: number, high: number): Range => ({ low, central: (low + high) / 2, high });

/** NIST SP 811 Appendix B.9: 1 gallon (U.S.) = 3.785 412 L */
const L_PER_US_GAL = 3.785412;
/** 1 lb = 0.45359237 kg (exact); a quarter pound */
const QUARTER_POUND_KG = 0.25 * 0.45359237;

const EPA_TOILETS = {
  title: 'US EPA WaterSense: Residential Toilets',
  url: 'https://www.epa.gov/watersense/residential-toilets',
  year: 2026, // undated page; year accessed
};

// Poore & Nemecek (2018), Science 360:987, global means for 2010, as
// published by Our World in Data. CO2e per kg, freshwater withdrawals L/kg,
// land m2/kg. Verified against the OWID grapher CSVs (Nov 2026).
const PN = {
  beefHerd:  { co2: 99.48, water: 1451.2, land: 326.21 },
  dairyBeef: { co2: 33.3,  water: 2714.3, land: 43.24 },
  lamb:      { co2: 39.72, water: 1802.8, land: 369.81 },
  cheese:    { co2: 23.88, water: 5605.2, land: 87.79 },
  pork:      { co2: 12.31, water: 1795.8, land: 17.36 },
  poultry:   { co2: 9.87,  water: 660,    land: 12.22 },
  tofu:      { co2: 3.16,  water: 148.6,  land: 3.52 },
  peas:      { co2: 0.98,  water: 396.6,  land: 7.46 },
};
const PN_SOURCE = {
  title: 'Poore & Nemecek (2018), Reducing food\'s environmental impacts through producers and consumers, Science; via Our World in Data',
  url: 'https://ourworldindata.org/grapher/ghg-per-kg-poore',
  year: 2018,
};
const PN_NOTE = 'Global mean for 2010 across producers. Water is freshwater withdrawals (excludes rainwater); see ourworldindata.org/grapher/water-withdrawals-per-kg-poore and land-use-per-kg-poore.';

function poore(id: string, label: string, v: { co2: number; water: number; land: number }, extra?: string): ComparisonEntry {
  return {
    id, label, category: 'food', unit: 'per kg of food product',
    co2eKg: one(v.co2), waterLiters: one(v.water), waterKind: 'withdrawn', landM2: one(v.land),
    source: PN_SOURCE,
    note: extra ? `${PN_NOTE} ${extra}` : PN_NOTE,
  };
}

export const COMPARISONS: ComparisonEntry[] = [
  // ── Everyday ──────────────────────────────────────────────────────────
  {
    id: 'water-jug',
    label: 'Gallon jug of water',
    category: 'everyday',
    unit: 'per US gallon jug',
    waterLiters: one(L_PER_US_GAL),
    waterKind: 'withdrawn',
    source: {
      title: 'NIST SP 811, Guide for the Use of the SI, Appendix B.9 (gallon (U.S.) = 3.785 412 L)',
      url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9',
      year: 2008,
    },
    note: 'WATER_BENCHMARKS.jug is 4 L, a rounded display threshold; a US gallon jug holds 3.785 L.',
  },
  {
    id: 'toilet-flush',
    label: 'Toilet flush',
    category: 'everyday',
    unit: 'per flush',
    // low: WaterSense 1.28 gal; central: US federal standard 1.6 gal; high: older toilets up to 6 gal
    waterLiters: { low: 1.28 * L_PER_US_GAL, central: 1.6 * L_PER_US_GAL, high: 6 * L_PER_US_GAL },
    waterKind: 'withdrawn',
    source: EPA_TOILETS,
    note: 'Low is a WaterSense toilet (1.28 gal), central the US federal standard (1.6 gal), high an older toilet (up to 6 gal). WATER_BENCHMARKS.flush is 2 L, below every one of these; it may reflect a part flush, but no source for 2 L was found.',
  },
  {
    id: 'shower',
    label: 'Shower (US average)',
    category: 'everyday',
    unit: 'per shower',
    waterLiters: one(59.8),
    waterKind: 'withdrawn',
    source: {
      title: 'Alliance for Water Efficiency, Home Water Works: Showers (citing the 2016 Residential End Uses of Water study)',
      url: 'https://home-water-works.org/indoor-use/showers',
      year: 2016,
    },
    note: 'Average US shower: 7.8 minutes at 2.1 gal/min = 15.8 gal (59.8 L). WATER_BENCHMARKS.shower is 50 L, about 16% below this average.',
  },

  // ── Food (per kg) ─────────────────────────────────────────────────────
  poore('beef-beef-herd', 'Beef (beef herd)', PN.beefHerd),
  poore('beef-dairy-herd', 'Beef (dairy herd)', PN.dairyBeef),
  poore('lamb', 'Lamb & mutton', PN.lamb),
  poore('cheese', 'Cheese', PN.cheese),
  poore('pork', 'Pork (pig meat)', PN.pork),
  poore('poultry', 'Poultry meat', PN.poultry),
  poore('tofu', 'Tofu', PN.tofu),
  poore('peas', 'Peas', PN.peas),
  {
    id: 'beef-patty-quarter-pound',
    label: 'Quarter-pound beef patty (beef herd)',
    category: 'food',
    unit: 'per quarter-pound patty (113.4 g raw beef)',
    co2eKg: one(PN.beefHerd.co2 * QUARTER_POUND_KG),
    waterLiters: one(PN.beefHerd.water * QUARTER_POUND_KG),
    waterKind: 'withdrawn',
    landM2: one(PN.beefHerd.land * QUARTER_POUND_KG),
    source: PN_SOURCE,
    note: 'Derived: 0.1134 kg times the Poore & Nemecek beef-herd per-kg figures (2010 global mean). Beef from the dairy herd would give 3.8 kg CO2e. Weight is of the beef as sold, before cooking.',
  },
  {
    id: 'beef-water-footprint',
    label: 'Beef, total water footprint (incl. rain)',
    category: 'food',
    unit: 'per kg of beef',
    waterLiters: one(15400),
    waterKind: 'footprint-incl-rain',
    source: {
      title: 'Mekonnen & Hoekstra, The green, blue and grey water footprint of farm animals and animal products, Value of Water Research Report Series No. 48, UNESCO-IHE',
      url: 'https://www.waterfootprint.org/resources/Report-48-WaterFootprint-AnimalProducts-Vol1.pdf',
      year: 2010,
    },
    note: 'Global average for 1996-2005. 94% is green (rain) water, mostly in feed crops and pasture, so this is not comparable with piped water or with data-center water. Published in peer-reviewed form in Ecosystems 15:401 (2012).',
  },

  // ── Sectors (global, per year) ────────────────────────────────────────
  {
    id: 'global-livestock-emissions',
    label: 'Global livestock emissions',
    category: 'sector',
    unit: 'global, per year (2015 reference year)',
    co2eKg: one(6.2e12),
    source: {
      title: 'FAO, Pathways towards lower emissions: A global assessment of the greenhouse gas emissions and mitigation options from livestock agrifood systems',
      url: 'https://www.fao.org/newsroom/detail/new-fao-report-maps-pathways-towards-lower-livestock-emissions/',
      year: 2023,
    },
    note: 'About 6.2 Gt CO2e, around 12% of anthropogenic emissions (GLEAM; farm, land-use change and supply chain; GWP100). Contested: FAO\'s earlier estimate was higher, methods changed between editions, and independent estimates differ.',
  },
  {
    id: 'global-datacenter-electricity',
    label: 'Global data-center electricity',
    category: 'sector',
    unit: 'global, per year (2025)',
    energyKwh: one(485e9),
    source: {
      title: 'IEA, Key Questions on Energy and AI',
      url: 'https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary',
      year: 2026,
    },
    note: '485 TWh in 2025, projected about 950 TWh in 2030 (about 3% of global electricity). IEA Energy and AI (2025) gave 415 TWh (about 1.5% of global electricity) for 2024.',
  },
  {
    id: 'global-datacenter-emissions',
    label: 'Global data-center emissions (electricity)',
    category: 'sector',
    unit: 'global, per year (2024)',
    co2eKg: one(180e9),
    source: {
      title: 'IEA, Energy and AI',
      url: 'https://www.iea.org/reports/energy-and-ai/executive-summary',
      year: 2025,
    },
    note: 'Emissions from electricity use by data centres, about 180 Mt CO2 today, rising to 300 Mt by 2035 in the IEA Base Case. Electricity only, CO2 (not CO2e); excludes construction and hardware.',
  },
  {
    id: 'global-aviation-co2',
    label: 'Global aviation CO2',
    category: 'sector',
    unit: 'global, per year (2018)',
    co2eKg: one(1034e9),
    source: {
      title: 'Lee et al., The contribution of global aviation to anthropogenic climate forcing for 2000 to 2018, Atmospheric Environment 244:117834',
      url: 'https://doi.org/10.1016/j.atmosenv.2020.117834',
      year: 2021,
    },
    note: 'CO2 only (1,034 Tg in 2018). The same paper finds non-CO2 effects (contrails, NOx) make up about two-thirds of aviation\'s net warming, which this figure leaves out. IEA reports almost 950 Mt CO2 for 2023 (not verified at source here).',
  },
  {
    id: 'global-agriculture-water-withdrawal',
    label: 'Global agricultural water withdrawals',
    category: 'sector',
    unit: 'global, per year (2022)',
    waterLiters: one(2902.15e12),
    waterKind: 'withdrawn',
    source: {
      title: 'FAO AQUASTAT, agricultural water withdrawal (irrigation, livestock, aquaculture); via Our World in Data',
      url: 'https://ourworldindata.org/grapher/agricultural-water-withdrawals',
      year: 2026,
    },
    note: '2,902 km3 in 2022. Many country values are FAO estimates or imputations rather than reported figures.',
  },
  {
    id: 'global-agriculture-water-footprint',
    label: 'Global agricultural water footprint (incl. rain)',
    category: 'sector',
    unit: 'global, per year (1996-2005 average)',
    waterLiters: one((7404 + 913 + 46) * 1e12),
    waterKind: 'footprint-incl-rain',
    source: {
      title: 'Hoekstra & Mekonnen, The water footprint of humanity, PNAS 109(9):3232',
      url: 'https://doi.org/10.1073/pnas.1109936109',
      year: 2012,
    },
    note: 'Sum of crop production (7,404 Gm3), pasture (913) and water supply in animal raising (46) in Table 1: 92% of humanity\'s water footprint. Includes rainwater and grey (pollution-dilution) water.',
  },
  {
    id: 'global-datacenter-water-onsite',
    label: 'Global data-center water, on-site',
    category: 'sector',
    unit: 'global, per year (2023)',
    waterLiters: one(140e9),
    waterKind: 'onsite-consumed',
    source: {
      title: 'de Vries-Gao, The carbon and water footprints of data centers and what this could mean for artificial intelligence, Patterns 7(1):101430 (citing IEA, Energy and AI)',
      url: 'https://doi.org/10.1016/j.patter.2025.101430',
      year: 2025,
    },
    note: 'IEA estimate of direct (cooling) water consumption, as quoted by de Vries-Gao; the IEA web chapters do not show it.',
  },
  {
    id: 'global-datacenter-water-total',
    label: 'Global data-center water, on-site plus electricity',
    category: 'sector',
    unit: 'global, per year (2023)',
    waterLiters: one((140 + 373) * 1e9),
    waterKind: 'total-consumed',
    source: {
      title: 'de Vries-Gao, The carbon and water footprints of data centers and what this could mean for artificial intelligence, Patterns 7(1):101430 (citing IEA, Energy and AI)',
      url: 'https://doi.org/10.1016/j.patter.2025.101430',
      year: 2025,
    },
    note: 'IEA estimate: 140 billion L direct plus 373 billion L indirect (power generation). IEA\'s 560 billion L total also includes 47 billion L for hardware manufacturing, left out here.',
  },

  // ── AI ────────────────────────────────────────────────────────────────
  {
    id: 'ai-prompt-gemini-median',
    label: 'Gemini text prompt (median)',
    category: 'ai',
    unit: 'per median Gemini Apps text prompt (May 2025)',
    energyKwh: one(0.24e-3),
    co2eKg: one(0.03e-3),
    waterLiters: one(0.26e-3),
    waterKind: 'onsite-consumed',
    source: {
      title: 'Elsworth et al. (Google), Measuring the environmental impact of delivering AI at Google Scale, arXiv 2508.15734',
      url: 'https://arxiv.org/abs/2508.15734',
      year: 2025,
    },
    note: 'Provider-reported median, not mean. Water is cooling-water consumption (fleet WUE 1.15 L/kWh) and excludes power-plant water. Emissions are market-based. Narrower accelerator-only accounting gives 0.10 Wh.',
  },
  {
    id: 'ai-query-chatgpt-average',
    label: 'ChatGPT query (average)',
    category: 'ai',
    unit: 'per average ChatGPT query (2025)',
    energyKwh: one(0.34e-3),
    waterLiters: one(0.000085 * L_PER_US_GAL),
    waterKind: 'onsite-consumed',
    source: {
      title: 'Sam Altman, The Gentle Singularity',
      url: 'https://blog.samaltman.com/the-gentle-singularity',
      year: 2025,
    },
    note: 'Provider-reported with no method given. Water stated as 0.000085 gallons (0.32 mL); the kind is not stated, but at 0.94 L/kWh it matches on-site cooling only.',
  },
  {
    id: 'ai-query-gpt4o-epoch',
    label: 'GPT-4o query (estimate)',
    category: 'ai',
    unit: 'per typical GPT-4o query (500 output tokens)',
    energyKwh: one(0.3e-3),
    source: {
      title: 'Epoch AI (Josh You), How much energy does ChatGPT use?',
      url: 'https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use',
      year: 2025,
    },
    note: 'Independent estimate. A 10k-token input raises it to about 2.5 Wh; 100k tokens to almost 40 Wh.',
  },
  {
    id: 'ai-query-frontier-median',
    label: 'Frontier model query (modelled median)',
    category: 'ai',
    unit: 'per query, models >200B parameters on H100 (500 input, median 300 output tokens)',
    energyKwh: { low: 0.16e-3, central: 0.31e-3, high: 0.60e-3 },
    source: {
      title: 'Oviedo et al. (Microsoft), Energy Use of AI Inference, Efficiency Pathways, and Test-Time Scaling, Joule 102430',
      url: 'https://arxiv.org/abs/2509.20241',
      year: 2026,
    },
    note: 'Median with interquartile range. Includes full-node power and PUE.',
  },
  {
    id: 'ai-query-reasoning-median',
    label: 'Long reasoning query (modelled median)',
    category: 'ai',
    unit: 'per test-time-scaling query (500 input, median 5,000 output tokens)',
    energyKwh: { low: 2.15e-3, central: 3.91e-3, high: 7.05e-3 },
    source: {
      title: 'Oviedo et al. (Microsoft), Energy Use of AI Inference, Efficiency Pathways, and Test-Time Scaling, Joule 102430',
      url: 'https://arxiv.org/abs/2509.20241',
      year: 2026,
    },
    note: 'Median with interquartile range, models over 200B parameters.',
  },
  {
    id: 'ai-response-mistral-large-2',
    label: 'Mistral Large 2 response (lifecycle)',
    category: 'ai',
    unit: 'per 400-token response',
    co2eKg: one(1.14e-3),
    waterLiters: one(0.045),
    waterKind: 'total-consumed',
    source: {
      title: 'Mistral AI, Our contribution to a global environmental standard for AI (with Carbone 4 and ADEME)',
      url: 'https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai',
      year: 2025,
    },
    note: 'Marginal lifecycle impact of inference, including upstream impacts such as server manufacturing, excluding the user\'s device. Wider scope than operational figures.',
  },
  {
    id: 'ai-request-gpt3-us',
    label: 'GPT-3 request, US average (on-site + off-site water)',
    category: 'ai',
    unit: 'per medium-length request (0.004 kWh server energy)',
    energyKwh: one(0.004 * 1.17),
    waterLiters: one(0.016904),
    waterKind: 'total-consumed',
    source: {
      title: 'Li, Yang, Islam & Ren, Making AI Less "Thirsty", arXiv 2304.03271 v5 (Communications of the ACM)',
      url: 'https://arxiv.org/abs/2304.03271',
      year: 2025,
    },
    note: 'Table 1, US average: 2.2 mL on-site plus 14.7 mL off-site (power generation), PUE 1.17. The authors call it conservative.',
  },
  {
    id: 'ai-global-2025',
    label: 'All AI systems, 2025 (estimate)',
    category: 'ai',
    unit: 'global, per year (2025)',
    co2eKg: span(32.6e9, 79.7e9),
    waterLiters: span(312.5e9, 764.6e9),
    waterKind: 'total-consumed',
    source: {
      title: 'de Vries-Gao, The carbon and water footprints of data centers and what this could mean for artificial intelligence, Patterns 7(1):101430',
      url: 'https://doi.org/10.1016/j.patter.2025.101430',
      year: 2025,
    },
    note: 'Published as ranges (32.6-79.7 Mt CO2; 312.5-764.6 billion L); central is the midpoint, not a published value. Water is direct plus indirect (power-plant) consumption. Emissions are CO2 from electricity.',
  },
  {
    id: 'ai-global-2027-water-withdrawal',
    label: 'Global AI water withdrawal, 2027 (projection)',
    category: 'ai',
    unit: 'global, per year (2027 projection)',
    waterLiters: span(4.2e12, 6.6e12),
    waterKind: 'withdrawn',
    source: {
      title: 'Li, Yang, Islam & Ren, Making AI Less "Thirsty", arXiv 2304.03271 v5 (Communications of the ACM)',
      url: 'https://arxiv.org/abs/2304.03271',
      year: 2025,
    },
    note: 'Projected 4.2-6.6 billion m3 on-site plus off-site withdrawal; central is the midpoint, not a published value.',
  },
  {
    id: 'ai-global-2027-water-consumption',
    label: 'Global AI water consumption, 2027 (projection)',
    category: 'ai',
    unit: 'global, per year (2027 projection)',
    waterLiters: span(0.38e12, 0.60e12),
    waterKind: 'total-consumed',
    source: {
      title: 'Li, Yang, Islam & Ren, Making AI Less "Thirsty", arXiv 2304.03271 v5 (Communications of the ACM)',
      url: 'https://arxiv.org/abs/2304.03271',
      year: 2025,
    },
    note: 'Projected 0.38-0.60 billion m3 evaporated (consumed), on-site plus off-site; central is the midpoint, not a published value.',
  },
];
