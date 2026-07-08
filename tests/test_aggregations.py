"""
Unit tests for the Stage 1 aggregation logic.

Two layers:
  1. Pure-function tests on a tiny synthetic fixture (fast, no Excel needed).
  2. A parity check: if the real workbook is present, confirm the code still
     reproduces a couple of known-good figures from the original spreadsheet.
"""
import sys
from datetime import datetime
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import aggregations as agg  # noqa: E402


# ── Synthetic fixture ────────────────────────────────────────────────────────
STARTUPS = [
    {"Company name": "Alpha", "Country": "US", "Region": "US", "Cluster": "Bay Area"},
    {"Company name": "Beta",  "Country": "US", "Region": "US", "Cluster": "Bay Area"},
    {"Company name": "Gamma", "Country": "France", "Region": "EU", "Cluster": None},
]
ROUNDS = [
    {"Company name": "Alpha", "Round amount": 100.0, "Financing instrument": "VC / private equity",
     "Aggregated funding stage": "Seed and Angel", "Round date": datetime(2020, 5, 1)},
    {"Company name": "Alpha", "Round amount": 400.0, "Financing instrument": "Public equity",
     "Aggregated funding stage": "Public equity", "Round date": datetime(2023, 1, 1)},
    {"Company name": "Beta", "Round amount": 50.0, "Financing instrument": "Grant",
     "Aggregated funding stage": "Grant", "Round date": datetime(2021, 6, 1)},
    {"Company name": "Gamma", "Round amount": 200.0, "Financing instrument": "VC / private equity",
     "Aggregated funding stage": "Early-stage equity", "Round date": datetime(2022, 3, 1)},
    # blank amount — must be ignored by every sum
    {"Company name": "Gamma", "Round amount": None, "Financing instrument": "VC / private equity",
     "Aggregated funding stage": "Seed and Angel", "Round date": datetime(2022, 4, 1)},
]
GDP = {"US": 1000.0, "France": 500.0}


@pytest.fixture
def companies():
    return agg.build_company_index(STARTUPS)


def test_country_totals(companies):
    out = {r["country"]: r for r in
           agg.build_funding_by_country(STARTUPS, ROUNDS, companies, GDP)}
    assert out["US"]["total_funding"] == 550.0      # 100 + 400 + 50
    assert out["US"]["companies"] == 2
    assert out["France"]["total_funding"] == 200.0  # blank amount ignored
    # sorted descending by funding
    order = [r["country"] for r in
             agg.build_funding_by_country(STARTUPS, ROUNDS, companies, GDP)]
    assert order == ["US", "France"]


def test_funding_to_gdp(companies):
    out = {r["country"]: r for r in
           agg.build_funding_by_country(STARTUPS, ROUNDS, companies, GDP)}
    assert out["US"]["funding_to_gdp"] == pytest.approx(550.0 / 1000.0)


def test_cluster_excludes_empty(companies):
    out = agg.build_funding_by_cluster(STARTUPS, ROUNDS, companies)
    clusters = {r["cluster"] for r in out}
    assert clusters == {"Bay Area"}          # Gamma's None cluster dropped
    assert out[0]["total_funding"] == 550.0


def test_instrument_by_year(companies):
    out = {r["year"]: r for r in agg.build_funding_by_instrument_year(ROUNDS, 2020)}
    assert out[2020]["VC / private equity"] == 100.0
    assert out[2021]["Grant"] == 50.0
    assert out[2023]["Public equity"] == 400.0


def test_instrument_respects_start_year():
    years = [r["year"] for r in agg.build_funding_by_instrument_year(ROUNDS, 2022)]
    assert min(years) >= 2022


def test_stage_region(companies):
    out = agg.build_funding_by_stage_region(ROUNDS, companies)
    us = next(r for r in out["regions"] if r["region"] == "US")
    seed_i = out["stages"].index("Seed and Angel")
    pub_i = out["stages"].index("Public equity")
    assert us["values"][seed_i] == 100.0
    assert us["values"][pub_i] == 400.0
    eu = next(r for r in out["regions"] if r["region"] == "EU")
    early_i = out["stages"].index("Early-stage equity")
    assert eu["values"][early_i] == 200.0


# ── Parity check against the real workbook (skipped if absent) ────────────────
@pytest.mark.skipif(not (ROOT / "raw" / "Quantum startups tracker.xlsx").exists(),
                    reason="raw workbook not present")
def test_parity_with_spreadsheet():
    import openpyxl
    import yaml
    from stage1_aggregate import read_sheet, load_gdp

    cfg = yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))
    wb = openpyxl.load_workbook(ROOT / cfg["source_xlsx"], read_only=True, data_only=True)
    startups = read_sheet(wb, cfg["sheets"]["startups"], cfg["empty_marker"])
    rounds = read_sheet(wb, cfg["sheets"]["rounds"], cfg["empty_marker"])
    for r in rounds:
        k = next((k for k in r if k and "Round amount" in k), None)
        r["Round amount"] = r.get(k) if k else None
    companies = agg.build_company_index(startups)
    gdp = load_gdp(ROOT / cfg["gdp_reference"])

    country = {r["country"]: r for r in
               agg.build_funding_by_country(startups, rounds, companies, gdp)}
    # known-good values from the original "Tracker charts" sheet
    assert country["US"]["total_funding"] == pytest.approx(22568818783.98, abs=1)
    assert country["US"]["companies"] == 141
    assert country["China"]["total_funding"] == pytest.approx(5242705236.95, abs=1)
