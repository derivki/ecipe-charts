/* ============================================================================
   ECIPE Quantum Tracker – shared design tokens & helpers  (the "theme file")
   ----------------------------------------------------------------------------
   THIS is the single place to change how every chart looks. Edit the tokens
   below (colours, fonts, palettes) and all charts update. No chart file should
   hardcode a colour or font – they read from QT.* here.

   When the designer delivers her Figma spec, translate it into `tokens` and
   `palette` below and nothing else needs to change.
   Loaded as a plain script (no build step); everything hangs off `window.QT`.
   ========================================================================== */
window.QT = (function () {
  // ── Design tokens ─────────────────────────────────────────────────────────
  const tokens = {
    // ECIPE brand palette ("ECIPE fonts, colors and settings", No. 01/2023, "Colors in
    // figures"). Text is 66/66/66, figure lines 190/190/190, and every colour below is
    // one of the guide's main colours, a tint of one (the guide allows gradations "as
    // long as they can be clearly distinguished"), or -- only where a chart needs more
    // categories than the main hues give -- one of its additional colours.
    ink:   "#424242",   // text (66/66/66); also dark UI fills (active buttons, chips)
    muted: "#424242",   // secondary text / axes -- the guide has one text colour, so
                        // hierarchy comes from size and weight, not a lighter grey
    line:  "#BEBEBE",   // gridlines / borders (190/190/190)
    bg:    "#ffffff",
    panel: "#F4F4F4",   // control backgrounds (neutral, off the colour palette)
    // Raleway (SIL OFL) is the font on ecipe.org and in the designer's Figma. The files
    // live in assets/fonts/ and are declared in css() below.
    font:  '"Raleway","Helvetica Neue",Arial,sans-serif',
    // main colours: purple 35/20/50, teal 0/122/131, orange 255/130/0, navy 9/67/94.
    // Token names are historical (they predate the brand palette) -- they now hold:
    accent: "#007A83",  // teal -- primary colour; tab underlines, KPI tint, first series
    teal:   "#007A83",
    gold:   "#FF8200",  // ECIPE orange
    purple: "#231432",  // ECIPE dark purple
    navy:   "#09435E",
    brown:  "#823C14",  // additional colour 130/60/20
    rust:   "#CD1419",  // additional colour 205/20/25 -- errors, downgrades, export controls
    mock:   "#823C14",  // colour used for the "illustrative / mock data" badge
    // world/cluster map only -- shared by world_map.js and clusters.js
    noData:            "#DCDCDC", // land fill when there's no tracked data -- a tint of the
                                   // 190 grey, kept off the teal ramp below so it doesn't read
                                   // as "just a paler funding class" next to the lowest bin
    noDataBorder:      "#BEBEBE", // legend swatch border for the no-data key
    heatmapLow:          "#E5F1F2", // single-hue heatmap low end (Clusters Figure 5) -- 10% teal; pairs with accent as the high end
    clusterBubble:       "#FF8200", // world-map cluster bubble fill (orange: stands off the teal choropleth)
    clusterBubbleStroke: "#823C14", // world-map cluster bubble stroke
  };

  // ── Categorical palettes ─────────────────────────────────────────────────
  const palette = {
    // Ordering rule for categorical sets: teal, orange, purple first (the three most
    // distinct main hues), then gradations -- the 60% teal and 50% purple tints.
    // financing instrument
    instrument: {
      "VC / private equity": "#007A83",
      "Debt":                "#FF8200",
      "Grant":               "#5B99D2",   // ECIPE design system "extra-sky" -- the Figma's light blue
      "Public equity":       "#231432",
    },
    // funding stage (equity ladder)
    stage: {
      "Seed and Angel":                     "#007A83",
      "Early-stage equity":                 "#FF8200",
      "Late-stage equity & Growth equity":  "#918A98",
      "Public equity":                      "#231432",
    },
    // world region
    region: {
      "US":         "#231432",
      "China":      "#007A83",
      "EU":         "#FF8200",
      "UK+AUS+CAN": "#66AFB5",
      "RoW":        "#918A98",
    },
    // Display labels for the region keys above. The keys themselves stay the
    // tracker's internal short codes -- they're the vocabulary the private
    // source workbook's own "Region" column is validated against
    // (config.yaml vocab.region), and Overview Figure 5 / funding_by_stage.js
    // key straight off that raw data, so renaming the keys would silently
    // break their colour lookup. Charts that need a friendlier label for a
    // human reader (Clusters Table 1 / Figures 4-5, Companies Figure 6) go
    // through QT.regionLabel() instead of printing the key directly.
    regionLabel: {
      "UK+AUS+CAN": "UK, Canada, and Australia",
      "RoW":        "Rest of the World",
    },
    // Teal at 10 / 30 / 60 / 80 / 100% -- the guide's own teal gradations.
    sequential: ["#E5F1F2", "#B2D7DA", "#66AFB5", "#33959C", "#007A83"],
    // Cluster overall rank -- navy (best) through teal to orange (worst), the encoding
    // the Clusters paper (Occasional Paper 15/2025) uses in its own figures. Distinct
    // from `sequential` on purpose: this axis is a RANKING with two meaningful ends,
    // so it reads as a diverging ramp rather than "more of a good thing".
    clusterRank: ["#09435E", "#007A83", "#66AFB5", "#FFCD99", "#FF8200"],
    // collaboration archetype (country 2x2, Occasional Paper 08/2025 Figure 3: connectedness x industry-involving collaborations to GDP)
    archetype: {
      "Global Innovation Hubs":      "#007A83",
      "Research Networkers":         "#66AFB5",
      "Regional Commercial Leaders": "#FF8200",
      "Emerging Ecosystems":         "#231432",
    },
    // institution domain (research / government / industry) - MOCK
    domain: { research: "#007A83", government: "#FF8200", industry: "#231432" },
    // cluster ranking dimension (market orientation / collaboration intensity / ecosystem maturity) - MOCK
    dimension: {
      market_orientation:      "#007A83",
      collaboration_intensity: "#FF8200",
      ecosystem_maturity:      "#231432",
    },
    // cluster macro-region (bubble map / region filter) - MOCK grouping of real clusters.
    // Follows the `region` colours above (North America ~ US, Europe ~ EU, East Asia ~ China).
    clusterRegion: { "North America": "#231432", "Europe": "#FF8200", "East Asia": "#007A83", "Other": "#918A98" },
    // company founding origin (Companies tab) - the only populated company-classification field
    origin: {
      "University spinout": "#007A83", "Research spinout": "#66AFB5", "Corporate spinout": "#FF8200",
      "Joint venture": "#231432", "Merger": "#918A98", "Subsidiary": "#FFCD99", "Hybrid spinout": "#09435E",
      "Not specified": "#BEBEBE",
    },
    // company ownership status (Companies tab)
    ownership: { "Private": "#007A83", "Public": "#FF8200", "Corporate": "#231432" },
  };

  // ── Number / currency formatters ──────────────────────────────────────────
  const fmt = {
    // compact axis label, e.g. $1.5B / $250m (capital B for billions, as in the Figma)
    axisMoney: v => "$" + (v >= 1e9 ? (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "B"
                          : v >= 1e6 ? (v / 1e6).toFixed(0) + "m"
                          : d3.format(",")(v)),
    // full value for tooltips, e.g. $1.52B / $250.0m / $12k
    money: v => v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B"
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
    // An ISO datetime (e.g. manifest.built_at_utc) -> "18 September 2026". Used
    // where a panel needs the actual calendar date data was captured, not just
    // the quarter label -- market cap, which moves daily, is the current case.
    date: v => {
      const d = new Date(v);
      return isNaN(d) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    },
  };

  // Label colour for text drawn ON a fill: the guide's text grey on light fills (teal 60%,
  // orange, tints), white on dark ones. Several palette colours are too light for white.
  const textOn = fill => (d3.lab(fill).l > 62 ? tokens.ink : "#fff");

  // ── Ordering ──────────────────────────────────────────────────────────────
  // Ranked output must be REPRODUCIBLE. A bare `(a,b) => b.v - a.v` leaves tied
  // rows in whatever order the source array happened to have, so a quarterly
  // refresh can silently reshuffle them. Ties therefore break alphabetically on
  // a label – which matters most exactly where the data is thin and ties are the
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
/* Raleway, variable weight (one file covers 100-900). Latin subset; font-display:swap so text
   shows in the fallback face instead of staying invisible while the file loads. */
@font-face{font-family:"Raleway";font-style:normal;font-weight:100 900;font-display:swap;
  src:url("assets/fonts/Raleway-VariableFont_wght.woff") format("woff");}
@font-face{font-family:"Raleway";font-style:italic;font-weight:100 900;font-display:swap;
  src:url("assets/fonts/Raleway-Italic-VariableFont_wght.woff") format("woff");}
:root{--ink:${tokens.ink};--muted:${tokens.muted};--line:${tokens.line};
  --bg:${tokens.bg};--panel:${tokens.panel};--font:${tokens.font};--pill:${tokens.purple};}
*{box-sizing:border-box;}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);}
.wrap{max-width:1320px;margin:0 auto;padding:24px 20px 40px;}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;}
h1{font-size:21px;line-height:1.25;margin:6px 0 4px;font-weight:650;letter-spacing:-.01em;}
.sub{font-size:13px;color:var(--muted);margin:0 0 16px;max-width:660px;line-height:1.45;}
.vintage{font-size:11px;color:var(--muted);margin-bottom:14px;}
.vintage b{color:var(--ink);font-weight:600;}
/* Controls follow the Figma: the label sits to the left of its control ("METRIC: [ ... ]"),
   and a toggle is a fully rounded pill that fills the room it is given, dark purple when on. */
