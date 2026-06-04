# DataRoot ExampleData Handoff — CompanyA + CompanyB

> **Purpose:** This document is for an implementation agent that will generate a complete synthetic demo dataset for DataRoot under a folder named `ExampleData/`. The data should feel like real research/operations data, but it must be entirely synthetic and safe to publish in a hackathon repo.

---

## 0. Mission

Create two parallel example companies so DataRoot can demonstrate the same core capability across two different research domains:

1. **CompanyA — Agricultural / Crop Trait Selection**
   - Domain: crop breeding, trait selection, genotyping, greenhouse trials, field readiness, seed inventory.
   - Demo question: *“Do we have a tomato line that is drought tolerant and powdery mildew resistant, and is it ready for spring planting?”*

2. **CompanyB — Fermentation / Microbial Strain Selection**
   - Domain: microbial strain selection, fermentation runs, metabolite/compound assays, bioreactor scheduling, QC readiness.
   - Demo question: *“Which microbial strain can produce a fruit-forward citrus-like ester profile under low-temperature fermentation, and can we scale it soon?”*

The goal is not to create biologically perfect datasets. The goal is to create internally consistent, cross-linked, messy-but-believable research artifacts that DataRoot can ingest, link, traverse, cite, and visualize.

---

## 1. Required Output Folder

Generate this folder at the repo root:

```text
ExampleData/
├── README.md
├── CompanyA_AgriTrait/
│   ├── README.md
│   ├── raw/
│   │   ├── inquiries/
│   │   ├── registries/
│   │   ├── sequences/
│   │   ├── trials/
│   │   ├── inventory/
│   │   ├── field_ops/
│   │   ├── protocols/
│   │   ├── lab_notes/
│   │   └── reports/
│   ├── expected_answers/
│   └── provenance_targets/
└── CompanyB_Fermentation/
    ├── README.md
    ├── raw/
    │   ├── inquiries/
    │   ├── registries/
    │   ├── sequences/
    │   ├── fermentation_runs/
    │   ├── assays/
    │   ├── inventory/
    │   ├── bioreactor_ops/
    │   ├── protocols/
    │   ├── lab_notes/
    │   └── reports/
    ├── expected_answers/
    └── provenance_targets/
```

Use common file formats that DataRoot can parse:

- `.csv` for table-like operational data
- `.xlsx` for registries where spreadsheet realism helps
- `.fasta` for gene/marker/strain sequence headers
- `.json` for customer inquiries and structured run metadata
- `.md` for protocols, lab notebooks, and narrative reports

---

## 2. Global Generation Rules

### 2.1 Synthetic-only

Do not use real company data, real customer names, real private strain IDs, or real private cultivar IDs. Use fictional organizations, fictional IDs, and fictional people.

### 2.2 Internal consistency matters more than biological perfection

Every important entity must be cross-referenceable by ID across at least 2–4 files.

Examples:

- A cultivar ID in `cultivar_registry.xlsx` should also appear in greenhouse trials, field trials, seed inventory, lab notes, and expected answers.
- A strain ID in `strain_registry.xlsx` should also appear in fermentation runs, metabolite assays, QC reports, and bioreactor schedule.
- A marker/gene ID in a FASTA header should match rows in marker/gene catalog CSVs.

### 2.3 Build deliberate lineage chains

Each company needs at least 2 “golden path” answers where DataRoot can traverse from the user question to an operational recommendation.

A golden path should have this structure:

```text
User inquiry
→ target traits / target product profile
→ genes / markers / metabolic pathway
→ cultivar or microbial strain
→ experiment or trial results
→ inventory / operational readiness
→ timeline projection
→ final answer with citations
→ provenance graph
```

### 2.4 Include realistic missingness

Do not make everything perfect. Add controlled gaps so the agent can demonstrate uncertainty handling.

Examples:

- A cultivar has the right genes but missing field trial validation.
- A strain produces the target metabolite but has no scale-up run yet.
- A trial passed greenhouse screening but failed one field block.
- Inventory exists, but not enough for full customer order.

### 2.5 Every row should cite cleanly

