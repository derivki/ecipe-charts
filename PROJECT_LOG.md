# Quantum Tracker — Project Log

> Living journal of major decisions, discussions, open questions, and action points.
> Keep it in reverse-chronological order (newest entries at the top of each section).
> This is the first file a new collaborator should read.

**Project:** ECIPE Quantum Technologies Tracker — publish quarterly indicators and
interactive charts from the quantum-startups database onto the ECIPE website.
**Owner:** Elena Sisto (elena.sisto@ecipe.org)
**Started:** 2026-07-08

---

## How this project works (one-paragraph summary)

The private Excel database lives on **Google Drive**. Each quarter, a **Python
pipeline (Stage 1)** reads it locally, validates it, and writes **publishable
aggregated JSON** into `docs/data/`. Hand-authored **D3 charts (Stage 2)** in
`docs/` read that JSON and render interactive SVG. The `docs/` folder is published
via **GitHub Pages** (public repo) and embedded on the ECIPE WordPress site as
iframes. The raw xlsx is **never** committed (git-ignored). See `README.md` and
`docs-internal/quarterly-update-runbook.md`.

---

## Decisions log

### 2026-07-08 — Foundational architecture decisions
| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Maintainer: Elena, solo, comfortable running Python with guidance | Shapes the stack toward a clean scriptable repo with strong docs |
| 2 | Charts: **hand-authored D3.js** (AI-assisted), on a shared theme + template | Full design control; DRY-ness preserved via `theme.js` + `chart-template.js` |
| 3 | Data source of truth: **Google Drive** (work), raw xlsx stays private | Team can edit; format is unaffected by Drive storage |
| 4 | Repo: **single public repo, curated** — only aggregates + HTML committed | Free GitHub Pages; raw data protected via `.gitignore` |
| 5 | Ownership: **personal account for now**, migrate to ECIPE org later | Move fast now; migration is an action item (AP-9) |
| 6 | Build: **local run + GitHub Actions safety-net** | Elena runs Stage 1 locally; CI verifies Stage 2 artifacts + no data leak |
| 7 | Aggregation moves **out of Excel into Python** | Reproducible, testable, no silent drift from source |
| 8 | Row-level classifications (stage/instrument/region) **trusted & validated**, not recomputed | They encode manual OECD/amount-based judgement per the correspondence table |

### Data facts established 2026-07-08
- Pipeline **reproduces the original "Tracker charts" sheet numbers exactly**
  (US total funding = $22,568,818,784; region and stage totals verified).
- The `�` seen in some tools was a **display artifact, not corruption**. The real
  characters are `–` (en-dash, inside names) and `—` (em-dash, used **alone as an
  empty/NA marker** — Stage 1 normalises these to null).
- Columns **Primary pillar, Stack layer, Primary stream are empty** for all 578
  companies — no pillar/stack/stream charts are possible until these are filled.
- **GDP** figures are an **external input**, not in the raw sheets. Extracted to
  `data/reference/gdp_by_country.csv`; must be updated separately and sourced.

---

## Open questions / action points

Priority: 🔴 high · 🟠 medium · 🟢 low. Owner in brackets.

| ID | Pri | Item | Owner |
|----|-----|------|-------|
| AP-1 | 🔴 | **FX / currency conversion:** state how non-USD rounds are converted (fixed vs at round date) in `methodology.md` | Elena + team |
| AP-2 | 🔴 | **Fix 4 orphan companies** in Funding rounds not in Quantum startups: ColibriTD, Enquantum, Prenishq, Qcentroid (their rounds are silently excluded from totals) | Elena |
| AP-3 | 🟠 | **Inclusion criteria:** define what counts as a "quantum startup" (cut-offs, defunct handling) | Elena + team |
| AP-4 | 🟠 | **Entity resolution over time:** how renames / M&A are handled in time series | Elena + team |
| AP-5 | ✅ | **GitHub repo:** exists — `derivki/ecipe-charts`, Pages live at https://derivki.github.io/ecipe-charts/ (confirm public vs private in settings). Migration to an ECIPE org still open as AP-9. | Elena |
| AP-6 | 🟠 | **Designer handoff:** get exact hex codes, fonts (+ licence/web-font status), spacing from the Figma designer → translate into `theme.js` | Elena + designer |
| AP-7 | ✅ | **WordPress content width measured** (2026-07-08, ecipe.org publication layout): Bootstrap two-column grid, article `col-sm-8` ≈ 827px, **~797px usable**, stacks full-width < 768px. Charts are responsive; embed heights + auto-resize snippet in the runbook. Give 797px to the designer. | Elena |
| AP-8 | 🟢 | **Citation & licence:** add `LICENSE` (e.g. CC-BY data / MIT code) + a citation line | Elena |
| AP-9 | 🟢 | **Ownership migration:** plan personal → ECIPE org move without breaking iframe URLs | Elena |
| AP-10 | 🟢 | **Populate taxonomy columns** (pillar / stack / stream) to unlock those charts | Team |
| AP-11 | 🟢 | **Indicator & chart selection:** finalise which indicators/charts to publish | Team |
| AP-12 | 🔴 | **Switch GitHub Pages to serve `/docs`** (Settings → Pages → main /docs). Until done, the site shows the old root prototypes, not the new charts. | Elena |
| AP-13 | 🟠 | **Git repo lives inside OneDrive** — risk of `.git` corruption from OneDrive syncing while git writes, especially across two machines. Recommended: rely on GitHub (not OneDrive) to sync the repo — move the folder outside OneDrive, or pause OneDrive during git ops. | Elena |
| AP-14 | 🟢 | **Commit identity** set to Elena Sisto / elena.sisto@ecipe.org (repo-local). If the `derivki` GitHub account uses a different email, update it so commits link to the profile: `git config user.email <that-email>`. | Elena |

---

## Risks & trade-offs (consciously accepted)

- **D3 continuity risk.** Hand-authored D3 gives full control but is harder to
  inherit than a config value. Mitigations: shared `theme.js` + `chart-template.js`,
  the quarterly runbook, and commented code. Revisit if the team grows without JS skills.
- **Publishing is not fully automatic — by design.** Stage 1 must run locally (the raw
  data is private and never in the cloud), and the push has a human review gate
  (`publish.py` confirms before pushing). "Edit Excel → site updates itself" is not
  possible without putting raw data in the cloud, which we chose not to do.
- **Repo inside OneDrive** (AP-13) — see action point; use GitHub, not OneDrive, to sync it.

---

## Worklog

### 2026-07-08
- Planned the full workflow (see `.claude/plans/` / this log's decisions).
- Built Stage 1 (`src/`): loader + validation + aggregations; verified parity with
  the spreadsheet; 7 unit tests pass.
- Built Stage 2 (`docs/`): vendored D3 v7.9.0, `theme.js`, `chart-template.js`, and
  three example charts (country / instrument-over-time / stage-by-region) refactored
  from Elena's existing prototypes onto the shared theme. All render from pipeline JSON.
- Added CI (`.github/workflows/ci.yml`): tests + JS syntax check + JSON validation +
  no-xlsx-leak guardrail.
- Wrote docs: README, runbook, data dictionary, methodology (stub), CHANGELOG, this log.
- Measured ECIPE page layout: content column ~797px (AP-7 resolved).
- Connected local repo to `derivki/ecipe-charts` (confirmed **public**), preserved remote
  history, archived the 6 uploaded prototypes to `legacy/`. Added `.gitattributes`
  (LF normalisation) and `publish.py` (one-command review-and-publish). Made the initial
  commit **locally — not yet pushed**. Remaining to go live: first push + switch Pages to
  `/docs` (AP-12).
