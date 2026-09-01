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
    // named accent hues — same five colours already used across the
    // instrument/stage/region palettes below, reused (not reinvented) for
    // tab underlines, panel accents and dashboard KPI tiles.
    accent: "#1f4e79",
    teal:   "#3d8b8b",
    gold:   "#d9a520",
    purple: "#7b5ea7",
    rust:   "#b5482f",
    mock:   "#b5482f",  // colour used for the "illustrative / mock data" badge
    // world/cluster map only — extracted from the legacy port so both maps
    // (world_map.js, clusters.js) share one definition instead of repeating
    // the same literal hex in each file.
    noData:            "#E4E9EE", // country/land fill when there's no tracked data
    noDataBorder:      "#C7D0D8", // legend swatch border for the no-data key
    clusterBubble:       "#F5C544", // world-map cluster bubble fill
    clusterBubbleStroke: "#5a3c00", // world-map cluster bubble stroke
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
    // collaboration archetype (country 2×2: connectedness × commercial intensity) — MOCK
    archetype: {
      "Global Hub":              "#1f4e79",
      "Research Networker":      "#3d8b8b",
      "Domestic Commercialiser": "#d9a520",
      "Emerging Ecosystem":      "#7b5ea7",
    },
    // institution domain (research / government / industry) — MOCK
    domain: { research: "#3d8b8b", government: "#d9a520", industry: "#1f4e79" },
    // cluster ranking dimension (market orientation / collaboration intensity / ecosystem maturity) — MOCK
    dimension: {
      market_orientation:      "#1f4e79",
      collaboration_intensity: "#3d8b8b",
      ecosystem_maturity:      "#d9a520",
    },
    // cluster macro-region (bubble map / region filter) — MOCK grouping of real clusters
    clusterRegion: { "North America": "#1f4e79", "Europe": "#d9a520", "East Asia": "#b5482f", "Other": "#7b5ea7" },
    // company founding origin (Companies tab) — the only populated company-classification field
    origin: {
      "University spinout": "#1f4e79", "Research spinout": "#3d8b8b", "Corporate spinout": "#d9a520",
      "Joint venture": "#7b5ea7", "Merger": "#b5482f", "Subsidiary": "#8a8f66", "Hybrid spinout": "#5d6875",
      "Not specified": "#c7ced6",
    },
    // company ownership status (Companies tab)
    ownership: { "Private": "#1f4e79", "Public": "#d9a520", "Corporate": "#7b5ea7" },
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
    // "2026-Q3" -> "Q3 2026" (quarter first, year after)
    vintage: v => {
      const m = /^(\d{4})-Q(\d)$/.exec(v || "");
      return m ? `Q${m[2]} ${m[1]}` : v;
    },
  };

  // ── Ordering ──────────────────────────────────────────────────────────────
  // Ranked output must be REPRODUCIBLE. A bare `(a,b) => b.v - a.v` leaves tied
  // rows in whatever order the source array happened to have, so a quarterly
  // refresh can silently reshuffle them. Ties therefore break alphabetically on
  // a label — which matters most exactly where the data is thin and ties are the
  // norm (institutions with one spinout, exchanges with one listing, the 36
  // acquirers that have made exactly one acquisition).
  //
  // `value` and `label` each take a key name OR an accessor function, so a new
  // chart adopts the same ordering without this file having to know its fields.
  const accessor = k => (typeof k === "function" ? k : d => d[k]);

  // Locale-aware, case-insensitive, digit-aware ("Q9" before "Q10").
  const alpha = (a, b) =>
    String(a ?? "").localeCompare(String(b ?? ""), undefined, { sensitivity: "base", numeric: true });

  /**
   * Comparator ordering by `value` (descending unless dir === "asc"), with ties
   * broken alphabetically by `label`. Works for numeric and string values alike.
   * Null/undefined values always sort last, in both directions, so "no data"
   * never outranks a real figure.
   */
  const rank = (value, label, dir) => {
    const v = accessor(value), l = accessor(label);
    const sign = dir === "asc" ? 1 : -1;
    return (a, b) => {
      const av = v(a), bv = v(b);
      if (av == null || bv == null) {
        if (av == null && bv == null) return alpha(l(a), l(b));
        return av == null ? 1 : -1;
      }
      if (av !== bv) return av > bv ? sign : -sign;
      return alpha(l(a), l(b));
    };
  };

  // ── Shared stylesheet (mirrors the tokens) ────────────────────────────────
  function css() {
    return `
:root{--ink:${tokens.ink};--muted:${tokens.muted};--line:${tokens.line};
  --bg:${tokens.bg};--panel:${tokens.panel};--font:${tokens.font};}
*{box-sizing:border-box;}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);}
.wrap{max-width:1320px;margin:0 auto;padding:24px 20px 40px;}
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
.lg{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);cursor:default;user-select:none;}
.lg.clickable{cursor:pointer;}
.lg .sw{width:12px;height:12px;border-radius:50%;flex:none;}
.lg.clickable .sw{border-radius:3px;}
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

/* ---------- dashboard nav (Overview / Countries / Clusters) ---------- */
.tabbar{display:flex;flex-wrap:wrap;gap:4px 0;margin:14px 0 6px;border-bottom:1px solid var(--line);}
.tabbar a{font-size:13px;font-weight:600;color:var(--muted);text-decoration:none;
  padding:8px 4px;margin-right:18px;border-bottom:2px solid transparent;}
.tabbar a.on{color:var(--ink);border-bottom-color:${tokens.accent};}
.tabbar a:hover{color:var(--ink);}

/* ---------- "trusted by" logo strip (placeholder pending real logos) ---------- */
.trustedby{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:2px 0 16px;}
.trustedby-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;}
.trustedby-chip{font-size:11.5px;color:var(--muted);background:var(--panel);border-radius:6px;padding:5px 11px;font-style:italic;}

/* ---------- KPI tile strip ---------- */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:18px 0 24px;}
.kpi{border:none;border-radius:12px;padding:14px 16px;background:color-mix(in srgb, ${tokens.accent} 5%, ${tokens.panel});}
.kpi .v{font-size:21px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink);}
.kpi .k{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.3;}

/* ---------- dashboard panel grid ---------- */
.panels{display:grid;gap:18px;margin-top:8px;}
.panels.g2{grid-template-columns:1fr 1fr;}
.panels .span2{grid-column:1/-1;}
.panel{border:none;border-radius:14px;padding:19px 20px 18px;background:var(--panel);}
.panel .ttl{font-size:14px;font-weight:650;letter-spacing:-.005em;margin:0 0 2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.panel .why{font-size:12px;color:var(--muted);line-height:1.45;margin:0 0 10px;}
@media (max-width:760px){ .panels.g2{grid-template-columns:1fr;} }

/* ---------- mock/illustrative data badge ---------- */
.mockbadge{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:${tokens.mock};
  border:1px solid color-mix(in srgb, ${tokens.mock} 45%, transparent);
  background:color-mix(in srgb, ${tokens.mock} 8%, transparent);
  border-radius:20px;padding:2px 8px;white-space:nowrap;}
.mocknote{font-size:11px;color:var(--muted);line-height:1.5;margin:2px 0 10px;padding:7px 10px;
  border-left:2px solid color-mix(in srgb, ${tokens.mock} 55%, transparent);background:var(--panel);border-radius:0 6px 6px 0;}

/* ---------- data load failure (QT.boot) ---------- */
.load-error{font-size:13px;color:var(--ink);line-height:1.55;margin:0 0 18px;padding:14px 16px;
  border:1px solid color-mix(in srgb, ${tokens.rust} 40%, transparent);
  background:color-mix(in srgb, ${tokens.rust} 6%, transparent);border-radius:10px;}
.load-error p{margin:0 0 10px;}
.load-error code{font-size:11.5px;color:var(--muted);background:var(--panel);padding:1px 6px;border-radius:4px;}
.load-error button{appearance:none;border:none;border-radius:7px;padding:7px 14px;font:inherit;font-size:12.5px;
  font-weight:600;color:#fff;background:${tokens.rust};cursor:pointer;}
.load-error button:hover{opacity:.9;}

/* ---------- "published in the paper, not mock" badge ---------- */
.citebadge{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:${tokens.teal};
  border:1px solid color-mix(in srgb, ${tokens.teal} 45%, transparent);
  background:color-mix(in srgb, ${tokens.teal} 8%, transparent);
  border-radius:20px;padding:2px 8px;white-space:nowrap;}
.citenote{font-size:11px;color:var(--muted);line-height:1.5;margin:2px 0 10px;padding:7px 10px;
  border-left:2px solid color-mix(in srgb, ${tokens.teal} 55%, transparent);background:var(--panel);border-radius:0 6px 6px 0;}

/* ---------- sortable ranking table ---------- */
.rtable{width:100%;border-collapse:collapse;font-size:12.5px;}
.rtable th,.rtable td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);}
.rtable th{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);
  cursor:pointer;user-select:none;white-space:nowrap;}
.rtable th.sorted{color:var(--ink);}
.rtable th .arrow{opacity:.55;}
.rtable td.num,.rtable th.num{text-align:right;font-variant-numeric:tabular-nums;}
.rtable tbody tr:hover{background:var(--panel);}
.rtable tbody tr.sel{background:color-mix(in srgb, ${tokens.accent} 10%, transparent);}
.rtable .flag{margin-right:5px;vertical-align:-1px;border-radius:1px;box-shadow:0 0 0 0.5px color-mix(in srgb, ${tokens.ink} 15%, transparent);}
/* ---------- year-range time slider ---------- */
/* track, range, handles and labels all use left:<pct>% of the same content box,
   so the 9px side margins keep the end handles from clipping the panel edge. */
.tslider{position:relative;height:38px;min-width:200px;margin:2px 9px 0;}
.ts-track{position:absolute;top:9px;left:0;right:0;height:5px;border-radius:3px;background:var(--line);}
.ts-range{position:absolute;top:9px;height:5px;border-radius:3px;background:var(--ink);pointer-events:none;}
.ts-handle{position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;
  border:2px solid var(--ink);cursor:grab;box-shadow:0 1px 3px rgba(20,40,70,.2);touch-action:none;z-index:2;transform:translateX(-50%);}
.ts-handle:active{cursor:grabbing;}
.ts-lab{position:absolute;top:23px;font-size:10.5px;color:var(--muted);font-variant-numeric:tabular-nums;transform:translateX(-50%);white-space:nowrap;}
/* time slider placed directly under a chart (rather than in the controls row) */
.tslider-ctl{margin-top:12px;}

/* ---------- policy & programmes cards (countries tab) ---------- */
.policy-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:4px;}
.policy-card{border:none;border-radius:9px;padding:11px 12px 12px;background:var(--bg);
  display:flex;flex-direction:column;gap:5px;}
.policy-card .policy-type{align-self:flex-start;font-size:9px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;color:#fff;border-radius:20px;padding:2px 8px;}
.policy-card .policy-title{font-size:13px;font-weight:650;color:var(--ink);line-height:1.25;}
.policy-card .policy-meta{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;}
.policy-card .policy-desc{font-size:11.5px;color:var(--muted);line-height:1.4;}
.policy-empty{font-size:12px;color:var(--muted);padding:10px 0;}

/* ---------- graduated quasi-clusters: featured strip + table pill ---------- */
.grad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:4px;}
.grad-card{border:none;border-radius:12px;padding:11px 12px 12px;background:var(--bg);
  display:flex;flex-direction:column;gap:5px;cursor:pointer;transition:box-shadow .12s,background .12s;}
.grad-card:hover{box-shadow:inset 0 0 0 1.5px ${tokens.teal};background:var(--panel);}
.grad-card .grad-name{font-size:13px;font-weight:650;color:var(--ink);line-height:1.25;}
.grad-card .grad-name .flag{margin-right:5px;vertical-align:-1px;border-radius:1px;box-shadow:0 0 0 0.5px color-mix(in srgb, ${tokens.ink} 15%, transparent);}
.grad-card .grad-meta{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums;}
.grad-pill{display:inline-flex;align-items:center;gap:3px;align-self:flex-start;font-size:9.5px;font-weight:700;
  letter-spacing:.05em;text-transform:uppercase;color:${tokens.teal};white-space:nowrap;
  border:1px solid color-mix(in srgb, ${tokens.teal} 45%, transparent);
  background:color-mix(in srgb, ${tokens.teal} 10%, transparent);border-radius:20px;padding:2px 8px;}
.rtable .grad-pill{margin-left:6px;padding:1px 7px;font-size:9px;}

/* ---------- in-map zoom controls (clusters map) ---------- */
.mapzoom{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:5px;z-index:4;}
.mapzoom button{width:28px;height:28px;border-radius:3px;border:1px solid var(--line);background:#fff;
  color:var(--muted);font-size:15px;font-weight:600;line-height:1;cursor:pointer;
  display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(20,40,70,.08);}
.mapzoom button:hover{border-color:var(--ink);color:var(--ink);}
.chiprow{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px;}
.chip{font-size:11.5px;color:var(--muted);border:1px solid var(--line);border-radius:20px;
  padding:4px 11px;cursor:pointer;background:var(--bg);}
.chip.on{background:var(--ink);color:#fff;border-color:var(--ink);}
`;
  }

  function injectCSS() {
    const s = document.createElement("style");
    s.textContent = css();
    document.head.appendChild(s);
  }

  return { tokens, palette, fmt, rank, alpha, injectCSS };
})();