For every CSV/XLSX row, include a stable primary ID. Avoid duplicate IDs. Use consistent casing.

Recommended ID style:

```text
CompanyA:
A-INQ-001     customer inquiry
A-TRT-DRT     trait: drought tolerance
A-TRT-PMR     trait: powdery mildew resistance
A-GEN-DRT2    gene/marker
A-GEN-PMR3    gene/marker
A-CUL-TOM-014 cultivar
A-TRL-GH-022  greenhouse trial
A-TRL-FD-011  field trial
A-INV-SEED-04 seed inventory record
A-FLD-BLOCK-3 field block
A-PROT-002    protocol

CompanyB:
B-INQ-001     customer inquiry
B-PROF-EST-01 target aroma/metabolite profile
B-MET-EHEX    metabolite: ethyl hexanoate
B-MET-EBUT    metabolite: ethyl butyrate
B-GEN-AAT1    pathway gene/enzyme
B-STR-YE-017  yeast strain
B-RUN-FERM-033 fermentation run
B-ASSAY-GCMS-019 metabolite assay
B-BR-R2       bioreactor resource
B-QC-REL-007  QC release record
B-PROT-003    protocol
```

---

# 3. CompanyA — Agricultural / Crop Trait Selection

## 3.1 Demo Story

CompanyA is an agricultural R&D company developing tomato cultivars for climate resilience and disease resistance. Their data is scattered across breeding registries, genotyping files, greenhouse trial exports, seed inventory spreadsheets, field operations logs, and lab notebooks.

A customer or internal product lead asks:

> “Do we have a tomato line that is drought tolerant and powdery mildew resistant, and is it ready for spring planting?”

DataRoot should answer by traversing:

```text
Desired traits
→ trait ontology
→ marker/gene catalog
→ cultivar registry
→ genotype calls / FASTA headers
→ greenhouse trial results
→ field trial results
→ seed inventory
→ field readiness
→ timeline
```

## 3.2 Required Files

Create these files under:

```text
ExampleData/CompanyA_AgriTrait/raw/
```

### 3.2.1 `inquiries/customer_trait_requests.json`

Purpose: user-facing/customer-facing requests that become demo prompts.

Minimum records: 4.

Required fields:

```json
{
  "inquiry_id": "A-INQ-001",
  "received_date": "2026-04-14",
  "requester_type": "seed_distributor",
  "crop": "tomato",
  "requested_traits": ["drought_tolerance", "powdery_mildew_resistance"],
  "region": "Texas Zone 8",
  "desired_timeline": "spring planting",
  "minimum_seed_units": 1500,
  "notes": "Customer wants a greenhouse-validated cultivar with field readiness notes."
}
```

Include at least these inquiries:

1. Drought tolerance + powdery mildew resistance for tomato.
2. Salt tolerance for pepper.
3. Early flowering + heat tolerance for tomato.
4. Disease resistance request where no cultivar fully matches.

### 3.2.2 `registries/trait_ontology.csv`

Purpose: maps natural-language trait names to standardized trait IDs and target markers.

Minimum rows: 12.

Columns:

```text
trait_id,trait_name,aliases,crop_scope,measurement_method,linked_marker_ids,success_threshold,notes
```

Important rows:

```text
A-TRT-DRT,drought_tolerance,"water stress tolerance;low irrigation performance",tomato,greenhouse drydown assay,A-GEN-DRT2,"wilting_score <= 2.0 and yield_retention_pct >= 80",Used for arid region readiness
A-TRT-PMR,powdery_mildew_resistance,"PM resistance;mildew resistance",tomato,pathogen challenge assay,A-GEN-PMR3,"lesion_score <= 1.5",High-priority disease package trait
```

### 3.2.3 `registries/marker_gene_catalog.csv`

Purpose: marker/gene catalog for trait-to-genetics traversal.

Minimum rows: 20.

Columns:

```text
gene_id,gene_symbol,marker_name,trait_id,crop,chromosome,marker_type,confidence,source_note
```

Golden path rows:

