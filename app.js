/* Stock Digger dashboard — data.js(window.DASH_DATA) 렌더러 */
(function () {
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
    const area = fill ? `<polygon points="2,${h - 2} ${pts} ${(w - 2)},${h - 2}" fill="currentColor" opacity="0.08"/>` : "";
    return `<svg class="spark ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${area}` +
      `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<circle cx="${px(vals.length - 1).toFixed(1)}" cy="${py(vals[vals.length - 1]).toFixed(1)}" r="2.6" fill="currentColor"/></svg>`;
  }

  /* ── 헤더 ── */
  const krDay = D.flow && D.flow.kr ? D.flow.kr.day : (D.kr ? D.kr.updated : "");
  const usDay = D.flow && D.flow.us ? D.flow.us.day : D.updated;
  $("upd").innerHTML = `KR ${esc(krDay)} · US ${esc(usDay)}<br><span class="mini">갱신 ${esc(D.generated || "")}</span>`;

  /* ── 홈: 트랙 카드 ── */
  const P = D.paper || [];
  $("home-sub").textContent = P.length ? `페이퍼 4트랙 · KR ${krDay} / US ${usDay} 종가 기준` : "데이터 준비 중";
  $("tracks").innerHTML = P.map((t) => {
    const [stTxt, stCls] = STATUS[t.status];
    const vals = t.series.slice(-45).map((r) => r[1]);
    return `<div class="card tcard" data-t="${t.id}">
      <div class="thead"><span class="chip ${t.mkt}">${t.mkt.toUpperCase()}</span>
        <span class="tname">${esc(t.label)}</span>
        <span class="chip ${stCls}" style="margin-left:auto">${stTxt}</span></div>
      <div class="eq num">${fmtEq(t.mkt, t.equity)}</div>
      <div class="drow num"><span class="${pctCls(t.day)}">전일 ${pct(t.day)}</span>
        <span class="${pctCls(t.cum)}">누적 ${pct(t.cum)}</span></div>
      <span class="${pctCls(t.cum)}" style="display:block">${spark(vals, 300, 44)}</span>
      <div class="meta"><span>보유 ${t.n_pos}종목</span><span>현금 ${Math.round(t.cash / t.equity * 100)}%</span><span>${esc(t.date)}</span></div>
    </div>`;
  }).join("");
  $("tracks").addEventListener("click", (e) => {
    const c = e.target.closest(".tcard");
    if (c) { selTrack = c.dataset.t; location.hash = "#paper"; }
  });

  /* ── 홈: 기준선 표 ── */
  $("basetab").innerHTML = `<tr><th>트랙</th><th>롤링 21일</th><th>재검토</th><th>중단검토</th><th></th></tr>` +
    P.map((t) => {
      const [stTxt, stCls] = STATUS[t.status];
      return `<tr><td>${esc(t.label)}</td>
        <td class="num" style="font-weight:700"><span class="${pctCls(t.roll)}">${pct(t.roll, 2)}</span>${t.roll_full ? "" : " <span class='mini'>(누적)</span>"}</td>
        <td class="num mini">${pct(t.warn)}</td><td class="num mini">${pct(t.halt)}</td>
        <td style="text-align:right"><span class="chip ${stCls}">${stTxt}</span></td></tr>`;
    }).join("");

  /* ── 머니플로우 공통 ── */
  const F = D.flow;
  const drvMap = {};
  (F && F.drivers || []).forEach((d) => { drvMap[d.theme] = d.drivers; });

  function flowCard(r, i, mkt) {
    const hot = r.heat != null && r.heat >= 1;
    const heat = r.heat == null ? "—" : r.heat.toFixed(1) + "×";
    const drv = mkt === "kr" ? drvMap[r.name] : null;
    let drvHtml = "";
    if (drv && drv.length) {
      drvHtml = `<div class="fdrv">` + drv.map((v) => {
        const hd = v.head_date ? ` <span class="mini">(${v.head_date.slice(4, 6)}/${v.head_date.slice(6, 8)})</span>` : "";
        return `<span class="dname">${esc(v.name)}</span> <span class="num ${pctCls(v.chg / 100)}">${pct(v.chg / 100)}</span>
          <span class="mini">테마 내 ${v.share}%</span>${v.head ? `<span class="dhead">“${esc(v.head)}”${hd}</span>` : ""}`;
      }).join(`<div style="height:6px"></div>`) + `</div>`;
    } else if (mkt === "us" && r.top) {
      const tks = r.top.split(";").map((s) => s.split(".")[0]).slice(0, 3).join(" · ");
      drvHtml = `<div class="fdrv"><span class="mini">주요 종목</span> <span class="dname">${esc(tks)}</span></div>`;
    }
    return `<div class="card fcard">
      <div class="fname"><span class="mini num">${i + 1}</span> ${esc(r.name)}
        <span class="heat ${hot ? "" : "cool"}">${heat}</span>
        <span class="num ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span></div>
      <div class="fspark ${pctCls(r.chg / 100)}">${spark(r.spark, 96, 34)}</div>
      <div class="fstats num"><span>거래대금 <b>${fmtVal(mkt, r.value)}</b></span>
        <span>점유 ${r.share}%</span><span class="pos">▲${r.rise}</span><span class="neg">▼${r.fall}</span></div>
      ${drvHtml}</div>`;
  }

  function renderFlow(mkt) {
    if (!F) { $("flowin").innerHTML = "<div class='card mini'>데이터 준비 중</div>"; return; }
    const side = F[mkt];
    $("flowin").innerHTML = side.in.map((r, i) => flowCard(r, i, mkt)).join("");
    $("flowout").innerHTML = side.out.length ? side.out.map((r) =>
      `<div class="outrow"><span class="fname">${esc(r.name)}</span>
        <span class="heat cool">${r.heat == null ? "—" : r.heat.toFixed(1) + "×"}</span>
        <span class="num ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span>
        <span class="mini num" style="width:64px;text-align:right">${fmtVal(mkt, r.value)}</span></div>`
    ).join("") : "<span class='mini'>해당 없음</span>";
    /* 수급 자석: 한 종목이 상위 테마 3곳+ 주도주 */
    let mg = "";
    if (mkt === "kr") {
      const cnt = {};
      side.in.forEach((r) => (drvMap[r.name] || []).forEach((v) => {
        (cnt[v.name] = cnt[v.name] || []).push(r.name);
      }));
      const hits = Object.entries(cnt).filter(([, th]) => th.length >= 3)
        .sort((a, b) => b[1].length - a[1].length).slice(0, 2);
      mg = hits.map(([nm, th]) =>
        `<div class="callout">🧲 수급 자석 — <b>${esc(nm)}</b>이(가) 상위 테마 ${th.length}곳의 주도주입니다.
         테마 수급이 아니라 종목 개별 이슈가 여러 테마 수치를 끌어올렸을 가능성이 큽니다.</div>`).join("");
    }
    $("magnet").innerHTML = mg;
  }
  document.querySelectorAll("#flowseg button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#flowseg button").forEach((x) => x.classList.toggle("on", x === b));
    renderFlow(b.dataset.m);
  }));

  /* ── 홈: 하이라이트 + 최근 체결 ── */
  if (F) {
    $("hl-sub").textContent = `KR ${F.kr.day} 쏠림 상위 — 전체는 머니플로우 탭`;
    $("highlights").innerHTML = F.kr.in.slice(0, 3).map((r, i) => flowCard(r, i, "kr")).join("");
  }
  const allJr = P.flatMap((t) => t.journal.map((j) => ({ ...j, label: t.label, mkt: t.mkt })))
    .sort((a, b) => (a.xd < b.xd ? 1 : -1)).slice(0, 6);
  $("recent").innerHTML = allJr.length ? allJr.map((j) =>
    `<div class="jrow"><span class="chip ${j.mkt}">${esc(j.label)}</span>
      <span class="nm">${esc(j.n)}</span>
      <span class="num ${pctCls(j.ret)}" style="font-weight:700">${pct(j.ret)}</span>
      <span class="why ${esc(j.why)}">${esc(j.why)}</span>
      <span class="mini num">${mdDate(j.xd)}</span></div>`).join("")
    : "<span class='mini'>최근 체결 없음</span>";

  /* ── 페이퍼트레이딩 ── */
  let selTrack = P.length ? P[0].id : null;
  $("tchips").innerHTML = P.map((t) =>
    `<button data-t="${t.id}" class="${t.id === selTrack ? "on" : ""}">${esc(t.label)}</button>`).join("");
  document.querySelectorAll("#tchips button").forEach((b) => b.addEventListener("click", () => {
    selTrack = b.dataset.t; renderPaper();
  }));

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
      [fmtEq(t.mkt, t.equity), "평가액"],
      [`<span class="${pctCls(t.cum)}">${pct(t.cum)}</span>`, "누적"],
      [`<span class="${pctCls(t.roll)}">${pct(t.roll)}</span> <span class="chip ${stCls}">${stTxt}</span>`, "롤링 21일"],
      [`<span class="neg">${pct(maxDD(vals))}</span>`, "MDD"],
      [`${t.n_pos}종목 · ${Math.round(t.cash / t.equity * 100)}%`, "보유 · 현금"],
    ].map(([b, s]) => `<div class="stat"><b class="num">${b}</b><span>${s}</span></div>`).join("");
    drawEq(t);
    const pos = t.pos.slice().sort((a, b) => (b.ret || 0) - (a.ret || 0));
    $("positions").innerHTML = pos.length ? `<table class="list">
      <tr><th>종목</th><th>진입일</th><th>보유일</th><th>진입가</th><th>현재가</th><th>수익률</th></tr>` +
      pos.map((p) => `<tr><td class="nm">${esc(p.n)} <span class="mini">${esc(p.t)}</span></td>
        <td class="num">${mdDate(p.ed)}</td><td class="num">${p.bars}</td>
        <td class="num">${fmtPx(t.mkt, p.ep)}</td><td class="num">${fmtPx(t.mkt, p.px)}</td>
        <td class="num ${pctCls(p.ret || 0)}" style="font-weight:700">${p.ret == null ? "—" : pct(p.ret)}</td></tr>`).join("") + "</table>"
      : "<span class='mini'>보유 종목 없음 (현금 100%)</span>";
    const jr = t.journal.slice().reverse();
    $("journal").innerHTML = jr.length ? `<table class="list">
      <tr><th>종목</th><th>진입</th><th>청산</th><th>수익률</th><th>사유</th></tr>` +
      jr.map((j) => `<tr><td class="nm">${esc(j.n)} <span class="mini">${esc(j.t)}</span></td>
        <td class="num">${mdDate(j.ed)}</td><td class="num">${mdDate(j.xd)}</td>
        <td class="num ${pctCls(j.ret)}" style="font-weight:700">${pct(j.ret)}</td>
        <td><span class="why ${esc(j.why)}">${esc(j.why)}</span></td></tr>`).join("") + "</table>"
      : "<span class='mini'>아직 체결 없음</span>";
  }

  /* 메인 equity 차트 + 호버 툴팁 */
  function drawEq(t) {
    const svg = $("eqchart"), W = 680, H = 240, L = 10, R = 10, T = 16, B = 26;
    const s = t.series, vals = s.map((r) => r[1]);
    const mn = Math.min(...vals, t.start), mx = Math.max(...vals, t.start), sp = mx - mn || 1;
    const px = (i) => L + (i / (s.length - 1)) * (W - L - R);
    const py = (v) => T + (1 - (v - mn) / sp) * (H - T - B);
    const pts = vals.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
    const up = t.cum >= 0;
    const col = up ? "var(--up)" : "var(--dn)";
    svg.innerHTML =
      `<polygon points="${L},${H - B} ${pts} ${W - R},${H - B}" fill="${col}" opacity="0.07"/>
       <line x1="${L}" y1="${py(t.start)}" x2="${W - R}" y2="${py(t.start)}" stroke="var(--mut)" stroke-dasharray="4 4" stroke-width="1"/>
       <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>
       <line id="xh" x1="0" y1="${T}" x2="0" y2="${H - B}" stroke="var(--mut)" stroke-width="1" opacity="0"/>
       <circle id="xd" r="3.5" fill="${col}" opacity="0"/>
       <text x="${L}" y="${H - 8}" font-size="11" fill="var(--mut)">${s[0][0]}</text>
       <text x="${W - R}" y="${H - 8}" font-size="11" fill="var(--mut)" text-anchor="end">${s[s.length - 1][0]}</text>
       <text x="${W - R}" y="${py(t.start) - 5}" font-size="11" fill="var(--mut)" text-anchor="end">시작 ${fmtEq(t.mkt, t.start)}</text>`;
    const tt = $("tt");
    svg.onpointermove = (e) => {
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W;
      const i = Math.max(0, Math.min(s.length - 1, Math.round((x - L) / (W - L - R) * (s.length - 1))));
      const xh = svg.querySelector("#xh"), xd = svg.querySelector("#xd");
      xh.setAttribute("x1", px(i)); xh.setAttribute("x2", px(i)); xh.setAttribute("opacity", "0.5");
      xd.setAttribute("cx", px(i)); xd.setAttribute("cy", py(vals[i])); xd.setAttribute("opacity", "1");
      tt.style.display = "block";
      tt.style.left = (px(i) / W * r.width) + "px";
      tt.style.top = (py(vals[i]) / H * r.height) + "px";
      tt.innerHTML = `${s[i][0]} · <b>${fmtEq(t.mkt, vals[i])}</b>`;
    };
    svg.onpointerleave = () => {
      tt.style.display = "none";
      svg.querySelector("#xh").setAttribute("opacity", "0");
      svg.querySelector("#xd").setAttribute("opacity", "0");
    };
  }

  /* ── 펄스 (언급 집계) ── */
  function pulseRows(rows, mkt) {
    return rows.slice(0, 25).map((r) => {
      const chg = r.chg == null ? "" : `<span class="num ${pctCls(r.chg / 100)}">${pct(r.chg / 100)}</span>`;
      return `<div class="prow">${r.star ? '<span class="star">★</span>' : ""}
        <span class="nm">${esc(r.n)} <span class="tk">${esc(r.t)}</span></span>
        <span class="${pctCls(1)}" style="width:52px">${spark(r.hist, 52, 20, { fill: false })}</span>
        ${chg}<span class="chip ${mkt}" title="언급 점수">${r.s}</span>
        <span class="mini num" style="width:34px;text-align:right">${r.streak}일째</span></div>`;
    }).join("");
  }
  function pulseLead(lead) {
    if (!lead || !lead.rows.length) return "";
    const note = lead.avg_talk != null
      ? `<div class="note">첫 등재 후 평균 수익률 — 언급 종목 ${lead.avg_talk > 0 ? "+" : ""}${lead.avg_talk}% (${lead.n_talk}개)` +
        (lead.avg_zero != null ? ` vs 무언급 ${lead.avg_zero > 0 ? "+" : ""}${lead.avg_zero}% (${lead.n_zero}개)` : "") + `</div>` : "";
    return `<h2 style="font-size:17px">누적 리더보드</h2>${note}<div class="card">` +
      lead.rows.slice(0, 15).map((r) =>
        `<div class="prow"><span class="nm">${esc(r.n)} <span class="tk">${esc(r.t)}</span></span>
          <span class="mini num">${r.days}일</span><span class="chip us">${r.cum}</span>
          <span class="num ${r.ret == null ? "flat" : pctCls(r.ret)}" style="width:62px;text-align:right">${r.ret == null ? "—" : (r.ret > 0 ? "+" : "") + r.ret + "%"}</span></div>`).join("") + "</div>";
  }
  function renderPulse(mkt) {
    const body = $("pulsebody");
    if (mkt === "us") {
      $("pulse-sub").textContent = `미국 — 전략 통과 종목의 소셜 언급 집계 (마지막 수집 ${D.updated}, 수집 일시중지 중)`;
      body.innerHTML = `<div class="card">${pulseRows(D.today || [], "us")}</div>` + pulseLead(D.lead);
    } else {
      const K = D.kr || {};
      $("pulse-sub").textContent = `한국 — 뉴스·커뮤니티 언급 집계 (${K.updated || "—"})`;
      body.innerHTML = `<div class="card">${pulseRows(K.today || [], "kr")}</div>` + pulseLead(K.lead);
    }
  }
  document.querySelectorAll("#pulseseg button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#pulseseg button").forEach((x) => x.classList.toggle("on", x === b));
    renderPulse(b.dataset.m);
  }));

  /* ── 라우팅 ── */
  function setPage() {
    const p = (location.hash || "#home").slice(1);
    const valid = ["home", "flow", "paper", "pulse"].includes(p) ? p : "home";
    document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("on", a.dataset.p === valid));
    document.querySelectorAll("main .page").forEach((s) => s.classList.toggle("on", s.id === "p-" + valid));
    if (valid === "paper") renderPaper();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", setPage);

  renderFlow("kr");
  renderPulse("us");
  if (P.length) renderPaper();
  setPage();
})();
