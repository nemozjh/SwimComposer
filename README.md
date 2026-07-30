# SwimComposer

![Representative SwimComposer interface](./representative-250x250.png)

This repository contains the source code and reproducibility materials for
*SwimComposer*, the system presented in:

> Junhao Zhao, Romain Vuillemot, Petra Isenberg, and Lijie Yao.
>
> **Authoring Narrative Visualization in Motion: Visual Storytelling in
> Swimming Videos.**
>
> IEEE Transactions on Visualization and Computer Graphics (IEEE VIS 2026).

SwimComposer is an interactive authoring environment for creating narrative
visualizations in swimming-race videos. It combines prepared race data,
narrative views, visual layers, and temporal composition in a
frame-synchronous video authoring interface.

## Replicate the Interactive System

### Requirements

- Python 3.10 or newer (including the standard `venv` module)
- Internet access on the first run to download the pinned Playwright package
  and Chromium runtime
- macOS

The package was verified on macOS 26.4.1 with Playwright 1.61.0 and its
pinned Chromium runtime on July 30, 2026.

No API keys, model downloads, external data services, or GPU are required.
The repository includes a compact demo video, prepared race data, and an
authoring preset. Dependencies are installed into an isolated
`.grsi-venv` directory and do not modify the global Python environment.

### One-command reproduction

From the repository root, run:

```bash
./reproduce.sh
```

The script validates the package, installs the pinned browser dependency,
starts a local HTTP server, and runs SwimComposer in headless Chromium. It
follows the real playback path into the recorded Tracking segment between
12 and 14 seconds, pauses, and automatically writes:

- `output/playwright/representative_result.png` — the reproduced visual result;
- `output/playwright/reproduction_report.json` — the checked competition,
  timeline state, canvas count, screenshot dimensions and hash, and browser
  error summary.

Successful completion prints both paths and exits with status 0. Missing
assets, browser errors, failed requests, a non-advancing video, or a missing
rendered canvas cause a nonzero exit status.

### Manual fallback

If the browser does not open automatically:

```bash
cd swimcomposer_sourcecode
python3 -m http.server 8000
```

Then visit <http://127.0.0.1:8000/>.

This fallback is for interactive exploration only; `./reproduce.sh` is the
automated representative-result reproduction required for stamp review.

## Reproduction Scope

The representative reproduction evaluates the interactive SwimComposer
system using the bundled, precomputed demo data. This is the shortest
reviewer-facing path and does not depend on paid APIs, special hardware, or
long-running machine-learning jobs.

The source code for the full multimodal data preparation pipeline is included
in [`data_pipeline_sourcecode/`](./data_pipeline_sourcecode/). It covers:

- official swimming metadata collection;
- video lane partitioning, swimmer tracking, trajectory cleaning, and overlay
  generation;
- audio transcription, athlete-name normalization, and insight extraction;
- fixed LLM prompts, JSON schemas, taxonomy, and output validation.

Running the full pipeline is optional for the representative reproduction.
Some stages require additional software, model weights, an OpenAI-compatible
API, and suitable compute hardware. Precomputed outputs used by the
interactive demo are included in
[`swimcomposer_sourcecode/assets/competitions/swimming_competition2/`](./swimcomposer_sourcecode/assets/competitions/swimming_competition2/).

## Repository Layout

```text
.
├── README.md
├── LICENSE
├── NOTICE.txt
├── SUBMISSION.txt
├── requirements-reproduce.txt
├── setup.sh
├── reproduce.sh
├── scripts/
│   ├── check_package.py
│   ├── reproduce_result.py
│   └── serve_swimcomposer.py
├── swimcomposer_sourcecode/       # interactive system and bundled demo
└── data_pipeline_sourcecode/      # optional pipeline, including LLM materials
```

The ZIP archives in the supplementary-material directory mirror the source
folders used for paper submission. They are not needed in a Git clone and are
ignored when this directory is initialized as a standalone repository.
Legacy duplicate copies of the LLM and official-metadata materials are also
ignored; their authoritative versions are under `data_pipeline_sourcecode/`.

## Data and Asset Authorization

The authors confirm that the bundled demonstration video and visual assets are
included with authorization for distribution in this research-software and
replicability package. See [`NOTICE.txt`](./NOTICE.txt) for the distinction
between the MIT-licensed original source code and third-party or separately
authorized material.

## License

The original SwimComposer source code is released under the
[MIT License](./LICENSE). Third-party components and separately authorized
media remain subject to their respective terms, as described in
[`NOTICE.txt`](./NOTICE.txt).
