/* Companies dashboard.

   All real data, from three Stage 1 datasets:
     companies.json            — one row per company (build_company_funding)
     institution_spinouts.json — parent institution -> spinouts + their funding
     listed_by_exchange.json   — listing venue -> number of listed companies

   Panel order follows the two measures the tab actually has. Market value exists
   only for the ~31 listed companies, so it leads as its own clearly-bounded story;
   funding raised covers 531 companies and carries the rest of the tab. The earlier
   founding-year bubble placeholder is gone: the market-cap pack replaces it as the
   headline visual, and founding year is now a plain histogram, which reads better
   for a single count-per-year series than a scatter did. */
QT.boot(async function () {
  QT.injectCSS();
  QT.nav("#nav", "companies");

  const [companies, institutions, exchanges, manifest] = await Promise.all([
    QT.loadData("companies"),
    QT.loadData("institution_spinouts"),
    QT.loadData("listed_by_exchange"),
    QT.loadData("manifest"),
  ]);
  QT.vintage("#vintage", manifest);
  const tt = QT.tooltip();

  const rows = companies.data;
  const funded = rows.filter(d => d.total_funding > 0);
  const listed = rows.filter(d => d.market_cap_usd > 0);

  // Vendored PNG flags, same convention as the Clusters tab: flag emoji render as
  // bare two-letter codes on many Windows browser/font combinations. A missing
  // code or asset yields no <img> at all rather than a broken image.
  // `onerror` removes the element if the asset is absent, so a country that has a
  // code but no flag file (Hong Kong, today) degrades to no flag instead of a
  // broken-image glyph. Adding a country needs a row in country_iso2.csv AND a
  // .png; this makes the half-done state harmless rather than visible.
  function flagIcon(code, label) {
    if (!code) return "";
    const safe = String(label || code).replace(/"/g, "&quot;");
    return `<img class="flag" src="assets/vendor/flags/${String(code).toLowerCase()}.png" ` +
           `width="16" height="12" alt="${safe}" title="${safe}" onerror="this.remove()">`;
  }

  // ---------- KPI strip ----------
  QT.kpis("#kpis", [
    { v: QT.fmt.int(rows.length), k: "Quantum companies tracked" },
    { v: QT.fmt.axisMoney(d3.sum(rows, d => d.total_funding)), k: "Total funding tracked" },
    { v: QT.fmt.int(d3.sum(rows, d => d.n_rounds)), k: "Funding rounds recorded" },
    { v: QT.fmt.int(institutions.data.length), k: "Institutions of origin" },
    { v: QT.fmt.int(rows.filter(d => d.ownership_status === "Public").length), k: "Publicly listed" },
  ]);

  /* ---------- Panel 1: market capitalisation, packed bubbles by region ----------
     A circle pack rather than a scatter: market cap spans three orders of
     magnitude ($18.6bn to $15m), so position would carry no information while
     area carries all of it. Grouping by region is the comparison the panel is
     for — one pack per region, laid out by total regional value. */
  (function marketCap() {
    // Regional grouping is defined here rather than in the pipeline because it is
    // a presentation choice for this panel, not a property of a company. EU is the
    // member-state list; the UK/Australia/Canada grouping mirrors how the sector
    // is usually discussed relative to the US and China.
    const EU = new Set(["Germany", "France", "Netherlands", "Finland", "Spain", "Denmark",
      "Italy", "Ireland", "Poland", "Austria", "Sweden", "Belgium", "Czech Republic",
      "Portugal", "Bulgaria", "Romania", "Slovenia", "Greece", "Malta", "Cyprus"]);
    const REGION = d =>
      d.country === "US" ? "United States" :
      d.country === "China" ? "China" :
      ["UK", "Australia", "Canada"].includes(d.country) ? "UK, Australia & Canada" :
      EU.has(d.country) ? "European Union" : "Rest of world";
    const COLOR = {
      "United States": "#1f4e79", "China": "#b5482f",
      "UK, Australia & Canada": "#7b5ea7", "European Union": "#d9a520",
      "Rest of world": "#3d8b8b",
    };

    const byRegion = d3.groups(listed, REGION)
      .map(([region, cos]) => ({ region, cos, total: d3.sum(cos, c => c.market_cap_usd) }))
      .sort(QT.rank("total", "region"));

    const W = 880;
    // A shared radius scale across every region, not per-pack normalisation:
    // a $600m company must look the same size wherever it is headquartered,
    // otherwise a small region's leader reads like a large region's leader.
    const rScale = d3.scaleSqrt().domain([0, d3.max(listed, d => d.market_cap_usd)]).range([0, 58]);
    const LABEL_H = 26, GAP = 26;

    // Each region gets a column as wide as the WIDER of its pack and its label,
    // so the caption can never overlap its neighbour's — the failure mode when
    // columns are sized by pack width alone and a one-bubble region carries a long
    // name like "UK, Australia & Canada".
    const cols = byRegion.map(reg => {
      const nodes = reg.cos.map(c => ({ ...c, r: Math.max(2.2, rScale(c.market_cap_usd)) }));
      d3.packSiblings(nodes);                       // sets x/y in place from r
      const x0 = d3.min(nodes, n => n.x - n.r), x1 = d3.max(nodes, n => n.x + n.r);
      const y0 = d3.min(nodes, n => n.y - n.r), y1 = d3.max(nodes, n => n.y + n.r);
      const caption = `${reg.region} · ${QT.fmt.axisMoney(reg.total)}`;
      // 6.1px per character approximates 12px Inter/system-ui at weight 650.
      const labelW = caption.length * 6.1;
      return { reg, nodes, caption, packW: x1 - x0, packH: y1 - y0,
               cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
               colW: Math.max(x1 - x0, labelW) };
    });

    // All regions on ONE row, always: the panel's job is a side-by-side regional
    // comparison, and wrapping one region onto its own line reads as if it belongs
    // to a different grouping. When the row needs more than W the viewBox widens
    // instead, so the SVG scales down to the panel and the row stays intact.
    const needW = d3.sum(cols, c => c.colW) + GAP * (cols.length - 1);
    const vbW = Math.max(W, needW);
    const H = LABEL_H + d3.max(cols, c => c.packH) + 8;

    d3.select("#chart-mcap").selectAll("*").remove();
    const svg = d3.select("#chart-mcap").append("svg")
      .attr("viewBox", `0 0 ${vbW} ${H}`).attr("role", "img")
      .attr("aria-label", "Market capitalisation of listed quantum companies, grouped by region");
    const g = svg.append("g");

    // Packs sit on a shared vertical centre so bubble sizes compare across
    // regions by eye, with each caption centred over its own column.
    const placed = [];
    let xCursor = (vbW - needW) / 2;
    const midY = 4 + LABEL_H + d3.max(cols, c => c.packH) / 2;
    cols.forEach(col => {
      placed.push({ ...col,
        ox: xCursor + col.colW / 2 - col.cx,
        oy: midY - col.cy,
        labelX: xCursor + col.colW / 2,
        labelY: 4 + LABEL_H - 9 });
      xCursor += col.colW + GAP;
    });

    placed.forEach(({ reg, nodes, caption, ox, oy, labelX, labelY }) => {
      g.append("text")
        .attr("x", labelX).attr("y", labelY)
        .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 650)
        .attr("fill", QT.tokens.ink)
        .text(caption);
      const gg = g.append("g").attr("transform", `translate(${ox},${oy})`);
      gg.selectAll("circle").data(nodes, d => d.company).join("circle")
        .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r)
        .attr("fill", COLOR[reg.region]).attr("fill-opacity", 0.88)
        .attr("stroke", "#fff").attr("stroke-width", 0.9)
        .style("cursor", "default")
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${d.company}</div>` +
          `<div class="row"><span class="k">Market cap</span><span class="v">${QT.fmt.money(d.market_cap_usd)}</span></div>` +
          `<div class="row"><span class="k">Country</span><span class="v">${d.country}</span></div>` +
          `<div class="row"><span class="k">Funding raised</span><span class="v">${d.total_funding ? QT.fmt.money(d.total_funding) : "—"}</span></div>` +
          (d.market_cap_is_override ? `<div class="row"><span class="k">Note</span><span class="v">manual figure</span></div>` : ""), e))
        .on("mouseleave", tt.hide);
      // Label only bubbles that can actually hold the text. Truncation is measured
      // against the chord available at the label's own font size rather than a flat
      // character cap, which is what let "Quantum Computing Inc." spill out of its
      // circle. Anything that still will not fit is left to the tooltip.
      const fontFor = d => Math.max(7.5, Math.min(13, d.r * 0.44));
      const fitted = nodes
        .filter(d => d.r >= 15)
        .map(d => {
          const fs = fontFor(d);
          const maxChars = Math.floor((d.r * 1.7) / (fs * 0.56));
          if (maxChars < 3) return null;
          const name = d.company.replace(/\s*\(.*?\)\s*$/, "");   // drop native-script suffix
          return { ...d, fs,
                   text: name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name };
        })
        .filter(Boolean);
      gg.selectAll("text.blabel").data(fitted, d => d.company).join("text")
        .attr("class", "blabel")
        .attr("x", d => d.x).attr("y", d => d.y).attr("dy", "0.32em")
        .attr("text-anchor", "middle").attr("fill", "#fff")
        .attr("font-size", d => d.fs).attr("font-weight", 600)
        .attr("pointer-events", "none")
        .text(d => d.text);
    });

    d3.select("#mcap-count").text(`${listed.length} of ${rows.length}`);
    const overridden = listed.filter(d => d.market_cap_is_override);
    d3.select("#mcap-override-note").html(overridden.length
      ? `<b>${overridden.length} figure${overridden.length > 1 ? "s" : ""} (${overridden.map(d => d.company).join(", ")}) ` +
        `are recorded manually</b> because the workbook's live market-data cells did not resolve. ` +
        `Market capitalisation also moves daily and is not fixed to the data vintage above.`
      : `Market capitalisation moves daily and is not fixed to the data vintage above.`);
  })();

  /* ---------- Panel 2: parent institutions ---------- */
  (function institutionRanking() {
    const BRACKET = 15;
    const state = { metric: "total_funding", page: 0 };
    const all = () => [...institutions.data]
      .filter(d => d[state.metric] > 0)
      .sort(QT.rank(state.metric, "institution"));

    function render() {
      const list = all();
      const pages = Math.ceil(list.length / BRACKET);
      state.page = Math.max(0, Math.min(state.page, pages - 1));
      const rs = list.slice(state.page * BRACKET, state.page * BRACKET + BRACKET);

      d3.select("#bracket-inst").selectAll(".chip").data(d3.range(pages), p => p)
        .join("span").attr("class", "chip").classed("on", p => p === state.page)
        .text(p => `${p * BRACKET + 1}–${Math.min((p + 1) * BRACKET, list.length)}`)
        .on("click", (e, p) => { state.page = p; render(); });

      const money = state.metric === "total_funding";
      const W = 880, H = 24 + rs.length * 30;
      d3.select("#chart-inst").selectAll("*").remove();
      const c = QT.chart("#chart-inst", { W, H, margin: { t: 6, r: 64, b: 26, l: 300 } });
      const x = d3.scaleLinear().domain([0, d3.max(list, d => d[state.metric]) * 1.05]).range([0, c.iw]);
      const y = d3.scaleBand().domain(rs.map(d => d.institution)).range([0, c.ih]).padding(0.22);

      c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
        .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));

      c.gPlot.selectAll("rect").data(rs, d => d.institution).join("rect")
        .attr("x", 0).attr("y", d => y(d.institution)).attr("height", y.bandwidth()).attr("rx", 2)
        .attr("fill", QT.tokens.accent).attr("width", d => x(d[state.metric]))
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${d.institution}</div>` +
          (d.type ? `<div class="row"><span class="k">Type</span><span class="v">${d.type}</span></div>` : "") +
          (d.country ? `<div class="row"><span class="k">Country</span><span class="v">${d.country}</span></div>` : "") +
          `<div class="row"><span class="k">Spinouts</span><span class="v">${d.n_spinouts}</span></div>` +
          `<div class="row"><span class="k">Funding raised</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
          `<div class="row"><span class="k">Largest</span><span class="v">${d.companies.slice(0, 3).join(", ")}</span></div>`, e))
        .on("mouseleave", tt.hide);

      c.gPlot.selectAll("text.bar-val").data(rs, d => d.institution).join("text")
        .attr("class", "bar-val").attr("dy", "0.32em")
        .attr("y", d => y(d.institution) + y.bandwidth() / 2)
        .attr("x", d => x(d[state.metric]) + 6)
        .text(d => money ? QT.fmt.axisMoney(d.total_funding) : d.n_spinouts);

      // Flags live in the axis labels, so the country reads without a tooltip.
      c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
      c.gy.selectAll(".tick text").remove();
      c.gy.selectAll(".tick").each(function (name) {
        const d = rs.find(r => r.institution === name);
        d3.select(this).append("foreignObject")
          .attr("x", -294).attr("y", -y.bandwidth() / 2)
          .attr("width", 288).attr("height", y.bandwidth())
          .append("xhtml:div")
          .attr("style", "display:flex;align-items:center;justify-content:flex-end;gap:6px;" +
                         `height:${y.bandwidth()}px;font-size:11.5px;color:${QT.tokens.ink};` +
                         "overflow:hidden;white-space:nowrap;text-align:right;")
          .html(`<span style="overflow:hidden;text-overflow:ellipsis;">${name}</span>` +
                flagIcon(d && d.country_code, d && d.country));
      });
      c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(money ? QT.fmt.axisMoney : d3.format("d")).tickSizeOuter(0));
    }

    QT.segControl("#seg-inst-metric", "m", m => { state.metric = m; state.page = 0; render(); });
    render();

    const withInst = new Set();
    institutions.data.forEach(i => i.companies.forEach(c => withInst.add(c)));
    d3.select("#inst-coverage").text(
      `${withInst.size} of ${rows.length} companies (${QT.fmt.pct0(withInst.size / rows.length)})`);
  })();

  /* ---------- Panel 3: top 20 by funding ---------- */
  (function topFunded() {
    const rs = [...funded].sort(QT.rank("total_funding", "company")).slice(0, 20);
    const W = 880, H = 24 + rs.length * 26;
    const c = QT.chart("#chart-top", { W, H, margin: { t: 6, r: 64, b: 26, l: 190 } });
    const x = d3.scaleLinear().domain([0, d3.max(rs, d => d.total_funding) * 1.05]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(d => d.company)).range([0, c.ih]).padding(0.2);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rs, d => d.company).join("rect")
      .attr("x", 0).attr("y", d => y(d.company)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", QT.tokens.accent).attr("width", d => x(d.total_funding))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.company}</div>` +
        `<div class="row"><span class="k">Funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        `<div class="row"><span class="k">Rounds</span><span class="v">${d.n_rounds}</span></div>` +
        `<div class="row"><span class="k">Country</span><span class="v">${d.country || "—"}</span></div>` +
        `<div class="row"><span class="k">Stack layer</span><span class="v">${d.stack_layer}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rs, d => d.company).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.company) + y.bandwidth() / 2).attr("x", d => x(d.total_funding) + 6)
      .text(d => QT.fmt.axisMoney(d.total_funding));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
  })();

  /* ---------- Panel 4: funding by stack layer ---------- */
  (function stackLayer() {
    const rs = d3.groups(rows, d => d.stack_layer)
      .map(([layer, cos]) => ({
        layer, n: cos.length,
        funding: d3.sum(cos, c => c.total_funding),
      }))
      .sort(QT.rank("funding", "layer"));

    const W = 880, H = 24 + rs.length * 34;
    const c = QT.chart("#chart-stack", { W, H, margin: { t: 6, r: 92, b: 26, l: 190 } });
    const x = d3.scaleLinear().domain([0, d3.max(rs, d => d.funding) * 1.05]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(d => d.layer)).range([0, c.ih]).padding(0.26);
    const totalF = d3.sum(rs, d => d.funding);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rs, d => d.layer).join("rect")
      .attr("x", 0).attr("y", d => y(d.layer)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", QT.tokens.accent).attr("width", d => x(d.funding))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.layer}</div>` +
        `<div class="row"><span class="k">Funding</span><span class="v">${QT.fmt.money(d.funding)}</span></div>` +
        `<div class="row"><span class="k">Share</span><span class="v">${QT.fmt.pct1(d.funding / totalF)}</span></div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${d.n}</span></div>` +
        `<div class="row"><span class="k">Per company</span><span class="v">${QT.fmt.money(d.funding / d.n)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rs, d => d.layer).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.layer) + y.bandwidth() / 2).attr("x", d => x(d.funding) + 6)
      .text(d => `${QT.fmt.axisMoney(d.funding)}  ·  ${d.n} cos`);
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
  })();

  /* ---------- Panel 5: how companies are founded ----------
     Reframed from the old origin donut. A blank Origin in the workbook is not
     "unspecified": the vocabulary lists only non-organic origins, so the blank
     records an independently founded company. Showing it as a two-part split with
     the institutional types stacked inside states that correctly. */
  (function foundingSplit() {
    const INDEPENDENT = "Founded independently";
    const inst = rows.filter(d => d.origin);
    const indep = rows.length - inst.length;
    const byType = d3.groups(inst, d => d.origin)
      .map(([k, v]) => ({ key: k, label: k, n: v.length, color: QT.palette.origin[k] || QT.tokens.muted }))
      .sort(QT.rank("n", "label"));
    const segs = [{ key: INDEPENDENT, label: INDEPENDENT, n: indep, color: "#c7ced6" }, ...byType];

    const W = 420, H = 176;
    const c = QT.chart("#chart-origin", { W, H, margin: { t: 30, r: 4, b: 40, l: 4 } });
    const x = d3.scaleLinear().domain([0, rows.length]).range([0, c.iw]);
    let acc = 0;
    const laid = segs.map(s => { const o = { ...s, x0: acc }; acc += s.n; return o; });

    // Two stacked bands: the institutional/independent split on top, its
    // composition below, so the primary fact reads first.
    c.g.append("text").attr("x", 0).attr("y", -14).attr("font-size", 11)
      .attr("fill", QT.tokens.muted)
      .text(`${inst.length} from an institution · ${indep} founded independently`);

    c.g.selectAll("rect.top").data([
      { label: "From an institution", n: inst.length, x0: 0, color: QT.tokens.accent },
      { label: INDEPENDENT, n: indep, x0: inst.length, color: "#c7ced6" },
    ]).join("rect").attr("class", "top")
      .attr("x", d => x(d.x0)).attr("y", 0).attr("height", 26).attr("rx", 2)
      .attr("width", d => Math.max(1, x(d.n) - 1)).attr("fill", d => d.color)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.label}</div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${d.n} (${QT.fmt.pct1(d.n / rows.length)})</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.g.selectAll("rect.sub").data(laid, d => d.key).join("rect").attr("class", "sub")
      .attr("x", d => x(d.x0)).attr("y", 42).attr("height", 22).attr("rx", 2)
      .attr("width", d => Math.max(1, x(d.n) - 1)).attr("fill", d => d.color)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.label}</div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${d.n} (${QT.fmt.pct1(d.n / rows.length)})</span></div>`, e))
      .on("mouseleave", tt.hide);

    QT.legend("#legend-origin", laid.map(s => ({ key: s.key, label: `${s.label} (${s.n})`, color: s.color })));
  })();

  /* ---------- Panel 6: companies by founding year ---------- */
  (function foundedYear() {
    const FROM = 2000;   // a handful of companies predate this; the tail is noise
    const partial = manifest.partial_year;
    const counts = d3.rollup(rows.filter(d => d.founded_year >= FROM), v => v.length, d => d.founded_year);
    const years = d3.range(FROM, d3.max(rows, d => d.founded_year) + 1);
    const rs = years.map(y => ({ year: y, n: counts.get(y) || 0 }));

    const W = 420, H = 176;
    const c = QT.chart("#chart-founded", { W, H, margin: { t: 8, r: 8, b: 28, l: 30 } });
    const x = d3.scaleBand().domain(years).range([0, c.iw]).padding(0.16);
    const y = d3.scaleLinear().domain([0, d3.max(rs, d => d.n) * 1.1]).nice().range([c.ih, 0]);

    c.gGrid.selectAll("line").data(y.ticks(4)).join("line").attr("class", "gridline")
      .attr("x1", 0).attr("x2", c.iw).attr("y1", d => y(d)).attr("y2", d => y(d));
    c.gPlot.selectAll("rect").data(rs, d => d.year).join("rect")
      .attr("x", d => x(d.year)).attr("width", x.bandwidth())
      .attr("y", d => y(d.n)).attr("height", d => c.ih - y(d.n)).attr("rx", 1)
      // The partial year is shaded, matching how the instrument chart marks YTD.
      .attr("fill", d => d.year === partial ? "#c7ced6" : QT.tokens.accent)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.year}${d.year === partial ? " (partial)" : ""}</div>` +
        `<div class="row"><span class="k">Companies founded</span><span class="v">${d.n}</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.gx.call(d3.axisBottom(x).tickValues(years.filter(y2 => y2 % 5 === 0)).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(4).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    d3.select("#founded-from").text(FROM);
  })();

  /* ---------- Panel 7: listed companies by exchange ---------- */
  (function byExchange() {
    const rs = exchanges.data;
    const W = 880, H = 24 + rs.length * 24;
    const c = QT.chart("#chart-exchange", { W, H, margin: { t: 6, r: 48, b: 26, l: 300 } });
    const x = d3.scaleLinear().domain([0, d3.max(rs, d => d.n_listings) * 1.08]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(d => d.exchange)).range([0, c.ih]).padding(0.24);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rs, d => d.exchange).join("rect")
      .attr("x", 0).attr("y", d => y(d.exchange)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", QT.tokens.accent).attr("width", d => x(d.n_listings))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.exchange}</div>` +
        (d.country ? `<div class="row"><span class="k">Country</span><span class="v">${d.country}</span></div>` : "") +
        `<div class="row"><span class="k">Listings</span><span class="v">${d.n_listings}</span></div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${d.companies.join(", ")}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rs, d => d.exchange).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.exchange) + y.bandwidth() / 2).attr("x", d => x(d.n_listings) + 6)
      .text(d => d.n_listings);

    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    c.gy.selectAll(".tick text").remove();
    c.gy.selectAll(".tick").each(function (name) {
      const d = rs.find(r => r.exchange === name);
      d3.select(this).append("foreignObject")
        .attr("x", -294).attr("y", -y.bandwidth() / 2)
        .attr("width", 288).attr("height", y.bandwidth())
        .append("xhtml:div")
        .attr("style", "display:flex;align-items:center;justify-content:flex-end;gap:6px;" +
                       `height:${y.bandwidth()}px;font-size:11.5px;color:${QT.tokens.ink};` +
                       "overflow:hidden;white-space:nowrap;text-align:right;")
        .html(`<span style="overflow:hidden;text-overflow:ellipsis;">${name}</span>` +
              flagIcon(d && d.country_code, d && d.country));
    });
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")).tickSizeOuter(0));

    const listings = d3.sum(rs, d => d.n_listings);
    d3.select("#exchange-count").text(
      `${listings} listings across ${listed.length} companies on ${rs.length} venues`);
  })();
});
