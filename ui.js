'use strict';
/* =========================================================
   HDG Architect & Plant Master — UI
   ========================================================= */
const U = { ptab: 'rfq', encQ: '', timer: null, lsel: null, placing: null, confirmReset: false };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const I = k => ENC[k] ? `<button class="ib" data-enc="${k}" title="Ansiklopedi: ${esc(ENC[k].tr)}" aria-label="Ansiklopedi: ${esc(ENC[k].tr)}">i</button>` : '';
const LV = { ok: 'OK', warn: 'UYARI', crit: 'KRİTİK', info: 'BİLGİ' };
const hh = h => { const H = Math.floor(h), M = Math.round((h - H) * 60); return String(H).padStart(2, '0') + ':' + String(M === 60 ? 59 : M).padStart(2, '0'); };

function toast(t, lvl = 'info') {
  const d = document.createElement('div'); d.className = 'toast ' + lvl; d.textContent = t;
  $('#toasts').appendChild(d); setTimeout(() => d.remove(), 4200);
}

/* ---------------- shell ---------------- */
function render() {
  renderChips(); renderTabs();
  const v = (S.simple ? { epc: sEPC, comm: sComm, prod: sProd, enc: viewEnc } : { epc: viewEPC, comm: viewComm, prod: viewProd, enc: viewEnc })[S.mode] || viewEPC;
  $('#view').innerHTML = v();
  animMount();
  renderHdr();
  tutUpdate();
  save();
}
function renderHdr() {
  $('#hdrb').innerHTML = `<div class="seg" role="group" aria-label="Oyun modu"><button class="btn sm ${S.simple ? 'primary' : ''}" data-act="hdr-mode" data-v="1">Kolay mod</button><button class="btn sm ${!S.simple ? 'primary' : ''}" data-act="hdr-mode" data-v="0">Uzman mod</button></div>${S.simple ? '' : `<button class="btn sm ${S.tut && S.tut.on ? 'primary' : ''}" data-act="hdr-tut" title="Eğitim rehberi">Rehber${S.tut && S.tut.on ? ' açık' : ''}</button>`}<button class="btn sm ghost" data-act="hdr-reset">${U.confirmReset ? 'Emin misiniz? Evet, sıfırla' : 'Yeni oyun'}</button>`;
}
function renderChips() {
  const c = [];
  const chip = (k, v, cls = '') => c.push(`<div class="chip ${cls}"><small>${k}</small><span>${v}</span></div>`);
  chip('Gün · saat', `${S.day} · ${hh(S.hour)}`);
  chip('Kasa', usd(S.epc.done ? S.money : CAP[S.epc.ch.capacity].budget), S.money < 0 ? 'bad' : '');
  chip('LME Zn', `$${S.market.lme.toLocaleString('tr-TR')}/t`);
  if (S.prod) {
    const k = S.prod.kettle;
    chip('Kazan', `${n(k.temp, 0)} °C`, 'hot');
    chip('Kazan Zn', `${n(k.zinc, 0)} t`, k.zinc < S.plant.kT * 0.9 ? 'bad' : '');
    chip('Kazan aşınma', `%${n(S.plant.kettleWear, 1)}`, S.plant.kettleWear > 80 ? 'bad' : '');
  } else if (S.comm && S.comm.method === 'A') {
    const bs = bulkState(S.comm.A); chip('Çinko', `${n(bs.T, 0)} °C`, 'hot');
  }
  chip('İtibar', n(S.rep, 0), S.rep < 40 ? 'bad' : '');
  $('#chips').innerHTML = c.join('');
}
function renderTabs() {
  const t = [['epc', '1', 'Tesis Kurulum & İnşaat (EPC)', true], ['comm', '2', 'Kazan Devreye Alma', S.epc.done], ['prod', '3', 'Günlük Üretim & Laboratuvar', !!S.prod], ['enc', '4', 'Teknik Ansiklopedi', true]];
  $('#tabs').innerHTML = t.map(([m, k, l, en]) => `<button class="tab" role="tab" data-mode="${m}" aria-selected="${S.mode === m}" ${en ? '' : 'disabled'}><span class="k">${k}</span>${l}</button>`).join('');
}

/* ---------------- isometric plant ---------------- */
const TPLC = {};
function isoItems() {
  const ch = S.plant ? S.plant.ch : S.epc.ch, lay = S.plant ? S.plant.layout : S.epc.layout;
  let items = layItems(ch, lay);
  if (!S.plant && items.some(i => !i.placed) && S.epc.step < 5) {
    const key = JSON.stringify([ch.capacity, ch.pickN, ch.oven, ch.neut, ch.fume, ch.spin, ch.acidRec]);
    TPLC[key] = TPLC[key] || autoLayout('I', ch);
    items = layItems(ch, TPLC[key]);
  }
  return items.filter(i => i.placed);
}
function isoSVG(o = {}) {
  const ch = S.plant ? S.plant.ch : S.epc.ch, built = o.built ?? 9, s = 5, cs = Math.cos(Math.PI / 6);
  const P = (x, y, z) => [(x - y) * cs * s, (x + y) * 0.5 * s - z * s];
  const items = isoItems();
  if (!items.length) return `<p class="small muted">Yerleşim planında ekipman yok.</p>`;
  const pts = []; const poly = (arr, cls, extra = '') => { arr.forEach(p => pts.push(p)); return `<polygon points="${arr.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="${cls}" ${extra}/>`; };
  const bx0 = Math.min(...items.map(i => i.x)) - 2, by0 = Math.min(...items.map(i => i.y)) - 2, bx1 = Math.max(...items.map(i => i.x + i.w)) + 2, by1 = Math.max(...items.map(i => i.y + i.d)) + 2;
  const H = ch.height;
  let svg = '';
  const cols = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]];
  svg += poly(cols.map(([a, b]) => P(a, b, 0)), built >= 2 ? 'slab' : 'g');
  if (built >= 2) {
    cols.forEach(([a, b]) => { const p0 = P(a, b, 0), p1 = P(a, b, H); pts.push(p1); svg += `<line x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}" class="frame"/>`; });
    svg += poly(cols.map(([a, b]) => P(a, b, H)), 'roof');
  } else svg += poly(cols.map(([a, b]) => P(a, b, H)), 'g');
  const sorted = items.slice().sort((a, b) => (LDEF[b.type].zone ? 1 : 0) - (LDEF[a.type].zone ? 1 : 0) || (a.x + a.w + a.y + a.d) - (b.x + b.w + b.y + b.d));
  sorted.forEach(it => {
    const L = LDEF[it.type], { x, y, w, d } = it, h = L.h, ok = built >= L.lvl;
    const top = [P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)];
    let g = '';
    if (!ok) g = poly(top, 'g');
    else if (L.zone) g = poly(top, '', `style="fill:${L.col};opacity:.55;stroke:var(--iso-edge);stroke-width:.5"`);
    else {
      g += poly([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)], 'l');
      g += poly([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)], 'r');
      g += poly(top, 't');
      if (L.liq) {
        let col = L.liq, lev = 0.86, glow = false;
        if (col === 'zinc') { col = '#b8c2c8'; lev = it.type === 'spin' ? 0.86 : (o.kettleLevel ?? 0.9); glow = it.type === 'kettle' && (o.hot ?? !!S.prod); }
        const ins = it.type === 'kettle' ? 1.2 : 0.25;
        if (lev > 0.02) g += poly([P(x + ins, y + ins, h * lev), P(x + w - ins, y + ins, h * lev), P(x + w - ins, y + d - ins, h * lev), P(x + ins, y + d - ins, h * lev)], '', `style="fill:${col};stroke:${glow ? '#e07a22' : 'none'};stroke-width:${glow ? 1.6 : 0}" ${glow ? 'class="glow"' : ''}`);
      } else g += poly(top, '', `style="fill:${L.col};opacity:.5;stroke:none"`);
      if (it.type === 'kettle' && ch.fume === 'enclosure') g += poly([P(x, y, h + 3), P(x + w, y, h + 3), P(x + w, y + d, h + 3), P(x, y + d, h + 3)], 'roof');
    }
    const c = P(x + w / 2, y + d / 2, h + 0.3);
    g += `<text x="${c[0]}" y="${c[1] - 2}" text-anchor="middle">${it.lb}</text>`;
    svg += `<g class="hit" data-enc="${L.enc}"><title>${esc(L.t)}</title>${g}</g>`;
  });
  if (built >= 5) { const r0 = P(bx0, by0 + 1, H - 1), r1 = P(bx1, by0 + 1, H - 1); svg += `<line x1="${r0[0]}" y1="${r0[1]}" x2="${r1[0]}" y2="${r1[1]}" class="frame" style="stroke:var(--zinc);stroke-width:1.4"/>`; }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const mnx = Math.min(...xs) - 10, mny = Math.min(...ys) - 14, W = Math.max(...xs) - mnx + 10, Hh = Math.max(...ys) - mny + 10;
  return `<svg class="iso" viewBox="${mnx.toFixed(0)} ${mny.toFixed(0)} ${W.toFixed(0)} ${Hh.toFixed(0)}" role="img" aria-label="İzometrik tesis görünümü">${svg}</svg>`;
}

/* ---------------- charts ---------------- */
function lineChart({ series, xmin, xmax, ymin, ymax, w = 560, h = 200, yt = [], xl = '', refs = [] }) {
  const L = 44, Rr = 10, T = 10, B = 24;
  const X = v => L + (v - xmin) / (xmax - xmin || 1) * (w - L - Rr), Y = v => T + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - T - B);
  let g = '';
  yt.forEach(v => { g += `<line class="gr" x1="${L}" x2="${w - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end">${v.toLocaleString('tr-TR')}</text>`; });
  refs.forEach(r => { g += `<line x1="${L}" x2="${w - Rr}" y1="${Y(r.v)}" y2="${Y(r.v)}" style="stroke:var(--${r.c || 'crit'});stroke-dasharray:4 3;stroke-width:1.2"/><text x="${w - Rr}" y="${Y(r.v) - 4}" text-anchor="end" style="fill:var(--${r.c || 'crit'})">${r.t}</text>`; });
  g += `<line class="ax" x1="${L}" x2="${w - Rr}" y1="${h - B}" y2="${h - B}"/><text x="${w - Rr}" y="${h - 6}" text-anchor="end">${xl}</text><text x="${L}" y="${h - 6}">${xmin}</text>`;
  series.forEach(s => {
    if (!s.pts.length) return;
    const d = s.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(clamp(p[1], ymin, ymax)).toFixed(1)).join(' ');
    if (s.area) g += `<path d="${d} L${X(s.pts[s.pts.length - 1][0]).toFixed(1)} ${h - B} L${X(s.pts[0][0]).toFixed(1)} ${h - B} Z" style="fill:var(--${s.c});opacity:.12;stroke:none"/>`;
    g += `<path d="${d}" style="fill:none;stroke:var(--${s.c});stroke-width:${s.sw || 2}"/>`;
    const lp = s.pts[s.pts.length - 1]; g += `<circle cx="${X(lp[0])}" cy="${Y(clamp(lp[1], ymin, ymax))}" r="3.2" style="fill:var(--${s.c})"/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${g}</svg>`;
}
const legend = items => `<div class="row small">${items.map(([c, t]) => `<span class="row" style="gap:5px"><i style="width:14px;height:3px;background:var(--${c});display:inline-block"></i>${t}</span>`).join('')}</div>`;