.controls{display:flex;flex-wrap:wrap;gap:10px 24px;align-items:center;margin-bottom:10px;}
.ctl{display:flex;flex-direction:row;align-items:center;gap:10px;flex:1 1 300px;min-width:0;}
.ctl label{flex:none;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);font-weight:700;}
.ctl label::after{content:":";}
.seg{display:flex;flex:1 1 auto;min-width:0;border:1px solid var(--pill);border-radius:999px;overflow:hidden;background:#fff;}
.seg button{flex:1 1 auto;appearance:none;border:0;background:transparent;padding:6px 12px;font:inherit;font-size:12px;font-weight:500;color:var(--pill);cursor:pointer;transition:.12s;white-space:nowrap;}
.seg button+button{border-left:1px solid var(--pill);}
.seg button.on{background:var(--pill);color:#fff;}
.seg button:not(.on):hover{background:#F4F4F4;}
/* Dropdowns match the pill controls: white, purple outline, fully rounded, chevron on the right.
   Native <select> cannot show a flag inside the box, so the country picker has none. */
select{appearance:none;font:inherit;font-size:12px;font-weight:500;color:var(--pill);background:#fff;
  border:1px solid var(--pill);border-radius:999px;padding:7px 38px 7px 16px;cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%23231432' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><path d='M1 1.5l5 5 5-5'/></svg>");
  background-repeat:no-repeat;background-position:right 16px center;}
select:hover{background-color:#F4F4F4;}
.ctl select{flex:1 1 auto;min-width:0;}
.legend{display:flex;flex-wrap:wrap;gap:14px;margin:10px 0 2px;}
.lg{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);cursor:default;user-select:none;}
.lg.clickable{cursor:pointer;}
.lg .sw{width:12px;height:12px;border-radius:50%;flex:none;}
.lg.clickable .sw{border-radius:3px;}
.lg.off{opacity:.35;}
svg{display:block;width:100%;height:auto;overflow:visible;}
.axis path,.axis line{stroke:var(--line);}
.axis text{fill:var(--muted);font-size:11px;}
.gridline{stroke:var(--line);stroke-width:1px;}
.partial-band{fill:#F4F4F4;} .partial-label{fill:var(--muted);font-size:10px;font-style:italic;}
/* the number at the end of a bar: bold dark purple, as in the Figma */
.bar-val{font-size:10.5px;fill:${tokens.purple};font-weight:700;font-variant-numeric:tabular-nums;}
.tt{position:fixed;pointer-events:none;background:#231432;color:#fff;border-radius:8px;padding:10px 12px;
  font-size:12px;line-height:1.5;box-shadow:0 6px 24px rgba(0,0,0,.22);opacity:0;transition:opacity .1s;z-index:20;min-width:180px;}
.tt .hd{font-weight:700;font-size:13px;margin-bottom:6px;}
.tt .row{display:flex;justify-content:space-between;gap:16px;}
.tt .row .k{display:inline-flex;align-items:center;gap:6px;color:#E6E6E6;}
.tt .row .k i{width:9px;height:9px;border-radius:2px;display:inline-block;}
.tt .row .v{font-variant-numeric:tabular-nums;font-weight:600;}
.tt .tot{border-top:1px solid rgba(255,255,255,.18);margin-top:6px;padding-top:6px;}
/* A long list inside a tooltip: label above, values as left-aligned wrapped prose.
   .tt .row is flex with the value right-aligned, which turns twenty company names
   into a right-ragged column that is hard to read. */
.tt .tt-list{border-top:1px solid rgba(255,255,255,.18);margin-top:6px;padding-top:6px;max-width:320px;}
.tt .tt-list .k{display:block;color:#E6E6E6;margin-bottom:2px;}
.tt .tt-list div{text-align:left;font-weight:500;line-height:1.45;}
.note{font-size:11.5px;color:var(--muted);margin-top:16px;line-height:1.5;}
.note b{color:var(--ink);font-weight:600;}
/* One-line gesture hint under a chart (zoom, hover, legend click). Only for gestures a
   reader cannot discover alone; labelled controls are not explained. */
.hint{font-size:11px;color:var(--muted);margin:6px 0 0;line-height:1.4;}

/* ---------- dashboard nav (Overview / Countries / Clusters) ---------- */
/* One full-width rounded bar; the active tab is filled dark purple (Figma). */
.tabbar{display:flex;margin:14px 0 8px;border:1px solid var(--pill);border-radius:999px;overflow:hidden;background:#fff;}
.tabbar a{flex:1 1 0;min-width:0;text-align:center;font-size:13px;font-weight:600;color:var(--pill);text-decoration:none;padding:8px 6px;}
.tabbar a+a{border-left:1px solid var(--pill);}
.tabbar a.on{background:var(--pill);color:#fff;}
.tabbar a:not(.on):hover{background:#F4F4F4;}
@media (max-width:480px){.tabbar a{font-size:11.5px;padding:8px 2px;}}

/* ---------- "trusted by" logo strip (placeholder pending real logos) ---------- */
.trustedby{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:2px 0 16px;}
.trustedby-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;}
.trustedby-chip{font-size:11.5px;color:var(--muted);background:var(--panel);border-radius:6px;padding:5px 11px;font-style:italic;}

/* ---------- KPI tile strip ---------- */
/* Base .kpis auto-fits its column count to however many tiles a page actually has
   (Companies: 3; Clusters doesn't use this strip at all) -- collapsing to fewer,
   wider tracks with auto-fit rather than leaving empty ones the way a fixed
   repeat(6,1fr) would for a page with fewer than six tiles. Tiles are sized small
   enough that six still fit across the ~797px usable width of the WordPress embed. */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:14px 0;margin:18px 0 24px;}
/* .kpis-fixed (Overview, Countries): six-across, ALWAYS, whatever the page has to
   show. auto-fit sizes columns from their own content, so on the Countries tab every
   change of country visibly resized all six tiles; Elena asked that they stay put
   whatever is selected. */
.kpis-fixed{grid-template-columns:repeat(6,1fr);}
@media (max-width:640px){.kpis-fixed{grid-template-columns:repeat(3,1fr);}}
@media (max-width:420px){.kpis-fixed{grid-template-columns:repeat(2,1fr);}}
.archetype-line{font-size:12px;color:var(--muted);margin:-14px 0 22px;}
/* Flat strip (Figma): no tile fill, a thin rule between figures, big teal numbers. */
.kpi{border:none;border-left:1px solid var(--line);border-radius:0;padding:2px 14px;background:none;}
.kpi:first-child{border-left:none;padding-left:0;}
.kpi .v{font-size:20px;font-weight:700;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:${tokens.accent};}
.kpi .k{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.3;}
@media (max-width:640px){.kpi,.kpi:first-child{border-left:none;padding:2px 8px 2px 0;}}

/* ---------- dashboard panel grid ----------
   Panels are UNBOXED: no card fill, no border, no radius. Each chart sits
   directly on the page, separated from the one above by a hairline rule and
   generous whitespace. Everything is white, including the KPI strip (.kpi above).
   Keep it that way: a filled background here is what made the page read as a
   stack of widgets. */
.panels{display:grid;gap:34px 30px;margin-top:10px;}
.panels.g2{grid-template-columns:1fr 1fr;}
.panels .span2{grid-column:1/-1;}
.panel{border:none;border-radius:0;background:none;padding:22px 0 0;border-top:1px solid var(--line);}
/* Figure title: a small teal "FIGURE 3:" eyebrow (.fig) over a larger dark-purple title. The
   eyebrow is a <span class="fig"> inside .ttl -- static pages write it in the HTML, the
   Countries titles that change with the selected country build it with QT.figTitle(). */
.panel .ttl{display:block;font-size:20px;font-weight:700;line-height:1.2;letter-spacing:-.01em;color:var(--pill);margin:0 0 6px;}
.panel .ttl .fig{display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${tokens.accent};margin:0 0 5px;}
.panel .ttl .mockbadge,.panel .ttl .citebadge{margin-left:8px;vertical-align:middle;}
.panel .why{font-size:12px;color:var(--muted);line-height:1.45;margin:0 0 10px;max-width:1000px;}
/* What a figure shows (.why), how to read it (.howto, above the chart) and where the numbers
   come from (.source, below it) are three separate things. */
.panel .howto{font-size:12px;color:var(--muted);line-height:1.45;margin:0 0 10px;max-width:1000px;}
.panel .howto b{color:var(--ink);font-weight:600;}
.panel .source{font-size:11px;color:var(--muted);line-height:1.4;margin:6px 0 0;max-width:1000px;}
/* Sub-heading for a second block within one panel (e.g. Figure 3's "New entrants" /
   "Downgraded" split) -- smaller and quieter than .ttl, which stays reserved for the
   figure title itself. */
.subttl{font-size:11px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;
  color:var(--muted);margin:14px 0 6px;}
.subttl:first-of-type{margin-top:2px;}
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
/* table-layout:fixed + the <colgroup> in clusters.html give each column an explicit
   share of the width, instead of the browser sizing every column to its widest
   cell INCLUDING the header. Headers like "Collaboration Intensity" used to force
   their column (and the whole table) wide even though every cell under it holds a
   single-digit rank, which is what made the panel need horizontal scrolling. Fixed
   layout needs the header text to be allowed to wrap onto two lines instead – see
   the th rule below – since it can no longer grow the column to fit one line. */
.rtable{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed;}
.rtable th,.rtable td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);}
.rtable th{font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);
  cursor:pointer;user-select:none;white-space:normal;overflow-wrap:anywhere;line-height:1.35;vertical-align:bottom;}
@media (max-width:700px){.rtable th,.rtable td{padding-left:6px;padding-right:6px;}}
.rtable th.sorted{color:var(--ink);}
.rtable th .arrow{opacity:.55;}
.rtable td.num,.rtable th.num{text-align:right;font-variant-numeric:tabular-nums;}
.rtable td.ctr,.rtable th.ctr{text-align:center;}
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
  border:2px solid var(--ink);cursor:grab;box-shadow:0 1px 3px rgba(35,20,50,.2);touch-action:none;z-index:2;transform:translateX(-50%);}
.ts-handle:active{cursor:grabbing;}
.ts-lab{position:absolute;top:23px;font-size:10.5px;color:var(--muted);font-variant-numeric:tabular-nums;transform:translateX(-50%);white-space:nowrap;}
/* time slider placed directly under a chart (rather than in the controls row) */
/* label above the track, which then takes the full width (set to the plot area by QT.timeSlider's align) */
.tslider-ctl{margin-top:12px;flex-direction:column;align-items:stretch;gap:0;}

/* ---------- policy & programmes cards (countries tab) ---------- */
/* Borderless cards, as in the Figma: the coloured type pill, then title / meta / note. The pill's
   background is set per type in countries.js (POLICY_COLORS), its text colour with QT.textOn. */
.policy-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:22px 18px;margin-top:6px;}
.policy-card{border:none;border-left:1px solid var(--line);border-radius:0;padding:0 0 0 18px;background:none;
  display:flex;flex-direction:column;gap:5px;}
.policy-card.row-start{border-left:none;padding-left:0;}
.policy-card .policy-type{align-self:flex-start;font-size:10px;font-weight:700;letter-spacing:.02em;
  text-transform:capitalize;color:#fff;border-radius:20px;padding:3px 10px;}
.policy-card .policy-title{font-size:13px;font-weight:650;color:var(--ink);line-height:1.25;}
.policy-card .policy-meta{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;}
.policy-card .policy-desc{font-size:11.5px;color:var(--muted);line-height:1.4;}
.policy-empty{font-size:12px;color:var(--muted);padding:10px 0;}

/* ---------- graduated quasi-clusters: featured strip + table pill ---------- */
.grad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:4px;}
.grad-card{border:1px solid var(--line);border-radius:12px;padding:11px 12px 12px;background:var(--bg);
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
/* Downgrade cards mirror the "NEW" graduate cards but in rust, not teal, so the two
   groups of Figure 3 read as opposites at a glance rather than needing the label text. */
.grad-pill-down{color:${tokens.rust};border-color:color-mix(in srgb, ${tokens.rust} 45%, transparent);
  background:color-mix(in srgb, ${tokens.rust} 10%, transparent);}

/* ---------- clusters map frame ---------- */
/* Same radial-gradient "ocean" backdrop as the Overview world map's .wm-frame
   (world_map.js), so the two maps share one look -- this map's SVG sphere/land/
   graticule are drawn transparent over it rather than filled flat grey. */
#map-wrap{background:radial-gradient(120% 130% at 32% 0%,#F4F4F4,#FFFFFF 72%);
  border-radius:8px;overflow:hidden;}
/* ---------- in-map zoom controls (clusters map) ---------- */
.mapzoom{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:5px;z-index:4;}
.mapzoom button{width:28px;height:28px;border-radius:3px;border:1px solid var(--line);background:#fff;
  color:var(--muted);font-size:15px;font-weight:600;line-height:1;cursor:pointer;
  display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(35,20,50,.08);}
.mapzoom button:hover{border-color:var(--ink);color:var(--ink);}
/* ---------- colour-scale key (clusters map) ---------- */
.cmap-legend{position:absolute;left:12px;bottom:12px;z-index:4;background:#fff;
  border:1px solid var(--line);border-radius:6px;padding:10px 12px;
  color:var(--muted);max-width:180px;box-shadow:0 2px 8px rgba(35,20,50,.06);font-size:11px;}
.cmap-legend .lg-title{font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;}
.cmap-legend .lg-bar{height:8px;border-radius:2px;margin-bottom:4px;}
.cmap-legend .lg-scale{display:flex;justify-content:space-between;font-size:9.5px;color:var(--muted);}
/* Ranking-movement indicators (Clusters table): up / down / no change vs. last year. */
.mv{font-size:10px;font-weight:700;margin-left:3px;vertical-align:1px;}
.mv-up{color:#6EA62D;} .mv-down{color:${tokens.rust};} .mv-flat{color:${tokens.muted};}
.rtable .dim{color:${tokens.line};}
/* Legend centred under its chart, for panels with only two or three keys where a
   left-aligned legend reads as detached from the figure. */
.legend-center{justify-content:center;}
/* Block heading inside a multi-block bar panel (Companies "landscape" figure). */
.block-title{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;fill:${tokens.muted};}
.chiprow{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px;}
.ctl .chiprow{margin:0;}
.chip{font-size:11.5px;color:var(--pill);border:1px solid var(--pill);border-radius:20px;
  padding:4px 11px;cursor:pointer;background:var(--bg);}
.chip.on{background:var(--pill);color:#fff;border-color:var(--pill);}
/* .fused: a chip row that behaves like a segmented pill (ranking brackets, area and
   minimum-collaboration pickers) instead of separate round chips. */
.chiprow.fused{flex:1 1 auto;min-width:0;flex-wrap:nowrap;gap:0;border:1px solid var(--pill);border-radius:999px;overflow:hidden;background:#fff;}
.chiprow.fused .chip{flex:1 1 auto;text-align:center;border:0;border-radius:0;padding:6px 12px;font-size:12px;font-weight:500;white-space:nowrap;}
.chiprow.fused .chip+.chip{border-left:1px solid var(--pill);}
.chiprow.fused .chip:not(.on):hover{background:#F4F4F4;}
/* A chip that is unavailable because the other selector already holds it: still
   readable, visibly not clickable. */
.chip.off{opacity:.4;cursor:not-allowed;}
`;
  }

  // Idempotent, and called once at parse time (below) rather than waiting for a
  // page's async chart code to ask for it.
  //
  // WHY: every page used to call QT.injectCSS() inside its own `async` IIFE, i.e.
  // after the first `await`. The stylesheet therefore arrived AFTER the browser had
  // already painted the document, so switching tabs flashed unstyled HTML –
  // full-width black Times New Roman for a frame – which Elena reported as "a little
  // glitch in the design" on 2026-09-08. Self-injecting on load, with this file moved
  // into <head>, means the CSS is in place before the body is parsed and there is no
  // unstyled frame to see. The per-page calls are now harmless no-ops.
  let injected = false;
  function injectCSS() {
    if (injected) return;
    injected = true;
    const s = document.createElement("style");
    s.id = "qt-theme";
    s.textContent = css();
    (document.head || document.documentElement).appendChild(s);
  }

  injectCSS();

  // A figure title built as the "FIGURE 3:" eyebrow plus the title text -- see .panel .ttl in css().
  // For titles that change with the selection; static ones carry the <span class="fig"> in the HTML.
  function figTitle(selector, label, text) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = "";
    const fig = document.createElement("span");
    fig.className = "fig";
    fig.textContent = label + ":";
    el.append(fig, " " + text);
  }

  return { tokens, palette, fmt, rank, alpha, textOn, injectCSS, figTitle };
})();
