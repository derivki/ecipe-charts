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

  /** One shared tooltip element for the whole page. */
  QT.tooltip = function () {
    let el = d3.select(".tt");
    if (el.empty()) el = d3.select("body").append("div").attr("class", "tt");
    return {
      show(html, event) {
        el.html(html).style("opacity", 1)
          .style("left", Math.min(event.clientX + 14, window.innerWidth - 200) + "px")
          .style("top", (event.clientY - 10) + "px");
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
    sel.select(".sw").style("background", d => d.color);
    sel.select(".nm").text(d => d.label);
    if (onToggle) sel.on("click", (e, d) => onToggle(d.key));
  };

  /** Write the "as of <vintage>" line into an element. */
  QT.vintage = function (selector, meta) {
    if (meta && meta.data_vintage)
      d3.select(selector).html(`Data as of <b>${meta.data_vintage}</b>`);
  };

  /** Dashboard tab bar: Overview / Countries / Clusters. `active` is one of
      "overview" | "countries" | "clusters". Injected into an empty <div id="nav">
      already present in the page, so every dashboard page shares one implementation. */
  QT.nav = function (selector, active) {
    const TABS = [
      { key: "overview",  label: "Overview",  href: "index.html" },
      { key: "countries", label: "Countries",  href: "countries.html" },
      { key: "clusters",  label: "Clusters",   href: "clusters.html" },
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
    sel.select(".k").text(d => d.k);
  };

  /** Small inline ribbon flagging a panel's data as illustrative/mock. */
  QT.mockBadge = function () { return `<span class="mockbadge">Illustrative · mock data</span>`; };

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
     matching WordPress snippet. */
  (function reportHeight() {
    const send = () => {
      const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
      try { window.parent.postMessage({ type: "qt-embed-size", height: h }, "*"); } catch (e) {}
    };
    window.addEventListener("load", send);
    window.addEventListener("resize", send);
    if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
    setTimeout(send, 800); // after the chart's async render
  })();
})();
