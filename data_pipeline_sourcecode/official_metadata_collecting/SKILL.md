---
name: swim-official-event-ingest
description: Resolve a compact swimming race identifier and collect official metadata from World Aquatics APIs and Olympic result-book PDFs.
---

# Swim Official Event Ingest

This skill is intended to be invoked by an LLM agent. The LLM handles compact race-name parsing and retrieval orchestration; factual fields are collected from official sources only.

## Run

Compact input example:

`Paris 2024 Men's 50m Freestyle Final`

Structured script execution:

```bash
python3 scripts/fetch_swim_event_snapshot.py \
  --competition "Olympic Games Paris 2024" \
  --event "Men's 50m Freestyle" \
  --phase final \
  --json
```

## Inputs

- `--competition`
- `--event`
- `--phase`
- `--json`
- `--out`
- `--timeout`
- `--max-pages`
- `--rankings-page-size`
- `--skip-athlete-history`
- `--artifact-dir`

## Outputs

- `meta`
- `records`
- `athletes[]`

Historical fields are resolved `as_of_event`.

## Notes

- `personal_record` is included at athlete level.
- `national_record` is out of scope.
- Relay events are not the main target path for athlete-history enrichment.
- Record resolution is official-evidence only:
  - World Aquatics records API
  - Olympics PDF artifact
  - World Aquatics rankings PDF
  - otherwise unresolved
