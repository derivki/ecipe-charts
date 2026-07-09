/* Component: funding by stage — two regions overlaid, absolute or share-of-bloc. */
QT.charts.fundingByStage = async function (root, opts = {}) {
  const S = QT.shell(root, {
    eyebrow: opts.eyebrow,
    title: opts.title ?? "Quantum capital by funding stage",
    sub: opts.compact ? null : "Total capital raised at each stage of the funding ladder, comparing two blocs.",
    aria: "Funding by stage, two regions compared",
    note: opts.compact ? null : "<b>Figures are announced amounts.</b> Late-stage and growth equity are combined; debt and grants are excluded from this equity-ladder view. In share mode each bloc's stages sum to 100 per cent.",
  });

  const { meta, data } = await QT.loadData("funding_by_stage_region");
  QT.vintage(S.vintage, meta);

  const STAGES = data.stages;
  const BLOCS = {};
  data.regions.forEach(r => BLOCS[r.region] = {
    label: r.region, hex: QT.palette.region[r.region] || QT.tokens.muted, v: r.values, total: d3.sum(r.values) });
  const KEYS = Object.keys(BLOCS);
  const tt = QT.tooltip();
  const state = { a: KEYS[0], b: KEYS[2] || KEYS[1], scale: "share" };

  QT.select(S.controls, { label: "Bloc A", value: state.a, onChange: v => { state.a = v; render(); },
    items: KEYS.map(k => ({ v: k, label: BLOCS[k].label })) });
  QT.select(S.controls, { label: "Bloc B", value: state.b, onChange: v => { state.b = v; render(); },
    items: KEYS.map(k => ({ v: k, label: BLOCS[k].label })) });
  QT.seg(S.controls, { label: "Scale", value: "share", onChange: v => { state.scale = v; render(); },
    items: [{ v: "share", label: "% of bloc total" }, { v: "abs", label: "Absolute&nbsp;$" }] });

  const W = 900, H = 320;
  const c = QT.chart(S.svg, { W, H, margin: { t: 16, r: 80, b: 34, l: 180 } });
  const yb = d3.scaleBand().domain(STAGES).range([0, c.ih]).padding(0.32);
  c.g.append("g").selectAll("text").data(STAGES).join("text")
    .attr("class", "bar-val").style("font-size", "12px")
    .attr("x", -12).attr("y", d => yb(d) + yb.bandwidth() / 2).attr("dy", "0.32em")
    .attr("text-anchor", "end").attr("fill", QT.tokens.muted).text(d => d);

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

    QT.legend(S.legend, [state.a, state.b].map(k => ({ key: k, label: BLOCS[k].label, color: BLOCS[k].hex })));
    S.legend.selectAll(".lg .nm").text(d => `${BLOCS[d.key].label} · ${QT.fmt.money(BLOCS[d.key].total)} total`);
  }

  render();
};
