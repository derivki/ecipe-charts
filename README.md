# ECIPE Quantum Technologies Tracker

Interactive charts of the quantum-computing startup landscape, generated from
ECIPE's internal database and published to the ECIPE website.

- **Live charts:** https://derivki.github.io/ecipe-charts/ (repo `derivki/ecipe-charts`)
- **How updates work:** [`docs-internal/quarterly-update-runbook.md`](docs-internal/quarterly-update-runbook.md)
- **Decisions & to-dos:** [`PROJECT_LOG.md`](PROJECT_LOG.md)

## What this is

A **two-stage pipeline**:

1. **Stage 1 (Python, local):** reads the private Excel database, validates it, and
   writes publishable aggregated JSON to `docs/data/`.
2. **Stage 2 (D3, in the browser):** hand-authored charts in `docs/` read that JSON
   and render interactive SVG. Published via GitHub Pages, embedded in WordPress via iframe.

The **raw Excel is never committed** — only aggregated, publishable numbers go into
this public repo. See [`PROJECT_LOG.md`](PROJECT_LOG.md) for the architecture rationale.

## Repository layout

```
config.yaml            Pipeline config (data vintage, paths, vocab) — edit each quarter
raw/                   PRIVATE, git-ignored — the source xlsx lives here locally
src/                   Stage 1 (Python): stage1_aggregate.py, aggregations.py, validate.py
data/reference/        External inputs (e.g. GDP) — sourced separately
docs/                  Stage 2 (published by GitHub Pages)
  data/                Generated JSON the charts read (committed)
  assets/theme.js      Design tokens — the ONE place to change how charts look
  assets/chart-template.js  Reusable D3 scaffold
  assets/charts/*.js   Per-chart logic
  *.html               One thin page per chart
tests/                 Unit tests for the aggregation logic
docs-internal/         Runbook, data dictionary, methodology
reports/               Generated QA report (git-ignored)
```

## Quickstart

```bash
# 1. Install Python deps (once)
python -m pip install -r requirements.txt

# 2. Put the current quarter's workbook in raw/ (see the runbook), then:
python src/stage1_aggregate.py          # validate + regenerate docs/data/*.json

# 3. Preview the charts locally (D3 needs a server, not file://)
python -m http.server 8137 --directory docs
#    open http://localhost:8137/

# 4. Run tests
python -m pytest tests/ -q
```

## Updating the data

Full step-by-step in [`docs-internal/quarterly-update-runbook.md`](docs-internal/quarterly-update-runbook.md).
Short version: refresh `raw/`, bump `data_vintage` in `config.yaml`, run Stage 1,
review the QA report + the `git diff` of `docs/data/`, commit, tag `vYYYY-QX`, push.

## Adding a new chart

1. Add an aggregation in `src/aggregations.py` and wire it into `stage1_aggregate.py`.
2. Add `docs/<name>.html` (copy an existing one) and `docs/assets/charts/<name>.js`.
3. Use `QT.*` helpers from `theme.js` / `chart-template.js` — never hardcode colours.
