/* Component: share of quantum funding inside vs outside clusters, over time.
   Reads cluster_concentration.json. A hero % + a 100% stacked bar per period. */
QT.charts.clusterConcentration = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: opts.title ?? "Funding concentrates in clusters",
    sub: opts.compact ? null : "Share of global quantum company funding raised inside vs. outside clusters.",
    aria: "Share of quantum funding in clusters over time",
    note: opts.compact ? null : "Source: ECIPE Quantum Database, Occasional Paper 15/2025.",
  });
  S.controls.style("display", "none");

  const { meta, data } = await QT.loadData("cluster_concentration");
  QT.vintage(S.vintage, meta);
  const periods = data.periods;
  const latest = periods[periods.length - 1];
  const tt = QT.tooltip();

  const CL = QT.palette.instrument["VC / private equity"];   // clusters
  const NON = QT.tokens.muted;                               // non-clusters (low opacity)

  S.el.insert("div", "svg").attr("class", "cc-hero")
    .html(`${latest.clusters}%<small>of quantum funding is inside clusters (${latest.period})</small>`);

  const W = 620, H = 30 + periods.length * 40;
  const c = QT.chart(S.svg, { W, H, margin: { t: 6, r: 12, b: 22, l: 96 } });
  const x = d3.scaleLinear().domain([0, 100]).range([0, c.iw]);
  const yb = d3.scaleBand().domain(periods.map(p => p.period)).range([0, c.ih]).padding(0.45);

  c.g.append("g").selectAll("text").data(periods).join("text")
    .attr("class", "bar-val").attr("x", -12).attr("text-anchor", "end").attr("dy", "0.32em")
    .attr("y", d => yb(d.period) + yb.bandwidth() / 2).attr("fill", QT.tokens.muted).text(d => d.period);

  const seg = [
    { key: "clusters", label: "In clusters", color: CL, op: 0.9, val: d => d.clusters, x0: () => 0 },
    { key: "non_clusters", label: "Outside clusters", color: NON, op: 0.32, val: d => d.non_clusters, x0: d => d.clusters },
  ];

  periods.forEach(p => {
    c.gPlot.selectAll(`rect.${"r" + p.period.replace(/\W/g, "")}`).data(seg).join("rect")
      .attr("y", yb(p.period)).attr("height", yb.bandwidth()).attr("rx", 2)
      .attr("x", s => x(s.x0(p))).attr("width", s => x(s.val(p)))
      .attr("fill", s => s.color).attr("fill-opacity", s => s.op)
      .on("mousemove", (e, s) => tt.show(
        `<div class="hd">${p.period}</div>` +
        `<div class="row"><span class="k"><i style="background:${s.color}"></i>${s.label}</span><span class="v">${s.val(p)}%</span></div>`, e))
      .on("mouseleave", tt.hide);
  });

  // in-bar label for the clusters segment
  c.gPlot.selectAll("text.lbl").data(periods).join("text").attr("class", "bar-val")
    .attr("fill", "#fff").attr("x", 8).attr("dy", "0.32em")
    .attr("y", d => yb(d.period) + yb.bandwidth() / 2).text(d => d.clusters + "%");

  QT.legend(S.legend, seg.map(s => ({ key: s.key, label: s.label, color: s.color })));
};
