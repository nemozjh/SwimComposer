# SwimComposer Interactive Source

This folder contains the interactive SwimComposer source release and a compact
demonstration race.

For the reviewer-facing one-command reproduction, run the following from the
parent repository directory:

```bash
./reproduce.sh
```

For a manual local run from this folder:

```bash
python3 -m http.server 8000
```

Then open <http://127.0.0.1:8000/>.

The interactive demo does not require third-party Python packages. Its
precomputed race data are stored under `assets/competitions/`, and the
preconfigured authoring state is stored under `assets/presets/`.
