# Quarterly Update Runbook

The single procedure to follow each quarter to refresh the published tracker.
Anyone with the repo and Python installed should be able to follow this. If any
step is unclear, improve this document — it is the continuity backbone.

**Estimated time:** ~30 minutes once familiar.

---

## 0. Prerequisites (first time only)
- Python 3.12+ and `python -m pip install -r requirements.txt`.
- Clone/pull the repo. Confirm `raw/` is git-ignored (`git status` should never list an xlsx).
- Access to the private database on Google Drive.

## 1. Snapshot the source data
1. Open the master workbook on Google Drive; make sure the quarter's edits are final.
2. **Save a dated archive copy** on Google Drive: `archive/YYYY-QX_quantum_tracker.xlsx`.
   (This is the private audit trail — do it every quarter.)
3. Download / copy the current workbook to `raw/Quantum startups tracker.xlsx` in the repo.

## 2. Set the data vintage
- Edit `config.yaml`: set `data_vintage` to the new quarter (e.g. `2026-Q4`) and, if the
  calendar year rolled over, update `partial_year`.

## 3. Run Stage 1 (validate + aggregate)
```bash
python src/stage1_aggregate.py
```
- Read the console findings. **ERROR-level findings stop the build** — fix the data
  and re-run. (To inspect outputs despite errors, re-run with `--allow-errors`.)
- Open `reports/data_quality_report.html` and review WARNINGs (e.g. orphan rounds,
  values outside the controlled vocabulary, missing dates).

## 4. Review what changed
```bash
git diff --stat docs/data/           # which datasets changed
git diff docs/data/funding_by_country.json   # inspect specific numbers
```
- Sanity-check big moves. If a headline number jumped, confirm it's real (new mega-round)
  and not a data-entry slip.

## 5. Preview the charts
```bash
python -m http.server 8137 --directory docs
```
- Open `http://localhost:8137/` and click through each chart. Check the tooltips,
  the "Data as of …" label, and the partial-year (YTD) shading on time series.
- (D3 must be served over http — opening the HTML as a `file://` will fail to fetch JSON.)

## 6. Record the change
- Add a dated entry to `CHANGELOG.md`: companies added, corrections, methodology changes.
- Update `PROJECT_LOG.md` if any decisions or action points changed.

## 7. Publish
```bash
git add docs/ config.yaml CHANGELOG.md PROJECT_LOG.md
git commit -m "Data update YYYY-QX"
git tag vYYYY-QX
git push && git push --tags
```
- GitHub Actions (CI) runs automatically: tests + JS syntax + JSON validation +
  the no-xlsx guardrail. Confirm it passes (green check on the commit).
- GitHub Pages redeploys `docs/` within a minute or two.

## 8. Verify live
- Open the GitHub Pages chart URL directly; confirm it renders and shows the new vintage.
- Check the embedded iframes on the ECIPE WordPress page (they point at the Pages URL,
  so they update automatically — but confirm, and hard-refresh to bypass cache).

---

## Embedding a chart in WordPress (reference)

The ECIPE article layout (measured 2026-07-08 on a publication page) is a Bootstrap
two-column grid: the content column is **`col-sm-8` ≈ 827px, ~797px usable** on desktop,
stacking to full width below 768px. Charts are responsive (`viewBox`), so they scale to
whatever width the column gives them — you only need to get the **height** right.

### Option A — fixed height (works everywhere, incl. editors that strip scripts)
Use a Custom HTML block. Recommended heights (measured at 797px wide, small buffer added):

| Chart | iframe height |
|-------|---------------|
| `funding_by_country.html`    | 815 |
| `funding_by_instrument.html` | 715 |
| `funding_by_stage.html`      | 625 |

```html
<iframe src="https://derivki.github.io/ecipe-charts/funding_by_country.html"
  style="width:100%;height:815px;border:0;overflow:hidden;"
  loading="lazy" title="Quantum funding by country"></iframe>
```
Note: on narrow phones a fixed height may leave a little slack or clip a wrapped note —
add ~40px if you see clipping, or use Option B.

### Option B — auto-resizing height (best; needs one script on the page)
The chart pages already broadcast their height (`qt-embed-size`). Add this listener once
per page (Custom HTML block); the iframe then always matches its content at any width:

```html
<iframe id="qt-country" src="https://derivki.github.io/ecipe-charts/funding_by_country.html"
  style="width:100%;height:815px;border:0;overflow:hidden;" loading="lazy"
  title="Quantum funding by country"></iframe>
<script>
window.addEventListener('message', function (e) {
  if (e.origin !== 'https://derivki.github.io') return;      // security: trust only our host
  if (e.data && e.data.type === 'qt-embed-size') {
    var f = document.getElementById('qt-country');
    if (f) f.style.height = e.data.height + 'px';
  }
});
</script>
```
For multiple charts on one page, give each iframe a unique id and match on `e.source`.

## If something breaks
- **A chart is blank:** open the browser console (F12). A red `Failed to load data/…json`
  means Stage 1 didn't write it — re-run step 3. A JS error points to the chart file.
- **Numbers look wrong:** re-run step 3 and check the QA report; compare `git diff`.
- **CI is red:** click the failed check on GitHub. The guardrail failing means an xlsx
  got staged — remove it (`git rm --cached`) and confirm `.gitignore`.
