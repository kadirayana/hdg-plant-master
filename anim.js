'use strict';
/* =========================================================
   Canvas animations for Kolay mod: production line + kettle melt
   ========================================================= */
const AN = { cv: null, cx: null, raf: 0, last: 0, t: 0, speed: 1, scene: null, fx: [], script: [], si: 0, stepT: 0,
  rack: { x: 50, y: 110, show: false }, part: null, dwell: { on: false, t: 0, req: 4, pulled: false, cb: null }, onDone: null, drops: [], follow: true, colors: {}, cT: 0 };
const LH = 300, FLOOR = 272, RAIL = 30, TRAVEL = 108, DIP = 206;

function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888'; }
function refreshColors() { ['--bg', '--panel', '--panel2', '--ink', '--muted', '--line', '--zinc', '--steel', '--crit', '--warn', '--ok'].forEach(k => AN.colors[k] = cssv(k)); }
const C_ = k => AN.colors[k];
const hex = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- stations ---------- */
function lineStations() {
  const ch = S.plant.ch, out = [];
  let x = 16;
  const add = (id, lb, kind, w, liq, gap = 14) => { out.push({ id, lb, kind, x, w, liq }); x += w + gap; };
  add('recv', 'KABUL', 'zone', 80);
  add('deg', 'YAĞ ALMA', 'tank', 62, '#8fa9b4');
  add('r1', 'DURULAMA', 'tank', 52, '#a6cfe3');
  for (let i = 1; i <= +ch.pickN; i++) add('pick' + i, 'ASİT ' + i, 'tank', 56, '#c8c05c');
  add('r2', 'DURULAMA', 'tank', 52, '#a6cfe3');
  add('flux', 'FLUX', 'tank', 62, '#a9dccf');
  if (ch.oven !== 'none') add('oven', 'KURUTMA', 'oven', 66);
  add('kettle', 'GALVANİZ FIRINI · KAZAN', 'kettle', 116, '#c3ccd2');
  add('cool', 'SOĞUTMA', 'tank', 60, '#7fb2cf');
  add('qc', 'KALİTE · SEVK', 'zone', 96);
  return { st: out, W: x + 6 };
}
const stById = id => AN.scene && AN.scene.st.find(s => s.id === id);

/* ---------- mount & loop ---------- */
function animMount() {
  const cv = document.getElementById('s-line') || document.getElementById('s-kettle');
  if (!cv) { AN.cv = null; return; }
  AN.cv = cv; AN.cx = cv.getContext('2d'); refreshColors();
  if (cv.id === 's-line') { AN.scene = lineStations(); AN.kind = 'line'; }
  else AN.kind = 'kettle';
  sizeCanvas();
  if (!AN.raf) { AN.last = performance.now(); AN.raf = requestAnimationFrame(loop); }
}
function sizeCanvas() {
  const cv = AN.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
  const lw = AN.kind === 'line' ? AN.scene.W : 680, lh = AN.kind === 'line' ? LH : 330;
  cv.style.aspectRatio = `${lw} / ${lh}`;
  if (AN.kind === 'line') cv.style.minWidth = Math.min(lw, 760) + 'px';
  const cssW = cv.clientWidth || lw;
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssW * lh / lw * dpr);
  AN.lw = lw; AN.lh = lh; AN.dpr = dpr * cssW / lw;
}
window.addEventListener('resize', () => { if (AN.cv) sizeCanvas(); });
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function loop(now) {
  const dt = Math.min(0.05, (now - AN.last) / 1000); AN.last = now;
  if (!AN.cv || !document.body.contains(AN.cv)) { const c = document.getElementById('s-line') || document.getElementById('s-kettle'); if (c) animMount(); else { AN.raf = 0; return; } }
  AN.t += dt;
  if ((AN.cT += dt) > 1) { AN.cT = 0; refreshColors(); }
  const cx = AN.cx; cx.setTransform(AN.dpr, 0, 0, AN.dpr, 0, 0);
  if (AN.kind === 'line') { updateLine(dt * AN.speed); drawLine(cx); }
  else { if (typeof sKettleTick === 'function') sKettleTick(dt); drawKettle(cx); }
  AN.raf = requestAnimationFrame(loop);
}