```text
A-GEN-DRT2,DRT2,Drought Response Marker 2,A-TRT-DRT,tomato,chr03,SNP,0.91,Synthetic marker used for demo traversal
A-GEN-PMR3,PMR3,Powdery Mildew Resistance Marker 3,A-TRT-PMR,tomato,chr06,InDel,0.88,Synthetic marker used for demo traversal
```

### 3.2.4 `sequences/tomato_trait_markers.fasta`

Purpose: FASTA-style marker records with parseable headers.

Minimum entries: 20.

Header format:

```text
>{gene_id}|{cultivar_id}|{trait_id}|{variant}|confidence={score}
```

Example:

```text
>A-GEN-DRT2|A-CUL-TOM-014|A-TRT-DRT|variant=drought_plus|confidence=0.91
ATGCGTACCGTTAACCGGTTACCGTACCGTAACCGGTTACCGTACCGTAA
>A-GEN-PMR3|A-CUL-TOM-014|A-TRT-PMR|variant=pmr_resistant|confidence=0.88
ATGGGCTAACCGGTTAACCGTACCGGTTACCGTAACCGGTTACCGTAACGA
```

Sequences can be random DNA-like strings. The headers are what matter.

### 3.2.5 `registries/cultivar_registry.xlsx`

Purpose: central cultivar registry.

Minimum rows: 18.

Columns:

```text
cultivar_id,name,crop,parent_line_ids,target_trait_ids,marker_ids,status,breeding_stage,notes
```

Golden path records:

```text
A-CUL-TOM-014,Solara-14,tomato,"A-CUL-TOM-BASE-02", "A-TRT-DRT;A-TRT-PMR", "A-GEN-DRT2;A-GEN-PMR3",active,field_ready,"Best candidate for drought + mildew package"
A-CUL-TOM-022,DryShield-22,tomato,"A-CUL-TOM-BASE-08", "A-TRT-DRT;A-TRT-PMR", "A-GEN-DRT2;A-GEN-PMR3",active,greenhouse_validated,"Needs field validation before broad recommendation"
A-CUL-TOM-031,Arida-31,tomato,"A-CUL-TOM-BASE-05", "A-TRT-DRT", "A-GEN-DRT2",active,field_ready,"Drought only; lacks PMR marker"
```

### 3.2.6 `trials/greenhouse_trials_2026_q1.csv`

Purpose: greenhouse validation under controlled conditions.

Minimum rows: 30.

Columns:

```text
trial_id,date,cultivar_id,trait_id,replicate,condition,measurement,value,unit,pass_fail,notes
```

Golden path:

- `A-CUL-TOM-014` passes drought drydown and powdery mildew challenge.
- `A-CUL-TOM-022` passes greenhouse assays but has no completed field trial.
- `A-CUL-TOM-031` passes drought but fails/no data for PMR.

### 3.2.7 `trials/field_trials_2025.csv`

Purpose: field trial history.

Minimum rows: 20.

Columns:

```text
field_trial_id,cultivar_id,field_block_id,season,region,trait_focus,yield_kg_per_plot,disease_score,water_stress_score,pass_fail,notes
```

Golden path:

```text
A-TRL-FD-011,A-CUL-TOM-014,A-FLD-BLOCK-3,2025-Fall,Texas Zone 8,drought+pmr,42.6,1.1,1.8,pass,"Strong field performance under reduced irrigation"
```

### 3.2.8 `inventory/seed_inventory.csv`

Purpose: seed availability.

Minimum rows: 20.

Columns:

```text
inventory_id,cultivar_id,lot_id,available_seed_units,germination_pct,storage_location,last_qc_date,release_status,notes
```

Golden path:

```text
A-INV-SEED-04,A-CUL-TOM-014,LOT-TOM-014-2026A,2400,94,Austin Cold Room 2,2026-04-04,released,"Enough for initial spring planting request"
A-INV-SEED-09,A-CUL-TOM-022,LOT-TOM-022-2026A,3800,92,Austin Cold Room 1,2026-04-02,hold_field_validation,"Good seed quantity but not field released"
```

### 3.2.9 `field_ops/field_blocks.csv`

Purpose: deployment readiness by field block.

Minimum rows: 8.

Columns:

