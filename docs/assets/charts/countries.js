/* Country dashboard (Layer 1) — world map + KPIs + 5 panels for a selected country.
   Real data: world map, ranked bars (funding_by_country.json / funding_by_cluster.json).
   Mock data: institutions, domain split, archetype, RCA, network partners
   (docs/data/mock_country_profile.json — see meta.source_note). */
(async function () {
  QT.injectCSS();
  QT.nav("#nav", "countries");
  renderWorldMap("#worldmap");

  const [country, profile] = await Promise.all([
    QT.loadData("funding_by_country"),
    QT.loadData("mock_country_profile"),
  ]);
  QT.vintage("#vintage", country.meta);
  document.getElementById("mocknote-country").innerHTML = profile.meta.source_note;
  ["badge-domain", "badge-archetype2", "badge-rca", "badge-network"].forEach(id => {
    document.getElementById(id).innerHTML = QT.mockBadge();
  });

  const tt = QT.tooltip();
  const byName = new Map(country.data.map(d => [d.country, d]));
  const profileByName = new Map(profile.data.map(d => [d.country, d]));
  const ranked = [...country.data].filter(d => d.total_funding != null).sort((a, b) => b.total_funding - a.total_funding);

  const METRICS = {
    total_funding:  { label: "Total funding", fmt: QT.fmt.axisMoney, ttfmt: QT.fmt.money },
    funding_to_gdp: { label: "Funding ÷ GDP", fmt: QT.fmt.pct1,       ttfmt: QT.fmt.pct1 },
  };

  const sel = d3.select("#country-select");
  sel.selectAll("option").data(ranked).join("option")
    .attr("value", d => d.country).text((d, i) => `${d.country}`);

  let state = { country: byName.has("France") ? "France" : ranked[0].country, metric: "total_funding" };
  sel.property("value", state.country);

  function kpis() {
    const c = byName.get(state.country);
    const p = profileByName.get(state.country);
    const rank = ranked.findIndex(d => d.country === state.country) + 1;
    QT.kpis("#kpis", [
      { v: QT.fmt.axisMoney(c.total_funding), k: `Total funding · rank ${rank} of ${ranked.length}` },
      { v: QT.fmt.int(c.companies), k: "Companies" },
      { v: QT.fmt.int(p.institutions) + "*", k: "Institutions (illustrative)" },
      { v: `<span style="font-size:14px;color:${QT.tokens.purple}">${p.archetype}</span>`, k: "Collaboration archetype (illustrative)" },
    ]);
  }

  // ---------- Panel 1: ranked bars, selected country highlighted (REAL) ----------
  function rankedBars() {
    const M = METRICS[state.metric];
    d3.select("#ttl-ranked").text(`Country ranking: ${M.label.toLowerCase()} — ${state.country} highlighted`);
    let rows = ranked.filter(d => d[state.metric] != null).slice(0, 20);
    if (!rows.some(d => d.country === state.country) && byName.get(state.country)[state.metric] != null) {
      rows = rows.slice(0, 19).concat([byName.get(state.country)]).sort((a, b) => b[state.metric] - a[state.metric]);
    }

    const W = 880, H = 480;
    d3.select("#chart-ranked").selectAll("*").remove();
    const c = QT.chart("#chart-ranked", { W, H, margin: { t: 8, r: 70, b: 30, l: 110 } });
    const x = d3.scaleLinear().domain([0, d3.max(rows, d => d[state.metric]) * 1.02]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(d => d.country)).range([0, c.ih]).padding(0.18);

    c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rows, d => d.country).join("rect")
      .attr("x", 0).attr("y", d => y(d.country)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", d => d.country === state.country ? QT.tokens.accent : QT.tokens.line)
      .attr("width", d => x(d[state.metric]))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.country}</div><div class="row"><span class="k">${M.label}</span><span class="v">${M.ttfmt(d[state.metric])}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rows, d => d.country).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.country) + y.bandwidth() / 2).attr("x", d => x(d[state.metric]) + 6)
      .text(d => M.ttfmt(d[state.metric]));
    c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(M.fmt).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove())
      .selectAll("text").attr("font-weight", d => d === state.country ? 700 : 400);
  }

  // ---------- Panel 2: institution domain split (MOCK, 100% stacked bar) ----------
  function domainSplit() {
    const p = profileByName.get(state.country);
    const avgIndustry = d3.mean(profile.data, d => d.domain_split.industry);
    const segs = ["research", "government", "industry"].map(k => ({ key: k, v: p.domain_split[k], label: k[0].toUpperCase() + k.slice(1), color: QT.palette.domain[k] }));

    const W = 420, H = 90;
    d3.select("#chart-domain").selectAll("*").remove();
    const c = QT.chart("#chart-domain", { W, H, margin: { t: 6, r: 6, b: 6, l: 6 } });
    const x = d3.scaleLinear().domain([0, 1]).range([0, c.iw]);
    let x0 = 0;
    const withX0 = segs.map(s => { const o = { ...s, x0 }; x0 += s.v; return o; });

    c.g.selectAll("rect").data(withX0, d => d.key).join("rect")
      .attr("x", d => x(d.x0)).attr("y", 20).attr("height", 30).attr("rx", 3)
      .attr("width", d => x(d.v)).attr("fill", d => d.color)
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.label}</div><div class="row"><span class="v">${QT.fmt.pct1(d.v)}</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.g.append("line").attr("x1", x(avgIndustry)).attr("x2", x(avgIndustry)).attr("y1", 14).attr("y2", 56)
      .attr("stroke", QT.tokens.ink).attr("stroke-dasharray", "2 2");
    c.g.append("text").attr("x", x(avgIndustry)).attr("y", 66).attr("text-anchor", "middle").attr("font-size", 9.5)
      .attr("fill", QT.tokens.muted).text("cross-country avg. industry share");

    QT.legend("#legend-domain", segs.map(s => ({ key: s.key, label: s.label, color: s.color })));
  }

  // ---------- Panel 3: archetype 2×2, selected country highlighted (MOCK) ----------
  function archetypePanel() {
    const THRESH = 55;
    const W = 420, H = 320;
    d3.select("#chart-archetype2").selectAll("*").remove();
    const c = QT.chart("#chart-archetype2", { W, H, margin: { t: 10, r: 14, b: 30, l: 40 } });
    const x = d3.scaleLinear().domain([0, 100]).range([0, c.iw]);
    const y = d3.scaleLinear().domain([0, 100]).range([c.ih, 0]);

    c.g.append("line").attr("x1", x(THRESH)).attr("x2", x(THRESH)).attr("y1", 0).attr("y2", c.ih).attr("class", "gridline");
    c.g.append("line").attr("x1", 0).attr("x2", c.iw).attr("y1", y(THRESH)).attr("y2", y(THRESH)).attr("class", "gridline");

    c.gPlot.selectAll("circle").data(profile.data, d => d.country).join("circle")
      .attr("cx", d => x(d.connectedness)).attr("cy", d => y(d.commercial_intensity))
      .attr("r", d => d.country === state.country ? 7.5 : 4)
      .attr("fill", d => QT.palette.archetype[d.archetype])
      .attr("fill-opacity", d => d.country === state.country ? 1 : 0.28)
      .attr("stroke", d => d.country === state.country ? QT.tokens.ink : "none").attr("stroke-width", 1.5)
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.country}</div><div class="row"><span class="k">Archetype</span><span class="v">${d.archetype}</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.gx.call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));
    c.g.append("text").attr("x", c.iw / 2).attr("y", c.ih + 26).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", QT.tokens.muted).text("Global connectedness →");
    c.g.append("text").attr("x", -c.ih / 2).attr("y", -28).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", QT.tokens.muted).text("Commercial intensity →");
  }

  // ---------- Panel 4: RCA horizontal bars (MOCK) ----------
  function rcaPanel() {
    const p = profileByName.get(state.country);
    d3.select("#ttl-rca").html(`National specialisation (RCA) — ${state.country} <span id="badge-rca">${QT.mockBadge()}</span>`);
    const rows = [...p.rca].sort((a, b) => b.rca - a.rca);

    const W = 880, H = 190;
    d3.select("#chart-rca").selectAll("*").remove();
    const c = QT.chart("#chart-rca", { W, H, margin: { t: 6, r: 40, b: 26, l: 190 } });
    const x = d3.scaleLinear().domain([0, Math.max(2.5, d3.max(rows, d => d.rca) * 1.1)]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(d => d.domain)).range([0, c.ih]).padding(0.28);

    c.gPlot.selectAll("rect").data(rows, d => d.domain).join("rect")
      .attr("x", 0).attr("y", d => y(d.domain)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", d => d.rca >= 1 ? QT.tokens.accent : QT.tokens.line)
      .attr("width", d => x(d.rca))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.domain}</div><div class="row"><span class="k">RCA</span><span class="v">${d.rca.toFixed(2)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rows, d => d.domain).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.domain) + y.bandwidth() / 2).attr("x", d => x(d.rca) + 6).text(d => d.rca.toFixed(2));
    c.g.append("line").attr("x1", x(1)).attr("x2", x(1)).attr("y1", 0).attr("y2", c.ih).attr("stroke", QT.tokens.muted).attr("stroke-dasharray", "2 2");
    c.gx.call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  // ---------- Panel 5: network role + top partners (MOCK) ----------
  function networkPanel() {
    const p = profileByName.get(state.country);
    d3.select("#ttl-network").html(`Connectedness and top partners — ${state.country} <span id="badge-network">${QT.mockBadge()}</span>`);
    const body = d3.select("#network-body");
    body.selectAll("*").remove();
    body.append("div").style("font-size", "12px").style("color", "var(--muted)").style("margin-bottom", "8px")
      .html(`Connectedness score <b style="color:var(--ink)">${p.connectedness} / 100</b>`);
    const rows = body.append("div");
    p.top_partners.forEach(tp => {
      const row = rows.append("div").style("display", "flex").style("align-items", "center").style("gap", "10px").style("margin", "6px 0");
      row.append("div").style("width", "90px").style("font-size", "12.5px").text(tp.country);
      row.append("div").style("flex", "1").style("height", "8px").style("background", "var(--line)").style("border-radius", "4px")
        .append("div").style("height", "8px").style("border-radius", "4px").style("background", QT.tokens.teal)
        .style("width", (tp.score * 100) + "%");
      row.append("div").style("width", "40px").style("text-align", "right").style("font-size", "11.5px").style("color", "var(--muted)").text(tp.score.toFixed(2));
    });
  }

  function render() { kpis(); rankedBars(); domainSplit(); archetypePanel(); rcaPanel(); networkPanel(); }

  sel.on("change", function () { state.country = this.value; render(); });
  QT.segControl("#seg-metric-country", "data-m", m => { state.metric = m; render(); });
  render();
})();
