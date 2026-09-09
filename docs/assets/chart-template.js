/* ============================================================================
   ECIPE Quantum Tracker — reusable D3 chart scaffold
   ----------------------------------------------------------------------------
   Written once, used by every chart. Handles the repetitive parts:
     • loading a published dataset (QT.loadData)
     • a responsive SVG with the standard margin convention (QT.chart)
     • a single shared tooltip (QT.tooltip)
     • segmented-button controls (QT.segControl)
     • a clickable legend (QT.legend)
     • the "data vintage" label (QT.vintage)

   A chart file only needs its own data-binding + shapes; it should never
   re-implement any of the above and never hardcode colours (use QT.palette).
   ========================================================================== */
(function () {
  const QT = window.QT;

  /** Fetch a published dataset. Returns {meta, data}. */
  QT.loadData = async function (name) {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error(`Failed to load data/${name}.json (${res.status})`);
    return res.json();
  };

  /** "Government funding" by country, combining TWO sources per Elena's 2026-09-09
   *  instruction: Dyuti's government policy register (`government_funding.json`,
   *  built by src/build_government_funding.py — national programmes announced or
   *  deployed by governments directly) PLUS the funding database's own
   *  `public_funding` (Grant + Public equity instruments inside company funding
   *  rounds — money a government gave or invested straight into a company).
   *
   *  This deliberately reverses the 2026-09-08 "Company is ALL company funding,
   *  Government is the register alone, never add them" split recorded in
   *  BACKLOG.md AP-36 and in world_map.js's older comment. The two sources can
   *  overlap (a grant that reached a company could also be counted inside a
   *  national programme total in the register) and nothing here de-dupes that —
   *  Elena confirmed a straight sum is fine and the resulting number is an upper
   *  bound, same spirit as the existing "provisional" note.
   *
   *  Used by every view that shows "government funding" (Overview + Countries
   *  KPI tiles, the world map's Government toggle, the country ranking) so they
   *  cannot drift apart the way govByCountry used to when each file built its own. */
  QT.combinedGovByCountry = function (countryRows, govRows) {
    const byCountry = new Map(govRows.map(d => [d.country, { ...d }]));
    countryRows.forEach(d => {
      const pub = d.public_funding || 0;
      if (pub <= 0) return;
      const existing = byCountry.get(d.country);
      if (existing) existing.government_funding = (existing.government_funding || 0) + pub;
      else byCountry.set(d.country, { country: d.country, government_funding: pub });
    });
    return byCountry;
  };

  /** Standard responsive chart frame from a <svg> that already has a viewBox. */
  QT.chart = function (selector, { W, H, margin }) {
    const m = Object.assign({ t: 16, r: 16, b: 34, l: 60 }, margin || {});
    const svg = d3.select(selector).attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
    return {
      svg, g, m, W, H, iw, ih,
      gGrid: g.append("g"),
      gPlot: g.append("g"),
      gx: g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`),
      gy: g.append("g").attr("class", "axis"),
      gOverlay: g.append("g"),
    };
  };

  /** One shared tooltip element for the whole page.
   *
   *  FLIPS to the left of the cursor when it would not fit on the right, instead of
   *  being clamped. The old code did `Math.min(clientX + 14, innerWidth - 200)`, which
   *  is wrong twice over: 200 is a guess (`.tt` sets only `min-width:180px` and a
   *  country tooltip is routinely wider), and clamping pins the box against the
   *  viewport edge under the cursor rather than moving it out of the way. Hovering
   *  anything near the right edge — Japan and New Zealand on the world map — showed
   *  half a tooltip. Measuring the real box and flipping fixes both.
   */
  QT.tooltip = function () {
    let el = d3.select(".tt");
    if (el.empty()) el = d3.select("body").append("div").attr("class", "tt");
    const GAP = 14;
    return {
      show(html, event) {
        // Set the content before measuring: the width depends on it.
        el.html(html).style("opacity", 1);
        const box = el.node().getBoundingClientRect();
        const fitsRight = event.clientX + GAP + box.width <= window.innerWidth - 8;
        const left = fitsRight ? event.clientX + GAP : event.clientX - GAP - box.width;
        // Vertical: keep the whole box on screen without ever covering the cursor.
        const top = Math.max(8, Math.min(event.clientY - 10, window.innerHeight - box.height - 8));
        el.style("left", Math.max(8, left) + "px").style("top", top + "px");
      },
      hide() { el.style("opacity", 0); },
    };
  };

  /** Wire a segmented control: <div class="seg" id=..><button data-<attr>=..>. */
  QT.segControl = function (selector, dataAttr, onChange) {
    d3.select(selector).selectAll("button").on("click", function () {
      d3.select(selector).selectAll("button").classed("on", false);
      d3.select(this).classed("on", true);
      onChange(this.getAttribute(dataAttr));
    });
  };

  /** Dual-handle year-range slider for time-series charts. Renders into an empty
      element and fires onChange([loYear, hiYear]) as the user drags. `years` is the
      ascending list of available years; the slider starts at the full range.
      Snaps to whole years. Returns { value: () => [lo, hi] }. */
  QT.timeSlider = function (selector, { years, onChange } = {}) {
    const root = d3.select(selector).classed("tslider", true);
    root.selectAll("*").remove();
    const n = years.length;
    let lo = 0, hi = n - 1;

    const track  = root.append("div").attr("class", "ts-track");
    const range  = root.append("div").attr("class", "ts-range");
    const hLo    = root.append("div").attr("class", "ts-handle");
    const hHi    = root.append("div").attr("class", "ts-handle");
    const labLo  = root.append("div").attr("class", "ts-lab");
    const labHi  = root.append("div").attr("class", "ts-lab");

    const pct = i => (n > 1 ? (i / (n - 1)) * 100 : 0);
    function paint() {
      hLo.style("left", pct(lo) + "%");
      hHi.style("left", pct(hi) + "%");
      range.style("left", pct(lo) + "%").style("width", (pct(hi) - pct(lo)) + "%");
      labLo.style("left", pct(lo) + "%").text(years[lo]);
      labHi.style("left", pct(hi) + "%").text(years[hi]);
    }
    function nearest(clientX) {
      const r = track.node().getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      return Math.round(f * (n - 1));
    }
    const emit = () => onChange && onChange([years[lo], years[hi]]);
    function drag(which) {
      return d3.drag().on("start drag", ev => {
        const i = nearest(ev.sourceEvent.clientX);
        if (which === "lo") lo = Math.min(i, hi); else hi = Math.max(i, lo);
        paint(); emit();
      });
    }
    hLo.call(drag("lo"));
    hHi.call(drag("hi"));
    track.on("click", ev => {
      const i = nearest(ev.clientX);
      if (Math.abs(i - lo) <= Math.abs(i - hi)) lo = Math.min(i, hi); else hi = Math.max(i, lo);
      paint(); emit();
    });
    paint();
    return { value: () => [years[lo], years[hi]] };
  };

  /** Build a clickable legend. items: [{key,label,color}]. */
  QT.legend = function (selector, items, { hidden, onToggle } = {}) {
    hidden = hidden || new Set();
    const sel = d3.select(selector).selectAll(".lg").data(items, d => d.key)
      .join(enter => {
        const el = enter.append("div").attr("class", "lg");
        el.append("span").attr("class", "sw");
        el.append("span").attr("class", "nm");
        return el;
      });
    sel.classed("off", d => hidden.has(d.key));
    // Only legends wired to toggle series get the square swatch + pointer cursor
    // (see theme.js). Static legends render round swatches that echo the mark.
    sel.classed("clickable", !!onToggle);
    sel.select(".sw").style("background", d => d.color);
    sel.select(".nm").text(d => d.label);
    if (onToggle) sel.on("click", (e, d) => onToggle(d.key));
  };

  /** Run a page's async render function; if it rejects (a missing/renamed
      dataset, a network hiccup), show a recoverable message instead of
      leaving the page silently blank. Wrap every chart page's top-level
      IIFE with this: QT.boot(async function () { ...same body... }); */
  QT.boot = function (renderPage) {
    renderPage().catch(err => {
      console.error(err);
      const host = document.querySelector(".wrap") || document.body;
      const box = document.createElement("div");
      box.className = "load-error";
      box.innerHTML = `<p><b>This page couldn't load its data.</b> ${err && err.message ? `<code>${err.message}</code>` : "Something went wrong while fetching it."}</p>`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => location.reload());
      box.appendChild(retry);
      host.prepend(box);
    });
  };

  /** Write the "as of <vintage>" line into an element. */
  QT.vintage = function (selector, meta) {
    if (meta && meta.data_vintage)
      d3.select(selector).html(`Data as of <b>${QT.fmt.vintage(meta.data_vintage)}</b>`);
  };

  /** Dashboard tab bar: Overview / Countries / Clusters / Companies / About. `active`
      is one of "overview" | "countries" | "clusters" | "companies" | "about".
      Injected into an empty <div id="nav"> already present in the page, so every
      dashboard page shares one implementation. */
  QT.nav = function (selector, active) {
    const TABS = [
      { key: "overview",  label: "Overview",  href: "index.html" },
      { key: "countries", label: "Countries",  href: "countries.html" },
      { key: "clusters",  label: "Clusters",   href: "clusters.html" },
      { key: "companies", label: "Companies",  href: "companies.html" },
      { key: "about",     label: "About",      href: "about.html" },
    ];
    d3.select(selector).attr("class", "tabbar").selectAll("a").data(TABS, d => d.key)
      .join("a")
      .attr("href", d => d.href)
      .classed("on", d => d.key === active)
      .text(d => d.label);
  };

  /** KPI tile strip. items: [{v: "$38.8bn", k: "Total funding tracked"}]. */
  QT.kpis = function (selector, items) {
    const sel = d3.select(selector).attr("class", "kpis").selectAll(".kpi").data(items, (d, i) => i)
      .join(enter => {
        const el = enter.append("div").attr("class", "kpi");
        el.append("div").attr("class", "v");
        el.append("div").attr("class", "k");
        return el;
      });
    sel.select(".v").html(d => d.v);
    sel.select(".k").html(d => d.k);
  };

  /* ── Flags ────────────────────────────────────────────────────────────────
     Vendored PNGs (assets/vendor/flags/<iso2>.png) rather than flag emoji,
     because Windows browser/font combinations routinely render flag emoji as a
     plain two-letter code instead of a picture.

     Call QT.loadFlags() once per page before using QT.flag(). Both chart files
     that already had a private `flagIcon()` now share this, since Elena's
     2026-09-08 list adds flags to three more panels and a fourth copy of the
     same six lines was not worth having.  */
  let FLAG_CODES = {};
  QT.loadFlags = async function () {
    if (Object.keys(FLAG_CODES).length) return FLAG_CODES;
    try {
      FLAG_CODES = (await QT.loadData("country_codes")).data || {};
    } catch (e) {
      FLAG_CODES = {};   // no flags is a fine degradation; a broken page is not
    }
    return FLAG_CODES;
  };

  /** <img> for a country's flag, by tracker country name or by ISO-2 code.
      Returns "" when the country is unknown, and removes itself if the .png is
      missing — so a country with a code but no asset degrades to no flag rather
      than to a broken-image glyph. */
  QT.flag = function (country, { code } = {}) {
    const iso = (code || FLAG_CODES[country] || "").toLowerCase();
    if (!iso) return "";
    const safe = String(country || iso).replace(/"/g, "&quot;");
    return `<img class="flag" src="assets/vendor/flags/${iso}.png" width="16" height="12" ` +
           `alt="${safe}" title="${safe}" onerror="this.remove()">`;
  };

  /** Lowercase ISO-2 for a tracker country name, or "" if unknown. */
  QT.flagCode = function (country) { return (FLAG_CODES[country] || "").toLowerCase(); };

  /** Put a flag in front of each label on a categorical SVG axis.
   *
   *  The HTML <img> from QT.flag() cannot go inside an <svg> axis tick, so this appends
   *  an SVG <image> per tick and shifts the tick's text right to make room. `countryOf`
   *  maps a tick's datum (the band domain value, e.g. a company name) to the country
   *  whose flag should show; return "" to leave a tick unflagged rather than blank.
   *
   *  Ticks whose flag asset is missing keep their original text position, so a missing
   *  PNG costs nothing visually instead of leaving a gap where an image should be.
   */
  QT.flagAxis = function (axisG, countryOf, { size = 16, gap = 7 } = {}) {
    const h = Math.round(size * 0.75);
    // Reserve the slot next to the axis for the flag and push every label left of it,
    // giving [label] [flag] | bar. Placing the flag on the far side of the label would
    // need each label's rendered width, which varies per row and is not known until
    // after layout; reserving a fixed slot keeps flags in one straight column and the
    // label baselines aligned whether or not a given row has a flag.
    axisG.selectAll(".tick").each(function (d) {
      const tick = d3.select(this);
      tick.selectAll("image.flagtick").remove();
      tick.select("text").attr("x", -(9 + size + gap));
      const iso = QT.flagCode(countryOf(d));
      if (!iso) return;
      tick.append("image").attr("class", "flagtick")
        .attr("href", `assets/vendor/flags/${iso}.png`)
        .attr("width", size).attr("height", h)
        .attr("x", -(9 + size)).attr("y", -h / 2)
        .on("error", function () { d3.select(this).remove(); });
    });
  };

  /** Binned (class-interval) colour scale over QT.palette.sequential.
   *
   *  For choropleths, replacing a continuous d3.scaleSequential. Quantum funding
   *  is extremely skewed — the US alone is ~4x China and ~12x the UK — so a
   *  linear ramp puts every country except the US in the palest two shades and
   *  the map reads as "the US, and nowhere else". Elena asked for categorical
   *  colours "so as not to have the US dark only". Quantile breaks over the
   *  countries that actually have funding spread the classes across the data
   *  rather than across the range, so the middle of the distribution becomes
   *  legible; the breaks are returned for the legend to label honestly.
   */
  QT.binnedScale = function (values, { bins = 5 } = {}) {
    const vs = values.filter(v => v > 0).sort(d3.ascending);
    const colors = QT.palette.sequential.slice(-bins);
    if (!vs.length) return { color: () => QT.tokens.noData, breaks: [], colors };
    // Quantile breaks, de-duplicated: a tie across a boundary would otherwise
    // produce two classes with identical bounds and an unreadable legend.
    const breaks = [];
    for (let i = 1; i < bins; i++) {
      const b = d3.quantileSorted(vs, i / bins);
      if (!breaks.length || b > breaks[breaks.length - 1]) breaks.push(b);
    }
    return {
      breaks,
      colors: colors.slice(colors.length - (breaks.length + 1)),
      color(v) {
        if (!(v > 0)) return QT.tokens.noData;
        const pal = colors.slice(colors.length - (breaks.length + 1));
        let i = 0;
        while (i < breaks.length && v >= breaks[i]) i++;
        return pal[i];
      },
    };
  };

  /** Small inline ribbon flagging a panel's data as illustrative/mock. Pass a
      shorter label (e.g. "Mock") where the badge sits somewhere tight, like a KPI tile. */
  QT.mockBadge = function (label) { return `<span class="mockbadge">${label || "Illustrative · mock data"}</span>`; };

  /** Small inline ribbon flagging a panel's data as taken directly from a published paper (real, but not from the funding database). */
  QT.citeBadge = function (label) { return `<span class="citebadge">${label || "Published · Occasional Paper 15/2025"}</span>`; };

  /** Left-rule note explaining why a panel's numbers are placeholders. */
  QT.mockNote = function (selector, text) {
    d3.select(selector).attr("class", "mocknote").html(text);
  };

  /** Left-rule note citing a published source for a panel's (non-mock) numbers. */
  QT.citeNote = function (selector, text) {
    d3.select(selector).attr("class", "citenote").html(text);
  };

  /* ── Auto-resize: report our height to a host page (for responsive iframes) ──
     Posts {type:'qt-embed-size', height} to the parent whenever our content
     height changes. Harmless if the host doesn't listen. See the runbook for the
     matching WordPress snippet.
     +6px buffer: an exact-pixel match is fragile — a font swap or subpixel
     rounding difference between the measurement moment and final paint can push
     real content 1px past an exactly-sized host iframe, which then falls back to
     showing its own internal scrollbar (since the embed doesn't set
     scrolling="no"). A few px of harmless blank space at the bottom avoids that. */
  (function reportHeight() {
    const send = () => {
      const h = Math.ceil(document.documentElement.getBoundingClientRect().height) + 6;
      try { window.parent.postMessage({ type: "qt-embed-size", height: h }, "*"); } catch (e) {}
    };
    window.addEventListener("load", send);
    window.addEventListener("resize", send);
    if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
    setTimeout(send, 800); // after the chart's async render

    // Belt-and-suspenders: when embedded, never show OUR OWN scroll UI — the
    // host iframe (sized from the message above) owns all scrolling. Guards
    // against the buffer above still being insufficient in some edge case.
    // Skipped when viewed standalone (window.self === window.top), so direct
    // links to a chart page keep normal scrolling.
    if (window.self !== window.top) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
  })();
})();
