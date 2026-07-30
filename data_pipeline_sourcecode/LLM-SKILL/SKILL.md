---
name: swimcomposer-llm-commentary-processing
description: Normalize athlete names and extract structured race insights from timestamped commentary using fixed prompts, official roster grounding, schemas, and validation.
---

# SwimComposer LLM Commentary Processing

Use this skill after official metadata collection and timestamped transcription are available.

## Inputs

- `transcript.json`: timestamped commentary transcript with `segments[]`.
- `official_metadata.json`: official race snapshot with `athletes[]` including official names, lanes, countries, and ranks.
- Fixed prompts in `prompts/`.
- Output schemas in `schemas/`.

## Step 1: Name Normalization

Goal: map spoken athlete mentions to official athlete names.

Grounding source: `official_metadata.json athletes[]`.

Prompt: `prompts/name_normalization_system_prompt.md`.

Raw LLM response schema: `schemas/name_normalization_response.schema.json`.

Pipeline artifact schema: `schemas/normalized_transcript_artifact.schema.json`.

Rules:

- Preserve segment IDs and timing.
- Return empty `mentions` when no athlete is mentioned.
- Use only official athlete names from the roster.
- Do not invent athlete names.
- Include a confidence score and brief rationale for each mention.

## Step 2: Insight Extraction

Goal: classify normalized commentary into predefined insight types and produce short analytical summaries.

Taxonomy: `taxonomy/insight_taxonomy.json`.

Prompt: `prompts/insight_extraction_system_prompt.md`.

Raw LLM response schema: `schemas/insight_extraction_response.schema.json`.

Pipeline artifact schema: `schemas/insight_artifact.schema.json`.

Rules:

- Use only the predefined insight categories.
- A segment may produce zero, one, or multiple insights.
- Do not reproduce the full commentary.
- Map athlete references back to the official roster when possible.

## Validation

Run:

```bash
python3 scripts/validate_llm_outputs.py \
  --official-snapshot official_metadata.json \
  --normalized-transcript normalized_transcript.json \
  --insights insight.json \
  --taxonomy taxonomy/insight_taxonomy.json
```

Validation checks:

- every normalized athlete name appears in the official roster;
- every insight category is in the taxonomy;
- source segment IDs are resolvable when a normalized transcript is provided;
- insight athlete and target names resolve to the official roster;
- confidence values are numeric and in `[0, 1]` when present;
- time intervals are numeric and non-decreasing.
