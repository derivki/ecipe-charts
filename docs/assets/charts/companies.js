/* Companies dashboard.

   All real data, from four Stage 1 datasets. Every one is a DISPLAY-ONLY view: the
   published files hold what these panels show and no more (the row-level data stays
   private, see pipeline_io.PRIVATE_ONLY), because docs/data is downloadable.
     companies.json            – only the NAMED companies a panel draws: the top 30 overall
                                 and per pillar, plus every listed company
     companies_summary.json    – totals, landscape, origins and founding years for ALL
                                 companies, with no per-company row
     institution_spinouts.json – the top 50 parent institutions (by funding and by count)
     listed_by_exchange.json   – listing venue -> number of listed companies

   PANEL ORDER (Elena, 2026-09-08): panels that speak for all tracked companies come
   first -- the funding ranking, then founding year, the technology landscape and how
   companies are founded -- and the two that can only speak for the ~35 listed ones
   (market capitalisation, listing venue) come last. Market cap used to lead the tab,
   which put its narrowest panel at the top and made a 35-company story look like the
   headline. */
QT.boot(async function () {
  QT.nav("#nav", "companies");

  const [companies, summary, institutions, exchanges, manifest] = await Promise.all([
    QT.loadData("companies"),
    QT.loadData("companies_summary"),
    QT.loadData("institution_spinouts"),
    QT.loadData("listed_by_exchange"),
    QT.loadData("manifest"),
    QT.loadFlags(),
  ]);
  QT.vintage("#vintage", manifest);
  const tt = QT.tooltip();

  // `rows` is the NAMED subset only (see above); anything about companies as a whole
  // comes from `S` / `T`, never from counting `rows`.
  const rows = companies.data;
  const funded = rows.filter(d => d.total_funding > 0);
  const listed = rows.filter(d => d.market_cap_usd > 0);
  const S = summary.data, T = S.totals;

  // Flags moved to the shared QT.flag() in chart-template.js – the same six lines had
  // been copied here and into clusters.js, and Elena's 2026-09-08 list adds flags to
  // three further panels.
  const flagIcon = (code, label) => QT.flag(label, { code });

  /* Country labels use the tracker's short forms everywhere on this tab: "US" not
     "United States", "EU" not "European Union", "UK" not "United Kingdom" (Elena).
     `listed_by_exchange.json` spells its venue countries out, since those are derived
     from the exchange reference table rather than from the company register. */
  const CANON = {
    "United States": "US", "United States of America": "US",
    "United Kingdom": "UK", "European Union": "EU",
    "Republic of Korea": "South Korea", "Korea": "South Korea",
  };
  const canonCountry = n => CANON[n] || n || "";

  // Country -> the tracker's usual region (US / China / EU / UK+AUS+CAN / RoW, shown to
  // the reader via QT.regionLabel as "UK, Canada, and Australia" / "Rest of the World").
  const REGION_OF = (await QT.loadData("country_codes")).regions || {};

  // ---------- KPI strip ----------
  /* Six tiles (Elena, 2026-09-29), replacing the earlier three. */
  QT.kpis("#kpis", [
    { v: QT.fmt.axisMoney(T.total_funding), k: "Total company funding" },
    { v: QT.fmt.int(T.companies), k: "Quantum companies" },
    { v: QT.fmt.int(T.n_rounds), k: "Funding rounds" },
    { v: QT.fmt.int(T.public_companies), k: "Publicly listed companies" },
    { v: QT.fmt.axisMoney(T.market_cap_total), k: "Total market capitalisation" },
    { v: QT.fmt.int(T.countries), k: "Countries represented" },
  ]);

  /* ---------- Panel 1: market capitalisation, packed bubbles by region ----------
     A circle pack rather than a scatter: market cap spans three orders of
     magnitude ($18.6bn to $15m), so position would carry no information while
     area carries all of it. Grouping by region is the comparison the panel is
     for – one pack per region, laid out by total regional value. */
  (function marketCap() {
    // Regional grouping is defined here rather than in the pipeline because it is
    // a presentation choice for this panel, not a property of a company. EU is the
    // member-state list; the UK/Australia/Canada grouping mirrors how the sector
    // is usually discussed relative to the US and China.
    /* The tracker's usual five regions, under the tracker's usual labels: "US" and
       "EU", not "United States" and "European Union" (Elena). The hand-written EU list
       that used to live here has gone -- it held 20 of the 27 Member States, so a
       listed company in any of the missing seven would have been filed under "Rest of
       world". Region now comes from QT.palette.region's own key set via the shared
       lookup, which is built from data/reference/country_region.csv. */
    const REGION = d => REGION_OF[d.country] || "RoW";
    const COLOR = QT.palette.region;

    const byRegion = d3.groups(listed, REGION)
      .map(([region, cos]) => ({ region, cos, total: d3.sum(cos, c => c.market_cap_usd) }))
      .sort(QT.rank("total", "region"));

    const W = 880;
    // A shared radius scale across every region, not per-pack normalisation:
    // a $600m company must look the same size wherever it is headquartered,
    // otherwise a small region's leader reads like a large region's leader.
    const rScale = d3.scaleSqrt().domain([0, d3.max(listed, d => d.market_cap_usd)]).range([0, 58]);
    const LABEL_H = 26, GAP = 26;

    // Each region gets a column as wide as the WIDER of its pack and its label,
    // so the caption can never overlap its neighbour's – the failure mode when
    // columns are sized by pack width alone and a one-bubble region carries a long
    // name like "UK, Australia & Canada".
    const cols = byRegion.map(reg => {
      const nodes = reg.cos.map(c => ({ ...c, r: Math.max(2.2, rScale(c.market_cap_usd)) }));
      d3.packSiblings(nodes);                       // sets x/y in place from r
      const x0 = d3.min(nodes, n => n.x - n.r), x1 = d3.max(nodes, n => n.x + n.r);
      const y0 = d3.min(nodes, n => n.y - n.r), y1 = d3.max(nodes, n => n.y + n.r);
      const caption = `${QT.regionLabel(reg.region)} · ${QT.fmt.axisMoney(reg.total)}`;
      // 6.1px per character approximates 12px Inter/system-ui at weight 650.
      const labelW = caption.length * 6.1;
      return { reg, nodes, caption, packW: x1 - x0, packH: y1 - y0,
               cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
               colW: Math.max(x1 - x0, labelW) };
    });

    // Wrap onto several rows rather than one: five regions across a single line
    // leaves each pack too narrow to read, and the panel is only ~800px wide in
    // the WordPress embed. Rows are BALANCED rather than filled greedily -- a
    // plain left-to-right wrap strands the last region alone on its own line,
    // which reads as a separate grouping instead of a continuation.
    const needW = d3.sum(cols, c => c.colW) + GAP * (cols.length - 1);
    const nRows = Math.max(1, Math.ceil(needW / W));
    const target = needW / nRows;

    const rowsOut = [];
    let row = [], used = 0;
    cols.forEach((col, i) => {
      const remaining = cols.length - i;
      const rowsLeft = nRows - rowsOut.length;
      // Start a new row once this one has reached its share, but never leave
      // fewer regions than rows still to fill.
      const wouldOrphan = remaining <= rowsLeft - 1;
      if (row.length && !wouldOrphan && rowsLeft > 1 &&
          used + col.colW + GAP > target * 1.12) {
        rowsOut.push(row); row = []; used = 0;
      }
      row.push(col);
      used += col.colW + (row.length > 1 ? GAP : 0);
    });
    if (row.length) rowsOut.push(row);

    const rowHeights = rowsOut.map(r => LABEL_H + d3.max(r, c => c.packH));
    const vbW = Math.max(W, d3.max(rowsOut,
      r => d3.sum(r, c => c.colW) + GAP * (r.length - 1)));
    const H = d3.sum(rowHeights) + GAP * (rowsOut.length - 1) + 8;

    d3.select("#chart-mcap").selectAll("*").remove();
    const svg = d3.select("#chart-mcap").append("svg")
      .attr("viewBox", `0 0 ${vbW} ${H}`).attr("role", "img")
      .attr("aria-label", "Market capitalisation of listed quantum companies, grouped by region");
    const g = svg.append("g");

    // Within a row, packs share a vertical centre so bubble sizes stay comparable
    // by eye; each caption is centred over its own column.
    const placed = [];
    let yCursor = 4;
    rowsOut.forEach((r, ri) => {
      const rowW = d3.sum(r, c => c.colW) + GAP * (r.length - 1);
      const rowPackH = d3.max(r, c => c.packH);
      let xCursor = (vbW - rowW) / 2;               // centre each row
      r.forEach(col => {
        placed.push({ ...col,
          ox: xCursor + col.colW / 2 - col.cx,
          oy: yCursor + LABEL_H + rowPackH / 2 - col.cy,
          labelX: xCursor + col.colW / 2,
          labelY: yCursor + LABEL_H - 9 });
        xCursor += col.colW + GAP;
      });
      yCursor += rowHeights[ri] + GAP;
    });

    placed.forEach(({ reg, nodes, caption, ox, oy, labelX, labelY }) => {
      g.append("text")
        .attr("x", labelX).attr("y", labelY)
        .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 650)
        .attr("fill", QT.tokens.ink)
        .text(caption);
      const gg = g.append("g").attr("transform", `translate(${ox},${oy})`);
      gg.selectAll("circle").data(nodes, d => d.company).join("circle")
        .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r)
        .attr("fill", COLOR[reg.region]).attr("fill-opacity", 0.88)
        .attr("stroke", "#fff").attr("stroke-width", 0.9)
        .style("cursor", "default")
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${d.company}</div>` +
          `<div class="row"><span class="k">Market cap</span><span class="v">${QT.fmt.money(d.market_cap_usd)}</span></div>` +
          `<div class="row"><span class="k">Country</span><span class="v">${d.country}</span></div>` +
          `<div class="row"><span class="k">Company funding</span><span class="v">${d.total_funding ? QT.fmt.money(d.total_funding) : "n/a"}</span></div>` +
          (d.market_cap_is_override ? `<div class="row"><span class="k">Note</span><span class="v">manual figure</span></div>` : ""), e))
        .on("mouseleave", tt.hide);
      // Label a bubble only if some form of the name fits inside it. Candidates run from
      // the full name to progressively shorter forms (legal suffixes, then generic words
      // such as "Quantum" or "Technologies", dropped); the first that fits the chord at
      // the bubble's font size wins. If none fits, the bubble is left to its tooltip
      // rather than showing a clipped name.
      const LEGAL = /[,\s]+(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|plc|PLC|AG|SE|N\.V\.|S\.A\.|Co\.|Holdings?|Group)$/;
      const GENERIC = /\s+(Quantum|Technologies|Technology|Computing|Computers|Systems|Labs|Solutions)\b/gi;
      const fontFor = d => Math.max(7.5, Math.min(13, d.r * 0.44));
      const fitted = nodes
        .filter(d => d.r >= 12)
        .map(d => {
          const fs = fontFor(d);
          const fits = t => t.length * fs * 0.56 <= d.r * 1.7;
          const full = d.company.replace(/\s*\(.*?\)\s*$/, "");   // drop native-script suffix
          const noLegal = full.replace(LEGAL, "").replace(LEGAL, "");
          const core = noLegal.replace(GENERIC, "").trim();
          const first = core.split(/\s+/)[0];
          const text = [full, noLegal, core, first].find(t => t && fits(t));
          return text ? { ...d, fs, text } : null;
        })
        .filter(Boolean);
      gg.selectAll("text.blabel").data(fitted, d => d.company).join("text")
        .attr("class", "blabel")
        .attr("x", d => d.x).attr("y", d => d.y).attr("dy", "0.32em")
        .attr("text-anchor", "middle").attr("fill", QT.textOn(COLOR[reg.region]))
        .attr("font-size", d => d.fs).attr("font-weight", 600)
        .attr("pointer-events", "none")
        .text(d => d.text);
    });

    d3.select("#mcap-count").text(`${QT.fmt.int(listed.length)} of ${QT.fmt.int(T.companies)}`);
    // Stated the way the page's own "Data as of" line states it: "the end of Q3 2026". (Until
    // 2026-10-27 this was the build date, on the grounds that market cap moves daily; Elena asked
    // for the quarter-end wording so the figure reads the same as the rest of the page.)
    d3.select("#mcap-asof").text("the end of " + QT.fmt.vintage(manifest.data_vintage));
  })();

  /* ---------- Panel 2: parent institutions ---------- */
  (function institutionRanking() {
    const BRACKET = 10;      // was 15; Elena asked for 10 at a time, as elsewhere
    const TOP = 50;          // "I would only show the top 50, not all of them so as
                             //  not to reveal too much" – the tail of a 244-row list
                             //  is itself a disclosure about the private database
    const state = { metric: "total_funding", page: 0 };

    /* GENUINE SPINOUTS ONLY. `origin` is a controlled vocabulary of non-organic origins,
       and only four of its values (University, Research, Corporate and Hybrid spinout)
       describe a company that actually span out of an institution. A joint venture, a
       merger and a subsidiary are corporate structures, not spinouts (Elena: "other types
       of company origins I would exclude here cause they're not per se spinouts"). That
       restriction is applied in the pipeline (aggregations.build_public_spinouts), so
       n_spinouts and total_funding here already count spinouts only, and the file holds
       just the top 50 institutions by each metric with their three largest spinouts. */
    const SPINOUTS_ONLY = institutions.data;

    const all = () => [...SPINOUTS_ONLY]
      .filter(d => d[state.metric] > 0)
      .sort(QT.rank(state.metric, "institution"))
      .slice(0, TOP);

    function render() {
      const list = all();
      const pages = Math.ceil(list.length / BRACKET);
      state.page = Math.max(0, Math.min(state.page, pages - 1));
      const rs = list.slice(state.page * BRACKET, state.page * BRACKET + BRACKET);

      d3.select("#bracket-inst").selectAll(".chip").data(d3.range(pages), p => p)
        .join("span").attr("class", "chip").classed("on", p => p === state.page)
        .text(p => `${p * BRACKET + 1}–${Math.min((p + 1) * BRACKET, list.length)}`)
        .on("click", (e, p) => { state.page = p; render(); });

      const money = state.metric === "total_funding";
      const W = 880, H = 24 + rs.length * 30;
      d3.select("#chart-inst").selectAll("*").remove();
      const c = QT.chart("#chart-inst", { W, H, margin: { t: 6, r: 64, b: 26, l: 300 } });
      /* Domain from the VISIBLE PAGE, not the whole ranking. Elena: "the bars are much
         lower when going after 30 in the ranking so maybe it can adapt". A fixed domain
         set by the top institution left pages 4 and 5 as slivers a few pixels wide, so
         the panel stopped answering its own question – which of these institutions
         leads – for exactly the rows a reader paged to in order to compare them. The
         axis is redrawn per page and the bar labels always carry the absolute value, so
         the rescaling cannot be mistaken for a change in magnitude. */
      const x = d3.scaleLinear().domain([0, d3.max(rs, d => d[state.metric]) * 1.05 || 1]).range([0, c.iw]);
      const y = d3.scaleBand().domain(rs.map(d => d.institution)).range([0, c.ih]).padding(0.22);

      c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
        .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));

      c.gPlot.selectAll("rect").data(rs, d => d.institution).join("rect")
        .attr("x", 0).attr("y", d => y(d.institution)).attr("height", y.bandwidth())
        .attr("fill", QT.tokens.accent).attr("width", d => x(d[state.metric]))
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${d.institution}</div>` +
          (d.type ? `<div class="row"><span class="k">Type</span><span class="v">${d.type}</span></div>` : "") +
          (d.country ? `<div class="row"><span class="k">Country</span><span class="v">${d.country}</span></div>` : "") +
          `<div class="row"><span class="k">Spinouts</span><span class="v">${d.n_spinouts}</span></div>` +
          `<div class="row"><span class="k">Company funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
          `<div class="row"><span class="k">Largest</span><span class="v">${d.companies.slice(0, 3).join(", ")}</span></div>`, e))
        .on("mouseleave", tt.hide);

      c.gPlot.selectAll("text.bar-val").data(rs, d => d.institution).join("text")
        .attr("class", "bar-val").attr("dy", "0.32em")
        .attr("y", d => y(d.institution) + y.bandwidth() / 2)
        .attr("x", d => x(d[state.metric]) + 6)
        // QT.fmt.money, not axisMoney: Elena asked for two decimals here "like we did
        // in the overview charts", and axisMoney rounds to one ($1.5bn vs $1.52bn).
        .text(d => money ? QT.fmt.money(d.total_funding) : d.n_spinouts);

      // Flags live in the axis labels, so the country reads without a tooltip.
      c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
      c.gy.selectAll(".tick text").remove();
      c.gy.selectAll(".tick").each(function (name) {
        const d = rs.find(r => r.institution === name);
        d3.select(this).append("foreignObject")
          .attr("x", -294).attr("y", -y.bandwidth() / 2)
          .attr("width", 288).attr("height", y.bandwidth())
          .append("xhtml:div")
          .attr("style", "display:flex;align-items:center;justify-content:flex-end;gap:6px;" +
                         `height:${y.bandwidth()}px;font-size:11.5px;color:${QT.tokens.ink};` +
                         "overflow:hidden;white-space:nowrap;text-align:right;")
          .html(`<span style="overflow:hidden;text-overflow:ellipsis;">${name}</span>` +
                flagIcon(d && d.country_code, d && d.country));
      });
      c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(money ? QT.fmt.axisMoney : d3.format("d")).tickSizeOuter(0));
    }

    // NB: segControl reads getAttribute(dataAttr), so this is the full attribute
    // name, not the suffix – "m" silently yields null and blanks the chart.
    QT.segControl("#seg-inst-metric", "data-m", m => { state.metric = m; state.page = 0; render(); });
    render();

    // The old coverage sentence ("institutions of origin are recorded for N of M
    // companies") is gone from the panel note: it quantified how much of the private
    // database is populated, which is exactly what the new subtitle avoids doing.
  })();

  /* ---------- Figure 1: top 30 quantum companies by funding ----------
     Pillar selector plus range buttons. The pillar view is the point of the panel, not
     decoration: Elena's reasoning is that it lets a reader "also see in the various
     fields which companies, and from which countries, are doing better", which a single
     global ranking dominated by the quantum-computing names cannot show. */
  (function topFunded() {
    const TOP = 30, BRACKET = 10;
    const PILLARS = S.pillars.map(d => d.label).sort(QT.alpha);
    const state = { pillar: "All", page: 0 };

    const ranked = () => [...funded]
      .filter(d => state.pillar === "All" || d.primary_pillar === state.pillar)
      .sort(QT.rank("total_funding", "company"))
      .slice(0, TOP);

    function render() {
      const list = ranked();
      const pages = Math.max(1, Math.ceil(list.length / BRACKET));
      state.page = Math.max(0, Math.min(state.page, pages - 1));
      const rs = list.slice(state.page * BRACKET, state.page * BRACKET + BRACKET);

      d3.select("#pillar-top").selectAll("option").data(["All", ...PILLARS], d => d).join("option")
        .attr("value", d => d).text(d => d);
      d3.select("#pillar-top").property("value", state.pillar);

      // Buttons read 1–10 / 11–20 / 21–30, and shrink with the list: a pillar with 14
      // companies gets two brackets, not three with an empty one.
      d3.select("#bracket-top").selectAll(".chip").data(d3.range(pages), p => p).join("span")
        .attr("class", "chip").classed("on", p => p === state.page)
        .text(p => `${p * BRACKET + 1}–${Math.min((p + 1) * BRACKET, list.length)}`)
        .on("click", (e, p) => { state.page = p; render(); });

      // Rebuilt per render so a short page cannot leave the previous page's axis
      // labels behind – the same stale-mark bug the country ranking had.
      d3.select("#chart-top").selectAll("*").remove();
      const W = 880, H = 34 + rs.length * 30;
      const c = QT.chart("#chart-top", { W, H, margin: { t: 6, r: 84, b: 26, l: 210 } });
      // Domain from the visible page, so bars stay readable down the ranking.
      const x = d3.scaleLinear().domain([0, d3.max(rs, d => d.total_funding) * 1.05 || 1]).range([0, c.iw]);
      const y = d3.scaleBand().domain(rs.map(d => d.company)).range([0, c.ih]).padding(0.22);

      c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
        .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
      c.gPlot.selectAll("rect").data(rs, d => d.company).join("rect")
        .attr("x", 0).attr("y", d => y(d.company)).attr("height", y.bandwidth())
        .attr("fill", QT.tokens.accent).attr("width", d => x(d.total_funding))
        .on("mousemove", (e, d) => tt.show(
          `<div class="hd">${flagIcon(QT.flagCode(d.country), d.country)} ${d.company}</div>` +
          `<div class="row"><span class="k">Rank</span><span class="v">${list.indexOf(d) + 1} of ${list.length}</span></div>` +
          `<div class="row"><span class="k">Company funding</span><span class="v">${QT.fmt.money(d.total_funding)}</span></div>` +
          `<div class="row"><span class="k">Country</span><span class="v">${d.country || "n/a"}</span></div>` +
          `<div class="row"><span class="k">Primary pillar</span><span class="v">${d.primary_pillar || "n/a"}</span></div>` +
          `<div class="row"><span class="k">Stack layer</span><span class="v">${d.stack_layer || "n/a"}</span></div>`, e))
        .on("mouseleave", tt.hide);
      c.gPlot.selectAll("text.bar-val").data(rs, d => d.company).join("text")
        .attr("class", "bar-val").attr("dy", "0.32em")
        .attr("y", d => y(d.company) + y.bandwidth() / 2).attr("x", d => x(d.total_funding) + 6)
        // Two decimals, per Elena – QT.fmt.money, not the one-decimal axis format.
        .text(d => QT.fmt.money(d.total_funding));
      c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
      c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));

      const countryOf = new Map(rs.map(d => [d.company, d.country]));
      QT.flagAxis(c.gy, name => countryOf.get(name) || "");
    }

    d3.select("#pillar-top").on("change", function () {
      state.pillar = this.value; state.page = 0; render();
    });
    render();
  })();

  /* ---------- Figure 3: funding across the quantum technology landscape ----------
     Elena: "I think it'd be more informative to show all three". Pillars (5 values) and
     stack layers (6) are shown together as two labelled blocks, so the two axes can be
     read against each other without a click. STREAMS STAY BEHIND A TOGGLE: there are 48
     distinct primary streams, and a 48-row third block would be taller than the other
     two combined and unreadable at panel width. */
  (function landscape() {
    const state = { streams: false };
    const GROUPS = {
      off: [
        { title: "Technology pillar", key: "pillars" },
        { title: "Stack layer", key: "stack_layers" },
      ],
      on: [{ title: "Technology stream", key: "streams" }],
    };

    // The buckets arrive ready-made, already sorted by funding. Streams have a long tail;
    // the pipeline pools everything beyond the top 15 into "Other (N streams)" rather than
    // dropping it, so the block still sums to the sector total.
    const bucket = key => S[key];

    function render() {
      const blocks = GROUPS[state.streams ? "on" : "off"].map(g => ({ ...g, rows: bucket(g.key) }));
      const nRows = d3.sum(blocks, b => b.rows.length);
      const W = 880, H = 30 + nRows * 32 + blocks.length * 30;
      d3.select("#chart-landscape").selectAll("*").remove();
      const c = QT.chart("#chart-landscape", { W, H, margin: { t: 6, r: 64, b: 26, l: 210 } });

      const maxF = d3.max(blocks, b => d3.max(b.rows, r => r.funding)) || 1;
      const x = d3.scaleLinear().domain([0, maxF * 1.05]).range([0, c.iw]);
      const totalF = T.total_funding;

      c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
        .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));

      // One shared x scale across the blocks, so a pillar bar and a stack-layer bar of
      // the same length mean the same amount of money. Laid out sequentially rather
      // than with one band scale per block, because the blocks have different lengths.
      let cursor = 0;
      blocks.forEach((b, bi) => {
        if (bi > 0) cursor += 14;
        c.gPlot.append("text").attr("x", -200).attr("y", cursor + 10)
          .attr("class", "block-title").text(b.title);
        cursor += 22;
        const rowH = 30;
        b.rows.forEach(r => {
          const yTop = cursor;
          c.gPlot.append("rect")
            .attr("x", 0).attr("y", yTop + 4).attr("height", rowH - 12)
            .attr("fill", r.isOther ? QT.tokens.line : QT.tokens.accent)
            .attr("width", x(r.funding))
            .on("mousemove", e => tt.show(
              `<div class="hd">${r.label}</div>` +
              `<div class="row"><span class="k">Funding</span><span class="v">${QT.fmt.money(r.funding)}</span></div>` +
              `<div class="row"><span class="k">Share of total</span><span class="v">${QT.fmt.pct1(r.funding / totalF)}</span></div>` +
              `<div class="row"><span class="k">Companies</span><span class="v">${QT.fmt.int(r.n)}</span></div>` +
              `<div class="row"><span class="k">Per company</span><span class="v">${QT.fmt.money(r.funding / r.n)}</span></div>`, e))
            .on("mouseleave", tt.hide);
          c.gPlot.append("text").attr("class", "bar-val").attr("dy", "0.32em")
            .attr("x", x(r.funding) + 6).attr("y", yTop + rowH / 2 - 2)
            // Funding only; the company count is in the tooltip (too much on the bar).
            .text(QT.fmt.money(r.funding));
          c.gPlot.append("text").attr("dy", "0.32em")
            .attr("x", -10).attr("y", yTop + rowH / 2 - 2).attr("text-anchor", "end")
            .style("font-size", "11.5px").style("fill", QT.tokens.ink)
            .text(r.label);
          cursor += rowH;
        });
      });

      c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(QT.fmt.axisMoney).tickSizeOuter(0));
    }

    QT.segControl("#seg-streams", "data-v", v => { state.streams = v === "on"; render(); });
    render();
  })();

  /* ---------- Figure 4: how companies are founded ----------
     ONE horizontal stacked bar, per Elena's decision. She was unconvinced by the panel
     as it stood and asked whether a pie or donut would read better; it would not. The
     story here is a single proportion (independently founded vs. out of an institution)
     plus the composition of one of those halves, and a stacked bar shows both in one
     row while a donut with eight unequal slices makes the reader compare arc lengths.
     The previous version drew that same information as TWO bands, which invited the
     reader to compare them as if they were separate series when the second is simply
     the first one's left-hand segment broken apart. */
  (function foundingSplit() {
    const INDEPENDENT = "Founded independently";
    const total = T.companies;
    const instN = d3.sum(S.origins, d => d.n);
    const indep = total - instN;
    const byType = S.origins
      .map(d => ({ key: d.origin, label: d.origin, n: d.n, color: QT.palette.origin[d.origin] || QT.tokens.muted }))
      .sort(QT.rank("n", "label"));
    // Institutional segments first, largest to smallest, then independents – so the
    // bar reads as "these are the spinout routes, and this is everything else".
    const segs = [...byType, { key: INDEPENDENT, label: INDEPENDENT, n: indep, color: QT.palette.origin["Not specified"] }];

    const W = 880, H = 104;
    d3.select("#chart-origin").selectAll("*").remove();
    const c = QT.chart("#chart-origin", { W, H, margin: { t: 42, r: 4, b: 10, l: 4 } });
    const x = d3.scaleLinear().domain([0, total]).range([0, c.iw]);
    let acc = 0;
    const laid = segs.map(sg => { const o = { ...sg, x0: acc }; acc += sg.n; return o; });

    // Shares, not raw counts -- consistent with the rest of this tab, which never
    // states how many companies the tracker holds in total (see the KPI strip and
    // the tab subtitle).
    // The headline of the figure: larger, with the two shares in bold.
    c.g.append("text").attr("x", 0).attr("y", -16).attr("font-size", 16)
      .attr("fill", QT.tokens.ink)
      .call(t => {
        t.append("tspan").attr("font-weight", 700).text(QT.fmt.pct0(instN / total));
        t.append("tspan").text(" came out of an institution · ");
        t.append("tspan").attr("font-weight", 700).text(QT.fmt.pct0(indep / total));
        t.append("tspan").text(" were founded independently");
      });

    c.g.selectAll("rect.seg").data(laid, d => d.key).join("rect").attr("class", "seg")
      .attr("x", d => x(d.x0)).attr("y", 0).attr("height", 34)
      .attr("width", d => Math.max(1, x(d.n) - 1)).attr("fill", d => d.color)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.label}</div>` +
        `<div class="row"><span class="k">Companies</span><span class="v">${QT.fmt.int(d.n)}</span></div>` +
        `<div class="row"><span class="k">Share</span><span class="v">${QT.fmt.pct1(d.n / total)}</span></div>`, e))
      .on("mouseleave", tt.hide);

    // In-bar counts, but only where the segment is wide enough to hold one; the
    // narrower origins (one hybrid spinout, one subsidiary) read from the legend.
    c.g.selectAll("text.seg-n").data(laid.filter(d => x(d.n) > 34), d => d.key).join("text")
      .attr("class", "seg-n").attr("x", d => x(d.x0) + x(d.n) / 2).attr("y", 17)
      .attr("dy", "0.32em").attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", 600)
      .style("fill", d => QT.textOn(d.color))
      .text(d => QT.fmt.int(d.n));

    QT.legend("#legend-origin", laid.map(sg => ({ key: sg.key, label: `${sg.label} (${sg.n})`, color: sg.color })));
  })();

  /* ---------- Panel 6: companies by founding year ---------- */
  (function foundedYear() {
    const FROM = 2000;   // a handful of companies predate this; the tail is noise
    const partial = manifest.partial_year;
    const counts = new Map(S.founded.map(d => [d.year, d.n]));
    const years = d3.range(FROM, S.founded_max + 1);
    const rs = years.map(y => ({ year: y, n: counts.get(y) || 0 }));

    // Full width (Elena): at 420px the 27 year-bands were a few pixels each and the
    // shape of the series -- the point of the panel -- was unreadable.
    const W = 880, H = 260;
    const c = QT.chart("#chart-founded", { W, H, margin: { t: 8, r: 8, b: 28, l: 38 } });
    const x = d3.scaleBand().domain(years).range([0, c.iw]).padding(0.16);
    const y = d3.scaleLinear().domain([0, d3.max(rs, d => d.n) * 1.1]).nice().range([c.ih, 0]);

    c.gGrid.selectAll("line").data(y.ticks(4)).join("line").attr("class", "gridline")
      .attr("x1", 0).attr("x2", c.iw).attr("y1", d => y(d)).attr("y2", d => y(d));
    c.gPlot.selectAll("rect").data(rs, d => d.year).join("rect")
      .attr("x", d => x(d.year)).attr("width", x.bandwidth())
      .attr("y", d => y(d.n)).attr("height", d => c.ih - y(d.n))
      // The most recent year is NOT shaded -- treated like any other, with the
      // partial-coverage caveat in the note below the chart. Same decision as the
      // Overview instrument chart.
      .attr("fill", QT.tokens.accent)
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.year}${d.year === partial ? " · part year" : ""}</div>` +
        `<div class="row"><span class="k">Companies founded</span><span class="v">${d.n}</span></div>`, e))
      .on("mouseleave", tt.hide);

    c.gx.call(d3.axisBottom(x).tickValues(years.filter(y2 => y2 % 2 === 0)).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(5).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    d3.select("#founded-from").text(FROM);
  })();

  /* ---------- Panel 7: listed companies by exchange ---------- */
  (function byExchange() {
    const rs = exchanges.data;
    const W = 880, H = 24 + rs.length * 24;
    const c = QT.chart("#chart-exchange", { W, H, margin: { t: 6, r: 48, b: 26, l: 300 } });
    const x = d3.scaleLinear().domain([0, d3.max(rs, d => d.n_listings) * 1.08]).range([0, c.iw]);
    const y = d3.scaleBand().domain(rs.map(d => d.exchange)).range([0, c.ih]).padding(0.24);

    c.gGrid.selectAll("line").data(x.ticks(4)).join("line").attr("class", "gridline")
      .attr("y1", 0).attr("y2", c.ih).attr("x1", d => x(d)).attr("x2", d => x(d));
    c.gPlot.selectAll("rect").data(rs, d => d.exchange).join("rect")
      .attr("x", 0).attr("y", d => y(d.exchange)).attr("height", y.bandwidth())
      .attr("fill", QT.tokens.accent).attr("width", d => x(d.n_listings))
      /* The company list is a LEFT-ALIGNED BLOCK, not a right-aligned value.
         `.row` is a flex row with the label left and the value right, which is right
         for "Listings: 12" and wrong for Nasdaq's twenty company names: they wrapped
         into a right-ragged column that was, in Elena's words, "a bit complicated to
         understand". `.tt-list` drops out of the flex row and reads as prose. */
      .on("mousemove", (e, d) => tt.show(
        `<div class="hd">${d.exchange}</div>` +
        (d.country ? `<div class="row"><span class="k">Country</span><span class="v">${canonCountry(d.country)}</span></div>` : "") +
        `<div class="row"><span class="k">Listings</span><span class="v">${d.n_listings}</span></div>` +
        `<div class="tt-list"><span class="k">Companies</span><div>${d.companies.join(", ")}</div></div>`, e))
      .on("mouseleave", tt.hide);
    c.gPlot.selectAll("text.bar-val").data(rs, d => d.exchange).join("text")
      .attr("class", "bar-val").attr("dy", "0.32em")
      .attr("y", d => y(d.exchange) + y.bandwidth() / 2).attr("x", d => x(d.n_listings) + 6)
      .text(d => d.n_listings);

    c.gy.call(d3.axisLeft(y).tickSizeOuter(0)).call(g => g.select(".domain").remove());
    c.gy.selectAll(".tick text").remove();
    c.gy.selectAll(".tick").each(function (name) {
      const d = rs.find(r => r.exchange === name);
      d3.select(this).append("foreignObject")
        .attr("x", -294).attr("y", -y.bandwidth() / 2)
        .attr("width", 288).attr("height", y.bandwidth())
        .append("xhtml:div")
        .attr("style", "display:flex;align-items:center;justify-content:flex-end;gap:6px;" +
                       `height:${y.bandwidth()}px;font-size:11.5px;color:${QT.tokens.ink};` +
                       "overflow:hidden;white-space:nowrap;text-align:right;")
        .html(`<span style="overflow:hidden;text-overflow:ellipsis;">${name}</span>` +
              flagIcon(d && d.country_code, d && canonCountry(d.country)));
    });
    c.gx.call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")).tickSizeOuter(0));
  })();
});
