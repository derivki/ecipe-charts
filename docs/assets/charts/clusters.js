/* Cluster dashboard (Layer 2) — map + sortable table + detail bars + re-weighting
   sliders + clusters-vs-non-clusters share over time.
   Real: cluster names, company counts, funding, real-world coordinates
   (docs/data/mock_cluster_rankings.json — only the 3 dimension scores are mock).
   Mock: market/collaboration/maturity dimension scores, composite ranking, and
   the historical path of the share-over-time chart (its final-year value is real
   — see docs/data/mock_cluster_share_time.json meta.source_note). */
(async function () {
  QT.injectCSS();
  QT.nav("#nav", "clusters");

  const [rankings, shareTime, worldTopo] = await Promise.all([
    QT.loadData("mock_cluster_rankings"),
    QT.loadData("mock_cluster_share_time"),
    fetch("assets/vendor/world-atlas-110m.json").then(r => r.json()),
  ]);
  const land = topojson.feature(worldTopo, worldTopo.objects.countries).features.filter(f => f.properties.name !== "Antarctica");
  QT.vintage("#vintage", { data_vintage: rankings.meta.data_vintage });
  document.getElementById("badge-clusters").innerHTML = QT.mockBadge();
  document.getElementById("badge-time").innerHTML = QT.mockBadge();
  document.getElementById("mocknote-clusters").innerHTML = rankings.meta.source_note;

  const tt = QT.tooltip();
  const DIMS = [
    { key: "market_orientation", label: "Market orientation" },
    { key: "collaboration_intensity", label: "Collaboration intensity" },
    { key: "ecosystem_maturity", label: "Ecosystem maturity" },
  ];
  const REGIONS = ["All", ...Array.from(new Set(rankings.data.map(d => d.region)))];
  const TH_LABELS = {
    rank: "#", cluster: "Cluster", region: "Region", companies: "Companies", total_funding: "Funding",
    market_orientation: "Market", collaboration_intensity: "Collab.", ecosystem_maturity: "Maturity", composite: "Composite",
  };

  let state = {
    region: "All",
    weights: { market_orientation: 1, collaboration_intensity: 1, ecosystem_maturity: 1 },
    sortKey: "composite", sortDir: "desc",
    selected: rankings.data[0].cluster,
  };

  function composite(d) {
    const w = state.weights, tot = w.market_orientation + w.collaboration_intensity + w.ecosystem_maturity || 1;
    return (d.market_orientation * w.market_orientation + d.collaboration_intensity * w.collaboration_intensity + d.ecosystem_maturity * w.ecosystem_maturity) / tot;
  }

  function rows() {
    const filtered = rankings.data.filter(d => state.region === "All" || d.region === state.region);
    const withComposite = filtered.map(d => ({ ...d, composite: composite(d) }));
    const key = state.sortKey, dir = state.sortDir === "asc" ? 1 : -1;
    withComposite.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
    withComposite.forEach((d, i) => d.rank = i + 1);
    return withComposite;
  }

  // ---------- region chips ----------
  d3.select("#region-chips").selectAll(".chip").data(REGIONS).join("span")
    .attr("class", "chip").classed("on", d => d === state.region)
    .text(d => d)
    .on("click", (e, d) => { state.region = d; renderAll(); });

  // ---------- sliders ----------
  const sliderSel = d3.select("#sliders").selectAll(".sliderow").data(DIMS).join(enter => {
    const row = enter.append("div").attr("class", "sliderow");
    row.append("label").html(d => `<i style="background:${QT.palette.dimension[d.key]}"></i>${d.label}`);
    row.append("input").attr("type", "range").attr("min", 0).attr("max", 100)
      .attr("value", d => state.weights[d.key] * 50)
      .on("input", function (e, d) { state.weights[d.key] = +this.value / 50 || 0.001; renderAll(); });
    row.append("div").attr("class", "pctval");
    return row;
  });

  function updateSliderLabels() {
    const w = state.weights, tot = w.market_orientation + w.collaboration_intensity + w.ecosystem_maturity;
    sliderSel.select(".pctval").text(d => QT.fmt.pct0(w[d.key] / tot));
  }

  // ---------- map ----------
  function renderMap() {
    const rs = rows();
    const W = 880, H = 380;
    d3.select("#chart-map").selectAll("*").remove();
    const c = QT.chart("#chart-map", { W, H, margin: { t: 6, r: 6, b: 6, l: 6 } });
    c.svg.style("overflow", "hidden"); // land/graticule extend past the viewBox at tight regional zoom — clip to the frame
    const fc = { type: "FeatureCollection", features: rs.map(d => ({ type: "Feature", geometry: { type: "Point", coordinates: [d.lon, d.lat] } })) };
    const projection = d3.geoEquirectangular().fitExtent([[14, 14], [c.iw - 14, c.ih - 14]], fc);
    const path = d3.geoPath(projection);
    const graticule = d3.geoGraticule().step([30, 30]);

    c.g.append("path").datum({ type: "Sphere" }).attr("d", path).attr("fill", QT.tokens.panel).attr("stroke", "none");
    c.g.selectAll("path.land").data(land).join("path").attr("class", "land")
      .attr("d", path).attr("fill", "#E4E9EE").attr("stroke", "#fff").attr("stroke-width", 0.5);
    c.g.append("path").datum(graticule()).attr("d", path).attr("fill", "none").attr("stroke", QT.tokens.line).attr("stroke-width", 0.6);

    const rFund = d3.scaleSqrt().domain([0, d3.max(rankings.data, d => d.total_funding)]).range([4, 26]);
    const colorScale = d3.scaleSequential(d3.interpolateRgbBasis(QT.palette.sequential)).domain([d3.min(rs, composite) - 5, d3.max(rs, composite) + 5]);

    c.g.selectAll("circle").data(rs, d => d.cluster).join("circle")
      .attr("cx", d => projection([d.lon, d.lat])[0]).attr("cy", d => projection([d.lon, d.lat])[1])
      .attr("r", d => rFund(d.total_funding))
      .attr("fill", d => colorScale(composite(d))).attr("fill-opacity", 0.85)
      .attr("stroke", d => d.cluster === state.selected ? QT.tokens.ink : "#fff")
      .attr("stroke-width", d => d.cluster === state.selected ? 2.5 : 1)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.cluster}</div>` +
        `<div class="row"><span class="k">Funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${d.companies}</span></div>` +
        `<div class="row"><span class="k">Composite</span><span class="v">${composite(d).toFixed(0)}</span></div>`, e))
      .on("mouseleave", tt.hide)
      .on("click", (e, d) => { state.selected = d.cluster; renderAll(); });
  }

  // ---------- table ----------
  function renderTable() {
    const rs = rows();
    const tbody = d3.select("#rtable tbody");
    const tr = tbody.selectAll("tr").data(rs, d => d.cluster).join("tr")
      .classed("sel", d => d.cluster === state.selected)
      .style("cursor", "pointer")
      .on("click", (e, d) => { state.selected = d.cluster; renderAll(); });

    tr.selectAll("td").data(d => [
      d.rank, d.cluster, d.region, QT.fmt.int(d.companies), QT.fmt.money(d.total_funding),
      d.market_orientation, d.collaboration_intensity, d.ecosystem_maturity, composite(d).toFixed(0),
    ]).join("td")
      .attr("class", (d, i) => [0, 3, 4, 5, 6, 7, 8].includes(i) ? "num" : null)
      .text(d => d);

    d3.select("#rtable thead").selectAll("th").each(function () {
      const th = d3.select(this), key = th.attr("data-k");
      const label = TH_LABELS[key];
      const on = key === state.sortKey;
      th.classed("sorted", on).html(`${label}${on ? ` <span class="arrow">${state.sortDir === "asc" ? "▲" : "▼"}</span>` : ""}`);
    });
  }

  // ---------- cluster detail bars ----------
  function renderDetail() {
    const d = rankings.data.find(x => x.cluster === state.selected);
    d3.select("#ttl-clusterdetail").text(`Cluster detail — ${d.cluster}`);
    const rs = DIMS.map(dim => ({ ...dim, v: d[dim.key] }));

    const W = 880, H = 150;
    d3.select("#chart-dimbars").selectAll("*").remove();
    const c = QT.chart("#chart-dimbars", { W, H, margin: { t: 4, r: 40, b: 20, l: 170 } });
    const x = d3.scaleLinear().domain([0, 100]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(r => r.label)).range([0, c.ih]).padding(0.3);

    c.gPlot.selectAll("rect").data(rs, r => r.key).join("rect")
      .attr("x", 0).attr("y", r => y(r.label)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", r => QT.palette.dimension[r.key]).attr("width", r => x(r.v))
      .on("mousemove", (e, r) => tt.show(`<div class="hd">${r.label}</div><div class="row"><span class="v">${r.v} / 100</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rs, r => r.key).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", r => y(r.label) + y.bandwidth() / 2).attr("x", r => x(r.v) + 6).text(r => r.v);
    c.gx.call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  // ---------- share over time ----------
  function renderShareTime() {
    const rowsT = shareTime.data;
    const SERIES = [
      { key: "cluster", label: "In a named cluster", color: QT.tokens.accent },
      { key: "other", label: "Elsewhere", color: QT.tokens.line },
    ];
    const st = d3.stack().keys(["cluster", "other"])(rowsT.map(r => ({ year: r.year, cluster: r.cluster_share, other: 1 - r.cluster_share })));

    const W = 880, H = 220;
    d3.select("#chart-sharetime").selectAll("*").remove();
    const c = QT.chart("#chart-sharetime", { W, H, margin: { t: 8, r: 12, b: 26, l: 46 } });
    const x = d3.scaleBand().domain(rowsT.map(r => r.year)).range([0, c.iw]).padding(0.15);
    const y = d3.scaleLinear().domain([0, 1]).range([c.ih, 0]);

    c.gGrid.selectAll("line").data(y.ticks(4)).join("line").attr("class", "gridline")
      .attr("x1", 0).attr("x2", c.iw).attr("y1", d => y(d)).attr("y2", d => y(d));

    SERIES.forEach((s, i) => {
      c.gPlot.selectAll(`.seg-${s.key}`).data(st[i], d => d.data.year).join("rect")
        .attr("class", `seg-${s.key}`).attr("x", d => x(d.data.year)).attr("width", x.bandwidth())
        .attr("y", d => y(d[1])).attr("height", d => y(d[0]) - y(d[1])).attr("fill", s.color)
        .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.data.year}</div><div class="row"><span class="k">${s.label}</span><span class="v">${QT.fmt.pct1(d[1] - d[0])}</span></div>`, e))
        .on("mouseleave", tt.hide);
    });
    c.gx.call(d3.axisBottom(x).tickValues(rowsT.map(r => r.year).filter(y => y % 2 === 0 || y === rowsT[rowsT.length - 1].year)).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(4).tickFormat(QT.fmt.pct0).tickSizeOuter(0));
    QT.legend("#legend-sharetime", SERIES);
  }

  function renderAll() {
    d3.select("#region-chips").selectAll(".chip").classed("on", d => d === state.region);
    updateSliderLabels();
    renderMap(); renderTable(); renderDetail(); renderShareTime();
  }

  d3.select("#rtable thead").selectAll("th").on("click", function () {
    const key = d3.select(this).attr("data-k");
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = key; state.sortDir = "desc"; }
    renderAll();
  });

  renderAll();
})();
