# Data Pipeline

This folder provides the pipeline used to produce the final competition outputs.

The pipeline is included as executable source code and supporting
documentation. It is not required for the representative, one-command
reproduction of the SwimComposer interactive system described in the
repository root README.

## Outputs

- `official_metadata.json`
- `overlay.json`
- `insight.json`
- `metric_validity.json`
- optional intermediate files for video and audio processing

## Requirements

- Python 3.10+
- OpenCV
- Ultralytics with SAM3 support
- WhisperX
- OpenAI API access for the LLM steps
- `requests`, `pypdf`, and `playwright` for official metadata collection

Create an isolated environment and install the Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

Some commands additionally require external model weights, a compatible GPU,
or an OpenAI-compatible API key. Those stages are optional for the
reviewer-facing interactive reproduction. The repository includes the
precomputed `overlay.json`, `insight.json`, and metric-validity data consumed
by the bundled demo.

## Scripts

- `official_metadata_collecting/scripts/fetch_swim_event_snapshot.py`: fetch official metadata by competition and event name
- `video_processing_pipeline.py`: lane partitioning, text-prompt SAM3, cleaning, and overlay generation
- `audio_processing_pipeline.py`: WhisperX transcription, name normalization, and insight extraction
- `LLM-SKILL/`: fixed prompts, output schemas, insight taxonomy, and validation scripts for the two LLM commentary-processing steps described in the manuscript

Inspect each command and its required inputs with:

```bash
python3 video_processing_pipeline.py --help
python3 audio_processing_pipeline.py --help
python3 official_metadata_collecting/scripts/fetch_swim_event_snapshot.py --help
python3 LLM-SKILL/scripts/validate_llm_outputs.py --help
```

Example lane-region and video-configuration files are provided in
`examples/`.

## LLM Reproducibility Materials

The `LLM-SKILL/` folder documents the two LLM-dependent commentary-processing steps used by `audio_processing_pipeline.py`: athlete name normalization and insight extraction. It includes fixed prompts, JSON output schemas, the predefined insight taxonomy, and a standalone validator that checks official-roster grounding and taxonomy conformance.
