/* Country dashboard (Layer 1) — KPIs + panels for a selected country.
   Real data: ranked bars (funding_by_country.json / funding_by_cluster.json).
   Mock data: institutions, domain split, archetype, RCA, network partners
   (docs/data/mock_country_profile.json — see meta.source_note).
   The world map (country choropleth + cluster bubbles) leads the Overview tab. */
QT.boot(async function () {
  QT.nav("#nav", "countries");

  const [country, profile, policies, gov, collabCountry, countryInstrument, collabRankings] = await Promise.all([
    QT.loadData("funding_by_country"),
    QT.loadData("mock_country_profile"),
    QT.loadData("mock_country_policies"),
    QT.loadData("government_funding"),
    QT.loadData("collab_by_country"),
    QT.loadData("funding_by_country_instrument"),
    QT.loadData("collab_rankings"),
    QT.loadFlags(),
  ]);
  const INSTRUMENT_KEYS = ["VC / private equity", "Debt", "Grant", "Public equity"];
  const instrumentByCountry = new Map(countryInstrument.data.map(d => [d.country, d]));
  // Real entity-level collaboration counts (industry/government/research), keyed by
  // country for Figure 4 -- unlike the mock "top partners" bars in Figure 3, this is
  // the actual collaboration graph (collab_rankings.json), not a placeholder.
  const rankingsByCountry = d3.group(collabRankings.data, d => d.country);
  // Real per-country collaboration figures, so tiles 5 and 6 mirror the Overview's
  // definitions with actual data instead of the mock profile's `institutions` count:
  // `entities` is every institution in the collaboration graph for that country and
  // `collaborations` its academic + industry partnerships, exactly as the Overview
  // totals are built. mock_country_profile.json has no collaborations field at all.
  const collabByCountry = new Map(collabCountry.data.map(d => [d.country, d]));
  // Government funding here is Dyuti's register alone (see QT.govByCountry),
  // matching the Overview tab. Company funding (below) is a fully separate
  // measure and is never summed into this one (AP-36, reaffirmed AP-57).
  const govByCountry = QT.govByCountry(gov.data);
  const govProvisional = !!gov.meta.provisional;
  QT.vintage("#vintage", country.meta);
  document.getElementById("mocknote-policy").innerHTML = policies.meta.source_note;
  ["badge-archetype2", "badge-rca", "badge-network"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = QT.mockBadge();
  });
  const policyByCountry = new Map(Object.entries(policies.data));
  const POLICY_COLORS = {
    // Gold and teal at full strength fail WCAG AA for white badge text (2.2:1
    // and 4.0:1 respectively) — darkened here, locally, so the shared
    // tokens.gold/tokens.teal used elsewhere (instrument/stage/region
    // palettes) are untouched.
    "Strategy": QT.tokens.accent, "Funding programme": `color-mix(in srgb, ${QT.tokens.gold} 60%, black)`,
    "R&D institute": `color-mix(in srgb, ${QT.tokens.teal} 80%, black)`, "Procurement": QT.tokens.purple,
    "Export control": QT.tokens.rust,
  };

  const tt = QT.tooltip();
  const byName = new Map(country.data.map(d => [d.country, d]));
  const profileByName = new Map(profile.data.map(d => [d.country, d]));
  const ranked = [...country.data].filter(d => d.total_funding != null).sort(QT.rank("total_funding", "country"));

  /* COMPANY or GOVERNMENT, each as an amount or as a share of GDP.
     The panel used to show PRIVATE capital (total minus grants and public equity),
     and Elena's 2026-09-08 correction retires that notion outright: "we decided not to
     use private funding as a notion". Two independent toggles replace it — the source
     (company or government, matching the Overview map and ranking) and the measure
     (dollars, or dollars as a share of GDP, which is what lets a small ecosystem be
     compared with a large one at all). */
  const SOURCES = {
    company_funding:    { label: "Company funding",    title: "company funding" },
    government_funding: { label: "Government funding", title: "government funding" },
  };
  const MEASURES = {
    abs: { suffix: "",                fmt: QT.fmt.axisMoney, ttfmt: QT.fmt.money },
    gdp: { suffix: " ÷ GDP",       fmt: QT.fmt.pct1,      ttfmt: QT.fmt.pct1 },
  };

  /* One row per country carrying both sources and both measures. GDP comes from the
     funding dataset, so a country without a GDP figure yields null for the share
     view rather than Infinity — which would have sorted it to the top of the ranking. */
  const CHART_DATA = country.data.map(d => {
    const g = (govByCountry.get(d.country) || {}).government_funding || 0;
    return {
      country: d.country,
      companies: d.companies,
      clusters: d.clusters,
      gdp: d.gdp,
      company_funding: d.total_funding,
      government_funding: g,
      company_funding_gdp: d.gdp ? d.total_funding / d.gdp : null,
      government_funding_gdp: d.gdp ? g / d.gdp : null,
    };
  });
  // Metric key actually plotted, from the two toggles.
  const metricKey = () => state.source + (state.measure === "gdp" ? "_gdp" : "");

  /* ALPHABETICAL, forced. The dropdown was previously bound to `ranked`, i.e. ordered
     by total funding, so a reader hunting for a country had to already know roughly
     what it had raised. QT.alpha is locale-aware and case-insensitive. */
  const sel = d3.select("#country-select");
  const alphabetical = [...country.data].sort((a, b) => QT.alpha(a.country, b.country));
  sel.selectAll("option").data(alphabetical, d => d.country).join("option")
    .attr("value", d => d.country).text(d => d.country);

  let state = {
    country: byName.has("France") ? "France" : ranked[0].country,
    source: "company_funding",
    measure: "abs",
    instCategory: "Industry",
  };
  sel.property("value", state.country);

  /* The illustrative profile covers 38 of the 43 countries in the dropdown
     (Cyprus, Malta, Pakistan, Saudi Arabia, Slovenia and Tunisia have none), so
     every mock-backed panel has to survive a missing one. They previously did not:
     `kpis()` dereferenced the profile directly and threw, and because `render()`
     calls `kpis()` FIRST, that exception aborted the whole re-render — picking one
     of those six left the entire page, real panels included, still showing the
     previous country. Failing softly per panel keeps the real data working
     regardless of mock coverage. */
  function emptyPanel(selector, message) {
    d3.select(selector).selectAll("*").remove();
    d3.select(selector).attr("viewBox", "0 0 880 56")
      .append("text").attr("x", 4).attr("y", 32)
      .attr("font-size", 12).attr("fill", QT.tokens.muted)
      .text(message);
  }
  const noProfileNote = () =>
    `No illustrative profile for ${state.country} yet — covers ${profile.data.length} of ${country.data.length} tracked countries.`;

  /* THE SAME SIX TILES AS THE OVERVIEW, in the same order, so moving between the two
     tabs compares like with like (Elena: "we could have the boxes here mimic the same
     six we have in the overview for consistency and clarity").

     Two consequences worth stating:
       • Tile WIDTH IS FIXED (`.kpis-fixed`), so it does not change as you pick
         different countries. It used to be an auto-fit grid, so switching from "US" to
         "Netherlands" visibly resized every tile — Elena: "the size of the boxes
         should always stay the same regardless of the country selected".
       • The collaboration archetype has LEFT the strip for its own line below it. It
         is a category, not a measure, and as a tile its longest value
         ("Domestic Commercialiser") set the width of all six.  */
  function kpis() {
    const c = byName.get(state.country);
    const p = profileByName.get(state.country);
    const g = govByCountry.get(state.country);
    const cb = collabByCountry.get(state.country);
    const rank = ranked.findIndex(d => d.country === state.country) + 1;
    QT.kpis("#kpis", [
      { v: QT.fmt.axisMoney(c.total_funding),
        k: `Company funding · rank ${rank} of ${ranked.length}` },
      { v: QT.fmt.int(c.companies), k: "Quantum companies" },
      { v: g && g.government_funding ? QT.fmt.axisMoney(g.government_funding) : "—",
        k: "Government funding" + (govProvisional ? " " + QT.mockBadge("Provisional") : "") },
      // Distinct named clusters this country's companies sit in. Real, but the
      // cluster field is still being filled in, so this rises as curation
      // continues — it is a count of hubs recorded, not of hubs that exist.
      { v: QT.fmt.int(c.clusters), k: "Quantum clusters" },
      { v: cb ? QT.fmt.int(cb.entities) : "—", k: "Institutions active in quantum" },
      { v: cb ? QT.fmt.int(cb.collaborations) : "—", k: "Quantum collaborations" },
    ]);

    d3.select("#archetype-line").html(p
      ? `Collaboration archetype: <b style="color:${QT.palette.archetype[p.archetype] || QT.tokens.purple}">`
        + `${p.archetype}</b> ${QT.mockBadge("Mock")}`
      : "");
  }

  // ---------- Panel 1: ranked bars, selected country highlighted (REAL) ----------
  function rankedBars() {
    const key = metricKey();
    const S = SOURCES[state.source], MEAS = MEASURES[state.measure];
    const M = { label: S.label + MEAS.suffix, fmt: MEAS.fmt, ttfmt: MEAS.ttfmt };
    // Rank by the metric ON SCREEN. This used to slice the top 20 from `ranked`,
    // which is ordered by TOTAL funding, so the ÷ GDP view drew its bars in
    // total-funding order — descending by label, jumbled by length.
    const byMetric = [...CHART_DATA]
      .filter(d => d[key] != null && d[key] > 0)
      .sort(QT.rank(key, "country"));
    // Whether the selected country actually has a value for THIS metric — a country
    // with zero (e.g. Cyprus has no company funding at all) is filtered out of
    // byMetric above and so cannot be "highlighted" or shown "among its neighbours".
    // The title/why text and the leaders-alone fallback below both need to know this,
    // otherwise the copy claims a highlight that never happens on screen — which is
    // what made the fallback look like an unexplained, unchanging top-16 chart.
    const hasSelection = byMetric.some(d => d.country === state.country);
    d3.select("#ttl-ranked").text(hasSelection
      ? `Figure 1: Countries ranked by ${S.title}${MEAS.suffix} — ${state.country} highlighted`
      : `Figure 1: Countries ranked by ${S.title}${MEAS.suffix} — no data for ${state.country}`);
    d3.select("#why-ranked").html(hasSelection
      ? `Where ${state.country} sits among all tracked countries, by `
        + `${S.title}${MEAS.suffix}. The leaders are shown for scale, then the selected `
        + `country among its own neighbours in the ranking. Use <b>Source</b> to switch `
        + `between company and government funding, and <b>Measure</b> to switch between `
        + `absolute amounts and share of GDP.`
      : `${state.country} has no recorded ${S.title}${MEAS.suffix}, so it cannot be placed in `
        + `this ranking. The leaders are shown below for reference. Use <b>Source</b> to switch `
        + `between company and government funding, and <b>Measure</b> to switch between `
        + `absolute amounts and share of GDP.`);
    const noDataNote = hasSelection ? "" :
      `<b>${state.country} has no ${S.title} recorded</b> — showing the leaders only.`;
    const govNote = state.source === "government_funding" && govProvisional
      ? "<b>Government figures are provisional.</b> They are Dyuti's government policy "
        + "register alone and do not include any company-side grant or public-equity "
        + "funding, which is counted only under Company funding." : "";
    const note = [noDataNote, govNote].filter(Boolean).join(" ");
    d3.select("#mocknote-ranked").html(note).style("display", note ? null : "none");

    /* Leaders + a window around the selection, with an explicit break between.
       A flat top-20 could not answer "where does my country sit?" for the ~half
       of the list that never appears in it: appending the selection to the bottom
       put it out of rank order, and for the 11 countries whose private funding is
       0 it drew a zero-width bar, so choosing them looked like nothing happened.
       Showing the leaders for scale, then the selection among its actual
       neighbours, answers both "who leads" and "who is around me". */
    const TOP = 5, WINDOW = 5;
    const idx = byMetric.findIndex(d => d.country === state.country);
    let blocks, skipped = 0;
    if (idx < 0) {
      // Selected country has no value for this metric — show the leaders alone.
      blocks = [byMetric.slice(0, TOP + WINDOW * 2 + 1)];
    } else {
      const lo = Math.max(0, idx - WINDOW);
      const hi = Math.min(byMetric.length, idx + WINDOW + 1);
      if (lo <= TOP) {
        // Window reaches (or overlaps) the leaders — one contiguous run, no break.
        // Floored at TOP + WINDOW + 1 so picking a leader does not collapse the
        // chart to a stub: selecting #1 would otherwise show only six rows.
        blocks = [byMetric.slice(0, Math.max(hi, TOP + WINDOW + 1))];
      } else {
        blocks = [byMetric.slice(0, TOP), byMetric.slice(lo, hi)];
        skipped = lo - TOP;
      }
    }
    // A sentinel row carries the break; `country` doubles as the band-scale key,
    // so it must not collide with a real country name.
    const BREAK = "─break─";
    const rows = [];
    blocks.forEach((b, i) => {
      if (i) rows.push({ country: BREAK, isBreak: true });
      rows.push(...b);
    });
    const rankOf = d => byMetric.indexOf(d) + 1;

    // Height follows the row count so bar thickness stays constant whether the
    // view is one contiguous run or two blocks plus a break.
    const W = 880, H = 38 + rows.length * 22;
    d3.select("#chart-ranked").selectAll("*").remove();
    const c = QT.chart("#chart-ranked", { W, H, margin: { t: 8, r: 70, b: 30, l: 110 } });
    const bars = rows.filter(d => !d.isBreak);
    const x = d3.scaleLinear().domain([0, d3.max(bars, d => d[key]) * 1.02 || 1]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(d => d.country)).range([0, c.ih]).padding(0.18);

    c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));

    // The break: a dashed rule across the plot, labelled with what it hides.
    const brk = rows.find(d => d.isBreak);
    if (brk) {
      const my = y(BREAK) + y.bandwidth() / 2;
      c.gPlot.append("line")
        .attr("x1", 0).attr("x2", c.iw).attr("y1", my).attr("y2", my)
        .attr("stroke", QT.tokens.line).attr("stroke-width", 1).attr("stroke-dasharray", "4 4");
      c.gPlot.append("text")
        .attr("x", 4).attr("y", my).attr("dy", "-0.4em")
        .attr("font-size", 10.5).attr("fill", QT.tokens.muted)
        .text(`${skipped} ${skipped === 1 ? "country" : "countries"} not shown`);
    }

    c.gPlot.selectAll("rect").data(bars, d => d.country).join("rect")
      .attr("x", 0).attr("y", d => y(d.country)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", d => d.country === state.country ? QT.tokens.accent : QT.tokens.line)
      .attr("width", d => x(d[key]))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${QT.flag(d.country)}${d.country}</div>` +
        `<div class="row"><span class="k">Rank</span><span class="v">${rankOf(d)} of ${byMetric.length}</span></div>` +
        `<div class="row"><span class="k">${M.label}</span><span class="v">${M.ttfmt(d[key])}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(bars, d => d.country).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.country) + y.bandwidth() / 2).attr("x", d => x(d[key]) + 6)
      .text(d => M.ttfmt(d[key]));
    c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(M.fmt).tickSizeOuter(0));
    // Rank prefixes the label: with a break in the axis, position alone no longer
    // tells you where a row sits in the full list.
    const rankByName = new Map(bars.map(d => [d.country, rankOf(d)]));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove())
      .selectAll("text")
      .attr("font-weight", d => d === state.country ? 700 : 400)
      .attr("fill", d => d === BREAK ? QT.tokens.muted : null)
      .text(d => d === BREAK ? "⋯" : `${rankByName.get(d)}. ${d}`);
  }

  // ---------- Panel 2: company funding by financing instrument, pie (REAL) ----------
  function instrumentPie() {
    const row = instrumentByCountry.get(state.country);
    const total = row ? d3.sum(INSTRUMENT_KEYS, k => row[k]) : 0;
    const SERIES = INSTRUMENT_KEYS
      .map(k => ({ key: k, label: k, color: QT.palette.instrument[k], value: row ? row[k] : 0 }))
      .filter(d => d.value > 0);

    QT.legend("#legend-instrument-country", INSTRUMENT_KEYS.map(k =>
      ({ key: k, label: k, color: QT.palette.instrument[k] })));

    if (!total) return emptyPanel("#chart-instrument-country",
      `${state.country} has no recorded company funding by instrument.`);

    const W = 880, H = 300, R = 118;
    d3.select("#chart-instrument-country").selectAll("*").remove();
    const c = QT.chart("#chart-instrument-country", { W, H, margin: { t: 10, r: 10, b: 10, l: 10 } });
    // Centred in the left half of the panel width, same proportions as the other
    // full-width charts — leaves the right two-thirds free rather than stretching
    // the pie itself, which just makes the slices harder to compare by eye.
    const cx = W * 0.28, cy = H / 2;
    const g = c.svg.append("g").attr("transform", `translate(${cx},${cy})`);

    const pie = d3.pie().sort(null).value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(R);
    const hoverArc = d3.arc().innerRadius(0).outerRadius(R + 6);

    g.selectAll("path").data(pie(SERIES), d => d.data.key).join("path")
      .attr("fill", d => d.data.color)
      .attr("stroke", QT.tokens.bg).attr("stroke-width", 1.5)
      .attr("d", arc)
      .on("mousemove", (e, d) => {
        d3.select(e.currentTarget).attr("d", hoverArc);
        tt.show(
          `<div class="hd">${d.data.label}</div>` +
          `<div class="row"><span class="k">Amount</span><span class="v">${QT.fmt.money(d.data.value)}</span></div>` +
          `<div class="row"><span class="k">Share</span><span class="v">${QT.fmt.pct1(d.data.value / total)}</span></div>`, e);
      })
      .on("mouseleave", (e) => { d3.select(e.currentTarget).attr("d", arc); tt.hide(); });

    g.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em")
      .attr("font-size", 18).attr("font-weight", 700).attr("fill", QT.tokens.ink)
      .text(QT.fmt.axisMoney(total));
    g.append("text").attr("text-anchor", "middle").attr("dy", "1.3em")
      .attr("font-size", 10.5).attr("fill", QT.tokens.muted).text("Total company funding");

    // Labels for slices wide enough to hold one — the same "only if it fits"
    // rule Figure 4's founding-split bar uses, rather than crowding a thin
    // wedge (e.g. Debt) with a share label that overlaps its neighbours.
    g.selectAll("text.slice-val").data(pie(SERIES).filter(d => (d.endAngle - d.startAngle) > 0.35), d => d.data.key)
      .join("text").attr("class", "slice-val")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle").attr("dy", "0.32em")
      .attr("font-size", 11).attr("font-weight", 600).attr("fill", "#fff")
      .text(d => QT.fmt.pct0(d.data.value / total));

    d3.select("#mocknote-instrument").style("display", "none");
  }

  // ---------- Figure 4: top institutions by collaboration count (REAL) ----------
  // Distinct from the research/government/industry SPLIT panel removed 2026-09-08
  // (mock, uninformative proportions): this ranks actual named institutions within
  // one category by their real collaboration count, from collab_rankings.json.
  function institutionsPanel() {
    const rows = (rankingsByCountry.get(state.country) || [])
      .filter(d => d.category === state.instCategory && d.collaborations > 0)
      .sort(QT.rank("collaborations", "entity"))
      .slice(0, 3);

    if (!rows.length) return emptyPanel("#chart-institutions",
      `No ${state.instCategory.toLowerCase()} institutions with recorded collaborations for ${state.country}.`);

    const color = QT.palette.domain[state.instCategory.toLowerCase()] || QT.tokens.accent;
    const W = 880, H = 46 + rows.length * 34;
    d3.select("#chart-institutions").selectAll("*").remove();
    const c = QT.chart("#chart-institutions", { W, H, margin: { t: 6, r: 70, b: 26, l: 260 } });
    const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.collaborations) * 1.05 || 1]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(d => d.entity)).range([0, c.ih]).padding(0.3);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rows, d => d.entity).join("rect")
      .attr("x", 0).attr("y", d => y(d.entity)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", color).attr("fill-opacity", 0.9).attr("width", d => x(d.collaborations))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.entity}</div>` +
        `<div class="row"><span class="k">Type</span><span class="v">${d.type || d.category}</span></div>` +
        `<div class="row"><span class="k">City</span><span class="v">${d.city || "—"}</span></div>` +
        `<div class="row"><span class="k">Collaborations</span><span class="v">${QT.fmt.int(d.collaborations)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rows, d => d.entity).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.entity) + y.bandwidth() / 2).attr("x", d => x(d.collaborations) + 6)
      .text(d => QT.fmt.int(d.collaborations));
    c.gx.call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  /* The institution research/government/industry split panel was REMOVED 2026-09-08.
     It was mock, it was not informative ("i think we didn't really like" it), and
     dropping it frees the row so the archetype scatter can take the full panel width
     it needs to be legible at all — Elena: "perhaps we can remove the institution
     split chart and make the archetype chart bigger?" */

  // ---------- Panel 3: archetype 2×2, selected country highlighted (MOCK) ----------
  function archetypePanel() {
    const THRESH = 55;
    const W = 880, H = 380;
    d3.select("#chart-archetype2").selectAll("*").remove();
    const c = QT.chart("#chart-archetype2", { W, H, margin: { t: 10, r: 14, b: 30, l: 40 } });
    const x = d3.scaleLinear().domain([0, 100]).range([0, c.iw]);
    const y = d3.scaleLinear().domain([0, 100]).range([c.ih, 0]);

    // Quadrant tints + corner labels, added 2026-09-18 so the four archetypes read
    // at a glance instead of only on hover — a faint fill in each archetype's own
    // colour (palette.archetype), at just enough opacity to separate the quadrants
    // without competing with the dots. Kept out of gPlot (which the hover targets
    // use) so the tints never intercept a mousemove meant for a dot.
    const QUADRANTS = [
      { key: "Domestic Commercialiser", x0: 0, x1: x(THRESH), y0: 0, y1: y(THRESH), lx: 8, ly: 16, anchor: "start" },
      { key: "Global Hub", x0: x(THRESH), x1: c.iw, y0: 0, y1: y(THRESH), lx: c.iw - 8, ly: 16, anchor: "end" },
      { key: "Emerging Ecosystem", x0: 0, x1: x(THRESH), y0: y(THRESH), y1: c.ih, lx: 8, ly: c.ih - 10, anchor: "start" },
      { key: "Research Networker", x0: x(THRESH), x1: c.iw, y0: y(THRESH), y1: c.ih, lx: c.iw - 8, ly: c.ih - 10, anchor: "end" },
    ];
    c.g.selectAll("rect.quadrant").data(QUADRANTS, d => d.key).join("rect").attr("class", "quadrant")
      .attr("x", d => d.x0).attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
      .attr("fill", d => QT.palette.archetype[d.key]).attr("fill-opacity", 0.06);
    c.g.selectAll("text.quadrant-label").data(QUADRANTS, d => d.key).join("text").attr("class", "quadrant-label")
      .attr("x", d => d.lx).attr("y", d => d.ly).attr("text-anchor", d => d.anchor)
      .attr("font-size", 9.5).attr("font-weight", 650).attr("letter-spacing", "0.02em")
      .attr("fill", d => QT.palette.archetype[d.key]).attr("fill-opacity", 0.75)
      .text(d => d.key.toUpperCase());

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
    d3.select("#ttl-rca").html(`Figure 7: National specialisation — ${state.country} <span id="badge-rca">${QT.mockBadge()}</span>`);
    if (!p) return emptyPanel("#chart-rca", noProfileNote());
    const rows = [...p.rca].sort(QT.rank("rca", "domain"));

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

  // ---------- Collaboration: connectedness + top partners (MOCK) ----------
  function networkPanel() {
    const p = profileByName.get(state.country);
    d3.select("#ttl-network").html(`Figure 3: Collaboration: global connectedness and top partners — ${state.country} <span id="badge-network">${QT.mockBadge()}</span>`);
    if (!p) return emptyPanel("#chart-network", noProfileNote());
    const partners = [...p.top_partners].sort(QT.rank("score", "country"));

    const rowH = 44, topPad = 66, botPad = 24, W = 880;
    const H = topPad + partners.length * rowH + botPad;
    d3.select("#chart-network").selectAll("*").remove();
    const c = QT.chart("#chart-network", { W, H, margin: { t: topPad, r: 64, b: botPad, l: 130 } });

    // ---- connectedness header (lives in the top margin, above the partner bars) ----
    const hdr = c.svg.append("g").attr("transform", `translate(130,16)`);
    hdr.append("text").attr("y", 0).attr("font-size", 11).attr("fill", QT.tokens.muted).text("Global connectedness");
    hdr.append("rect").attr("x", 0).attr("y", 8).attr("width", c.iw).attr("height", 12).attr("rx", 6).attr("fill", QT.tokens.line);
    hdr.append("rect").attr("x", 0).attr("y", 8).attr("width", c.iw * p.connectedness / 100).attr("height", 12).attr("rx", 6).attr("fill", QT.tokens.accent);
    hdr.append("text").attr("x", c.iw).attr("y", 18).attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", 700)
      .attr("fill", QT.tokens.ink).text(`${p.connectedness} / 100`);
    c.g.append("text").attr("x", -12).attr("y", -10).attr("text-anchor", "end").attr("font-size", 11)
      .attr("fill", QT.tokens.muted).text("Top partners");

    // ---- top-partner bars (partnership strength 0–1) ----
    const x = d3.scaleLinear().domain([0, 1]).range([0, c.iw]);
    const y = d3.scaleBand().domain(partners.map(d => d.country)).range([0, c.ih]).padding(0.4);

    c.g.selectAll("text.plabel").data(partners, d => d.country).join("text")
      .attr("class", "plabel").attr("x", -12).attr("y", d => y(d.country) + y.bandwidth() / 2).attr("dy", "0.32em")
      .attr("text-anchor", "end").style("font-size", "12.5px").attr("fill", QT.tokens.ink).text(d => d.country);
    c.gPlot.selectAll("rect.track").data(partners, d => d.country).join("rect")
      .attr("class", "track").attr("x", 0).attr("y", d => y(d.country)).attr("width", c.iw).attr("height", y.bandwidth())
      .attr("rx", 3).attr("fill", QT.tokens.line).attr("fill-opacity", 0.6);
    c.gPlot.selectAll("rect.fill").data(partners, d => d.country).join("rect")
      .attr("class", "fill").attr("x", 0).attr("y", d => y(d.country)).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", QT.tokens.teal).attr("width", d => x(d.score))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${state.country} · ${d.country}</div><div class="row"><span class="k">Partnership strength</span><span class="v">${d.score.toFixed(2)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(partners, d => d.country).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em").attr("y", d => y(d.country) + y.bandwidth() / 2)
      .attr("x", d => x(d.score) + 6).text(d => d.score.toFixed(2));
    c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".1f")).tickSizeOuter(0));
  }

  // ---------- Policy & public programmes (MOCK, curated flagship list) ----------
  function policiesPanel() {
    const list = policyByCountry.get(state.country) || [];
    d3.select("#ttl-policy").html(`Figure 5: Policy and public programmes — ${state.country} <span id="badge-policy">${QT.mockBadge()}</span>`);
    const body = d3.select("#policy-body");
    body.selectAll("*").remove();
    if (!list.length) {
      body.append("div").attr("class", "policy-empty")
        .text(`No public programmes catalogued for ${state.country} yet.`);
      return;
    }
    const grid = body.append("div").attr("class", "policy-grid");
    const card = grid.selectAll(".policy-card").data(list).join("div").attr("class", "policy-card");
    card.append("span").attr("class", "policy-type")
      .style("background", d => POLICY_COLORS[d.type] || QT.tokens.muted).text(d => d.type);
    card.append("div").attr("class", "policy-title").text(d => d.title);
    card.append("div").attr("class", "policy-meta")
      .text(d => `${d.status} · ${d.year}` + (d.public_funding != null ? ` · ${QT.fmt.money(d.public_funding)} public` : ""));
    card.append("div").attr("class", "policy-desc").text(d => d.note);
  }

  function render() { kpis(); rankedBars(); instrumentPie(); networkPanel(); institutionsPanel(); policiesPanel(); archetypePanel(); rcaPanel(); }

  sel.on("change", function () { state.country = this.value; render(); });
  // Only Figure 1 depends on these, so they redraw that panel rather than the page.
  QT.segControl("#seg-source-country", "data-s", v => { state.source = v; rankedBars(); });
  QT.segControl("#seg-measure-country", "data-v", v => { state.measure = v; rankedBars(); });
  QT.segControl("#seg-category-institutions", "data-c", v => { state.instCategory = v; institutionsPanel(); });
  render();
});
