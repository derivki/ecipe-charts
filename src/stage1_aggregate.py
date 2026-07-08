"""
Stage 1 entry point:  raw xlsx  ->  validate  ->  publishable JSON + manifest + QA report

Run from the repo root:

    python src/stage1_aggregate.py

Reads the private workbook (config: source_xlsx), validates it, recomputes every
published figure from the raw sheets, and writes:
  - docs/data/*.json            (the datasets each D3 chart reads)
  - docs/data/manifest.json     (checksum, row counts, data vintage, build info)
  - reports/data_quality_report.html

Publishing STOPS (exit code 1) if any ERROR-level data-quality finding is present,
unless you pass --allow-errors (for inspection only).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import openpyxl
import yaml

import aggregations as agg
import validate as val

ROOT = Path(__file__).resolve().parent.parent


def load_config() -> dict:
    with open(ROOT / "config.yaml", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _clean(value, empty_marker: str):
    """Normalise a cell: strip strings; treat the lone em-dash as empty (None)."""
    if isinstance(value, str):
        s = value.strip()
        if s == "" or s == empty_marker:
            return None
        return s
    return value


def read_sheet(wb, sheet_name: str, empty_marker: str,
               rename: dict | None = None) -> list[dict]:
    """Read a worksheet into a list of dicts keyed by header, cells normalised."""
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    headers = [h for h in rows[0]]
    recs = []
    for raw in rows[1:]:
        rec = {}
        for h, v in zip(headers, raw):
            if h is None:
                continue
            key = (rename or {}).get(h, h)
            rec[key] = _clean(v, empty_marker)
        # skip fully blank rows (no company name)
        if rec.get("Company name"):
            recs.append(rec)
    return recs


def load_gdp(path: Path) -> dict[str, float]:
    import csv
    gdp = {}
    if path.exists():
        with open(path, encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                try:
                    gdp[row["country"]] = float(row["gdp_usd"])
                except (ValueError, KeyError):
                    pass
    return gdp


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2)


def render_report(findings: list[val.Finding], cfg: dict, built: dict) -> str:
    order = {"ERROR": 0, "WARNING": 1, "INFO": 2}
    findings = sorted(findings, key=lambda f: order[f.severity])
    color = {"ERROR": "#b5482f", "WARNING": "#d9a520", "INFO": "#3d8b8b"}
    rows = "\n".join(
        f'<tr><td><span style="color:{color[f.severity]};font-weight:600">'
        f'{f.severity}</span></td><td>{f.check}</td><td>{f.message}</td></tr>'
        for f in findings)
    counts = {k: sum(1 for f in findings if f.severity == k)
              for k in ("ERROR", "WARNING", "INFO")}
    datasets = "".join(
        f"<li><code>{name}</code> — {len(data) if isinstance(data, list) else 'ok'} rows</li>"
        for name, data in built.items())
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Quantum Tracker — data quality report</title>
<style>
 body{{font-family:"Inter","Helvetica Neue",Arial,sans-serif;color:#1a2027;
   max-width:900px;margin:0 auto;padding:28px 22px;line-height:1.5}}
 h1{{font-size:22px;margin:0 0 2px}} .sub{{color:#5d6875;margin:0 0 20px;font-size:13px}}
 .pill{{display:inline-block;border-radius:20px;padding:3px 12px;font-size:12px;
   font-weight:600;margin-right:8px}}
 table{{border-collapse:collapse;width:100%;font-size:13px;margin-top:14px}}
 td,th{{text-align:left;padding:7px 10px;border-bottom:1px solid #dfe3e8;vertical-align:top}}
 th{{color:#5d6875;text-transform:uppercase;font-size:10px;letter-spacing:.08em}}
 code{{background:#f7f8fa;padding:1px 5px;border-radius:4px}}
 ul{{font-size:13px;color:#5d6875}}
</style></head><body>
<h1>Data quality report</h1>
<p class="sub">Data vintage <b>{cfg['data_vintage']}</b> · generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
<div>
 <span class="pill" style="background:#f7d9d1;color:#b5482f">{counts['ERROR']} errors</span>
 <span class="pill" style="background:#faedcc;color:#9a6b00">{counts['WARNING']} warnings</span>
 <span class="pill" style="background:#d8ecec;color:#2c6b6b">{counts['INFO']} info</span>
</div>
<table><tr><th>Severity</th><th>Check</th><th>Detail</th></tr>{rows}</table>
<h3 style="margin-top:26px;font-size:14px">Datasets written</h3><ul>{datasets}</ul>
</body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow-errors", action="store_true",
                    help="write outputs even if ERROR-level findings exist")
    args = ap.parse_args()

    cfg = load_config()
    src = ROOT / cfg["source_xlsx"]
    if not src.exists():
        print(f"ERROR: source workbook not found at {src}\n"
              f"Copy the current quarter's xlsx into raw/ (see the runbook).")
        return 2

    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    marker = cfg["empty_marker"]
    startups = read_sheet(wb, cfg["sheets"]["startups"], marker)
    # normalise the amount column name (it contains a newline in the header)
    rounds_raw = read_sheet(wb, cfg["sheets"]["rounds"], marker)
    rounds = []
    for r in rounds_raw:
        amt_key = next((k for k in r if k and "Round amount" in k), None)
        r["Round amount"] = r.get(amt_key) if amt_key else None
        rounds.append(r)

    this_year = datetime.now(timezone.utc).year
    findings = val.validate(startups, rounds, cfg["vocab"], this_year)

    for f in findings:
        print(f"  [{f.severity:7}] {f.check}: {f.message}")

    companies = agg.build_company_index(startups)
    gdp = load_gdp(ROOT / cfg["gdp_reference"])

    built = {
        "funding_by_country": agg.build_funding_by_country(startups, rounds, companies, gdp),
        "funding_by_cluster": agg.build_funding_by_cluster(startups, rounds, companies),
        "funding_by_instrument_year": agg.build_funding_by_instrument_year(rounds, cfg["start_year"]),
        "funding_by_stage_region": agg.build_funding_by_stage_region(rounds, companies),
    }

    report_html = render_report(findings, cfg, built)
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "data_quality_report.html").write_text(report_html, encoding="utf-8")

    if val.has_errors(findings) and not args.allow_errors:
        print("\nERROR-level findings present — outputs NOT written. "
              "Fix the data, or re-run with --allow-errors to inspect.\n"
              "See reports/data_quality_report.html")
        return 1

    out_dir = ROOT / cfg["output_dir"]
    meta = {"data_vintage": cfg["data_vintage"], "start_year": cfg["start_year"],
            "partial_year": cfg["partial_year"]}
    for name, data in built.items():
        payload = data if isinstance(data, dict) else {"rows": data}
        write_json(out_dir / f"{name}.json", {"meta": meta, "data": data})

    manifest = {
        "data_vintage": cfg["data_vintage"],
        "built_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_xlsx": cfg["source_xlsx"],
        "source_sha256": sha256(src),
        "row_counts": {"startups": len(startups), "rounds": len(rounds)},
        "datasets": {k: (len(v) if isinstance(v, list) else "object")
                     for k, v in built.items()},
    }
    write_json(out_dir / "manifest.json", manifest)

    print(f"\nWrote {len(built)} datasets + manifest to {cfg['output_dir']}/")
    print(f"QA report: reports/data_quality_report.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
