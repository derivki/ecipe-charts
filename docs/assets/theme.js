/* ============================================================================
   ECIPE Quantum Tracker — shared design tokens & helpers  (the "theme file")
   ----------------------------------------------------------------------------
   THIS is the single place to change how every chart looks. Edit the tokens
   below (colours, fonts, palettes) and all charts update. No chart file should
   hardcode a colour or font — they read from QT.* here.

   When the designer delivers her Figma spec, translate it into `tokens` and
   `palette` below and nothing else needs to change.
   Loaded as a plain script (no build step); everything hangs off `window.QT`.
   ========================================================================== */
window.QT = (function () {
  // ── Design tokens ─────────────────────────────────────────────────────────
  const tokens = {
    ink:   "#1a2027",   // primary text / dark UI
    muted: "#5d6875",   // secondary text / axes
    line:  "#dfe3e8",   // gridlines / borders
    bg:    "#ffffff",
    panel: "#f7f8fa",   // control backgrounds
    font:  '"Inter","Helvetica Neue",Arial,sans-serif',
  };

  // ── Categorical palettes ─────────────────────────────────────────────────
  const palette = {
    // financing instrument
    instrument: {
      "VC / private equity": "#1f4e79",
      "Debt":                "#3d8b8b",
      "Grant":               "#d9a520",
      "Public equity":       "#7b5ea7",
    },
    // funding stage (equity ladder)
    stage: {
      "Seed and Angel":                     "#1f4e79",
      "Early-stage equity":                 "#3d8b8b",
      "Late-stage equity & Growth equity":  "#d9a520",
      "Public equity":                      "#7b5ea7",
    },
    // world region
    region: {
      "US":         "#b5482f",
      "China":      "#3d8b8b",
      "EU":         "#d9a520",
      "UK+AUS+CAN": "#1f4e79",
      "RoW":        "#7b5ea7",
    },
    sequential: ["#e8eef4", "#b9cbde", "#7ba0c4", "#3f6fa3", "#1f4e79"],
  };

  // ── Number / currency formatters ──────────────────────────────────────────
  const fmt = {
    // compact axis label, e.g. $1.5bn / $250m
    axisMoney: v => "$" + (v >= 1e9 ? (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "bn"
                          : v >= 1e6 ? (v / 1e6).toFixed(0) + "m"
                          : d3.format(",")(v)),
    // full value for tooltips, e.g. $1.52bn / $250.0m / $12k
    money: v => v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "bn"
              : v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "m"
              : v >= 1e3 ? "$" + (v / 1e3).toFixed(0) + "k"
              : "$" + d3.format(",")(Math.round(v)),
    pct0: v => d3.format(".0%")(v),
    pct1: v => (v * 100).toFixed(1) + "%",
    int:  v => d3.format(",")(v),
  };

  // ── Shared stylesheet (mirrors the tokens) ────────────────────────────────
  function css() {
    return `
:root{--ink:${tokens.ink};--muted:${tokens.muted};--line:${tokens.line};
  --bg:${tokens.bg};--panel:${tokens.panel};--font:${tokens.font};}
*{box-sizing:border-box;}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);}
.wrap{max-width:920px;margin:0 auto;padding:24px 20px 40px;}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;}
h1{font-size:21px;line-height:1.25;margin:6px 0 4px;font-weight:650;letter-spacing:-.01em;}
.sub{font-size:13px;color:var(--muted);margin:0 0 16px;max-width:660px;line-height:1.45;}
.vintage{font-size:11px;color:var(--muted);margin-bottom:14px;}
.vintage b{color:var(--ink);font-weight:600;}
.controls{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;margin-bottom:8px;}
.ctl{display:flex;flex-direction:column;gap:5px;}
.ctl label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:7px;overflow:hidden;background:var(--panel);}
.seg button{appearance:none;border:0;background:transparent;padding:6px 11px;font:inherit;font-size:12px;color:var(--muted);cursor:pointer;transition:.12s;}
.seg button+button{border-left:1px solid var(--line);}
.seg button.on{background:var(--ink);color:#fff;}
.seg button:not(.on):hover{background:#eef0f3;color:var(--ink);}
select{appearance:none;font:inherit;font-size:13px;color:var(--ink);background:var(--panel);
  border:1px solid var(--line);border-radius:7px;padding:7px 28px 7px 10px;cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%235d6875'/></svg>");
  background-repeat:no-repeat;background-position:right 10px center;}
.legend{display:flex;flex-wrap:wrap;gap:14px;margin:10px 0 2px;}
.lg{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);cursor:pointer;user-select:none;}
.lg .sw{width:12px;height:12px;border-radius:3px;flex:none;}
.lg.off{opacity:.35;}
svg{display:block;width:100%;height:auto;overflow:visible;}
.axis path,.axis line{stroke:var(--line);}
.axis text{fill:var(--muted);font-size:11px;}
.gridline{stroke:var(--line);stroke-dasharray:2 3;opacity:.7;}
.partial-band{fill:#f2f4f7;} .partial-label{fill:#9aa4b0;font-size:10px;font-style:italic;}
.bar-val{font-size:10.5px;fill:var(--muted);font-variant-numeric:tabular-nums;}
.tt{position:fixed;pointer-events:none;background:#111820;color:#fff;border-radius:8px;padding:10px 12px;
  font-size:12px;line-height:1.5;box-shadow:0 6px 24px rgba(0,0,0,.22);opacity:0;transition:opacity .1s;z-index:20;min-width:180px;}
.tt .hd{font-weight:700;font-size:13px;margin-bottom:6px;}
.tt .row{display:flex;justify-content:space-between;gap:16px;}
.tt .row .k{display:inline-flex;align-items:center;gap:6px;color:#c9d2dc;}
.tt .row .k i{width:9px;height:9px;border-radius:2px;display:inline-block;}
.tt .row .v{font-variant-numeric:tabular-nums;font-weight:600;}
.tt .tot{border-top:1px solid rgba(255,255,255,.18);margin-top:6px;padding-top:6px;}
.note{font-size:11.5px;color:var(--muted);margin-top:16px;line-height:1.5;border-top:1px solid var(--line);padding-top:12px;}
.note b{color:var(--ink);font-weight:600;}
`;
  }

  function injectCSS() {
    const s = document.createElement("style");
    s.textContent = css();
    document.head.appendChild(s);
  }

  return { tokens, palette, fmt, injectCSS };
})();
