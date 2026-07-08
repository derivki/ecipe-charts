"""
Stage 1 — data-quality validation.

Runs a battery of checks over the raw sheets and returns a list of Findings.
Severity levels:
  ERROR    — publishing should stop until fixed (e.g. broken referential integrity)
  WARNING  — review before publishing, but not necessarily blocking
  INFO     — informational (counts, normalisations applied)

The findings feed both the console summary and reports/data_quality_report.html.
Nothing here mutates data; normalisation of the em-dash marker happens in the loader.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Finding:
    severity: str   # ERROR | WARNING | INFO
    check: str
    message: str


def _num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def validate(startups: list[dict], rounds: list[dict], vocab: dict,
             this_year: int) -> list[Finding]:
    f: list[Finding] = []

    # ── Counts (INFO) ───────────────────────────────────────────────────────
    f.append(Finding("INFO", "counts",
                     f"{len(startups)} companies, {len(rounds)} funding rounds."))

    # ── Company name uniqueness ─────────────────────────────────────────────
    names = [c["Company name"].strip() for c in startups if c.get("Company name")]
    dupes = [n for n, k in Counter(names).items() if k > 1]
    if dupes:
        f.append(Finding("ERROR", "duplicate-company",
                         f"{len(dupes)} duplicate company name(s): {dupes[:10]}"))

    # ── Referential integrity: every round's company must exist ─────────────
    known = set(names)
    orphan = sorted({(r.get("Company name") or "").strip()
                     for r in rounds
                     if (r.get("Company name") or "").strip() and
                     (r.get("Company name") or "").strip() not in known})
    if orphan:
        # WARNING not ERROR: these rounds are simply excluded from company-keyed
        # sums (as they already are in the current workbook), so published figures
        # stay valid — but the mismatch should be fixed at source.
        f.append(Finding("WARNING", "orphan-rounds",
                         f"{len(orphan)} company name(s) in Funding rounds not found "
                         f"in Quantum startups (their rounds are excluded from "
                         f"country/region/cluster totals): {orphan[:10]}"))

    # ── Round amounts: numeric & non-negative ───────────────────────────────
    neg = sum(1 for r in rounds if _num(r.get("Round amount")) and r["Round amount"] < 0)
    if neg:
        f.append(Finding("ERROR", "negative-amount",
                         f"{neg} round(s) with a negative amount."))
    blank = sum(1 for r in rounds if not _num(r.get("Round amount")))
    if blank:
        f.append(Finding("INFO", "blank-amount",
                         f"{blank} round(s) have no numeric amount (excluded from sums)."))

    # ── Round dates: present & plausible ────────────────────────────────────
    nodate = sum(1 for r in rounds if not isinstance(r.get("Round date"), datetime))
    if nodate:
        f.append(Finding("WARNING", "missing-date",
                         f"{nodate} round(s) have no valid date (excluded from time series)."))
    future = sum(1 for r in rounds
                 if isinstance(r.get("Round date"), datetime) and r["Round date"].year > this_year)
    if future:
        f.append(Finding("WARNING", "future-date",
                         f"{future} round(s) dated in a future year."))

    # ── Controlled vocabularies ─────────────────────────────────────────────
    _check_vocab(f, startups, "Region", vocab["region"], "startups")
    _check_vocab(f, rounds, "Aggregated funding stage",
                 vocab["aggregated_funding_stage"], "rounds")
    _check_vocab(f, rounds, "Financing instrument",
                 vocab["financing_instrument"], "rounds")

    return f


def _check_vocab(f: list[Finding], recs: list[dict], field: str,
                 allowed: list[str], where: str) -> None:
    seen = Counter(r.get(field) for r in recs if r.get(field) is not None)
    bad = {v: n for v, n in seen.items() if v not in allowed}
    if bad:
        f.append(Finding("WARNING", "vocab",
                         f"[{where}.{field}] {len(bad)} value(s) outside the "
                         f"controlled vocabulary: {dict(list(bad.items())[:8])}"))


def has_errors(findings: list[Finding]) -> bool:
    return any(x.severity == "ERROR" for x in findings)
