# Data Dictionary (Codebook)

Documents every column of the source workbook `Quantum startups tracker.xlsx` and
the controlled vocabularies. Update this whenever a column or category is added.

Convention: a lone **em-dash `—`** in any cell means "empty / not applicable" and is
normalised to null by Stage 1.

---

## Sheet: `Quantum startups` (one row per company)

| Column | Meaning / notes |
|--------|-----------------|
| Company name | Primary key. Must be unique; funding rounds join to this. |
| Former company name | Previous name after a rename. |
| Website | Company URL. |
| Pitchbook profile | Source profile URL. |
| Founded year | Year founded. |
| City | HQ city. |
| Cluster | Named metro/innovation cluster (e.g. "Toronto–Waterloo Corridor"); `—` if none. |
| Country | HQ country. Drives country aggregation. |
| Region | Aggregation bloc — **controlled vocab** (see below). Drives region charts. |
| Total funding (US$) | Company-level total (per source); charts recompute from rounds. |
| Primary pillar | Taxonomy — **currently empty** (AP-10). |
| Additional pillars | Taxonomy — currently empty. |
| Stack layer | Taxonomy — currently empty. |
| Primary stream | Taxonomy — currently empty. |
| Additional streams | Taxonomy — currently empty. |
| Origin | Spinout type — controlled-ish vocab (University spinout, Research spinout, Corporate spinout, Joint venture, Merger, Subsidiary, Hybrid spinout); `—` if none. |
| Institution of origin 1–5 | Originating institutions. |
| Ownership status | Private / Public / Corporate. |
| Ticker | Stock ticker if listed. |
| Primary listing date | IPO/listing date. |
| Primary listing venue 1–2 | Exchange(s). |
| Yahoo Finance profile 1–2 | Source URLs. |
| Operating status | Active / Acquired – operating / Acquired – absorbed / Defunct / Merged / Unclear. |
| Merged with / Acquired by | Acquirer, if applicable. |
| Source URL 1–4 | Provenance links. |

## Sheet: `Funding rounds` (one row per financing event)

| Column | Meaning / notes |
|--------|-----------------|
| Company name | Foreign key to `Quantum startups`. **Must exist there** (see AP-2). |
| Round type | Granular round label (Seed, Series A, Grant, Post-IPO equity, …). |
| Aggregated funding stage | Curated bucket — **controlled vocab** (see below). Trusted input; validated not recomputed. |
| Financing instrument | Curated bucket — **controlled vocab** (see below). |
| Round date | Date of the round; drives time-series. |
| Round amount (US$) | Announced amount. Blank = excluded from all sums. |
| Valuation at round (US$) | Post/pre-money valuation if known. |
| Lead investor(s) | Lead(s). |
| Other investors | Co-investors. |
| Public investor / awarding body | For grants / public funding. |
| Source URL 1–3 | Provenance links. |

## Sheet: `Funding correspondence table`

The authoritative mapping **Round type → Aggregated funding stage → Financing
instrument**, plus notes on the amount-based classification rules (used when a round
label doesn't itself identify the stage). This is the reference the validator checks
against; the row-level buckets in `Funding rounds` are produced using it.

---

## Controlled vocabularies (enforced by `validate.py` via `config.yaml`)

- **Region:** `US`, `China`, `EU`, `UK+AUS+CAN`, `RoW`
- **Aggregated funding stage:** `Seed and Angel`, `Early-stage equity`,
  `Late-stage equity`, `Growth equity`, `Public equity`, `Debt`, `Grant`
  - In the *stage charts*, `Late-stage equity` + `Growth equity` are shown combined,
    and `Debt` + `Grant` are excluded (equity-ladder view only).
- **Financing instrument:** `VC / private equity`, `Debt`, `Public equity`, `Grant`

Any value outside these raises a WARNING in the QA report.
