/* Overview dashboard (Layer 0) — KPI strip + 5 panels.
   Real data: funding-over-time, funding-by-country, funding-by-stage,
   cluster-share-of-funding (computed client-side from the two real datasets below).
   Mock data: collaborations KPI, archetype scatter (docs-internal papers
   08/2025 and 15/2025 have not been updated yet — see mock_*.json meta.source_note).
   The world map (country choropleth + cluster bubbles, with an all/public-funding
   toggle) leads this Overview tab — see assets/charts/world_map.js. */
(async function () {
  QT.injectCSS();
  QT.nav("#nav", "overview");
  renderWorldMap("#worldmap");

  const [country, cluster, instrYear, stageRegion, manifest, profile, extra] = await Promise.all([
    QT.loadData("funding_by_country"),
    QT.loadData("funding_by_cluster"),
    QT.loadData("funding_by_instrument_year"),
    QT.loadData("funding_by_stage_region"),
    QT.loadData("manifest"),
    QT.loadData("mock_country_profile"),
    QT.loadData("mock_overview_extra"),
  ]);
  QT.vintage("#vintage", country.meta);

  const tt = QT.tooltip();

  // ---------- KPI strip ----------
  const totalFunding = d3.sum(country.data, d => d.total_funding);
  const totalClusterFunding = d3.sum(cluster.data, d => d.total_funding);
  QT.kpis("#kpis", [
    { v: QT.fmt.axisMoney(totalFunding), k: "Total funding tracked" },
    { v: QT.fmt.int(manifest.row_counts.startups), k: "Quantum companies" },
    { v: QT.fmt.int(cluster.data.length), k: "Quantum clusters" },
    { v: QT.fmt.int(country.data.length), k: "Countries with quantum companies" },
    { v: QT.fmt.int(extra.data.collaborations), k: "Collaborations (illustrative)" },
  ]);


  // ---------- Panel 1: funding over time by instrument (full interactive chart) ----------
  (function fundingOverTime() {
    const KEYS = ["VC / private equity", "Debt", "Grant", "Public equity"];
    const SERIES = KEYS.map(k => ({ key: k, label: k, color: QT.palette.instrument[k] }));
    const PARTIAL = instrYear.meta.partial_year;
    const rows = instrYear.data.map(r => Object.assign({ year: r.year }, ...KEYS.map(k => ({ [k]: r[k] || 0 }))));
    const ALL_YEARS = rows.map(d => d.year);

    const state = { scale: "abs", type: "bar", hidden: new Set(), win: [ALL_YEARS[0], ALL_YEARS[ALL_YEARS.length - 1]] };
    const active = () => SERIES.filter(s => !state.hidden.has(s.key));
    const visRows = () => rows.filter(d => d.year >= state.win[0] && d.year <= state.win[1]);

    const W = 880, H = 320;
    const c = QT.chart("#chart-instrument", { W, H, margin: { t: 16, r: 16, b: 34, l: 62 } });
    const x = d3.scaleBand().range([0, c.iw]).padding(0.18);
    const xLin = d3.scalePoint();
    const y = d3.scaleLinear().range([c.ih, 0]);

    function stacked() {
      const keys = active().map(s => s.key);
      let src = visRows().map(d => ({ ...d }));
      if (state.scale === "share") src = src.map(d => {
        const tot = keys.reduce((a, k) => a + d[k], 0) || 1;
        const o = { year: d.year }; keys.forEach(k => o[k] = d[k] / tot); return o;
      });
      return d3.stack().keys(keys)(src);
    }

    function render() {
      const years = visRows().map(d => d.year);
      x.domain(years);
      xLin.domain(years).range([x.bandwidth() / 2, c.iw - x.bandwidth() / 2]);
      const st = stacked();
      y.domain([0, state.scale === "share" ? 1 : d3.max(st, s => d3.max(s, d => d[1])) * 1.02 || 1]);
      const color = k => QT.palette.instrument[k];

      c.gGrid.selectAll("line").data(y.ticks(5)).join("line").attr("class", "gridline")
        .attr("x1", 0).attr("x2", c.iw).attr("y1", d => y(d)).attr("y2", d => y(d));

      if (PARTIAL && x(PARTIAL) != null) {
        c.gOverlay.selectAll(".partial-band").data([0]).join("rect").attr("class", "partial-band")
          .attr("x", x(PARTIAL) - x.step() * x.paddingInner() / 2).attr("y", 0)
          .attr("width", x.step()).attr("height", c.ih);
        c.gOverlay.selectAll(".partial-label").data([0]).join("text").attr("class", "partial-label")
          .attr("x", x(PARTIAL) + x.bandwidth() / 2).attr("y", 12).attr("text-anchor", "middle").text("YTD");
      }

      if (state.type === "bar") {
        c.gPlot.selectAll(".area").remove();
        const layers = c.gPlot.selectAll(".bar").data(st, d => d.key)
          .join(e => e.append("g").attr("class", "bar"), u => u, x2 => x2.remove())
          .attr("fill", d => color(d.key));
        layers.selectAll("rect").data(d => d.map(v => ({ ...v, key: d.key })), d => d.data.year)
          .join("rect").attr("x", d => x(d.data.year)).attr("width", x.bandwidth())
          .attr("y", d => y(d[1])).attr("height", d => Math.max(0, y(d[0]) - y(d[1])));
      } else {
        c.gPlot.selectAll(".bar").remove();
        const area = d3.area().x(d => xLin(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
        c.gPlot.selectAll(".area").data(st, d => d.key)
          .join(e => e.append("path").attr("class", "area"), u => u, x2 => x2.remove())
          .attr("fill", d => color(d.key)).attr("fill-opacity", 0.92).attr("d", area);
      }

      const vYears = visRows().map(d => d.year);
      c.gx.call(d3.axisBottom(x).tickValues(vYears.filter(yr => yr % 5 === 0 || yr === vYears[0] || yr === vYears[vYears.length - 1] || yr === PARTIAL)).tickSizeOuter(0));
      c.gy.call(d3.axisLeft(y).ticks(5).tickFormat(state.scale === "share" ? QT.fmt.pct0 : QT.fmt.axisMoney).tickSizeOuter(0));

      QT.legend("#legend-instrument", SERIES, {
        hidden: state.hidden,
        onToggle: key => {
          if (state.hidden.has(key)) state.hidden.delete(key);
          else if (active().length > 1) state.hidden.add(key);
          render();
        },
      });
      hover();
    }

    function hover() {
      c.gPlot.selectAll(".hovercol").data(visRows(), d => d.year).join("rect")
        .attr("class", "hovercol").attr("x", d => x(d.year)).attr("width", x.bandwidth())
        .attr("y", 0).attr("height", c.ih).attr("fill", "transparent")
        .on("mousemove", (e, d) => {
          const ser = active(), tot = ser.reduce((a, s) => a + d[s.key], 0);
          let html = `<div class="hd">${d.year}${d.year === PARTIAL ? " · year-to-date" : ""}</div>`;
          ser.slice().reverse().forEach(s => { if (d[s.key] > 0)
            html += `<div class="row"><span class="k"><i style="background:${s.color}"></i>${s.label}</span><span class="v">${QT.fmt.money(d[s.key])}</span></div>`; });
          html += `<div class="row tot"><span class="k">Total</span><span class="v">${QT.fmt.money(tot)}</span></div>`;
          tt.show(html, e);
        }).on("mouseleave", tt.hide);
    }

    QT.segControl("#seg-scale-instrument", "data-s", s => { state.scale = s; render(); });
    QT.segControl("#seg-type-instrument", "data-t", t => { state.type = t; render(); });
    QT.timeSlider("#slider-instrument", { years: ALL_YEARS, onChange: w => { state.win = w; render(); } });
    render();
  })();

  // ---------- Panel 2: funding by country (teaser top-8 bar) ----------
  (function fundingByCountry() {
    const TOP = 8;
    const accent = QT.tokens.accent;
    const rows = country.data.filter(d => d.total_funding != null).sort((a, b) => b.total_funding - a.total_funding).slice(0, TOP);

    const W = 420, H = 260;
    const c = QT.chart("#chart-country", { W, H, margin: { t: 6, r: 56, b: 26, l: 90 } });
    const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.total_funding) * 1.05]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(d => d.country)).range([0, c.ih]).padding(0.22);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rows, d => d.country).join("rect")
      .attr("x", 0).attr("y", d => y(d.country)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", accent).attr("fill-opacity", 0.9).attr("width", d => x(d.total_funding))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.country}</div><div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rows, d => d.country).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.country) + y.bandwidth() / 2).attr("x", d => x(d.total_funding) + 6)
      .text(d => QT.fmt.money(d.total_funding));
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  })();

  // ---------- Panel 3: cluster share of funding (real, hero stat + 100% bar) ----------
  (function clusterShare() {
    const share = totalClusterFunding / totalFunding;
    d3.select("#cluster-share-headline").text(`${QT.fmt.pct0(share)} of funding sits in a named cluster`);

    const segs = [
      { key: "cluster", v: share, label: "In a named cluster", color: QT.tokens.accent },
      { key: "other", v: 1 - share, label: "Elsewhere", color: QT.tokens.line },
    ];

    const W = 420, H = 170;
    const c = QT.chart("#chart-clustershare", { W, H, margin: { t: 4, r: 4, b: 4, l: 4 } });
    const cx = c.iw / 2, cy = c.ih / 2;
    const r = Math.min(c.iw, c.ih) / 2 - 4;
    const rInner = r * 0.64;
    const ring = c.g.append("g").attr("transform", `translate(${cx},${cy})`);

    ring.append("path")
      .attr("d", d3.arc().innerRadius(rInner).outerRadius(r).startAngle(0).endAngle(2 * Math.PI)())
      .attr("fill", QT.tokens.line)
      .on("mousemove", (e) => tt.show(`<div class="hd">Elsewhere</div><div class="row"><span class="v">${QT.fmt.pct1(1 - share)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    ring.append("path")
      .attr("d", d3.arc().innerRadius(rInner).outerRadius(r).startAngle(0).endAngle(share * 2 * Math.PI)())
      .attr("fill", QT.tokens.accent)
      .on("mousemove", (e) => tt.show(`<div class="hd">In a named cluster</div><div class="row"><span class="v">${QT.fmt.pct1(share)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    ring.append("text").attr("text-anchor", "middle").attr("dy", "0.32em")
      .attr("font-size", 27).attr("font-weight", 700).attr("fill", QT.tokens.ink).text(QT.fmt.pct1(share));

    QT.legend("#legend-clustershare", segs.map(s => ({ key: s.key, label: s.label, color: s.color })));
  })();

  // ---------- Panel 4: collaboration archetypes (2×2 scatter, MOCK) ----------
  (function archetypes() {
    document.getElementById("badge-archetype").innerHTML = QT.mockBadge();
    QT.mockNote("#mocknote-archetype", profile.meta.source_note);

    const rows = profile.data;
    const THRESH = 55;
    const W = 880, H = 340;
    const c = QT.chart("#chart-archetype", { W, H, margin: { t: 10, r: 20, b: 34, l: 46 } });
    const x = d3.scaleLinear().domain([0, 100]).range([0, c.iw]);
    const y = d3.scaleLinear().domain([0, 100]).range([c.ih, 0]);

    c.g.append("line").attr("x1", x(THRESH)).attr("x2", x(THRESH)).attr("y1", 0).attr("y2", c.ih).attr("class", "gridline");
    c.g.append("line").attr("x1", 0).attr("x2", c.iw).attr("y1", y(THRESH)).attr("y2", y(THRESH)).attr("class", "gridline");

    const quadLabel = (qx, qy, text, anchor) => c.g.append("text")
      .attr("x", qx).attr("y", qy).attr("text-anchor", anchor).attr("font-size", 11)
      .attr("fill", QT.tokens.muted).attr("font-style", "italic").text(text);
    quadLabel(c.iw - 6, 14, "Global Hub", "end");
    quadLabel(6, 14, "Domestic Commercialiser", "start");
    quadLabel(c.iw - 6, c.ih - 8, "Research Networker", "end");
    quadLabel(6, c.ih - 8, "Emerging Ecosystem", "start");

    c.gPlot.selectAll("circle").data(rows, d => d.country).join("circle")
      .attr("cx", d => x(d.connectedness)).attr("cy", d => y(d.commercial_intensity))
      .attr("r", 5.5).attr("fill", d => QT.palette.archetype[d.archetype]).attr("fill-opacity", 0.85)
      .attr("stroke", "#fff").attr("stroke-width", 1)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.country}</div>` +
        `<div class="row"><span class="k">Archetype</span><span class="v">${d.archetype}</span></div>` +
        `<div class="row"><span class="k">Connectedness</span><span class="v">${d.connectedness}</span></div>` +
        `<div class="row"><span class="k">Commercial intensity</span><span class="v">${d.commercial_intensity}</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.gx.call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
    c.g.append("text").attr("x", c.iw / 2).attr("y", c.ih + 30).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", QT.tokens.muted).text("Global connectedness →");
    c.g.append("text").attr("x", -c.ih / 2).attr("y", -32).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("font-size", 11).attr("fill", QT.tokens.muted).text("Commercial intensity →");
  })();

  // ---------- Panel: funding by stage, two blocs compared (REAL) ----------
  (function fundingByStage() {
    const STAGES = stageRegion.data.stages;
    const BLOCS = {};
    stageRegion.data.regions.forEach(r => { BLOCS[r.region] = { label: r.region, hex: QT.palette.region[r.region] || QT.tokens.muted, v: r.values, total: d3.sum(r.values) }; });
    const KEYS = Object.keys(BLOCS);

    const state = { a: KEYS[0], b: KEYS[2] || KEYS[1], scale: "share" };
    KEYS.forEach(k => ["#stage-ra", "#stage-rb"].forEach(s => d3.select(s).append("option").attr("value", k).text(BLOCS[k].label)));
    d3.select("#stage-ra").property("value", state.a);
    d3.select("#stage-rb").property("value", state.b);

    const W = 880, H = 300;
    const c = QT.chart("#chart-stage", { W, H, margin: { t: 16, r: 70, b: 30, l: 215 } });
    const yb = d3.scaleBand().domain(STAGES).range([0, c.ih]).padding(0.32);
    c.g.append("g").selectAll("text").data(STAGES).join("text")
      .attr("class", "bar-val").style("font-size", "11px")
      .attr("x", -12).attr("y", d => yb(d) + yb.bandwidth() / 2).attr("dy", "0.32em")
      .attr("text-anchor", "end").attr("fill", QT.tokens.muted).text(d => d);

    function legend() {
      const items = [state.a, state.b].map(k => ({ key: k, label: BLOCS[k].label, color: BLOCS[k].hex }));
      QT.legend("#legend-stage", items);
      d3.select("#legend-stage").selectAll(".lg .nm").text(d => `${BLOCS[d.key].label} · ${QT.fmt.money(BLOCS[d.key].total)} total`);
    }

    function render() {
      const A = BLOCS[state.a], B = BLOCS[state.b], share = state.scale === "share";
      const val = (b, i) => share ? (b.total ? b.v[i] / b.total : 0) : b.v[i];
      const maxV = d3.max([A, B], b => d3.max(b.v.map((_, i) => val(b, i)))) || 1;
      const x = d3.scaleLinear().domain([0, maxV * 1.02]).range([0, c.iw]);
      const bh = yb.bandwidth() / 2 - 2;

      c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
        .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", c.ih);
      c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(share ? QT.fmt.pct0 : QT.fmt.axisMoney).tickSizeOuter(0));

      c.gPlot.selectAll("g.blocrow").data([[A, 0], [B, bh + 4]], p => p[0].label)
        .join(e => e.append("g").attr("class", "blocrow"), u => u, x2 => x2.remove())
        .each(function (p) {
          const bloc = p[0], off = p[1];
          const rs = STAGES.map((s, i) => ({ stage: s, v: bloc.v[i], val: val(bloc, i) }));
          const g = d3.select(this);
          g.selectAll("rect").data(rs, d => d.stage).join("rect")
            .attr("x", 0).attr("y", d => yb(d.stage) + off).attr("height", bh).attr("rx", 2)
            .attr("fill", bloc.hex).attr("fill-opacity", 0.88).attr("width", d => x(d.val))
            .on("mousemove", (e, d) => tt.show(
              `<div class="hd">${bloc.label} · ${d.stage}</div>` +
              `<div class="row"><span class="k">Amount</span><span class="v">${QT.fmt.money(d.v)}</span></div>` +
              `<div class="row"><span class="k">Share of bloc</span><span class="v">${bloc.total ? QT.fmt.pct1(d.v / bloc.total) : "—"}</span></div>`, e))
            .on("mouseleave", tt.hide);
          g.selectAll("text").data(rs, d => d.stage).join("text").attr("class", "bar-val")
            .attr("x", d => x(d.val) + 5).attr("y", d => yb(d.stage) + off + bh / 2).attr("dy", "0.32em")
            .text(d => d.v === 0 ? "" : (share ? (bloc.total ? QT.fmt.pct0(d.v / bloc.total) : "") : QT.fmt.money(d.v)));
        });
      legend();
    }

    d3.select("#stage-ra").on("change", function () { state.a = this.value; render(); });
    d3.select("#stage-rb").on("change", function () { state.b = this.value; render(); });
    QT.segControl("#seg-scale-stage", "data-s", s => { state.scale = s; render(); });
    render();
  })();
})();
