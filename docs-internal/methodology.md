# Methodology

Public-facing notes on how the tracker's figures are produced. This doubles as the
text (or the basis for it) shown alongside the charts on the ECIPE website. **Items
marked TODO must be resolved with the team before publication.**

## Scope
- The tracker covers quantum-technology companies in ECIPE's database
  (578 companies, 2,473 funding rounds as of 2026-Q3).
- **TODO (AP-3): inclusion criteria.** State precisely what qualifies a company as a
  "quantum startup", any founding-year cut-off, and how defunct/acquired companies are
  treated in the figures.

## Funding figures
- Amounts are **announced/committed** round amounts in **US dollars**.
- Rounds with **no disclosed amount are excluded** from all sums (248 of 2,473 in the
  initial load).
- Company totals and all chart aggregates are **computed from the round-level data**,
  not from any pre-aggregated spreadsheet cells.
- **TODO (AP-1): currency conversion.** State how non-USD rounds are converted to US$
  — a fixed reference rate, or the exchange rate at the round date — and the source.
  This materially affects cross-country and time-series comparisons.

## Classification
- Each round's **Aggregated funding stage** and **Financing instrument** are assigned
  using the `Funding correspondence table` (round-type mapping plus OECD-style
  amount-based rules for ambiguous labels such as Convertible, Equity, VC, Private
  placement, Joint venture). These are curated in the workbook and validated by the
  pipeline.
- **Public equity** covers IPO-related and listed-company financing (IPO, SPAC merger,
  PIPE, post-IPO equity/convertible/private placement). Private-company equity and
  equity-linked rounds (incl. convertible notes) are **VC / private equity**.
- In stage charts, **Late-stage equity and Growth equity are combined**; debt and
  grants are excluded from the equity-ladder view.

## Geography
- **Region** blocs: `US`, `China`, `EU`, `UK+AUS+CAN`, `RoW`. A company is assigned by
  headquarters country.
- **TODO (AP-4): entity resolution.** Document how company renames and mergers/
  acquisitions are handled so time series stay consistent.

## External reference data
- **GDP** (for the funding-to-GDP metric) is an **external input**, stored in
  `data/reference/gdp_by_country.csv`. State the source and vintage here, and update it
  separately from the tracker. The funding/GDP ratio uses **total announced funding over
  the tracked period** over GDP (not annual flows) — label accordingly on charts.

## Time
- The **most recent calendar year is partial** (year-to-date) and is shaded / labelled
  "YTD" on time-series charts; it is not comparable with full years.

## Reproducibility & provenance
- Every published figure is derived by versioned code (`src/`) from a specific workbook,
  whose SHA-256 checksum and row counts are recorded in `docs/data/manifest.json`.
- Each quarterly publication is tagged in Git (`vYYYY-QX`); the tag + `CHANGELOG.md` +
  manifest identify exactly which data produced which charts.
- **TODO (AP-8): citation & licence.** Add a recommended citation and a licence.
