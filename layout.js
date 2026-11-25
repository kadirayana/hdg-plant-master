'use strict';
/* =========================================================
   Plot plan (layout) — player-defined equipment placement
   Coordinates in metres on a 96 × 48 m plot. rot 0: tank long axis along y.
   ========================================================= */
const PLOT = { W: 96, H: 48 };
const LDEF = {
  recv:   { t: 'Kabul & askılama alanı', s: 'KABUL', col: '#cfc6ae', h: 0.15, zone: true, enc: 'jig', lvl: 2 },
  deg:    { t: 'Yağ alma tankı', s: 'YAĞ', col: '#9fb4bd', h: 1.6, liq: '#9fb4bd', enc: 'degreasing', lvl: 3, pre: true },
  r1:     { t: 'Durulama 1', s: 'D1', col: '#a9d0e4', h: 1.6, liq: '#a9d0e4', enc: 'rinse', lvl: 3, pre: true },
  pick:   { t: 'Asit tankı', s: 'ASİT', col: '#cbc56e', h: 1.6, liq: '#cbc56e', enc: 'pickling', lvl: 3, pre: true, acid: true },
  r2:     { t: 'Durulama 2', s: 'D2', col: '#a9d0e4', h: 1.6, liq: '#a9d0e4', enc: 'rinse', lvl: 3, pre: true },
  flux:   { t: 'Flux tankı', s: 'FLUX', col: '#b5e0d6', h: 1.6, liq: '#b5e0d6', enc: 'fluxing', lvl: 3, pre: true },
  oven:   { t: 'Kurutma fırını', s: 'KURUTMA', col: '#d9b38c', h: 2, enc: 'oven', lvl: 4, pre: true },
  kettle: { t: 'Galvaniz fırını (ocak) + kazan', s: 'FIRIN+KAZAN', col: '#8f9ba3', h: 1.4, liq: 'zinc', enc: 'kettle', lvl: 4 },
  cool:   { t: 'Soğutma & pasivasyon', s: 'SOĞ', col: '#86b6cf', h: 1.6, liq: '#86b6cf', enc: 'whiteRust', lvl: 3 },
  ship:   { t: 'Sevk & stok alanı', s: 'SEVK', col: '#b9cbb3', h: 0.15, zone: true, enc: 'iso1461', lvl: 2 },
  qc:     { t: 'QC laboratuvarı', s: 'LAB', col: '#c7c0d6', h: 3, enc: 'lab', lvl: 5 },
  neut:   { t: 'Nötralizasyon tesisi', s: 'NÖTR', col: '#b4c9c0', h: 2.5, enc: 'neut', lvl: 5 },
  bag:    { t: 'Torba filtre', s: 'FİLTRE', col: '#bdb6a8', h: 5, enc: 'fume', lvl: 5 },
  spin:   { t: 'Santrifüj hattı', s: 'SPİN', col: '#a3adb3', h: 1.8, liq: 'zinc', enc: 'spin', lvl: 5 },
  arec:   { t: 'Asit geri kazanım', s: 'ASİT GK', col: '#d3cc90', h: 3, enc: 'acidrec', lvl: 5 },
  zinc:   { t: 'Çinko külçe stoğu', s: 'Zn', col: '#aab3b8', h: 1.2, enc: 'ingot', lvl: 5 }
};
function requiredItems(ch) {
  const C = CAP[ch.capacity], L = Math.ceil(C.kettle.L + 1), out = [];
  const add = (id, type, w, d, lb) => out.push({ id, type, w, d, lb: lb || LDEF[type].s });
  add('recv', 'recv', 8, L); add('deg', 'deg', 2, L); add('r1', 'r1', 2, L);
  for (let i = 1; i <= +ch.pickN; i++) add('pick' + i, 'pick', 2, L, 'ASİT' + i);
  add('r2', 'r2', 2, L); add('flux', 'flux', 2, L);
  if (ch.oven !== 'none') add('oven', 'oven', 4, L);
  add('kettle', 'kettle', Math.ceil(C.kettle.W + 2.4), Math.ceil(C.kettle.L + 2.4));
  add('cool', 'cool', 2, L); add('ship', 'ship', 8, L); add('qc', 'qc', 6, 5);
  if (ch.neut === 'yes') add('neut', 'neut', 8, 6);
  if (ch.fume !== 'none') add('bag', 'bag', 5, 4);
  if (ch.spin === 'yes') add('spin', 'spin', 5, 5);
  if (ch.acidRec !== 'none') add('arec', 'arec', 5, 4);
  add('zinc', 'zinc', 5, 5);
  return out;
}
const seqIds = ch => ['recv', 'deg', 'r1', ...Array.from({ length: +ch.pickN }, (_, i) => 'pick' + (i + 1)), 'r2', 'flux', ...(ch.oven !== 'none' ? ['oven'] : []), 'kettle', 'cool', 'ship'];
function layItems(ch, lay) {
  ch = ch || S.epc.ch; lay = lay || S.epc.layout;
  return requiredItems(ch).map(r => {
    const p = lay.items[r.id], rot = p ? p.rot : 0;
    return { ...r, rot, w: rot ? r.d : r.w, d: rot ? r.w : r.d, x: p ? p.x : null, y: p ? p.y : null, placed: !!p };
  });
}
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
const inPlot = a => a.x >= 0 && a.y >= 0 && a.x + a.w <= PLOT.W && a.y + a.d <= PLOT.H;
function gap(a, b) { const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), dy = Math.max(0, a.y - (b.y + b.d), b.y - (a.y + a.d)); return Math.hypot(dx, dy); }
const ctr = a => [a.x + a.w / 2, a.y + a.d / 2];
function fits(it, all) { return inPlot(it) && all.every(o => o.id === it.id || !o.placed || !overlaps(it, o)); }

