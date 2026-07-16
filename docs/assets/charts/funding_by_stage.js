/* Funding by stage — two regions overlaid, absolute or share-of-bloc.
   Reads docs/data/funding_by_stage_region.json. Refactor of the funnel prototype. */
(async function () {
  QT.injectCSS();
  const { data, meta } = await QT.loadData("funding_by_stage_region");
  QT.vintage("#vintage", meta);

  const STAGES = data.stages;
  const BLOCS = {};
  data.regions.forEach(r => {
    BLOCS[r.region] = { label: r.region, hex: QT.palette.region[r.region] || "#5d6875",
                        v: r.values, total: d3.sum(r.values) };
  });
  const KEYS = Object.keys(BLOCS);
  const tt = QT.tooltip();

  let state = { a: KEYS[0], b: KEYS[2] || KEYS[1], scale: "share" };
  KEYS.forEach(k => ["#ra", "#rb"].forEach(s =>
    d3.select(s).append("option").attr("value", k).text(BLOCS[k].label)));
  d3.select("#ra").property("value", state.a);
  d3.select("#rb").property("value", state.b);

  const W = 900, H = 320;
  const c = QT.chart("#chart", { W, H, margin: { t: 16, r: 80, b: 34, l: 215 } });
  const y = d3.scaleBand().domain(STAGES).range([0, c.ih]).padding(0.32);
  c.g.append("g").selectAll("text").data(STAGES).join("text")
    .attr("class", "bar-val").style("font-size", "11px")
    .attr("x", -12).attr("y", d => y(d) + y.bandwidth() / 2).attr("dy", "0.32em")
    .attr("text-anchor", "end").attr("fill", QT.tokens.muted).text(d => d);

  function legend() {
    const items = [state.a, state.b].map(k => ({ key: k, label: BLOCS[k].label, color: BLOCS[k].hex }));
    QT.legend("#legend", items);
    d3.select("#legend").selectAll(".lg .nm")
      .text(d => `${BLOCS[d.key].label} · ${QT.fmt.money(BLOCS[d.key].total)} total`);
  }

  function render() {
    const A = BLOCS[state.a], B = BLOCS[state.b], share = state.scale === "share";
    const val = (b, i) => share ? (b.total ? b.v[i] / b.total : 0) : b.v[i];
    const maxV = d3.max([A, B], b => d3.max(b.v.map((_, i) => val(b, i)))) || 1;
    const x = d3.scaleLinear().domain([0, maxV * 1.02]).range([0, c.iw]);
    const bh = y.bandwidth() / 2 - 2;

    c.gGrid.selectAll("line").data(x.ticks(5)).join("line").attr("class", "gridline")
      .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", c.ih);
    c.gx.call(d3.axisBottom(x).ticks(5)
      .tickFormat(share ? QT.fmt.pct0 : QT.fmt.axisMoney).tickSizeOuter(0));

    const pairs = [[A, 0], [B, bh + 4]];
    c.gPlot.selectAll("g.blocrow").data(pairs, p => p[0].label)
      .join(e => e.append("g").attr("class", "blocrow"), u => u, x => x.remove())
      .each(function (p) {
        const bloc = p[0], off = p[1];
        const rs = STAGES.map((s, i) => ({ stage: s, v: bloc.v[i], val: val(bloc, i) }));
        const sel = d3.select(this);
        sel.selectAll("rect").data(rs, d => d.stage).join("rect")
          .attr("x", 0).attr("y", d => y(d.stage) + off).attr("height", bh).attr("rx", 2)
          .attr("fill", bloc.hex).attr("fill-opacity", 0.88).attr("width", d => x(d.val))
          .on("mousemove", (e, d) => tt.show(
            `<div class="hd">${bloc.label} · ${d.stage}</div>` +
            `<div class="row"><span class="k">Amount</span><span class="v">${QT.fmt.money(d.v)}</span></div>` +
            `<div class="row"><span class="k">Share of bloc</span><span class="v">${bloc.total ? QT.fmt.pct1(d.v / bloc.total) : "—"}</span></div>`, e))
          .on("mouseleave", tt.hide);
        sel.selectAll("text").data(rs, d => d.stage).join("text").attr("class", "bar-val")
          .attr("x", d => x(d.val) + 5).attr("y", d => y(d.stage) + off + bh / 2).attr("dy", "0.32em")
          .text(d => d.v === 0 ? "" : (share ? (bloc.total ? QT.fmt.pct0(d.v / bloc.total) : "") : QT.fmt.money(d.v)));
      });
    legend();
  }

  d3.select("#ra").on("change", function () { state.a = this.value; render(); });
  d3.select("#rb").on("change", function () { state.b = this.value; render(); });
  QT.segControl("#seg-scale", "data-s", s => { state.scale = s; render(); });
  render();
})();
