/* Cluster layer components (Occasional Paper 15/2025 + funding database). */

/* ── Sortable ranking table ─────────────────────────────────────────────── */
QT.charts.clusterRanking = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: opts.title ?? "Quantum cluster ranking",
    sub: opts.compact ? null : "All 45 clusters, scored on three dimensions. Click any column to sort.",
    note: opts.compact ? null : "Ranks from ECIPE Occasional Paper 15/2025; funding from the ECIPE Quantum Database. Lower rank number = stronger.",
  });
  const { meta, data } = await QT.loadData("clusters");
  QT.vintage(S.vintage, meta);
  S.svg.remove(); S.legend.remove();

  const rows = data.clusters.slice();
  const cols = [
    { k: "rank_overall", label: "#", num: true },
    { k: "cluster", label: "Cluster" },
    { k: "region", label: "Region" },
    { k: "funding", label: "Funding", num: true, fmt: v => QT.fmt.money(v || 0) },
    { k: "rank_market", label: "Market", num: true },
    { k: "rank_collab", label: "Collab.", num: true },
    { k: "rank_maturity", label: "Maturity", num: true },
  ];
  const sort = { k: "rank_overall", asc: true };
  const wrap = S.el.append("div").attr("class", "tblwrap");
  const table = wrap.append("table").attr("class", "qt");
  const thead = table.append("thead").append("tr");
  const tbody = table.append("tbody");
  thead.selectAll("th").data(cols).join("th")
    .attr("class", d => (d.num ? "num" : "") + (d.k === sort.k ? " sorted" : ""))
    .text(d => d.label + (d.k === sort.k ? (sort.asc ? " ▲" : " ▼") : ""))
    .on("click", (e, d) => {
      if (sort.k === d.k) sort.asc = !sort.asc; else { sort.k = d.k; sort.asc = d.k !== "funding"; }
      thead.selectAll("th").attr("class", c => (c.num ? "num" : "") + (c.k === sort.k ? " sorted" : ""))
        .text(c => c.label + (c.k === sort.k ? (sort.asc ? " ▲" : " ▼") : ""));
      draw();
    });

  function draw() {
    const rs = rows.slice().sort((a, b) => {
      const va = a[sort.k], vb = b[sort.k];
      const c = typeof va === "string" ? va.localeCompare(vb) : (va - vb);
      return sort.asc ? c : -c;
    });
    tbody.selectAll("tr").data(rs, d => d.cluster).join("tr").each(function (d) {
      const tr = d3.select(this); tr.selectAll("td").remove();
      cols.forEach(col => {
        const td = tr.append("td").attr("class", col.num ? "num" : "");
        if (col.k === "region") td.html(`<span class="rgn" style="background:${QT.palette.region[d.region] || "#889"}"></span>${d.region}`);
        else if (col.fmt) td.text(col.fmt(d[col.k]));
        else td.text(d[col.k]);
      });
    });
  }
  draw();
};

/* ── Composite stress-test: re-weight the three dimensions ──────────────── */
QT.charts.clusterStressTest = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: opts.title ?? "Stress-test the ranking",
    sub: opts.compact ? null : "The overall rank is the average of the three dimension ranks. Move the weights and watch clusters re-sort.",
    note: opts.compact ? null : "A transparency tool: there is no single “right” weighting — see how sensitive the leaders are to it.",
  });
  const { meta, data } = await QT.loadData("clusters");
  QT.vintage(S.vintage, meta);
  const clusters = data.clusters;
  const TOP = opts.top ?? 15;

  const DIMS = [
    { k: "rank_market", label: "Market orientation" },
    { k: "rank_collab", label: "Collaboration intensity" },
    { k: "rank_maturity", label: "Ecosystem maturity" },
  ];
  const w = { rank_market: 50, rank_collab: 50, rank_maturity: 50 };

  const sliders = S.controls.append("div").attr("class", "sliders");
  DIMS.forEach(d => {
    const r = sliders.append("div").attr("class", "srow");
    r.append("span").attr("class", "nm").text(d.label);
    r.append("input").attr("type", "range").attr("min", 0).attr("max", 100).attr("value", w[d.k])
      .on("input", function () { w[d.k] = +this.value; render(); });
    r.append("span").attr("class", "wv").attr("id", "wv-" + d.k).text(w[d.k]);
  });

  const N = 920, H = 40 + TOP * 26;
  const c = QT.chart(S.svg, { W: N, H, margin: { t: 8, r: 44, b: 20, l: 180 } });
  const x = d3.scaleLinear().domain([0, 45]).range([0, c.iw]);   // score-derived length
  const yb = d3.scaleBand().range([0, c.ih]).padding(0.18);
  const tt = QT.tooltip();

  function score(d) {
    const tw = w.rank_market + w.rank_collab + w.rank_maturity || 1;
    return (w.rank_market * d.rank_market + w.rank_collab * d.rank_collab + w.rank_maturity * d.rank_maturity) / tw;
  }
  function render() {
    DIMS.forEach(d => S.controls.select("#wv-" + d.k).text(w[d.k]));
    const ranked = clusters.map(d => ({ ...d, sc: score(d) })).sort((a, b) => a.sc - b.sc).slice(0, TOP);
    yb.domain(ranked.map(d => d.cluster));
    const bar = c.gPlot.selectAll("g.row").data(ranked, d => d.cluster)
      .join(enter => {
        const g = enter.append("g").attr("class", "row");
        g.append("rect").attr("rx", 2); g.append("text").attr("class", "bar-val");
        return g;
      });
    bar.transition().duration(500).attr("transform", d => `translate(0,${yb(d.cluster)})`);
    bar.select("rect").attr("height", yb.bandwidth())
      .attr("fill", d => QT.palette.region[d.region] || "#889").attr("fill-opacity", 0.88)
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.cluster}</div>` +
        `<div class="row"><span class="k">Weighted score</span><span class="v">${d.sc.toFixed(1)}</span></div>` +
        `<div class="row"><span class="k">Official rank</span><span class="v">#${d.rank_overall}</span></div>`, e))
      .on("mouseleave", tt.hide)
      .transition().duration(500).attr("width", d => x(46 - d.sc));
    bar.select("text").attr("x", -10).attr("y", yb.bandwidth() / 2).attr("dy", "0.32em")
      .attr("text-anchor", "end").attr("fill", QT.tokens.ink).text(d => d.cluster);
  }
  render();
};