/* ---------- line script ---------- */
function partFor(o) {
  const base = { millscale: [58, 66, 74], rust: [138, 78, 44], grease: [44, 42, 38], laser: [70, 64, 80], paint: [70, 72, 78], slag: [60, 62, 64] }[o.surface] || [60, 66, 72];
  return { id: o.p.id, col: base.slice(), from: base.slice(), to: null, k: 1, spots: 0, shine: 0, paint: o.surface === 'paint' && !o.dec.blast, matte: false, wet: 0 };
}
function tint(to, dur = 0.8) { const p = AN.part; p.from = p.col.slice(); p.to = to; p.k = 0; p.kd = dur; }
function buildScript(o, onPull, onDone) {
  const sc = AN.scene, steps = [], ch = S.plant.ch;
  const pickId = 'pick' + (1 + (S.prod.batch % +ch.pickN));
  AN.part = partFor(o); AN.rack = { x: sc.st[0].x + sc.st[0].w / 2, y: TRAVEL, show: true };
  const go = id => { const s = stById(id); steps.push({ k: 'move', x: s.x + s.w / 2 }); };
  const dip = (id, hold, fx, after) => { go(id); steps.push({ k: 'down', id }); steps.push({ k: 'hold', d: hold, fx, id }); if (after) steps.push({ k: 'call', fn: after }); steps.push({ k: 'up' }); steps.push({ k: 'hold', d: 0.35, fx: 'drip', id }); };
  const man = ch.conv === 'manual', W = o.win || {};
  const mdip = (id, cfg, after) => { go(id); steps.push({ k: 'down', id }); steps.push({ k: 'dwell', cfg: { id, ...cfg } }); if (after) steps.push({ k: 'call', fn: after }); steps.push({ k: 'up' }); steps.push({ k: 'hold', d: 0.35, fx: 'drip', id }); };
  if (man) mdip('deg', { title: 'Yağ alma', hint: 'Yağ ve gres emülsiye oluyor. Yeşil aralıkta çıkarın.', scale: 4, lo: 10, hi: 20, apply: t => S.prod.baths.deg.time = t });
  else dip('deg', 1.1, 'bub');
  dip('r1', 0.6, 'bub');
  if (man) mdip(pickId, { title: 'Asitleme', hint: 'Hadde tufalı ve pas çözülüyor (hidrojen kabarcıkları). Erken çıkarırsanız tufal kalır; çok bekletirseniz çelik yenir.', scale: Math.max(4, W.pick[0] / 4), lo: W.pick[0], hi: W.pick[1], apply: t => S.prod.baths.pick.time = t }, () => tint(AN.dwell.t < W.pick[0] * 0.8 ? [96, 92, 90] : [150, 156, 162]));
  else dip(pickId, 1.8, 'acid', () => tint([150, 156, 162]));
  dip('r2', 0.6, 'bub');
  if (man) mdip('flux', { title: 'Flux', hint: 'Yüzeye ince tuz filmi kaplanıyor.', scale: 0.6, lo: 1, hi: 3, apply: t => S.prod.baths.flux.time = t }, () => tint([176, 184, 186]));
  else dip('flux', 0.8, 'bub', () => tint([176, 184, 186]));
  if (ch.oven !== 'none') { go('oven'); steps.push({ k: 'down', id: 'oven' }); steps.push({ k: 'hold', d: 1.4, fx: 'heat', id: 'oven' }); steps.push({ k: 'up' }); }
  go('kettle'); steps.push({ k: 'down', id: 'kettle', slow: true });
  steps.push({ k: 'dwell', cfg: { id: 'kettle', title: 'Parça kazanda', scale: 1, lo: W.kettle, hi: W.kettle * 1.3, auto: ch.conv === 'auto', target: W.kettle * 1.08 } });
  steps.push({ k: 'call', fn: onPull });
  steps.push({ k: 'up', slow: true }); steps.push({ k: 'hold', d: 0.6, fx: 'drip', id: 'kettle' });
  dip('cool', 0.9, 'steam');
  go('qc'); steps.push({ k: 'hold', d: 0.4 }); steps.push({ k: 'call', fn: onDone });
  AN.script = steps; AN.si = 0; AN.stepT = 0;
}
function updateLine(dt) {
  const p = AN.part;
  if (p && p.to) { p.k = Math.min(1, p.k + dt / p.kd); for (let i = 0; i < 3; i++) p.col[i] = lerp(p.from[i], p.to[i], p.k); if (p.k >= 1) p.to = null; }
  // particles
  AN.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; f.r += (f.gr || 0) * dt; });
  AN.fx = AN.fx.filter(f => f.life > 0);
  // ambient kettle fume
  const k = stById('kettle'); if (k && Math.random() < dt * 1.2) AN.fx.push({ t: 'fume', x: k.x + 10 + Math.random() * (k.w - 20), y: 176, vx: (Math.random() - 0.5) * 6, vy: -14, r: 3, gr: 5, life: 2.2, a: 0.18 });
  const st = AN.script[AN.si]; if (!st) return;
  AN.stepT += dt;
  const r = AN.rack;
  switch (st.k) {
    case 'move': { const dx = st.x - r.x, v = 240 * dt; if (Math.abs(dx) <= v) { r.x = st.x; next(); } else r.x += Math.sign(dx) * v; break; }
    case 'down': case 'up': {
      const dur = st.slow ? 1.3 : 0.65, a = Math.min(1, AN.stepT / dur), e = 0.5 - Math.cos(Math.PI * a) / 2;
      r.y = st.k === 'down' ? lerp(TRAVEL, DIP, e) : lerp(DIP, TRAVEL, e);
      if (st.k === 'down' && a > 0.55 && !st.splashed) { st.splashed = true; splash(st.id); }
      if (a >= 1) next(); break; }
    case 'hold': {
      const s = stById(st.id);
      if (s && st.fx === 'bub' && Math.random() < dt * 14) bubble(s, 0.6);
      if (s && st.fx === 'acid' && Math.random() < dt * 30) bubble(s, 1);
      if (s && st.fx === 'steam' && Math.random() < dt * 22) AN.fx.push({ t: 'fume', x: r.x + (Math.random() - 0.5) * 50, y: 186, vx: (Math.random() - 0.5) * 10, vy: -40, r: 5, gr: 14, life: 1.4, a: 0.5 });
      if (s && st.fx === 'heat' && Math.random() < dt * 8) AN.fx.push({ t: 'heat', x: s.x + 10 + Math.random() * (s.w - 20), y: 250, vx: 0, vy: -50, r: 1, life: 1.6, a: 0.5 });
      if (st.fx === 'drip' && Math.random() < dt * 18) AN.drops.push({ x: r.x + (Math.random() - 0.5) * 50, y: r.y + 50, vy: 0, col: s && s.kind === 'kettle' ? '#c9d2d8' : (s && s.liq) || '#9cc' });
      if (AN.stepT >= st.d) next(); break; }
    case 'dwell': {
      if (!st.started) { st.started = true; AN.dwell = { ...st.cfg, req: st.cfg.lo, on: true, t: 0, pulled: false }; if (typeof sDwellStart === 'function') sDwellStart(); }
      const D = AN.dwell; D.t += dt * D.scale; const s = stById(D.id);
      if (D.id === 'kettle') {
        const inten = Math.max(0, 1 - D.t / D.req);
        if (Math.random() < dt * (6 + 60 * inten)) bubble(s, 1.4, true);
        if (Math.random() < dt * (2 + 26 * inten)) AN.fx.push({ t: 'fume', x: r.x + (Math.random() - 0.5) * 60, y: 182, vx: (Math.random() - 0.5) * 12, vy: -30 - 30 * inten, r: 4, gr: 12, life: 2, a: 0.55 * (0.3 + inten) });
      } else if (Math.random() < dt * (D.id.startsWith('pick') ? 30 : 12)) bubble(s, D.id.startsWith('pick') ? 1 : 0.6);
      if (D.auto && D.t >= D.target) D.pulled = true;
      if (D.pulled || D.t > Math.max(D.hi * 2.5, D.lo + 8)) { D.on = false; D.pulled = true; if (D.apply) D.apply(+D.t.toFixed(1)); if (D.id !== 'kettle' && typeof sDwellEnd === 'function') sDwellEnd(); next(); }
      break; }
    case 'call': next(); st.fn && st.fn(); break;
  }
  AN.drops.forEach(d => { d.vy += 500 * dt; d.y += d.vy * dt; }); AN.drops = AN.drops.filter(d => d.y < 200);
  function next() { AN.si++; AN.stepT = 0; }
}
function bubble(s, big, zinc) { AN.fx.push({ t: 'bub', x: AN.rack.x + (Math.random() - 0.5) * 56, y: 250 - Math.random() * 40, vx: (Math.random() - 0.5) * 8, vy: -40 - Math.random() * 40, r: 1 + Math.random() * 2 * big, life: 0.9, top: zinc ? 182 : 192, a: 0.8, zinc }); }
function splash(id) { const s = stById(id); if (!s) return; for (let i = 0; i < 14; i++) AN.fx.push({ t: 'drop', x: AN.rack.x + (Math.random() - 0.5) * 50, y: s.kind === 'kettle' ? 182 : 192, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 90, r: 1.6, life: 0.6, g: 400, col: s.kind === 'kettle' ? '#d7dee3' : s.liq }); }

