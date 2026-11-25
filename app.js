/* MØNEYBALL dashboard — data.js(window.DASH_DATA) 렌더러 */
(function () {
  /* ── 부팅 시퀀스 (클릭/키로 스킵) ── */
  (function boot() {
    const el = document.getElementById("boot"), log = document.getElementById("bootlog");
    if (!el || !log) return;
    const kill = () => { el.classList.add("off"); setTimeout(() => el.remove(), 400); };
    try { if (sessionStorage.getItem("mb_boot")) { el.remove(); return; } sessionStorage.setItem("mb_boot", "1"); } catch (e) {}
    const L = [
      "MØNEYBALL <span class='dim'>v2.1 — terminal</span>",
      "> auth ......... <span class='dim'>ANONYMOUS</span>",
      "> feeds ........ <span class='dim'>KRX · NAVER · WSJ · MW</span>",
      "> models ....... <span class='dim'>MOMENTUM / SENTI / 4-TRACK</span>",
      "> baseline ..... <span class='dim'>ARMED</span>",
      "<span class='ok'>ACCESS GRANTED █</span>",
    ];
    let i = 0;
    el.addEventListener("click", kill);
    document.addEventListener("keydown", kill, { once: true });
    const t = setInterval(() => {
      if (i >= L.length) { clearInterval(t); setTimeout(kill, 420); return; }
      log.innerHTML += L[i++] + "\n";
    }, 150);
  })();
  const D = window.DASH_DATA || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STATUS = { ok: ["정상", "ok"], warn: ["재검토", "warn"], halt: ["중단검토", "halt"] };
  const pctCls = (x) => (x > 0.0005 ? "pos" : x < -0.0005 ? "neg" : "flat");
  const pct = (x, dp = 1) => (x > 0 ? "+" : "") + (x * 100).toFixed(dp) + "%";
  const comma = (v, dp = 0) => Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const fmtEq = (mkt, v) => {
    if (mkt !== "kr") return "$" + comma(v, v < 100 ? 2 : 0);
    const m = v / 1e4;
    return comma(m, Math.abs(m % 1) < 0.05 ? 0 : 1) + "만원";
  };
  const fmtPx = (mkt, v) => v == null ? "—" : mkt === "kr" ? comma(v) + "원" : "$" + comma(v, v < 100 ? 2 : 1);
  const fmtVal = (mkt, v) => mkt === "kr"
    ? (v >= 1e12 ? (v / 1e12).toFixed(2) + "조" : comma(v / 1e8) + "억")
    : "$" + (v >= 1e9 ? (v / 1e9).toFixed(1) + "B" : comma(v / 1e6) + "M");
  const mdDate = (d) => d ? String(d).slice(5).replace("-", ".") : "—";

  /* ── 미니 스파크라인 SVG ── */
  function spark(vals, w, h, { fill = true, cls = "" } = {}) {
    if (!vals || vals.length < 2) return "";
    const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
    const px = (i) => (i / (vals.length - 1)) * (w - 4) + 2;
    const py = (v) => h - 4 - ((v - mn) / sp) * (h - 8);
    const pts = vals.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
    const area = fill ? `<polygon points="2,${h - 2} ${pts} ${(w - 2)},${h - 2}" fill="currentColor" opacity="0.1"/>` : "";
    return `<svg class="spark ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${area}` +
      `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<circle cx="${px(vals.length - 1).toFixed(1)}" cy="${py(vals[vals.length - 1]).toFixed(1)}" r="2.4" fill="currentColor"/></svg>`;
  }

  /* ── 헤더 + 테이프 ── */
  const krDay = D.flow && D.flow.kr ? D.flow.kr.day : (D.kr ? D.kr.updated : "");
  const usDay = D.flow && D.flow.us ? D.flow.us.day : D.updated;
  $("upd").innerHTML = `KR ${esc(krDay)} · US ${esc(usDay)}<br>UPD ${esc(D.generated || "")}`;
  const P = D.paper || [];
  $("tape").innerHTML = P.map((t) =>
    `<span>${esc(t.label)} <b>${fmtEq(t.mkt, t.equity)}</b> <b class="${pctCls(t.day)}">${pct(t.day)}</b></span>`
  ).join("");

  /* ── TODAY: 트랙 패널 ── */
  $("home-sub").textContent = P.length ? `페이퍼 4트랙 · KR ${krDay} / US ${usDay} 종가 기준` : "데이터 준비 중";
  $("tracks").innerHTML = P.map((t) => {
    const [stTxt, stCls] = STATUS[t.status];
    const vals = t.series.slice(-45).map((r) => r[1]);
    return `<div class="panel tcard" data-t="${t.id}">
      <div class="thead"><span class="chip ${t.mkt}">${t.mkt.toUpperCase()}</span>
        <span class="tname">${esc(t.label)}</span>
        <span class="chip ${stCls}" style="margin-left:auto">${stTxt}</span></div>
      <div class="eq">${fmtEq(t.mkt, t.equity)}</div>
      <div class="drow"><span class="${pctCls(t.day)}">1D ${pct(t.day)}</span>
        <span class="${pctCls(t.cum)}">CUM ${pct(t.cum)}</span></div>
      <span class="${pctCls(t.cum)}" style="display:block">${spark(vals, 300, 42)}</span>
      <div class="meta"><span>POS ${t.n_pos}</span><span>CASH ${Math.round(t.cash / t.equity * 100)}%</span><span>${esc(t.date)}</span></div>
    </div>`;
  }).join("");
  $("tracks").addEventListener("click", (e) => {
    const c = e.target.closest(".tcard");
    if (c) { selTrack = c.dataset.t; location.hash = "#paper"; }
  });

  /* ── TODAY: 기준선 표 ── */
  $("basetab").innerHTML = `<tr><th>트랙</th><th>Roll 21D</th><th>재검토</th><th>중단검토</th><th>상태</th></tr>` +
    P.map((t) => {
      const [stTxt, stCls] = STATUS[t.status];
      return `<tr><td class="nm">${esc(t.label)}</td>
        <td style="font-weight:600"><span class="${pctCls(t.roll)}">${pct(t.roll, 2)}</span>${t.roll_full ? "" : " <span class='mini'>(누적)</span>"}</td>
        <td class="mini">${pct(t.warn)}</td><td class="mini">${pct(t.halt)}</td>
        <td><span class="chip ${stCls}">${stTxt}</span></td></tr>`;
    }).join("");

  /* ── FLOWS ── */
  const F = D.flow;
  const drvMap = {};
  (F && F.drivers || []).forEach((d) => { drvMap[d.theme] = d.drivers; });

  function memberTable(mem, mkt) {
    if (!mem || !mem.length) return "";
    const fin = mkt === "kr";
    const head = fin
      ? `<tr><th>종목</th><th>현재가</th><th>등락</th><th>거래대금</th><th>비중</th><th>시총</th><th>PER</th><th>PBR</th><th>20D</th></tr>`
      : `<tr><th>종목</th><th>현재가</th><th>등락</th><th>20D</th></tr>`;
    return `<div class="scrollx"><table class="g">` + head + mem.map((m) => {
      const f = m.fin || {};
      const cells = fin
        ? `<td>${fmtVal("kr", m.value)}</td><td>${m.share}%</td>
           <td>${esc(f.cap || "—")}</td><td>${esc(f.per || "—")}</td><td>${esc(f.pbr || "—")}</td>`
        : ``;
      return `<tr><td class="nm">${esc(m.n)} <span class="mini mono">${esc(m.t)}</span></td>
        <td>${fmtPx(mkt, m.px)}</td>
        <td class="${pctCls(m.chg / 100)}">${pct(m.chg / 100)}</td>${cells}
        <td class="mspark ${pctCls(m.chg / 100)}">${spark(m.spark, 64, 22, { fill: false })}</td></tr>`;
    }).join("") + `</table></div>`;
  }

  function flowRow(r, i, mkt) {
    const hot = r.heat != null && r.heat >= 1;
    const heat = r.heat == null ? "—" : r.heat.toFixed(1) + "×";
    const drv = mkt === "kr" ? drvMap[r.name] : null;
    let drvHtml = "";
    if (drv && drv.length) {
      drvHtml = `<div class="fdrv">` + drv.map((v) => {
        const hd = v.head_date ? ` (${v.head_date.slice(4, 6)}/${v.head_date.slice(6, 8)})` : "";
        return `<span class="mini">주도주</span> <span class="dname">${esc(v.name)}</span>
          <span class="mono ${pctCls(v.chg / 100)}">${pct(v.chg / 100)}</span>
          <span class="mini">테마 내 ${v.share}%</span>
          ${v.head ? `<span class="dhead">“${esc(v.head)}”${hd}</span>` : ""}`;
      }).join("") + `</div>`;
    }
    return `<div class="frow" data-i="${i}">
      <div class="fhead">
        <span class="rank">${String(i + 1).padStart(2, "0")}</span>
        <span class="fname">${esc(r.name)} <span class="heat ${hot ? "" : "cool"}">${heat}</span>
          <span class="mono ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span></span>
        <span class="fspark ${pctCls(r.chg / 100)}">${spark(r.spark, 110, 36)}</span>
        <span class="fcaret">▼</span>
        <span class="fstats"><span>VAL <b>${fmtVal(mkt, r.value)}</b></span>
          <span>SHR ${r.share}%</span><span class="pos">▲${r.rise}</span><span class="neg">▼${r.fall}</span></span>
      </div>
      <div class="fdet">${drvHtml}${memberTable(r.mem, mkt)}
        ${!r.mem || !r.mem.length ? "<span class='mini'>구성종목 상세 없음</span>" : ""}</div>
    </div>`;
  }

  function bindExpand(el) {
    el.addEventListener("click", (e) => {
      const h = e.target.closest(".fhead");
      if (!h) return;
      const row = h.parentElement;
      row.classList.toggle("open");
      h.querySelector(".fcaret").textContent = row.classList.contains("open") ? "▲" : "▼";
    });
  }

  function renderFlow(mkt) {
    if (!F) { $("flowin").innerHTML = "<div class='panel mini'>데이터 준비 중</div>"; return; }
    const side = F[mkt];
    $("flowin").innerHTML = side.in.map((r, i) => flowRow(r, i, mkt)).join("");
    $("flowout").innerHTML = side.out.length ? side.out.map((r) =>
      `<div class="outrow"><span class="fname">${esc(r.name)}</span>
        <span class="heat cool">${r.heat == null ? "—" : r.heat.toFixed(1) + "×"}</span>
        <span class="mono ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span>
        <span class="mini mono" style="width:70px;text-align:right">${fmtVal(mkt, r.value)}</span></div>`
    ).join("") : "<span class='mini'>해당 없음</span>";
    let mg = "";
    if (mkt === "kr") {
      const cnt = {};
      side.in.forEach((r) => (drvMap[r.name] || []).forEach((v) => {
        (cnt[v.name] = cnt[v.name] || []).push(r.name);
      }));
      const hits = Object.entries(cnt).filter(([, th]) => th.length >= 3)
        .sort((a, b) => b[1].length - a[1].length).slice(0, 2);
      mg = hits.map(([nm, th]) =>
        `<div class="callout">⚠ MAGNET — <b>${esc(nm)}</b>이(가) 상위 테마 ${th.length}곳의 주도주.
         테마 수급이 아니라 종목 개별 이슈가 여러 테마 수치를 끌어올렸을 가능성.</div>`).join("");
    }
    $("magnet").innerHTML = mg;
  }
  document.querySelectorAll("#flowseg button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#flowseg button").forEach((x) => x.classList.toggle("on", x === b));
    renderFlow(b.dataset.m);
  }));
  bindExpand($("flowin"));
  bindExpand($("highlights"));

  /* ── TODAY: 하이라이트 + 최근 체결 ── */
  if (F) {
    $("hl-sub").textContent = `KR ${F.kr.day} 쏠림 상위 — 전체는 FLOWS 탭`;
    $("highlights").innerHTML = F.kr.in.slice(0, 3).map((r, i) => flowRow(r, i, "kr")).join("");
  }
  const allJr = P.flatMap((t) => t.journal.map((j) => ({ ...j, label: t.label, mkt: t.mkt })))
    .sort((a, b) => (a.xd < b.xd ? 1 : -1)).slice(0, 6);
  $("recent").innerHTML = allJr.length ? allJr.map((j) =>
    `<div class="jrow"><span class="chip ${j.mkt}">${esc(j.label)}</span>
      <span class="nm">${esc(j.n)}</span>
      <span class="mono ${pctCls(j.ret)}" style="font-weight:600">${pct(j.ret)}</span>
      <span class="why ${esc(j.why)}">${esc(j.why)}</span>
      <span class="mini mono">${mdDate(j.xd)}</span></div>`).join("")
    : "<span class='mini'>최근 체결 없음</span>";

  /* ── PORTFOLIO ── */
  let selTrack = P.length ? P[0].id : null;
  $("tchips").innerHTML = P.map((t) =>
    `<button data-t="${t.id}" class="${t.id === selTrack ? "on" : ""}">${esc(t.label)}</button>`).join("");
  document.querySelectorAll("#tchips button").forEach((b) => b.addEventListener("click", () => {
    selTrack = b.dataset.t; renderPaper();
  }));

  /* 종목 상세 블록 — 20일 차트 + 52주 고저 + (KR) 기본 재무 */
  function stockDetail(p, mkt) {
    const f = p.fin || {};
    const parts = [];
    if (p.spark && p.spark.length > 1)
      parts.push(`<span class="xspark ${pctCls((p.chg || 0) / 100 || (p.ret || 0))}">${spark(p.spark, 180, 44)}</span><span class="mini">20D</span>`);
    if (p.hi52 != null) parts.push(`<span>52W H <b>${fmtPx(mkt, p.hi52)}</b></span><span>52W L <b>${fmtPx(mkt, p.lo52)}</b></span>`);
    if (f.cap) parts.push(`<span>시총 <b>${esc(f.cap)}</b></span>`);
    if (f.per) parts.push(`<span>PER <b>${esc(f.per)}</b></span>`);
    if (f.pbr) parts.push(`<span>PBR <b>${esc(f.pbr)}</b></span>`);
    if (f.frgn) parts.push(`<span>외인 <b>${esc(f.frgn)}</b></span>`);
    return parts.length ? `<div class="xd">${parts.join("")}</div>` : "";
  }

  function maxDD(vals) {
    let peak = -Infinity, dd = 0;
    for (const v of vals) { peak = Math.max(peak, v); dd = Math.min(dd, v / peak - 1); }
    return dd;
  }

  function renderPaper() {
    const t = P.find((x) => x.id === selTrack);
    if (!t) return;
    document.querySelectorAll("#tchips button").forEach((b) => b.classList.toggle("on", b.dataset.t === t.id));
    const vals = t.series.map((r) => r[1]);
    const [stTxt, stCls] = STATUS[t.status];
    $("tstats").innerHTML = [
      [fmtEq(t.mkt, t.equity), "Equity"],
      [`<span class="${pctCls(t.cum)}">${pct(t.cum)}</span>`, "Cum Return"],
      [`<span class="${pctCls(t.roll)}">${pct(t.roll)}</span> <span class="chip ${stCls}">${stTxt}</span>`, "Roll 21D"],
      [`<span class="neg">${pct(maxDD(vals))}</span>`, "Max DD"],
      [`${t.n_pos} · ${Math.round(t.cash / t.equity * 100)}%`, "Pos · Cash"],
    ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
    drawEq(t);
    const pos = t.pos.slice().sort((a, b) => (b.ret || 0) - (a.ret || 0));
    $("positions").innerHTML = pos.length ? `<table class="g">
      <tr><th>종목</th><th>진입일</th><th>보유일</th><th>진입가</th><th>현재가</th><th>수익률</th></tr>` +
      pos.map((p) => {
        const det = stockDetail(p, t.mkt);
        return `<tr class="xrow"><td class="nm">${esc(p.n)} <span class="mini mono">${esc(p.t)}</span></td>
        <td>${mdDate(p.ed)}</td><td>${p.bars}</td>
        <td>${fmtPx(t.mkt, p.ep)}</td><td>${fmtPx(t.mkt, p.px)}</td>
        <td class="${pctCls(p.ret || 0)}" style="font-weight:600">${p.ret == null ? "—" : pct(p.ret)}</td></tr>
        <tr class="xdet"><td colspan="6">${det}</td></tr>`;
      }).join("") + "</table>"
      : "<span class='mini'>보유 종목 없음 (현금 100%)</span>";

    /* 매수 후보 + 예약 주문 */
    const pend = t.pend || [];
    $("pendbox").innerHTML = pend.length ? `<div class="panel">` + pend.map((o) =>
      `<div class="jrow"><span class="chip ${o.type === "buy" ? "ok" : "halt"}">${esc(String(o.type).toUpperCase())}</span>
        <span class="nm">${esc(o.n)} <span class="mini mono">${esc(o.t)}</span></span>
        <span class="mini">다음 시가 체결 예약</span>
        <span class="why ${esc(o.why)}">${esc(o.why || "signal")}</span>
        <span class="mini mono">${mdDate(o.d)}</span></div>`).join("") + `</div>` : "";
    const cand = t.mkt === "kr" ? (D.kr && D.kr.today || []) : (D.today || []);
    const cdate = t.mkt === "kr" ? (D.kr && D.kr.updated) : D.updated;
    const stale = t.mkt === "us" ? " · 소셜 수집 일시중지로 언급 점수는 참고용" : "";
    $("cand-sub").textContent = cand.length
      ? `스크린 통과 종목 ${cand.length}개 (${cdate} 기준)${stale} — ★ = 매수 예약`
      : "스크린 통과 종목 없음";
    const pendSet = new Set(pend.filter((o) => o.type === "buy").map((o) => o.t));
    $("cands").innerHTML = cand.length ? cand.slice(0, 15).map((r) => {
      const chg = r.chg == null ? "" : `<span class="mono ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span>`;
      const det = (r.fin || r.spk)
        ? stockDetail({ spark: r.spk, hi52: r.hi52, lo52: r.lo52, fin: r.fin, chg: r.chg }, t.mkt)
        : "";
      return `<div class="crow${det ? "" : " nodet"}"><div class="prow">${(r.star || pendSet.has(r.t)) ? '<span class="star">★</span>' : ""}
        <span class="nm">${esc(r.n)} <span class="tk">${esc(r.t)}</span></span>
        <span class="mono mini">${fmtPx(t.mkt, r.close)}</span>${chg}
        <span class="score">${r.s}</span>
        <span class="mini mono" style="width:38px;text-align:right">${r.streak}일째</span></div>
        ${det ? `<div class="cdet">${det}</div>` : ""}</div>`;
    }).join("") : "<span class='mini'>—</span>";

    const jr = t.journal.slice().reverse();
    $("journal").innerHTML = jr.length ? `<table class="g">
      <tr><th>종목</th><th>진입</th><th>청산</th><th>수익률</th><th>사유</th></tr>` +
      jr.map((j) => `<tr><td class="nm">${esc(j.n)} <span class="mini mono">${esc(j.t)}</span></td>
        <td>${mdDate(j.ed)}</td><td>${mdDate(j.xd)}</td>
        <td class="${pctCls(j.ret)}" style="font-weight:600">${pct(j.ret)}</td>
        <td><span class="why ${esc(j.why)}">${esc(j.why)}</span></td></tr>`).join("") + "</table>"
      : "<span class='mini'>아직 체결 없음</span>";
  }

  /* 메인 equity 차트 + 호버 ── */
  function drawEq(t) {
    const svg = $("eqchart"), W = 680, H = 240, L = 10, R = 10, T = 16, B = 26;
    const s = t.series, vals = s.map((r) => r[1]);
    const mn = Math.min(...vals, t.start), mx = Math.max(...vals, t.start), sp = mx - mn || 1;
    const px = (i) => L + (i / (s.length - 1)) * (W - L - R);
    const py = (v) => T + (1 - (v - mn) / sp) * (H - T - B);
    const pts = vals.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
    const col = t.cum >= 0 ? "var(--up)" : "var(--dn)";
    svg.innerHTML =
      `<polygon points="${L},${H - B} ${pts} ${W - R},${H - B}" fill="${col}" opacity="0.08"/>
       <line x1="${L}" y1="${py(t.start)}" x2="${W - R}" y2="${py(t.start)}" stroke="var(--mut)" stroke-dasharray="4 4" stroke-width="1"/>
       <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
       <line id="xh" x1="0" y1="${T}" x2="0" y2="${H - B}" stroke="var(--amb)" stroke-width="1" opacity="0"/>
       <circle id="xd" r="3.2" fill="var(--amb)" opacity="0"/>
       <text x="${L}" y="${H - 8}" font-size="10" font-family="var(--mono)" fill="var(--mut)">${s[0][0]}</text>
       <text x="${W - R}" y="${H - 8}" font-size="10" font-family="var(--mono)" fill="var(--mut)" text-anchor="end">${s[s.length - 1][0]}</text>
       <text x="${W - R}" y="${py(t.start) - 5}" font-size="10" font-family="var(--mono)" fill="var(--mut)" text-anchor="end">START ${fmtEq(t.mkt, t.start)}</text>`;
    const tt = $("tt");
    svg.onpointermove = (e) => {
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W;
      const i = Math.max(0, Math.min(s.length - 1, Math.round((x - L) / (W - L - R) * (s.length - 1))));
      const xh = svg.querySelector("#xh"), xd = svg.querySelector("#xd");
      xh.setAttribute("x1", px(i)); xh.setAttribute("x2", px(i)); xh.setAttribute("opacity", "0.6");
      xd.setAttribute("cx", px(i)); xd.setAttribute("cy", py(vals[i])); xd.setAttribute("opacity", "1");
      tt.style.display = "block";
      tt.style.left = (px(i) / W * r.width) + "px";
      tt.style.top = (py(vals[i]) / H * r.height) + "px";
      tt.innerHTML = `${s[i][0]} ${fmtEq(t.mkt, vals[i])}`;
    };
    svg.onpointerleave = () => {
      tt.style.display = "none";
      svg.querySelector("#xh").setAttribute("opacity", "0");
      svg.querySelector("#xd").setAttribute("opacity", "0");
    };
  }

  /* ── SIGNALS ── */
  function pulseRows(rows, mkt) {
    return rows.slice(0, 25).map((r) => {
      const chg = r.chg == null ? "" : `<span class="mono ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span>`;
      return `<div class="prow">${r.star ? '<span class="star">★</span>' : ""}
        <span class="nm">${esc(r.n)} <span class="tk">${esc(r.t)}</span></span>
        <span class="flat" style="width:52px">${spark(r.hist, 52, 20, { fill: false })}</span>
        ${chg}<span class="score" title="언급 점수">${r.s}</span>
        <span class="mini mono" style="width:38px;text-align:right">${r.streak}일째</span></div>`;
    }).join("");
  }
  function pulseLead(lead, mkt) {
    if (!lead || !lead.rows.length) return "";
    const note = lead.avg_talk != null
      ? `<div class="note">첫 등재 후 평균 수익률 — 언급 종목 ${lead.avg_talk > 0 ? "+" : ""}${lead.avg_talk}% (${lead.n_talk}개)` +
        (lead.avg_zero != null ? ` vs 무언급 ${lead.avg_zero > 0 ? "+" : ""}${lead.avg_zero}% (${lead.n_zero}개)` : "") + `</div>` : "";
    return `<h2>Leaderboard</h2>${note}<div class="panel">` +
      lead.rows.slice(0, 15).map((r) =>
        `<div class="prow"><span class="nm">${esc(r.n)} <span class="tk">${esc(r.t)}</span></span>
          <span class="mini mono">${r.days}일</span><span class="score">${r.cum}</span>
          <span class="mono ${r.ret == null ? "flat" : pctCls(r.ret)}" style="width:62px;text-align:right">${r.ret == null ? "—" : (r.ret > 0 ? "+" : "") + r.ret + "%"}</span></div>`).join("") + "</div>";
  }
  function renderPulse(mkt) {
    const body = $("pulsebody");
    if (mkt === "us") {
      $("pulse-sub").textContent = `미국 — 전략 통과 종목의 소셜 언급 집계 (마지막 수집 ${D.updated}, 수집 일시중지 중)`;
      body.innerHTML = `<div class="panel">${pulseRows(D.today || [], "us")}</div>` + pulseLead(D.lead, "us");
    } else {
      const K = D.kr || {};
      $("pulse-sub").textContent = `한국 — 뉴스·커뮤니티 언급 집계 (${K.updated || "—"})`;
      body.innerHTML = `<div class="panel">${pulseRows(K.today || [], "kr")}</div>` + pulseLead(K.lead, "kr");
    }
  }
  document.querySelectorAll("#pulseseg button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#pulseseg button").forEach((x) => x.classList.toggle("on", x === b));
    renderPulse(b.dataset.m);
  }));

  /* ── NEWS (큐레이션) ── */
  function newsRow(it) {
    return `<a class="nrow" href="${esc(it.u)}" target="_blank" rel="noopener">
      <div class="nmeta">${it.mkt ? `<span class="chip ${esc(it.mkt)}">${esc(it.mkt.toUpperCase())}</span> ` : ""}${esc(it.ts)} · <b>${esc(it.src)}</b></div>
      <div class="nt">${esc(it.t)}</div>
      ${it.d ? `<div class="nd">${esc(it.d)}</div>` : ""}</a>`;
  }
  function renderNews() {
    const N = D.news || {};
    $("news-movers").innerHTML = (N.movers || []).length
      ? N.movers.map(newsRow).join("") : "<span class='mini'>선별된 뉴스 없음</span>";
    $("news-tech").innerHTML = (N.tech || []).length
      ? N.tech.map(newsRow).join("") : "<span class='mini'>선별된 뉴스 없음</span>";
    const th = N.theme || [];
    $("news-theme").innerHTML = th.length ? th.map((x) => {
      const nw = x.news || {};
      const heat = x.heat == null ? "" : `<span class="heat">${x.heat.toFixed(1)}×</span>`;
      const themes = (x.themes || []).map(esc).join(" · ");
      const body = nw.t
        ? (nw.u ? `<a class="nrow" style="padding:6px 0 0" href="${esc(nw.u)}" target="_blank" rel="noopener">
             <div class="nmeta">${esc(nw.ts)} ${nw.src ? "· <b>" + esc(nw.src) + "</b>" : ""}</div>
             <div class="nt">${esc(nw.t)}</div></a>`
               : `<div class="nt" style="padding-top:6px">${esc(nw.t)}</div>`)
        : `<div class="mini" style="padding-top:6px">연결된 당일 기사 없음 — 수급 오귀속 또는 무재료 쏠림 가능성</div>`;
      return `<div class="panel">
        <div class="fname"><span class="chip ${esc(x.mkt)}">${esc(x.mkt.toUpperCase())}</span>
          ${themes} ${heat}
          <span class="mono ${pctCls((x.chg || 0) / 100)}">${pct((x.chg || 0) / 100)}</span></div>
        <div class="mini" style="margin-top:3px">주도주 <b style="color:var(--ink)">${esc(x.stock)}</b>
          <span class="mono ${pctCls((x.schg || 0) / 100)}">${pct((x.schg || 0) / 100)}</span>
          ${x.share ? `· 테마 내 ${x.share}%` : ""}${(x.themes || []).length >= 3 ? ` · <span style="color:var(--warn)">⚠ 테마 ${x.themes.length}곳 자석</span>` : ""}</div>
        ${body}</div>`;
    }).join("") : "<div class='panel mini'>해설 가능한 테마 없음</div>";
  }

  /* 보유·후보 종목 상세 토글 */
  $("positions").addEventListener("click", (e) => {
    const r = e.target.closest("tr.xrow");
    if (r) r.classList.toggle("open");
  });
  $("cands").addEventListener("click", (e) => {
    const r = e.target.closest(".crow");
    if (r && !r.classList.contains("nodet")) r.classList.toggle("open");
  });

  /* ── 라우팅 ── */
  function setPage() {
    const p = (location.hash || "#home").slice(1);
    const valid = ["home", "flow", "news", "paper", "pulse"].includes(p) ? p : "home";
    document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("on", a.dataset.p === valid));
    document.querySelectorAll("main .page").forEach((s) => s.classList.toggle("on", s.id === "p-" + valid));
    if (valid === "paper") renderPaper();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", setPage);

  renderFlow("kr");
  renderNews();
  renderPulse("us");
  if (P.length) renderPaper();
  setPage();
})();
