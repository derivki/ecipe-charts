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
QT.boot(async function () {
  QT.nav("#nav", "clusters");

  const [rankings, shareTime, fundingByCluster, fundingByCountry, quasiFunding, codes, worldTopo] = await Promise.all([
    QT.loadData("mock_cluster_rankings"),
    QT.loadData("mock_cluster_share_time"),
    QT.loadData("funding_by_cluster"),
    QT.loadData("funding_by_country"),
    QT.loadData("mock_quasi_cluster_funding"),
    QT.loadData("country_codes"),
    fetch("assets/vendor/world-atlas-110m.json").then(r => r.json()),
    QT.loadFlags(),
  ]);
  // Flags now come from the shared QT.flag() (chart-template.js) rather than a private
  // copy in this file — three more panels needed them after Elena's 2026-09-08 list.
  const flagIcon = (code, country) => QT.flag(country, { code });
  const land = topojson.feature(worldTopo, worldTopo.objects.countries).features.filter(f => f.properties.name !== "Antarctica");
  QT.vintage("#vintage", { data_vintage: rankings.meta.data_vintage });
  document.getElementById("badge-clusters").innerHTML = QT.mockBadge();
  document.getElementById("badge-time").innerHTML = QT.mockBadge();
  document.getElementById("badge-graduates").innerHTML = QT.mockBadge();
  // Figure 4 mixes real cluster/region funding totals with an illustrative
  // quasi-cluster split (mock_quasi_cluster_funding.json -- see its own
  // source_note), so it now carries the small mock badge like the rest of the
  // page's illustrative panels, not the "published source" cite badge it had
  // when it showed only the paper's real established/quasi COUNTS.
  document.getElementById("badge-pipeline").innerHTML = QT.mockBadge();

  const tt = QT.tooltip();
  const DIMS = [
    { key: "market_orientation", rankKey: "market_rank", label: "Market orientation" },
    { key: "collaboration_intensity", rankKey: "collab_rank", label: "Collaboration intensity" },
    { key: "ecosystem_maturity", rankKey: "maturity_rank", label: "Ecosystem maturity" },
  ];
  const N = rankings.data.length;

  /* GEOGRAPHICAL AREAS (the map's zoom buttons) are NOT the tracker's regions.
     Elena drew this distinction deliberately — "I called them geographical areas and
     not regions on purpose in the map subtitle" — so the two live apart here:

       • These five drive the map only, and are defined by LON/LAT BOUNDS rather than by
         the dataset's `region` field. Bounds are what let her requirements hold: Europe
         is drawn wide enough to include Israel, and Oceania wide enough to include
         Singapore, so every cluster is reachable from some button. Classifying by the
         data's own region strings could not express that — Israel and Singapore both
         sit in a catch-all "Other" there.
       • The RANKING TABLE uses the usual US / China / EU / UK+AUS+CAN / RoW, looked up
         per country from country_codes.json. See `usualRegion` below. */
  const AREAS = [
    { key: "World",         bounds: null },
    { key: "Europe",        bounds: [[-11, 28], [42, 71]] },   // west of Ireland to Israel
    { key: "North America", bounds: [[-140, 14], [-52, 60]] },
    { key: "East Asia",     bounds: [[100, 20], [146, 46]] },
    { key: "Oceania",       bounds: [[100, -47], [180, 2]] },  // includes Singapore
  ];
  const REGIONS = AREAS.map(a => a.key);
  const inArea = (d, key) => {
    const area = AREAS.find(a => a.key === key);
    if (!area || !area.bounds) return true;
    const [[w, s2], [e, n]] = area.bounds;
    return d.lon >= w && d.lon <= e && d.lat >= s2 && d.lat <= n;
  };

  /* Country names normalised to the tracker's canonical short labels. The cluster
     dataset spells them out ("United States"), while every other dataset, the region
     lookup and the flag table use "US" / "UK". Elena's list asks for the short forms on
     display ("let's use US and EU, not United States and European Union"), and without
     normalising, the Region lookup silently missed the three biggest countries and fell
     through to "RoW". */
  const CANON = {
    "United States": "US", "United States of America": "US",
    "United Kingdom": "UK", "European Union": "EU",
    "Republic of Korea": "South Korea", "Korea": "South Korea",
  };
  const REGION_OF = codes.regions || {};
  rankings.data.forEach(d => {
    d.country = CANON[d.country] || d.country;
    d.usual_region = REGION_OF[d.country] || "RoW";
  });

  const TH_LABELS = {
    overall_rank: "2026 Rank", rank_2025: "2025 Rank", cluster: "Cluster", country: "Country",
    usual_region: "Region", market_rank: "Market Orientation",
    collab_rank: "Collaboration Intensity", maturity_rank: "Ecosystem Maturity",
  };

  // ---------- rank each cluster on every pillar, once, from the full 15-cluster
  // set (not the region-filtered view) so a pillar rank always reads "n of 15"
  // regardless of which region chip is active. Overall rank = average of the
  // three pillar ranks — no weights.
  (function assignRanks(data) {
    DIMS.forEach(dim => {
      [...data].sort(QT.rank(dim.key, "cluster"))
        .forEach((d, i) => { d[dim.rankKey] = i + 1; });
    });
    const pillarAvg = d => DIMS.reduce((s, dim) => s + d[dim.rankKey], 0) / DIMS.length;
    [...data].sort((a, b) =>
      // best (lowest) average pillar rank first, then larger funding, then alphabetical
      pillarAvg(a) - pillarAvg(b) ||
      (b.total_funding - a.total_funding) ||
      QT.alpha(a.cluster, b.cluster)
    ).forEach((d, i) => { d.overall_rank = i + 1; });
  })(rankings.data);

  let state = {
    region: "World",
    sortKey: "overall_rank", sortDir: "asc",
    selected: rankings.data[0].cluster,
  };

  // The map's region chips zoom the map ONLY. They used to also filter the ranking
  // table (and were wired to re-render the share-over-time chart, which never even
  // read `state.region`) — picking "Oceania" silently emptied Table 1 along with it,
  // which is not what a map zoom control should do. `mapRows()` feeds the map;
  // `tableRows()` always sees the full 15-cluster set, sorted only.
  function mapRows() {
    return rankings.data.filter(d => inArea(d, state.region));
  }
  function tableRows() {
    // Ties always fall back to cluster name, so clicking a column with many equal
    // values (e.g. a pillar rank) gives a stable, alphabetical order either way.
    return [...rankings.data].sort(QT.rank(state.sortKey, "cluster", state.sortDir));
  }

  // ---------- region chips (map only) ----------
  d3.select("#region-chips").selectAll(".chip").data(REGIONS).join("span")
    .attr("class", "chip").classed("on", d => d === state.region)
    .text(d => d)
    .on("click", (e, d) => {
      state.region = d;
      d3.select("#region-chips").selectAll(".chip").classed("on", r => r === state.region);
      renderMap();
    });

  // ---------- map ----------
  // Compute the d3.zoom transform that frames a region's clusters. "All" (or an
  // empty set) resets to the full-world view; any region fits its cluster points
  // — padded — into the plot, so picking a chip zooms straight to that region
  // instead of leaving a few dots stranded on a world map.
  function regionTransform(pts, iw, ih, projection) {
    if (state.region === "World") return d3.zoomIdentity;
    let x0, x1, y0, y1;
    if (pts.length) {
      x0 = d3.min(pts, p => p[0]); x1 = d3.max(pts, p => p[0]);
      y0 = d3.min(pts, p => p[1]); y1 = d3.max(pts, p => p[1]);
    } else {
      // No cluster currently falls inside this area (e.g. Oceania — the 15-cluster
      // ranking has no member there yet) — frame the area's own geographic bounds
      // instead of the (empty) cluster extent, so the button still zooms somewhere
      // instead of silently doing nothing.
      const area = AREAS.find(a => a.key === state.region);
      if (!area || !area.bounds) return d3.zoomIdentity;
      const [[w, s2], [e, n]] = area.bounds;
      const corners = [[w, s2], [w, n], [e, s2], [e, n]].map(projection);
      x0 = d3.min(corners, p => p[0]); x1 = d3.max(corners, p => p[0]);
      y0 = d3.min(corners, p => p[1]); y1 = d3.max(corners, p => p[1]);
    }
    const padX = (x1 - x0) * 0.4 + 48, padY = (y1 - y0) * 0.4 + 48;
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    const k = Math.max(1, Math.min(8, 0.95 * Math.min(iw / (x1 - x0), ih / (y1 - y0))));
    return d3.zoomIdentity.translate(iw / 2 - k * (x0 + x1) / 2, ih / 2 - k * (y0 + y1) / 2).scale(k);
  }

  function renderMap() {
    const rs = mapRows();
    // Matched to the Overview world map (world_map.js), which renders the same
    // geoNaturalEarth1 projection at this size. Elena read the Overview map as
    // "more zoomed in at the world level" and preferred it — same projection,
    // it was simply 1180x560 against this panel's old 880x380. The extra room
    // also buys roughly 1.8x the plot area for the bubbles, which is most of
    // what keeps them near their true positions at world zoom (see relax()).
    const W = 1180, H = 560;
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
      .attr("d", path).attr("fill", QT.tokens.noData).attr("stroke", "#fff").attr("stroke-width", 0.5);
    gZoom.append("path").datum(graticule()).attr("d", path).attr("fill", "none").attr("stroke", QT.tokens.line).attr("stroke-width", 0.6);

    const rFund = d3.scaleSqrt().domain([0, d3.max(rankings.data, d => d.total_funding)]).range([4, 26]);
    // Dark blue (best) -> orange (worst), matching the Clusters paper's own figures so
    // a reader moving between the paper and the tracker sees one encoding. Reversed
    // domain because rank 1 is the BEST and takes the dark-blue end.
    // domain([1, N]): rank 1 (best) -> t=0 -> the first (dark blue) palette colour;
    // rank N (worst) -> t=1 -> the last (orange) colour. This was previously
    // domain([N, 1]), which is backwards for scaleSequential (t runs d0->d1 as
    // 0->1, not the other way round) and had San Francisco and other rank-1
    // clusters rendering orange -- the legend was correct, the bubbles were not.
    const colorScale = d3.scaleSequential(d3.interpolateRgbBasis(QT.palette.clusterRank)).domain([1, N]);

    // The why-text above the map states the colour encoding in words, but with no
    // visual key a reader who lands straight on the map just sees bubbles in five
    // unexplained colours. Idempotent (append once, then just update the label)
    // because renderMap() re-runs on every region/selection change, and the DOM
    // node lives in #map-wrap rather than inside the <svg> so it survives the
    // svg's own selectAll("*").remove() above.
    let legend = d3.select("#map-wrap .cmap-legend");
    if (legend.empty()) legend = d3.select("#map-wrap").append("div").attr("class", "cmap-legend");
    legend.html(
      `<div class="lg-title">Overall rank</div>` +
      `<div class="lg-bar" style="background:linear-gradient(to right, ${QT.palette.clusterRank.join(",")})"></div>` +
      `<div class="lg-scale"><span>1 (best)</span><span>${N} (lowest)</span></div>`);

    // Several real clusters (e.g. Washington/New York/Boston/Toronto, or
    // Shenzhen/Hefei/Beijing) sit close enough together that at world-map
    // scale their bubbles would fully overlap and look like a single blob, so
    // a force layout nudges them apart while a pull keeps each one anchored
    // near its true geographic position.
    //
    // THE RELAXATION RUNS IN SCREEN SPACE, AT THE LIVE ZOOM LEVEL, and this is
    // the whole point. Bubble radii are counter-scaled by 1/k below so they
    // keep a constant on-screen size as you zoom; separating them once in data
    // space at k=1 therefore baked the world-view displacement — the largest
    // it ever needs to be — into every zoom level, and it never relaxed. The
    // visible symptom was clusters sitting in open ocean (Boston pushed east
    // into the Atlantic, Paris west into it) and *staying* there however far
    // you zoomed into a region with room to spare. Separating in screen space
    // and dividing the resulting offset by k means the displacement shrinks as
    // you zoom in, so each bubble converges on its real coordinates.
    const nodes = rs.map(d => {
      const [px, py] = projection([d.lon, d.lat]);
      return { ...d, x: px, y: py, x0: px, y0: py };
    });
    // Warm-started across zoom events: each relaxation begins from the previous
    // solution, so ~60 ticks converge and the bubbles slide rather than jump.
    const sim = d3.forceSimulation(nodes)
      .force("x", d3.forceX(d => d.sx0).strength(0.7))
      .force("y", d3.forceY(d => d.sy0).strength(0.7))
      .force("collide", d3.forceCollide(d => rFund(d.total_funding) + 1.5))
      .stop();

    // Relax at transform `t`, then convert the screen-space offset back into
    // data space so the SVG zoom transform on gZoom renders it correctly.
    function relax(t, ticks) {
      nodes.forEach(d => {
        d.sx0 = t.applyX(d.x0);
        d.sy0 = t.applyY(d.y0);
        if (d.sx === undefined) { d.sx = d.sx0; d.sy = d.sy0; }
        d.x = d.sx; d.y = d.sy;
      });
      sim.nodes(nodes).alpha(0.9);
      for (let i = 0; i < ticks; i++) sim.tick();
      nodes.forEach(d => {
        d.sx = d.x; d.sy = d.y;
        d.px = d.x0 + (d.x - d.sx0) / t.k;
        d.py = d.y0 + (d.y - d.sy0) / t.k;
      });
    }

    // Cold start at the world view: no previous solution to warm from, so give
    // it enough ticks to settle properly. Applying the region transform below
    // re-relaxes through the zoom handler.
    relax(d3.zoomIdentity, 300);

    gZoom.selectAll("circle").data(nodes, d => d.cluster).join("circle")
      .attr("cx", d => d.px).attr("cy", d => d.py)
      .attr("r", d => rFund(d.total_funding))
      .attr("fill", d => colorScale(d.overall_rank)).attr("fill-opacity", 0.85)
      .attr("stroke", d => d.cluster === state.selected ? QT.tokens.ink : "#fff")
      .attr("stroke-width", d => d.cluster === state.selected ? 2.5 : 1)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${flagIcon(d.country_code, d.country)}${d.cluster}</div>` +
        `<div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        `<div class="row"><span class="k">Quantum companies</span><span class="v">${QT.fmt.int(d.companies)}</span></div>` +
        `<div class="row"><span class="k">Overall rank</span><span class="v">${d.overall_rank} of ${N}</span></div>`, e))
      .on("mouseleave", tt.hide)
      .on("click", (e, d) => { state.selected = d.cluster; renderSelection(); });

    // Pan/zoom on the gZoom layer, plus programmatic region framing. Bubble
    // radii/strokes are counter-scaled so they keep a constant screen size as
    // you zoom into a dense region.
    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", ev => {
      gZoom.attr("transform", ev.transform);
      // Re-separate at the new scale before repainting, so the offset that
      // keeps bubbles from overlapping is the one this zoom level needs and no
      // more. 44 nodes × 60 warm-started ticks is well under a frame.
      relax(ev.transform, 60);
      gZoom.selectAll("circle")
        .attr("cx", d => d.px).attr("cy", d => d.py)
        .attr("r", d => rFund(d.total_funding) / ev.transform.k)
        .attr("stroke-width", d => (d.cluster === state.selected ? 2.5 : 1) / ev.transform.k);
      gZoom.selectAll("path.land").attr("stroke-width", 0.5 / ev.transform.k);
    });
    c.svg.call(zoom);

    // Frame the selected region immediately (no transition) so the zoom is
    // applied even in environments that throttle requestAnimationFrame; the
    // manual zoom buttons animate for a smoother feel where rAF is available.
    const target = regionTransform(nodes.map(d => [d.x0, d.y0]), c.iw, c.ih, projection);
    c.svg.call(zoom.transform, target);

    d3.select("#map-zin").on("click", () => c.svg.transition().duration(300).call(zoom.scaleBy, 1.6));
    d3.select("#map-zout").on("click", () => c.svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6));
    d3.select("#map-zreset").on("click", () => c.svg.call(zoom.transform, target));
  }

  /* Movement against the 2025 ranking: up, down, or an en dash for no change.
     `rank_2025` DOES NOT EXIST IN THE DATA YET (BACKLOG.md AP-37) — Elena is still
     computing the 2026 ranking and the 2025 table was never stored. Per her
     instruction to build the interface now and feed the real data later, the column,
     the arrows and the NEW badge are all wired up and render "—" until the field
     appears. Deliberately NOT faked: an invented 2025 rank would produce arrows that
     look authoritative and mean nothing. */
  function movement(d) {
    if (d.graduated) return ' <span class="grad-pill">NEW</span>';
    if (d.rank_2025 == null) return "";
    const delta = d.rank_2025 - d.overall_rank;   // positive = moved up the ranking
    if (delta === 0) return ' <span class="mv mv-flat" title="No change since 2025">&ndash;</span>';
    return delta > 0
      ? ` <span class="mv mv-up" title="Up ${delta} since 2025">&#9650;${delta}</span>`
      : ` <span class="mv mv-down" title="Down ${-delta} since 2025">&#9660;${-delta}</span>`;
  }

  // ---------- table ----------
  function renderTable() {
    const rs = tableRows();
    const tbody = d3.select("#rtable tbody");
    const tr = tbody.selectAll("tr").data(rs, d => d.cluster).join("tr")
      .classed("sel", d => d.cluster === state.selected)
      .style("cursor", "pointer")
      .on("click", (e, d) => { state.selected = d.cluster; renderSelection(); });

    tr.selectAll("td").data(d => [
      // 2026 rank, carrying the movement arrow against 2025.
      `${d.overall_rank}${movement(d)}`,
      d.rank_2025 == null ? '<span class="dim">—</span>' : d.rank_2025,
      `${d.cluster}${d.graduated ? ' <span class="grad-pill">NEW</span>' : ''}`,
      `${flagIcon(d.country_code, d.country)} ${d.country || ""}`,
      d.usual_region,
      d.market_rank, d.collab_rank, d.maturity_rank,
    ]).join("td")
      // Region (index 4) is a short categorical code (US/EU/China/...), unlike the
      // free-text Cluster/Country columns either side of it -- left-aligning it in
      // a column wide enough for "UK+AUS+CAN" left it stranded against the left
      // rule with a lot of dead space to its right, which read as misaligned even
      // though it technically matched its header's alignment. Centring it (header
      // too, via the "ctr" class on the <th> in clusters.html) gives it its own
      // deliberate treatment instead.
      .attr("class", (d, i) => [0, 1, 5, 6, 7].includes(i) ? "num" : i === 4 ? "ctr" : null)
      .html(d => d);

    d3.select("#rtable thead").selectAll("th").each(function () {
      const th = d3.select(this), key = th.attr("data-k");
      const label = TH_LABELS[key];
      const on = key === state.sortKey;
      th.classed("sorted", on).html(`${label}${on ? ` <span class="arrow">${state.sortDir === "asc" ? "▲" : "▼"}</span>` : ""}`);
    });
  }

  /* The "Cluster detail" dimension-bar panel was REMOVED 2026-09-08. It restated, for
     one cluster at a time, the three pillar values the ranking table already shows for
     every cluster at once, so it added a click and no information. Elena: "I think we
     mentioned it wasn't very informative and we were thinking of removing it." */

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

  // ---------- Figure 4: share of company funding by region: cluster / quasi-cluster / other ----------
  // Rebuilt 2026-09-18 from a real established-vs-quasi-cluster COUNT chart into a
  // funding-SHARE chart, per Elena's request. Cluster funding per region and each
  // region's total company funding are both real (funding_by_cluster.json /
  // funding_by_country.json); quasi-cluster funding per region is NOT -- the paper
  // (Occasional Paper 15/2025) published quasi-cluster counts only, never a dollar
  // figure -- so that one series is illustrative (mock_quasi_cluster_funding.json,
  // modelled as a share of each region's non-cluster funding) until a real figure
  // exists. "Other" is the real total minus both, clamped at 0 so an oversized mock
  // quasi figure can never push it negative.
  function renderPipeline() {
    const REGION_ORDER = Object.keys(QT.palette.region);
    const clusterByRegion = new Map(REGION_ORDER.map(r => [r, 0]));
    fundingByCluster.data.forEach(d => {
      const region = REGION_OF[d.country] || "RoW";
      clusterByRegion.set(region, (clusterByRegion.get(region) || 0) + d.total_funding);
    });
    const totalByRegion = new Map(REGION_ORDER.map(r => [r, 0]));
    fundingByCountry.data.forEach(d => {
      const region = REGION_OF[d.country] || "RoW";
      totalByRegion.set(region, (totalByRegion.get(region) || 0) + d.total_funding);
    });
    const quasiByRegion = new Map(quasiFunding.data.map(d => [d.region, d.quasi_funding]));

    const SERIES = [
      { key: "cluster", label: "In a named cluster", color: QT.tokens.accent },
      { key: "quasi", label: "In a quasi-cluster", color: QT.tokens.gold },
      { key: "other", label: "Other company funding", color: QT.tokens.line },
    ];

    const rs = REGION_ORDER.map(region => {
      const total = totalByRegion.get(region) || 0;
      const cluster = clusterByRegion.get(region) || 0;
      const quasi = Math.min(quasiByRegion.get(region) || 0, Math.max(0, total - cluster));
      const other = Math.max(0, total - cluster - quasi);
      return { region, total, cluster, quasi, other };
    });

    const W = 880, H = 40 + rs.length * 46;
    d3.select("#chart-pipeline").selectAll("*").remove();
    const c = QT.chart("#chart-pipeline", { W, H, margin: { t: 24, r: 90, b: 6, l: 130 } });
    const x = d3.scaleLinear().domain([0, 1]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(r => r.region)).range([0, c.ih]).padding(0.35);

    // c.gx is pinned to the bottom of the plot by QT.chart; this axis belongs on
    // top, so it gets its own group at the origin instead of reusing c.gx.
    c.g.append("g").attr("class", "axis").call(d3.axisTop(x).ticks(5).tickFormat(QT.fmt.pct0).tickSizeOuter(0));
    c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
      .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", c.ih);

    const st = d3.stack().keys(SERIES.map(s => s.key))(rs.map(r => ({
      region: r.region,
      cluster: r.total ? r.cluster / r.total : 0,
      quasi: r.total ? r.quasi / r.total : 0,
      other: r.total ? r.other / r.total : 0,
      raw: r,
    })));

    SERIES.forEach((s, i) => {
      c.gPlot.selectAll(`.seg-${s.key}`).data(st[i], d => d.data.region).join("rect")
        .attr("class", `seg-${s.key}`).attr("y", d => y(d.data.region)).attr("height", y.bandwidth())
        .attr("x", d => x(d[0])).attr("width", d => Math.max(0, x(d[1]) - x(d[0]))).attr("fill", s.color)
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${d.data.region}</div>` +
          `<div class="row"><span class="k">${s.label}</span><span class="v">${QT.fmt.money(d.data.raw[s.key])} ` +
          `(${QT.fmt.pct1(d.data.raw.total ? d.data.raw[s.key] / d.data.raw.total : 0)})</span></div>`, e))
        .on("mouseleave", tt.hide);
    });

    c.gPlot.selectAll("text.pipeline-ratio").data(rs, r => r.region).join("text")
      .attr("class", "pipeline-ratio").attr("x", c.iw + 8).attr("y", r => y(r.region) + y.bandwidth() / 2)
      .attr("dy", "0.32em").style("font-size", "11.5px").style("font-weight", 700).style("fill", QT.tokens.ink)
      .text(r => QT.fmt.axisMoney(r.total) + " total");

    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    QT.legend("#legend-pipeline", SERIES);
  }

  // ---------- Figure 5: clusters by funding band, per region (AP-50) ----------
  // Real data (funding_by_cluster.json, all 42 clusters), unlike the ranking table
  // above -- this doesn't depend on the illustrative pillar scores at all, only on
  // total_funding and the country->region lookup every other region-based chart on
  // this site already uses. Band edges and the 5-region grouping are Elena's own
  // spec (2026-09-08 list; backlog AP-50), verified non-empty against the real data
  // before building this (the >$5bn band would be pointless if nothing cleared it --
  // two US clusters do).
  const BANDS = [
    { key: "lt100m",     label: "<$100m" },
    { key: "100to500m",  label: "$100-500m" },
    { key: "500mto1bn",  label: "$500m-1bn" },
    { key: "1to5bn",     label: "$1-5bn" },
    { key: "gte5bn",     label: ">$5bn" },
  ].map((b, i) => ({ ...b, color: QT.palette.sequential[i] }));
  const bandOf = v => v >= 5e9 ? "gte5bn" : v >= 1e9 ? "1to5bn" : v >= 5e8 ? "500mto1bn"
                     : v >= 1e8 ? "100to500m" : "lt100m";

  // Redesigned 2026-09-18 as a heatmap grid (region x band, one cell per pair)
  // rather than a stacked bar. With only 42 clusters split 5 ways by region and 5
  // ways by band, most stacked segments were 0-4 clusters wide -- a sliver too
  // thin to hold a label, next to a handful of longer ones, so the chart read as
  // mostly blank bar with a few odd bumps. A grid gives every region x band pair
  // the same fixed-size cell regardless of its count, with the count printed
  // directly in it, so a "0" is exactly as legible as a "5".
  function renderBands() {
    // US / China / EU / UK+AUS+CAN / RoW, in the site's own canonical order
    // (QT.palette.region's key order) -- not sorted by count, so the axis reads
    // the same way every other region chart on the tracker does.
    const REGION_ORDER = Object.keys(QT.palette.region);
    const counts = new Map(REGION_ORDER.map(r => [r, Object.fromEntries(BANDS.map(b => [b.key, 0]))]));
    fundingByCluster.data.forEach(d => {
      const region = REGION_OF[d.country] || "RoW";
      counts.get(region)[bandOf(d.total_funding)]++;
    });
    const rs = REGION_ORDER.map(region => ({ region, ...counts.get(region) }));
    const maxCount = d3.max(rs, r => d3.max(BANDS, b => r[b.key])) || 1;
    // Single-hue intensity, not the five band colours the old stacked bar used --
    // colour here encodes only "how many", and the band identity already comes
    // from the column position, so a categorical palette would just be noise.
    const cellColor = d3.scaleLinear().domain([0, maxCount]).range([QT.tokens.heatmapLow, QT.tokens.accent]);
    const cellText = n => n === 0 ? QT.tokens.line : (n / maxCount > 0.55 ? "#fff" : QT.tokens.ink);

    const W = 880, H = 46 + rs.length * 44;
    d3.select("#chart-bands").selectAll("*").remove();
    const c = QT.chart("#chart-bands", { W, H, margin: { t: 30, r: 4, b: 6, l: 130 } });
    const x = d3.scaleBand().domain(BANDS.map(b => b.key)).range([0, c.iw]).paddingInner(0.12).paddingOuter(0.02);
    const y = d3.scaleBand().domain(rs.map(r => r.region)).range([0, c.ih]).padding(0.16);

    c.g.selectAll("text.band-label").data(BANDS).join("text").attr("class", "band-label")
      .attr("x", b => x(b.key) + x.bandwidth() / 2).attr("y", -12).attr("text-anchor", "middle")
      .attr("font-size", 10.5).attr("fill", QT.tokens.muted).text(b => b.label);

    const cells = [];
    rs.forEach(r => BANDS.forEach(b => cells.push({ region: r.region, band: b, count: r[b.key] })));

    c.gPlot.selectAll("rect.cell").data(cells, d => d.region + d.band.key).join("rect")
      .attr("class", "cell").attr("rx", 5)
      .attr("x", d => x(d.band.key)).attr("y", d => y(d.region))
      .attr("width", x.bandwidth()).attr("height", y.bandwidth())
      .attr("fill", d => d.count === 0 ? QT.tokens.panel : cellColor(d.count))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.region}</div>` +
        `<div class="row"><span class="k">${d.band.label}</span><span class="v">${d.count} ` +
        `cluster${d.count === 1 ? "" : "s"}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.cell-val").data(cells, d => d.region + d.band.key).join("text")
      .attr("class", "cell-val").attr("text-anchor", "middle").attr("dy", "0.32em")
      .attr("x", d => x(d.band.key) + x.bandwidth() / 2).attr("y", d => y(d.region) + y.bandwidth() / 2)
      .attr("font-size", 13).attr("font-weight", 700).attr("fill", d => cellText(d.count))
      .style("pointer-events", "none")
      .text(d => d.count === 0 ? "0" : d.count);

    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  // ---------- new entrants: graduated quasi-clusters (featured strip) ----------
  // Static — always shows every graduate regardless of the region filter, so the
  // "who just made it in" story stays front-and-centre. Cards are clickable and
  // select the cluster in the table/map/detail below.
  function renderGraduates() {
    // Ordered by 2026 rank rather than left in dataset order, so the strip has a
    // defensible reading direction (Elena: "let's put the boxes in order of something").
    const grads = rankings.data.filter(d => d.graduated)
      .sort(QT.rank("overall_rank", "cluster", "asc"));
    const body = d3.select("#graduates-body");
    body.selectAll("*").remove();
    if (!grads.length) {
      body.append("div").attr("class", "policy-empty").text("No graduations recorded this update.");
      return;
    }
    const grid = body.append("div").attr("class", "grad-grid");
    const card = grid.selectAll(".grad-card").data(grads, d => d.cluster).join("div")
      .attr("class", "grad-card")
      .on("click", (e, d) => { state.selected = d.cluster; renderSelection(); });
    // "NEW" rather than "Graduated", to match the badge the same cluster carries in
    // the ranking table above -- one word for one event, not two.
    card.append("span").attr("class", "grad-pill").html("&#8593; NEW");
    card.append("div").attr("class", "grad-name").html(d => `${flagIcon(d.country_code, d.country)} ${d.cluster}`);
    // The usual region (EU / US / ...), not the map's geographical area.
    card.append("div").attr("class", "grad-meta")
      .text(d => `${d.usual_region} · ${QT.fmt.money(d.total_funding)}`
                 + (d.from_tier ? ` · from ${d.from_tier}` : ""));
  }

  // ---------- ranking movements: clusters that dropped OUT of the ranking ----------
  // The mirror image of renderGraduates(), reading from a `downgraded`/`to_tier` pair
  // in the same shape as `graduated`/`from_tier`. Neither the tracker nor the mock
  // rankings file carries this field yet -- detecting a downgrade needs a 2025
  // baseline to compare against, and (BACKLOG.md AP-37) the tracker doesn't hold one:
  // rank_2025 is null on every row, which is also why the table's movement arrows are
  // blank. Rather than invent which named clusters supposedly dropped out -- there is
  // no data anywhere in this pipeline that could support that claim -- this renders
  // the same honest "not yet available" state as the rest of the page, and will start
  // showing real cards the moment a `downgraded: true` row exists.
  function renderDowngrades() {
    const downs = rankings.data.filter(d => d.downgraded)
      .sort(QT.rank("overall_rank", "cluster", "asc"));
    const body = d3.select("#downgrades-body");
    body.selectAll("*").remove();
    if (!downs.length) {
      body.append("div").attr("class", "policy-empty")
        .text("No downgrades to show yet -- the tracker has no 2025 baseline ranking to compare "
              + "against (BACKLOG.md AP-37), so a cluster dropping out of the top 45 can't be "
              + "detected until that baseline exists.");
      return;
    }
    const grid = body.append("div").attr("class", "grad-grid");
    const card = grid.selectAll(".grad-card").data(downs, d => d.cluster).join("div")
      .attr("class", "grad-card")
      .on("click", (e, d) => { state.selected = d.cluster; renderSelection(); });
    card.append("span").attr("class", "grad-pill grad-pill-down").html("&#8595; Downgraded");
    card.append("div").attr("class", "grad-name").html(d => `${flagIcon(d.country_code, d.country)} ${d.cluster}`);
    card.append("div").attr("class", "grad-meta")
      .text(d => `${d.usual_region} · ${QT.fmt.money(d.total_funding)}`
                 + (d.to_tier ? ` · to ${d.to_tier}` : ""));
  }

  // Selection (map bubble / table row / graduate|downgrade card click) touches only
  // the map's highlight stroke and the table's `.sel` row -- never the region chips
  // or the share-over-time chart, neither of which depends on `state.selected`.
  function renderSelection() { renderMap(); renderTable(); }

  d3.select("#rtable thead").selectAll("th").on("click", function () {
    const key = d3.select(this).attr("data-k");
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = key; state.sortDir = "desc"; }
    renderTable(); // sorting is a table-only concern -- it never touches the map
  });

  renderMap();
  renderTable();
  renderShareTime();
  renderGraduates(); // static — always shows every graduate regardless of region filter
  renderDowngrades(); // static, same reasoning — see the function comment
  renderPipeline(); // static — doesn't depend on region filter or table sort/selection
  renderBands(); // static — doesn't depend on region filter or table sort/selection
  QT.timeSlider("#slider-sharetime", { years: SHARE_YEARS, onChange: w => { shareWin = w; renderShareTime(); } });
});
