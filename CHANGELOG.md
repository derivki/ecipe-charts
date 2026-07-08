# Changelog

Human-readable record of what changed each quarter (data and pipeline). Newest first.
Tag each published quarter in Git as `vYYYY-QX` so the tag + this entry + the manifest
form a complete snapshot.

## [Unreleased]

### Pipeline
- Initial pipeline: Stage 1 (Python aggregation + validation) and Stage 2 (D3 charts).
- Three example charts: funding by country, funding by instrument over time,
  funding by stage & region.

### Data — 2026-Q3 (initial)
- First load: 578 companies, 2,473 funding rounds.
- Known issues carried forward (see PROJECT_LOG AP-2): 4 funding-round companies not
  present in the company sheet (ColibriTD, Enquantum, Prenishq, Qcentroid); their
  rounds are excluded from country/region/cluster totals.
- Taxonomy columns (pillar / stack / stream) not yet populated.

<!--
Template for each quarterly release:

## [vYYYY-QX] — YYYY-MM-DD
### Data
- Companies added: ...
- Corrections / restatements: ...
- Methodology changes: ...
### Pipeline
- ...
-->
