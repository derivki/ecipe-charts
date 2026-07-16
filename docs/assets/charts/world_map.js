/* World map — choropleth (funding by country) + cluster bubbles (funding by cluster).
   Faithful port of legacy/ecipe-quantum-tracker.html's map (same topojson-client +
   world-atlas-110m vendor files, same colour ramp/bubble styling), rewired onto the
   pipeline's real, current data: funding_by_country.json, funding_by_cluster.json +
   cluster_coords.json (real-world coordinates transcribed from the legacy file).
   Countries the 110m atlas has no polygon for (e.g. Singapore) simply have nothing to
   shade — a resolution limit of the atlas, not a bug; their cluster bubbles still plot.

   A metric toggle ("All funding" / "Public only") switches every layer — choropleth,
   bubbles, legend and tooltips — between total_funding and public_funding (grants +
   public equity), both emitted per country/cluster by the Stage-1 pipeline. */
(function () {
  const CSS = `
.wm-wrap{position:relative;}
.wm-frame{position:relative;background:radial-gradient(120% 130% at 32% 0%,#F1F5F9,#FFFFFF 72%);
  border:1px solid var(--line);border-radius:8px;overflow:hidden;}
.wm-frame svg{display:block;width:100%;height:auto;}
.wm-country{stroke:#FFFFFF;stroke-width:0.6px;cursor:default;transition:fill .25s ease;}
.wm-country.hl{stroke:#119B92;stroke-width:1.2px;}
.wm-graticule{fill:none;stroke:rgba(20,45,80,0.06);stroke-width:0.5px;}
.wm-sphere{fill:none;stroke:rgba(20,45,80,0.14);stroke-width:0.8px;}
.wm-cluster{fill:#F5C544;fill-opacity:0.82;stroke:#5a3c00;stroke-width:0.7px;cursor:pointer;transition:fill-opacity .15s,r .25s ease;}
.wm-cluster:hover{fill-opacity:1;stroke:#1a1200;stroke-width:1.2px;}
.wm-toggle{position:absolute;top:10px;left:12px;z-index:4;display:inline-flex;border:1px solid var(--line);
  border-radius:7px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(20,40,70,0.08);}
.wm-toggle button{appearance:none;border:0;background:transparent;padding:6px 11px;font:inherit;font-size:12px;
  color:var(--muted);cursor:pointer;transition:.12s;}
.wm-toggle button+button{border-left:1px solid var(--line);}
.wm-toggle button.on{background:var(--ink);color:#fff;}
.wm-toggle button:not(.on):hover{background:#eef0f3;color:var(--ink);}
.wm-zoom{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:5px;z-index:4;}
.wm-zoom button{width:28px;height:28px;border-radius:3px;border:1px solid var(--line);
  background:#fff;color:var(--muted);font-size:15px;cursor:pointer;font-weight:600;
  line-height:1;display:flex;align-items:center;justify-content:center;
  box-shadow:0 1px 3px rgba(20,40,70,0.08);}
.wm-zoom button:hover{border-color:#119B92;color:#119B92;}
.wm-legend{position:absolute;left:12px;bottom:12px;z-index:4;background:#fff;
  border:1px solid var(--line);border-radius:6px;padding:10px 12px;
  color:var(--muted);max-width:210px;box-shadow:0 2px 8px rgba(20,40,70,0.06);font-size:11px;}
.wm-legend .lg-title{font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;}
.wm-lg-bar{height:8px;border-radius:2px;margin-bottom:4px;}
.wm-lg-scale{display:flex;justify-content:space-between;font-size:9.5px;color:var(--muted);}
.wm-lg-sep{height:1px;background:var(--line);margin:9px 0 8px;}
.wm-lg-row{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--muted);}
.wm-lg-dot{width:11px;height:11px;border-radius:50%;background:#F5C544;opacity:.85;border:0.8px solid #5a3c00;flex:none;}
.wm-lg-nd{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--muted);margin-top:6px;}
.wm-lg-ndsw{width:11px;height:11px;border-radius:2px;background:#E4E9EE;border:1px solid #C7D0D8;flex:none;}
`;
  function injectCSS() {
    if (document.getElementById("wm-css")) return;
    const s = document.createElement("style"); s.id = "wm-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ISO-ish name mapping: our funding_by_country.json codes -> world-atlas-110m properties.name.
  // The 110m atlas has no polygon for a few small states (e.g. Singapore) — omitted here on purpose.
  const ATLAS_NAME = {
    US: "United States of America", UK: "United Kingdom", UAE: "United Arab Emirates",
    "South Korea": "South Korea", "Czech Republic": "Czechia",
    China: "China", Canada: "Canada", Finland: "Finland", France: "France",
    Switzerland: "Switzerland", Israel: "Israel", Germany: "Germany", Netherlands: "Netherlands",
    Australia: "Australia", Spain: "Spain", Denmark: "Denmark", Japan: "Japan", Italy: "Italy",
    Ireland: "Ireland", India: "India", Poland: "Poland", Austria: "Austria", Sweden: "Sweden",
    Belgium: "Belgium", Turkey: "Turkey", Chile: "Chile", Portugal: "Portugal", Taiwan: "Taiwan",
    Thailand: "Thailand", Bulgaria: "Bulgaria", Russia: "Russia", Romania: "Romania",
    Uruguay: "Uruguay", Brazil: "Brazil", Greece: "Greece", Norway: "Norway", Malaysia: "Malaysia",
  };

  const METRICS = {
    total_funding:  { title: "Funding by country",        dot: "Cluster (size = funding)",        label: "Total funding" },
    public_funding: { title: "Public funding by country", dot: "Cluster (size = public funding)", label: "Public funding" },
  };

  window.renderWorldMap = async function (selector) {
    injectCSS();
    const root = d3.select(selector);
    root.attr("class", "wm-wrap");
    const frame = root.append("div").attr("class", "wm-frame");
    frame.append("div").attr("class", "wm-toggle").html(
      `<button id="wm-mtotal" class="on" title="All funding">All funding</button>` +
      `<button id="wm-mpublic" title="Public funding only (grants + public equity)">Public only</button>`);
    frame.append("div").attr("class", "wm-zoom").html(
      `<button id="wm-zin" title="Zoom in">+</button><button id="wm-zout" title="Zoom out">−</button><button id="wm-zreset" title="Reset">↻</button>`);
    const legend = frame.append("div").attr("class", "wm-legend");
    const tip = root.append("div").attr("class", "tt");

    const [countryData, clusterData, coordsData, worldTopo] = await Promise.all([
      QT.loadData("funding_by_country"),
      QT.loadData("funding_by_cluster"),
      QT.loadData("cluster_coords"),
      fetch("assets/vendor/world-atlas-110m.json").then(r => r.json()),
    ]);

    const countryByAtlasName = new Map(
      countryData.data.map(d => [ATLAS_NAME[d.country] || d.country, d])
    );
    const coordsByCluster = new Map(coordsData.data.map(d => [d.cluster, d]));
    const clusters = clusterData.data
      .filter(d => coordsByCluster.has(d.cluster))
      .map(d => ({ ...d, ...coordsByCluster.get(d.cluster) }));

    let metric = "total_funding";
    const cVal = d => d[metric] != null ? d[metric] : null;

    const ramp = d3.interpolateRgbBasis(["#102f6b", "#2f56a2", "#6f5896", "#b0374f", "#8a1220"]);
    let maxF, pscale, rScale;
    function rebuildScales() {
      maxF = d3.max(countryData.data, d => cVal(d)) || 1;
      pscale = d3.scalePow().exponent(0.45).domain([0, maxF]).range([0, 1]).clamp(true);
      rScale = d3.scaleSqrt().domain([0, d3.max(clusters, d => d[metric] || 0) || 1]).range([3, 26]);
    }
    const fundColour = f => ramp(pscale(f));

    const W = 1180, H = 560;
    const svg = frame.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet")
      .style("overflow", "hidden")
      .attr("role", "img").attr("aria-label", "World map of quantum companies, funding and clusters");
    const g = svg.append("g");

    const land = topojson.feature(worldTopo, worldTopo.objects.countries).features.filter(f => f.properties.name !== "Antarctica");
    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath(projection);
    projection.fitExtent([[8, 10], [W - 8, H - 14]], { type: "FeatureCollection", features: land });

    g.append("path").datum({ type: "Sphere" }).attr("class", "wm-sphere").attr("d", path);
    g.append("path").datum(d3.geoGraticule10()).attr("class", "wm-graticule").attr("d", path);

    function showTip(html, event) {
      tip.html(html).style("opacity", 1)
        .style("left", event.clientX + "px").style("top", event.clientY + "px");
    }
    function hideTip() { tip.style("opacity", 0); }

    const countrySel = g.selectAll("path.wm-country").data(land).join("path")
      .attr("class", "wm-country").attr("d", path)
      .on("mousemove", (e, d) => {
        const rec = countryByAtlasName.get(d.properties.name);
        showTip(rec
          ? `<div class="hd">${d.properties.name}</div>` +
            `<div class="row"><span class="k">Companies</span><span class="v">${QT.fmt.int(rec.companies)}</span></div>` +
            `<div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(rec.total_funding)}</span></div>` +
            (rec.public_funding != null ? `<div class="row"><span class="k">Public funding</span><span class="v">${QT.fmt.money(rec.public_funding)}</span></div>` : "")
          : `<div class="hd">${d.properties.name}</div><div class="row"><span class="k">No companies tracked</span></div>`, e);
      })
      .on("mouseenter", function () { d3.select(this).classed("hl", true); })
      .on("mouseleave", function () { d3.select(this).classed("hl", false); hideTip(); });

    const bubbleSel = g.selectAll("circle.wm-cluster")
      .data([...clusters].sort((a, b) => b.total_funding - a.total_funding)).join("circle")
      .attr("class", "wm-cluster")
      .attr("cx", d => projection([d.lon, d.lat])[0]).attr("cy", d => projection([d.lon, d.lat])[1])
      .on("mousemove", (e, d) => showTip(
        `<div class="hd">${d.cluster}</div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${QT.fmt.int(d.companies)}</span></div>` +
        `<div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        (d.public_funding != null ? `<div class="row"><span class="k">Public funding</span><span class="v">${QT.fmt.money(d.public_funding)}</span></div>` : ""), e))
      .on("mouseleave", hideTip);

    function update() {
      rebuildScales();
      const M = METRICS[metric];
      countrySel.attr("fill", d => {
        const rec = countryByAtlasName.get(d.properties.name);
        return rec && cVal(rec) != null ? fundColour(cVal(rec)) : "#E4E9EE";
      });
      bubbleSel.attr("r", d => rScale(d[metric] || 0));
      legend.html(
        `<div class="lg-title">${M.title}</div>` +
        `<div class="wm-lg-bar" id="wm-lg-bar"></div>` +
        `<div class="wm-lg-scale"><span>$0</span><span>${QT.fmt.axisMoney(maxF)}</span></div>` +
        `<div class="wm-lg-sep"></div>` +
        `<div class="wm-lg-row"><span class="wm-lg-dot"></span>${M.dot}</div>` +
        `<div class="wm-lg-nd"><span class="wm-lg-ndsw"></span>No companies tracked</div>`
      );
      legend.select("#wm-lg-bar").style("background",
        `linear-gradient(90deg, ${fundColour(0)}, ${ramp(0.35)}, ${ramp(0.6)}, ${ramp(0.82)}, ${fundColour(maxF)})`);
    }
    update();

    root.select("#wm-mtotal").on("click", function () {
      if (metric === "total_funding") return;
      metric = "total_funding";
      d3.select(this).classed("on", true); root.select("#wm-mpublic").classed("on", false);
      update();
    });
    root.select("#wm-mpublic").on("click", function () {
      if (metric === "public_funding") return;
      metric = "public_funding";
      d3.select(this).classed("on", true); root.select("#wm-mtotal").classed("on", false);
      update();
    });

    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", ev => g.attr("transform", ev.transform));
    svg.call(zoom);
    root.select("#wm-zin").on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1.6));
    root.select("#wm-zout").on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6));
    root.select("#wm-zreset").on("click", () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity));
  };
})();
