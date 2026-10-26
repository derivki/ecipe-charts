/* Country dashboard (Layer 1) – KPIs + panels for a selected country.
   Real data throughout: ranked bars (funding_by_country.json / funding_by_cluster.json),
   connectedness and top partners (collab_country_partners.json, Figure 3), the archetype
   position (collab_country_archetype.json, Figure 6) and the national specialisation
   (collab_country_specialisation.json, Figure 7). The last mock dataset on this page,
   mock_country_profile.json, was retired with Figure 3 (AP-75).
   The world map (country choropleth + cluster bubbles) leads the Overview tab. */
QT.boot(async function () {
  QT.nav("#nav", "countries");

  const [country, policies, gov, collabCountry, countryInstrument, collabRankings, specialisation, archetypes, partnersData] = await Promise.all([
    QT.loadData("funding_by_country"),
    QT.loadData("mock_country_policies"),
    QT.loadData("government_funding"),
    QT.loadData("collab_by_country"),
    QT.loadData("funding_by_country_instrument"),
    QT.loadData("collab_rankings"),
    QT.loadData("collab_country_specialisation"),
    QT.loadData("collab_country_archetype"),
    QT.loadData("collab_country_partners"),
    QT.loadFlags(),
  ]);
  const INSTRUMENT_KEYS = ["VC / private equity", "Debt", "Grant", "Public equity"];
  const instrumentByCountry = new Map(countryInstrument.data.map(d => [d.country, d]));
  // Real entity-level collaboration counts (industry/government/research), keyed by
  // country for Figure 4 -- unlike the mock "top partners" bars in Figure 3, this is
  // the actual collaboration graph (collab_rankings.json), not a placeholder. The file holds
  // only what Figure 4 displays -- the top 3 institutions per country and category -- not
  // every entity (the full ranking is private, see pipeline_io.PRIVATE_ONLY).
  const rankingsByCountry = d3.group(collabRankings.data, d => d.country);
  // Real per-country collaboration figures, so tiles 5 and 6 mirror the Overview's
  // definitions with actual data:
  // `entities` is every institution in the collaboration graph for that country and
  // `collaborations` its academic + industry partnerships, exactly as the Overview
  // totals are built.
  const collabByCountry = new Map(collabCountry.data.map(d => [d.country, d]));
  // Government funding here is Dyuti's register alone (see QT.govByCountry),
  // matching the Overview tab. Company funding (below) is a fully separate
  // measure and is never summed into this one (AP-36, reaffirmed AP-57).
  const govByCountry = QT.govByCountry(gov.data);
  const govProvisional = !!gov.meta.provisional;
  QT.vintage("#vintage", country.meta);
  const policyByCountry = new Map(Object.entries(policies.data));
  const POLICY_COLORS = {
    // Brand-palette colours only: teal, orange, navy, purple (+ red for export controls). The
    // label is white on every pill (Elena), orange included.
    "Strategy": QT.tokens.accent, "Funding programme": QT.tokens.gold,
    "R&D institute": QT.tokens.navy, "Procurement": QT.tokens.purple,
    "Export control": QT.tokens.rust,
  };

  const tt = QT.tooltip();
  const byName = new Map(country.data.map(d => [d.country, d]));
  const partnersByName = new Map(partnersData.data.countries.map(d => [d.country, d]));
  const ARCH = archetypes.data;
  const archetypeByName = new Map(ARCH.countries.map(d => [d.country, d]));
  // Why a country is not on Figure 6, in the paper's own terms (Occasional Paper 08/2025).
  function archetypeWhyNot(name) {
    if (name in ARCH.below_threshold && ARCH.below_threshold[name] > 0) {
      return `${name} has ${d3.format(".2f")(ARCH.below_threshold[name])} industry-involving collaborations per ` +
        `trillion USD of GDP; at least ${ARCH.min_ratio} is needed`;
    }
    if (name in ARCH.no_gdp) {
      return `${name} has ${QT.fmt.int(ARCH.no_gdp[name])} industry-involving collaborations, but no GDP figure is ` +
        `recorded to compare them with`;
    }
    return `${name} has no industry-involving collaborations recorded`;
  }
  const ranked = [...country.data].filter(d => d.total_funding != null).sort(QT.rank("total_funding", "country"));

  /* COMPANY or GOVERNMENT, each as an amount or as a share of GDP.
     The panel used to show PRIVATE capital (total minus grants and public equity),
     and Elena's 2026-09-08 correction retires that notion outright: "we decided not to
     use private funding as a notion". Two independent toggles replace it – the source
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
     view rather than Infinity – which would have sorted it to the top of the ranking. */
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
    specView: "sector",
  };
  sel.property("value", state.country);

  /* Every panel has to survive a country it has no data for: the dropdown lists every country
     with company funding, and some of them have no collaborations, no GDP or too few
     observations. A panel that dereferenced its data directly would throw, and because
     `render()` runs every panel in turn, one exception left the whole page, real panels
     included, still showing the previous country. Failing softly per panel keeps the
     others working. */
  function emptyPanel(selector, message) {
    d3.select(selector).selectAll("*").remove();
    d3.select(selector).attr("viewBox", "0 0 880 56")
      .append("text").attr("x", 4).attr("y", 32)
      .attr("font-size", 12).attr("fill", QT.tokens.muted)
      .text(message);
  }

  /* THE SAME SIX TILES AS THE OVERVIEW, in the same order, so moving between the two
     tabs compares like with like (Elena: "we could have the boxes here mimic the same
     six we have in the overview for consistency and clarity").

     Two consequences worth stating:
       • Tile WIDTH IS FIXED (`.kpis-fixed`), so it does not change as you pick
         different countries. It used to be an auto-fit grid, so switching from "US" to
         "Netherlands" visibly resized every tile – Elena: "the size of the boxes
         should always stay the same regardless of the country selected".
       • The collaboration archetype has LEFT the strip for its own line below it. It
         is a category, not a measure, and as a tile its longest value
         ("Regional Commercial Leaders") set the width of all six.  */
  function kpis() {
    const c = byName.get(state.country);
    const g = govByCountry.get(state.country);
    const cb = collabByCountry.get(state.country);
    const a = archetypeByName.get(state.country);
    const rank = ranked.findIndex(d => d.country === state.country) + 1;
    QT.kpis("#kpis", [
      { v: QT.fmt.axisMoney(c.total_funding),
        k: `Company funding · rank ${rank} of ${ranked.length}` },
      { v: QT.fmt.int(c.companies), k: "Quantum companies" },
      { v: g && g.government_funding ? QT.fmt.axisMoney(g.government_funding) : "n/a",
        k: "Government funding" + (govProvisional ? " " + QT.mockBadge("Provisional") : "") },
      // Distinct named clusters this country's companies sit in. Real, but the
      // cluster field is still being filled in, so this rises as curation
      // continues – it is a count of hubs recorded, not of hubs that exist.
      { v: QT.fmt.int(c.clusters), k: "Quantum clusters" },
      { v: cb ? QT.fmt.int(cb.entities) : "n/a", k: "Institutions active in quantum" },
      { v: cb ? QT.fmt.int(cb.collaborations) : "n/a", k: "Quantum collaborations" },
    ]);

    // Only the label is bold; the archetype itself is plain text, as in the Figma.
    d3.select("#archetype-line").html(a
      ? `<b>Collaboration archetype:</b> ${a.archetype} (see Figure 6)`
      : `<b>Collaboration archetype:</b> not scored. ${archetypeWhyNot(state.country)} (see Figure 6).`);
  }

  // ---------- Panel 1: ranked bars, selected country highlighted (REAL) ----------
  function rankedBars() {
    const key = metricKey();
    const S = SOURCES[state.source], MEAS = MEASURES[state.measure];
    const M = { label: S.label + MEAS.suffix, fmt: MEAS.fmt, ttfmt: MEAS.ttfmt };
    // Rank by the metric ON SCREEN. This used to slice the top 20 from `ranked`,
    // which is ordered by TOTAL funding, so the ÷ GDP view drew its bars in
    // total-funding order – descending by label, jumbled by length.
    const byMetric = [...CHART_DATA]
      .filter(d => d[key] != null && d[key] > 0)
      .sort(QT.rank(key, "country"));
    // Whether the selected country actually has a value for THIS metric – a country
    // with zero (e.g. Cyprus has no company funding at all) is filtered out of
    // byMetric above and so cannot be "highlighted" or shown "among its neighbours".
    // The title/why text and the leaders-alone fallback below both need to know this,
    // otherwise the copy claims a highlight that never happens on screen – which is
    // what made the fallback look like an unexplained, unchanging top-16 chart.
    const hasSelection = byMetric.some(d => d.country === state.country);
    // Every title on this page ends with the selected country in brackets, and nothing else.
    // Whether the country can actually be placed is explained in the text under the title.
    QT.figTitle("#ttl-ranked", "Figure 1", `Countries ranked by ${S.title}${MEAS.suffix} (${state.country})`);
    d3.select("#why-ranked").html(hasSelection
      ? `Where ${state.country} sits among all tracked countries by `
        + `${S.title}${MEAS.suffix}. The leaders are shown for scale, then ${state.country} `
        + `among its neighbours in the ranking.`
      : `${state.country} has no recorded ${S.title}${MEAS.suffix}, so it cannot be placed in `
        + `this ranking. The leaders are shown below for reference.`);
    const noDataNote = hasSelection ? "" : `<b>No ${S.title} available.</b>`;
    const govNote = state.source === "government_funding" && govProvisional
      ? "<b>Government figures are provisional.</b> They cover identified public funding "
        + "only. Grants and public equity received by companies are counted under "
        + "company funding." : "";
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
      // Selected country has no value for this metric – show the leaders alone.
      blocks = [byMetric.slice(0, TOP + WINDOW * 2 + 1)];
    } else {
      const lo = Math.max(0, idx - WINDOW);
      const hi = Math.min(byMetric.length, idx + WINDOW + 1);
      if (lo <= TOP) {
        // Window reaches (or overlaps) the leaders – one contiguous run, no break.
        // Floored at TOP + WINDOW + 1 so picking a leader does not collapse the
        // chart to a stub: selecting #1 would otherwise show only six rows.
        blocks = [byMetric.slice(0, Math.max(hi, TOP + WINDOW + 1))];
      } else {
        blocks = [byMetric.slice(0, TOP), byMetric.slice(lo, hi)];
        skipped = lo - TOP;
      }
    }
    // A sentinel row carries the break; `country` doubles as the band-scale key,
    // so it must not collide with a real country name. A second, blank sentinel
    // ahead of it reserves a full row of white space above the break line and
    // its label, which otherwise sat pressed right up against the last leader
    // bar above it.
    const BREAK = "─break─", BREAK_GAP = "─break-gap─";
    const rows = [];
    blocks.forEach((b, i) => {
      if (i) rows.push({ country: BREAK_GAP, isBreak: true }, { country: BREAK, isBreak: true });
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
    const brk = rows.find(d => d.country === BREAK);
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
        `<div class="hd">${QT.flag(d.country)} ${d.country}</div>` +
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
      .text(d => d === BREAK ? "⋯" : d === BREAK_GAP ? "" : `${rankByName.get(d)}. ${d}`);
  }

  // ---------- Panel 2: company funding by financing instrument, pie (REAL) ----------
  function instrumentPie() {
    QT.figTitle("#ttl-instrument", "Figure 2", `Company funding by financing instrument (${state.country})`);
    d3.select("#why-instrument").html(
      `How ${state.country}'s company funding splits across the four financing instruments: ` +
      `VC / private equity, debt, grant and public equity. This is the breakdown shown in ` +
      `Overview Figure 2, for one country.`);
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
    const cx = W / 2, cy = H / 2;
    const g = c.svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // Donut, not a full pie: the centre total-funding label used to sit directly on
    // top of whichever slice happened to reach the middle (usually the dominant
    // instrument's colour), which made it unreadable regardless of what text colour
    // was picked. An empty centre gives the label a plain background instead of a
    // moving target, and d3.arc().centroid() for a slice still lands inside the ring
    // rather than at the pie's centre, so it can never collide with the label.
    const INNER = R * 0.58;
    const pie = d3.pie().sort(null).value(d => d.value);
    const arc = d3.arc().innerRadius(INNER).outerRadius(R);
    const hoverArc = d3.arc().innerRadius(INNER).outerRadius(R + 6);

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

    // Labels for slices wide enough to hold one – the same "only if it fits"
    // rule Figure 4's founding-split bar uses, rather than crowding a thin
    // wedge (e.g. Debt) with a share label that overlaps its neighbours.
    g.selectAll("text.slice-val").data(pie(SERIES).filter(d => (d.endAngle - d.startAngle) > 0.35), d => d.data.key)
      .join("text").attr("class", "slice-val")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle").attr("dy", "0.32em")
      .attr("font-size", 11).attr("font-weight", 600).attr("fill", d => QT.textOn(d.data.color))
      .text(d => QT.fmt.pct0(d.data.value / total));

    d3.select("#mocknote-instrument").style("display", "none");
  }

  // ---------- Figure 4: top institutions by collaboration count (REAL) ----------
  // Distinct from the research/government/industry SPLIT panel removed 2026-09-08
  // (mock, uninformative proportions): this ranks actual named institutions within
  // one category by their real collaboration count, from collab_rankings.json.
  function institutionsPanel() {
    QT.figTitle("#ttl-institutions", "Figure 4", `Top 3 institutions by number of collaborations (${state.country})`);
    d3.select("#why-institutions").html(
      `The three institutions headquartered in ${state.country} with the most recorded ` +
      `collaborations, for each category: industry, government and research.`);
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
        `<div class="row"><span class="k">City</span><span class="v">${d.city || "n/a"}</span></div>` +
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
     it needs to be legible at all – Elena: "perhaps we can remove the institution
     split chart and make the archetype chart bigger?" */

  // ---------- Figure 6: archetype 2×2, selected country highlighted (REAL) ----------
  /* The method of Occasional Paper 08/2025 (its Figure 3), built in
     collab_aggregate.build_country_archetypes and read here as it comes:
       x  industry-involving collaborations per trillion USD of GDP (log scale), the
          paper's proxy for commercial intensity;
       y  global connectedness: degree centrality in the country network, i.e. the share
          of the other countries a country collaborates with.
     Bubble area is the country's total collaborations. The two lines are the MEDIANS of
     the countries shown, and each point's archetype is already in the data. */
  function archetypePanel() {
    const W = 880, H = 420;
    const T = ARCH.thresholds, rows = ARCH.countries;
    QT.figTitle("#ttl-archetype", "Figure 6", `Quantum collaboration archetypes (${state.country})`);
    const medX = d3.format(".0f")(T.industry_to_gdp), medY = d3.format(".2f")(T.connectedness);
    d3.select("#howto-archetype").html(
      `<b>How to read it.</b> A bubble above the horizontal line is better connected than the typical country shown, and one ` +
      `to the right of the vertical line is more commercially engaged. The four quadrants are the collaboration archetypes: ` +
      `Global Innovation Hubs (high on both), Research Networkers (more connected, less commercial), Regional Commercial ` +
      `Leaders (more commercial, less connected) and Emerging Ecosystems (low on both). Hover a bubble for its figures.`);
    d3.select("#note-archetype").html(
      `<b>Note:</b> Industry-involving collaborations are measured per trillion USD of GDP. Only countries with an ` +
      `industry-to-GDP collaboration ratio of at least 1 were included in the chart. ` +
      `Named on the chart are the selected country, its three nearest neighbours and the largest country in each quadrant; ` +
      `hover any bubble to see its name. ` +
      `The two lines are the medians of the countries shown: ${medX} industry-involving collaborations per trillion USD of GDP ` +
      `and a global connectedness of ${medY}. The horizontal axis is logarithmic.` +
      (archetypeByName.has(state.country) ? "" : ` <b>${state.country} is not shown.</b> ${archetypeWhyNot(state.country)}.`));
    d3.select("#chart-archetype2").selectAll("*").remove();
    const c = QT.chart("#chart-archetype2", { W, H, margin: { t: 10, r: 18, b: 38, l: 52 } });
    const xMax = Math.pow(10, Math.ceil(Math.log10(d3.max(rows, d => d.industry_to_gdp))));
    const x = d3.scaleLog().domain([1, xMax]).range([0, c.iw]);
    const y = d3.scaleLinear().domain([0, Math.ceil(d3.max(rows, d => d.connectedness) * 10) / 10]).range([c.ih, 0]);
    const r = d3.scaleSqrt().domain([0, d3.max(rows, d => d.collaborations)]).range([2.5, 17]);
    const xt = x(T.industry_to_gdp), yt = y(T.connectedness);

    // Quadrant tints + corner labels, so the four archetypes read at a glance instead of
    // only on hover. The tints and median lines go in gGrid, BENEATH the bubbles in gPlot: they
    // used to be appended to c.g after gPlot, which stacked them on top and swallowed every
    // mousemove meant for a bubble. The labels sit above the bubbles so a bubble never hides
    // one, with pointer-events off for the same reason. Laid out as in the paper: connectedness
    // up, industry involvement to the right.
    const QUADRANTS = [
      { key: "Research Networkers", x0: 0, x1: xt, y0: 0, y1: yt, lx: 8, ly: 16, anchor: "start" },
      { key: "Global Innovation Hubs", x0: xt, x1: c.iw, y0: 0, y1: yt, lx: c.iw - 8, ly: 16, anchor: "end" },
      { key: "Emerging Ecosystems", x0: 0, x1: xt, y0: yt, y1: c.ih, lx: 8, ly: c.ih - 10, anchor: "start" },
      { key: "Regional Commercial Leaders", x0: xt, x1: c.iw, y0: yt, y1: c.ih, lx: c.iw - 8, ly: c.ih - 10, anchor: "end" },
    ];
    c.gGrid.selectAll("rect.quadrant").data(QUADRANTS, d => d.key).join("rect").attr("class", "quadrant")
      .attr("x", d => d.x0).attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
      .attr("fill", d => QT.palette.archetype[d.key]).attr("fill-opacity", 0.06);
    c.gOverlay.style("pointer-events", "none");
    c.gOverlay.selectAll("text.quadrant-label").data(QUADRANTS, d => d.key).join("text").attr("class", "quadrant-label")
      .attr("x", d => d.lx).attr("y", d => d.ly).attr("text-anchor", d => d.anchor)
      .attr("font-size", 9.5).attr("font-weight", 650).attr("letter-spacing", "0.02em")
      .attr("fill", d => QT.palette.archetype[d.key])
      .text(d => d.key.toUpperCase());

    c.gGrid.append("line").attr("x1", xt).attr("x2", xt).attr("y1", 0).attr("y2", c.ih).attr("class", "gridline");
    c.gGrid.append("line").attr("x1", 0).attr("x2", c.iw).attr("y1", yt).attr("y2", yt).attr("class", "gridline");

    const sel_ = d => d.country === state.country;
    // Biggest first, so a small bubble is never hidden under a large one, and the selection
    // last so nothing covers it. Marks follow the other bubble charts: 0.85 fill, a white
    // keyline (Companies Figure 6), and an ink ring on the selection (Clusters Figure 1).
    const drawn = [...rows].sort((p, q) => sel_(p) - sel_(q) || q.collaborations - p.collaborations);
    c.gPlot.selectAll("circle").data(drawn, d => d.country).join("circle")
      .attr("cx", d => x(d.industry_to_gdp)).attr("cy", d => y(d.connectedness))
      .attr("r", d => r(d.collaborations))
      .attr("fill", d => QT.palette.archetype[d.archetype]).attr("fill-opacity", 0.85)
      .attr("stroke", d => sel_(d) ? QT.tokens.ink : "#fff")
      .attr("stroke-width", d => sel_(d) ? 2.5 : 0.9)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.country}</div>` +
        `<div class="row"><span class="k">Archetype</span><span class="v">${d.archetype}</span></div>` +
        `<div class="row"><span class="k">Industry-involving collaborations to GDP</span><span class="v">${d3.format(".1f")(d.industry_to_gdp)}</span></div>` +
        `<div class="row"><span class="k">Industry-involving collaborations</span><span class="v">${QT.fmt.int(d.industry_collaborations)}</span></div>` +
        `<div class="row"><span class="k">Global connectedness</span><span class="v">${d3.format(".2f")(d.connectedness)} (${QT.fmt.int(d.partners)} partner countries)</span></div>` +
        `<div class="row"><span class="k">Total collaborations</span><span class="v">${QT.fmt.int(d.collaborations)}</span></div>`, e))
      .on("mouseleave", tt.hide);

    /* Labels. Always the selected country; then up to three of its nearest neighbours on the chart
       (so a reader sees who it is being compared with), then the largest country in each of the four
       quadrants (a stable reference for what each archetype looks like). Everything else is hover-only.
       Labels are placed in that priority order, each on the first side of its bubble that is free
       (right, left, above, below), and one that would overlap a label already placed, a quadrant
       label or the plot edge is simply dropped, so the crowded bottom-left never turns into a smear.
       The selection is the exception: it is always drawn, on the side that has room. */
    const me = rows.find(sel_);
    const px = d => x(d.industry_to_gdp), py = d => y(d.connectedness);
    const peers = me
      ? rows.filter(d => d !== me)
          .map(d => ({ d, dist: Math.hypot((px(d) - px(me)) / c.iw, (py(d) - py(me)) / c.ih) }))
          .sort((p, q) => p.dist - q.dist).slice(0, 3).map(o => o.d)
      : [];
    const anchors = Object.keys(QT.palette.archetype)
      .map(k => d3.greatest(rows.filter(d => d.archetype === k), d => d.collaborations)).filter(Boolean);
    const queue = [];
    [...(me ? [me] : []), ...peers, ...anchors].forEach(d => { if (!queue.includes(d)) queue.push(d); });

    const taken = c.gOverlay.selectAll("text.quadrant-label").nodes().map(n => n.getBBox());
    const overlaps = (A, B) => A.x < B.x + B.width + 3 && A.x + A.width + 3 > B.x && A.y < B.y + B.height + 2 && A.y + A.height + 2 > B.y;
    queue.forEach(d => {
      const isMe = d === me, rr = r(d.collaborations), cx = px(d), cy = py(d);
      const t = c.gOverlay.append("text").attr("class", isMe ? "me" : "peer")
        .attr("font-size", isMe ? 11.5 : 10).attr("font-weight", isMe ? 700 : 500).attr("fill", QT.tokens.ink)
        .style("paint-order", "stroke").style("stroke", QT.tokens.bg).style("stroke-width", "3px").text(d.country);
      const w = t.node().getComputedTextLength(), h = isMe ? 13 : 12;
      const sides = [
        { ax: "start",  x: cx + rr + 5, y: cy + h * 0.32, bx: cx + rr + 5, by: cy - h / 2 },
        { ax: "end",    x: cx - rr - 5, y: cy + h * 0.32, bx: cx - rr - 5 - w, by: cy - h / 2 },
        { ax: "middle", x: cx, y: cy - rr - 5, bx: cx - w / 2, by: cy - rr - 5 - h + 2 },
        { ax: "middle", x: cx, y: cy + rr + h, bx: cx - w / 2, by: cy + rr + 3 },
      ];
      const fits = o => o.bx >= 0 && o.bx + w <= c.iw && o.by >= 0 && o.by + h <= c.ih
        && !taken.some(B => overlaps({ x: o.bx, y: o.by, width: w, height: h }, B));
      const pick = sides.find(fits) || (isMe ? (cx > c.iw - 110 ? sides[1] : sides[0]) : null);
      if (!pick) { t.remove(); return; }
      t.attr("x", pick.x).attr("y", pick.y).attr("text-anchor", pick.ax);
      taken.push({ x: pick.bx, y: pick.by, width: w, height: h });
    });

    c.gx.call(d3.axisBottom(x).tickValues(d3.range(0, Math.log10(xMax) + 1).map(k => Math.pow(10, k))).tickFormat(d3.format(",")).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".1f")).tickSizeOuter(0));
    c.g.append("text").attr("x", c.iw / 2).attr("y", c.ih + 32).attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", QT.tokens.muted)
      .text("Industry-involving collaborations to GDP");
    c.g.append("text").attr("x", -c.ih / 2).attr("y", -38).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("font-size", 10.5).attr("fill", QT.tokens.muted)
      .text("Global connectedness");
  }

  // ---------- Figure 7: national specialisation (REAL) ----------
  /* Two views of the same question, "what is this country specialised in?" (AP-49):
       sector – the paper's revealed comparative advantage (RCA), computed on the
                cross-border collaborations the country's companies take part in and cut
                by the company's own ICB3 sector (Occasional Paper 08/2025);
       layer  – a specialisation index on the NUMBER OF COMPANIES per stack layer. Not an
                RCA and not funding: a funding-based index would be set by a handful of
                large rounds, and a company count is the closer analogue of a patent count.
     Both come ready-made from collab_country_specialisation.json, already ordered, so
     nothing here recomputes a statistic. */
  const SPEC = specialisation.data;
  const SPEC_TOP = 10;      // bars shown; the rest are summarised in the footnote
  const SPEC_THIN = 3;      // a bar resting on fewer than this many items is drawn lighter
  const SPEC_VIEWS = {
    sector: {
      view: SPEC.sector, floorKey: "min_observations", total: "observations",
      name: d => d.sector, value: d => d.rca, n: d => d.collaborations,
      measure: "RCA", unit: "collaborations", group: d => d.short,
      what: "sector-tagged international collaborations by its companies",
    },
    layer: {
      view: SPEC.company_layer, floorKey: "min_companies", total: "companies",
      name: d => d.layer, value: d => d.index, n: d => d.companies,
      measure: "Specialisation index", unit: "companies", group: null,
      what: "tracked companies with a stack layer",
    },
  };
  /* Three separate texts per view: what the figure shows (above), how to read it (above),
     and where the numbers come from (below the chart). */
  function specText(kind) {
    if (kind === "sector") {
      const o = SPEC.sector.observations;
      return {
        why: `Which industry sectors play the biggest part in ${state.country}'s international quantum collaborations, ` +
          `compared with the rest of the world. The ten highest are shown.`,
        how: `<b>How to read it.</b> Each bar scores one industry sector (the revealed comparative advantage, or RCA). ` +
          `A score of 1.0, the dashed line, means the sector accounts for the same share of ${state.country}'s ` +
          `international collaborations as it does worldwide. Above 1.0, ${state.country} is more active in that sector than ` +
          `the world average (2.0 is twice the world's share); below 1.0, less. Lighter bars rest on fewer than ` +
          `${SPEC_THIN} collaborations, so treat them with care. Hover a bar for the number of collaborations behind it.`,
        note: `Counts collaborations between a company in ${state.country} and a partner in another country, by the ` +
          `company's industry sector (ICB3). A collaboration between companies in two countries counts once for each. ` +
          `A sector is recorded for ${QT.fmt.pct0(o.with_sector / o.industry_side)} of the companies in these ` +
          `collaborations. Countries with fewer than ${SPEC.sector.min_observations} sector-tagged collaborations are ` +
          `not scored, and the world average is taken over the countries that are.`,
        src: `Source: ECIPE Quantum Database; sector (ICB3) of the company; method of ECIPE Occasional Paper 08/2025.`,
      };
    }
    return {
      why: `Which layers of the quantum stack ${state.country}'s companies are concentrated in, compared with the rest of the world.`,
      how: `<b>How to read it.</b> Each bar scores one layer of the quantum stack, the part of the technology chain a ` +
        `company works in (the specialisation index). A score of 1.0, the dashed line, means the layer holds the same ` +
        `share of ${state.country}'s companies as it does worldwide. Above 1.0, ${state.country} has proportionally more ` +
        `companies in that layer than the world average (2.0 is twice the world's share); below 1.0, fewer. Lighter bars ` +
        `rest on fewer than ${SPEC_THIN} companies, so treat them with care. Hover a bar for the number of companies behind it.`,
      note: `Countries with fewer than ${SPEC.company_layer.min_companies} companies are not scored.`,
      src: `Source: ECIPE Quantum Database, company tracker (stack layer of each company).`,
    };
  }
  function specialisationPanel() {
    const V = SPEC_VIEWS[state.specView];
    QT.figTitle("#ttl-rca", "Figure 7", `National specialisation (${state.country})`);
    const T = specText(state.specView);
    d3.select("#why-rca").text(T.why);
    d3.select("#howto-rca").html(T.how);
    d3.select("#note-rca").text(T.note);
    d3.select("#source-rca").text(T.src);
    const entry = V.view.countries.find(c => c.country === state.country);
    if (!entry) {
      const n = V.view.below_floor[state.country];
      return emptyPanel("#chart-rca", n
        ? `${state.country} has only ${n} ${V.what}; at least ${V.view[V.floorKey]} are needed to score it.`
        : `${state.country} has no ${V.what}.`);
    }
    const all = entry.rows, rows = all.slice(0, SPEC_TOP);
    const W = 880, rowH = 28, H = 14 + rows.length * rowH + 30;
    d3.select("#chart-rca").attr("viewBox", `0 0 ${W} ${H}`).selectAll("*").remove();
    const c = QT.chart("#chart-rca", { W, H, margin: { t: 6, r: 56, b: 30, l: 250 } });
    const x = d3.scaleLinear().domain([0, Math.max(2.5, d3.max(rows, V.value) * 1.1)]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(V.name)).range([0, c.ih]).padding(0.28);

    c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    // RCA = 1, "the same as the world", behind the bars so it never cuts through one.
    c.gGrid.append("line").attr("x1", x(1)).attr("x2", x(1)).attr("y1", 0).attr("y2", c.ih)
      .attr("stroke", QT.tokens.ink).attr("stroke-width", 1).attr("stroke-dasharray", "4 4");

    c.gPlot.selectAll("rect").data(rows, V.name).join("rect")
      .attr("x", 0).attr("y", d => y(V.name(d))).attr("height", y.bandwidth()).attr("rx", 2)
      // One colour: the dashed line already says above or below 1.0, so grey for "below" only
      // stacked a second cue on the lighter-bar one (and a thin grey bar all but vanished).
      .attr("fill", QT.tokens.accent)
      .attr("fill-opacity", d => V.n(d) < SPEC_THIN ? 0.45 : 1)
      .attr("width", d => x(V.value(d)))
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${V.name(d)}</div>` +
        (V.group && V.group(d) !== V.name(d) ? `<div class="row"><span class="k">Group</span><span class="v">${V.group(d)}</span></div>` : "") +
        `<div class="row"><span class="k">${V.measure}</span><span class="v">${V.value(d).toFixed(2)}</span></div>` +
        `<div class="row"><span class="k">${QT.fmt.int(V.n(d))} ${V.unit}</span><span class="v">${QT.fmt.pct0(V.n(d) / entry[V.total])}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rows, V.name).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(V.name(d)) + y.bandwidth() / 2).attr("x", d => x(V.value(d)) + 6)
      // a white halo keeps the label legible where it crosses the gridlines or the 1.0 line
      .style("paint-order", "stroke").style("stroke", QT.tokens.bg).style("stroke-width", "3px")
      .text(d => V.value(d).toFixed(2));
    c.gx.call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
  }

  // ---------- Figure 3: connectedness + top partners (REAL) ----------
  /* Both come ready-made from collab_country_partners.json (collab_aggregate.build_country_partners).
     Global connectedness is the same degree centrality Figure 6 plots, from Occasional Paper
     08/2025: the share of the world's other countries this one collaborates with directly.
     The partner bars are the countries it has the most cross-border collaborations with. */
  function networkPanel() {
    const p = partnersByName.get(state.country);
    const net = partnersData.data.network_countries;
    QT.figTitle("#ttl-network", "Figure 3", `Global connectedness and top collaboration partners (${state.country})`);
    d3.select("#why-network").html(
      `<b>Global connectedness</b> is the share of other countries that ${state.country} collaborates with, from 0 to 1` +
      (p ? ` (${QT.fmt.int(p.partners)} of ${QT.fmt.int(net - 1)}). ` : `. `) +
      `The bars show its three leading partners by number of collaborations.`);
    if (!p) return emptyPanel("#chart-network", `${state.country} has no recorded collaboration with an institution in another country.`);
    const partners = p.top_partners;

    const rowH = 44, topPad = 80, botPad = 24, W = 880;
    const H = topPad + partners.length * rowH + botPad;
    d3.select("#chart-network").selectAll("*").remove();
    const L = 150, R = 96;   // R leaves room for the connectedness value to the right of the track
    const c = QT.chart("#chart-network", { W, H, margin: { t: topPad, r: R, b: botPad, l: L } });

    // ---- connectedness header (lives in the top margin, above the partner bars) ----
    // As in the Figma: bold label in the label column, a track as thick as the partner bars, and the
    // score large and teal outside the track on the right, so nothing sits on the bar itself.
    const BAR = 26;
    const hdr = c.svg.append("g").attr("transform", `translate(${L},14)`);
    hdr.append("text").attr("x", -12).attr("y", BAR / 2).attr("dy", "0.32em").attr("text-anchor", "end")
      .attr("font-size", 11).attr("font-weight", 700).attr("fill", QT.tokens.ink).text("Global connectedness:");
    hdr.append("rect").attr("x", 0).attr("y", 0).attr("width", c.iw).attr("height", BAR).attr("rx", 3)
      .attr("fill", QT.tokens.line).attr("fill-opacity", 0.6);
    hdr.append("rect").attr("x", 0).attr("y", 0).attr("width", c.iw * p.connectedness).attr("height", BAR).attr("rx", 3)
      .attr("fill", QT.tokens.accent)
      .on("mousemove", e => tt.show(`<div class="hd">${state.country}</div><div class="row"><span class="k">Global connectedness</span><span class="v">${d3.format(".2f")(p.connectedness)}</span></div><div class="row"><span class="k">Partner countries</span><span class="v">${QT.fmt.int(p.partners)} of ${QT.fmt.int(net - 1)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    hdr.append("text").attr("x", c.iw + 14).attr("y", BAR / 2).attr("dy", "0.36em")
      .attr("fill", QT.tokens.accent).attr("font-weight", 700)
      .call(t => t.append("tspan").attr("font-size", 22).text(d3.format(".2f")(p.connectedness)))
      .call(t => t.append("tspan").attr("font-size", 10).attr("fill", QT.tokens.ink).attr("dx", 5).text("/ 1"));
    c.g.append("text").attr("x", -12).attr("y", -10).attr("text-anchor", "end").attr("font-size", 11)
      .attr("font-weight", 700).attr("fill", QT.tokens.ink).text("Top partners:");

    // ---- top-partner bars (collaborations) ----
    const x = d3.scaleLinear().domain([0, d3.max(partners, d => d.collaborations) * 1.1]).range([0, c.iw]);
    const y = d3.scaleBand().domain(partners.map(d => d.country)).range([0, c.ih]).padding(0.4);

    // Flag reserved in front of the label, same [flag][gap][name] slot QT.flagAxis
    // uses for a real d3 axis -- these ticks are hand-drawn text, not an axis, so the
    // reserved space is built by hand here instead.
    const PLABEL_FLAG = 14, PLABEL_GAP = 6;
    c.g.selectAll("text.plabel").data(partners, d => d.country).join("text")
      .attr("class", "plabel").attr("x", -(12 + PLABEL_FLAG + PLABEL_GAP)).attr("y", d => y(d.country) + y.bandwidth() / 2).attr("dy", "0.32em")
      .attr("text-anchor", "end").style("font-size", "12.5px").attr("fill", QT.tokens.ink).text(d => d.country);
    c.g.selectAll("image.plabel-flag").data(partners, d => d.country).join("image")
      .attr("class", "plabel-flag")
      .attr("href", d => QT.flagCode(d.country) ? `assets/vendor/flags/${QT.flagCode(d.country)}.png` : null)
      .style("display", d => QT.flagCode(d.country) ? null : "none")
      .attr("width", PLABEL_FLAG).attr("height", Math.round(PLABEL_FLAG * 0.75))
      .attr("x", -(12 + PLABEL_FLAG)).attr("y", d => y(d.country) + y.bandwidth() / 2 - Math.round(PLABEL_FLAG * 0.75) / 2)
      .on("error", function () { d3.select(this).style("display", "none"); });
    c.gPlot.selectAll("rect.track").data(partners, d => d.country).join("rect")
      .attr("class", "track").attr("x", 0).attr("y", d => y(d.country)).attr("width", c.iw).attr("height", y.bandwidth())
      .attr("rx", 3).attr("fill", QT.tokens.line).attr("fill-opacity", 0.6);
    c.gPlot.selectAll("rect.fill").data(partners, d => d.country).join("rect")
      .attr("class", "fill").attr("x", 0).attr("y", d => y(d.country)).attr("height", y.bandwidth()).attr("rx", 3)
      .attr("fill", QT.tokens.teal).attr("width", d => x(d.collaborations))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${state.country} · ${QT.flag(d.country)} ${d.country}</div><div class="row"><span class="k">Collaborations</span><span class="v">${QT.fmt.int(d.collaborations)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(partners, d => d.country).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em").attr("y", d => y(d.country) + y.bandwidth() / 2)
      .attr("x", d => x(d.collaborations) + 6)
      .text(d => QT.fmt.int(d.collaborations));
    c.gx.call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")).tickSizeOuter(0));
  }

  // ---------- Policy & public programmes (curated flagship list; no mock badge on the page) ----------
  function policiesPanel() {
    const list = policyByCountry.get(state.country) || [];
    QT.figTitle("#ttl-policy", "Figure 5", `Policy and public programmes (${state.country})`);
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
      .style("background", d => POLICY_COLORS[d.type] || QT.tokens.muted)
      .style("color", "#fff").text(d => d.type);
    card.append("div").attr("class", "policy-title").text(d => d.title);
    card.append("div").attr("class", "policy-meta")
      .html(d => `${d.status} · ${d.year}` + (d.public_funding != null
        ? ` · <span class="policy-money">${QT.fmt.money(d.public_funding)}</span> public` : ""));
    card.append("div").attr("class", "policy-desc").text(d => d.note);

    // A thin vertical rule between neighbouring cards, but not at the start of a row (the number
    // of cards per row depends on the width), so the first card of each row is marked in JS.
    const markRowStarts = () => {
      const cards = card.nodes();
      const left = Math.min(...cards.map(n => n.offsetLeft));
      cards.forEach(n => n.classList.toggle("row-start", n.offsetLeft === left));
    };
    markRowStarts();
    if (policyResize) policyResize.disconnect();
    if (window.ResizeObserver) { policyResize = new ResizeObserver(markRowStarts); policyResize.observe(grid.node()); }
  }
  let policyResize = null;

  function render() { kpis(); rankedBars(); instrumentPie(); networkPanel(); institutionsPanel(); policiesPanel(); archetypePanel(); specialisationPanel(); }

  sel.on("change", function () { state.country = this.value; render(); });
  // Only Figure 1 depends on these, so they redraw that panel rather than the page.
  QT.segControl("#seg-source-country", "data-s", v => { state.source = v; rankedBars(); });
  QT.segControl("#seg-measure-country", "data-v", v => { state.measure = v; rankedBars(); });
  QT.segControl("#seg-category-institutions", "data-c", v => { state.instCategory = v; institutionsPanel(); });
  QT.segControl("#seg-view-specialisation", "data-w", v => { state.specView = v === "layer" ? "layer" : "sector"; specialisationPanel(); });
  render();
});
