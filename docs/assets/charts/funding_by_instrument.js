/* Funding by financing instrument over time — stacked bars/area, abs/share.
   Reads docs/data/funding_by_instrument_year.json. Refactor of the original
   prototype onto the shared theme/template; data now comes from the pipeline. */
(async function () {
  QT.injectCSS();
  const loaded = await QT.loadData("funding_by_instrument_year");
  const meta = loaded.meta, raw = loaded.data;
  QT.vintage("#vintage", meta);

  const KEYS = ["VC / private equity", "Debt", "Grant", "Public equity"];
  const SERIES = KEYS.map(k => ({ key: k, label: k, color: QT.palette.instrument[k] }));
  const PARTIAL = meta.partial_year;
  const tt = QT.tooltip();

  // normalise rows to {year, <key>...}
  const rows = raw.map(r => Object.assign({ year: r.year }, ...KEYS.map(k => ({ [k]: r[k] || 0 }))));

  const W = 920, H = 460;
  const c = QT.chart("#chart", { W, H, margin: { t: 16, r: 16, b: 34, l: 64 } });
  const x = d3.scaleBand().domain(rows.map(d => d.year)).range([0, c.iw]).padding(0.18);
  const xLin = d3.scalePoint().domain(rows.map(d => d.year)).range([x.bandwidth() / 2, c.iw - x.bandwidth() / 2]);
  const y = d3.scaleLinear().range([c.ih, 0]);

  let state = { scale: "abs", type: "bar", hidden: new Set() };
  const active = () => SERIES.filter(s => !state.hidden.has(s.key));

  function stacked() {
    const keys = active().map(s => s.key);
    let src = rows.map(d => ({ ...d }));
    if (state.scale === "share") {
      src = src.map(d => {
        const tot = keys.reduce((a, k) => a + d[k], 0) || 1;
        const o = { year: d.year }; keys.forEach(k => o[k] = d[k] / tot); return o;
      });
    }
    return d3.stack().keys(keys)(src);
  }

  function render() {
    const st = stacked();
    y.domain([0, state.scale === "share" ? 1 : d3.max(st, s => d3.max(s, d => d[1])) * 1.02 || 1]);
    const fmtAxis = state.scale === "share" ? QT.fmt.pct0 : QT.fmt.axisMoney;
    const color = k => QT.palette.instrument[k];

    c.gGrid.selectAll("line").data(y.ticks(5)).join("line")
      .attr("class", "gridline").attr("x1", 0).attr("x2", c.iw)
      .attr("y1", d => y(d)).attr("y2", d => y(d));

    // partial-year band
    if (PARTIAL && x(PARTIAL) != null) {
      c.gOverlay.selectAll(".partial-band").data([0]).join("rect")
        .attr("class", "partial-band")
        .attr("x", x(PARTIAL) - x.step() * x.paddingInner() / 2).attr("y", 0)
        .attr("width", x.step()).attr("height", c.ih);
      c.gOverlay.selectAll(".partial-label").data([0]).join("text")
        .attr("class", "partial-label").attr("x", x(PARTIAL) + x.bandwidth() / 2)
        .attr("y", 12).attr("text-anchor", "middle").text("YTD");
    }

    if (state.type === "bar") {
      c.gPlot.selectAll(".area").remove();
      const layers = c.gPlot.selectAll(".bar").data(st, d => d.key)
        .join(e => e.append("g").attr("class", "bar"), u => u, x => x.remove())
        .attr("fill", d => color(d.key));
      layers.selectAll("rect").data(d => d.map(v => ({ ...v, key: d.key })), d => d.data.year)
        .join("rect")
        .attr("x", d => x(d.data.year)).attr("width", x.bandwidth())
        .attr("y", d => y(d[1])).attr("height", d => Math.max(0, y(d[0]) - y(d[1])));
    } else {
      c.gPlot.selectAll(".bar").remove();
      const area = d3.area().x(d => xLin(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
      c.gPlot.selectAll(".area").data(st, d => d.key)
        .join(e => e.append("path").attr("class", "area"), u => u, x => x.remove())
        .attr("fill", d => color(d.key)).attr("fill-opacity", 0.92).attr("d", area);
    }

    c.gx.call(d3.axisBottom(x).tickValues(rows.map(d => d.year)
      .filter(yr => yr % 5 === 0 || yr === rows[0].year || yr === PARTIAL)).tickSizeOuter(0));
    c.gy.call(d3.axisLeft(y).ticks(5).tickFormat(fmtAxis).tickSizeOuter(0));

    QT.legend("#legend", SERIES, {
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
    c.gPlot.selectAll(".hovercol").data(rows, d => d.year).join("rect")
      .attr("class", "hovercol").attr("x", d => x(d.year)).attr("width", x.bandwidth())
      .attr("y", 0).attr("height", c.ih).attr("fill", "transparent")
      .on("mousemove", (e, d) => {
        const ser = active();
        const tot = ser.reduce((a, s) => a + d[s.key], 0);
        let html = `<div class="hd">${d.year}${d.year === PARTIAL ? " · year-to-date" : ""}</div>`;
        ser.slice().reverse().forEach(s => {
          if (d[s.key] <= 0) return;
          html += `<div class="row"><span class="k"><i style="background:${s.color}"></i>${s.label}</span><span class="v">${QT.fmt.money(d[s.key])}</span></div>`;
        });
        html += `<div class="row tot"><span class="k">Total</span><span class="v">${QT.fmt.money(tot)}</span></div>`;
        tt.show(html, e);
      })
      .on("mouseleave", tt.hide);
  }

  QT.segControl("#seg-scale", "data-s", s => { state.scale = s; render(); });
  QT.segControl("#seg-type", "data-t", t => { state.type = t; render(); });
  render();
})();
