"""
Stage 1 — aggregation logic.

Every published number is computed HERE, in code, from the two raw sheets
(`Quantum startups` + `Funding rounds`). This deliberately replaces the manually
maintained "Tracker charts" sheet so the figures are reproducible and testable and
cannot silently drift from the underlying data.

Row-level classifications that involve manual OECD/amount-based judgement
(`Aggregated funding stage`, `Financing instrument`, `Region`) are TRUSTED as
curated inputs — `validate.py` checks them, this module only sums them.

Each `build_*` function returns a plain list/dict that is serialised straight to
JSON by `stage1_aggregate.py`.
"""
from __future__ import annotations

from collections import defaultdict

# Late-stage and Growth equity are shown together in the stage charts.
LATE_GROWTH = {"Late-stage equity", "Growth equity"}
STAGE_ORDER = ["Seed and Angel", "Early-stage equity",
               "Late-stage equity & Growth equity", "Public equity"]
INSTRUMENT_ORDER = ["VC / private equity", "Debt", "Grant", "Public equity"]


def build_company_index(startups: list[dict]) -> dict[str, dict]:
    """Map company name -> its attributes (country, region, cluster)."""
    idx = {}
    for c in startups:
        name = c["Company name"]
        if name:
            idx[name.strip()] = c
    return idx


def build_funding_by_country(startups: list[dict], rounds: list[dict],
                             companies: dict[str, dict],
                             gdp: dict[str, float]) -> list[dict]:
    """Companies + total funding + funding/GDP ratio, one row per country."""
    company_count: dict[str, int] = defaultdict(int)
    for c in startups:
        country = c.get("Country")
        if country:
            company_count[country] += 1

    funding: dict[str, float] = defaultdict(float)
    for r in rounds:
        amt = r.get("Round amount")
        comp = companies.get((r.get("Company name") or "").strip())
        if comp and isinstance(amt, (int, float)):
            country = comp.get("Country")
            if country:
                funding[country] += amt

    out = []
    for country in company_count:
        total = funding.get(country, 0.0)
        g = gdp.get(country)
        out.append({
            "country": country,
            "companies": company_count[country],
            "total_funding": round(total, 2),
            "gdp": g,
            "funding_to_gdp": (total / g) if g else None,
        })
    out.sort(key=lambda d: d["total_funding"], reverse=True)
    return out


def build_funding_by_cluster(startups: list[dict], rounds: list[dict],
                             companies: dict[str, dict]) -> list[dict]:
    """Companies + total funding, one row per named cluster."""
    company_count: dict[str, int] = defaultdict(int)
    for c in startups:
        cl = c.get("Cluster")
        if cl:  # None/empty already normalised away
            company_count[cl] += 1

    funding: dict[str, float] = defaultdict(float)
    for r in rounds:
        amt = r.get("Round amount")
        comp = companies.get((r.get("Company name") or "").strip())
        if comp and isinstance(amt, (int, float)):
            cl = comp.get("Cluster")
            if cl:
                funding[cl] += amt

    out = [{"cluster": cl,
            "companies": company_count[cl],
            "total_funding": round(funding.get(cl, 0.0), 2)}
           for cl in company_count]
    out.sort(key=lambda d: d["total_funding"], reverse=True)
    return out


def build_funding_by_instrument_year(rounds: list[dict], start_year: int) -> list[dict]:
    """Funding by financing instrument, per year (stacked time series)."""
    per_year: dict[int, dict[str, float]] = defaultdict(
        lambda: {k: 0.0 for k in INSTRUMENT_ORDER})
    for r in rounds:
        amt = r.get("Round amount")
        instr = r.get("Financing instrument")
        d = r.get("Round date")
        if not (isinstance(amt, (int, float)) and instr in INSTRUMENT_ORDER and d):
            continue
        per_year[d.year][instr] += amt

    out = []
    for year in sorted(y for y in per_year if y >= start_year):
        row = {"year": year}
        row.update({k: round(per_year[year][k], 2) for k in INSTRUMENT_ORDER})
        out.append(row)
    return out


def _agg_stage(stage: str) -> str | None:
    """Collapse the raw stage into the 4 chart buckets (Debt/Grant dropped)."""
    if stage in LATE_GROWTH:
        return "Late-stage equity & Growth equity"
    if stage in ("Seed and Angel", "Early-stage equity", "Public equity"):
        return stage
    return None  # Debt, Grant -> not part of the equity-stage view


def build_funding_by_stage_region(rounds: list[dict],
                                  companies: dict[str, dict]) -> dict:
    """Total funding by equity stage x region (grouped/funnel view)."""
    regions = ["US", "China", "EU", "UK+AUS+CAN", "RoW"]
    grid: dict[str, dict[str, float]] = {
        r: {s: 0.0 for s in STAGE_ORDER} for r in regions}
    for r in rounds:
        amt = r.get("Round amount")
        comp = companies.get((r.get("Company name") or "").strip())
        if not (comp and isinstance(amt, (int, float))):
            continue
        region = comp.get("Region")
        bucket = _agg_stage(r.get("Aggregated funding stage"))
        if region in grid and bucket:
            grid[region][bucket] += amt

    return {
        "stages": STAGE_ORDER,
        "regions": [
            {"region": r, "values": [round(grid[r][s], 2) for s in STAGE_ORDER]}
            for r in regions
        ],
    }
