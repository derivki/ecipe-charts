/* ============================================================================
   ECIPE Quantum Tracker — reusable D3 chart scaffold (component system)
   ----------------------------------------------------------------------------
   Every chart is a self-contained COMPONENT registered on QT.charts, e.g.
   QT.charts.fundingByCountry(root, opts). Each builds its own DOM (title,
   controls, legend, svg, note) INSIDE `root`, and scopes all selectors to that
   root — so one page can host many charts without id collisions.

   • standalone chart page → mounts one component into a full-width container
   • overview dashboard     → mounts several into panels
   Both use the exact same component code and the shared theme (theme.js).
   ========================================================================== */
(function () {
  const QT = window.QT;
  QT.charts = {};

  const sel = t => (t && t.node) ? t : d3.select(t);   // accept selection or selector

  /** Fetch a published dataset. Returns {meta, data}. */
  QT.loadData = async function (name) {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error(`Failed to load data/${name}.json (${res.status})`);
    return res.json();
  };

  /** Build the standard chart shell inside `root`. Returns d3 selections. */
  QT.shell = function (root, opts = {}) {
    const el = sel(root).classed("qt-chart", true);
    el.selectAll("*").remove();
    if (opts.eyebrow) el.append("div").attr("class", "eyebrow").text(opts.eyebrow);
    if (opts.title) el.append(opts.eyebrow ? "h1" : "div").attr("class", "qt-title").html(opts.title);
    if (opts.sub) el.append("p").attr("class", "sub").text(opts.sub);
    const vintage = el.append("div").attr("class", "vintage");
    const controls = el.append("div").attr("class", "controls");
    const legend = el.append("div").attr("class", "legend");
    const svg = el.append("svg").attr("role", "img");
    if (opts.aria) svg.attr("aria-label", opts.aria);
    const note = el.append("p").attr("class", "note");
    if (opts.note) note.html(opts.note); else note.style("display", "none");
    return { el, vintage, controls, legend, svg, note };
  };

  /** Responsive chart frame on an existing <svg> (selection or selector). */
  QT.chart = function (target, { W, H, margin }) {
    const m = Object.assign({ t: 16, r: 16, b: 34, l: 60 }, margin || {});
    const svg = sel(target).attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    svg.selectAll("*").remove();
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
    return {
      svg, g, m, W, H, iw, ih,
      gGrid: g.append("g"), gPlot: g.append("g"),
      gx: g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`),
      gy: g.append("g").attr("class", "axis"),
      gOverlay: g.append("g"),
    };
  };

  /** One shared tooltip element for the whole page. */
  QT.tooltip = function () {
    let el = d3.select("body").select(".tt");
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

  /** Segmented button control, built into a container selection. */
  QT.seg = function (container, { label, items, value, onChange }) {
    const ctl = container.append("div").attr("class", "ctl");
    if (label) ctl.append("label").text(label);
    const seg = ctl.append("div").attr("class", "seg");
    seg.selectAll("button").data(items).join("button")
      .classed("on", d => d.v === value).html(d => d.label)
      .on("click", function (e, d) {
        seg.selectAll("button").classed("on", false);
        d3.select(this).classed("on", true);
        onChange(d.v);
      });
    return seg;
  };

  /** Dropdown <select>, built into a container selection. */
  QT.select = function (container, { label, items, value, onChange }) {
    const ctl = container.append("div").attr("class", "ctl");
    if (label) ctl.append("label").text(label);
    const s = ctl.append("select");
    s.selectAll("option").data(items).join("option")
      .attr("value", d => d.v).property("selected", d => d.v === value).text(d => d.label);
    s.on("change", function () { onChange(this.value); });
    return s;
  };

  /** Clickable legend into a container (selection or selector). items:[{key,label,color}]. */
  QT.legend = function (target, items, { hidden, onToggle } = {}) {
    hidden = hidden || new Set();
    const lg = sel(target).selectAll(".lg").data(items, d => d.key)
      .join(enter => {
        const e = enter.append("div").attr("class", "lg");
        e.append("span").attr("class", "sw");
        e.append("span").attr("class", "nm");
        return e;
      });
    lg.classed("off", d => hidden.has(d.key));
    lg.select(".sw").style("background", d => d.color);
    lg.select(".nm").text(d => d.label);
    if (onToggle) lg.on("click", (e, d) => onToggle(d.key));
    return lg;
  };

  /** Write the "as of <vintage>" line into a target (selection or selector). */
  QT.vintage = function (target, meta) {
    if (meta && meta.data_vintage)
      sel(target).html(`Data as of <b>${meta.data_vintage}</b>`);
  };

  /* ── Auto-resize: report height to a host page (responsive iframes) ── */
  (function reportHeight() {
    const send = () => {
      const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
      try { window.parent.postMessage({ type: "qt-embed-size", height: h }, "*"); } catch (e) {}
    };
    window.addEventListener("load", send);
    window.addEventListener("resize", send);
    if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
    setTimeout(send, 900);
  })();
})();