/* ---------- templates ---------- */
function autoLayout(kind, ch) {
  ch = ch || S.epc.ch;
  const req = requiredItems(ch), byId = Object.fromEntries(req.map(r => [r.id, r]));
  const items = {}, seq = seqIds(ch);
  const cut = (seq.includes('oven') ? seq.indexOf('oven') : seq.indexOf('flux')) + 1; // drying oven belongs to the pretreatment row, parallel to the tanks
  const pre = seq.slice(0, cut), post = seq.slice(cut);
  const sz = (id, rot) => rot ? [byId[id].d, byId[id].w] : [byId[id].w, byId[id].d];
  const gp = id => (LDEF[byId[id].type].zone ? 2 : 1);
  let x = 2, y0 = 3;
  if (kind === 'I') {
    seq.forEach(id => { items[id] = { x, y: y0, rot: 0 }; x += sz(id, 0)[0] + gp(id); });
  } else if (kind === 'L') {
    pre.forEach(id => { items[id] = { x, y: y0, rot: 0 }; x += sz(id, 0)[0] + gp(id); });
    let y = y0; const cx = x + 1;
    post.forEach(id => { items[id] = { x: cx, y, rot: 1 }; y += sz(id, 1)[1] + gp(id); });
  } else { // U: pretreatment row incl. drying oven, hot row returning to the entry side
    pre.forEach(id => { items[id] = { x, y: y0, rot: 0 }; x += sz(id, 0)[0] + gp(id); });
    const xEnd = x - 1, y1 = y0 + byId.deg.d + 3, rest = post;
    let xr = xEnd;
    rest.forEach(id => { const [w] = sz(id, 0); xr -= w; items[id] = { x: Math.max(0, xr), y: y1, rot: 0 }; xr -= gp(id); });
  }
  const lay = { items };
  const placed = () => layItems(ch, lay).filter(i => i.placed);
  const near = { qc: 'ship', neut: 'pick1', bag: 'kettle', spin: 'kettle', arec: 'pick1', zinc: 'kettle' };
  req.filter(r => !items[r.id]).forEach(r => {
    const t = items[near[r.id]] ? layItems(ch, lay).find(i => i.id === near[r.id]) : null;
    const [tx, ty] = t ? ctr(t) : [PLOT.W / 2, PLOT.H / 2];
    const spot = findSpot({ ...r, rot: 0 }, tx, ty, placed(), r.id === 'qc' ? 9 : 0);
    if (spot) items[r.id] = { x: spot[0], y: spot[1], rot: 0 };
  });
  return lay;
}
function findSpot(it, tx, ty, all, minGapAcid) {
  let best = null, bd = 1e9;
  for (let y = 0; y + it.d <= PLOT.H; y++) for (let x = 0; x + it.w <= PLOT.W; x++) {
    const c = { ...it, x, y };
    if (all.some(o => overlaps(c, o) || gap(c, o) < 1 || (minGapAcid && LDEF[o.type].acid && gap(c, o) < minGapAcid))) continue;
    const d = Math.hypot(x + it.w / 2 - tx, y + it.d / 2 - ty);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}

/* ---------- engineering evaluation ---------- */
function evalLayout(ch, lay) {
  ch = ch || S.epc.ch; lay = lay || S.epc.layout;
  const all = layItems(ch, lay), byId = Object.fromEntries(all.map(i => [i.id, i]));
  const missing = all.filter(i => !i.placed);
  const issues = [], flags = {};
  const add = (lvl, t, enc, ids = []) => issues.push({ lvl, t, enc, ids });
  if (missing.length) add('crit', `Yerleştirilmemiş ekipman: ${missing.map(m => LDEF[m.type].t + (m.type === 'pick' ? ' ' + m.lb.slice(-1) : '')).join(', ')}.`, 'plotplan', missing.map(m => m.id));
  const seq = seqIds(ch).map(id => byId[id]).filter(i => i && i.placed);
  // route & flow shape
  let route = 0; const dirs = [];
  for (let i = 1; i < seq.length; i++) {
    const [ax, ay] = ctr(seq[i - 1]), [bx, by] = ctr(seq[i]); const dx = bx - ax, dy = by - ay;
    route += Math.abs(dx) + Math.abs(dy);
    const d = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'E' : 'W') : (dy >= 0 ? 'S' : 'N');
    if (dirs[dirs.length - 1] !== d) dirs.push(d);
  }
  const opp = { E: 'W', W: 'E', N: 'S', S: 'N' };
  const turns = Math.max(0, dirs.length - 1);
  const reversal = dirs.some((d, i) => i && dirs.slice(0, i).includes(opp[d]));
  const flow = turns === 0 ? 'I' : reversal && turns <= 3 ? 'U' : turns === 1 ? 'L' : 'Z';
  // pretreatment chain
  const chain = seq.filter(i => LDEF[i.type].pre);
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1], b = chain[i], g = gap(a, b);
    if (g > 1.5) { flags.tankGap = true; add('warn', `${a.lb} → ${b.lb} arası ${n(g, 1)} m. Tanklar arası > 1,5 m: askıdan zemine damlama, kimyasal kaybı, asitli zemin.`, 'plotplan', [a.id, b.id]); }
    const [ax, ay] = ctr(a), [bx, by] = ctr(b);
    const moveAxis = Math.abs(bx - ax) >= Math.abs(by - ay) ? 'x' : 'y', longAxis = a.rot ? 'x' : 'y';
    if (moveAxis === longAxis || a.rot !== b.rot) { flags.endToEnd = true; add('warn', b.type === 'oven' ? 'Kurutma fırını ön işlem tanklarına paralel değil: fırın tanklarla aynı yönde ve flux tankının hemen yanında olmalı; askı aynı traversle girer.' : `${a.lb} ve ${b.lb} yan yana değil: askı traversi tank boyuna paralel hareket edemez, ara transfer gerekir.`, b.type === 'oven' ? 'oven' : 'plotplan', [a.id, b.id]); }
  }
  const acids = all.filter(i => i.placed && LDEF[i.type].acid), K = byId.kettle;
  if (K && K.placed && acids.length) {
    const g = Math.min(...acids.map(a => gap(a, K)));
    if (g < 6) { flags.acidNear = true; add('crit', `Asit tankı kazana ${n(g, 1)} m: HCl buharı ve damlası kazan bölgesine ulaşır (≥ 6 m olmalı). Kazan aşınması, dross ve elektrik arızaları artar.`, 'plotplan', ['kettle', ...acids.filter(a => gap(a, K) < 6).map(a => a.id)]); }
  }
  const O = byId.oven, F = byId.flux;
  if (K && K.placed) {
    if (O && O.placed) {
      if (F && F.placed && gap(F, O) > 4) { flags.ovenFar = true; add('warn', `Flux → fırın ${n(gap(F, O), 1)} m: ıslak flux filmi taşıma sırasında akar.`, 'oven', ['flux', 'oven']); }
      if (gap(O, K) > 4) { flags.ovenFar = true; add('warn', `Fırın → kazan ${n(gap(O, K), 1)} m (≤ 4 m olmalı): parça soğur, flux nem çeker, kazanda sıçrama ve kül artar.`, 'oven', ['oven', 'kettle']); }
    } else if (F && F.placed && gap(F, K) > 6) { flags.ovenFar = true; add('warn', `Fırın yok ve flux → kazan ${n(gap(F, K), 1)} m: parça ıslak gider.`, 'oven', ['flux', 'kettle']); }
    const Co = byId.cool;
    if (Co && Co.placed) {
      if (gap(Co, K) < 1) { flags.coolNear = true; add('crit', 'Soğutma suyu tankı kazana bitişik (< 1 m): su sıçraması erimiş çinkoda patlama riski.', 'kettlepit', ['cool', 'kettle']); }
      if (gap(Co, K) > 10) { flags.coolFar = true; add('warn', `Kazan → soğutma ${n(gap(Co, K), 1)} m: parça havada uzun bekler, reaktif çelikte alaşım büyür.`, 'whiteRust', ['cool', 'kettle']); }
    }
  }
  const Q = byId.qc;
  if (Q && Q.placed && acids.length && Math.min(...acids.map(a => gap(a, Q))) < 8) { flags.labNear = true; add('warn', 'QC laboratuvarı asit tanklarına < 8 m: cihaz korozyonu, pH elektrotu ve terazi arızaları.', 'lab', ['qc']); }
  const Nt = byId.neut; if (Nt && Nt.placed && acids.length && Math.min(...acids.map(a => gap(a, Nt))) > 25) { flags.neutFar = true; add('warn', 'Nötralizasyon asit hattından > 25 m: aside dayanıklı boru hattı uzar (+$60k).', 'neut', ['neut']); }
  const B = byId.bag; if (B && B.placed && K && K.placed && gap(B, K) > 12) { flags.bagFar = true; add('warn', 'Torba filtre kazandan > 12 m: emiş kanalı uzar, kapture verimi düşer (+$50k).', 'fume', ['bag']); }
  const Ar = byId.arec; if (Ar && Ar.placed && acids.length && Math.min(...acids.map(a => gap(a, Ar))) > 15) add('warn', 'Asit geri kazanım ünitesi asit tanklarına uzak: transfer borusu uzun.', 'acidrec', ['arec']);
  const Zn = byId.zinc; if (Zn && Zn.placed && K && K.placed && gap(Zn, K) > 20) { flags.zincFar = true; add('info', 'Külçe stoğu kazana uzak: forklift ile külçe besleme süresi uzar.', 'ingot', ['zinc']); }
  const R0 = byId.recv, Sh = byId.ship;
  const sameSide = R0 && Sh && R0.placed && Sh.placed && Math.hypot(ctr(R0)[0] - ctr(Sh)[0], ctr(R0)[1] - ctr(Sh)[1]) < 25;
  // building envelope
  const inside = all.filter(i => i.placed && !['neut', 'bag', 'arec'].includes(i.type));
  let bbox = null, area = 0;
  if (inside.length) {
    const x0 = Math.min(...inside.map(i => i.x)) - 2, y0 = Math.min(...inside.map(i => i.y)) - 2, x1 = Math.max(...inside.map(i => i.x + i.w)) + 2, y1 = Math.max(...inside.map(i => i.y + i.d)) + 2;
    bbox = { x: x0, y: y0, w: x1 - x0, d: y1 - y0 }; area = bbox.w * bbox.d;
    if (flow === 'L' || flow === 'Z') area = inside.reduce((a, i) => a + (i.w + 3) * (i.d + 3), 0) * 1.35; // L-shaped hall instead of full rectangle
    area = Math.min(area, bbox.w * bbox.d);
  }
  if (!missing.length) {
    if (flow === 'Z') add('warn', `Proses rotası ${turns} kez yön değiştiriyor: her dönüş için transfer arabası / vinç aktarması gerekir.`, 'flow');
    add('info', `Akış tipi: ${FLOW_NAMES[flow]} · proses rotası ${n(route, 0)} m · ${turns} dönüş${sameSide ? ' · giriş ve çıkış aynı cephede' : ''}.`, 'flow');
  }
  const hrsF = 1 + route / 420 + turns * 0.035 + (flags.endToEnd ? 0.1 : 0) - (sameSide ? 0.04 : 0);
  return { missing, issues, flags, route, turns, flow, dirs, sameSide, bbox, area, hrsF };
}
const FLOW_NAMES = { I: 'Tek hatlı (I)', L: 'L-tipi', U: 'U-tipi', Z: 'Serbest / çok dönüşlü' };
function shedCost(ch, ev) {
  const area = ev && ev.area ? ev.area : requiredItems(ch).reduce((a, i) => a + i.w * i.d, 0) * 2.4;
  return area * 900 * (ch.height / 12) + (ev && ev.flags.neutFar ? 60e3 : 0) + (ev && ev.flags.bagFar ? 50e3 : 0);
}