```text
field_block_id,region,soil_type,irrigation_status,last_soil_test_date,available_area_m2,planting_window_start,planting_window_end,notes
```

Golden path:

```text
A-FLD-BLOCK-3,Texas Zone 8,sandy_loam,ready,2026-03-25,1200,2026-04-20,2026-05-18,"Suitable for drought package trial or seed increase"
```

### 3.2.10 `reports/soil_report_A-FLD-BLOCK-3.md`

Purpose: narrative report that references field block and relevant cultivars.

Must mention:

- `A-FLD-BLOCK-3`
- `A-CUL-TOM-014`
- drought-relevant soil properties
- planting window

### 3.2.11 `protocols/*.md`

Create at least 4 protocols:

```text
A-PROT-001_drought_drydown_assay.md
A-PROT-002_powdery_mildew_challenge.md
A-PROT-003_marker_genotyping.md
A-PROT-004_field_readiness_review.md
```

Each protocol should include:

- frontmatter with `protocol_id`
- references to relevant `trait_id`, `gene_id`, or `cultivar_id`
- a brief step list
- acceptance criteria

### 3.2.12 `lab_notes/*.md`

Create at least 5 lab notes.

Each should contain messy prose and explicit IDs. Example:

```md
# Lab Note — Greenhouse PMR Review
Date: 2026-03-18
Researcher: Dr. Mira Chen

Reviewed A-CUL-TOM-014 and A-CUL-TOM-022 under A-PROT-002.
A-CUL-TOM-014 showed consistent low lesion score across replicates.
A-CUL-TOM-022 is promising but should not be released until field validation catches up.
```

## 3.3 CompanyA Expected Golden Answer

Create:

```text
ExampleData/CompanyA_AgriTrait/expected_answers/A-INQ-001_expected_answer.md
```

Expected answer should say:

- Best candidate: `A-CUL-TOM-014 / Solara-14`.
- Why: has both `A-GEN-DRT2` and `A-GEN-PMR3`; passes greenhouse and field evidence.
- Operational status: `A-INV-SEED-04` has 2,400 seed units, 94% germination, released.
- Deployment: `A-FLD-BLOCK-3` is ready in Texas Zone 8 with spring planting window.
- Secondary candidate: `A-CUL-TOM-022 / DryShield-22`; has markers and greenhouse validation, but inventory is on hold pending field validation.
- Not sufficient: `A-CUL-TOM-031 / Arida-31`; drought-ready but lacks PMR package.

## 3.4 CompanyA Provenance Target

Create:

```text
ExampleData/CompanyA_AgriTrait/provenance_targets/A-INQ-001_trace.json
```

Shape:

```json
{
  "question": "Do we have a tomato line that is drought tolerant and powdery mildew resistant, and is it ready for spring planting?",
  "stages": ["query", "traits", "genes", "cultivars", "trials", "inventory", "field_readiness", "answer"],
  "nodes": [],
  "edges": []
}
```

Populate nodes/edges with the golden path IDs above.

---

# 4. CompanyB — Fermentation / Microbial Strain Selection

## 4.1 Demo Story

CompanyB is a fermentation R&D company selecting microbial strains for flavor/aroma compound production. Their data is scattered across strain registries, metabolic pathway notes, FASTA files, fermentation run logs, GC-MS assay exports, media recipes, bioreactor schedules, QC records, and lab notebooks.

A product lead asks:

> “Which microbial strain can produce a fruit-forward citrus-like ester profile under low-temperature fermentation, and can we scale it soon?”

DataRoot should answer by traversing:

```text
Desired aroma/product profile
→ target metabolites
→ pathway genes / enzymes
→ strain registry
→ sequence/pathway evidence
→ fermentation run results
→ assay results
→ bioreactor schedule
→ QC/release state
→ scale-up timeline
```

## 4.2 Required Files

Create these files under:

```text
ExampleData/CompanyB_Fermentation/raw/
```

### 4.2.1 `inquiries/product_profile_requests.json`

Purpose: user-facing product requests.

Minimum records: 4.

Required fields:

