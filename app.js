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

  /* ── SKETCH: 손그림 패턴 검색 ── */
  const SK = { pts: [], bcache: {}, loading: false };
  const N32 = 32;
  const TF_MAX = { d: 250, w: 130, m: 72 };
  const TF_DEF = { d: 60, w: 60, m: 48 };
  const SK_MIN = 0.70; // 결합 유사도 컷

  function skSel(id) {
    const b = document.querySelector("#" + id + " button.on");
    return b ? b.dataset.v : null;
  }

  function skInit() {
    const cv = $("skcv");
    if (!cv || cv._init) return;
    cv._init = true;
    const ctx = cv.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = "rgba(138,148,166,.13)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= cv.width; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); ctx.stroke(); }
      for (let y = 0; y <= cv.height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke(); }
      if (SK.pts.length > 1) {
        ctx.strokeStyle = css.getPropertyValue("--amb").trim() || "#ffa028";
        ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath();
        SK.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.stroke();
      }
    };
    let down = false;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
    };
    cv.addEventListener("pointerdown", (e) => {
      down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      SK.pts = [pos(e)]; draw(); e.preventDefault();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!down) return;
      const p = pos(e);
      if (!SK.pts.length || p[0] > SK.pts[SK.pts.length - 1][0]) { SK.pts.push(p); draw(); }
    });
    cv.addEventListener("pointerup", () => { down = false; });
    draw();
    $("sk-clear").onclick = () => { SK.pts = []; draw(); $("sk-res").innerHTML = ""; };
    $("sk-run").onclick = skRun;
    ["sk-tf", "sk-mkt"].forEach((id) =>
      document.querySelectorAll("#" + id + " button").forEach((b) => b.onclick = () => {
        document.querySelectorAll("#" + id + " button").forEach((x) => x.classList.toggle("on", x === b));
        if (id === "sk-tf") {
          const tf = b.dataset.v;
          $("sk-n").value = TF_DEF[tf];
          $("sk-n").max = TF_MAX[tf];
        }
        if (SK.pts.length > 4) skRun();
      }));
    $("sk-n").addEventListener("change", () => { if (SK.pts.length > 4) skRun(); });
    $("sk-res").addEventListener("click", (e) => {
      if (e.target.closest("a")) return; // 외부 링크는 통과
      const tb = e.target.closest(".skimgtabs button");
      if (tb) {  // KR 차트 기간 전환
        const box = tb.closest(".skifr");
        box.querySelectorAll(".skimgtabs button").forEach((x) => x.classList.toggle("on", x === tb));
        box.querySelector(".skimg").src =
          `https://ssl.pstatic.net/imgfinance/chart/item/${tb.dataset.c}/${box.dataset.tk}.png?t=${Date.now()}`;
        return;
      }
      const row = e.target.closest(".skrow");
      if (!row) return;
      const det = row.nextElementSibling;
      const wasOpen = det && det.classList.contains("on");
      document.querySelectorAll("#sk-res .skdet.on").forEach((d) => d.classList.remove("on"));
      document.querySelectorAll("#sk-res .skrow.open").forEach((d) => d.classList.remove("open"));
      if (!det || wasOpen) return;
      row.classList.add("open");
      det.classList.add("on");
      const box = det.querySelector(".skifr");
      if (box && !box.firstChild) {
        if (row.dataset.kr) {  // KR: 네이버 차트 이미지 (KRX는 TradingView 위젯 미제공)
          const tk = row.dataset.kr;
          const init = { D: "candle/day", W: "candle/week", M: "candle/month" }[row.dataset.iv] || "candle/day";
          box.dataset.tk = tk;
          box.innerHTML = `<div class="skimgtabs">
            ${[["area/day", "당일"], ["candle/day", "일봉"], ["candle/week", "주봉"], ["candle/month", "월봉"]]
              .map(([c, l]) => `<button data-c="${c}" class="${c === init ? "on" : ""}">${l}</button>`).join("")}
          </div>
          <img class="skimg" alt="차트" src="https://ssl.pstatic.net/imgfinance/chart/item/${init}/${tk}.png?t=${Date.now()}">`;
        } else {  // US: TradingView 임베드 (15분 지연)
          const f = document.createElement("iframe");
          f.src = "https://s.tradingview.com/widgetembed/?symbol=" + encodeURIComponent(row.dataset.sym)
            + "&interval=" + row.dataset.iv
            + "&theme=dark&style=1&locale=kr&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&withdateranges=1";
          f.loading = "lazy";
          box.appendChild(f);
        }
      } else if (box && box.dataset.tk) {  // KR 재오픈: 최신 이미지로 갱신
        const on = box.querySelector(".skimgtabs button.on");
        if (on) box.querySelector(".skimg").src =
          `https://ssl.pstatic.net/imgfinance/chart/item/${on.dataset.c}/${box.dataset.tk}.png?t=${Date.now()}`;
      }
      det.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function skBars(tf) {
    const inp = $("sk-n");
    let n = Math.round(+inp.value) || TF_DEF[tf];
    n = Math.max(16, Math.min(TF_MAX[tf], n));
    if (String(n) !== inp.value) inp.value = n;
    return n;
  }

  function skLoad(cb) {
    if (window.SKETCH_DATA) { cb(); return; }
    if (SK.loading) return;
    SK.loading = true;
    $("sk-hint").textContent = "종목 데이터 로딩 중… (~1.7MB, 최초 1회)";
    const sc = document.createElement("script");
    sc.src = "sketch.js?f2v=" + (D.generated || "").replace(/\D/g, "");
    sc.onload = () => {
      if (!window.SKETCH_DATA || window.SKETCH_DATA.v !== 2) { // 구버전 데이터 가드
        window.SKETCH_DATA = null; SK.loading = false;
        $("sk-hint").textContent = "서버 데이터 갱신 대기 중 — 잠시 후 새로고침 해주세요";
        return;
      }
      $("sk-hint").textContent = "준비 완료 — SCAN을 누르세요"; cb();
    };
    sc.onerror = () => { $("sk-hint").textContent = "데이터 로드 실패 — 새로고침 해보세요"; SK.loading = false; };
    document.body.appendChild(sc);
  }

  function skTarget() {
    const cv = $("skcv");
    if (SK.pts.length < 5) return null;
    const x0 = SK.pts[0][0], x1 = SK.pts[SK.pts.length - 1][0];
    if (x1 - x0 < 40) return null;
    const ys = new Array(N32).fill(null);
    for (const [x, y] of SK.pts) {
      const i = Math.min(N32 - 1, Math.max(0, Math.round((x - x0) / (x1 - x0) * (N32 - 1))));
      ys[i] = ys[i] == null ? y : (ys[i] + y) / 2;
    }
    for (let i = 0; i < N32; i++) if (ys[i] == null) {  // 빈 칸은 선형 보간
      let a = i - 1; while (a >= 0 && ys[a] == null) a--;
      let b = i + 1; while (b < N32 && ys[b] == null) b++;
      ys[i] = a < 0 ? ys[b] : b >= N32 ? ys[a] : ys[a] + (ys[b] - ys[a]) * (i - a) / (b - a);
    }
    const v = ys.map((y) => cv.height - y);  // 캔버스 y축 반전
    return skSmooth(v);  // 손떨림 완화 (이동평균 3)
  }

  function skZ(v) {
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    let sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    if (sd < 1e-9) return null;
    return v.map((x) => (x - mean) / sd);
  }

  function skSmooth(v) {
    const o = v.slice();
    for (let i = 1; i < v.length - 1; i++) o[i] = (v[i - 1] + v[i] + v[i + 1]) / 3;
    return o;
  }

  function skDz(v) {  // 1차 차분(기울기)의 z-score — 꺾이는 타이밍 비교용
    const d = new Array(v.length - 1);
    for (let i = 1; i < v.length; i++) d[i - 1] = v[i] - v[i - 1];
    return skZ(d);
  }

  function skSer(s) {  // base36 문자열 → 숫자 배열
    const v = new Array(s.length);
    for (let i = 0; i < s.length; i++) v[i] = parseInt(s[i], 36);
    return v;
  }

  function skR32(v) {  // 임의 길이 → 32포인트 선형 재샘플
    const n = v.length, out = new Array(N32);
    for (let j = 0; j < N32; j++) {
      const x = j * (n - 1) / (N32 - 1), a = Math.floor(x), f = x - a;
      out[j] = f ? v[a] * (1 - f) + v[a + 1] * f : v[a];
    }
    return out;
  }

  function skBank(mkt, tf, nb) {
    const key = mkt + tf + nb;
    if (SK.bcache[key]) return SK.bcache[key];
    const S = window.SKETCH_DATA[mkt];
    const bank = [];
    for (let i = 0; i < S.t.length; i++) {
      const s = S[tf][i];
      if (!s || s.length < nb) { bank.push(null); continue; }
      const v32 = skSmooth(skR32(skSer(s.slice(-nb))));  // 스케치와 동일 스무딩 — 비대칭 제거
      bank.push([skZ(v32), skDz(v32)]);
    }
    SK.bcache[key] = bank;
    return bank;
  }

  function skRun() {
    if (SK.pts.length < 5) { $("sk-hint").textContent = "먼저 모양을 그려주세요"; return; }
    if (!window.SKETCH_DATA) { skLoad(skRun); return; }
    const t32 = skTarget();
    if (!t32) { $("sk-hint").textContent = "선이 너무 짧습니다 — 더 길게 그려주세요"; return; }
    const tz = skZ(t32), tdz = skDz(t32);
    if (!tz || !tdz) { $("sk-hint").textContent = "선이 너무 평평합니다 — 모양을 그려주세요"; return; }
    const tf = skSel("sk-tf"), mk = skSel("sk-mkt"), nb = skBars(tf);
    const mkts = mk === "all" ? ["kr", "us"] : [mk];
    const hits = [];
    let scanned = 0;
    for (const m of mkts) {
      const bank = skBank(m, tf, nb);
      for (let i = 0; i < bank.length; i++) {
        const e = bank[i];
        if (!e || !e[0] || !e[1]) continue;
        scanned++;
        let r1 = 0, r2 = 0;
        for (let j = 0; j < N32; j++) r1 += tz[j] * e[0][j];
        for (let j = 0; j < N32 - 1; j++) r2 += tdz[j] * e[1][j];
        // 결합 유사도: 형태 상관 75% + 기울기(꺾임 타이밍) 상관 25%
        hits.push([0.75 * r1 / N32 + 0.25 * r2 / (N32 - 1), m, i]);
      }
    }
    hits.sort((a, b) => b[0] - a[0]);
    const pass = hits.filter((h) => h[0] >= SK_MIN);
    const tfName = { d: "일봉", w: "주봉", m: "월봉" }[tf];
    const show = pass.length ? pass.slice(0, 30) : hits.slice(0, 5);
    $("sk-hint").textContent = pass.length
      ? `${comma(scanned)}종목 중 ${pass.length}종목 일치 (${tfName} ${nb}봉 · 유사도 ≥ ${SK_MIN * 100}%)`
      : `${comma(scanned)}종목 중 유사도 ${SK_MIN * 100}% 이상 없음 — 가장 가까운 5종목만 표시 (${tfName} ${nb}봉)`;
    const tgtMinMax = skMinMax(t32);
    const iv = { d: "D", w: "W", m: "M" }[tf];
    $("sk-res").innerHTML = show.map(([r, m, i], rank) => {
      const S = window.SKETCH_DATA[m];
      const ser = skSer(S[tf][i].slice(-nb));
      const url = m === "kr"
        ? `https://m.stock.naver.com/domestic/stock/${S.t[i]}/total`
        : `https://finance.yahoo.com/quote/${S.t[i]}`;
      const sym = m === "kr" ? "" : S.t[i].replace(/-/g, ".");
      return `<div class="skrow" data-sym="${esc(sym)}" data-kr="${m === "kr" ? esc(S.t[i]) : ""}" data-iv="${iv}">
        <span class="rank">${String(rank + 1).padStart(2, "0")}</span>
        <span class="nm"><span class="chip ${m}">${m.toUpperCase()}</span> ${esc(S.n[i])} <span class="tk">${esc(S.t[i])}</span></span>
        <span class="sim">${(r * 100).toFixed(1)}%</span>
        <span class="meta num">${fmtPx(m, S.px[i])} <span class="${pctCls(S.chg[i] / 100)}">${pct(S.chg[i] / 100)}</span></span>
        <span class="ov">${skOverlay(tgtMinMax, ser, S.chg[i])}</span></div>
      <div class="skdet"><div class="sklink"><a href="${url}" target="_blank" rel="noopener">${m === "kr" ? "네이버 증권" : "Yahoo Finance"} ↗</a></div><div class="skifr"></div></div>`;
    }).join("") || "<div class='panel mini'>결과 없음 — 봉 수를 줄이거나 다른 시장을 선택해 보세요</div>";
  }

  function skMinMax(z) {
    const mn = Math.min(...z), mx = Math.max(...z), sp = mx - mn || 1;
    return z.map((v) => (v - mn) / sp * 99);
  }

  function skOverlay(tgt, vec, chg) {
    const W = 130, H = 40;
    const pt = (arr) => arr.map((v, i) =>
      `${(i / (arr.length - 1) * (W - 4) + 2).toFixed(1)},${(H - 3 - v / 99 * (H - 6)).toFixed(1)}`).join(" ");
    const col = chg >= 0 ? "var(--up)" : "var(--dn)";
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline points="${pt(tgt)}" fill="none" stroke="var(--amb)" stroke-width="1.5" stroke-dasharray="3 3" opacity=".8"/>
      <polyline points="${pt(skMinMax(vec))}" fill="none" stroke="${col}" stroke-width="1.8"/></svg>`;
  }

  /* ── DEALS: backroom-api Worker 연동 (티저 + 구독 + 검색) — 풀판 주소는 비공개 유지 ── */
  const DAPI = "https://backroom-api.junlight-lee.workers.dev";
  const DTAG = { review: ["예비심사", ""], uw: ["주관계약", "t2"], fund: ["펀드만기", "t3"] };
  const DL = { token: null, email: null, page: 1, pages: 1, init: false };
  try {
    const s = JSON.parse(localStorage.getItem("mb_dsub") || "null");
    if (s && s.exp > Date.now()) { DL.token = s.token; DL.email = s.email; }
  } catch (e) {}

  async function dApi(path, opts) {
    const o = opts || {};
    const h = { "Content-Type": "application/json" };
    if (o.auth && DL.token) h["Authorization"] = "Bearer " + DL.token;
    try {
      const res = await fetch(DAPI + path, {
        method: o.body ? "POST" : "GET", headers: h,
        body: o.body ? JSON.stringify(o.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) { return { ok: false, status: 0, data: {} }; }
  }

  function dRow(r) {
    const [label, cls] = DTAG[r.type] || [r.type, ""];
    return `<div class="drow"><span class="dtag ${cls}">${esc(label)}</span>
      <span class="dnm">${esc(r.name || "")}</span>
      <span class="dmeta">${esc(r.date || "")}${r.extra ? " · " + esc(r.extra) : ""}</span></div>`;
  }

  function dGate(sub) {  // sub=구독자: 잠금·구독유도·티저 숨기고 전체 리스트 모드
    ["dlock", "dcta", "dl-rows"].forEach((id) => { const el = $(id); if (el) el.style.display = sub ? "none" : ""; });
    const h = document.querySelector("#p-deals .dlhead");
    if (h) h.style.display = sub ? "none" : "";
  }

  function dealsInit() {
    if (DL.init) return;
    DL.init = true;
    // 블러 더미 (실데이터 아님 — 소스 노출 방지)
    const dummy = [["review", "██████████", "2026-11-··"], ["uw", "████████", "2026-11-··"],
      ["fund", "██████████████", "만기 D-··"], ["review", "████████████", "2026-10-··"],
      ["uw", "██████", "2026-10-··"], ["fund", "████████", "만기 D-··"]];
    $("dlock").innerHTML = dummy.map(([t, n, d]) => dRow({ type: t, name: n, date: d })).join("")
      + `<div class="lockov">▮ LOCKED // SUBSCRIBERS ONLY<span class="mini">전체 리스트 · 검색 · Exit 신호는 구독 계정으로 열립니다</span></div>`;
    // 구독 신청 (waitlist)
    $("wl-btn").onclick = async () => {
      const em = $("wl-email").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { $("wl-msg").textContent = "이메일 형식을 확인해주세요"; return; }
      $("wl-btn").disabled = true;
      const r = await dApi("/api/public/waitlist", { body: { email: em } });
      $("wl-btn").disabled = false;
      $("wl-msg").textContent = r.ok ? "신청 완료 — 검토 후 이메일로 안내드립니다"
        : r.status === 429 ? "요청이 너무 잦습니다 — 잠시 후 다시 시도해주세요"
        : "접수 실패 — 잠시 후 다시 시도해주세요";
      if (r.ok) $("wl-email").value = "";
    };
    $("d-login").onclick = (e) => { e.preventDefault(); renderAuth(true); };
    renderAuth(false);
    loadTeaser();
  }

  async function loadTeaser() {
    const r = await dApi("/api/public/teaser");
    if (r.ok && Array.isArray(r.data.rows) && r.data.rows.length) {
      $("dl-rows").innerHTML = r.data.rows.map(dRow).join("");
      $("dl-asof").textContent = r.data.asof ? "as of " + r.data.asof : "";
    } else {
      $("dl-rows").innerHTML = "<div class='mini' style='padding:10px'>라이브 샘플 준비 중 — 백엔드 연결 대기</div>";
    }
  }

  function renderAuth(showLogin) {
    const box = $("dsearch");
    if (DL.token) { renderSearch(); return; }
    box.innerHTML = showLogin ? `<div class="dlog">
      <div class="dlt">// SUBSCRIBER LOGIN</div>
      <div class="row"><input id="dg-em" type="email" placeholder="등록 이메일" autocomplete="email">
      <button id="dg-req">인증코드 받기</button></div>
      <div class="row" id="dg-step2" style="display:none;margin-top:8px">
      <input id="dg-code" inputmode="numeric" placeholder="인증코드 6자리">
      <button id="dg-ok">확인</button></div>
      <div class="mini" id="dg-msg"></div></div>` : "";
    if (!showLogin) return;
    $("dg-req").onclick = async () => {
      const em = $("dg-em").value.trim();
      if (!em) return;
      $("dg-req").disabled = true;
      const r = await dApi("/api/auth/request", { body: { email: em } });
      $("dg-req").disabled = false;
      if (r.ok) { $("dg-step2").style.display = ""; $("dg-msg").textContent = "등록된 이메일이면 인증코드가 발송됩니다"; }
      else $("dg-msg").textContent = r.status === 429 ? "요청이 너무 잦습니다" : "요청 실패 — 잠시 후 다시";
    };
    $("dg-ok").onclick = async () => {
      const em = $("dg-em").value.trim(), code = $("dg-code").value.trim();
      const r = await dApi("/api/auth/verify", { body: { email: em, code } });
      if (r.ok && r.data.token) {
        DL.token = r.data.token; DL.email = em;
        try { localStorage.setItem("mb_dsub", JSON.stringify({ token: r.data.token, email: em, exp: r.data.exp || Date.now() + 864e5 })); } catch (e) {}
        renderSearch();
      } else $("dg-msg").textContent = "인증 실패 — 코드를 확인해주세요";
    };
  }

  function dLogout() {
    DL.token = null; DL.email = null;
    try { localStorage.removeItem("mb_dsub"); } catch (e) {}
    $("dsearch").innerHTML = "";
    dGate(false);  // 잠금·티저 복원
  }

  function renderSearch() {
    dGate(true);  // 구독자: 잠금·구독유도 제거, 전체 리스트 모드
    $("dsearch").innerHTML = `<div class="dlog">
      <div class="dwho"><span>// FULL ACCESS — ${esc(DL.email || "")}</span><a href="#deals" id="dg-out">로그아웃</a></div>
      <div class="dsbar"><input id="ds-q" placeholder="회사명 · 키워드 검색">
      <select id="ds-t"><option value="all">전체</option><option value="review">예비심사</option>
      <option value="uw">주관계약</option><option value="fund">펀드만기</option></select>
      <button id="ds-go">SEARCH ▸</button>
      <button id="ds-full" title="탭·재무필터·CSV를 갖춘 전체 스크리너">풀 스크리너 열기 ▸</button>
      <span class="mini" id="ds-full-msg"></span></div>
      <div id="ds-res"></div>
      <div class="dpg" id="ds-pg" style="display:none">
      <button id="ds-prev">‹ 이전</button><span id="ds-info"></span><button id="ds-next">다음 ›</button></div></div>`;
    $("dg-out").onclick = (e) => { e.preventDefault(); dLogout(); };
    const go = (p) => dSearch(p);
    $("ds-go").onclick = () => go(1);
    $("ds-q").addEventListener("keydown", (e) => { if (e.key === "Enter") go(1); });
    $("ds-prev").onclick = () => { if (DL.page > 1) go(DL.page - 1); };
    $("ds-next").onclick = () => { if (DL.page < DL.pages) go(DL.page + 1); };
    $("ds-full").onclick = async () => {
      const b = $("ds-full"), msg = $("ds-full-msg");
      b.disabled = true; msg.textContent = "";
      try {
        // SSO: 토큰 → 세션 쿠키 발급 후 풀 스크리너 새 탭 (토큰을 URL에 싣지 않기 위함)
        const res = await fetch(DAPI + "/api/sub/sso", {
          method: "POST", credentials: "include",
          headers: { "Authorization": "Bearer " + DL.token },
        });
        if (res.ok) window.open(DAPI + "/screener/", "_blank", "noopener");
        else if (res.status === 401) { dLogout(); renderAuth(true); $("dg-msg").textContent = "세션이 만료됐습니다 — 다시 로그인해주세요"; return; }
        else msg.textContent = res.status === 404 ? "풀 스크리너 준비 중" : "연결 실패 — 잠시 후 다시";
      } catch (e) { msg.textContent = "연결 실패 — 잠시 후 다시"; }
      b.disabled = false;
    };
    dSearch(1);  // 로그인 즉시 전체 리스트 로드 (빈 검색어 = 전체)
  }

  async function dSearch(page) {
    const q = $("ds-q").value.trim(), t = $("ds-t").value;
    $("ds-res").innerHTML = "<div class='mini' style='padding:8px'>검색 중…</div>";
    const r = await dApi(`/api/sub/search?q=${encodeURIComponent(q)}&type=${t}&page=${page}`, { auth: true });
    if (r.status === 401) { dLogout(); renderAuth(true); $("dg-msg").textContent = "세션이 만료됐습니다 — 다시 로그인해주세요"; return; }
    if (r.status === 429) { $("ds-res").innerHTML = "<div class='mini' style='padding:8px'>요청이 너무 잦습니다 — 잠시 후 다시</div>"; return; }
    if (!r.ok) { $("ds-res").innerHTML = "<div class='mini' style='padding:8px'>검색 실패 — 잠시 후 다시 시도해주세요</div>"; return; }
    const rows = r.data.rows || [];
    DL.page = r.data.page || page; DL.pages = r.data.pages || 1;
    $("ds-res").innerHTML = rows.length
      ? `<div class="panel" style="padding:0">${rows.map(dRow).join("")}</div>`
      : "<div class='mini' style='padding:8px'>결과 없음</div>";
    const pg = $("ds-pg");
    pg.style.display = DL.pages > 1 ? "" : "none";
    $("ds-info").textContent = `${DL.page} / ${DL.pages} · 총 ${comma(r.data.total || rows.length)}건`;
  }

  /* ── 라우팅 ── */
  function setPage() {
    const p = (location.hash || "#home").slice(1);
    const valid = ["home", "flow", "news", "paper", "pulse", "sketch", "deals"].includes(p) ? p : "home";
    document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("on", a.dataset.p === valid));
    document.querySelectorAll("main .page").forEach((s) => s.classList.toggle("on", s.id === "p-" + valid));
    const tape = $("tape");
    if (tape) tape.style.display = valid === "paper" ? "" : "none";
    if (valid === "paper") renderPaper();
    if (valid === "sketch") { skInit(); skLoad(() => {}); }
    if (valid === "deals") dealsInit();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", setPage);

  renderFlow("kr");
  renderNews();
  renderPulse("us");
  if (P.length) renderPaper();
  setPage();
})();
