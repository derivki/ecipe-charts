/* Country collaboration network -- Overview Figure 6.

   Reproduces, on the tracker's own data, the network figure from the ECIPE quantum
   paper (nodes = countries, links = cross-border collaboration). What is REAL here:
     - which country pairs collaborate and how much  (collab_country_network.json)
     - node size = degree centrality, computed in the browser on the graph currently
       shown (share of the other visible countries a country is linked to)
     - line thickness = number of collaborations
   What is MOCK until the separate network analysis delivers it (mock_country_network.json):
     - node colour = betweenness ("connector role")
     - line colour = RCA (bilateral specialisation)
   Every place a mock value is drawn is badged as such. When the real measures land they
   should arrive as fields on collab_country_network.json and the `mock` lookups below
   become straight reads -- nothing else in this file needs to change.

   The layout is a force simulation run to completion up front from a fixed starting
   position, so a given view always lays out identically (no jitter on reload). */
(function () {
  const T = window.QT.tokens;

  const CSS = `
.cn-wrap svg{display:block;width:100%;height:auto;}
.cn-edge{fill:none;stroke-linecap:round;transition:opacity .12s;}
.cn-hit{fill:none;stroke:transparent;cursor:default;}
.cn-node{stroke:${T.ink};stroke-width:.9px;transition:opacity .12s;}
.cn-label{font-size:11.5px;font-weight:600;fill:${T.ink};paint-order:stroke;stroke:${T.bg};
  stroke-width:3.2px;stroke-linejoin:round;pointer-events:none;transition:opacity .12s;}
.cn-dim{opacity:.1;}
.cn-key{display:flex;flex-wrap:wrap;gap:8px 28px;margin:12px 0 2px;font-size:11.5px;color:var(--muted);}
.cn-key .grp{display:flex;align-items:center;gap:8px;}
.cn-key .ramp{display:inline-block;width:88px;height:9px;border-radius:5px;border:1px solid ${T.line};}
.cn-key .dots{display:inline-flex;align-items:center;gap:5px;}
.cn-key .dots i{display:inline-block;border-radius:50%;background:${T.bg};border:1px solid ${T.ink};}
.cn-key .bars{display:inline-flex;align-items:center;gap:5px;}
.cn-key .bars i{display:inline-block;width:26px;background:${T.muted};border-radius:2px;}
.cn-empty{font-size:12.5px;color:var(--muted);padding:40px 0;text-align:center;}
`;

  const W = 880, H = 600, PAD = 34;

  /* The two views need different cut-offs: pairs involving industry are ~10x sparser
     than all pairs, so a shared scale would leave that view empty or the other one
     unreadable. Defaults follow Elena's call (2026-09-29): 100 for all collaborations,
     which gives ~30 countries, the same density as the paper's figure. */
  const MODES = {
    all:      { label: "All collaborations",        field: "collaborations", cuts: [30, 50, 100, 250, 500], def: 100 },
    industry: { label: "Involving industry",        field: "industry",       cuts: [10, 20, 30, 50, 100],   def: 10 },
  };

  function hash01(s) { // deterministic, only used to break ties in the starting layout
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  }
  const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

  window.renderCollabNetwork = async function (selector, { mockNoteSelector } = {}) {
    const QT = window.QT;
    if (!document.getElementById("cn-css")) {
      const st = document.createElement("style"); st.id = "cn-css"; st.textContent = CSS;
      document.head.appendChild(st);
    }
    const [net, mock] = await Promise.all([QT.loadData("collab_country_network"), QT.loadData("mock_country_network")]);
    const tt = QT.tooltip();
    if (mockNoteSelector) QT.mockNote(mockNoteSelector, mock.meta.source_note);
    const root = d3.select(selector).classed("cn-wrap", true);

    const ramp = d3.interpolateRgbBasis(QT.palette.sequential);
    const rampCss = `linear-gradient(90deg, ${d3.range(0, 1.01, 0.25).map(t => ramp(t)).join(",")})`;

    // Mock lookups. A country / pair the mock file has not been regenerated for falls
    // back to the middle of the scale rather than breaking the chart (a test in
    // tests/test_country_network.py fails first, so this is only a safety net).
    const bMax = d3.max(Object.values(mock.data.betweenness)) || 1;
    const btw = c => (mock.data.betweenness[c] ?? bMax / 2) / bMax;
    const rcaVals = Object.values(mock.data.rca);
    const rcaScale = d3.scaleLinear().domain([d3.min(rcaVals), d3.max(rcaVals)]).range([0, 1]).clamp(true);
    const rca = (a, b) => mock.data.rca[pairKey(a, b)];
    const rcaT = (a, b) => { const v = rca(a, b); return v == null ? 0.5 : rcaScale(v); };
    const edgeColor = t => ramp(0.28 + 0.72 * t); // floor keeps the palest links visible on white

    const state = { mode: "all", cut: MODES.all.def };

    root.html(`
      <div class="controls">
        <div class="ctl"><label>Collaborations</label>
          <div class="seg" id="cn-seg">${Object.entries(MODES).map(([k, m]) =>
            `<button data-m="${k}"${k === state.mode ? ' class="on"' : ""}>${m.label}</button>`).join("")}</div></div>
        <div class="ctl"><label>Minimum collaborations per country pair</label><div class="chiprow" id="cn-cuts"></div></div>
      </div>
      <div id="cn-stage"></div>
      <div class="cn-key" id="cn-key"></div>`);

    const svg = root.select("#cn-stage").append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img").attr("aria-label", "Network of countries linked by cross-border quantum collaborations");
    const gEdges = svg.append("g"), gHit = svg.append("g"), gNodes = svg.append("g"), gLabels = svg.append("g");

    function build() {
      const m = MODES[state.mode];
      const links = net.data.edges
        .filter(e => e[m.field] >= state.cut)
        .map(e => ({ source: e.a, target: e.b, w: e[m.field], all: e.collaborations, industry: e.industry }));
      const names = [...new Set(links.flatMap(l => [l.source, l.target]))].sort();
      const nodes = names.map(id => ({ id }));
      const deg = new Map(names.map(n => [n, 0]));
      const vol = new Map(names.map(n => [n, 0]));
      links.forEach(l => {
        deg.set(l.source, deg.get(l.source) + 1); deg.set(l.target, deg.get(l.target) + 1);
        vol.set(l.source, vol.get(l.source) + l.w); vol.set(l.target, vol.get(l.target) + l.w);
      });
      const rScale = d3.scaleSqrt().domain([0, 1]).range([5, 25]);
      nodes.forEach(n => {
        n.deg = deg.get(n.id); n.vol = vol.get(n.id);
        n.dc = names.length > 1 ? n.deg / (names.length - 1) : 0;
        n.r = rScale(n.dc);
        n.lw = n.id.length * 6.1;                     // label width estimate, for spacing only
      });
      return { nodes, links, m };
    }

    function layout({ nodes, links }) {
      // Fixed starting ring (ordered by name, nudged by a hash of it) -> identical layout each time.
      nodes.forEach((n, i) => {
        const a = (i / nodes.length) * 2 * Math.PI + hash01(n.id) * 0.4;
        n.x = W / 2 + Math.cos(a) * 240; n.y = H / 2 + Math.sin(a) * 200;
      });
      const wExt = d3.extent(links, l => Math.log(l.w));
      const wNorm = w => wExt[1] > wExt[0] ? (Math.log(w) - wExt[0]) / (wExt[1] - wExt[0]) : 0.5;
      const sim = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id)
          .distance(l => 70 + 190 * (1 - wNorm(l.w))).strength(l => 0.25 + 0.5 * wNorm(l.w)))
        .force("charge", d3.forceManyBody().strength(-420))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force("x", d3.forceX(W / 2).strength(0.05))
        .force("y", d3.forceY(H / 2).strength(0.09))
        .force("collide", d3.forceCollide(d => d.r + Math.min(d.lw / 2, 34) + 4).iterations(2))
        .stop();
      for (let i = 0; i < 420; i++) sim.tick();
      // Fit the whole cloud into the frame (leaving room for labels) rather than clamping
      // nodes at the edge, which would pile them up against the border.
      const xs = d3.extent(nodes, n => n.x), ys = d3.extent(nodes, n => n.y);
      const k = Math.min((W - 2 * PAD - 60) / ((xs[1] - xs[0]) || 1), (H - 2 * PAD) / ((ys[1] - ys[0]) || 1), 1.6);
      nodes.forEach(n => {
        n.x = W / 2 + (n.x - (xs[0] + xs[1]) / 2) * k;
        n.y = H / 2 + (n.y - (ys[0] + ys[1]) / 2) * k;
      });
    }

    function render() {
      const g = build();
      const stage = root.select("#cn-stage");
      stage.selectAll(".cn-empty").remove();
      if (!g.nodes.length) {
        gEdges.selectAll("*").remove(); gHit.selectAll("*").remove(); gNodes.selectAll("*").remove(); gLabels.selectAll("*").remove();
        stage.append("div").attr("class", "cn-empty").text("No country pairs reach this minimum – lower it to see more.");
        return draw(g);
      }
      layout(g);
      draw(g);
    }

    function draw({ nodes, links, m }) {
      const byId = new Map(nodes.map(n => [n.id, n]));
      const wScale = d3.scaleSqrt().domain([0, d3.max(links, l => l.w) || 1]).range([0.6, 9]);

      // Reset the scene: layouts differ wholesale between views, so keyed joins would just animate nonsense.
      [gEdges, gHit, gNodes, gLabels].forEach(gg => gg.selectAll("*").remove());

      const edgeSel = gEdges.selectAll("line").data(links).join("line").attr("class", "cn-edge")
        .attr("x1", l => byId.get(l.source.id ?? l.source).x).attr("y1", l => byId.get(l.source.id ?? l.source).y)
        .attr("x2", l => byId.get(l.target.id ?? l.target).x).attr("y2", l => byId.get(l.target.id ?? l.target).y)
        .attr("stroke", l => edgeColor(rcaT(l.source.id ?? l.source, l.target.id ?? l.target)))
        .attr("stroke-opacity", 0.85).attr("stroke-width", l => wScale(l.w));

      const sid = l => l.source.id ?? l.source, tid = l => l.target.id ?? l.target;
      const nodeSel = gNodes.selectAll("circle").data(nodes.slice().sort((a, b) => b.r - a.r)).join("circle")
        .attr("class", "cn-node").attr("cx", n => n.x).attr("cy", n => n.y).attr("r", n => n.r)
        .attr("fill", n => ramp(btw(n.id)));

      const labelSel = gLabels.selectAll("text").data(nodes).join("text").attr("class", "cn-label")
        .attr("x", n => n.x).attr("y", n => n.y - n.r - 5).attr("text-anchor", "middle").text(n => n.id);

      function focus(id) {
        const nb = new Set([id]);
        links.forEach(l => { if (sid(l) === id) nb.add(tid(l)); if (tid(l) === id) nb.add(sid(l)); });
        edgeSel.classed("cn-dim", l => sid(l) !== id && tid(l) !== id);
        nodeSel.classed("cn-dim", n => !nb.has(n.id));
        labelSel.classed("cn-dim", n => !nb.has(n.id));
      }
      const unfocus = () => { edgeSel.classed("cn-dim", false); nodeSel.classed("cn-dim", false); labelSel.classed("cn-dim", false); };
      const mockTag = QT.mockBadge("Mock");

      nodeSel.on("mousemove", (e, n) => {
        focus(n.id);
        tt.show(`<div class="hd">${n.id}</div>` +
          `<div class="row"><span class="k">Partner countries</span><span class="v">${n.deg}</span></div>` +
          `<div class="row"><span class="k">Collaborations shown</span><span class="v">${QT.fmt.int(n.vol)}</span></div>` +
          `<div class="row"><span class="k">Betweenness ${mockTag}</span><span class="v">${btw(n.id).toFixed(2)}</span></div>`, e);
      }).on("mouseleave", () => { unfocus(); tt.hide(); });

      gHit.selectAll("line").data(links).join("line").attr("class", "cn-hit")
        .attr("x1", l => byId.get(sid(l)).x).attr("y1", l => byId.get(sid(l)).y)
        .attr("x2", l => byId.get(tid(l)).x).attr("y2", l => byId.get(tid(l)).y)
        .attr("stroke-width", l => Math.max(10, wScale(l.w) + 6))
        .on("mousemove", (e, l) => {
          const a = sid(l), b = tid(l), r = rca(a, b);
          tt.show(`<div class="hd">${a} – ${b}</div>` +
            `<div class="row"><span class="k">All collaborations</span><span class="v">${QT.fmt.int(l.all)}</span></div>` +
            `<div class="row"><span class="k">Involving industry</span><span class="v">${QT.fmt.int(l.industry)}</span></div>` +
            `<div class="row"><span class="k">RCA ${mockTag}</span><span class="v">${r == null ? "–" : r.toFixed(2)}</span></div>`, e);
        }).on("mouseleave", tt.hide);

      // ---- key -------------------------------------------------------------
      const dots = [0.05, 0.4, 1].map(t => { const d = 2 * d3.scaleSqrt().domain([0, 1]).range([5, 25])(t); return `<i style="width:${d}px;height:${d}px"></i>`; }).join("");
      const bars = [0.6, 2.5, 6].map(h => `<i style="height:${h}px"></i>`).join("");
      root.select("#cn-key").html(
        `<div class="grp"><span>Node size: number of partner countries</span><span class="dots">${dots}</span></div>` +
        `<div class="grp"><span>Line thickness: collaborations</span><span class="bars">${bars}</span></div>` +
        `<div class="grp"><span>Node colour: betweenness ${mockTag}</span><span>Low</span><span class="ramp" style="background:${rampCss}"></span><span>High</span></div>` +
        `<div class="grp"><span>Line colour: RCA ${mockTag}</span><span>Low</span><span class="ramp" style="background:${rampCss}"></span><span>High</span></div>`);
    }

    function chips() {
      const m = MODES[state.mode];
      root.select("#cn-cuts").selectAll(".chip").data(m.cuts, d => d).join("span").attr("class", "chip")
        .classed("on", c => c === state.cut).text(c => "≥ " + QT.fmt.int(c))
        .on("click", (e, c) => { state.cut = c; chips(); render(); });
    }

    QT.segControl("#cn-seg", "data-m", k => { state.mode = k; state.cut = MODES[k].def; chips(); render(); });
    chips();
    render();
  };
})();
