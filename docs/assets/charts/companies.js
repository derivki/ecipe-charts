/* Companies dashboard — KPI strip + bubble chart + top-by-funding + two
   classification breakdowns. All real data (docs/data/companies.json, built by
   src/aggregations.py::build_company_funding). The workbook's technology-pillar
   and stack-layer fields are not yet populated, so the bubble chart and the
   classification panel use "founding origin" (spinout/merger/joint venture)
   instead — the only company-classification field with real values today.
   The bubble chart itself is a placeholder pending Andrea's dedicated design. */
QT.boot(async function () {
  QT.injectCSS();
  QT.nav("#nav", "companies");

  const [companies, manifest] = await Promise.all([
    QT.loadData("companies"),
    QT.loadData("manifest"),
  ]);
  QT.vintage("#vintage", manifest);
  const tt = QT.tooltip();

  const ORIGIN_LABEL = d => d.origin || "Not specified";
  const rows = companies.data;
  const funded = rows.filter(d => d.total_funding > 0);

  // ---------- KPI strip ----------
  QT.kpis("#kpis", [
    { v: QT.fmt.int(rows.length), k: "Quantum companies tracked" },
    { v: QT.fmt.axisMoney(d3.sum(rows, d => d.total_funding)), k: "Total funding tracked" },
    { v: QT.fmt.int(rows.filter(d => d.ownership_status === "Public").length), k: "Publicly listed" },
    { v: QT.fmt.int(new Set(rows.map(d => d.country)).size), k: "Countries represented" },
  ]);

  // ---------- Panel 1: bubble chart, funding × founding year, coloured by origin ----------
  (function bubble() {
    const withYear = funded.filter(d => d.founded_year);
    const W = 880, H = 380;
    const c = QT.chart("#chart-bubble", { W, H, margin: { t: 10, r: 20, b: 30, l: 60 } });
    const x = d3.scaleLinear().domain(d3.extent(withYear, d => d.founded_year)).nice().range([0, c.iw]);
    const y = d3.scaleLog().domain([d3.min(withYear, d => d.total_funding), d3.max(withYear, d => d.total_funding)]).range([c.ih, 0]);
    const r = d3.scaleSqrt().domain([0, d3.max(withYear, d => d.total_funding)]).range([2, 34]);
    const color = d => QT.palette.origin[ORIGIN_LABEL(d)] || QT.palette.origin["Not specified"];

    c.gGrid.selectAll("line").data(y.ticks(5)).join("line").attr("class", "gridline")
      .attr("x1", 0).attr("x2", c.iw).attr("y1", d => y(d)).attr("y2", d => y(d));
    c.gPlot.selectAll("circle").data(withYear, d => d.company).join("circle")
      .attr("cx", d => x(d.founded_year)).attr("cy", d => y(d.total_funding))
      .attr("r", d => r(d.total_funding)).attr("fill", color).attr("fill-opacity", 0.72)
      .attr("stroke", "#fff").attr("stroke-width", 0.8)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.company}</div>` +
        `<div class="row"><span class="k">Founded</span><span class="v">${d.founded_year}</span></div>` +
        `<div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        `<div class="row"><span class="k">Origin</span><span class="v">${ORIGIN_LABEL(d)}</span></div>` +
        `<div class="row"><span class="k">Country</span><span class="v">${d.country || "—"}</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.gx.call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(5, "~s").tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
    c.g.append("text").attr("x", c.iw / 2).attr("y", c.ih + 26).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", QT.tokens.muted).text("Founding year →");

    const legendItems = Object.keys(QT.palette.origin).filter(k => withYear.some(d => ORIGIN_LABEL(d) === k))
      .map(k => ({ key: k, label: k, color: QT.palette.origin[k] }));
    QT.legend("#legend-bubble", legendItems);
  })();

  // ---------- Panel 2: top 20 companies by funding ----------
  (function topByFunding() {
    const TOP = 20;
    const top = funded.slice(0, TOP);
    const W = 880, H = 46 + top.length * 22;
    const c = QT.chart("#chart-top", { W, H, margin: { t: 6, r: 56, b: 26, l: 170 } });
    const x = d3.scaleLinear().domain([0, d3.max(top, d => d.total_funding) * 1.05]).range([0, c.iw]);
    const y = d3.scaleBand().domain(top.map(d => d.company)).range([0, c.ih]).padding(0.22);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(top, d => d.company).join("rect")
      .attr("x", 0).attr("y", d => y(d.company)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", QT.tokens.accent).attr("fill-opacity", 0.9).attr("width", d => x(d.total_funding))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.company}</div><div class="row"><span class="k">Country</span><span class="v">${d.country || "—"}</span></div><div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(top, d => d.company).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.company) + y.bandwidth() / 2).attr("x", d => x(d.total_funding) + 6)
      .text(d => QT.fmt.money(d.total_funding));
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  })();

  // ---------- Panel 3: companies by founding origin (donut) ----------
  (function originDonut() {
    const counts = d3.rollup(rows, v => v.length, ORIGIN_LABEL);
    const segs = [...counts.entries()].map(([k, v]) => ({ key: k, label: k, v, color: QT.palette.origin[k] || QT.palette.origin["Not specified"] }))
      .sort((a, b) => b.v - a.v);
    const total = d3.sum(segs, d => d.v);

    const W = 420, H = 220;
    const c = QT.chart("#chart-origin", { W, H, margin: { t: 4, r: 4, b: 4, l: 4 } });
    const cx = c.iw / 2, cy = c.ih / 2, r = Math.min(c.iw, c.ih) / 2 - 4, rInner = r * 0.6;
    const ring = c.g.append("g").attr("transform", `translate(${cx},${cy})`);
    const pie = d3.pie().value(d => d.v).sort(null);
    const arc = d3.arc().innerRadius(rInner).outerRadius(r);
    ring.selectAll("path").data(pie(segs)).join("path")
      .attr("d", arc).attr("fill", d => d.data.color)
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.data.label}</div><div class="row"><span class="k">Companies</span><span class="v">${d.data.v} (${QT.fmt.pct1(d.data.v / total)})</span></div>`, e))
      .on("mouseleave", tt.hide);
    ring.append("text").attr("text-anchor", "middle").attr("dy", "0.32em")
      .attr("font-size", 20).attr("font-weight", 700).attr("fill", QT.tokens.ink).text(total);
    ring.append("text").attr("text-anchor", "middle").attr("dy", "1.9em")
      .attr("font-size", 10).attr("fill", QT.tokens.muted).text("companies");

    QT.legend("#legend-origin", segs.map(s => ({ key: s.key, label: `${s.label} (${s.v})`, color: s.color })));
  })();

  // ---------- Panel 4: companies by ownership status ----------
  (function ownershipBar() {
    const counts = d3.rollup(rows, v => v.length, d => d.ownership_status || "Unknown");
    const segs = [...counts.entries()].map(([k, v]) => ({ key: k, label: k, v, color: QT.palette.ownership[k] || QT.tokens.muted }))
      .sort((a, b) => b.v - a.v);

    const W = 420, H = 100;
    const c = QT.chart("#chart-ownership", { W, H, margin: { t: 10, r: 10, b: 10, l: 10 } });
    const x = d3.scaleLinear().domain([0, d3.sum(segs, d => d.v)]).range([0, c.iw]);
    let x0 = 0;
    const withX0 = segs.map(s => { const o = { ...s, x0 }; x0 += s.v; return o; });

    c.g.selectAll("rect").data(withX0, d => d.key).join("rect")
      .attr("x", d => x(d.x0)).attr("y", 20).attr("height", 34).attr("rx", 3)
      .attr("width", d => x(d.v)).attr("fill", d => d.color)
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.label}</div><div class="row"><span class="v">${d.v} companies</span></div>`, e))
      .on("mouseleave", tt.hide);

    QT.legend("#legend-ownership", segs.map(s => ({ key: s.key, label: `${s.label} (${s.v})`, color: s.color })));
  })();
});
