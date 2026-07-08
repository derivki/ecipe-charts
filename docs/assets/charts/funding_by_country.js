/* Funding by country — horizontal bars, switchable metric.
   Reads docs/data/funding_by_country.json. Design comes from QT (theme.js). */
(async function () {
  QT.injectCSS();
  const { data, meta } = await QT.loadData("funding_by_country");
  QT.vintage("#vintage", meta);

  const TOP = 20;
  const tt = QT.tooltip();
  const accent = QT.palette.instrument["VC / private equity"];

  const METRICS = {
    total_funding: { label: "Total funding",   fmt: QT.fmt.axisMoney, ttfmt: QT.fmt.money },
    companies:     { label: "Company count",   fmt: QT.fmt.int,       ttfmt: QT.fmt.int },
    funding_to_gdp:{ label: "Funding ÷ GDP",   fmt: v => QT.fmt.pct1(v), ttfmt: v => QT.fmt.pct1(v) },
  };
  let metric = "total_funding";

  const W = 920, H = 560;
  const c = QT.chart("#chart", { W, H, margin: { t: 10, r: 70, b: 34, l: 120 } });
  const x = d3.scaleLinear().range([0, c.iw]);
  const y = d3.scaleBand().range([0, c.ih]).padding(0.18);

  function rows() {
    return data
      .filter(d => d[metric] != null)
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, TOP);
  }

  function render() {
    const M = METRICS[metric];
    const rs = rows();
    x.domain([0, d3.max(rs, d => d[metric]) * 1.02 || 1]);
    y.domain(rs.map(d => d.country));

    c.gGrid.selectAll("line").data(x.ticks(5)).join("line")
      .attr("class", "gridline").attr("y1", 0).attr("y2", c.ih)
      .attr("x1", d => x(d)).attr("x2", d => x(d));

    c.gPlot.selectAll("rect").data(rs, d => d.country).join("rect")
      .attr("x", 0).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", accent).attr("fill-opacity", 0.9)
      .attr("y", d => y(d.country))
      .attr("width", d => x(d[metric]))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.country}</div>` +
        `<div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${QT.fmt.int(d.companies)}</span></div>` +
        (d.funding_to_gdp != null
          ? `<div class="row"><span class="k">Funding ÷ GDP</span><span class="v">${QT.fmt.pct1(d.funding_to_gdp)}</span></div>` : ""),
        e))
      .on("mouseleave", tt.hide);

    c.gPlot.selectAll("text.bar-val").data(rs, d => d.country).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.country) + y.bandwidth() / 2)
      .attr("x", d => x(d[metric]) + 6)
      .text(d => M.ttfmt(d[metric]));

    c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(M.fmt).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  QT.segControl("#seg-metric", "data-m", m => { metric = m; render(); });
  render();
})();
