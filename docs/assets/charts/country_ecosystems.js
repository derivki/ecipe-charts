/* National ecosystems layer — ILLUSTRATIVE / MOCK data.
   Funding, funding-to-GDP and company counts are real (from the database); the
   institutional split, archetype position and specialisation are placeholders
   until the Paper 08/2025 data is exported. Charts flag this. */

const MOCK = ' <span class="mockflag">illustrative data</span>';

/* ── Archetype scatter (2×2) ────────────────────────────────────────────── */
QT.charts.archetypeScatter = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: (opts.title ?? "Quantum collaboration archetypes") + MOCK,
    sub: opts.compact ? null : "Countries by how internationally connected they are and how much industry is involved relative to GDP.",
    note: opts.compact ? null : "Axes and quadrants follow ECIPE Occasional Paper 08/2025, Figure A. Point positions are placeholder values pending the export of the real collaboration data.",
  });
  const { data } = await QT.loadData("country_ecosystems");
  const rows = data.countries;
  const tt = QT.tooltip();

  const W = 920, H = 470;
  const c = QT.chart(S.svg, { W, H, margin: { t: 26, r: 24, b: 44, l: 56 } });
  const x = d3.scaleLog().domain([Math.max(1, d3.min(rows, d => d.connectedness) * 0.7), d3.max(rows, d => d.connectedness) * 1.25]).range([0, c.iw]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.industry_to_gdp) * 1.12]).range([c.ih, 0]);
  const mx = data.median_connectedness, my = data.median_industry_to_gdp;

  // median crosshair + quadrant labels
  c.gGrid.append("line").attr("class", "gridline").attr("x1", x(mx)).attr("x2", x(mx)).attr("y1", 0).attr("y2", c.ih);
  c.gGrid.append("line").attr("class", "gridline").attr("x1", 0).attr("x2", c.iw).attr("y1", y(my)).attr("y2", y(my));
  const quads = [
    { t: "Regional Commercial Leaders", ax: "start", x: 4, y: 14 },
    { t: "Global Innovation Hubs", ax: "end", x: c.iw - 4, y: 14 },
    { t: "Emerging Ecosystems", ax: "start", x: 4, y: c.ih - 6 },
    { t: "Research Networkers", ax: "end", x: c.iw - 4, y: c.ih - 6 },
  ];
  c.g.selectAll("text.quad-lbl").data(quads).join("text").attr("class", "quad-lbl")
    .attr("x", d => d.x).attr("y", d => d.y).attr("text-anchor", d => d.ax).text(d => d.t);

  c.gx.call(d3.axisBottom(x).ticks(5, "~s").tickSizeOuter(0));
  c.gy.call(d3.axisLeft(y).ticks(5).tickFormat(QT.fmt.pct0).tickSizeOuter(0));
  c.g.append("text").attr("class", "axis-title").attr("x", c.iw / 2).attr("y", c.ih + 38).attr("text-anchor", "middle").text("Global connectedness (log) →");
  c.g.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)").attr("x", -c.ih / 2).attr("y", -42).attr("text-anchor", "middle").text("Industry-involving collaborations ÷ GDP →");

  const dots = c.gPlot.selectAll("circle").data(rows, d => d.country).join("circle")
    .attr("cx", d => x(d.connectedness)).attr("cy", d => y(d.industry_to_gdp)).attr("r", 5)
    .attr("fill", d => QT.palette.archetype[d.archetype]).attr("fill-opacity", 0.78)
    .attr("stroke", "#fff").attr("stroke-width", 0.8)
    .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.country}</div>` +
      `<div class="row"><span class="k"><i style="background:${QT.palette.archetype[d.archetype]}"></i>${d.archetype}</span></div>` +
      `<div class="row"><span class="k">Funding</span><span class="v">${QT.fmt.money(d.funding)}</span></div>`, e))
    .on("mouseleave", tt.hide);
  const lbl = c.gPlot.append("text").attr("class", "bar-val").style("font-weight", "700").attr("dy", -9).attr("text-anchor", "middle");

  QT.legend(S.legend, Object.keys(QT.palette.archetype).map(a => ({ key: a, label: a, color: QT.palette.archetype[a] })));

  function highlight(country) {
    dots.attr("r", d => d.country === country ? 9 : 5).attr("fill-opacity", d => d.country === country ? 1 : 0.55);
    const d = rows.find(r => r.country === country);
    if (d) lbl.attr("x", x(d.connectedness)).attr("y", y(d.industry_to_gdp)).text(d.country).style("display", null);
    else lbl.style("display", "none");
  }
  return { highlight };
};

/* ── Country profile (selector + KPIs + institution split + specialisation) ── */
QT.charts.countryProfile = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: (opts.title ?? "National ecosystem profile") + MOCK,
    sub: opts.compact ? null : "Pick a country. Funding is real; institutional split and specialisation are placeholders.",
    note: null,
  });
  const { data } = await QT.loadData("country_ecosystems");
  const rows = data.countries.slice().sort((a, b) => b.funding - a.funding);
  const tt = QT.tooltip();

  QT.select(S.controls, { label: "Country", value: rows[0].country,
    items: rows.map(r => ({ v: r.country, label: r.country })), onChange: sel });

  const kpis = S.el.insert("div", () => S.legend.node()).attr("class", "kpis").style("grid-template-columns", "repeat(5,minmax(0,1fr))");
  const spec = S.el.append("div").style("margin-top", "12px").style("font-size", "12.5px").style("color", "var(--muted)");

  const W = 620, H = 74;
  const c = QT.chart(S.svg, { W, H, margin: { t: 18, r: 8, b: 8, l: 8 } });
  const DOMAINS = [["research", "Research"], ["government", "Government"], ["industry", "Industry"]];
  QT.legend(S.legend, DOMAINS.map(([k, l]) => ({ key: k, label: l, color: QT.palette.domain[k] })));

  function sel(country) {
    const d = rows.find(r => r.country === country);
    kpis.selectAll(".kpi").data([
      { v: QT.fmt.money(d.funding), k: "Total funding", s: "Database" },
      { v: d.funding_to_gdp != null ? QT.fmt.pct1(d.funding_to_gdp) : "—", k: "Funding ÷ GDP", s: "Database" },
      { v: QT.fmt.int(d.companies || 0), k: "Companies", s: "Database" },
      { v: QT.fmt.int(d.institutions.total), k: "Institutions", s: "Illustrative" },
      { v: d.archetype, k: "Archetype", s: "Paper 08", badge: QT.palette.archetype[d.archetype] },
    ]).join(enter => {
      const k = enter.append("div").attr("class", "kpi");
      k.append("div").attr("class", "v"); k.append("div").attr("class", "k"); k.append("div").attr("class", "s");
      return k;
    }).each(function (t) {
      const k = d3.select(this);
      k.select(".v").style("font-size", t.badge ? "13px" : null).style("color", t.badge || null).text(t.v);
      k.select(".k").text(t.k); k.select(".s").text(t.s);
    });

    // 100% institutional split bar
    const total = d.institutions.total || 1;
    let acc = 0;
    const segs = DOMAINS.map(([key, label]) => { const val = d.institutions[key]; const s = { key, label, val, x0: acc, x1: acc + val }; acc = s.x1; return s; });
    const x = d3.scaleLinear().domain([0, total]).range([0, c.iw]);
    c.gPlot.selectAll("rect").data(segs, s => s.key).join("rect")
      .attr("y", 0).attr("height", 22).attr("rx", 2)
      .attr("fill", s => QT.palette.domain[s.key]).attr("fill-opacity", 0.9)
      .attr("x", s => x(s.x0)).attr("width", s => Math.max(0, x(s.x1) - x(s.x0)))
      .on("mousemove", (e, s) => tt.show(`<div class="hd">${d.country} · ${s.label}</div>` +
        `<div class="row"><span class="k">Institutions</span><span class="v">${s.val}</span></div>` +
        `<div class="row"><span class="k">Share</span><span class="v">${QT.fmt.pct0(s.val / total)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.lbl").data([0]).join("text").attr("class", "quad-lbl").attr("x", 0).attr("y", -6).text("Institutional composition (research / government / industry)");

    spec.html(`<b style="color:var(--ink)">Specialisation (illustrative):</b> ` +
      d.specialisation.map(s => `${s.area} <span style="opacity:.7">(RCA ${s.rca})</span>`).join(" · "));

    if (opts.onSelect) opts.onSelect(country);
  }
  sel(rows[0].country);
};