/* ---------- line drawing ---------- */
function drawLine(cx) {
  const W = AN.lw, sc = AN.scene, tt = AN.t;
  cx.clearRect(0, 0, W, LH);
  cx.fillStyle = C_('--panel2'); cx.fillRect(0, 0, W, LH);
  // building columns & rail
  cx.strokeStyle = C_('--line'); cx.lineWidth = 1;
  for (let x = 8; x < W; x += 120) { cx.beginPath(); cx.moveTo(x, RAIL); cx.lineTo(x, FLOOR); cx.stroke(); }
  cx.fillStyle = C_('--muted'); cx.fillRect(0, RAIL - 4, W, 5);
  // floor
  cx.fillStyle = C_('--line'); cx.fillRect(0, FLOOR, W, LH - FLOOR);
  cx.fillStyle = C_('--ink'); cx.font = '700 11px "Barlow Condensed", "Arial Narrow", sans-serif'; cx.textAlign = 'left';
  cx.fillText({ manual: 'MANUEL TESİS · MONORAY VİNÇ + OPERATÖR', semi: 'YARI OTOMATİK TESİS · PROGRAMLI VİNÇ', auto: 'TAM OTOMATİK TESİS · PLC REÇETE' }[S.plant.ch.conv] || '', 10, 16);
  const ov0 = stById('oven'), kt0 = stById('kettle');
  if (ov0 && kt0 && S.plant.ch.oven === 'waste') {
    cx.strokeStyle = 'rgba(160,82,45,.7)'; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(kt0.x + kt0.w - 14, 160); cx.lineTo(kt0.x + kt0.w - 14, 64); cx.lineTo(ov0.x + ov0.w - 8, 64); cx.lineTo(ov0.x + ov0.w - 8, 172); cx.stroke(); cx.lineWidth = 1;
    cx.fillStyle = C_('--muted'); cx.font = '10px "IBM Plex Sans", sans-serif'; cx.textAlign = 'center'; cx.fillText('galvaniz fırını atık ısısı → kurutma', (ov0.x + kt0.x + kt0.w) / 2, 58);
  }
  const hp = typeof sBathStatus === 'function' ? sBathStatus() : {};
  sc.st.forEach(s => drawStation(cx, s, tt, hp[s.id] || hp[s.id.replace(/\d$/, '')]));
  // particles behind front
  drawFx(cx, f => f.t === 'bub' || f.t === 'heat');
  drawRack(cx);
  // oven front after rack
  const ov = stById('oven'); if (ov && AN.rack.show && Math.abs(AN.rack.x - (ov.x + ov.w / 2)) < 3 && AN.rack.y > TRAVEL + 40) { cx.fillStyle = 'rgba(122,90,64,.92)'; cx.fillRect(ov.x - 2, 196, ov.w + 4, FLOOR - 196); }
  // kettle liquid front (covers immersed part)
  sc.st.forEach(s => { if ((s.kind === 'tank' || s.kind === 'kettle') && AN.rack.show && Math.abs(AN.rack.x - (s.x + s.w / 2)) < 3 && AN.rack.y > TRAVEL + 40) drawLiquidFront(cx, s, tt); });
  drawFx(cx, f => f.t === 'fume' || f.t === 'drop');
  AN.drops.forEach(d => { cx.fillStyle = d.col; cx.fillRect(d.x, d.y, 1.6, 3); });
  // labels
  cx.font = '600 10px "IBM Plex Sans", system-ui, sans-serif'; cx.textAlign = 'center'; cx.fillStyle = C_('--ink');
  sc.st.forEach(s => cx.fillText(s.lb, s.x + s.w / 2, FLOOR + 16));
  // follow scroll
  if (AN.follow && AN.rack.show) { const host = AN.cv.parentElement; if (host && host.scrollWidth > host.clientWidth + 4) { const px = AN.rack.x / AN.lw * AN.cv.clientWidth; const target = px - host.clientWidth / 2; host.scrollLeft += (target - host.scrollLeft) * 0.08; } }
}
function drawStation(cx, s, tt, status) {
  if (s.kind === 'zone') {
    cx.fillStyle = C_('--panel'); cx.fillRect(s.x, FLOOR - 8, s.w, 8);
    cx.setLineDash([4, 3]); cx.strokeStyle = C_('--muted'); cx.strokeRect(s.x + .5, FLOOR - 40.5, s.w - 1, 40); cx.setLineDash([]);
    if (s.id === 'recv' && !AN.rack.show) { cx.fillStyle = '#4a5158'; for (let i = 0; i < 3; i++) cx.fillRect(s.x + 10, FLOOR - 14 - i * 7, s.w - 20, 5); }
    return;
  }
  if (s.kind === 'oven') { // pit-type drying oven, same size and line as the tanks
    const open = AN.rack.show && Math.abs(AN.rack.x - (s.x + s.w / 2)) < 3 && AN.rack.y > TRAVEL + 10;
    cx.fillStyle = '#7a5a40'; cx.fillRect(s.x - 2, 176, s.w + 4, FLOOR - 176);
    cx.fillStyle = '#2b1f18'; cx.fillRect(s.x + 4, 182, s.w - 8, FLOOR - 186);
    const g = cx.createLinearGradient(0, 182, 0, FLOOR); g.addColorStop(0, 'rgba(240,150,60,.15)'); g.addColorStop(1, `rgba(255,130,40,${0.45 + 0.1 * Math.sin(tt * 3)})`);
    cx.fillStyle = g; cx.fillRect(s.x + 4, 182, s.w - 8, FLOOR - 186);
    cx.fillStyle = '#9b7656'; if (open) { cx.fillRect(s.x - 6, 168, 8, 10); cx.fillRect(s.x + s.w - 2, 168, 8, 10); } else cx.fillRect(s.x - 2, 172, s.w + 4, 6);
    cx.fillStyle = C_('--muted'); cx.font = '9px "IBM Plex Mono", monospace'; cx.textAlign = 'center'; cx.fillText('100 °C', s.x + s.w / 2, 166);
    return;
  }
  const top = s.kind === 'kettle' ? 168 : 178;
  if (s.kind === 'kettle') {
    // brick furnace
    cx.fillStyle = '#8d4a32'; cx.fillRect(s.x - 10, 160, s.w + 20, FLOOR - 160);
    cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = 1;
    cx.save(); cx.beginPath(); cx.rect(s.x - 10, 160, s.w + 20, FLOOR - 160); cx.clip();
    for (let y = 164; y < FLOOR; y += 8) for (let x = s.x - 10 + ((y / 8) % 2) * 6; x < s.x + s.w + 10; x += 12) cx.strokeRect(x, y, 12, 8);
    cx.restore();
    // flames glow under
    const fl = 0.6 + 0.4 * Math.sin(tt * 9) * Math.sin(tt * 5.3);
    const g = cx.createRadialGradient(s.x + s.w / 2, FLOOR - 4, 4, s.x + s.w / 2, FLOOR - 4, s.w * 0.7);
    g.addColorStop(0, `rgba(255,170,60,${0.55 * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    cx.fillStyle = g; cx.fillRect(s.x - 10, 200, s.w + 20, FLOOR - 200);
    cx.fillStyle = '#3c4146'; cx.fillRect(s.x, top - 4, s.w, FLOOR - top + 4);
  } else {
    cx.fillStyle = '#6f7a82'; cx.fillRect(s.x - 2, top - 2, s.w + 4, FLOOR - top + 2);
  }
  // liquid body
  const lt = s.kind === 'kettle' ? 182 : 192;
  cx.fillStyle = s.liq; cx.globalAlpha = s.kind === 'kettle' ? 1 : 0.85; cx.fillRect(s.x + 3, lt, s.w - 6, FLOOR - lt - 3); cx.globalAlpha = 1;
  waveLine(cx, s, lt, tt);
  if (s.kind === 'kettle') { cx.strokeStyle = `rgba(240,140,50,${0.55 + 0.25 * Math.sin(tt * 3)})`; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(s.x + 3, lt + 1); cx.lineTo(s.x + s.w - 3, lt + 1); cx.stroke(); }
  if (status && status !== 'ok') warnIcon(cx, s.x + s.w / 2, 150 + Math.sin(tt * 4) * 2, status);
}
function waveLine(cx, s, lt, tt) {
  cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = 1.2; cx.beginPath();
  for (let x = s.x + 3; x <= s.x + s.w - 3; x += 3) { const y = lt + Math.sin(x * 0.18 + tt * 3) * 1.2; x === s.x + 3 ? cx.moveTo(x, y) : cx.lineTo(x, y); }
  cx.stroke();
}
function drawLiquidFront(cx, s, tt) {
  const lt = s.kind === 'kettle' ? 182 : 192;
  cx.globalAlpha = s.kind === 'kettle' ? 0.92 : 0.55; cx.fillStyle = s.liq; cx.fillRect(s.x + 3, lt, s.w - 6, FLOOR - lt - 3); cx.globalAlpha = 1;
  waveLine(cx, s, lt, tt);
}
function warnIcon(cx, x, y, st) {
  cx.fillStyle = st === 'crit' ? C_('--crit') : C_('--warn');
  cx.beginPath(); cx.moveTo(x, y - 9); cx.lineTo(x + 9, y + 7); cx.lineTo(x - 9, y + 7); cx.closePath(); cx.fill();
  cx.fillStyle = '#fff'; cx.font = '700 11px system-ui'; cx.textAlign = 'center'; cx.fillText('!', x, y + 5);
}
function drawFx(cx, pred) {
  AN.fx.filter(pred).forEach(f => {
    const a = Math.max(0, Math.min(1, f.life)) * (f.a || 1);
    if (f.t === 'bub') { if (f.y < f.top) { f.life = 0; return; } cx.strokeStyle = f.zinc ? `rgba(255,236,200,${a})` : `rgba(255,255,255,${a})`; cx.lineWidth = 1; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.stroke(); }
    else if (f.t === 'fume') { cx.fillStyle = `rgba(235,238,240,${a * 0.6})`; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.fill(); }
    else if (f.t === 'heat') { cx.strokeStyle = `rgba(255,160,80,${a * 0.5})`; cx.beginPath(); cx.moveTo(f.x, f.y); cx.quadraticCurveTo(f.x + 4, f.y - 6, f.x, f.y - 12); cx.stroke(); }
    else if (f.t === 'drop') { f.vy += (f.g || 0) * 0.016; cx.fillStyle = f.col; cx.fillRect(f.x, f.y, 2, 2); }
  });
}
function drawRack(cx) {
  const r = AN.rack; if (!r.show) return;
  const p = AN.part, col = p ? hex(...p.col) : '#555';
  // crane by plant type
  const tp = S.plant.ch.conv;
  if (tp === 'manual') {
    cx.fillStyle = '#7d878e'; cx.fillRect(r.x - 9, RAIL - 2, 18, 12);
    cx.strokeStyle = '#e0a030'; cx.beginPath(); cx.moveTo(r.x + 9, RAIL + 6); cx.quadraticCurveTo(r.x + 46, 150, r.x + 44, FLOOR - 52); cx.stroke();
    operator(cx, r.x + 46, FLOOR);
  } else if (tp === 'semi') {
    cx.fillStyle = C_('--steel'); cx.fillRect(r.x - 16, RAIL - 2, 32, 11);
    cx.fillStyle = '#5e7282'; cx.fillRect(r.x + 18, RAIL + 4, 18, 16); cx.fillStyle = '#bfe3f5'; cx.fillRect(r.x + 21, RAIL + 7, 12, 7);
  } else {
    cx.fillStyle = C_('--steel'); cx.fillRect(r.x - 16, RAIL - 2, 32, 11);
    cx.fillStyle = (AN.t * 2 % 1) < 0.5 ? '#43d17a' : '#1f6b3d'; cx.beginPath(); cx.arc(r.x, RAIL - 5, 3.5, 0, 7); cx.fill();
  }
  cx.strokeStyle = C_('--ink'); cx.lineWidth = 1; cx.beginPath(); cx.moveTo(r.x - 8, RAIL + 8); cx.lineTo(r.x - 26, r.y); cx.moveTo(r.x + 8, RAIL + 8); cx.lineTo(r.x + 26, r.y); cx.stroke();
  // traverse beam
  cx.fillStyle = '#c96f1d'; cx.fillRect(r.x - 34, r.y - 3, 68, 6);
  // wires
  cx.strokeStyle = '#333'; cx.beginPath(); cx.moveTo(r.x - 22, r.y + 3); cx.lineTo(r.x - 22, r.y + 12); cx.moveTo(r.x + 22, r.y + 3); cx.lineTo(r.x + 22, r.y + 18); cx.stroke();
  drawProduct(cx, p, r.x, r.y + 12, col);
}
function operator(cx, x, fy) {
  cx.strokeStyle = C_('--ink'); cx.lineWidth = 2; const sw = Math.sin(AN.t * 6) * 3;
  cx.beginPath(); cx.arc(x, fy - 46, 5, 0, 7); cx.stroke();
  cx.beginPath(); cx.moveTo(x, fy - 41); cx.lineTo(x, fy - 20); cx.moveTo(x, fy - 20); cx.lineTo(x - 5 + sw, fy); cx.moveTo(x, fy - 20); cx.lineTo(x + 5 - sw, fy); cx.moveTo(x, fy - 34); cx.lineTo(x - 2, fy - 52 + 4); cx.moveTo(x, fy - 34); cx.lineTo(x + 7, fy - 26); cx.stroke();
  cx.fillStyle = '#e0a030'; cx.fillRect(x - 6, fy - 54, 12, 4); cx.lineWidth = 1;
}
function drawProduct(cx, p, x, y, col) {
  const id = p ? p.id : 'hea';
  cx.save(); cx.translate(x, y); cx.rotate(0.11); cx.fillStyle = col; cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 0.8;
  const R = (a, b, w, h) => { cx.fillRect(a, b, w, h); cx.strokeRect(a, b, w, h); };
  if (id === 'hea') { R(-30, 0, 60, 3); R(-30, 13, 60, 3); R(-30, 3, 60, 10); cx.fillStyle = 'rgba(0,0,0,.12)'; cx.fillRect(-30, 3, 60, 10); }
  else if (id === 'rhs' || id === 'pole') { for (let i = 0; i < 3; i++) R(-30, i * 9, 60, 7); }
  else if (id === 'angle') { for (let i = 0; i < 4; i++) { R(-28, i * 7, 56, 2); R(-28, i * 7, 2, 6); } }
  else if (id === 'guard') { cx.beginPath(); for (let i = 0; i <= 60; i += 3) cx.lineTo(i - 30, 8 + Math.sin(i / 6) * 6); cx.lineWidth = 4; cx.strokeStyle = col; cx.stroke(); cx.lineWidth = 0.8; }
  else if (id === 'grat') { R(-28, 0, 56, 24); cx.strokeStyle = 'rgba(0,0,0,.4)'; for (let i = -24; i < 28; i += 5) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, 24); cx.stroke(); } }
  else if (id === 'plate') { R(-28, 0, 56, 26); }
  else if (id === 'bolt') { cx.strokeStyle = '#444'; cx.beginPath(); cx.moveTo(-18, 0); cx.lineTo(-14, 24); cx.lineTo(14, 24); cx.lineTo(18, 0); cx.stroke(); for (let i = 0; i < 16; i++) { cx.fillRect(-12 + (i % 6) * 4.5, 8 + Math.floor(i / 6) * 5, 3, 3); } }
  else if (id === 'tray') { for (let i = 0; i < 3; i++) { R(-28, i * 8, 56, 2); R(-28, i * 8, 2, 6); R(26, i * 8, 2, 6); } }
  if (p && p.paint) { cx.fillStyle = '#b03a2e'; cx.fillRect(-20, 4, 8, 4); cx.fillRect(6, 10, 10, 3); }
  if (p && p.spots) { cx.fillStyle = '#3a3330'; for (let i = 0; i < p.spots; i++) cx.fillRect(-24 + ((i * 37) % 48), 2 + ((i * 13) % 18), 4, 3); }
  if (p && p.shine) { for (let i = 0; i < 7; i++) { const a = 0.5 + 0.5 * Math.sin(AN.t * 5 + i * 1.7); cx.fillStyle = `rgba(255,255,255,${a * p.shine})`; cx.fillRect(-26 + i * 8, 2 + (i % 3) * 5, 2, 2); } }
  cx.restore();
}

/* ---------- kettle melt (commissioning) ---------- */
function drawKettle(cx) {
  const W = 680, H = 330, A = S.comm && S.comm.A; cx.clearRect(0, 0, W, H);
  cx.fillStyle = C_('--panel2'); cx.fillRect(0, 0, W, H);
  if (!A) return;
  const tt = AN.t, P = S.plant, bs = bulkState(A), kT = P.kT;
  const kx = 220, kw = 340, ky = 70, kh = 210, base = ky + kh;
  // furnace brick
  cx.fillStyle = '#8d4a32'; cx.fillRect(kx - 70, ky - 10, kw + 140, kh + 40);
  cx.strokeStyle = 'rgba(0,0,0,.22)';
  cx.save(); cx.beginPath(); cx.rect(kx - 70, ky - 10, kw + 140, kh + 40); cx.clip();
  for (let y = ky - 10; y < base + 30; y += 12) for (let x = kx - 70 + ((y / 12) % 2) * 9; x < kx + kw + 70; x += 18) cx.strokeRect(x, y, 18, 12);
  cx.restore();
  cx.fillStyle = '#2a1d17'; cx.fillRect(kx - 40, ky, kw + 80, kh + 12);
  // flames (burners on side walls)
  const pw = A.power / 100;
  for (let side = 0; side < 2; side++) for (let i = 0; i < 3; i++) {
    const fy = ky + 50 + i * 60, fx = side ? kx + kw + 36 : kx - 36, dir = side ? -1 : 1;
    const len = 6 + 28 * pw * (0.8 + 0.2 * Math.sin(tt * 14 + i * 2 + side));
    if (pw <= 0) continue;
    const g = cx.createLinearGradient(fx, fy, fx + dir * len, fy); g.addColorStop(0, 'rgba(120,170,255,.9)'); g.addColorStop(0.4, 'rgba(255,190,80,.9)'); g.addColorStop(1, 'rgba(255,90,20,0)');
    cx.fillStyle = g; cx.beginPath(); cx.moveTo(fx, fy - 6); cx.quadraticCurveTo(fx + dir * len, fy, fx, fy + 6); cx.fill();
  }
  // kettle wall colour by wall temperature
  const wt = A.wall, hot = Math.max(0, Math.min(1, (wt - 250) / 250));
  const wc = hex(lerp(80, 230, hot), lerp(86, 70, hot), lerp(92, 40, hot));
  cx.fillStyle = wc; cx.fillRect(kx - 8, ky, 8, kh + 8); cx.fillRect(kx + kw, ky, 8, kh + 8); cx.fillRect(kx - 8, base, kw + 16, 8);
  if (wt > 420 && bs.liq / kT < 0.9) { cx.strokeStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.sin(tt * 8)})`; cx.lineWidth = 3; cx.strokeRect(kx - 10, ky - 2, kw + 20, kh + 12); cx.lineWidth = 1; }
  // liquid
  const lvl = Math.min(1, bs.liq / kT), lh = kh * 0.95 * lvl, ly = base - lh;
  if (lh > 0.5) {
    const g = cx.createLinearGradient(0, ly, 0, base); g.addColorStop(0, '#dfe6ea'); g.addColorStop(1, '#9aa5ac');
    cx.fillStyle = g; cx.fillRect(kx, ly, kw, lh);
    cx.strokeStyle = 'rgba(240,140,50,.8)'; cx.lineWidth = 2; cx.beginPath();
    for (let x = kx; x <= kx + kw; x += 4) { const y = ly + Math.sin(x * 0.06 + tt * 2.4); x === kx ? cx.moveTo(x, y) : cx.lineTo(x, y); } cx.stroke(); cx.lineWidth = 1;
  }
  // solid ingots: centre pyramid and side stacks, resting on liquid surface
  const solidT = Math.max(0, A.m - bs.liq), sideT = Math.min(solidT, A.side || 0), centreT = solidT - sideT;
  const ib = (x, y, molten) => { cx.fillStyle = molten ? '#c7ced3' : '#8e989f'; cx.fillRect(x, y, 26, 9); cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.strokeRect(x + .5, y + .5, 25, 8); };
  let nC = Math.round(centreT / 10), row = 0, floorY = Math.min(base, ly) - 9;
  while (nC > 0) { const inRow = Math.max(1, 7 - row); const k = Math.min(inRow, nC); const w0 = kx + kw / 2 - k * 14; for (let i = 0; i < k; i++) ib(w0 + i * 28, floorY - row * 10, hot > 0.6); nC -= k; row++; }
  let nS = Math.round(sideT / 10); for (let i = 0; i < nS; i++) { const left = i % 2 === 0, j = Math.floor(i / 2); ib(left ? kx + 2 : kx + kw - 28, floorY - j * 10, false); }
  // falling ingots
  AN.fx.forEach(f => { if (f.t === 'ingot') { f.vy += 600 * 0.016; f.y += f.vy * 0.016; if (f.y > floorY - 20) f.life = 0; ib(f.x, f.y); } });
  AN.fx = AN.fx.filter(f => f.t !== 'ingot' || f.life > 0);
  // fume
  if (lh > 0 && Math.random() < 0.15) AN.fx.push({ t: 'fume', x: kx + Math.random() * kw, y: ly - 4, vx: 0, vy: -18, r: 4, gr: 8, life: 2, a: 0.25 });
  AN.fx.forEach(f => { if (f.t === 'fume') { f.x += f.vx * 0.016; f.y += f.vy * 0.016; f.r += f.gr * 0.016; f.life -= 0.016; cx.fillStyle = `rgba(235,238,240,${Math.max(0, f.life) * f.a})`; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.fill(); } });
  AN.fx = AN.fx.filter(f => f.life > 0);
  // thermometers
  const therm = (x, label, v, lim) => {
    cx.fillStyle = C_('--panel'); cx.fillRect(x, 40, 22, 240); cx.strokeStyle = C_('--line'); cx.strokeRect(x + .5, 40.5, 21, 239);
    const f = Math.max(0, Math.min(1, v / 600)); cx.fillStyle = v > lim ? C_('--crit') : C_('--zinc'); cx.fillRect(x + 6, 276 - f * 232, 10, f * 232);
    const ly2 = 276 - lim / 600 * 232; cx.strokeStyle = C_('--crit'); cx.setLineDash([3, 2]); cx.beginPath(); cx.moveTo(x - 4, ly2); cx.lineTo(x + 26, ly2); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = C_('--ink'); cx.font = '600 11px "IBM Plex Mono", monospace'; cx.textAlign = 'center'; cx.fillText(Math.round(v) + '°', x + 11, 30); cx.font = '10px "IBM Plex Sans", sans-serif'; cx.fillText(label, x + 11, 298);
    cx.fillStyle = C_('--crit'); cx.font = '9px "IBM Plex Mono", monospace'; cx.fillText(lim + '°', x + 11, ly2 - 3);
  };
  therm(40, 'Duvar', A.wall, 420); therm(100, 'Çinko', bs.T, 460);
  cx.fillStyle = C_('--ink'); cx.font = '600 12px "IBM Plex Sans", sans-serif'; cx.textAlign = 'left';
  cx.fillText(`Sıvı seviye %${Math.round(lvl * 100)} · yüklenen ${Math.round(A.m)}/${kT} t · ${A.hr}. saat`, kx - 60, 318);
}
function dropIngot(side) {
  const kx = 220, kw = 340;
  AN.fx.push({ t: 'ingot', x: side ? (Math.random() < 0.5 ? kx + 2 : kx + kw - 28) : kx + kw / 2 - 13 + (Math.random() - 0.5) * 60, y: 10, vy: 0, life: 3 });
}