```json
{
  "inquiry_id": "B-INQ-001",
  "received_date": "2026-04-16",
  "requester_type": "product_team",
  "target_profile": "fruit-forward citrus-like ester profile",
  "fermentation_condition": "low temperature",
  "desired_scale": "pilot",
  "target_ready_by": "2026-05-15",
  "notes": "Preference for strains with completed GC-MS assay and no active QC holds."
}
```

Include at least these inquiries:

1. Fruit-forward citrus-like ester profile at low temperature.
2. Creamy/lactic profile with low off-notes.
3. High organic acid production.
4. A request that no strain fully satisfies.

### 4.2.2 `registries/product_profile_ontology.csv`

Purpose: maps profile language to metabolites/compounds.

Minimum rows: 12.

Columns:

```text
profile_id,profile_name,aliases,target_metabolite_ids,preferred_conditions,acceptance_threshold,notes
```

Golden path row:

```text
B-PROF-EST-01,fruit_forward_citrus_ester,"bright fruit;citrus-like ester;fresh ester",B-MET-EHEX;B-MET-EBUT;B-MET-EOCT,low_temperature,"combined_target_metabolites >= 85 mg/L and off_note_score <= 2",Demo profile for product team request
```

### 4.2.3 `registries/metabolite_catalog.csv`

Purpose: metabolite lookup table.

Minimum rows: 30.

Columns:

```text
metabolite_id,name,compound_family,sensory_descriptors,associated_gene_ids,measurement_method,unit,notes
```

Golden path rows:

```text
B-MET-EHEX,ethyl hexanoate,ester,"apple;pineapple;citrus-like;bright fruit",B-GEN-AAT1,GC-MS,mg/L,Synthetic demo metabolite
B-MET-EBUT,ethyl butyrate,ester,"pineapple;orange-like;sweet fruit",B-GEN-AAT1,GC-MS,mg/L,Synthetic demo metabolite
B-MET-EOCT,ethyl octanoate,ester,"orange peel;waxy fruit;floral",B-GEN-EHT1,GC-MS,mg/L,Synthetic demo metabolite
```

### 4.2.4 `registries/pathway_gene_catalog.csv`

Purpose: maps genes/enzymes to metabolites.

Minimum rows: 20.

Columns:

```text
gene_id,gene_symbol,pathway,metabolite_ids,organism_scope,evidence_level,notes
```

Golden path rows:

```text
B-GEN-AAT1,AAT1,ester_biosynthesis,B-MET-EHEX;B-MET-EBUT,yeast,high,Synthetic pathway mapping for demo
B-GEN-EHT1,EHT1,medium_chain_ester_biosynthesis,B-MET-EOCT,yeast,medium,Synthetic pathway mapping for demo
```

### 4.2.5 `sequences/strain_pathway_markers.fasta`

Purpose: FASTA-style strain pathway marker records.

Minimum entries: 20.

Header format:

```text
>{gene_id}|{strain_id}|{pathway}|{metabolite_id}|confidence={score}
```

Example:

```text
>B-GEN-AAT1|B-STR-YE-017|ester_biosynthesis|B-MET-EHEX|confidence=0.93
ATGACCGTTAACCGGTACCGTTAACCGGTAACCGGTTAACCGGTACCGTTA
>B-GEN-EHT1|B-STR-YE-017|medium_chain_ester_biosynthesis|B-MET-EOCT|confidence=0.84
ATGTTACCGGTAACCGGTACCGTAACCGGTTAACCGGTACCGTTAACCGG
```

DNA-like random strings are fine. Headers are what matter.

### 4.2.6 `registries/strain_registry.xlsx`

Purpose: central microbial strain registry.

Minimum rows: 18.

Columns:

```text
strain_id,name,organism,parent_strain_ids,target_profile_ids,pathway_gene_ids,status,development_stage,notes
```

Golden path records:

```text
B-STR-YE-017,Yeast EsterMax 17,Saccharomyces cerevisiae,B-STR-YE-BASE-03,B-PROF-EST-01,B-GEN-AAT1;B-GEN-EHT1,active,pilot_ready,"Best candidate for fruit-forward ester profile at low temperature"
B-STR-YE-021,Yeast Citriflow 21,Saccharomyces cerevisiae,B-STR-YE-BASE-05,B-PROF-EST-01,B-GEN-AAT1,active,bench_validated,"Strong ester output but scale-up run incomplete"
B-STR-LA-009,LactoCream 09,Lactobacillus plantarum,B-STR-LA-BASE-02,B-PROF-LACTIC-02,B-GEN-LDH2,active,pilot_ready,"Good lactic profile, not ester-forward"
```

### 4.2.7 `fermentation_runs/fermentation_runs_2026_q1.csv`

Purpose: run-level fermentation history.

Minimum rows: 30.

Columns:

```text
run_id,date,strain_id,media_id,temperature_c,ph_start,ph_end,duration_hr,vessel_scale_l,run_status,notes
```

Golden path:

```text
B-RUN-FERM-033,2026-03-22,B-STR-YE-017,B-MEDIA-EST-04,14,5.2,4.4,96,20,completed,"Low-temp pilot run for ester profile"
B-RUN-FERM-041,2026-04-02,B-STR-YE-021,B-MEDIA-EST-04,14,5.2,4.5,96,2,completed,"Bench run only; scale-up pending"
```

### 4.2.8 `assays/gcms_metabolite_assays_2026_q1.csv`

Purpose: assay measurements of target metabolites.

Minimum rows: 60.

Columns:

```text
assay_id,run_id,strain_id,metabolite_id,measured_value,unit,method,pass_fail,notes
```

Golden path:

- For `B-RUN-FERM-033 / B-STR-YE-017`, include high values for `B-MET-EHEX`, `B-MET-EBUT`, `B-MET-EOCT` and pass.
- For `B-RUN-FERM-041 / B-STR-YE-021`, include good values but mark scale as bench-only.

Example:

```text
B-ASSAY-GCMS-019,B-RUN-FERM-033,B-STR-YE-017,B-MET-EHEX,42,mg/L,GC-MS,pass,"Above target for bright fruit note"
B-ASSAY-GCMS-020,B-RUN-FERM-033,B-STR-YE-017,B-MET-EBUT,31,mg/L,GC-MS,pass,"Supports citrus-like ester profile"
B-ASSAY-GCMS-021,B-RUN-FERM-033,B-STR-YE-017,B-MET-EOCT,18,mg/L,GC-MS,pass,"Adds orange-peel/waxy note"
```

### 4.2.9 `inventory/strain_inventory.csv`

Purpose: strain bank availability.

Minimum rows: 18.

Columns:

```text
inventory_id,strain_id,cryovial_count,passage_number,storage_location,last_viability_pct,last_qc_date,release_status,notes
```

Golden path:

```text
B-INV-STR-017,B-STR-YE-017,42,5,Cryobank Rack C,96,2026-04-08,released,"Available for pilot scale-up"
B-INV-STR-021,B-STR-YE-021,18,4,Cryobank Rack A,93,2026-04-05,hold_scaleup,"Bench promising but pilot release pending"
```

### 4.2.10 `bioreactor_ops/bioreactor_schedule.csv`

Purpose: operational availability for scale-up.

Minimum rows: 12.

Columns:

```text
bioreactor_id,capacity_l,availability_start,availability_end,status,compatible_media_ids,notes
```

Golden path:

```text
B-BR-R2,50,2026-04-28,2026-05-10,available,B-MEDIA-EST-04,"Open pilot window for ester strain scale-up"
B-BR-R5,200,2026-05-20,2026-06-05,reserved,B-MEDIA-EST-04,"Reserved for unrelated acid production campaign"
```

### 4.2.11 `registries/media_recipes.csv`

Purpose: fermentation media linkage.

Minimum rows: 8.

Columns:

```text
media_id,name,carbon_source,nitrogen_source,temperature_range_c,compatible_profile_ids,notes
```

Golden path:

```text
B-MEDIA-EST-04,LowTemp Ester Media,glucose,yeast_extract,12-16,B-PROF-EST-01,"Used for low-temp ester production screens"
```

### 4.2.12 `reports/qc_release_status.csv`

Purpose: QC/release readiness.