/* ---------- editor view ---------- */
function layoutEditor() {
  const ch = S.epc.ch, all = layItems(), ev = evalLayout(), sel = U.lsel && all.find(i => i.id === U.lsel);
  const bad = new Set(ev.issues.filter(i => i.lvl !== 'info').flatMap(i => i.ids));
  const seq = seqIds(ch).map(id => all.find(i => i.id === id)).filter(i => i.placed);
  let g = `<defs><pattern id="pg1" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" class="pg"/></pattern><pattern id="pg6" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="url(#pg1)"/><path d="M6 0H0V6" class="pg6"/></pattern>
    <marker id="arw" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L6 3L0 6z" class="arw"/></marker></defs>
    <rect x="0" y="0" width="${PLOT.W}" height="${PLOT.H}" fill="url(#pg6)" class="plotbg"/>`;
  if (ev.bbox) g += `<rect x="${ev.bbox.x}" y="${ev.bbox.y}" width="${ev.bbox.w}" height="${ev.bbox.d}" class="bldg"/><text x="${ev.bbox.x + 0.4}" y="${ev.bbox.y - 0.4}" class="pl-note">Bina zarfı ≈ ${n(ev.area, 0)} m² · ${n(ch.height)} m</text>`;
  all.filter(i => i.placed).forEach(i => {
    const L = LDEF[i.type], tall = i.d > i.w * 1.6;
    g += `<g class="li${U.lsel === i.id ? ' sel' : ''}${bad.has(i.id) ? ' bad' : ''}" data-li="${i.id}" transform="translate(${i.x} ${i.y})" tabindex="0" role="button" aria-label="${esc(L.t)}">
      <rect width="${i.w}" height="${i.d}" rx="0.2" style="fill:${L.col}" class="${L.zone ? 'zone' : ''}"/>
      <text x="${i.w / 2}" y="${tall ? i.d / 2 + 1 : i.d / 2 + 0.7}" text-anchor="middle" dominant-baseline="middle" class="pl-lb" ${tall ? `transform="rotate(-90 ${i.w / 2} ${i.d / 2 + 1})"` : ''}>${i.lb}</text></g>`;
  });
  if (seq.length > 1) {
    const rp = i => [i.x + i.w / 2, i.y + Math.min(1.2, i.d / 4)];
    g += `<polyline points="${seq.map(i => rp(i).join(',')).join(' ')}" class="route" marker-mid="url(#arw)" marker-end="url(#arw)"/>`;
    seq.forEach((i, k) => { const [cx, cy] = rp(i); g += `<circle cx="${cx}" cy="${cy}" r="0.75" class="rn"/><text x="${cx}" y="${cy + 0.05}" class="rnt" text-anchor="middle" dominant-baseline="middle">${k + 1}</text>`; });
  }
  const pal = all.filter(i => !i.placed);
  return `<div class="panel" data-tut="layout"><div class="ph"><h2>1.6 Yerleşim planı <span class="en">Plot plan / plant layout</span></h2>${I('plotplan')}</div>
    <p class="muted" style="max-width:76ch">Ekipman listesi kesinleşti. Şimdi her ekipmanı 96 × 48 m arsaya siz yerleştirin. Proses sırası numaralı okla çizilir. Akış tipi (I, L, U) çizdiğiniz geometriden otomatik çıkarılır. Hat uzunluğu, dönüş sayısı ve mesafe kuralları üretim süresini, kaliteyi ve riski doğrudan etkiler.</p>
    <div class="row" style="margin-top:10px" data-tut="templates"><span class="small">Başlangıç şablonu:</span><button class="btn sm" data-act="tpl" data-k="I">I-hattı</button><button class="btn sm" data-act="tpl" data-k="L">L-tipi</button><button class="btn sm" data-act="tpl" data-k="U">U-tipi</button><button class="btn sm ghost" data-act="tpl-clear">Arsayı temizle</button></div>
    <div class="row" style="margin-top:8px;min-height:32px">${sel ? `<span class="small"><b>${esc(LDEF[sel.type].t)}</b> ${sel.w} × ${sel.d} m @ (${sel.x}, ${sel.y})</span><button class="btn sm" data-act="lrot">Döndür (R)</button><button class="btn sm" data-act="ldel">Arsadan kaldır (Del)</button>${I(LDEF[sel.type].enc)}` : U.placing ? `<span class="pill warn">Yerleştiriliyor: ${esc(LDEF[layItems().find(i => i.id === U.placing).type].t)}. Arsada bir noktaya tıklayın.</span><button class="btn sm ghost" data-act="lcancel">İptal</button>` : '<span class="small muted">Bir ekipmanı sürükleyerek taşıyın; seçip R ile döndürün, ok tuşlarıyla 1 m kaydırın.</span>'}</div>
    <div class="plotwrap"><svg id="plot" class="plot${U.placing ? ' placing' : ''}" viewBox="-1 -2 ${PLOT.W + 2} ${PLOT.H + 3}" role="application" aria-label="Yerleşim planı editörü">${g}<rect id="ghost" class="ghost" width="0" height="0" x="0" y="0"/></svg></div>
    ${pal.length ? `<div style="margin-top:10px" data-tut="palette"><div class="small" style="font-weight:600;margin-bottom:6px">Yerleştirilecek ekipman (${pal.length})</div><div class="row">${pal.map(i => `<button class="btn sm${U.placing === i.id ? ' zinc' : ''}" data-act="lpick" data-id="${i.id}"><i class="sw" style="background:${LDEF[i.type].col}"></i>${esc(LDEF[i.type].t)}${i.type === 'pick' ? ' ' + i.lb.slice(-1) : ''} <span class="muted mono">${i.w}×${i.d}</span></button>`).join('')}</div></div>` : ''}
    <div class="grid3" style="margin-top:12px"><div class="gauge"><small>Akış tipi</small><b style="font-size:18px">${ev.missing.length ? '—' : FLOW_NAMES[ev.flow]}</b></div><div class="gauge"><small>Proses rotası</small><b>${n(ev.route, 0)} m</b></div><div class="gauge"><small>Bina + boru maliyeti</small><b>${usd(shedCost(ch, ev))}</b></div><div class="gauge ${ev.hrsF > 1.2 ? 'bad' : ''}"><small>Parti süresi çarpanı</small><b>×${n(ev.hrsF, 2)}</b></div></div>
    <div class="stack" style="margin-top:10px">${ev.issues.map(r => `<div class="alert ${r.lvl}"><span class="lv">${LV[r.lvl]}</span><span style="flex:1">${r.t}</span>${I(r.enc)}</div>`).join('') || '<div class="alert ok"><span class="lv">OK</span><span>Mesafe kurallarının hepsi sağlanıyor.</span></div>'}</div>
    <div class="row" style="justify-content:space-between;margin-top:12px"><button class="btn" data-step="4">← Geri</button><button class="btn primary" data-step="6">Proje onayına geç →</button></div></div>`;
}

