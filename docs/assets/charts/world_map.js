/* World map — choropleth (funding by country) + cluster bubbles (funding by cluster).
   Faithful port of legacy/ecipe-quantum-tracker.html's map (same topojson-client +
   world-atlas-110m vendor files, same colour ramp/bubble styling), rewired onto the
   pipeline's real, current data: funding_by_country.json, funding_by_cluster.json +
   cluster_coords.json (real-world coordinates transcribed from the legacy file).
   Countries the 110m atlas has no polygon for (e.g. Singapore) simply have nothing to
   shade — a resolution limit of the atlas, not a bug; their cluster bubbles still plot.

   A metric toggle ("Company" / "Government") switches the choropleth, legend and
   tooltips between all company funding and the government policy register's totals,
   which the caller supplies as opts.government (a Map of tracker country name ->
   {government_funding}). Shading is BINNED, not a continuous ramp — see rebuildScales.
   Cluster bubbles are opt-in via renderWorldMap(selector, {showClusters:true}) —
   the Overview map omits them (see docs/index.html). */
(function () {
  const T = window.QT.tokens;
  const CSS = `
.wm-wrap{position:relative;}
.wm-frame{position:relative;background:radial-gradient(120% 130% at 32% 0%,#F1F5F9,#FFFFFF 72%);
  border-radius:8px;overflow:hidden;}
.wm-frame svg{display:block;width:100%;height:auto;}
.wm-country{stroke:#FFFFFF;stroke-width:0.6px;cursor:default;transition:fill .25s ease;}
.wm-country.hl{stroke:#119B92;stroke-width:1.2px;}
.wm-graticule{fill:none;stroke:rgba(20,45,80,0.06);stroke-width:0.5px;}
.wm-sphere{fill:none;stroke:rgba(20,45,80,0.14);stroke-width:0.8px;}
.wm-cluster{fill:${T.clusterBubble};fill-opacity:0.82;stroke:${T.clusterBubbleStroke};stroke-width:0.7px;cursor:pointer;transition:fill-opacity .15s,r .25s ease;}
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
.wm-lg-sw{width:11px;height:11px;border-radius:2px;flex:none;box-shadow:0 0 0 0.5px color-mix(in srgb, ${T.ink} 12%, transparent);}
.wm-lg-dot{width:11px;height:11px;border-radius:50%;background:${T.clusterBubble};opacity:.85;border:0.8px solid ${T.clusterBubbleStroke};flex:none;}
.wm-lg-nd{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--muted);margin-top:6px;}
.wm-lg-ndsw{width:11px;height:11px;border-radius:2px;background:${T.noData};border:1px solid ${T.noDataBorder};flex:none;}
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

  /* COMPANY vs GOVERNMENT, not public vs private.
     "Company" is ALL company funding (every instrument, from `funding_by_country.json`).
     "Government" is Dyuti's government policy register alone
     (docs/data/government_funding.json, built by src/build_government_funding.py) — never
     summed with any company-side figure. Per BACKLOG.md AP-36 (Elena, 2026-09-08) and
     reaffirmed AP-57 (Elena, 2026-09-16): a government grant into a funding round counts
     once, as company funding, never a second time as government funding. AP-53's
     2026-09-09 combined measure (QT.combinedGovByCountry summing this register with
     company-round Grant/Public-equity money) was a mistake and has been reverted. The
     caller (Overview/Countries) passes the register-only map in as opts.government, so
     this file just renders whatever number it is given — Company and Government are two
     independent measures with no overlap. */
  const METRICS = {
    company_funding: {
      title: "Company funding by country", label: "Company funding",
      dot: "Cluster (size = company funding)", noData: "No company funding",
    },
    government_funding: {
      title: "Government funding by country", label: "Government funding",
      dot: "Cluster (size = company funding)", noData: "No government funding",
    },
  };

  window.renderWorldMap = async function (selector, opts) {
    const showClusters = !!(opts && opts.showClusters);
    injectCSS();
    const root = d3.select(selector);
    root.attr("class", "wm-wrap");
    const frame = root.append("div").attr("class", "wm-frame");
    // The Overview declares its own Company/Government control in the page, alongside
    // every other figure's controls, so the map does not also float one over the
    // corner of itself -- two controls driving one chart is a bug report waiting to
    // happen. Standalone embeds (funding_by_country.html) have no such control, so
    // there the map still supplies its own.
    const externalToggle = !!document.querySelector("#seg-source-map");
    if (!externalToggle) {
      frame.append("div").attr("class", "wm-toggle").html(
        `<button id="wm-mcompany" class="on" title="Total funding raised by companies">Company</button>` +
        `<button id="wm-mgov" title="Total funding announced or deployed by government entities">Government</button>`);
    }
    frame.append("div").attr("class", "wm-zoom").html(
      `<button id="wm-zin" title="Zoom in">+</button><button id="wm-zout" title="Zoom out">−</button><button id="wm-zreset" title="Reset">↻</button>`);
    const legend = frame.append("div").attr("class", "wm-legend");
    const tip = root.append("div").attr("class", "tt");

    const [countryData, clusterData, coordsData, codes, worldTopo] = await Promise.all([
      QT.loadData("funding_by_country"),
      QT.loadData("funding_by_cluster"),
      QT.loadData("cluster_coords"),
      QT.loadData("country_codes"),
      fetch("assets/vendor/world-atlas-110m.json").then(r => r.json()),
    ]);

    // Government figures come from the caller (the Overview passes the register-derived
    // map) so this file keeps one data-loading path and the panel owns the dataset.
    const govByCountry = (opts && opts.government) || new Map();
    const euMembers = new Set(codes.eu_members || []);
    const euRow = govByCountry.get("EU");

    const shaped = countryData.data.map(d => ({
      ...d,
      company_funding: d.total_funding,
      government_funding: (govByCountry.get(d.country) || {}).government_funding || 0,
    }));
    const countryByAtlasName = new Map(shaped.map(d => [ATLAS_NAME[d.country] || d.country, d]));
    // Atlas name -> tracker name, so an unfunded polygon can still be recognised as an
    // EU Member State for the tooltip fallback below.
    const trackerName = new Map(Object.entries(ATLAS_NAME).map(([t, a]) => [a, t]));
    const euAtlasNames = new Set([...euMembers].map(n => ATLAS_NAME[n] || n));

    const coordsByCluster = new Map(coordsData.data.map(d => [d.cluster, d]));
    const clusters = clusterData.data
      .map(d => ({ ...d, company_funding: d.total_funding }))
      .filter(d => coordsByCluster.has(d.cluster))
      .map(d => ({ ...d, ...coordsByCluster.get(d.cluster) }));

    let metric = "company_funding";
    const cVal = d => d[metric] != null && d[metric] > 0 ? d[metric] : null;

    // BINNED, not a continuous ramp. Quantum funding is extremely skewed — the US alone
    // is roughly 4x China and 12x the UK on company funding — so a linear or even a
    // power ramp left every country except the US in the palest two shades and the map
    // read as "the US, and nowhere else". Elena asked for categorical colours "so as
    // not to have the US dark only". Quantile class intervals spread the classes across
    // the data rather than across the range, so the middle of the distribution becomes
    // legible, and the breaks are labelled in the legend so the classes are honest.
    let scale, rScale;
    function rebuildScales() {
      scale = QT.binnedScale(shaped.map(d => d[metric] || 0), { bins: 5 });
      rScale = d3.scaleSqrt().domain([0, d3.max(clusters, d => d.company_funding || 0) || 1]).range([3, 26]);
    }
    const fundColour = f => scale.color(f);

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

    // Flips to the other side of the cursor near a viewport edge instead of being
    // drawn off-screen. This map had its own uncorrected showTip (a bare clientX/
    // clientY assignment), which is why Elena saw the tooltips for countries on the
    // right-hand side — Japan, New Zealand — only half visible.
    const { show: showTip, hide: hideTip } = QT.tooltip();

    const countrySel = g.selectAll("path.wm-country").data(land).join("path")
      .attr("class", "wm-country").attr("d", path)
      .on("mousemove", (e, d) => {
        const name = d.properties.name;
        const rec = countryByAtlasName.get(name);
        const hd = `<div class="hd">${name}</div>`;
        const row = (k, v) => `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;

        if (metric === "government_funding") {
          const own = rec && rec.government_funding > 0 ? rec.government_funding : null;
          if (own != null) return showTip(hd + row("Government funding", QT.fmt.money(own)), e);
          // EU FALLBACK. A Member State with no government funding of its own still
          // benefits from EU-level programmes, so rather than "no data" it shows the
          // bloc's figure, explicitly labelled as EU-wide. This is Elena's alternative
          // to shading the EU as one bloc, which would have collided visually with the
          // per-country shading right next to it.
          if (euAtlasNames.has(name) && euRow) {
            return showTip(hd +
              row("Government funding", "None recorded") +
              `<div class="row tot"><span class="k">EU Flagship funding</span>` +
              `<span class="v">${QT.fmt.money(euRow.government_funding)}</span></div>`, e);
          }
          return showTip(hd + row("No government funding recorded", ""), e);
        }

        // Company view: country name, companies, company funding — nothing more.
        return showTip(rec && rec.company_funding > 0
          ? hd + row("Companies", QT.fmt.int(rec.companies)) +
                 row("Company funding", QT.fmt.money(rec.company_funding))
          : hd + row("No company funding", ""), e);
      })
      .on("mouseenter", function () { d3.select(this).classed("hl", true); })
      .on("mouseleave", function () { d3.select(this).classed("hl", false); hideTip(); });

    const bubbleSel = showClusters ? g.selectAll("circle.wm-cluster")
      .data([...clusters].sort(QT.rank("total_funding", "cluster"))).join("circle")
      .attr("class", "wm-cluster")
      .attr("cx", d => projection([d.lon, d.lat])[0]).attr("cy", d => projection([d.lon, d.lat])[1])
      .on("mousemove", (e, d) => showTip(
        `<div class="hd">${d.cluster}</div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${QT.fmt.int(d.companies)}</span></div>` +
        `<div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
        (d.public_funding != null ? `<div class="row"><span class="k">Public funding</span><span class="v">${QT.fmt.money(d.public_funding)}</span></div>` : "") +
        (d.private_funding != null ? `<div class="row"><span class="k">Private funding</span><span class="v">${QT.fmt.money(d.private_funding)}</span></div>` : ""), e))
      .on("mouseleave", hideTip) : null;

    function update() {
      rebuildScales();
      const M = METRICS[metric];
      countrySel.attr("fill", d => {
        const rec = countryByAtlasName.get(d.properties.name);
        return rec && cVal(rec) != null ? fundColour(cVal(rec)) : QT.tokens.noData;
      });
      if (bubbleSel) bubbleSel.attr("r", d => rScale(d.company_funding || 0));
      // Discrete swatches with their class bounds, so the reader can tell which band a
      // country is in. A continuous gradient bar cannot label a binned scale honestly.
      const bounds = [0, ...scale.breaks];
      const swatches = scale.colors.map((col, i) => {
        const lo = bounds[i], hi = scale.breaks[i];
        const label = hi == null ? `${QT.fmt.axisMoney(lo)}+`
                    : i === 0 ? `< ${QT.fmt.axisMoney(hi)}`
                    : `${QT.fmt.axisMoney(lo)}–${QT.fmt.axisMoney(hi)}`;
        return `<div class="wm-lg-row"><span class="wm-lg-sw" style="background:${col}"></span>${label}</div>`;
      }).join("");
      legend.html(
        `<div class="lg-title">${M.title}</div>` +
        swatches +
        (showClusters ? `<div class="wm-lg-sep"></div><div class="wm-lg-row"><span class="wm-lg-dot"></span>${M.dot}</div>` : "") +
        `<div class="wm-lg-nd"><span class="wm-lg-ndsw"></span>${M.noData}</div>`
      );
    }
    update();

    // The in-frame toggle and the page's own segmented control are kept in step, so
    // whichever the reader uses, both show the same state.
    function setMetric(m) {
      if (metric === m) return;
      metric = m;
      root.select("#wm-mcompany").classed("on", m === "company_funding");
      root.select("#wm-mgov").classed("on", m === "government_funding");
      d3.select("#seg-source-map").selectAll("button")
        .classed("on", function () {
          return this.getAttribute("data-s") === (m === "company_funding" ? "company" : "government");
        });
      update();
    }
    root.select("#wm-mcompany").on("click", () => setMetric("company_funding"));
    root.select("#wm-mgov").on("click", () => setMetric("government_funding"));
    QT.segControl("#seg-source-map", "data-s",
      s => setMetric(s === "company" ? "company_funding" : "government_funding"));

    const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", ev => g.attr("transform", ev.transform));
    svg.call(zoom);
    root.select("#wm-zin").on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1.6));
    root.select("#wm-zout").on("click", () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6));
    root.select("#wm-zreset").on("click", () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity));
  };
})();