Minimum rows: 20.

Columns:

```text
qc_id,strain_id,run_id,check_type,result,status,date,notes
```

Golden path:

```text
B-QC-REL-007,B-STR-YE-017,B-RUN-FERM-033,contamination_screen,negative,released,2026-04-06,"No contamination detected"
B-QC-REL-008,B-STR-YE-017,B-RUN-FERM-033,identity_check,match,released,2026-04-06,"Marker profile matches registry"
B-QC-REL-009,B-STR-YE-021,B-RUN-FERM-041,scaleup_review,pending,hold,2026-04-07,"Needs pilot run before recommendation"
```

### 4.2.13 `protocols/*.md`

Create at least 4 protocols:

```text
B-PROT-001_low_temp_fermentation.md
B-PROT-002_gcms_ester_assay.md
B-PROT-003_strain_identity_qc.md
B-PROT-004_pilot_scaleup_review.md
```

Each protocol should include:

- frontmatter with `protocol_id`
- references to relevant strain/metabolite/run IDs
- brief procedure
- acceptance criteria

### 4.2.14 `lab_notes/*.md`

Create at least 5 lab notes.

Each should contain messy prose and explicit IDs. Example:

```md
# Lab Note — Low Temp Ester Screen
Date: 2026-03-24
Researcher: Dr. Lena Ortiz

B-STR-YE-017 performed best in B-RUN-FERM-033 under B-PROT-001.
GC-MS notes from B-ASSAY-GCMS-019 through B-ASSAY-GCMS-021 support the fruit-forward ester target.
B-STR-YE-021 is promising but still bench-scale only.
```

## 4.3 CompanyB Expected Golden Answer

Create:

```text
ExampleData/CompanyB_Fermentation/expected_answers/B-INQ-001_expected_answer.md
```

Expected answer should say:

- Best candidate: `B-STR-YE-017 / Yeast EsterMax 17`.
- Why: linked to `B-GEN-AAT1` and `B-GEN-EHT1`, associated with `B-MET-EHEX`, `B-MET-EBUT`, and `B-MET-EOCT`.
- Evidence: completed low-temp pilot run `B-RUN-FERM-033` at 14°C.
- Assay: GC-MS records show target metabolites above threshold.
- Inventory: `B-INV-STR-017` has 42 cryovials, 96% viability, released.
- Operations: `B-BR-R2` is available between 2026-04-28 and 2026-05-10.
- QC: release records are clear.
- Secondary candidate: `B-STR-YE-021 / Yeast Citriflow 21`; bench validated but not scale-up released.

## 4.4 CompanyB Provenance Target

Create:

```text
ExampleData/CompanyB_Fermentation/provenance_targets/B-INQ-001_trace.json
```

Shape:

```json
{
  "question": "Which microbial strain can produce a fruit-forward citrus-like ester profile under low-temperature fermentation, and can we scale it soon?",
  "stages": ["query", "profile", "metabolites", "genes", "strains", "fermentation_runs", "assays", "inventory", "bioreactor", "qc", "answer"],
  "nodes": [],
  "edges": []
}
```

Populate nodes/edges with the golden path IDs above.

---

# 5. README Requirements

## 5.1 Root `ExampleData/README.md`

Explain:

- These are synthetic demo datasets.
- CompanyA demonstrates agricultural trait/cultivar readiness traversal.
- CompanyB demonstrates microbial strain/fermentation scale-up traversal.
- Both are designed for DataRoot ingestion and provenance rendering.
- The data intentionally includes missingness and partial candidates.

Include demo commands:

```bash
dataroot ingest ExampleData/CompanyA_AgriTrait/raw
dataroot link
dataroot ask "Do we have a tomato line that is drought tolerant and powdery mildew resistant, and is it ready for spring planting?"

dataroot ingest ExampleData/CompanyB_Fermentation/raw
dataroot link
dataroot ask "Which microbial strain can produce a fruit-forward citrus-like ester profile under low-temperature fermentation, and can we scale it soon?"
```

## 5.2 Company READMEs

Each company README should include:

- Domain summary
- Demo question
- Golden path entities
- File inventory
- Known edge cases / intentionally missing data
- Expected answer summary