/* ── Dimension 2 explorer: openness × volume × brokerage ────────────────── */
QT.charts.clusterCollaboration = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: opts.title ?? "Collaboration intensity of clusters",
    sub: opts.compact ? null : "Each cluster by how open its collaborations are (share external) and how many it has. Bubble size = brokerage role in the global network.",
    note: opts.compact ? null : "Source: ECIPE Occasional Paper 15/2025, Dimension 2 (Collaboration Intensity).",
  });
  const { meta, data } = await QT.loadData("clusters");
  QT.vintage(S.vintage, meta);
  const rows = data.clusters.filter(d => d.collab_total && d.external_pct != null);
  const tt = QT.tooltip();

  const W = 920, H = 480;
  const c = QT.chart(S.svg, { W, H, margin: { t: 14, r: 20, b: 46, l: 56 } });
  const x = d3.scaleLinear().domain([d3.min(rows, d => d.external_pct) * 0.98, 1]).range([0, c.iw]);
  const y = d3.scaleLog().domain([d3.min(rows, d => d.collab_total) * 0.8, d3.max(rows, d => d.collab_total) * 1.15]).range([c.ih, 0]);
  const r = d3.scaleSqrt().domain([0, d3.max(rows, d => d.brokerage)]).range([3, 16]);

  c.gGrid.selectAll("line").data(y.ticks(4)).join("line").attr("class", "gridline")
    .attr("x1", 0).attr("x2", c.iw).attr("y1", d => y(d)).attr("y2", d => y(d));
  c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(QT.fmt.pct0).tickSizeOuter(0));
  c.gy.call(d3.axisLeft(y).ticks(4, "~s").tickSizeOuter(0));
  c.g.append("text").attr("class", "axis-title").attr("x", c.iw / 2).attr("y", c.ih + 38)
    .attr("text-anchor", "middle").text("External collaborations — openness (share of total) →");
  c.g.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)")
    .attr("x", -c.ih / 2).attr("y", -42).attr("text-anchor", "middle").text("Total collaborations (log) →");

  c.gPlot.selectAll("circle").data(rows).join("circle")
    .attr("cx", d => x(d.external_pct)).attr("cy", d => y(d.collab_total)).attr("r", d => r(d.brokerage))
    .attr("fill", d => QT.palette.region[d.region] || "#889").attr("fill-opacity", 0.72)
    .attr("stroke", "#fff").attr("stroke-width", 0.7)
    .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.cluster} · #${d.rank_overall}</div>` +
      `<div class="row"><span class="k">Total collaborations</span><span class="v">${QT.fmt.int(d.collab_total)}</span></div>` +
      `<div class="row"><span class="k">External share</span><span class="v">${QT.fmt.pct0(d.external_pct)}</span></div>` +
      `<div class="row"><span class="k">Brokerage</span><span class="v">${d.brokerage.toFixed(3)}</span></div>`, e))
    .on("mouseleave", tt.hide);

  const regions = [...new Set(rows.map(d => d.region))];
  QT.legend(S.legend, regions.map(rg => ({ key: rg, label: rg, color: QT.palette.region[rg] || "#889" })));
};
