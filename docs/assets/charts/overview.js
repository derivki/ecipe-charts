/* Overview dashboard (Layer 0) — KPI strip + panels, all real data (funding
   database + the Stage-1 companies index). The world map (country choropleth,
   company/government toggle, no cluster bubbles) leads this tab — see
   assets/charts/world_map.js.

   The "trusted by" strip was removed 2026-09-08: Elena's rule is that it appears only
   once there are real third-party users of the tracker to name, and a strip of
   "Partner logo" placeholders on the front page of a published tracker claims
   endorsement that does not exist yet. */
QT.boot(async function () {
  QT.nav("#nav", "overview");

  const [country, cluster, instrYear, stageRegion, manifest, companies, gov, collabManifest] =
    await Promise.all([
      QT.loadData("funding_by_country"),
      QT.loadData("funding_by_cluster"),
      QT.loadData("funding_by_instrument_year"),
      QT.loadData("funding_by_stage_region"),
      QT.loadData("manifest"),
      QT.loadData("companies"),
      QT.loadData("government_funding"),
      QT.loadData("collab_manifest"),
      QT.loadFlags(),
    ]);
  QT.vintage("#vintage", country.meta);

  // Government funding by country, keyed for lookup by the map and the ranking.
  // See QT.combinedGovByCountry for why this is Dyuti's register PLUS the old
  // company-rounds public_funding, not the register alone.
  const govByCountry = QT.combinedGovByCountry(country.data, gov.data);
  const govTotal = d3.sum([...govByCountry.values()], d => d.government_funding);
  const govProvisional = !!gov.meta.provisional;

  // Not awaited — the map has its own data fetches and should render in
  // parallel with the Promise.all above, not block it. Still needs its own
  // catch: an un-awaited rejection here would otherwise be silent.
  renderWorldMap("#worldmap", { showClusters: false, government: govByCountry }).catch(err => {
    console.error(err);
    document.getElementById("worldmap").innerHTML =
      `<div class="load-error"><p><b>The map couldn't load.</b> <code>${err && err.message || ""}</code></p></div>`;
  });

  const tt = QT.tooltip();

  // ---------- KPI strip ----------
  // The six tiles Elena specified, in her order. The Countries tab mirrors them.
  //
  // Two definitions were settled 2026-09-08 and are worth stating here because both
  // numbers have plausible-looking alternatives in the data:
  //   • "Institutions active in quantum" is EVERY entity in the collaboration graph
  //     (`entities`), not the 244 spinout parent institutions in the funding manifest
  //     and not the subset that has at least one recorded collaboration.
  //   • "Quantum collaborations" is academic + industry partnerships summed
  //     (`merged_edges`). Note that this is ~97% OpenAlex co-authorship, so if the
  //     panel is ever narrowed to industry only, the TILE NAME has to carry the
  //     distinction — a footnote will not do the work.
  const totalCompanyFunding = d3.sum(country.data, d => d.total_funding);
  QT.kpis("#kpis", [
    { v: QT.fmt.axisMoney(totalCompanyFunding), k: "Total company funding" },
    { v: QT.fmt.int(manifest.row_counts.startups), k: "Quantum companies" },
    { v: QT.fmt.axisMoney(govTotal),
      k: "Total government funding" + (govProvisional ? " " + QT.mockBadge("Provisional") : "") },
    { v: QT.fmt.int(cluster.data.length), k: "Quantum clusters" },
    { v: QT.fmt.int(collabManifest.row_counts.entities), k: "Institutions active in quantum" },
    { v: QT.fmt.int(collabManifest.row_counts.merged_edges), k: "Quantum collaborations" },
  ]);

  if (govProvisional) {
    QT.mockNote("#mocknote-map",
      "<b>Government funding is provisional.</b> It combines Dyuti's government policy register " +
      "with grants and public equity that reached companies directly through funding rounds, and " +
      "the two can overlap by an unknown amount, so this is an upper bound. The register itself " +
      "parses amounts recorded as free text, and the treatment of programmes whose funding periods " +
      "overlap is not yet settled, which adds a further upper-bound effect on top for the largest " +
      "funders. China has no entry in the register yet, so its figure here is grants and public " +
      "equity from company funding rounds only and understates its government funding. " +
      "Do not cite these figures.");
  }


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

      // The most recent year is NOT shaded and carries no "YTD" label — Elena's
      // instruction is to "treat it like any other", with the partial-coverage caveat
      // moved to the note under the chart where it does not distort the series.
      //
      // Removing the band also fixes a tooltip bug she reported separately. The band
      // lived in `gOverlay`, which QT.chart appends AFTER gPlot, and it was a plain
      // filled <rect> with no `pointer-events:none`. It therefore sat on top of the
      // invisible hover columns and swallowed every mouse event over the latest year,
      // so that one bar had no tooltip at all.

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
      // Hover targets are positioned from the scale the CHART IS ACTUALLY DRAWN WITH.
      // Bars use the band scale `x`; the area chart uses the point scale `xLin`, and
      // the hover columns used to be band-positioned in both modes. In area mode every
      // column was therefore offset by half a band and narrower than the span it was
      // meant to cover, which is why the tooltip felt unreliable there — and why
      // Public equity, the thinnest top layer, seemed worst affected: a small vertical
      // target plus a horizontally displaced hit area misses more often than not.
      const band = state.type === "bar";
      const step = band ? x.bandwidth() : (visRows().length > 1 ? (c.iw / visRows().length) : c.iw);
      const at = d => band ? x(d.year) : Math.max(0, xLin(d.year) - step / 2);

      const cols = c.gPlot.selectAll(".hovercol").data(visRows(), d => d.year).join("rect")
        .attr("class", "hovercol").attr("x", at).attr("width", step)
        .attr("y", 0).attr("height", c.ih).attr("fill", "transparent")
        .on("mousemove", (e, d) => {
          const ser = active(), tot = ser.reduce((a, s) => a + d[s.key], 0);
          let html = `<div class="hd">${d.year}${d.year === PARTIAL ? " · part year" : ""}</div>`;
          ser.slice().reverse().forEach(s => { if (d[s.key] > 0)
            html += `<div class="row"><span class="k"><i style="background:${s.color}"></i>${s.label}</span><span class="v">${QT.fmt.money(d[s.key])}</span></div>`; });
          html += `<div class="row tot"><span class="k">Total</span><span class="v">${QT.fmt.money(tot)}</span></div>`;
          tt.show(html, e);
        }).on("mouseleave", tt.hide);

      // Keep the targets above the marks. The columns are created once and then
      // re-used, while switching chart type or moving the year slider APPENDS fresh
      // <g class="bar"> / <path class="area"> elements after them in document order —
      // which put the marks on top and killed hovering entirely until the next full
      // redraw. That is the "tooltip doesn't work well when we change the years range"
      // report. One raise() per render is cheaper than reasoning about join order.
      cols.raise();
    }

    // Both spans in the note carry the first year in the series, from the data's own
    // meta rather than a hardcoded 2012 — Elena's closing note asks that numbers in
    // copy be dynamic so they do not have to be chased every quarter.
    d3.selectAll("#instrument-from, #instrument-from2").text(instrYear.meta.start_year || ALL_YEARS[0]);

    QT.segControl("#seg-scale-instrument", "data-s", s => { state.scale = s; render(); });
    QT.segControl("#seg-type-instrument", "data-t", t => { state.type = t; render(); });
    QT.timeSlider("#slider-instrument", { years: ALL_YEARS, onChange: w => { state.win = w; render(); } });
    render();
  })();

  // ---------- Figure 3: countries ranked by company vs. government funding ----------
  // The metric is Company or Government, with no "Total". "Government" already
  // deliberately double-counts against "Company" (see QT.combinedGovByCountry) — a
  // government grant into a funding round is counted once as company funding and again
  // as government funding — so summing the two on top of that would compound an
  // already-known overlap into a meaningless number. That is also why the note under
  // Figure 1 flags these as upper bounds rather than citable totals.
  (function countriesByFunding() {
    const BRACKET = 10;
    const state = { metric: "company_funding", page: 0 };
    const METRIC_LABEL = { company_funding: "Company funding", government_funding: "Government funding" };

    // The EU appears as its own bar alongside Member States. It has no company-funding
    // row (companies are counted under the country they are headquartered in, and an
    // EU-level sum would double-count every one of them), so it is present only for
    // the government metric — which is where the Flagship and EuroHPC money lives and
    // where leaving the bloc out understates European public funding badly.
    const rowsFor = metric => country.data.map(d => ({
      country: d.country,
      company_funding: d.total_funding,
      government_funding: (govByCountry.get(d.country) || {}).government_funding || 0,
    })).concat(
      metric === "government_funding" && govByCountry.has("EU")
        ? [{ country: "EU", company_funding: null,
             government_funding: govByCountry.get("EU").government_funding }]
        : []
    );

    // Only countries that have a value for THIS metric are ranked. 43 countries have
    // company funding but only 18 have countable government funding, so the range
    // buttons have to be rebuilt from the filtered list on every metric change rather
    // than assumed constant — Elena flagged that they were not.
    function rankedRows() {
      return rowsFor(state.metric)
        .filter(d => d[state.metric] != null && d[state.metric] > 0)
        .sort(QT.rank(state.metric, "country"));
    }

    function render() {
      const all = rankedRows();
      const pages = Math.max(1, Math.ceil(all.length / BRACKET));
      state.page = Math.max(0, Math.min(state.page, pages - 1));
      const rows = all.slice(state.page * BRACKET, state.page * BRACKET + BRACKET);

      d3.select("#bracket-country").selectAll(".chip").data(d3.range(pages), p => p)
        .join("span").attr("class", "chip").classed("on", p => p === state.page)
        .text(p => `${p * BRACKET + 1}–${Math.min((p + 1) * BRACKET, all.length)}`)
        .on("click", (e, p) => { state.page = p; render(); });

      // Rebuilt from scratch each render. The old code kept one chart instance and
      // re-joined into it, so a page with fewer rows than the last left the previous
      // page's labels behind on the y axis — the "labels overlap when you click the
      // range buttons" bug. A fresh <svg> body per render cannot carry stale marks.
      d3.select("#chart-country").selectAll("*").remove();
      const W = 880, H = 46 + rows.length * 30;
      const c = QT.chart("#chart-country", { W, H, margin: { t: 6, r: 70, b: 26, l: 130 } });
      // Domain from the whole ranking, not the visible page, so bar lengths stay
      // comparable as you page through — and it rescales when the metric changes.
      const x = d3.scaleLinear().domain([0, d3.max(all, d => d[state.metric]) * 1.05 || 1]).range([0, c.iw]);
      const y = d3.scaleBand().domain(rows.map(d => d.country)).range([0, c.ih]).padding(0.22);

      c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
        .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
      c.gPlot.selectAll("rect").data(rows, d => d.country).join("rect")
        .attr("x", 0).attr("y", d => y(d.country)).attr("height", y.bandwidth()).attr("rx", 2)
        .attr("fill", QT.tokens.accent).attr("fill-opacity", 0.9).attr("width", d => x(d[state.metric]))
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${QT.flag(d.country)}${d.country}</div>` +
          `<div class="row"><span class="k">Rank</span><span class="v">${all.indexOf(d) + 1} of ${all.length}</span></div>` +
          `<div class="row"><span class="k">${METRIC_LABEL[state.metric]}</span><span class="v">${QT.fmt.money(d[state.metric])}</span></div>`, e))
        .on("mouseleave", tt.hide);
      c.gPlot.selectAll("text.bar-val").data(rows, d => d.country).join("text")
        .attr("class", "bar-val").attr("dy", "0.32em")
        .attr("y", d => y(d.country) + y.bandwidth() / 2).attr("x", d => x(d[state.metric]) + 6)
        .text(d => QT.fmt.money(d[state.metric]));
      c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
      c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());

      QT.mockNote("#mocknote-country", state.metric === "government_funding" && govProvisional
        ? "<b>Government figures are provisional</b> — see the note under Figure 1."
        : "");
      d3.select("#mocknote-country").style("display",
        state.metric === "government_funding" && govProvisional ? null : "none");
    }

    QT.segControl("#seg-metric-country", "data-m", m => { state.metric = m; state.page = 0; render(); });
    render();
  })();

  // ---------- Figure 4: top companies by total funding ----------
  // Ten, not eight. Elena's note was that eight "seems an odd number" — it was, and it
  // came from nothing but the panel height. Ten is the same round bracket the Companies
  // tab pages by, so the teaser and the full ranking agree on what a page looks like.
  // Deliberately kept a plain flagged bar chart rather than a copy of the Companies
  // tab's Top 30: that one carries a pillar selector and range buttons, which is a
  // second navigation surface this panel does not want when its job is to hand the
  // reader on to that tab.
  (function topCompanies() {
    const TOP = 10;
    const rows = companies.data.filter(d => d.total_funding > 0).slice(0, TOP);

    const W = 880, H = 300;
    const c = QT.chart("#chart-companies", { W, H, margin: { t: 6, r: 70, b: 26, l: 172 } });
    const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.total_funding) * 1.05]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rows.map(d => d.company)).range([0, c.ih]).padding(0.22);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rows, d => d.company).join("rect")
      .attr("x", 0).attr("y", d => y(d.company)).attr("height", y.bandwidth()).attr("rx", 2)
      .attr("fill", QT.tokens.teal).attr("fill-opacity", 0.9).attr("width", d => x(d.total_funding))
      .on("mousemove", (e, d) => tt.show(`<div class="hd">${d.company}</div><div class="row"><span class="k">Country</span><span class="v">${d.country || "—"}</span></div><div class="row"><span class="k">Total funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rows, d => d.company).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.company) + y.bandwidth() / 2).attr("x", d => x(d.total_funding) + 6)
      .text(d => QT.fmt.money(d.total_funding));
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    // Flags, per Elena: the ranking was "a bit too plain like it's now", and the
    // company's home country is the one fact a reader wants next to its name here.
    const countryOfCompany = new Map(rows.map(d => [d.company, d.country]));
    QT.flagAxis(c.gy, name => countryOfCompany.get(name) || "");
  })();

  // ---------- Figure 5: capital raised by funding stage and region ----------
  (function fundingByStage() {
    const STAGES = stageRegion.data.stages;
    const BLOCS = {};
    stageRegion.data.regions.forEach(r => { BLOCS[r.region] = { label: r.region, hex: QT.palette.region[r.region] || QT.tokens.muted, v: r.values, total: d3.sum(r.values) }; });
    const KEYS = Object.keys(BLOCS);

    const state = { a: KEYS[0], b: KEYS[2] || KEYS[1], scale: "share" };

    // Chip rows rather than <select>s (see the comment in index.html). Picking the
    // region already selected on the OTHER side is disabled rather than hidden, so the
    // two rows always show the same five options in the same order and the reader can
    // see why a chip is unavailable instead of watching an option disappear.
    function regionChips() {
      [["#stage-ra", "a", "b"], ["#stage-rb", "b", "a"]].forEach(([sel, own, other]) => {
        d3.select(sel).selectAll(".chip").data(KEYS, k => k).join("span")
          .attr("class", "chip")
          .classed("on", k => state[own] === k)
          .classed("off", k => state[other] === k)
          .attr("title", k => state[other] === k ? "Already selected as the other region" : null)
          .text(k => BLOCS[k].label)
          .on("click", (e, k) => {
            if (state[other] === k || state[own] === k) return;
            state[own] = k;
            regionChips();
            render();
          });
      });
    }

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

    QT.segControl("#seg-scale-stage", "data-s", s => { state.scale = s; render(); });
    regionChips();
    render();
  })();
});
