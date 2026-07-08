"""
One-command publish helper.

    python publish.py               # rebuild, review, confirm, commit + push
    python publish.py -m "message"  # custom commit message
    python publish.py --no-tag      # skip the vYYYY-QX release tag
    python publish.py --yes         # skip the confirmation prompt (use with care)

What it does, in order:
  1. Runs Stage 1 (validate + regenerate docs/data/*.json). Stops on ERROR findings.
  2. Stages changes and shows you exactly what changed (the review gate).
  3. Asks for confirmation.
  4. Commits, tags the quarter (vYYYY-QX), and pushes to GitHub.

The push publishes to the public site, so the confirmation step is deliberate —
review the diff before saying yes.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent


def run(cmd: list[str], check: bool = True, capture: bool = False) -> str:
    """Run a command, streaming output unless capture=True."""
    res = subprocess.run(cmd, cwd=ROOT, text=True,
                         capture_output=capture)
    if check and res.returncode != 0:
        if capture:
            sys.stderr.write(res.stdout + res.stderr)
        sys.exit(f"\nCommand failed: {' '.join(cmd)}")
    return (res.stdout or "") if capture else ""


def git(*args: str, check: bool = True, capture: bool = False) -> str:
    return run(["git", *args], check=check, capture=capture)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("-m", "--message", help="commit message")
    ap.add_argument("--no-tag", action="store_true", help="do not create a release tag")
    ap.add_argument("--yes", action="store_true", help="skip confirmation prompt")
    args = ap.parse_args()

    vintage = yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))["data_vintage"]

    # 1. Rebuild ---------------------------------------------------------------
    print("=" * 64, "\n1/4  Running Stage 1 (validate + aggregate)\n", "=" * 64)
    if subprocess.run([sys.executable, "src/stage1_aggregate.py"], cwd=ROOT).returncode != 0:
        sys.exit("\nStage 1 reported ERROR findings — nothing published. "
                 "Fix the data and re-run. See reports/data_quality_report.html")

    # 2. Stage + show the diff -------------------------------------------------
    print("\n", "=" * 64, "\n2/4  Changes to publish\n", "=" * 64, sep="")
    git("add", "-A")

    # guardrail mirror of CI: never allow a spreadsheet through
    tracked = git("ls-files", capture=True)
    if any(line.lower().endswith((".xlsx", ".xls", ".xlsm")) for line in tracked.splitlines()):
        sys.exit("ABORT: a spreadsheet is tracked. Raw data must stay private (.gitignore).")

    status = git("status", "--short", capture=True).strip()
    if not status:
        print("\nNothing changed since the last publish. Done.")
        return 0
    print(status)
    print("\nData files changed:")
    print(git("diff", "--cached", "--stat", "--", "docs/data", capture=True) or "  (none)")

    # 3. Confirm ---------------------------------------------------------------
    if not args.yes:
        print("=" * 64)
        reply = input(f"Publish data vintage {vintage} to GitHub? [y/N] ").strip().lower()
        if reply != "y":
            print("Aborted. Your changes are staged but nothing was committed or pushed.")
            return 1

    # 4. Commit, tag, push -----------------------------------------------------
    print("\n", "=" * 64, "\n3/4  Commit + tag\n", "=" * 64, sep="")
    git("commit", "-m", args.message or f"Data update {vintage}")

    if not args.no_tag:
        tag = f"v{vintage}"
        existing = git("tag", "--list", tag, capture=True).strip()
        if existing:
            print(f"Tag {tag} already exists — skipping tag (data corrected within the quarter).")
        else:
            git("tag", tag)
            print(f"Created tag {tag}")

    print("\n", "=" * 64, "\n4/4  Push to GitHub\n", "=" * 64, sep="")
    # set upstream on first push
    has_upstream = subprocess.run(["git", "rev-parse", "--abbrev-ref", "@{u}"],
                                  cwd=ROOT, capture_output=True).returncode == 0
    if has_upstream:
        git("push")
    else:
        git("push", "-u", "origin", "main")
    git("push", "--tags")

    print("\n✓ Published. GitHub Pages will redeploy in ~1 minute.")
    print("  Verify the live charts, then check the ECIPE page iframes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
