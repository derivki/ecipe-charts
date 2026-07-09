/* Component: headline KPI stat tiles. Reads overview_stats.json.
   Each tile: {value (display string), label, source}. */
QT.charts.overviewStats = async function (root) {
  const { data } = await QT.loadData("overview_stats");
  const el = d3.select(root).classed("kpis", true);
  el.selectAll(".kpi").data(data.tiles).join(enter => {
    const k = enter.append("div").attr("class", "kpi");
    k.append("div").attr("class", "v");
    k.append("div").attr("class", "k");
    k.append("div").attr("class", "s");
    return k;
  }).each(function (d) {
    const k = d3.select(this);
    k.select(".v").text(d.value);
    k.select(".k").text(d.label);
    k.select(".s").text(d.source);
  });
};