/* ================= VIEW 1 – EPC ================= */
function optCost(o, C) { const c = o.fixed ? o.c : o.c * C.scale; return c === 0 ? '—' : (c > 0 ? '+' : '') + usd(c); }
function fieldHTML(f) {
  const ch = S.epc.ch, C = CAP[ch.capacity];
  const head = `<div class="flabel">${f.label} <span class="en">${f.en}</span> ${I(f.enc)}</div>`;
  if (f.type === 'number') return `<div class="field" data-tut="f-${f.key}">${head}<div class="slider"><input type="range" id="f-${f.key}" data-epc="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${ch[f.key]}" data-unit=" ${f.unit}"><output>${n(ch[f.key])} ${f.unit}</output></div>
    <p class="small muted">Gerekli kanca yüksekliği = 3,5 (vinç) + 1,2 (askı) + parça + 1,5 (tank kenarı payı) = <b class="mono">${n(reqHeight(ch))} m</b></p></div>`;
  return `<div class="field" data-tut="f-${f.key}">${head}<div class="opts">${f.opts.map(o => {
    const sel = String(ch[f.key]) === String(o.v);
    const extra = f.key === 'capacity' ? `<small>Bütçe ${usd(CAP[o.v].budget)} · bina ${usd(CAP[o.v].building)} · ~${kettleTonnes(CAP[o.v])} t Zn</small>` : o.note ? `<small>${o.note}</small>` : '';
    return `<label class="opt ${sel ? 'sel' : ''}"><input type="radio" name="f-${f.key}" data-epc="${f.key}" value="${o.v}" ${sel ? 'checked' : ''}><span>${o.t}${extra}</span><span class="c">${f.key === 'capacity' ? '' : optCost(o, C)}</span></label>`;
  }).join('')}</div></div>`;
}
function budgetPanel() {
  const ch = S.epc.ch, C = CAP[ch.capacity], cost = epcCost(ch), zf = kettleTonnes(C) * (S.market.lme + S.market.prem);
  const rest = C.budget - cost - zf, pct = clamp((cost + zf) / C.budget * 100, 0, 100);
  return `<div class="panel"><div class="ph"><h4>Yatırım bütçesi</h4><span class="pill ${rest < 0 ? 'crit' : rest < 1e6 ? 'warn' : 'ok'}">${rest < 0 ? 'AŞIM' : 'UYGUN'}</span></div>
   <div class="meter ${rest < 0 ? 'c' : 'z'}"><i style="width:${pct}%"></i></div>
   <dl class="kv" style="margin-top:10px"><dt>Bütçe (${C.name})</dt><dd>${usd(C.budget)}</dd><dt>EPC yatırımı</dt><dd>${usd(cost)}</dd><dt>İlk çinko dolumu (${kettleTonnes(C)} t)</dt><dd>${usd(zf)}</dd><dt>İşletme sermayesi</dt><dd style="color:var(--${rest < 0 ? 'crit' : 'ink'})">${usd(rest)}</dd></dl></div>`;
}
function viewEPC() {
  if (S.epc.done) return viewEPCDone();
  const st = S.epc.step, ch = S.epc.ch;
  const steps = EPC_STEPS.map((s, i) => `<button class="step ${i < st ? 'done' : ''}" data-step="${i}" aria-current="${i === st}"><span class="k">${i < st ? '✓' : s.code}</span><span>${s.title}<br><span class="en">${s.en}</span></span></button>`).join('')
    + `<button class="step ${st > 5 ? 'done' : ''}" data-step="5" aria-current="${st === 5}"><span class="k">${st > 5 ? '✓' : '1.6'}</span><span>Yerleşim planı<br><span class="en">Plot plan & flow</span></span></button>`
    + `<button class="step" data-step="6" aria-current="${st === 6}"><span class="k">1.7</span><span>Proje onayı<br><span class="en">Design review & sign-off</span></span></button>`
    + `<div class="sep"></div><button class="btn sm" data-act="epc-reco">Önerilen yapılandırmayı yükle</button><p class="small muted">Deneyimli bir galvaniz mühendisinin tercihleri. İsterseniz sonra değiştirin.</p>`;
  let main;
  if (st < 5) {
    const s = EPC_STEPS[st];
    main = `<div class="panel"><div class="ph"><h2>${s.code} ${s.title} <span class="en">${s.en}</span></h2>${I(s.enc)}</div><p class="muted" style="max-width:68ch">${s.intro}</p>
      <div style="margin-top:8px">${s.fields.map(fieldHTML).join('')}</div>
      <div class="row" style="justify-content:space-between;margin-top:10px">${st > 0 ? `<button class="btn" data-step="${st - 1}">← Geri</button>` : '<span></span>'}<button class="btn primary" data-step="${st + 1}">${st === 4 ? 'Yerleşim planına geç →' : 'Sonraki adım →'}</button></div></div>`;
  } else if (st === 5) {
    main = layoutEditor();
  } else {
    const rv = epcReview(ch, S.epc.gw), C = CAP[ch.capacity], cost = epcCost(ch);
    const crit = rv.filter(r => r.lvl === 'crit').length, warn = rv.filter(r => r.lvl === 'warn').length;
    const stepCost = EPC_STEPS.map(s => [s.code + ' ' + s.title, s.fields.reduce((a, f) => { if (f.type === 'number') return a; const o = fieldOpt(f, ch[f.key]); return a + (o ? (o.fixed ? o.c : o.c * C.scale) : 0); }, 0)]);
    stepCost[0][1] += C.building;
    main = `<div class="panel"><div class="ph"><h2>1.7 Proje onayı <span class="en">Design review</span></h2><span><span class="pill crit">${crit} kritik</span> <span class="pill warn">${warn} uyarı</span></span></div>
      ${evalLayout().missing.length ? '<div class="alert crit"><span class="lv">ENGEL</span><span>Yerleşim planı tamamlanmadı: önce bütün ekipmanı arsaya yerleştirin.</span></div>' : ''}
      <p class="muted" style="max-width:68ch">Kritik bulgularla da inşa edebilirsiniz; ancak her biri işletmede arıza, ceza veya kaza olarak geri döner.</p>
      <div class="stack" style="margin-top:10px">${rv.map(r => `<div class="alert ${r.lvl}"><span class="lv">${LV[r.lvl]}</span><span style="flex:1">${r.t}</span>${I(r.enc)}</div>`).join('')}</div>
      <div class="tbl-wrap" style="margin-top:14px"><table><thead><tr><th>Paket</th><th class="r">Tutar</th></tr></thead><tbody>${stepCost.map(([a, b]) => `<tr><td>${a}</td><td class="r">${usd(b)}</td></tr>`).join('')}<tr><th>Toplam EPC</th><th class="r">${usd(cost)}</th></tr></tbody></table></div>
      <div class="row" style="justify-content:space-between;margin-top:12px"><button class="btn" data-step="5">← Yerleşim planı</button><button class="btn zinc" data-act="epc-confirm" ${cost > C.budget || evalLayout().missing.length ? 'disabled' : ''}>Onayla ve inşa et</button></div></div>`;
  }
  if (st === 5) return `<div class="layout wide"><div class="steps">${steps}</div><div class="col">${main}<div class="grid2"><div class="panel"><div class="ph"><h4>3B önizleme</h4><span class="small muted">${n(ch.height)} m</span></div>${isoSVG({ built: 9, kettleLevel: 0, hot: false })}</div>${budgetPanel()}</div></div></div>`;
  return `<div class="layout three"><div class="steps">${steps}</div><div class="col">${main}</div>
    <div class="col"><div class="panel"><div class="ph"><h4>Saha yerleşimi</h4><span class="small muted">${st >= 5 && !evalLayout().missing.length ? FLOW_NAMES[evalLayout().flow] + ' · ' : st < 5 ? 'taslak · ' : ''}${n(ch.height)} m</span></div>${isoSVG({ built: st, kettleLevel: 0, hot: false })}<p class="small muted">${st < 5 ? 'Taslak I-hattı gösteriliyor; asıl yerleşimi 1.6’da siz çizeceksiniz.' : 'Kesikli çizgi: planlanan.'} Bir ekipmana tıklayınca mühendislik kartı açılır.</p></div>${budgetPanel()}</div></div>`;
}
function viewEPCDone() {
  const P = S.plant, ch = P.ch, C = CAP[P.cap];
  const rv = epcReview(ch, S.epc.gw).filter(r => r.lvl !== 'ok');
  return `<div class="hero"><div class="panel">${isoSVG({ kettleLevel: S.prod ? clamp(S.prod.kettle.zinc / P.kT, 0, 1) * 0.92 : 0, hot: !!S.prod })}</div>
   <div class="col"><div class="panel"><h2>${C.name} tesis – inşaat tamamlandı</h2><p class="muted">Yerleşim ${FLOW_NAMES[P.lay.flow]} (rota ${n(P.lay.route, 0)} m, ${P.lay.turns} dönüş, bina ≈ ${n(P.lay.area, 0)} m²), kazan ${C.kettle.L} × ${C.kettle.W} × ${C.kettle.D} m, ${P.kT} t sıvı çinko, brülör ${C.burnerMW} MW.</p>
   <dl class="kv" style="margin-top:10px"><dt>Kazan sacı / et</dt><dd>${ch.kSteel === 'armco' ? 'Özel düşük Si/C' : 'S235JR'} / ${ch.kThk} mm</dd><dt>Brülör</dt><dd>${ch.burner === 'hv' ? 'Yüksek hızlı' : 'Konvansiyonel'}</dd><dt>Asit</dt><dd>${ch.acid.toUpperCase()} · ${ch.pickN} tank · ${C.acidVol} m³</dd><dt>Laboratuvar</dt><dd>${ch.lab === 'full' ? 'Tam donanımlı' : 'Temel'}</dd><dt>Yeraltı suyu</dt><dd>${ch.survey === 'yes' ? n(S.epc.gw) + ' m' : 'ölçülmedi'}</dd></dl>
   ${!S.prod ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-mode="comm">Kazan devreye almaya geç →</button></div>` : ''}</div>
   ${rv.length ? `<div class="panel"><h4>Tasarımdan taşınan riskler</h4><div class="stack" style="margin-top:8px">${rv.map(r => `<div class="alert ${r.lvl}"><span class="lv">${LV[r.lvl]}</span><span style="flex:1">${r.t}</span>${I(r.enc)}</div>`).join('')}</div></div>` : ''}
   <div class="row"><button class="btn ghost sm" data-act="reset">Yeni oyun (sıfırdan tesis)</button></div></div></div>`;
}

/* ================= VIEW 2 – COMMISSIONING ================= */
function viewComm() {
  if (!S.comm) return `<div class="panel">Önce EPC aşamasını tamamlayın.</div>`;
  const P = S.plant, C = CAP[P.cap];
  if (S.comm.done) return `<div class="panel"><h2>Kazan devrede</h2><p class="muted">Banyo ${S.prod ? n(S.prod.kettle.temp, 0) : 450} °C’de. Alaşım (Ni, Al, Bi) ilk vardiyada OES analizine göre dozlanmalı.</p><div class="row" style="margin-top:10px"><button class="btn primary" data-mode="prod">Üretime geç →</button></div></div>`;
  const m = S.comm.method;
  if (!m) return `<div class="col"><div class="panel"><h2>Kazan devreye alma yöntemi <span class="en">Kettle commissioning</span></h2><p class="muted" style="max-width:70ch">Kazanda ${P.kT} t çinko olacak. İki yol var: külçeleri yerinde kademeli ergitmek veya başka bir tesisten sıvı çinkoyu thermos potalarla transfer etmek. Çinko alımı ${usd(zincPrice())}/t (LME ${usd(S.market.lme)} + prim ${usd(S.market.prem)}).</p></div>
    <div class="grid2"><div class="panel"><h3>A · Külçe çinko ile kademeli ergitme ${I('ingot')}</h3><p class="small muted">Ingot melting</p><ul class="small" style="padding-left:18px;margin:8px 0"><li>SHG külçeleri kazan merkezinde piramit şeklinde istifle.</li><li>Boş/yarı dolu kazanda kuru duvar 420 °C’yi aşmasın.</li><li>Sıvı havuz oluştukça yan duvarlara külçe ekle.</li><li>Ergitme bitmeden Ni, Al, Bi atma.</li></ul><p class="small">Süre ~2–4 gün, gaz maliyeti, kazan hasarı riski sizin kontrolünüzde.</p><button class="btn primary" data-act="comm-A" style="margin-top:8px">Bu yöntemi seç</button></div>
    <div class="panel"><h3>B · Sıvı çinko transferi ${I('thermos')}</h3><p class="small muted">Liquid zinc transfer (thermos & holding furnace)</p><ul class="small" style="padding-left:18px;margin:8px 0"><li>Thermos refrakterini ≤ 20 °C/saat ile 21,5 saatte kurut ve ısıt.</li><li>Dolumu kapağın 50–75 mm altında durdur.</li><li>Zincir destek mekanizmasını devreye al.</li><li>Bekletme fırınlarını ilk dolan önce olmak üzere pompala.</li></ul><p class="small">Hızlı; sıvı çinko primi +$60/t ve pota seferi $1.800.</p><button class="btn primary" data-act="comm-B" style="margin-top:8px">Bu yöntemi seç</button></div></div></div>`;
  return m === 'A' ? viewCommA() : viewCommB();
}
function viewCommA() {
  const A = S.comm.A;
  return `<div class="layout"><div class="col"><div class="panel"><div class="ph"><h2>A · Külçe ergitme <span class="en">Ingot melting</span></h2><span class="small muted">Saat başı simülasyon</span></div>
    <div class="field"><div class="flabel">Brülör gücü <span class="en">Burner firing rate</span> ${I('burner')}</div><div class="slider"><input type="range" id="comm-power" min="0" max="100" step="5" value="${A.power}" data-unit=" %"><output>${A.power} %</output></div></div>
    <div class="field"><div class="flabel">Külçe yükleme (10 t / hamle) ${I('ingot')}</div><div class="row"><button class="btn" data-act="ingot-center">+10 t merkeze piramit</button><button class="btn" data-act="ingot-side">+10 t yan duvarlara</button><button class="btn ghost" data-act="alloy-early" title="Kural dışı">Ni/Al/Bi alaşımı at</button></div></div>
    <div class="field"><div class="flabel">Zaman</div><div class="row"><button class="btn" data-act="hr1">▶ 1 saat</button><button class="btn" data-act="hr6">▶▶ 6 saat</button><button class="btn ${A.running ? 'zinc' : 'primary'}" data-act="auto">${A.running ? '❚❚ Durdur' : '▶ Otomatik çalıştır'}</button><button class="btn ghost sm" data-act="comm-reset" title="Kazandaki çinkonun %90’ı stoğa döner">Baştan başlat</button></div></div></div>
    <div id="comm-live">${commLive()}</div></div>
    <div class="col"><div class="panel"><h4>Kazan kesiti</h4>${isoSVG({ kettleLevel: clamp(bulkState(A).liq / S.plant.kT, 0, 1) * 0.92, hot: bulkState(A).liq > 0 })}</div>
    <div class="panel"><h4>Kurallar <span class="en">Strict engineering rules</span></h4><div class="stack small" style="margin-top:8px" id="comm-rules">${commRules()}</div></div></div></div>`;
}
function commRules() {
  const A = S.comm.A, bs = bulkState(A), lvl = bs.liq / S.plant.kT;
  const r = [
    [A.events.every(e => !e.includes('Piramit')), 'Külçeleri merkezde piramit şeklinde istifle'],
    [!(lvl < 0.9 && A.wall > 420), `Kuru duvar ≤ 420 °C (şu an ${n(A.wall, 0)} °C)`],
    [A.events.every(e => !e.includes('termal şok')), 'Yan duvara yalnız sıvı havuz oluşunca külçe ekle'],
    [!A.alloyEarly, 'Ergitme bitmeden alaşım ekleme'],
    [A.moist !== 2, 'Çukur nem alarmını yok sayma']
  ];
  return r.map(([ok, t]) => `<div class="row" style="gap:8px;flex-wrap:nowrap"><span class="pill ${ok ? 'ok' : 'crit'}">${ok ? '✓' : '✗'}</span><span>${t}</span></div>`).join('');
}
function commLive() {
  const A = S.comm.A, P = S.plant, bs = bulkState(A), lvl = bs.liq / P.kT;
  const can = commCanFinish();
  const hist = A.hist || [];
  const g = (k, v, cls = '') => `<div class="gauge ${cls}"><small>${k}</small><b>${v}</b></div>`;
  return `<div class="panel"><div class="grid3">
    ${g('Çinko (yığın/banyo)', n(bs.T, 0) + ' °C', 'hot')}${g('Kuru duvar', n(A.wall, 0) + ' °C', lvl < 0.9 && A.wall > 420 ? 'bad' : '')}${g('Ergimiş', '%' + n(bs.melt * 100, 0))}
    ${g('Sıvı seviye', '%' + n(lvl * 100, 0))}${g('Yüklenen', n(A.m, 0) + ' / ' + P.kT + ' t')}${g('Kazan hasarı (100 = delinme)', '%' + n(Math.min(A.dmg, 100), 0), A.dmg > 30 ? 'bad' : A.dmg < 5 ? 'good' : '')}
    ${g('Süre', A.hr + ' saat')}${g('Doğalgaz', Math.round(A.gas).toLocaleString('tr-TR') + ' Nm³')}${g('Hedef', '≥%90 · 440–465°', can ? 'good' : '')}</div>
    <div style="margin-top:12px">${lineChart({ series: [{ pts: hist.map(h => [h[0], h[1]]), c: 'crit', sw: 1.6 }, { pts: hist.map(h => [h[0], h[2]]), c: 'zinc', area: true }], xmin: 0, xmax: Math.max(24, A.hr), ymin: 0, ymax: 600, yt: [0, 200, 420, 600], refs: [{ v: 420, t: '420 °C kuru duvar sınırı' }], xl: 'saat' })}
    ${legend([['crit', 'Kuru duvar'], ['zinc', 'Çinko']])}</div>
    ${A.dmg >= 100 ? `<div class="alert crit" style="margin-top:12px"><span class="lv">ARIZA</span><span style="flex:1">Kazan delindi. Devam etmek için yeni kazanı kurun.</span><button class="btn sm zinc" data-act="comm-recover">Yeni kazan kur</button></div>` : lvl < 0.9 && A.wall > 420 ? `<div class="alert crit" style="margin-top:12px"><span class="lv">ALARM</span><span>Kuru duvar ${n(A.wall, 0)} °C > 420 °C: kazan hasar alıyor. Brülör gücünü düşürün.</span></div>` : ''}
    <div class="row" style="margin-top:12px;justify-content:space-between"><span class="small muted">${can ? 'Banyo hazır: tüm çinko ergidi ve sıcaklık işletme aralığında.' : 'Tamamlamak için kazanın ≥ %90’ı sıvı olmalı ve banyo 440–465 °C olmalı.'}</span><button class="btn zinc" data-act="comm-finish-A" ${can ? '' : 'disabled'}>Devreye almayı tamamla</button></div>
    ${A.events.length ? `<div class="sep"></div><div class="log">${A.events.slice().reverse().map(e => `<div><span class="tm">olay</span><span>${esc(e)}</span></div>`).join('')}</div>` : ''}</div>`;
}
function viewCommB() {
  const B = S.comm.B;
  if (B.report) return `<div class="panel"><h2>Transfer raporu <span class="en">Liquid zinc transfer report</span></h2><p class="muted">${B.report.trips} sefer, çinko + nakliye ${usd(B.report.zc)}.</p><div class="stack" style="margin-top:10px">${B.report.lines.map(([l, t]) => `<div class="alert ${l}"><span class="lv">${LV[l]}</span><span>${t}</span></div>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn zinc" data-act="comm-finish-B">Kazanı devreye al ve üretime geç →</button></div></div>`;
  const hrs = (450 - 20) / B.ramp;
  const prog = []; for (let t = 0; t <= hrs + 4; t += 0.5) prog.push([t, Math.min(450, 20 + B.ramp * t)]);
  const sorted = [...B.hf].sort((a, b) => a.time.localeCompare(b.time));
  return `<div class="layout"><div class="col">
   <div class="panel"><h3>1 · Kazan ön ısıtma (boş kazan) ${I('kettle')}</h3><p class="small muted">Sıvı çinko dökülmeden önce boş kazan kuru duvar sınırına göre ısıtılır.</p>
     <div class="opts" style="margin-top:8px">${[150, 300, 400, 420, 480, 520].map(v => `<label class="opt ${B.kpre === v ? 'sel' : ''}"><input type="radio" name="kpre" data-b="kpre" value="${v}" ${B.kpre === v ? 'checked' : ''}><span>${v} °C</span></label>`).join('')}</div></div>
   <div class="panel"><h3>2 · Thermos refrakter ön ısıtma programı ${I('thermos')}</h3>
     <div class="slider"><input type="range" data-b="ramp" min="5" max="40" step="1" value="${B.ramp}" data-unit=" °C/saat"><output>${B.ramp} °C/saat</output></div>
     <p class="small">20 → 450 °C: <b class="mono">${n(hrs)} saat</b> ${B.ramp > 20 ? '<span class="pill crit">refrakter çatlama riski</span>' : '<span class="pill ok">güvenli</span>'}</p>
     ${lineChart({ series: [{ pts: prog, c: B.ramp > 20 ? 'crit' : 'steel', area: true }], xmin: 0, xmax: Math.max(26, hrs + 4), ymin: 0, ymax: 500, h: 160, yt: [0, 250, 450], refs: [{ v: 450, t: 'hedef 450 °C', c: 'muted' }], xl: 'saat' })}</div>
   <div class="panel"><h3>3 · Dolum ve taşıma güvenliği</h3>
     <div class="row"><label class="row">Dolum seviyesi: kapağın <input type="number" data-b="fill" min="0" max="200" value="${B.fill}"> mm altında</label></div>
     <label class="row" style="margin-top:8px"><input type="checkbox" data-b="chain" ${B.chain ? 'checked' : ''}> Zincir destek mekanizması devrede (flanş gerilmesini önler)</label></div>
   <div class="panel"><h3>4 · Bekletme fırını pompalama sırası ${I('holding')}</h3><p class="small muted">Sıraya eklemek için fırına tıklayın.</p>
     <div class="tbl-wrap"><table><thead><tr><th>Fırın</th><th>Dolum saati</th><th>Sıcaklık</th><th></th></tr></thead><tbody>${B.hf.map(h => `<tr><td class="mono">${h.id}</td><td class="mono">${h.time}</td><td class="mono">${455 + (sorted.indexOf(h)) * 4} °C</td><td><button class="btn sm" data-act="hf" data-id="${h.id}" ${B.order.includes(h.id) ? 'disabled' : ''}>Sıraya ekle</button></td></tr>`).join('')}</tbody></table></div>
     <p style="margin-top:8px">Sıra: <b class="mono">${B.order.join(' → ') || '—'}</b> ${B.order.length ? '<button class="btn sm ghost" data-act="hf-reset">Sıfırla</button>' : ''}</p></div>
   <div class="row"><button class="btn ghost" data-act="comm-back">← Yöntem değiştir</button><button class="btn zinc" data-act="comm-runB" ${B.order.length === 3 ? '' : 'disabled'}>Transferi başlat</button></div></div>
   <div class="col"><div class="panel"><h4>Kazan</h4>${isoSVG({ kettleLevel: 0, hot: false })}<dl class="kv"><dt>Kazan kapasitesi</dt><dd>${S.plant.kT} t</dd><dt>Thermos</dt><dd>25 t</dd><dt>Tahmini sefer</dt><dd>${Math.ceil(S.plant.kT / 25)}</dd><dt>Sıvı çinko</dt><dd>${usd(zincPrice() + 60)}/t</dd></dl></div></div></div>`;
}

/* ================= VIEW 3 – PRODUCTION ================= */
const PTABS = [['rfq', 'Sipariş & teklif', 'Quotation'], ['recv', 'Kabul & MTC', 'Receiving'], ['jig', 'Askılama', 'Jigging'], ['pre', 'Ön işlem & lab', 'Pretreatment'], ['kettle', 'Kurutma & kazan', 'Kettle'], ['qc', 'Soğutma & QC', 'ISO 1461'], ['market', 'Piyasa & maliyet', 'Commercial'], ['log', 'Kayıtlar', 'Log']];
const STAGE_TAB = { rfq: 'rfq', recv: 'recv', jig: 'jig', line: 'pre', qc: 'qc' };
function viewProd() {
  const pr = S.prod; fillRFQs();
  const active = STAGE_TAB[pr.stage];
  const nav = PTABS.map(([k, t]) => `<button class="sub" data-ptab="${k}" aria-current="${U.ptab === k}"><span class="dot ${active === k || (pr.stage === 'line' && k === 'kettle') ? 'on' : ''}"></span>${t}</button>`).join('');
  const page = { rfq: pRFQ, recv: pRecv, jig: pJig, pre: pPre, kettle: pKettle, qc: pQC, market: pMarket, log: pLog }[U.ptab]();
  return `<div class="subnav">${nav}</div><div class="layout"><div class="col">${page}</div><div class="col">${prodSide()}</div></div>`;
}
function orderHead(o) { return `<div class="panel flat"><div class="row" style="justify-content:space-between"><span><b>${o.id}</b> · ${esc(o.cust)} · ${esc(o.p.name)} <span class="en">${o.p.en}</span></span><span class="mono">${n(o.tons)} t · ${usd(o.quote)}/t</span></div></div>`; }
function needOrder(stage) {
  const pr = S.prod;
  if (!pr.order) return `<div class="panel"><p>Aktif sipariş yok. <button class="btn sm primary" data-ptab="rfq">Sipariş & teklif →</button></p></div>`;
  if (stage && pr.stage !== stage) return orderHead(pr.order) + `<div class="panel"><p class="muted">Bu sipariş şu an <b>${PTABS.find(p => p[0] === STAGE_TAB[pr.stage])[1]}</b> aşamasında.</p><button class="btn sm primary" data-ptab="${STAGE_TAB[pr.stage]}" style="margin-top:8px">Oraya git →</button></div>`;
  return null;
}
function pRFQ() {
  const pr = S.prod;
  if (pr.order) return orderHead(pr.order) + `<div class="panel"><p>Aktif sipariş işlemde. Sırada: <b>${PTABS.find(p => p[0] === STAGE_TAB[pr.stage])[1]}</b>.</p><button class="btn sm primary" data-ptab="${STAGE_TAB[pr.stage]}" style="margin-top:8px">Devam et →</button></div>`;
  return `<div class="panel"><h2>Teklif talepleri <span class="en">Requests for quotation</span></h2><p class="muted" style="max-width:72ch">Müşteri çizimlerini “galvanize uygun tasarım” açısından inceleyin ${I('dfg')}. Doğru tespit ettiğiniz sorunlar için müşteri çizimi düzeltir ve itibarınız artar. Birim fiyat ton başına siyah çelik üzerinden verilir.</p></div>
   ${pr.rfqs.map((q, i) => `<div class="panel"><div class="ph"><h3>${esc(q.cust)}</h3><span class="mono small">RFQ-${q.id}</span></div>
     <ul class="small" style="padding-left:18px;margin:0 0 8px">${rfqNotes(q).map(t => `<li>${t}</li>`).join('')}</ul>
     <div class="small" style="font-weight:600;margin-bottom:4px">Tasarım uyarıları (DfG) <span class="en">Design for galvanizing</span></div>
     <div class="opts">${Object.entries(DFG_LABELS).map(([k, t]) => `<label class="opt ${q.flags.includes(k) ? 'sel' : ''}"><input type="checkbox" data-flag="${i}|${k}" ${q.flags.includes(k) ? 'checked' : ''}><span class="small">${t}</span></label>`).join('')}</div>
     <div class="row" style="margin-top:10px;justify-content:space-between"><label class="row small">Birim fiyat $/t <input type="number" data-quote="${i}" min="200" max="2000" step="5" value="${q.quote}"></label><span class="small muted">Piyasa referansı ≈ $${q.p.price}/t · kazan boyu ${n(CAP[S.plant.cap].kettle.L)} m</span>
     <span class="row"><button class="btn sm ghost" data-act="rfq-skip" data-i="${i}">Pas geç</button><button class="btn sm primary" data-act="quote" data-i="${i}">Teklif ver</button></span></div></div>`).join('')}`;
}
function pRecv() {
  const x = needOrder('recv'); if (x) return x;
  const o = S.prod.order, s = o.steel, d = o.dec, sf = SURFACES[o.surface];
  return orderHead(o) + `<div class="panel"><div class="ph"><h2>Malzeme kabul <span class="en">Receiving inspection</span></h2>${I('mtc')}</div>
   <div class="mtc"><div class="row" style="justify-content:space-between"><b>EN 10204 – 3.1 Muayene belgesi</b><span>Döküm no ${o.id}-${Math.round(s.C * 1e4)}</span></div>
   <div class="tbl-wrap" style="margin-top:6px"><table><thead><tr><th>Kalite</th><th class="r">C %</th><th class="r">Si %</th><th class="r">Mn %</th><th class="r">P %</th><th class="r">S %</th><th class="r">Al %</th></tr></thead>
   <tbody><tr><td>${o.p.grade}</td><td class="r">${n(s.C, 3)}</td><td class="r">${n(s.Si, 3)}</td><td class="r">${n(s.Mn, 2)}</td><td class="r">${n(s.P, 3)}</td><td class="r">${n(s.S, 3)}</td><td class="r">${n(s.Al, 3)}</td></tr></tbody></table></div></div>
   <div class="field"><div class="flabel">Sandelin sınıfı: Si<sub>eq</sub> = %Si + 2,5 × %P ${I('sandelin')}</div><div class="opts">${SANDELIN.map(c => `<label class="opt ${d.cls === c.v ? 'sel' : ''}"><input type="radio" name="cls" data-dec="cls" value="${c.v}" ${d.cls === c.v ? 'checked' : ''}><span>${c.t}<small>${c.en}</small></span></label>`).join('')}</div></div>
   ${o.p.closed ? `<div class="field"><div class="flabel">Kapalı hacim kontrolü ${I('vent')}</div><p class="small">${o.vent === 'ok' ? 'Uç plakalarında Ø20 mm delikler, her iki uçta, çapraz köşelerde.' : o.vent === 'small' ? 'Uç plakalarında yalnız Ø6 mm delik (profil 100+ mm).' : 'Uç plakaları tamamen kaynakla kapatılmış, delik yok.'}</p>
     <div class="opts">${[['approve', 'Uygun – olduğu gibi kabul'], ['drill', `Delik deldir (Ø20, ${usd(35 * o.tons)}, 1 saat)`], ['reject', 'Siparişi reddet']].map(([v, t]) => `<label class="opt ${d.ventAct === v ? 'sel' : ''}"><input type="radio" name="vent" data-dec="ventAct" value="${v}" ${d.ventAct === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>` : ''}
   <div class="field"><div class="flabel">Yüzey durumu ${I(sf.enc)}</div><p class="small">${sf.t}.</p><label class="opt ${d.blast ? 'sel' : ''}" style="max-width:420px"><input type="checkbox" data-dec="blast" ${d.blast ? 'checked' : ''}><span>Kumlama istasyonuna yönlendir ($25/t, +süre) ${I('blasting')}</span></label></div>
   <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn primary" data-act="recv-ok" ${d.cls && (!o.p.closed || d.ventAct) ? '' : 'disabled'}>Kabul et → Askılama</button></div></div>`;
}
function pJig() {
  const x = needOrder('jig'); if (x) return x;
  const o = S.prod.order, d = o.dec;
  const H = [['wire', 'Siyah tavlı çelik tel', 'Köşebent, kutu profil, genel'], ['hook', 'Kanca / traverse', 'Kiriş, direk, ağır parça'], ['jig', 'Özel aparat (jig/rack)', 'Bariyer, ızgara, ince sac'], ['basket', 'Santrifüj sepeti', 'Cıvata, somun, pul']];
  const OR = [['incline', 'Eğimli – delikler en üst ve en alt noktada'], ['flat', 'Yatay asım'], ['vertical', 'Dikey (90°)']];
  return orderHead(o) + `<div class="panel"><div class="ph"><h2>Askılama <span class="en">Jigging & rigging</span></h2>${I('jig')}</div>
   <div class="field"><div class="flabel">Askı tipi</div><div class="opts">${H.map(([v, t, s]) => `<label class="opt ${d.hanger === v ? 'sel' : ''}"><input type="radio" name="hg" data-dec="hanger" value="${v}" ${d.hanger === v ? 'checked' : ''}><span>${t}<small>${s}</small></span></label>`).join('')}</div></div>
   <div class="field"><div class="flabel">Drenaj açısı ${I('drainAngle')}</div><div class="slider"><input type="range" data-dec="angle" min="0" max="45" step="1" value="${d.angle}" data-unit="°"><output>${d.angle}°</output></div><p class="small muted">Hedef 10–15°: çinko süzülür, flux gazı çıkar.</p></div>
   <div class="field"><div class="flabel">Askı yönü / hava cebi kontrolü</div><div class="opts">${OR.map(([v, t]) => `<label class="opt ${d.orient === v ? 'sel' : ''}"><input type="radio" name="or" data-dec="orient" value="${v}" ${d.orient === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
   <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn primary" data-act="jig-ok" ${d.hanger && d.orient ? '' : 'disabled'}>Askıyı kilitle → Ön işlem hattı</button></div></div>`;
}
function labBlock(keys) {
  const k = S.prod.known;
  return `<div class="row">${keys.map(key => `<button class="btn sm" data-lab="${key}" title="${LAB[key].t}">${LAB[key].t} <span class="muted mono">${labCost(key) ? '$' + labCost(key) : ''}${!LAB[key].basic && S.plant.ch.lab !== 'full' ? ' dış lab' : ''}</span></button>`).join('')}</div>
    ${keys.filter(key => k[key]).map(key => { const r = k[key], age = S.prod.batch - r.batch; return `<div class="lab"><div class="row" style="justify-content:space-between"><b class="small">${LAB[key].t}</b><span class="${age > 0 ? 'stale' : 'small muted'}">${age > 0 ? age + ' parti önce' : 'güncel'}</span></div>${Object.entries(r.r).map(([a, b]) => `<div class="r"><span>${a}</span><span>${b}</span></div>`).join('')}</div>`; }).join('')}`;
}
const sl = (attr, val, min, max, step, unit, dis = '') => `<div class="slider"><input type="range" ${attr} min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}" ${dis}><output>${val}${unit}</output></div>`;
const actBtn = (k, label, amt, unit) => amt != null ? `<span class="row" style="gap:4px"><input type="number" id="amt-${k}" value="${amt}" min="0" aria-label="${label} miktarı"><span class="small muted">${unit}</span><button class="btn sm" data-do="${k}">${label}</button></span>` : `<button class="btn sm" data-do="${k}">${label}</button>`;
function bath(id, sw, title, en, enc, ideal, body) {
  return `<section class="bath"><header><span class="sw" style="background:${sw}"></span><h3>${title}</h3><span class="en">${en}</span>${I(enc)}</header><p class="small muted">${ideal}</p>${body}</section>`;
}
function pPre() {
  const pr = S.prod, b = pr.baths, ch = S.plant.ch;
  const o = pr.order;
  const head = o ? orderHead(o) + (pr.stage === 'line' ? `<div class="alert info"><span class="lv">HAT</span><span>Askı ön işleme hazır. Banyoları ayarlayıp kontrol edin, ardından <b>Kurutma & kazan</b> sekmesinden daldırın.</span></div>` : '') : '';
  return head + `<div class="panel"><h2>Ön işlem hattı & laboratuvar <span class="en">Pretreatment line</span></h2><p class="small muted" style="max-width:74ch">Banyo değerleri ancak test edilince bilinir. Her parti banyoları kirletir ve tüketir: zincirin bir halkası bozulursa sonuç kazanda çıkar.</p></div>
  ${bath('deg', '#9fb4bd', 'Yağ alma', 'Degreasing', 'degreasing', 'Hedef: %3–6 konsantrasyon, 60–80 °C, yağ < 8 g/L',
    `<div class="grid2"><div><span class="small">Süre</span>${sl('data-set="deg.time"', b.deg.time, 5, 30, 1, ' dk')}</div><div><span class="small">Sıcaklık ayarı</span>${sl('data-set="deg.set"', b.deg.set, 40, 85, 1, ' °C')}</div></div>
     ${labBlock(['deg_ph', 'deg_alk', 'deg_temp', 'deg_oil'])}<div class="row">${actBtn('deg_add', 'Yağ alma kimyasalı ekle', 300, 'kg')}${actBtn('deg_skim', ch.skimmer === 'yes' ? 'Sıyırıcı + separatör çalıştır' : 'Elle yağ sıyır (1 saat)')}${actBtn('deg_dump', 'Banyoyu yenile')}</div>`)}
  ${bath('r1', '#a9d0e4', 'Durulama 1', 'Rinse 1', 'rinse', 'Hedef: pH < 9, iletkenlik < 3.000 µS/cm',
    `<div class="row"><label class="row small">Taşma (overflow) <select data-set="r1.flow">${[['low', 'Düşük'], ['med', 'Orta'], ['high', 'Yüksek']].map(([v, t]) => `<option value="${v}" ${b.r1.flow === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>${labBlock(['r1_ph'])}`)}
  ${bath('pick', '#cbc56e', `Asitleme (${ch.acid === 'hcl' ? 'HCl' : 'H₂SO₄'})`, 'Pickling', 'pickling', `Hedef: serbest asit 100–160 g/L (%10–15), Fe < 120 g/L. Banyo sıcaklığı (sensör): ${n(b.pick.temp, 1)} °C`,
    `<div><span class="small">Asitleme süresi</span>${sl('data-set="pick.time"', b.pick.time, 5, 120, 5, ' dk')}</div>
     ${labBlock(['pick_acid', 'pick_fe', 'pick_be'])}<div class="row">${actBtn('pick_hcl', 'Taze %32 HCl ekle', 5, 'm³')}${actBtn('pick_inh', 'İnhibitör dozajla', 40, 'kg')} ${I('inhibitor')}${actBtn('pick_regen', ch.acidRec === 'none' ? '%35 atığa + taze asit' : '%35 rejenerasyona + taze asit')}</div>`)}
  ${bath('r2', '#a9d0e4', 'Durulama 2', 'Rinse 2', 'rinse', `Hedef: Fe < 2 g/L. ${ch.cascade === 'yes' ? 'Kaskad aktif.' : 'Kaskad yok.'}`,
    `${labBlock(['r2_fe'])}<div class="row">${actBtn('r2_renew', 'Taze su ile yenile')}</div>`)}
  ${bath('flux', '#b5e0d6', 'Flux (ZnCl₂ · NH₄Cl)', 'Prefluxing', 'fluxing', 'Hedef: 12–18 °Bé, pH 4,2–4,8, ACN 0,45–0,65, Fe < 3 g/L, 50–65 °C',
    `<div class="grid2"><div><span class="small">Daldırma süresi</span>${sl('data-set="flux.time"', b.flux.time, 0.5, 5, 0.5, ' dk')}</div><div><span class="small">Sıcaklık ayarı</span>${sl('data-set="flux.set"', b.flux.set, 35, 75, 1, ' °C')}</div></div>
     ${labBlock(['flux_be', 'flux_acn', 'flux_ph', 'flux_fe', 'flux_temp'])}
     <div class="row">${actBtn('flux_double', 'Çift tuz', 500, 'kg')}${actBtn('flux_triple', 'Üçlü tuz', 500, 'kg')}${actBtn('flux_nh3', 'NH₄OH (pH ↑)', 100, 'L')}</div>
     <div class="row">${actBtn('flux_h2o2', ch.fluxFilter === 'yes' ? 'H₂O₂ oksidasyon + filtre pres' : 'H₂O₂ oksidasyon (filtresiz)')} ${I('fluxfilter')}${actBtn('flux_wet', 'Islatıcı (wetting agent)', 10, 'kg')} ${I('acn')}</div>`)}
  ${bath('oven', '#d9b38c', 'Kurutma fırını', 'Drying oven', 'oven', ch.oven === 'none' ? 'Fırın kurulmadı: parçalar ortam havasında kuruyor.' : 'Hedef: 80–110 °C. 130 °C üzeri flux yakar.',
    `${sl('data-set="oven.set"', b.oven.set, 60, 160, 5, ' °C', ch.oven === 'none' ? 'disabled' : '')}`)}`;
}
function pKettle() {
  const pr = S.prod, k = pr.kettle, o = pr.order, C = CAP[S.plant.cap];
  const lvl = k.zinc / S.plant.kT;
  const canDip = pr.stage === 'line' && o;
  const g = (a, v, cls = '') => `<div class="gauge ${cls}"><small>${a}</small><b>${v}</b></div>`;
  const tHint = o ? `Parça ${n(o.p.t)} mm → ısınma (kaynamanın durması) ≈ 1,2 + 0,28 × t = <b class="mono">${n(o.p.spin ? 1.2 : 1.2 + 0.28 * o.p.t, 1)} dk</b>` : 'Kural: kalın parça daha uzun bekler.';
  return (o ? orderHead(o) : '') + `<div class="panel"><div class="ph"><h2>Galvaniz kazanı <span class="en">Galvanizing kettle</span></h2>${I('kettleChem')}</div>
   <div class="grid3">${g('Banyo', n(k.temp, 0) + ' °C', 'hot')}${g('Çinko seviyesi', '%' + n(lvl * 100, 0) + ' · ' + n(k.zinc, 0) + ' t', lvl < 0.9 ? 'bad' : '')}${g('Kazan aşınma', '%' + n(S.plant.kettleWear, 1), S.plant.kettleWear > 80 ? 'bad' : '')}</div>
   <div class="field"><div class="flabel">Sıcaklık ayarı (termokupl) — işletme 445–455 °C</div>${sl('data-k="set"', k.set, 435, 475, 1, ' °C')}</div>
   <div class="field"><div class="flabel">Banyo kimyası (OES) ${I('nickel')} ${I('aluminium')} ${I('bismuth')}</div><p class="small muted">Hedef Ni %0,04–0,06 · Al %0,002–0,005 · Bi %0,05–0,10. Kazan ${n(k.zinc, 0)} t: %0,01 Ni için ≈ ${n(k.zinc * 0.1, 0)} kg Ni gerekir.</p>
     ${labBlock(['k_oes', 'k_dross'])}
     <div class="row">${actBtn('k_ni', 'Ni master alaşım', Math.round(k.zinc * 0.4), 'kg Ni')}${actBtn('k_al', 'Zn-Al', Math.round(k.zinc * 0.03), 'kg Al')}${actBtn('k_bi', 'Bi', Math.round(k.zinc * 0.6), 'kg Bi')}</div>
     <div class="row">${actBtn('k_zinc', `Stoktan külçe ekle (stok ${n(S.market.stock, 0)} t)`, Math.max(0, Math.round(S.plant.kT - k.zinc)), 't')} ${actBtn('k_dross', 'Dross temizliği (drossing grab)')} ${I('dross')}</div></div>
   <div class="field"><div class="flabel">Daldırma parametreleri ${I('dwell')} ${I('withdrawal')} ${I('skimming')}</div>
     <label class="row small"><input type="checkbox" data-k="preSkim" ${k.preSkim ? 'checked' : ''}> Daldırma öncesi kül sıyırma (pre-dip skimming)</label>
     <label class="row small">Daldırma hızı <select data-k="dipSpd"><option value="slow" ${k.dipSpd === 'slow' ? 'selected' : ''}>Yavaş</option><option value="normal" ${k.dipSpd === 'normal' ? 'selected' : ''}>Kontrollü (flux gazı çıkışı)</option><option value="fast" ${k.dipSpd === 'fast' ? 'selected' : ''}>Hızlı</option></select></label>
     <div><span class="small">Bekleme süresi (dwell time)</span>${sl('data-k="dwell"', k.dwell, 0.5, 15, 0.5, ' dk')}<p class="small muted">${tHint}</p></div>
     <label class="row small"><input type="checkbox" data-k="postSkim" ${k.postSkim ? 'checked' : ''}> Çekme öncesi kül sıyırma (post-dip skimming)</label>
     <div><span class="small">Çekme hızı (withdrawal)</span>${sl('data-k="vw"', k.vw, 0.5, 5, 0.1, ' m/dk')}<p class="small muted">Hedef 1,5–2,5 m/dk.</p></div>
     <label class="row small"><input type="checkbox" data-k="blow" ${k.blow ? 'checked' : ''}> Hava/buhar üfleme (boru içi, dişli bölgeler)</label></div>
   <div class="row" style="justify-content:space-between;margin-top:8px"><span class="small muted">${canDip ? `${n(o.tons)} t askı hazır.` : 'Daldırılacak askı yok.'} Kazan boyu ${C.kettle.L} m${o && o.len > C.kettle.L - 0.3 ? ' – <b style="color:var(--warn)">çift daldırma gerekli</b>' : ''}.</span>
   <button class="btn zinc" data-act="dip" ${canDip ? '' : 'disabled'}>Ön işlemden geçir, kurut ve daldır</button></div></div>`;
}
function pQC() {
  const x = needOrder('qc'); if (x) return x;
  const o = S.prod.order, c = o.coat, q = o.qc;
  if (!q.cooled) return orderHead(o) + `<div class="panel"><h2>Soğutma & pasivasyon <span class="en">Quench & passivation</span></h2>
    <p class="small muted">Daldırma tamamlandı (${n(c.hrs, 1)} saat hat süresi). Soğutma yöntemi Fe-Zn difüzyonunun durup durmayacağını belirler.</p>
    <div class="opts" style="margin-top:8px"><label class="opt"><input type="radio" name="cool" value="quench" checked><span>Su ile soğutma (quench)<small>Alaşım büyümesini durdurur, parlak yüzey</small></span></label><label class="opt"><input type="radio" name="cool" value="air"><span>Havada soğutma<small>Kalın ve reaktif çelikte alaşım büyümeye devam eder</small></span></label></div>
    <label class="opt" style="margin-top:8px;max-width:440px"><input type="checkbox" id="passiv" checked><span>Kromatsız pasivasyon (beyaz pas önleme) ${I('whiteRust')}</span></label>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn primary" data-act="cool">Soğut → Kalite kontrol</button></div></div>`;
  const iso = q.iso, vis = o.defects;
  const phases = c.reactive ? [['Γ', 3, '#5d6b75'], ['δ', 22, '#7d8c96'], ['ζ', 75, '#a0aeb6'], ['η', 0, '#dfe5e8']] : [['Γ', 4, '#5d6b75'], ['δ', 38, '#7d8c96'], ['ζ', 58, '#a0aeb6']];
  const tot = c.alloy + c.eta;
  const pbar = phases.map(([nm, p, col]) => [nm, c.alloy * p / 100, col]).concat([['η', c.eta, '#dfe5e8']]).filter(p => p[1] > 0.5);
  const anyCrit = vis.some(v => v.sev === 'crit' && v.id !== 'explode');
  return orderHead(o) + `<div class="panel"><div class="ph"><h2>Kalite kontrol <span class="en">ISO 1461 inspection</span></h2>${I('iso1461')}</div>
   <div class="row"><button class="btn sm" data-act="qc-thk">Kalınlık ölçümü (Elcometer)</button>${I('elcometer')}<button class="btn sm" data-act="qc-metal">Metalografik kesit ${S.plant.ch.lab === 'full' ? '$40' : '(dış lab $350)'}</button>${I('metallography')}<button class="btn sm" data-act="qc-hammer">Çekiç testi</button>${I('hammer')}</div>
   ${q.tests.thk ? `<div class="sep"></div><h4>Kaplama kalınlığı – ${iso.label}: yerel ≥ ${iso.local} µm, ortalama ≥ ${iso.mean} µm</h4>
     <div class="tbl-wrap"><table><thead><tr>${q.readings.map((_, i) => `<th class="r">${i + 1}</th>`).join('')}<th class="r">Ort.</th><th class="r">Min</th></tr></thead><tbody><tr>${q.readings.map(r => `<td class="r" style="${r < iso.local ? 'color:var(--crit)' : ''}">${r}</td>`).join('')}<td class="r"><b>${n(q.mean, 0)}</b></td><td class="r">${q.min}</td></tr></tbody></table></div>
     <p class="small">${q.mean >= iso.mean && q.min >= iso.local ? '<span class="pill ok">ISO 1461 UYGUN</span>' : '<span class="pill crit">ISO 1461 UYGUN DEĞİL</span>'}</p>` : ''}
   ${q.tests.metal ? `<div class="sep"></div><h4>Metalografik kesit (%2 nital) – toplam ≈ ${n(tot, 0)} µm</h4><div class="phase">${pbar.map(([nm, v, col]) => `<div style="width:${v / tot * 100}%;background:${col}" title="${nm}: ${n(v, 0)} µm">${v / tot > 0.08 ? nm + ' ' + n(v, 0) : ''}</div>`).join('')}</div>
     <p class="small muted" style="margin-top:4px">Çelik ← Γ (Fe₃Zn₁₀) · δ (FeZn₁₀) · ζ (FeZn₁₃) · η (saf Zn) → yüzey. ${c.eta < 4 ? 'η tabakası yok: alaşım yüzeye çıkmış, mat gri görünüm.' : c.reactive ? 'Kolonlu ζ büyümesi: Sandelin reaktivitesi.' : 'Kompakt alaşım tabakası, yeterli η.'}</p>` : ''}
   ${q.tests.hammer ? `<div class="sep"></div><p>${vis.some(v => v.id === 'flake') ? '<span class="pill crit">BAŞARISIZ</span> Kaplama darbe bölgesinde pul pul ayrıldı (delamination).' : '<span class="pill ok">BAŞARILI</span> Kaplamada ayrılma yok.'}</p>` : ''}
   <div class="sep"></div><h4>Görsel muayene ve CAPA <span class="en">Root cause & corrective action</span></h4>
   ${vis.length ? `<div class="stack" style="margin-top:8px">${vis.map((v, i) => `<div class="alert ${v.sev === 'crit' ? 'crit' : v.sev === 'major' ? 'warn' : 'info'}"><span class="lv">${v.sev === 'crit' ? 'KRİTİK' : v.sev === 'major' ? 'MAJÖR' : 'MİNÖR'}</span><span style="flex:1;min-width:0">${v.t}<br><select data-capa="${i}" style="margin-top:4px;width:100%"><option value="">Kök neden seçin…</option>${ROOT_CAUSES.map(([k, t]) => `<option value="${k}" ${v.pick === k ? 'selected' : ''}>${t}</option>`).join('')}</select></span>${I(v.enc)}</div>`).join('')}</div>` : '<div class="alert ok"><span class="lv">OK</span><span>Görsel kusur yok. Düzgün, sürekli kaplama.</span></div>'}
   <div class="sep"></div><h4>Parti çinko dengesi <span class="en">Zinc balance</span> ${I('pickup')}</h4>
   <dl class="kv"><dt>Kaplama (${n(c.area, 0)} m²)</dt><dd>${n(c.coatKg, 0)} kg</dd><dt>Akıntı / damla</dt><dd>${n(c.dripKg, 0)} kg</dd><dt>Dip dross</dt><dd>${n(c.drossKg, 0)} kg</dd><dt>Kül</dt><dd>${n(c.ashKg, 0)} kg</dd><dt>Toplam / sarfiyat oranı</dt><dd><b>${n(c.used, 0)} kg · %${n(c.pickup, 2)}</b></dd></dl>
   <div class="row" style="justify-content:flex-end;margin-top:12px">${anyCrit ? `<button class="btn" data-act="ship-rework">Rework (yeniden galvaniz) ve sevk et</button>` : ''}<button class="btn primary" data-act="ship">${anyCrit ? 'Olduğu gibi sevk et' : 'Sevk et ve faturala'}</button></div></div>`;
}
function pMarket() {
  const m = S.market, pr = S.prod, st = pr.stats, pl = S.pl;
  const hist = m.hist.concat([m.lme]).map((v, i) => [i, v]);
  const mn = Math.floor(Math.min(...hist.map(h => h[1])) / 100) * 100 - 100, mx = Math.ceil(Math.max(...hist.map(h => h[1])) / 100) * 100 + 100;
  const pk = pr.hist.map(h => [h.b, h.pick]);
  const net = pl.revenue + pl.byprod * -1 - pl.zinc - pl.chem - pl.energy - pl.labor - pl.other;
  return `<div class="panel" data-tut="market"><div class="ph"><h2>LME çinko <span class="en">LME zinc cash + premium</span></h2>${I('lme')}</div>
    <div class="grid3"><div class="gauge"><small>LME nakit</small><b>$${m.lme.toLocaleString('tr-TR')}</b></div><div class="gauge"><small>Bölgesel prim</small><b>$${m.prem}</b></div><div class="gauge hot"><small>Teslim külçe</small><b>$${zincPrice().toLocaleString('tr-TR')}</b></div></div>
    ${lineChart({ series: [{ pts: hist, c: 'zinc', area: true }], xmin: 0, xmax: Math.max(10, hist.length - 1), ymin: mn, ymax: mx, h: 170, yt: [mn, Math.round((mn + mx) / 200) * 100, mx], xl: 'gün' })}
    <div class="row" style="margin-top:8px"><span class="small">SHG külçe al:</span>${[25, 50, 100].map(t => `<button class="btn sm" data-act="buy" data-t="${t}">${t} t · ${usd(t * zincPrice())}</button>`).join('')}<span class="small muted">Stok: <b class="mono">${n(m.stock, 0)} t</b></span></div></div>
  <div class="panel"><h3>Yan ürünler <span class="en">By-products</span></h3><div class="grid2" style="margin-top:8px">
    <div class="stack"><b>Çinko külü ${I('ash')}</b><span class="mono">${n(m.ashKg / 1000, 2)} t · ≈ ${usd(m.ashKg / 1000 * m.lme * 0.45)}</span><button class="btn sm" data-act="sell-ash" ${m.ashKg > 0 ? '' : 'disabled'}>Geri kazanım firmasına sat (LME × 0,45)</button></div>
    <div class="stack"><b>Dip dross ${I('dross')}</b><span class="mono">${n(m.drossKg / 1000, 2)} t · ≈ ${usd(m.drossKg / 1000 * m.lme * 0.68)}</span><button class="btn sm" data-act="sell-dross" ${m.drossKg > 0 ? '' : 'disabled'}>Sat (LME × 0,68)</button></div></div></div>
  <div class="panel"><h3>Kâr / zarar (işletme başından) <span class="en">Operating P&L</span></h3><dl class="kv" style="margin-top:8px">
    <dt>Galvaniz hizmet geliri</dt><dd>${usd(pl.revenue)}</dd><dt>Yan ürün satışı</dt><dd>${usd(-pl.byprod)}</dd><dt>Çinko</dt><dd>−${usd(pl.zinc)}</dd><dt>Kimyasal & laboratuvar</dt><dd>−${usd(pl.chem)}</dd><dt>Enerji (doğalgaz)</dt><dd>−${usd(pl.energy)}</dd><dt>İşçilik & genel gider</dt><dd>−${usd(pl.labor)}</dd><dt>Arıza, ceza, diğer</dt><dd>−${usd(pl.other)}</dd><dt><b>Net işletme sonucu</b></dt><dd><b style="color:var(--${net < 0 ? 'crit' : 'ok'})">${usd(net)}</b></dd><dt>EPC yatırımı</dt><dd>${usd(pl.capex)}</dd></dl></div>
  <div class="panel"><h3>KPI</h3><div class="grid3" style="margin-top:8px"><div class="gauge"><small>Galvanizlenen</small><b>${n(st.tons, 0)} t</b></div><div class="gauge ${st.tons && st.zinc / st.tons * 100 > 7.5 ? 'bad' : ''}"><small>Ort. sarfiyat</small><b>%${st.tons ? n(st.zinc / st.tons * 100, 2) : '–'}</b></div><div class="gauge"><small>Kusursuz parti</small><b>${st.batches ? n(st.pass / st.batches * 100, 0) + '%' : '–'}</b></div></div>
    ${pk.length > 1 ? lineChart({ series: [{ pts: pk, c: 'steel' }], xmin: pk[0][0], xmax: pk[pk.length - 1][0], ymin: 0, ymax: 14, h: 150, yt: [0, 5.5, 7.5, 14], refs: [{ v: 7.5, t: '%7,5', c: 'warn' }], xl: 'parti' }) : '<p class="small muted" style="margin-top:8px">Sarfiyat eğrisi ilk iki partiden sonra çizilir.</p>'}
    <p class="small muted">Not: kalın kesitlerde sarfiyat doğal olarak düşük, ince saclarda yüksektir. %5,5–7,5 karışık ürün profili için referanstır.</p></div>
  ${pr.results.length ? `<div class="panel"><h3>Sevkiyatlar</h3><div class="tbl-wrap"><table><thead><tr><th>Gün</th><th>Sipariş</th><th>Ürün</th><th class="r">t</th><th class="r">µm</th><th class="r">Zn %</th><th class="r">Kusur</th><th class="r">CAPA</th><th class="r">Gelir</th></tr></thead><tbody>${pr.results.map(r => `<tr><td class="r">${r.day}</td><td class="mono">${r.id}</td><td>${esc(r.prod)}</td><td class="r">${n(r.tons)}</td><td class="r">${n(r.mean, 0)}</td><td class="r">${n(r.pickup, 2)}</td><td class="r">${r.crit ? `<span class="pill crit">${r.defects}</span>` : r.defects ? `<span class="pill warn">${r.defects}</span>` : '<span class="pill ok">0</span>'}</td><td class="r">${r.capa}</td><td class="r">${usd(r.rev)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}
function pLog() { return `<div class="panel"><h2>Vardiya kayıtları <span class="en">Shift log</span></h2><div class="log" style="max-height:none;margin-top:10px">${S.log.map(l => `<div><span class="tm">G${l.d} ${String(l.h).padStart(2, '0')}:00</span><span class="${l.lvl}">${esc(l.t)}</span></div>`).join('')}</div></div>`; }
function prodSide() {
  const k = S.prod.kettle, P = S.plant;
  return `<div class="panel"><div class="ph"><h4>Tesis</h4><span class="small muted">Gün ${S.day}</span></div>${isoSVG({ kettleLevel: clamp(k.zinc / P.kT, 0, 1) * 0.92, hot: true })}
    <dl class="kv"><dt>Kazan çinko</dt><dd>${n(k.zinc, 0)} / ${P.kT} t</dd></dl><div class="meter z" style="margin:4px 0 8px"><i style="width:${clamp(k.zinc / P.kT * 100, 0, 100)}%"></i></div>
    <dl class="kv"><dt>Kazan duvar aşınması (UT)</dt><dd>%${n(P.kettleWear, 1)}</dd></dl><div class="meter ${P.kettleWear > 80 ? 'c' : ''}" style="margin:4px 0 8px"><i style="width:${clamp(P.kettleWear, 0, 100)}%"></i></div>
    <dl class="kv"><dt>Külçe stoğu</dt><dd>${n(S.market.stock, 0)} t</dd><dt>Kül / dross bidonu</dt><dd>${n(S.market.ashKg / 1000, 1)} / ${n(S.market.drossKg / 1000, 1)} t</dd><dt>Galvanizlenen</dt><dd>${n(S.prod.stats.tons, 0)} t</dd></dl></div>
   ${(() => { const m = mentorNotes(); return m.length ? `<div class="panel"><h4>Mentör notları <span class="en">Shift advisor</span></h4><div class="stack small" style="margin-top:8px">${m.map(([l, t]) => `<div class="alert ${l}"><span class="lv">${LV[l]}</span><span>${t}</span></div>`).join('')}</div><p class="small muted" style="margin-top:6px">Yalnızca sizin ölçtüğünüz değerlere dayanır.</p></div>` : ''; })()}
   <div class="panel"><h4>Son olaylar</h4><div class="log" style="margin-top:6px">${S.log.slice(0, 9).map(l => `<div><span class="tm">G${l.d} ${String(l.h).padStart(2, '0')}:00</span><span class="${l.lvl}">${esc(l.t)}</span></div>`).join('')}</div></div>`;
}

/* ================= VIEW 4 – ENCYCLOPEDIA ================= */
function viewEnc() {
  const q = U.encQ.toLowerCase();
  const items = Object.entries(ENC).filter(([k, e]) => !q || (e.tr + ' ' + e.en + ' ' + (e.f || '') + ' ' + e.p).toLowerCase().includes(q));
  return `<div class="panel"><div class="ph"><h2>Teknik ansiklopedi & hata teşhis rehberi <span class="en">Technical encyclopedia</span></h2><span class="small muted">${Object.keys(ENC).length} madde · TR / EN</span></div>
    <input type="search" id="encq" placeholder="Ara: flux, Sandelin, dross, ISO 1461…" value="${esc(U.encQ)}" style="width:100%;max-width:420px"></div>
   <div class="encgrid" style="margin-top:14px">${items.map(([k, e]) => `<button class="encitem" data-enc="${k}"><b>${e.tr}</b><span class="en">${e.en}</span>${e.f ? `<span class="mono small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.f)}</span>` : ''}</button>`).join('')}</div>
   <div class="panel" style="margin-top:14px"><h3>Hata teşhis matrisi <span class="en">Defect troubleshooting</span></h3><div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Kusur</th><th>Olası kök nedenler (zincir)</th><th>Laboratuvar kanıtı</th></tr></thead><tbody>
    <tr><td>Çıplak bölge <span class="en">bare spots</span></td><td>Yağ alma zayıf → asit çalışmaz → flux tutmaz; flux Bé/pH düşük; kurutma >130 °C; Al > %0,007; boya/cüruf</td><td>Alkalinite, yağ g/L, serbest asit, Fe, flux Bé/pH, OES Al</td></tr>
    <tr><td>Dross kabarcıkları <span class="en">dross pimples</span></td><td>Asit Fe yüksek → durulama 2 kirli → flux Fe ↑ → kazanda dross; yüksek banyo sıcaklığı; dross temizliği gecikmiş</td><td>Asit Fe, durulama 2 Fe, flux Fe, dross sondajı</td></tr>
    <tr><td>Mat gri, kalın <span class="en">dull grey</span></td><td>Sandelin pik / hiper çelik, Ni eksik, yüksek sıcaklık, havada yavaş soğuma</td><td>MTC Si+2,5P, OES Ni, metalografi (η yok)</td></tr>
    <tr><td>Soyulma <span class="en">flaking</span></td><td>> 250 µm kırılgan ζ, reaktif çelik + uzun dwell</td><td>Elcometer, çekiç testi, metalografi</td></tr>
    <tr><td>Kül yapışması <span class="en">ash inclusion</span></td><td>Sıyırma yapılmadı, flux Bé çok yüksek, ACN yüksek</td><td>Flux Bé, ACN</td></tr>
    <tr><td>Akıntı/sarkıt <span class="en">runs/icicles</span></td><td>Drenaj açısı < 10°, hızlı çekme, düşük banyo sıcaklığı, Bi eksik</td><td>Proses kaydı, OES Bi</td></tr>
    <tr><td>Beyaz pas <span class="en">white rust</span></td><td>Pasivasyonsuz su soğutma, ıslak istif</td><td>Görsel</td></tr>
    <tr><td>Patlama <span class="en">explosion</span></td><td>Kapalı hacimde delik yok veya çok küçük</td><td>Çizim, kabul kontrolü</td></tr></tbody></table></div></div>`;
}
function openEnc(k) {
  const e = ENC[k]; if (!e) return;
  const m = $('#modal');
  m.innerHTML = `<div class="card enc" role="dialog" aria-modal="true" aria-label="${esc(e.tr)}"><div class="ph"><div><h2>${e.tr}</h2><span class="en">${e.en}</span></div><button class="btn sm" data-act="close">Kapat</button></div>
   ${e.f ? `<div class="formula">${esc(e.f)}</div>` : ''}<p><b>Çalışma prensibi.</b> ${e.p}</p>${e.tip ? `<div class="tip"><b>Saha ipucu.</b> ${e.tip}</div>` : ''}</div>`;
  m.hidden = false; m.querySelector('button')?.focus();
}
function showNextEvent() {
  const m = $('#modal'); if (!m.hidden || !EVQ.length) return;
  const ev = EVQ[0];
  if (U.timer) { clearInterval(U.timer); U.timer = null; if (S.comm) S.comm.A.running = false; }
  m.innerHTML = `<div class="card ${ev.lvl}" role="alertdialog" aria-modal="true"><div class="ph"><h2>${ev.title}</h2>${ev.enc ? I(ev.enc) : ''}</div><p>${ev.body}</p><div class="stack">${ev.choices.map((c, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-evc="${i}" style="justify-content:flex-start;text-align:left">${c.t}</button>`).join('')}</div></div>`;
  m.hidden = false;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; showNextEvent(); }

/* ---------------- event wiring ---------------- */
function autoRun(on) {
  const A = S.comm.A;
  if (U.timer) { clearInterval(U.timer); U.timer = null; }
  A.running = on;
  if (on) U.timer = setInterval(() => { commTick(1); if (!A.running || S.comm.done || A.dmg >= 100) { clearInterval(U.timer); U.timer = null; A.running = false; render(); } }, 450);
}
function commTick(h) {
  const A = S.comm.A;
  for (let i = 0; i < h; i++) { commStep(1); const bs = bulkState(A); (A.hist = A.hist || []).push([A.hr, +A.wall.toFixed(1), +bs.T.toFixed(1)]); if (A.hist.length > 400) A.hist.shift(); if (!$('#modal').hidden) break; }
  if (S.mode === 'comm' && $('#comm-live') && S.comm.method === 'A' && !S.comm.done) { $('#comm-live').innerHTML = commLive(); $('#comm-rules').innerHTML = commRules(); renderChips(); tutUpdate(); save(); }
  else render();
}
document.addEventListener('click', e => {
  const t = e.target.closest('button,[data-enc]'); if (!t) { if (e.target.id === 'modal' && !EVQ.length && S.tut) closeModal(); return; }
  if (t.dataset.evc != null) { const ev = EVQ.shift(); $('#modal').hidden = true; ev.choices[+t.dataset.evc].fn(); render(); showNextEvent(); return; }
  if (t.dataset.enc && !t.dataset.act) { openEnc(t.dataset.enc); return; }
  if (t.dataset.mode) { S.mode = t.dataset.mode; if (S.mode === 'prod' && S.prod) U.ptab = STAGE_TAB[S.prod.stage] || 'rfq'; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.step != null) { S.epc.step = +t.dataset.step; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.ptab) { U.ptab = t.dataset.ptab; render(); return; }
  if (t.dataset.lab) { runLab(t.dataset.lab); checkDay(); render(); return; }
  if (t.dataset.do) { const inp = $('#amt-' + t.dataset.do); const amt = inp ? Math.max(0, +inp.value || 0) : 0; act(t.dataset.do, amt); toast('Uygulandı: ' + t.textContent.trim(), 'ok'); render(); return; }
  const a = t.dataset.act; if (!a) return;
  const pr = S.prod;
  switch (a) {
    case 'close': closeModal(); return;
    case 'reset': case 'hdr-reset':
      if (a === 'hdr-reset' && !U.confirmReset) { U.confirmReset = true; renderHdr(); setTimeout(() => { U.confirmReset = false; renderHdr(); }, 4000); return; }
      U.confirmReset = false; if (U.timer) clearInterval(U.timer); U.timer = null; S = newState(); EVQ = []; U.lsel = null; U.placing = null; render(); welcomeModal(); return;
    case 'hdr-mode': S.simple = t.dataset.v === '1'; if (S.simple && S.comm && !S.comm.done && S.comm.method !== 'A') S.comm.method = 'A'; window.scrollTo(0, 0); break;
    case 'hdr-tut': if (!S.tut) S.tut = { on: true, i: 0 }; else { S.tut.on = !S.tut.on; if (S.tut.i >= TUT.length) S.tut.i = 0; S.tut.min = false; } break;
    case 'tpl': S.epc.layout = autoLayout(t.dataset.k); U.lsel = null; U.placing = null; toast(`${t.textContent} şablonu yerleştirildi. Şimdi düzenleyin.`, 'ok'); break;
    case 'tpl-clear': S.epc.layout = { items: {} }; U.lsel = null; break;
    case 'lpick': U.placing = U.placing === t.dataset.id ? null : t.dataset.id; U.lsel = null; break;
    case 'lcancel': U.placing = null; break;
    case 'lrot': layoutRotate(); return;
    case 'ldel': delete S.epc.layout.items[U.lsel]; U.lsel = null; break;
    case 'epc-reco': Object.assign(S.epc.ch, RECOMMENDED); toast('Önerilen yapılandırma yüklendi.', 'ok'); break;
    case 'epc-confirm': confirmEPC(); break;
    case 'comm-A': S.comm.method = 'A'; break;
    case 'comm-B': S.comm.method = 'B'; break;
    case 'comm-back': S.comm.method = null; break;
    case 'ingot-center': commAddIngot('center'); commTick(0); return;
    case 'ingot-side': commAddIngot('side'); commTick(0); return;
    case 'alloy-early': commAlloyEarly(); commTick(0); return;
    case 'comm-recover': commRecover(); return;
    case 'hr1': commTick(1); return;
    case 'hr6': commTick(6); return;
    case 'comm-reset': S.market.stock += Math.round(S.comm.A.m * 0.9); S.comm = newComm(); S.mode = 'comm'; logMsg('Devreye alma baştan başlatıldı; kazandaki çinko donduruldu, %90’ı külçe stoğuna alındı.', 'warn'); break;
    case 'auto': autoRun(!S.comm.A.running); break;
    case 'comm-finish-A': autoRun(false); commFinish('A'); U.ptab = 'rfq'; break;
    case 'hf': S.comm.B.order.push(t.dataset.id); break;
    case 'hf-reset': S.comm.B.order = []; break;
    case 'comm-runB': commMethodB(); break;
    case 'comm-finish-B': commFinish('B'); U.ptab = 'rfq'; break;
    case 'quote': if (submitQuote(+t.dataset.i)) { U.ptab = 'recv'; toast('Teklif kabul edildi.', 'ok'); } else toast('Teklif reddedildi.', 'warn'); checkDay(); break;
    case 'rfq-skip': pr.rfqs.splice(+t.dataset.i, 1); fillRFQs(); break;
    case 'recv-ok': {
      const o = pr.order, d = o.dec;
      if (d.ventAct === 'reject') { logMsg(`${o.id} reddedildi (kapalı hacim güvenliği).`, 'warn'); pr.order = null; pr.stage = 'rfq'; U.ptab = 'rfq'; if (o.vent === 'ok') S.rep -= 2; break; }
      if (d.ventAct === 'drill') { spend(35 * o.tons, 'other'); S.hour += 1; o.vent = 'ok'; }
      if (d.blast) S.hour += o.tons / 12;
      logMsg(`${o.id} kabul: Si_eq = ${n(o.se, 3)} → ${SANDELIN.find(c => c.v === o.cls).t}. ${d.cls === o.cls ? 'Sınıflandırma doğru.' : 'Sınıflandırmanız hatalıydı (' + SANDELIN.find(c => c.v === d.cls).t + ').'}`, d.cls === o.cls ? 'ok' : 'warn');
      pr.stage = 'jig'; U.ptab = 'jig'; checkDay(); break; }
    case 'jig-ok': { const d = pr.order.dec; if (d.orient === 'flat') d.angle = Math.min(d.angle, 3); pr.stage = 'line'; U.ptab = 'pre'; S.hour += 0.4; checkDay(); break; }
    case 'dip': dipBatch(); U.ptab = 'qc'; toast('Daldırma tamamlandı.', 'ok'); break;
    case 'cool': { const m = document.querySelector('input[name=cool]:checked')?.value || 'quench'; coolBatch(m, $('#passiv').checked); break; }
    case 'qc-thk': qcTest('thk'); break;
    case 'qc-metal': qcTest('metal'); break;
    case 'qc-hammer': qcTest('hammer'); break;
    case 'ship': case 'ship-rework': { const o = pr.order; const tot = o.defects.length, ok = o.defects.filter(x => x.pick === x.cause).length; shipBatch(a === 'ship-rework'); if (tot) toast(`CAPA: ${ok}/${tot} kök neden doğru.`, ok === tot ? 'ok' : 'warn'); U.ptab = 'rfq'; break; }
    case 'buy': act('buy_zinc', +t.dataset.t); break;
    case 'sell-ash': act('sell_ash'); break;
    case 'sell-dross': act('sell_dross'); break;
  }
  render();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.type === 'range') { const out = t.closest('.slider')?.querySelector('output'); if (out) out.textContent = t.value + (t.dataset.unit || ''); }
  if (t.id === 'comm-power') S.comm.A.power = +t.value;
  if (t.id === 'encq') { U.encQ = t.value; const pos = t.selectionStart; render(); const q = $('#encq'); q.focus(); q.setSelectionRange(pos, pos); }
});
document.addEventListener('change', e => {
  const t = e.target, ds = t.dataset;
  if (ds.epc) { const f = EPC_STEPS.flatMap(s => s.fields).find(f => f.key === ds.epc); const numeric = f.type === 'number' || typeof f.opts[0].v === 'number'; S.epc.ch[ds.epc] = numeric ? +t.value : t.value; render(); return; }
  if (ds.b) { const B = S.comm.B; B[ds.b] = t.type === 'checkbox' ? t.checked : +t.value; render(); return; }
  if (ds.set) { const [bn, key] = ds.set.split('.'); S.prod.baths[bn][key] = t.tagName === 'SELECT' ? t.value : +t.value; save(); return; }
  if (ds.k) { const k = S.prod.kettle; k[ds.k] = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : +t.value; if (ds.k === 'set') { k.temp = k.set; renderChips(); } save(); return; }
  if (ds.dec) { const d = S.prod.order.dec; d[ds.dec] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; if (t.type === 'range') { save(); return; } render(); return; }
  if (ds.quote != null) { S.prod.rfqs[+ds.quote].quote = +t.value; save(); return; }
  if (ds.flag) { const [i, k] = ds.flag.split('|'); const q = S.prod.rfqs[+i]; q.flags = t.checked ? [...new Set([...q.flags, k])] : q.flags.filter(x => x !== k); render(); return; }
  if (ds.capa != null) { S.prod.order.defects[+ds.capa].pick = t.value; save(); return; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').hidden && !EVQ.length && S.tut) { closeModal(); return; }
  if (e.key === 'Escape' && U.placing) { U.placing = null; render(); return; }
  if (layoutKey(e)) e.preventDefault();
});

/* ---------------- boot ---------------- */
function start(data) {
  S = (data && data.S && data.S.v === 4) ? data.S : (load() || newState());
  if (S.simple === undefined) S.simple = true;
  if (S.comm && S.comm.A) S.comm.A.running = false;
  render();
  if (!S.tut) welcomeModal();
  else if (S.comm && !S.comm.done) { commRecover(); render(); }
  else if (S.plant && S.plant.breach) { commRecover(); }
}
window.claude?.hot?.snapshot?.(() => ({ S }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
