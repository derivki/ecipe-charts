/* Cluster dashboard (Layer 2) — map + sortable ranking table + detail bars +
   clusters-vs-non-clusters share over time.
   Real: cluster names, company counts, funding, real-world coordinates
   (docs/data/mock_cluster_rankings.json — only the 3 dimension scores are mock).
   Mock: market/collaboration/maturity dimension scores, and the historical path
   of the share-over-time chart (its final-year value is real — see
   docs/data/mock_cluster_share_time.json meta.source_note).
   The table and map show each cluster's RANK (1 = best of 15) on every pillar,
   not the raw 0-100 score — ranking is a more defensible read of an illustrative
   placeholder score than an arbitrarily-weighted composite would be. The overall
   rank is simply the average of the three pillar ranks (no weighting). */
(async function () {
  QT.injectCSS();
  QT.nav("#nav", "clusters");

  // Vendored SVG flags (assets/vendor/flags/<code>.svg) — used instead of flag
  // emoji because Windows browser/font combinations often render flag emoji as
  // plain two-letter codes rather than a pictorial flag.
  function flagIcon(code, country) {
    return `<img class="flag" src="assets/vendor/flags/${code.toLowerCase()}.svg" width="16" height="12" alt="${country}" title="${country}">`;
  }

  const [rankings, shareTime, pipeline, worldTopo] = await Promise.all([
    QT.loadData("mock_cluster_rankings"),
    QT.loadData("mock_cluster_share_time"),
    QT.loadData("quasi_cluster_pipeline"),
    fetch("assets/vendor/world-atlas-110m.json").then(r => r.json()),
  ]);
  const land = topojson.feature(worldTopo, worldTopo.objects.countries).features.filter(f => f.properties.name !== "Antarctica");
  QT.vintage("#vintage", { data_vintage: rankings.meta.data_vintage });
  document.getElementById("badge-clusters").innerHTML = QT.mockBadge();
  document.getElementById("badge-time").innerHTML = QT.mockBadge();
  document.getElementById("badge-pipeline").innerHTML = QT.citeBadge();
  document.getElementById("mocknote-clusters").innerHTML = rankings.meta.source_note;
  QT.citeNote("#citenote-pipeline", pipeline.meta.source_note);

  const tt = QT.tooltip();
  const DIMS = [
    { key: "market_orientation", rankKey: "market_rank", label: "Market orientation" },
    { key: "collaboration_intensity", rankKey: "collab_rank", label: "Collaboration intensity" },
    { key: "ecosystem_maturity", rankKey: "maturity_rank", label: "Ecosystem maturity" },
  ];
  const N = rankings.data.length;
  const REGIONS = ["All", ...Array.from(new Set(rankings.data.map(d => d.region)))];
  const TH_LABELS = {
    overall_rank: "#", cluster: "Cluster", region: "Region", companies: "Companies", total_funding: "Funding",
    market_rank: "Market", collab_rank: "Collab.", maturity_rank: "Maturity",
  };

  // ---------- rank each cluster on every pillar, once, from the full 15-cluster
  // set (not the region-filtered view) so a pillar rank always reads "n of 15"
  // regardless of which region chip is active. Overall rank = average of the
  // three pillar ranks — no weights.
  (function assignRanks(data) {
    DIMS.forEach(dim => {
      [...data].sort((a, b) => b[dim.key] - a[dim.key] || a.cluster.localeCompare(b.cluster))
        .forEach((d, i) => { d[dim.rankKey] = i + 1; });
    });
    [...data].sort((a, b) => {
      const avgA = DIMS.reduce((s, dim) => s + a[dim.rankKey], 0) / DIMS.length;
      const avgB = DIMS.reduce((s, dim) => s + b[dim.rankKey], 0) / DIMS.length;
      return avgA - avgB || b.total_funding - a.total_funding;
    }).forEach((d, i) => { d.overall_rank = i + 1; });
  })(rankings.data);

  let state = {
    region: "All",
    sortKey: "overall_rank", sortDir: "asc",
    selected: rankings.data[0].cluster,
  };

  function rows() {
    const filtered = rankings.data.filter(d => state.region === "All" || d.region === state.region);
    const key = state.sortKey, dir = state.sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  }

  // ---------- region chips ----------
  d3.select("#region-chips").selectAll(".chip").data(REGIONS).join("span")
    .attr("class", "chip").classed("on", d => d === state.region)
    .text(d => d)
    .on("click", (e, d) => { state.region = d; renderAll(); });

  // ---------- map ----------
  // Compute the d3.zoom transform that frames a region's clusters. "All" (or an
  // empty set) resets to the full-world view; any region fits its cluster points
  // — padded — into the plot, so picking a chip zooms straight to that region
  // instead of leaving a few dots stranded on a world map.
  function regionTransform(pts, iw, ih) {
    if (state.region === "All" || pts.length === 0) return d3.zoomIdentity;
    let x0 = d3.min(pts, p => p[0]), x1 = d3.max(pts, p => p[0]);
    let y0 = d3.min(pts, p => p[1]), y1 = d3.max(pts, p => p[1]);
    const padX = (x1 - x0) * 0.4 + 48, padY = (y1 - y0) * 0.4 + 48;
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    const k = Math.max(1, Math.min(8, 0.95 * Math.min(iw / (x1 - x0), ih / (y1 - y0))));
    return d3.zoomIdentity.translate(iw / 2 - k * (x0 + x1) / 2, ih / 2 - k * (y0 + y1) / 2).scale(k);
  }

  function renderMap() {
    const rs = rows();
    const W = 880, H = 380;
    d3.select("#chart-map").selectAll("*").remove();
    const c = QT.chart("#chart-map", { W, H, margin: { t: 6, r: 6, b: 6, l: 6 } });
    c.svg.style("overflow", "hidden");
    // Base projection always fits the full world land mass (not the filtered
    // points, which distorts) — region focus is applied afterwards as a zoom
    // transform on the gZoom layer, so geography never warps.
    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath(projection);
    projection.fitExtent([[10, 10], [c.iw - 10, c.ih - 14]], { type: "FeatureCollection", features: land });
    const graticule = d3.geoGraticule().step([30, 30]);

    const gZoom = c.g.append("g");
    gZoom.append("path").datum({ type: "Sphere" }).attr("d", path).attr("fill", QT.tokens.panel).attr("stroke", "none");
    gZoom.selectAll("path.land").data(land).join("path").attr("class", "land")
      .attr("d", path).attr("fill", "#E4E9EE").attr("stroke", "#fff").attr("stroke-width", 0.5);
    gZoom.append("path").datum(graticule()).attr("d", path).attr("fill", "none").attr("stroke", QT.tokens.line).attr("stroke-width", 0.6);

    const rFund = d3.scaleSqrt().domain([0, d3.max(rankings.data, d => d.total_funding)]).range([4, 26]);
    // Reversed domain: rank 1 (best) gets the darkest end of the sequential ramp.
    const colorScale = d3.scaleSequential(d3.interpolateRgbBasis(QT.palette.sequential)).domain([N, 1]);

    // Several real clusters (e.g. Washington/New York/Boston/Toronto, or
    // Shenzhen/Hefei/Beijing) sit close enough together that at world-map
    // scale their bubbles would fully overlap and look like a single blob.
    // A one-shot force layout nudges overlapping bubbles apart while a weak
    // pull keeps each one anchored near its true geographic position.
    const nodes = rs.map(d => {
      const [px, py] = projection([d.lon, d.lat]);
      return { ...d, x: px, y: py, x0: px, y0: py };
    });
    const sim = d3.forceSimulation(nodes)
      .force("x", d3.forceX(d => d.x0).strength(0.25))
      .force("y", d3.forceY(d => d.y0).strength(0.25))
      .force("collide", d3.forceCollide(d => rFund(d.total_funding) + 1.5))
      .stop();
    for (let i = 0; i < 300; i++) sim.tick();

    gZoom.selectAll("circle").data(nodes, d => d.cluster).join("circle")
      .attr("cx", d => d.x).attr("cy", d => d.y)
      .attr("r", d => rFund(d.total_funding))
      .attr("fill", d => colorScale(d.overall_rank)).attr("fill-opacity", 0.85)
      .attr("stroke", d => d.cluster === state.selected ? QT.tokens.ink : "#fff")
      .attr("stroke-width", d => d.cluster === state.selected ? 2.5 : 1)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.cluster}</div>` +
        `<div class="row"><span class="k">Funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${d.companies}</span></div>` +
        `<div class="row"><span class="k">Overall rank</span><span class="v">#${d.overall_rank} of ${N}</span></div>`, e))
      .on("mouseleave", tt.hide)
      .on("click", (e, d) => { state.selected = d.cluster; renderAll(); });

    // Pan/zoom on the gZoom layer, plus programmatic region framing. Bubble
    // radii/strokes are counter-scaled so they keep a constant screen size as
    // you zoom into a dense region.
    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", ev => {
      gZoom.attr("transform", ev.transform);
      gZoom.selectAll("circle")
        .attr("r", d => rFund(d.total_funding) / ev.transform.k)
        .attr("stroke-width", d => (d.cluster === state.selected ? 2.5 : 1) / ev.transform.k);
      gZoom.selectAll("path.land").attr("stroke-width", 0.5 / ev.transform.k);
    });
    c.svg.call(zoom);

    // Frame the selected region immediately (no transition) so the zoom is
    // applied even in environments that throttle requestAnimationFrame; the
    // manual zoom buttons animate for a smoother feel where rAF is available.
    const target = regionTransform(nodes.map(d => [d.x0, d.y0]), c.iw, c.ih);
    c.svg.call(zoom.transform, target);

    d3.select("#map-zin").on("click", () => c.svg.transition().duration(300).call(zoom.scaleBy, 1.6));
    d3.select("#map-zout").on("click", () => c.svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6));
    d3.select("#map-zreset").on("click", () => c.svg.call(zoom.transform, target));
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
      d.overall_rank, `${flagIcon(d.country_code, d.country)} ${d.cluster}`, d.region, QT.fmt.int(d.companies), QT.fmt.money(d.total_funding),
      d.market_rank, d.collab_rank, d.maturity_rank,
    ]).join("td")
      .attr("class", (d, i) => [0, 3, 4, 5, 6, 7].includes(i) ? "num" : null)
      .html(d => d);

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
    const rs = DIMS.map(dim => ({ ...dim, v: d[dim.key], rank: d[dim.rankKey] }));

    const W = 880, H = 150;
    d3.select("#chart-dimbars").selectAll("*").remove();
    const c = QT.chart("#chart-dimbars", { W, H, margin: { t: 4, r: 40, b: 20, l: 170 } });
    const x = d3.scaleLinear().domain([0, 100]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(r => r.label)).range([0, c.ih]).padding(0.3);

    c.gPlot.selectAll("rect").data(rs, r => r.key).join("rect")
      .attr("x", 0).attr("y", r => y(r.label)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", r => QT.palette.dimension[r.key]).attr("width", r => x(r.v))
      .on("mousemove", (e, r) => tt.show(`<div class="hd">${r.label}</div><div class="row"><span class="v">${r.v} / 100 · rank ${r.rank} of ${N}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rs, r => r.key).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", r => y(r.label) + y.bandwidth() / 2).attr("x", r => x(r.v) + 6).text(r => r.v);
    c.gx.call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  // ---------- share over time ----------
  const SHARE_YEARS = shareTime.data.map(r => r.year);
  let shareWin = [SHARE_YEARS[0], SHARE_YEARS[SHARE_YEARS.length - 1]];
  function renderShareTime() {
    const rowsT = shareTime.data.filter(r => r.year >= shareWin[0] && r.year <= shareWin[1]);
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

  // ---------- established clusters vs. quasi-cluster pipeline ----------
  function renderPipeline() {
    const SERIES = [
      { key: "established", label: "Established clusters (of 45)", color: QT.tokens.accent },
      { key: "quasi", label: "Quasi-clusters (of 86)", color: QT.tokens.line },
    ];
    // Sorted so the regions with the largest untapped pipeline (relative to what
    // they've already turned into full clusters) read top-to-bottom.
    const rs = [...pipeline.data].sort((a, b) => (b.quasi / (b.quasi + b.established)) - (a.quasi / (a.quasi + a.established)));

    const W = 880, H = 40 + rs.length * 46;
    d3.select("#chart-pipeline").selectAll("*").remove();
    const c = QT.chart("#chart-pipeline", { W, H, margin: { t: 24, r: 90, b: 6, l: 190 } });
    const x = d3.scaleLinear().domain([0, 1]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(r => r.region)).range([0, c.ih]).padding(0.35);

    // c.gx is pinned to the bottom of the plot by QT.chart; this axis belongs on
    // top, so it gets its own group at the origin instead of reusing c.gx.
    c.g.append("g").attr("class", "axis").call(d3.axisTop(x).ticks(5).tickFormat(QT.fmt.pct0).tickSizeOuter(0));
    c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
      .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", c.ih);

    const st = d3.stack().keys(SERIES.map(s => s.key))(rs.map(r => {
      const tot = r.established + r.quasi;
      return { region: r.region, established: r.established / tot, quasi: r.quasi / tot, raw: r };
    }));

    SERIES.forEach((s, i) => {
      c.gPlot.selectAll(`.seg-${s.key}`).data(st[i], d => d.data.region).join("rect")
        .attr("class", `seg-${s.key}`).attr("y", d => y(d.data.region)).attr("height", y.bandwidth())
        .attr("x", d => x(d[0])).attr("width", d => x(d[1]) - x(d[0])).attr("fill", s.color)
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${d.data.region}</div>` +
          `<div class="row"><span class="k">${s.label}</span><span class="v">${d.data.raw[s.key]}</span></div>`, e))
        .on("mouseleave", tt.hide);
    });

    c.gPlot.selectAll("text.pipeline-ratio").data(rs, r => r.region).join("text")
      .attr("class", "pipeline-ratio").attr("x", c.iw + 8).attr("y", r => y(r.region) + y.bandwidth() / 2)
      .attr("dy", "0.32em").style("font-size", "11.5px").style("font-weight", 700).style("fill", QT.tokens.ink)
      .text(r => QT.fmt.pct0(r.quasi / (r.quasi + r.established)) + " pipeline");

    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    QT.legend("#legend-pipeline", SERIES);
  }

  function renderAll() {
    d3.select("#region-chips").selectAll(".chip").classed("on", d => d === state.region);
    renderMap(); renderTable(); renderDetail(); renderShareTime();
  }

  d3.select("#rtable thead").selectAll("th").on("click", function () {
    const key = d3.select(this).attr("data-k");
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = key; state.sortDir = "desc"; }
    renderAll();
  });

  renderAll();
  renderPipeline(); // static — doesn't depend on region filter or table sort/selection
  QT.timeSlider("#slider-sharetime", { years: SHARE_YEARS, onChange: w => { shareWin = w; renderShareTime(); } });
})();