/* ---------- editor interaction ---------- */
let DRAG = null;
function svgPt(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
function setPos(id, x, y, rot) { const it = S.epc.layout.items; it[id] = { x, y, rot: rot ?? (it[id] ? it[id].rot : 0) }; }
function tryPlace(id, x, y, rot) {
  const all = layItems(), it = all.find(i => i.id === id), r = rot ?? it.rot;
  const req = requiredItems(S.epc.ch).find(q => q.id === id);
  const c = { ...it, x, y, rot: r, w: r ? req.d : req.w, d: r ? req.w : req.d, placed: true };
  if (!fits(c, all)) return false;
  setPos(id, x, y, r); return true;
}
document.addEventListener('pointerdown', e => {
  const svg = e.target.closest && e.target.closest('#plot'); if (!svg) return;
  const pt = svgPt(svg, e);
  if (U.placing) {
    const it = layItems().find(i => i.id === U.placing);
    const x = Math.round(pt.x - it.w / 2), y = Math.round(pt.y - it.d / 2);
    if (tryPlace(U.placing, clamp(x, 0, PLOT.W - it.w), clamp(y, 0, PLOT.H - it.d))) { U.lsel = U.placing; U.placing = null; render(); }
    else toast('Bu konuma sığmıyor veya başka ekipmanla çakışıyor.', 'warn');
    return;
  }
  const g = e.target.closest('[data-li]');
  if (!g) { if (U.lsel) { U.lsel = null; render(); } return; }
  const id = g.dataset.li, p = S.epc.layout.items[id];
  DRAG = { id, g, ox: pt.x - p.x, oy: pt.y - p.y, nx: p.x, ny: p.y, moved: false, svg };
  svg.setPointerCapture(e.pointerId);
  svg.querySelectorAll('.li.sel').forEach(x => x.classList.remove('sel')); g.classList.add('sel');
  U.lsel = id; e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (DRAG) {
    const pt = svgPt(DRAG.svg, e), it = layItems().find(i => i.id === DRAG.id);
    const nx = clamp(Math.round(pt.x - DRAG.ox), 0, PLOT.W - it.w), ny = clamp(Math.round(pt.y - DRAG.oy), 0, PLOT.H - it.d);
    if (nx !== DRAG.nx || ny !== DRAG.ny) { DRAG.moved = true; DRAG.nx = nx; DRAG.ny = ny; DRAG.g.setAttribute('transform', `translate(${nx} ${ny})`); DRAG.g.classList.toggle('clash', !fits({ ...it, x: nx, y: ny }, layItems())); }
    return;
  }
  if (U.placing) {
    const svg = $('#plot'); if (!svg || !e.target.closest || !e.target.closest('#plot')) return;
    const pt = svgPt(svg, e), it = layItems().find(i => i.id === U.placing), gh = $('#ghost');
    const x = clamp(Math.round(pt.x - it.w / 2), 0, PLOT.W - it.w), y = clamp(Math.round(pt.y - it.d / 2), 0, PLOT.H - it.d);
    gh.setAttribute('x', x); gh.setAttribute('y', y); gh.setAttribute('width', it.w); gh.setAttribute('height', it.d);
    gh.classList.toggle('clash', !fits({ ...it, x, y, placed: true }, layItems()));
  }
});
document.addEventListener('pointerup', () => {
  if (!DRAG) return;
  const d = DRAG; DRAG = null;
  if (d.moved && !tryPlace(d.id, d.nx, d.ny)) toast('Çakışma: ekipman eski yerine döndü.', 'warn');
  render();
});
function layoutKey(e) {
  if (S.mode !== 'epc' || S.epc.step !== 5 || !U.lsel || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return false;
  const p = S.epc.layout.items[U.lsel]; if (!p) return false;
  const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (mv) { if (!tryPlace(U.lsel, p.x + mv[0], p.y + mv[1])) toast('Engel var.', 'warn'); render(); return true; }
  if (e.key === 'r' || e.key === 'R') { layoutRotate(); return true; }
  if (e.key === 'Delete' || e.key === 'Backspace') { delete S.epc.layout.items[U.lsel]; U.lsel = null; render(); return true; }
  return false;
}
function layoutRotate() {
  const p = S.epc.layout.items[U.lsel]; if (!p) return;
  if (!tryPlace(U.lsel, p.x, p.y, p.rot ? 0 : 1)) toast('Döndürünce sığmıyor; önce boş bir alana taşıyın.', 'warn');
  render();
}