---

# 6. Linkage Rules for DataRoot

The generated data must support these linking rules:

## 6.1 Column-based foreign key matching

Examples:

```text
cultivar_id → cultivar_registry.xlsx.cultivar_id
strain_id → strain_registry.xlsx.strain_id
trait_id → trait_ontology.csv.trait_id
metabolite_id → metabolite_catalog.csv.metabolite_id
gene_id → marker_gene_catalog.csv.gene_id or pathway_gene_catalog.csv.gene_id
run_id → fermentation_runs_2026_q1.csv.run_id
field_block_id → field_blocks.csv.field_block_id
```

## 6.2 FASTA header extraction

CompanyA:

```text
>{gene_id}|{cultivar_id}|{trait_id}|{variant}|confidence={score}
```

CompanyB:

```text
>{gene_id}|{strain_id}|{pathway}|{metabolite_id}|confidence={score}
```

## 6.3 Narrative ID extraction

Markdown protocols, lab notes, and reports must mention entity IDs directly in prose so DataRoot can infer links from unstructured text.

## 6.4 Expected graph shape

CompanyA:

```text
A-INQ-001
→ A-TRT-DRT + A-TRT-PMR
→ A-GEN-DRT2 + A-GEN-PMR3
→ A-CUL-TOM-014
→ A-TRL-GH-* + A-TRL-FD-011
→ A-INV-SEED-04
→ A-FLD-BLOCK-3
→ final answer
```

CompanyB:

```text
B-INQ-001
→ B-PROF-EST-01
→ B-MET-EHEX + B-MET-EBUT + B-MET-EOCT
→ B-GEN-AAT1 + B-GEN-EHT1
→ B-STR-YE-017
→ B-RUN-FERM-033
→ B-ASSAY-GCMS-019/020/021
→ B-INV-STR-017
→ B-BR-R2
→ B-QC-REL-007/008
→ final answer
```

---

# 7. Acceptance Criteria

The generated dataset is acceptable only if all of the following are true:

1. `ExampleData/` exists with both company folders.
2. Each company has at least 20 files total when protocols, lab notes, and reports are included.
3. Each company has at least one strong golden path and one partial/ambiguous candidate.
4. IDs are consistent across files.
5. FASTA headers are parseable and cross-link to registry rows.
6. Markdown files mention explicit IDs in prose.
7. Expected answer files exist and can be used as regression tests.
8. Provenance target JSON files exist and include node/edge structures.
9. No real private data appears anywhere.
10. The data demonstrates DataRoot’s core claim: natural-language question → multi-hop traversal → answer with citations → provenance graph.

---

# 8. Suggested Generation Order

1. Create all IDs first in a central scratch table.
2. Generate registries:
   - CompanyA cultivar/trait/gene registries.
   - CompanyB strain/profile/metabolite/gene registries.
3. Generate sequence FASTA files using those IDs.
4. Generate trial/run/assay results around the golden path candidates.
5. Generate inventory and operations files.
6. Generate protocols and lab notes that reference the same IDs.
7. Generate inquiries.
8. Generate expected answers.
9. Generate provenance target JSON.
10. Run a consistency check:
    - every referenced ID exists somewhere canonical
    - every golden path ID appears in at least two files
    - no orphan IDs in expected answers

---

# 9. What Not To Do

Do not:

- Create one giant CSV only. The point is heterogeneous messy data.
- Make every candidate perfect. The agent needs to reason about partial readiness.
- Use real private data.
- Use IDs that are too natural-language-like to reliably match.
- Hide all information in prose. Keep enough structured data for reliable traversal.
- Make biology the core challenge. The demo is about data traversal, provenance, and operational reasoning.

---

# 10. Final Framing

When this data is generated, DataRoot should be able to show:

```text
Same agent.
Same traversal mechanics.
Two different research domains.
One messy folder per company.
One answer with citations.
One provenance graph.
```

That is the demo: DataRoot is not a terpene-specific tool, a crop-specific tool, or a fermentation-specific tool. It is a research-data traversal layer for scientific and operational decision-making.
