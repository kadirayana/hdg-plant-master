'use strict';
/* =========================================================
   Visual lessons: short animated / interactive canvas scenes
   narrated by "Usta" in one or two sentences per beat.
   ========================================================= */
const LW = 720, LHh = 360;
const LS = { id: null, bi: 0, t: 0, raf: 0, cv: null, cx: null, st: {}, sc: 1, then: null, last: 0, c: {} };
const MASCOT = `<svg viewBox="0 0 64 64" class="mascot" aria-hidden="true"><circle cx="32" cy="38" r="17" fill="#f0c6a0"/><path d="M13 31 Q32 4 51 31 Z" fill="#e8891c"/><rect x="9" y="29" width="46" height="5" rx="2.5" fill="#c46a16"/><rect x="29" y="12" width="6" height="18" rx="2" fill="#f3a33a"/><rect x="20" y="36" width="10" height="6" rx="2" fill="#243440" opacity=".85"/><rect x="34" y="36" width="10" height="6" rx="2" fill="#243440" opacity=".85"/><rect x="29" y="38" width="6" height="2" fill="#243440"/><path d="M25 48 Q32 53 39 48" stroke="#7a4a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;

/* ---------- drawing helpers ---------- */
const lc = k => LS.c[k] || '#888';
function Tx(cx, s, x, y, o = {}) { cx.font = `${o.w || 600} ${o.s || 13}px ${o.mono ? '"IBM Plex Mono",monospace' : o.disp ? '"Barlow Condensed","Arial Narrow",sans-serif' : '"IBM Plex Sans",system-ui,sans-serif'}`; cx.fillStyle = o.c || lc('ink'); cx.textAlign = o.a || 'center'; cx.textBaseline = o.b || 'alphabetic'; cx.fillText(s, x, y); }
const Ez = t => t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - Math.cos(Math.PI * t) / 2;
const Pr = (t, a, b) => Ez((t - a) / (b - a));
const frac = v => v - Math.floor(v);
const rnd = i => frac(Math.sin(i * 12.9898 + 4.1) * 43758.5453);
function box(cx, x, y, w, h, fill, stroke, r = 0) { cx.beginPath(); if (r && cx.roundRect) cx.roundRect(x, y, w, h, r); else cx.rect(x, y, w, h); if (fill) { cx.fillStyle = fill; cx.fill(); } if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 1; cx.stroke(); } }
function circ(cx, x, y, r, fill, stroke) { cx.beginPath(); cx.arc(x, y, r, 0, 7); if (fill) { cx.fillStyle = fill; cx.fill(); } if (stroke) { cx.strokeStyle = stroke; cx.stroke(); } }
function arrow(cx, x0, y0, x1, y1, col, w = 2) { cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = w; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x1 - 8 * Math.cos(a - 0.45), y1 - 8 * Math.sin(a - 0.45)); cx.lineTo(x1 - 8 * Math.cos(a + 0.45), y1 - 8 * Math.sin(a + 0.45)); cx.closePath(); cx.fill(); cx.lineWidth = 1; }
function bubbles(cx, x0, x1, y0, y1, n, t, a = 0.8, seed = 0) {
  cx.strokeStyle = `rgba(255,255,255,${a})`; cx.lineWidth = 1;
  for (let i = 0; i < n; i++) { const ph = frac(t * (0.6 + rnd(i + seed) * 0.6) + rnd(i * 3 + seed)); const x = x0 + rnd(i * 7 + seed) * (x1 - x0) + Math.sin(t * 3 + i) * 2; const y = y1 - (y1 - y0) * ph; cx.beginPath(); cx.arc(x, y, 1.2 + rnd(i + 9) * 2.4, 0, 7); cx.stroke(); }
}
function kettleSide(cx, x, y, w, h, lvl = 0.85, hot = true) {
  box(cx, x - 16, y - 6, w + 32, h + 16, '#8d4a32');
  cx.save(); cx.beginPath(); cx.rect(x - 16, y - 6, w + 32, h + 16); cx.clip(); cx.strokeStyle = 'rgba(0,0,0,.22)';
  for (let yy = y - 6; yy < y + h + 10; yy += 9) for (let xx = x - 16 + ((yy / 9) % 2) * 7; xx < x + w + 16; xx += 14) cx.strokeRect(xx, yy, 14, 9);
  cx.restore();
  box(cx, x, y, w, h, '#2f3439');
  const ly = y + h * (1 - lvl); const g = cx.createLinearGradient(0, ly, 0, y + h); g.addColorStop(0, '#e1e7ea'); g.addColorStop(1, '#9aa5ac');
  box(cx, x + 3, ly, w - 6, y + h - ly - 3, g);
  if (hot) { cx.strokeStyle = 'rgba(240,140,50,.9)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x + 3, ly + 1); cx.lineTo(x + w - 3, ly + 1); cx.stroke(); cx.lineWidth = 1; }
  return ly;
}
function rope(cx, x0, x1, yTop, yb) { cx.strokeStyle = lc('ink'); cx.beginPath(); cx.moveTo((x0 + x1) / 2, yTop); cx.lineTo(x0 + 10, yb); cx.moveTo((x0 + x1) / 2, yTop); cx.lineTo(x1 - 10, yb); cx.stroke(); }
const LAY = { G: ['Γ', 'gama · Fe₃Zn₁₀', '#4b5258'], D: ['δ', 'delta · FeZn₁₀', '#6f7a82'], Z: ['ζ', 'zeta · FeZn₁₃', '#97a3ab'], E: ['η', 'eta · saf çinko', '#dfe6e9'] };
/** cross-section; hs: {G,D,Z,E} heights; returns layer rects for hit-testing */
function xsec(cx, x, y0, w, steelH, hs, o = {}) {
  box(cx, x, y0, w, steelH, '#4a5258');
  cx.strokeStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 14; i++) { cx.beginPath(); cx.moveTo(x + rnd(i) * w, y0 + 6 + rnd(i + 3) * (steelH - 10)); cx.lineTo(x + rnd(i) * w + 30, y0 + 10 + rnd(i + 5) * (steelH - 14)); cx.stroke(); }
  Tx(cx, 'ÇELİK', x + w / 2, y0 + steelH / 2 + 5, { c: '#c7cdd1', s: 12, disp: true });
  let y = y0; const rects = {};
  ['G', 'D', 'Z', 'E'].forEach(k => {
    const h = hs[k] || 0; if (h <= 0.3) return; y -= h;
    box(cx, x, y, w, h, LAY[k][2]); rects[k] = [x, y, w, h];
    if (k === 'Z' && h > 4) { cx.strokeStyle = 'rgba(60,70,78,.55)'; for (let xx = x + 6; xx < x + w; xx += o.col ? 6 : 10) { const top = y + (o.col ? rnd(xx) * h * 0.5 : rnd(xx) * 3); cx.beginPath(); cx.moveTo(xx, y + h); cx.lineTo(xx + (rnd(xx + 1) - 0.5) * 3, top); cx.stroke(); } }
    if (k === 'E') { cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(x, y, w, Math.min(3, h)); }
    if (o.labels !== false && h > 3) { cx.strokeStyle = lc('muted'); cx.beginPath(); cx.moveTo(x + w, y + h / 2); cx.lineTo(x + w + 14, y + h / 2); cx.stroke(); Tx(cx, LAY[k][0] + ' ' + LAY[k][1], x + w + 18, y + h / 2 + 4, { a: 'left', s: 12 }); }
  });
  return rects;
}

/* ---------- lessons ---------- */
const LESSONS = {
  zinc101: { t: 'Galvaniz nedir?', beats: [
    { cap: 'Temizlenmiş çelik, <b>450 °C erimiş çinkoya</b> daldırılır. Birkaç dakikada yüzeyin tamamı kaplanır.', dur: 5.5,
      draw(cx, t) {
        const ly = kettleSide(cx, 230, 210, 260, 120, 0.8);
        Tx(cx, '450 °C', 360, 200, { c: lc('zinc'), mono: true });
        const down = Pr(t, 0.5, 2), up = Pr(t, 3.2, 4.6), y = 50 + 200 * down - 200 * up;
        const done = t > 3.4, col = done ? '#cfd7db' : '#6b4a3a';
        rope(cx, 270, 450, 0, y); box(cx, 270, y, 180, 16, col, 'rgba(0,0,0,.3)');
        if (t > 1.9 && t < 3.3) { bubbles(cx, 270, 450, ly, ly + 40, 26, t, 0.9); }
        if (t > 4.6) for (let i = 0; i < 8; i++) { const a = 0.5 + 0.5 * Math.sin(t * 6 + i * 2); circ(cx, 280 + i * 22, y + 4 + (i % 2) * 7, 1.4, `rgba(255,255,255,${a})`); }
        Tx(cx, done ? 'Galvanizli çelik' : 'Siyah çelik', 360, y - 10, { s: 12, c: lc('muted') });
      } },
    { cap: 'Çinko yalnız yapışmaz: <b>demirle reaksiyona girip</b> çeliğe kaynamış alaşım katmanları oluşturur. En üstte saf çinko (η) kalır.', dur: 7,
      draw(cx, t) {
        box(cx, 40, 160, 150, 14, '#cfd7db', 'rgba(0,0,0,.3)'); circ(cx, 150, 167, 22, null, lc('steel'));
        cx.strokeStyle = lc('steel'); cx.beginPath(); cx.moveTo(168, 152); cx.lineTo(250, 60); cx.moveTo(168, 182); cx.lineTo(250, 330); cx.stroke();
        Tx(cx, 'kesit × 500', 115, 205, { s: 11, c: lc('muted') });
        xsec(cx, 250, 250, 300, 80, { G: 8 * Pr(t, 0.4, 1.4), D: 38 * Pr(t, 1.2, 2.8), Z: 58 * Pr(t, 2.4, 4.4), E: 34 * Pr(t, 4, 5.4) });
        Tx(cx, 'çinko banyosu', 400, 60, { s: 12, c: lc('muted') });
      } },
    { cap: '<b>Görev:</b> hangi katman saf çinko? Kesitte doğru katmana dokunun.', task: true,
      draw(cx) { LS.hits = xsec(cx, 250, 250, 300, 80, { G: 8, D: 38, Z: 58, E: 34 }); const f = LS.st.fl; if (f && LS.hits[f.k]) { const [x, y, w, h] = LS.hits[f.k]; cx.strokeStyle = f.ok ? lc('ok') : lc('crit'); cx.lineWidth = 3; cx.strokeRect(x, y, w, h); cx.lineWidth = 1; } if (f) Tx(cx, f.ok ? 'Doğru! η saf çinkodur: parlak görünüm ondan gelir.' : `Bu ${LAY[f.k][0]} (${LAY[f.k][1]}): bir Fe-Zn alaşımı. Tekrar deneyin.`, 360, 60, { c: f.ok ? lc('ok') : lc('crit'), s: 14 }); },
      click(x, y) { for (const k in LS.hits) { const [rx, ry, rw, rh] = LS.hits[k]; if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) { LS.st.tries = (LS.st.tries || 0) + 1; LS.st.fl = { k, ok: k === 'E' }; if (k === 'E') LS.st.solved = true; } } },
      solved: () => LS.st.solved },
    { cap: 'Çizikte bile çelik paslanmaz: çinko daha aktif olduğu için <b>önce kendisi çözünür</b> (katodik koruma). Boyada ise pas boyanın altına ilerler.', dur: 9,
      draw(cx, t) {
        [[30, 'Boyalı çelik', '#b5584a', false], [380, 'Galvanizli çelik', '#cfd6da', true]].forEach(([x0, title, coat, zn]) => {
          Tx(cx, title, x0 + 155, 40, { disp: true, s: 18 });
          const cxm = x0 + 155;
          box(cx, x0, 220, 310, 70, '#4a5258'); box(cx, x0, 196, 310, 24, coat);
          cx.fillStyle = lc('panel2'); cx.beginPath(); cx.moveTo(cxm - 14, 196); cx.lineTo(cxm, 226); cx.lineTo(cxm + 14, 196); cx.closePath(); cx.fill();
          cx.fillStyle = 'rgba(110,170,220,.8)'; cx.beginPath(); cx.moveTo(cxm, 120 + 50 * Pr(t, 0, 1)); cx.quadraticCurveTo(cxm + 12, 150 + 50 * Pr(t, 0, 1), cxm, 156 + 50 * Pr(t, 0, 1)); cx.quadraticCurveTo(cxm - 12, 150 + 50 * Pr(t, 0, 1), cxm, 120 + 50 * Pr(t, 0, 1)); cx.fill();
          if (!zn) {
            const sp = 120 * Pr(t, 1.5, 8.5); box(cx, cxm - sp, 214, sp * 2, 14, '#9b4f22');
            for (let i = 0; i < 5; i++) { const bx = cxm + (i - 2) * sp / 2.5; if (Math.abs(bx - cxm) > 20) circ(cx, bx, 196, 6 * Pr(t, 3 + i * 0.4, 6), coat); }
            Tx(cx, 'pas boyanın altında ilerliyor ✗', cxm, 320, { c: lc('crit'), s: 13 });
          } else {
            box(cx, cxm - 6, 222, 12, 6, '#7c868d');
            for (let i = 0; i < 9; i++) { const ph = frac(t * 0.45 + i / 9), side = i % 2 ? 1 : -1; const xx = cxm + side * (22 + rnd(i) * 40); const yy = 196 - ph * 70; cx.globalAlpha = 1 - ph; Tx(cx, 'Zn²⁺', xx, yy, { s: 10, mono: true, c: lc('steel') }); cx.globalAlpha = 1; }
            for (let i = 0; i < 4; i++) { const ph = frac(t * 0.6 + i / 4), side = i % 2 ? 1 : -1, xx = cxm + side * (70 - 60 * ph); Tx(cx, 'e⁻', xx, 250, { s: 11, mono: true, c: '#f0c040' }); }
            box(cx, x0 + 10 + 30 * Pr(t, 2, 9), 196, 4, 2, lc('panel2'));
            Tx(cx, 'çinko kurban olur, çelik korunur ✓', cxm, 320, { c: lc('ok'), s: 13 });
          }
        });
      } }
  ] },

  plant: { t: 'Tesis nasıl dizilir?', beats: [
    { cap: 'Parça bu sırayla gider. <b>Her banyo bir sonrakini hazırlar</b>: biri aksarsa sonuç kazanda görünür.', dur: 10,
      draw(cx, t) {
        const st = [['Yağ alma', 'yağı söker', '#8fa9b4'], ['Durulama', 'kimyasalı keser', '#a6cfe3'], ['Asit', 'pası çözer', '#c8c05c'], ['Durulama', 'asidi keser', '#a6cfe3'], ['Flux', 'tuz filmi', '#a9dccf'], ['Kurutma', 'nemi alır', '#d9b38c'], ['Kazan', 'çinko kaplar', '#c3ccd2'], ['Soğutma', 'sabitler', '#7fb2cf']];
        const cur = Math.min(st.length - 1, Math.floor(Math.max(0, t - 0.4) / 1.1));
        st.forEach(([n, f, col], i) => {
          const x = 22 + i * 86; box(cx, x, 200, 74, 90, col, 'rgba(0,0,0,.25)', 4);
          if (i === 6) box(cx, x - 4, 196, 82, 98, null, '#8d4a32', 4);
          Tx(cx, n, x + 37, 312, { s: 12 }); if (i <= cur && t > 0.4) Tx(cx, f, x + 37, 332, { s: 11, c: lc('zinc') });
          if (i === cur) box(cx, x - 3, 197, 80, 96, null, lc('zinc'), 5);
        });
        const p = Math.min(1, frac(Math.max(0, t - 0.4) / 1.1) * 1.6), x = 22 + cur * 86 + 37, y = 120 + 60 * Math.sin(p * Math.PI);
        cx.strokeStyle = lc('ink'); cx.beginPath(); cx.moveTo(x, 20); cx.lineTo(x, y); cx.stroke(); box(cx, x - 28, y, 56, 8, '#c96f1d'); box(cx, x - 24, y + 10, 48, 10, cur >= 6 ? '#cfd7db' : cur >= 2 ? '#9aa1a6' : '#5a4a40');
        cx.fillStyle = lc('muted'); cx.fillRect(0, 16, LW, 4);
      } },
    { cap: 'Asit buharı kazan bölgesine ve elektrik panolarına ulaşmamalı: <b>asit tankları kazandan en az 6 m uzakta</b> olmalı.', dur: 8,
      draw(cx, t) {
        [[20, 3, false], [380, 8, true]].forEach(([x0, m, ok]) => {
          const px = 14, ax = x0 + 20, kx = ax + 60 + m * px;
          Tx(cx, ok ? `${m} m · doğru` : `${m} m · yanlış`, x0 + 160, 40, { disp: true, s: 18, c: ok ? lc('ok') : lc('crit') });
          box(cx, ax, 120, 60, 140, '#c8c05c', 'rgba(0,0,0,.3)'); Tx(cx, 'ASİT', ax + 30, 196, { s: 12 });
          box(cx, kx, 130, 70, 120, '#8f9ba3', '#8d4a32'); Tx(cx, 'KAZAN', kx + 35, 196, { s: 12 });
          box(cx, kx + 20, 270, 30, 22, lc('panel'), lc('line')); Tx(cx, 'pano', kx + 35, 306, { s: 10, c: lc('muted') });
          for (let i = 0; i < 14; i++) { const ph = frac(t * 0.35 + i / 14), d = ph * 150, life = 1 - d / 120; if (life <= 0) continue; circ(cx, ax + 60 + d, 130 + rnd(i) * 130 + Math.sin(t * 2 + i) * 6, 5 + ph * 14, `rgba(200,195,90,${0.35 * life})`); }
          if (!ok && t > 2.5) { for (let i = 0; i < 5; i++) if (frac(t * 3 + i * 0.3) < 0.5) Tx(cx, '⚡', kx + 15 + i * 9, 266, { s: 12, c: lc('crit') }); Tx(cx, 'korozyon', kx + 35, 330, { s: 12, c: lc('crit') }); }
          if (ok) Tx(cx, 'buhar dağılıyor', ax + 60 + 70, 330, { s: 12, c: lc('ok') });
          cx.strokeStyle = lc('muted'); cx.setLineDash([3, 3]); cx.beginPath(); cx.moveTo(ax + 60, 110); cx.lineTo(kx, 110); cx.stroke(); cx.setLineDash([]);
        });
      } },
    { cap: '<b>Kurutma fırını tanklarla paralel</b>, flux’ın hemen yanında durur. Parça ıslak flux’la yol almaz, nem çekmez, kazana kuru girer.', dur: 8,
      draw(cx, t) {
        const row = (y0, far) => {
          const cols = ['#8fa9b4', '#a6cfe3', '#c8c05c', '#a6cfe3', '#a9dccf'];
          cols.forEach((c, i) => box(cx, 40 + i * 34, y0, 26, 100, c, 'rgba(0,0,0,.25)'));
          const fx = 40 + 4 * 34, ox = far ? 520 : fx + 34, oy = far ? y0 + 60 : y0, kx = far ? 600 : ox + 52;
          box(cx, ox, oy, far ? 100 : 40, far ? 34 : 100, '#d9b38c', 'rgba(0,0,0,.25)'); Tx(cx, 'KURUTMA', ox + (far ? 50 : 20), oy + (far ? 22 : 54), { s: 10 });
          box(cx, kx, y0 + 10, 70, 80, '#8f9ba3', '#8d4a32'); Tx(cx, 'KAZAN', kx + 35, y0 + 56, { s: 11 });
          const p = frac(t / 4);
          const pts = far ? [[fx + 13, y0 + 50], [ox + 50, oy + 17], [kx + 35, y0 + 50]] : [[fx + 13, y0 + 50], [ox + 20, oy + 50], [kx + 35, y0 + 50]];
          cx.strokeStyle = far ? lc('crit') : lc('ok'); cx.setLineDash([4, 3]); cx.beginPath(); pts.forEach((q, i) => i ? cx.lineTo(...q) : cx.moveTo(...q)); cx.stroke(); cx.setLineDash([]);
          const seg = p < 0.5 ? 0 : 1, k = (p % 0.5) * 2, a = pts[seg], b = pts[seg + 1], rx = a[0] + (b[0] - a[0]) * k, ry = a[1] + (b[1] - a[1]) * k;
          box(cx, rx - 10, ry - 6, 20, 12, far && seg === 0 ? '#b9c4c8' : '#e9eef0', 'rgba(0,0,0,.4)');
          if (far && seg === 0) for (let i = 0; i < 6; i++) circ(cx, a[0] + (rx - a[0]) * (i / 6), a[1] + (ry - a[1]) * (i / 6) + 8, 2, 'rgba(110,170,220,.9)');
          Tx(cx, far ? 'Uzakta: ıslak flux damlar, nem çeker ✗' : 'Paralel ve bitişik ✓', 500, y0 + 125, { c: far ? lc('crit') : lc('ok'), s: 13 });
        };
        row(30, false); row(205, true);
      } },
    { cap: 'Üç tesis tipi var: <b>manuel</b> ucuz ama yavaş ve operatöre bağlı; <b>yarı otomatik</b> dengeli; <b>tam otomatik</b> pahalı, hızlı ve tekrarlanabilir.', dur: 6,
      draw(cx, t) {
        [['Manuel', 'ucuz · yavaş · operatöre bağlı'], ['Yarı otomatik', 'vinç taşır · kazan operatörde'], ['Tam otomatik', 'PLC reçete · hızlı · pahalı']].forEach(([n, d], i) => {
          const x = 40 + i * 230, cxm = x + 100;
          box(cx, x, 40, 200, 4, lc('muted'));
          if (i === 0) { box(cx, cxm - 8, 38, 16, 12, '#7d878e'); cx.strokeStyle = '#e0a030'; cx.beginPath(); cx.moveTo(cxm + 8, 46); cx.quadraticCurveTo(cxm + 40, 150, cxm + 40, 214); cx.stroke(); AN.t = t; operator(cx, cxm + 42, 270); }
          if (i === 1) { box(cx, cxm - 16, 38, 32, 12, lc('steel')); box(cx, cxm + 18, 46, 20, 18, '#5e7282'); box(cx, cxm + 21, 49, 14, 8, '#bfe3f5'); }
          if (i === 2) { box(cx, cxm - 16, 38, 32, 12, lc('steel')); circ(cx, cxm, 34, 4, frac(t * 2) < 0.5 ? '#43d17a' : '#1f6b3d'); box(cx, x + 150, 200, 40, 50, lc('panel'), lc('line')); Tx(cx, 'PLC', x + 170, 230, { s: 11, mono: true }); }
          const y = 120 + 30 * Math.sin(t * 1.5 + i); cx.strokeStyle = lc('ink'); cx.beginPath(); cx.moveTo(cxm, 50); cx.lineTo(cxm, y); cx.stroke(); box(cx, cxm - 26, y, 52, 7, '#c96f1d'); box(cx, cxm - 22, y + 9, 44, 10, '#9aa1a6');
          box(cx, x + 10, 270, 180, 2, lc('line'));
          Tx(cx, n, cxm, 305, { disp: true, s: 18 }); Tx(cx, d, cxm, 326, { s: 11, c: lc('muted') });
        });
      } }
  ] },

  melt: { t: 'Kazan nasıl ergitilir?', beats: [
    { cap: 'Isı, sıvı çinkoya değen duvardan çinkoya geçer; o duvar serin kalır. <b>Sıvının olmadığı kuru duvarda ısı birikir.</b> <b>Görev:</b> seviyeyi %15–30 arasına alın ve duvarı 420 °C’nin altında tutan en güçlü ateşi bulun (en az %60).', task: true,
      ui: () => `<label class="lsl">Ateş <input type="range" data-ls="fire" min="0" max="100" step="5" value="${LS.st.fire ?? 85}"><output>${LS.st.fire ?? 85} %</output></label><label class="lsl">Sıvı seviye <input type="range" data-ls="lvl" min="0" max="100" step="5" value="${LS.st.lvl ?? 5}"><output>${LS.st.lvl ?? 5} %</output></label>`,
      draw(cx, t) {
        const fire = (LS.st.fire ?? 85) / 100, lvl = (LS.st.lvl ?? 5) / 100;
        const x = 250, y = 50, w = 260, h = 270, base = y + h, ly = base - h * 0.95 * lvl;
        const dryT = 20 + fire * 620 * (1 - 0.65 * lvl), wetT = 425 + fire * 15;
        box(cx, x - 70, y - 10, w + 140, h + 30, '#8d4a32'); box(cx, x - 40, y, w + 80, h + 10, '#2a1d17');
        if (lvl > 0.01) { const g = cx.createLinearGradient(0, ly, 0, base); g.addColorStop(0, '#e1e7ea'); g.addColorStop(1, '#9aa5ac'); box(cx, x, ly, w, base - ly, g); }
        const col = T => { const k = Math.max(0, Math.min(1, (T - 250) / 250)); return hex(80 + 150 * k, 86 - 16 * k, 92 - 52 * k); };
        for (let i = 0; i < 18; i++) { const sy = y + i * h / 18, wet = sy + h / 18 > ly; const T = wet ? wetT : dryT; [x - 8, x + w].forEach(sx => box(cx, sx, sy, 8, h / 18 + 1, col(T))); }
        for (let k = 0; k < 6; k++) { const yy = y + 25 + k * 42, wet = yy > ly; [[x - 40, 1], [x + w + 40, -1]].forEach(([fx, d]) => {
          const len = 8 + 24 * fire * (0.85 + 0.15 * Math.sin(t * 14 + k)); if (fire > 0) { const g = cx.createLinearGradient(fx, yy, fx + d * len, yy); g.addColorStop(0, 'rgba(120,170,255,.9)'); g.addColorStop(0.5, 'rgba(255,190,80,.9)'); g.addColorStop(1, 'rgba(255,90,20,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(fx, yy - 6); cx.quadraticCurveTo(fx + d * len, yy, fx, yy + 6); cx.fill(); }
          if (fire > 0.05 && wet) { const ph = frac(t * 1.2 + k * 0.2); arrow(cx, (d > 0 ? x + 4 : x + w - 4), yy, (d > 0 ? x + 4 : x + w - 4) + d * (20 + 50 * ph), yy, 'rgba(240,140,40,.9)', 2); }
        }); }
        const hot = lvl < 0.9 && dryT > 420;
        if (hot) { cx.strokeStyle = `rgba(255,50,40,${0.5 + 0.5 * Math.sin(t * 9)})`; cx.lineWidth = 2; for (let i = 0; i < 3; i++) { const yy = y + 20 + i * 30; cx.beginPath(); cx.moveTo(x - 6, yy); cx.lineTo(x - 2, yy + 8); cx.lineTo(x - 7, yy + 15); cx.stroke(); } cx.lineWidth = 1; }
        const th = (xx, lab, v, lim) => { box(cx, xx, 40, 22, 260, lc('panel'), lc('line')); const f = Math.min(1, v / 650); box(cx, xx + 6, 296 - f * 252, 10, f * 252, lim && v > 420 ? lc('crit') : lc('zinc')); const l4 = 296 - 420 / 650 * 252; if (lim) { cx.strokeStyle = lc('crit'); cx.setLineDash([3, 2]); cx.beginPath(); cx.moveTo(xx - 4, l4); cx.lineTo(xx + 26, l4); cx.stroke(); cx.setLineDash([]); Tx(cx, '420', xx + 30, l4 + 4, { a: 'left', s: 10, mono: true, c: lc('crit') }); } Tx(cx, Math.round(v) + '°', xx + 11, 32, { mono: true }); Tx(cx, lab, xx + 11, 318, { s: 11 }); };
        th(40, 'Kuru duvar', lvl >= 0.9 ? wetT : dryT, true); th(110, 'Islak duvar', wetT, false);
        Tx(cx, hot ? 'Kuru duvar 420 °C üstünde: sac hasar görüyor!' : 'Duvar güvende', 380, 350, { c: hot ? lc('crit') : lc('ok'), s: 14 });
        LS.st.solved = LS.st.solved || (lvl >= 0.15 && lvl <= 0.3 && fire >= 0.6 && !hot);
      }, solved: () => LS.st.solved },
    { cap: 'Doğru sıra: <b>ortada piramit → orta ateş → havuz oluşunca kenarlara külçe → seviye yükseldikçe ateşi aç.</b>', dur: 11,
      draw(cx, t) {
        const lvl = 0.12 * Pr(t, 2, 4) + 0.38 * Pr(t, 4, 7) + 0.42 * Pr(t, 7, 10), fire = t < 4 ? 0.55 : t < 7 ? 0.7 : t < 9.5 ? 0.9 : 0.3;
        const x = 210, y = 50, w = 300, h = 250, base = y + h, ly = base - h * 0.95 * lvl;
        box(cx, x - 60, y - 10, w + 120, h + 30, '#8d4a32'); box(cx, x - 34, y, w + 68, h + 10, '#2a1d17');
        if (lvl > 0.005) { const g = cx.createLinearGradient(0, ly, 0, base); g.addColorStop(0, '#e1e7ea'); g.addColorStop(1, '#9aa5ac'); box(cx, x, ly, w, base - ly, g); }
        box(cx, x - 8, y, 8, h + 8, '#5a6268'); box(cx, x + w, y, 8, h + 8, '#5a6268'); box(cx, x - 8, base, w + 16, 8, '#5a6268');
        const pile = Math.round(10 * Pr(t, 0.2, 1.8) * (1 - Pr(t, 2.5, 6)));
        let n = pile, row = 0; while (n > 0) { const k = Math.min(n, 4 - row); for (let i = 0; i < k; i++) box(cx, x + w / 2 - k * 15 + i * 30, Math.min(ly, base) - 11 - row * 11, 28, 10, '#8e989f', 'rgba(0,0,0,.35)'); n -= k; row++; if (row > 3) break; }
        if (t > 4 && t < 7) { const ph = frac(t * 1.3); box(cx, ph < 0.5 ? x + 4 : x + w - 32, 60 + (ly - 70) * ((ph * 2) % 1), 28, 10, '#8e989f'); }
        for (let k = 0; k < 5; k++) [[x - 34, 1], [x + w + 34, -1]].forEach(([fx, d]) => { const len = 6 + 26 * fire * (0.85 + 0.15 * Math.sin(t * 14 + k)), yy = y + 30 + k * 48; const g = cx.createLinearGradient(fx, yy, fx + d * len, yy); g.addColorStop(0, 'rgba(120,170,255,.9)'); g.addColorStop(0.5, 'rgba(255,190,80,.9)'); g.addColorStop(1, 'rgba(255,90,20,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(fx, yy - 6); cx.quadraticCurveTo(fx + d * len, yy, fx, yy + 6); cx.fill(); });
        const steps = ['1 Piramit', '2 Orta ateş', '3 Havuz → kenarlara', '4 Seviye ↑ ateş ↑', '5 450 °C'];
        const cur = t < 2 ? 0 : t < 4 ? 1 : t < 7 ? 2 : t < 9.5 ? 3 : 4;
        steps.forEach((s, i) => Tx(cx, s, 80 + i * 140, 345, { s: 12, c: i === cur ? lc('zinc') : lc('muted'), w: i === cur ? 700 : 500 }));
        Tx(cx, `ateş %${Math.round(fire * 100)} · seviye %${Math.round(lvl * 100)}`, 360, 30, { mono: true, s: 12 });
      } }
  ] },

  pre: { t: 'Ön işlem zinciri', beats: [
    { cap: 'Gelen çeliğin yüzeyi: <b>yağ, hadde tufalı, pas</b>. Çinko bunların hiçbirine tutunmaz; ön işlem hepsini sırayla söker.', dur: 4,
      draw(cx, t) { surfaceScene(cx, t, { stage: 0 }); } },
    { cap: '<b>Görev:</b> bir adımı kapatıp <b>Oynat</b>’a basın ve kazandan çıkan sonuca bakın. Zincirin bir halkası koparsa ne olur?', task: true,
      ui: () => `<div class="row">${[['deg', 'Yağ alma'], ['pick', 'Asitleme'], ['flux', 'Flux'], ['dry', 'Kurutma']].map(([k, n]) => `<button class="btn sm ${LS.st['off_' + k] ? '' : 'primary'}" data-lst="off_${k}" aria-pressed="${!LS.st['off_' + k]}">${LS.st['off_' + k] ? '✗ ' : '✓ '}${n}</button>`).join('')}<button class="btn zinc" data-lsa="play">▶ Oynat</button></div>`,
      act(a) { if (a === 'play') { LS.st.play = true; LS.st.pt = LS.t; LS.st.cfg = { deg: !LS.st.off_deg, pick: !LS.st.off_pick, flux: !LS.st.off_flux, dry: !LS.st.off_dry }; } },
      draw(cx, t) {
        if (!LS.st.play) { surfaceScene(cx, t, { stage: 0 }); Tx(cx, 'Adımları seçip Oynat’a basın', 360, 40, { s: 14, c: lc('muted') }); return; }
        const tt = t - LS.st.pt, cfg = LS.st.cfg, stage = Math.min(6, Math.floor(tt / 1.6) + 1);
        const r = surfaceScene(cx, tt, { stage, cfg, k: frac(tt / 1.6) });
        if (stage >= 6 && tt > 9.6) { const bad = r.bare || r.spatter; if (bad) LS.st.solved = true; Tx(cx, bad ? (r.bare ? 'Çıplak bölge: çinko o noktaya tutunmadı ✗' : 'Islak parça: çinko sıçradı ✗') : 'Kusursuz kaplama ✓ Şimdi bir adımı kapatıp deneyin.', 360, 40, { s: 15, c: bad ? lc('crit') : lc('ok') }); }
      }, solved: () => LS.st.solved },
    { cap: 'Kazanda yüzeydeki “kaynama”, parça ısındıkça azalır. <b>Kaynama durduğunda parça 450 °C’ye ulaşmıştır: o an çekin.</b> Kalın parça daha uzun ısınır.', dur: 9,
      draw(cx, t) {
        const ly = kettleSide(cx, 40, 120, 280, 200, 0.85);
        const tau1 = 0.5, tau2 = 1.9, tm = Math.min(8, t * 1.1), T2 = 450 - 430 * Math.exp(-tm / tau2), inten = Math.max(0, (445 - T2) / 425);
        box(cx, 90, ly + 30, 180, 26, '#6d757b'); bubbles(cx, 90, 270, ly, ly + 60, Math.round(40 * inten), t, 0.9);
        if (inten < 0.02) Tx(cx, 'kaynama durdu → ÇEK', 180, 105, { c: lc('ok'), s: 15, w: 700 });
        const gx = 370, gy = 50, gw = 320, gh = 250, X = v => gx + v / 8 * gw, Y = v => gy + gh - (v - 20) / 450 * gh;
        cx.strokeStyle = lc('line'); cx.strokeRect(gx, gy, gw, gh);
        cx.setLineDash([4, 3]); cx.strokeStyle = lc('zinc'); cx.beginPath(); cx.moveTo(gx, Y(450)); cx.lineTo(gx + gw, Y(450)); cx.stroke(); cx.setLineDash([]); Tx(cx, '450 °C banyo', gx + gw - 4, Y(450) - 6, { a: 'right', s: 11, c: lc('zinc') });
        [[tau1, '3 mm sac', lc('steel')], [tau2, '25 mm plaka', lc('crit')]].forEach(([tau, lab, col]) => { cx.strokeStyle = col; cx.lineWidth = 2; cx.beginPath(); for (let v = 0; v <= tm; v += 0.05) { const T = 450 - 430 * Math.exp(-v / tau); v ? cx.lineTo(X(v), Y(T)) : cx.moveTo(X(v), Y(T)); } cx.stroke(); cx.lineWidth = 1; Tx(cx, lab, X(Math.min(tm, 3)) + 6, Y(450 - 430 * Math.exp(-Math.min(tm, 3) / tau)) + 16, { a: 'left', s: 11, c: col }); });
        Tx(cx, 'süre (dk) →', gx + gw, gy + gh + 18, { a: 'right', s: 11, c: lc('muted') }); Tx(cx, 'çelik sıcaklığı', gx, gy - 8, { a: 'left', s: 11, c: lc('muted') });
      } }
  ] },

  sandelin: { t: 'Reaktif çelik (Sandelin)', beats: [
    { cap: 'Çelikteki silisyum + fosfor kaplamayı büyütür: <b>Si<sub>eq</sub> = %Si + 2,5 × %P</b>. %0,03–0,12 “pik bölgede” kaplama kalın, mat ve kırılgan olur. <b>Görev:</b> çubuğu pik bölgeye alın ve banyoya nikel ekleyin.', task: true,
      ui: () => `<label class="lsl">Si<sub>eq</sub> <input type="range" data-ls="si" min="0" max="0.4" step="0.005" value="${LS.st.si ?? 0.01}"><output>${n(LS.st.si ?? 0.01, 3)}</output></label><button class="btn ${LS.st.ni ? 'zinc' : ''}" data-lst="ni">${LS.st.ni ? 'Banyoda Ni %0,05 ✓' : 'Banyoya nikel ekle'}</button>`,
      draw(cx) {
        const si = LS.st.si ?? 0.01, ni = !!LS.st.ni;
        const th = (s, nn) => 85 + (nn ? 22 : 150) * Math.exp(-Math.pow((s - 0.075) / 0.028, 2)) + (s > 0.22 ? (s - 0.22) * 650 * (nn ? 0.9 : 1) : 0) + (s > 0.12 && s < 0.22 ? 12 : 0);
        const gx = 50, gy = 40, gw = 330, gh = 260, X = v => gx + v / 0.4 * gw, Y = v => gy + gh - (v - 40) / 240 * gh;
        [[0, 0.03, 'HİPO', 'ok'], [0.03, 0.12, 'PİK', 'crit'], [0.12, 0.25, 'SEBİSTY', 'warn'], [0.25, 0.4, 'HİPER', 'crit']].forEach(([a, b, lb, c]) => { cx.globalAlpha = 0.12; box(cx, X(a), gy, X(b) - X(a), gh, lc(c)); cx.globalAlpha = 1; Tx(cx, lb, (X(a) + X(b)) / 2, gy + 14, { s: 10, c: lc(c), w: 700 }); });
        cx.strokeStyle = lc('line'); cx.strokeRect(gx, gy, gw, gh);
        [[!ni, 1], [ni, 0.25]].forEach(([nn, al]) => { cx.globalAlpha = al === 1 ? 1 : 0.35; cx.strokeStyle = nn ? lc('crit') : lc('ok'); cx.lineWidth = 2; cx.beginPath(); for (let s = 0; s <= 0.4; s += 0.004) { const v = th(s, !nn); s ? cx.lineTo(X(s), Y(v)) : cx.moveTo(X(s), Y(v)); } cx.stroke(); cx.lineWidth = 1; cx.globalAlpha = 1; });
        const v = th(si, ni); circ(cx, X(si), Y(v), 6, lc('zinc')); Tx(cx, Math.round(v) + ' µm', X(si), Y(v) - 12, { mono: true, s: 12 });
        Tx(cx, 'Si + 2,5·P →', gx + gw, gy + gh + 18, { a: 'right', s: 11, c: lc('muted') }); Tx(cx, 'kaplama kalınlığı', gx, gy - 8, { a: 'left', s: 11, c: lc('muted') });
        const peakish = !ni && si >= 0.03 && si <= 0.12 || si > 0.25, eta = peakish ? 3 : 26, alloy = v - eta, k = 150 / 260;
        xsec(cx, 430, 290, 130, 50, { G: 4 * k, D: alloy * (peakish ? 0.2 : 0.4) * k, Z: alloy * (peakish ? 0.78 : 0.56) * k, E: eta * k }, { col: peakish });
        box(cx, 430, 40, 50, 30, peakish ? '#9ea4a8' : '#dde4e8', lc('line'), 4); Tx(cx, peakish ? 'Mat gri, kırılgan' : 'Parlak gümüş', 490, 60, { a: 'left', s: 13 });
        if (si >= 0.03 && si <= 0.12 && ni) LS.st.solved = true;
      }, solved: () => LS.st.solved },
    { cap: 'Kabulde sertifikadaki Si ve P ile hesaplayın. <b>Pik bölgede</b>: banyoda Ni %0,04–0,06, sıcaklık 450 °C’yi geçmesin, kaynama durunca hemen çekin.', dur: 7,
      draw(cx, t) {
        box(cx, 120, 50, 480, 250, lc('panel'), lc('line'), 6); Tx(cx, 'EN 10204 3.1 · Malzeme sertifikası', 360, 82, { disp: true, s: 18 });
        Tx(cx, 'C 0,15   Si 0,045   Mn 1,20   P 0,012', 360, 130, { mono: true, s: 15 });
        const f = 'Si_eq = 0,045 + 2,5 × 0,012 = 0,075', k = Math.floor(f.length * Pr(t, 1, 4));
        Tx(cx, f.slice(0, k), 360, 190, { mono: true, s: 17, c: lc('steel') });
        if (t > 4.6) { cx.save(); cx.translate(470, 250); cx.rotate(-0.12); cx.globalAlpha = Pr(t, 4.6, 5.2); box(cx, -90, -24, 180, 40, null, lc('crit'), 6); cx.lineWidth = 3; cx.strokeStyle = lc('crit'); cx.strokeRect(-90, -24, 180, 40); Tx(cx, 'PİK BÖLGE', 0, 5, { disp: true, s: 24, c: lc('crit'), w: 700 }); cx.restore(); cx.lineWidth = 1; }
      } }
  ] },

  iron: { t: 'Demir zinciri ve dross', beats: [
    { cap: 'Asitte biriken demir, askıyla <b>durulama → flux → kazana</b> taşınır. Kazanda her demir atomu çinkoyu kapıp <b>dross</b> olarak dibe çöker. <b>Görev:</b> partideki dross’u 60 kg’ın altına indirin.', task: true,
      ui: () => `<label class="lsl">Asitte demir <input type="range" data-ls="fe" min="20" max="160" step="5" value="${LS.st.fe ?? 140}"><output>${LS.st.fe ?? 140} g/L</output></label><button class="btn ${LS.st.renew ? 'zinc' : ''}" data-lst="renew">${LS.st.renew ? 'Durulama 2 temiz ✓' : 'Durulama 2’yi yenile'}</button>`,
      draw(cx, t) {
        const fe = LS.st.fe ?? 140, renew = !!LS.st.renew, fluxFe = fe * 0.024 * (renew ? 0.3 : 1), dross = 20 * (2.2 + fluxFe * 1.4);
        const tanks = [['Asit', '#c8c05c', 30], ['Durulama 2', '#a6cfe3', 190], ['Flux', '#a9dccf', 350]];
        tanks.forEach(([nm, c, x]) => { box(cx, x, 150, 120, 150, c, 'rgba(0,0,0,.25)'); Tx(cx, nm, x + 60, 320, { s: 12 }); });
        kettleSide(cx, 530, 150, 160, 150, 0.85); Tx(cx, 'Kazan', 610, 320, { s: 12 });
        const dens = [fe / 4, fe / 4 * 0.05 * (renew ? 0.3 : 1) * 6, fluxFe * 4];
        tanks.forEach(([, , x], i) => { for (let k = 0; k < Math.min(60, dens[i]); k++) circ(cx, x + 8 + rnd(k + i * 50) * 104, 160 + rnd(k * 3 + i) * 130, 2.2, '#8a3b1c'); });
        const rate = Math.min(12, fe / 14) * (renew ? 0.35 : 1);
        [[90, 210], [250, 370], [410, 560]].forEach(([a, b], i) => { cx.strokeStyle = lc('muted'); cx.setLineDash([3, 3]); cx.beginPath(); cx.moveTo(a + 30, 140); cx.quadraticCurveTo((a + b) / 2 + 30, 60, b, 140); cx.stroke(); cx.setLineDash([]); for (let k = 0; k < Math.round(rate * (i === 0 ? 1 : 0.8)); k++) { const ph = frac(t * 0.5 + k / rate), x = a + 30 + (b - a - 30) * ph, y = 140 - Math.sin(ph * Math.PI) * 70; circ(cx, x, y, 2.4, '#8a3b1c'); } });
        const pileH = Math.min(70, dross / 3);
        for (let k = 0; k < Math.round(dross / 8); k++) { const ph = frac(t * 0.4 + k / 9); const x = 545 + rnd(k) * 130, y = 205 + ph * (290 - pileH - 205); cx.save(); cx.translate(x, y); cx.rotate(0.785); box(cx, -3, -3, 6, 6, '#6b5a4a'); cx.restore(); }
        box(cx, 533, 297 - pileH, 154, pileH, '#6b5a4a'); Tx(cx, 'dip dross', 610, 293 - pileH, { s: 11, c: '#e8dccf' });
        const ok = dross < 60; if (ok) LS.st.solved = true;
        Tx(cx, `Flux Fe ${n(fluxFe, 1)} g/L · dross ${Math.round(dross)} kg/parti · çinko kaybı ≈ $${Math.round(dross * 0.95 * 2.9)}`, 360, 36, { s: 14, c: ok ? lc('ok') : lc('crit'), w: 700 });
      }, solved: () => LS.st.solved },
    { cap: '<b>1 kg demir ≈ 25 kg çinkoyu</b> dross’a çevirir. Flux demirini düşük tutmak, en ucuz çinko tasarrufudur.', dur: 6,
      draw(cx, t) {
        box(cx, 80, 140, 110, 80, '#8a3b1c', null, 6); Tx(cx, '1 kg Fe', 135, 186, { c: '#fff', s: 16, w: 700 });
        arrow(cx, 210, 180, 300, 180, lc('muted'), 3);
        for (let i = 0; i < 25; i++) { const k = Pr(t, 0.6 + i * 0.12, 1.2 + i * 0.12); box(cx, 320 + (i % 5) * 34, 110 + Math.floor(i / 5) * 26 - (1 - k) * 60, 30, 20, '#9aa5ac', 'rgba(0,0,0,.3)'); }
        Tx(cx, '25 kg çinko', 405, 260, { s: 14 }); arrow(cx, 510, 180, 570, 180, lc('muted'), 3);
        cx.globalAlpha = Pr(t, 4, 5); box(cx, 585, 130, 100, 100, '#6b5a4a', null, 8); Tx(cx, 'FeZn₁₃', 635, 178, { c: '#fff', s: 15, w: 700 }); Tx(cx, 'dross', 635, 200, { c: '#e8dccf', s: 12 }); cx.globalAlpha = 1;
      } }
  ] },

  zinc: { t: 'Çinko nereye gidiyor?', beats: [
    { cap: 'Satın aldığınız çinkonun hepsi ürüne gitmez: bir kısmı <b>dross, kül ve akıntı</b> olur. <b>Görev:</b> kimya kontrolünü iyileştirip ürüne giden payı %75’in üstüne çıkarın.', task: true,
      ui: () => `<label class="lsl">Kimya kontrolü <input type="range" data-ls="q" min="0" max="100" step="5" value="${LS.st.q ?? 20}"><output>${LS.st.q ?? 20}</output></label>`,
      draw(cx, t) {
        const q = (LS.st.q ?? 20) / 100, parts = [['Kaplama (ürün)', Math.round(55 + 25 * q), '#cfd7db'], ['Dross', Math.round(18 - 10 * q), '#6b5a4a'], ['Kül', Math.round(18 - 10 * q), '#b8b3a6'], ['Akıntı', 0, '#8fa0aa']];
        parts[3][1] = 100 - parts[0][1] - parts[1][1] - parts[2][1];
        const price = (S.market ? S.market.lme + S.market.prem : 3035) / 1000;
        let idx = 0; const bins = parts.map((p, i) => ({ x: 330 + i * 95, n: p[1], col: p[2], name: p[0], start: (idx += p[1]) - p[1] }));
        const ph = Pr(frac(t / 5) * 5, 0.2, 3.5);
        for (let i = 0; i < 100; i++) {
          const b = bins.find(bb => i >= bb.start && i < bb.start + bb.n), k = i - b.start, sx = 40 + (i % 10) * 24, sy = 70 + Math.floor(i / 10) * 24, tx = b.x + (k % 4) * 18, ty = 300 - Math.floor(k / 4) * 12;
          const p2 = Math.max(0, Math.min(1, ph * 1.3 - i / 260)); box(cx, sx + (tx - sx) * p2, sy + (ty - sy) * p2, p2 > 0.9 ? 16 : 20, p2 > 0.9 ? 10 : 20, b.col, 'rgba(0,0,0,.25)');
        }
        Tx(cx, '100 kg çinko', 148, 56, { s: 13 });
        bins.forEach(b => { Tx(cx, b.name, b.x + 36, 330, { s: 11 }); Tx(cx, `${b.n} kg · $${Math.round(b.n * price)}`, b.x + 36, 348, { s: 11, mono: true, c: lc('muted') }); });
        if (parts[0][1] > 75) LS.st.solved = true;
        Tx(cx, `Ürüne giden: %${parts[0][1]}`, 520, 56, { s: 15, w: 700, c: parts[0][1] > 75 ? lc('ok') : lc('crit') });
      }, solved: () => LS.st.solved }
  ] }
};

/* micro-scale surface scene used by the pretreatment lesson */
function surfaceScene(cx, t, o) {
  const cfg = o.cfg || { deg: true, pick: true, flux: true, dry: true }, st = o.stage, k = o.k ?? 0;
  const regs = 6, rw = 640 / regs, x0 = 40, base = 250, res = { bare: false, spatter: false };
  box(cx, x0, base, 640, 80, '#4a5258'); Tx(cx, 'ÇELİK', 360, 300, { c: '#c7cdd1', disp: true, s: 14 });
  const oilAt = [1, 4], oilLeft = i => oilAt.includes(i) && !(cfg.deg && st >= 1);
  const labels = ['Yağ alma', 'Asitleme', 'Durulama', 'Flux', 'Kurutma', 'Kazan'];
  if (st >= 1) labels.forEach((l, i) => Tx(cx, (i + 1) + ' ' + l, 75 + i * 113, 345, { s: 11, c: i + 1 === st ? lc('zinc') : i + 1 < st ? lc('ink') : lc('muted'), w: i + 1 === st ? 700 : 500 }));
  for (let i = 0; i < regs; i++) {
    const rx = x0 + i * rw;
    const scaleGone = cfg.pick && !oilLeft(i) && st >= 2, scaleH = scaleGone ? (st === 2 ? 22 * (1 - k) : 0) : 22;
    if (scaleH > 0.5) for (let j = 0; j < 4; j++) box(cx, rx + 4 + j * (rw / 4), base - scaleH * (0.7 + rnd(i * 4 + j) * 0.3), rw / 4 - 3, scaleH * (0.7 + rnd(i * 4 + j) * 0.3), '#2f2a28', 'rgba(255,255,255,.08)');
    if (st === 2 && cfg.pick && !oilLeft(i)) bubbles(cx, rx, rx + rw, base - 70, base - 4, 6, t, 0.8, i);
    const clean = scaleH <= 0.5, fluxed = clean && cfg.flux && st >= 4 && (i % 2 === 0 || true) && !(cfg.flux === false);
    const fluxOk = cfg.flux || (i !== 0 && i !== 3 && i !== 5);
    if (st >= 4 && clean && cfg.flux) { const fh = st === 4 ? 4 * k : 4; box(cx, rx, base - fh, rw, fh, '#f2f6f6'); if (st === 4) for (let j = 0; j < 5; j++) circ(cx, rx + rnd(i * 9 + j) * rw, base - 3, 1.5, `rgba(255,255,255,${k})`); }
    if (st >= 6) {
      const ok = clean && fluxOk, zh = 26 * Math.min(1, k * 2 + (t > 9.6 ? 1 : 0));
      if (ok) { box(cx, rx, base - zh - (cfg.flux ? 0 : 0), rw, zh, '#cfd7db'); }
      else { res.bare = true; cx.strokeStyle = lc('crit'); cx.lineWidth = 2; cx.strokeRect(rx + 2, base - 30, rw - 4, 30); cx.lineWidth = 1; Tx(cx, 'ÇIPLAK', rx + rw / 2, base - 62, { s: 13, c: lc('crit'), w: 700 }); }
    }
    if (oilLeft(i) || (oilAt.includes(i) && st === 1 && cfg.deg)) { const up = st === 1 && cfg.deg ? k * 120 : 0, a = st === 1 && cfg.deg ? 1 - k : 1; cx.globalAlpha = a; cx.fillStyle = '#c8952e'; cx.beginPath(); cx.ellipse(rx + rw / 2, base - 30 - up, rw / 2.6, 12, 0, 0, 7); cx.fill(); cx.globalAlpha = 1; }
  }
  if (st === 5 && cfg.dry) for (let i = 0; i < 12; i++) { const ph = frac(t * 0.8 + i / 12); circ(cx, x0 + rnd(i) * 640, base - 10 - ph * 80, 4 + ph * 8, `rgba(235,238,240,${0.5 * (1 - ph)})`); }
  if (st >= 6 && !cfg.dry) { res.spatter = true; for (let i = 0; i < 16; i++) circ(cx, x0 + rnd(i * 5) * 640, base - 40 - rnd(i * 7) * 90, 3, '#cfd7db'); Tx(cx, 'ıslak parça: çinko sıçradı', 360, 150, { s: 13, c: lc('crit') }); }
  if (st === 0) { Tx(cx, 'yağ / gres', 40 + 1.5 * rw, base - 52, { s: 12, c: '#b07a10' }); Tx(cx, 'hadde tufalı (FeO · Fe₃O₄)', 40 + 3 * rw, base - 30, { s: 12, c: lc('ink') }); }
  return res;
}

/* ---------- player ---------- */
function lessonOpen(id, then) {
  LS.id = id; LS.bi = 0; LS.st = {}; LS.then = then || null; LS.t = 0;
  refreshColors(); ['ink', 'muted', 'panel', 'panel2', 'line', 'zinc', 'ok', 'crit', 'warn', 'steel'].forEach(k => LS.c[k] = cssv('--' + k));
  let el = document.getElementById('lesson'); if (!el) { el = document.createElement('div'); el.id = 'lesson'; el.className = 'lesson'; document.body.appendChild(el); }
  el.hidden = false; lessonRender();
  if (!LS.raf) { LS.last = performance.now(); LS.raf = requestAnimationFrame(lessonLoop); }
}
function lessonRender() {
  const L = LESSONS[LS.id], b = L.beats[LS.bi], el = document.getElementById('lesson'), last = LS.bi === L.beats.length - 1;
  const ok = !b.task || (b.solved && b.solved());
  el.innerHTML = `<div class="lcard" role="dialog" aria-modal="true" aria-label="${esc(L.t)}">
    <div class="lhead"><b>${L.t}</b><span class="ldots">${L.beats.map((_, i) => `<i class="${i === LS.bi ? 'on' : i < LS.bi ? 'done' : ''}"></i>`).join('')}</span><button class="btn sm ghost" data-lsa="close">Kapat</button></div>
    <canvas id="lcv" class="lcv"></canvas>
    <div class="lsay">${MASCOT}<div class="bubble">${b.cap}</div></div>
    ${b.ui ? `<div class="lui" id="lui">${b.ui()}</div>` : ''}
    <div class="lnav"><button class="btn" data-lsa="prev" ${LS.bi ? '' : 'disabled'}>◀ Geri</button><button class="btn ghost" data-lsa="replay">↺ Tekrar</button>
    <button class="btn ${ok ? 'zinc' : ''}" data-lsa="next" id="lnext" ${ok ? '' : 'disabled'}>${last ? (LS.then ? 'Göreve başla ▶' : 'Bitir ✓') : 'İleri ▶'}</button></div></div>`;
  LS.cv = document.getElementById('lcv'); LS.cx = LS.cv.getContext('2d'); lessonSize(); LS.t = 0;
}
function lessonSize() { const dpr = Math.min(2, window.devicePixelRatio || 1), w = LS.cv.clientWidth || LW; LS.cv.width = Math.round(w * dpr); LS.cv.height = Math.round(w * LHh / LW * dpr); LS.sc = w / LW * dpr; }
function lessonLoop(now) {
  const el = document.getElementById('lesson');
  if (!el || el.hidden || !LS.cv) { LS.raf = 0; return; }
  const dt = Math.min(0.05, (now - LS.last) / 1000); LS.last = now; LS.t += dt;
  const b = LESSONS[LS.id].beats[LS.bi], cx = LS.cx; cx.setTransform(LS.sc, 0, 0, LS.sc, 0, 0);
  cx.fillStyle = lc('panel2'); cx.fillRect(0, 0, LW, LHh);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  b.draw(cx, b.dur && reduce ? b.dur : (b.dur ? Math.min(LS.t, b.dur + 30) : LS.t));
  const nx = document.getElementById('lnext');
  if (nx && b.task) { const ok = b.solved && b.solved(); if (ok && nx.disabled) { nx.disabled = false; nx.classList.add('zinc', 'pulse'); } }
  if (nx && b.dur && LS.t > b.dur) nx.classList.add('pulse');
  LS.raf = requestAnimationFrame(lessonLoop);
}
function lessonClose(finished) {
  const el = document.getElementById('lesson'); if (el) { el.hidden = true; el.innerHTML = ''; }
  LS.cv = null; const then = LS.then; LS.then = null;
  if (finished && then) then(LS.st);
}
window.addEventListener('resize', () => { if (LS.cv) lessonSize(); });
document.addEventListener('click', e => {
  const t = e.target.closest('#lesson [data-lsa],#lesson [data-lst],#lcv'); if (!t) return;
  e.stopPropagation();
  if (t.id === 'lcv') { const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LHh, b = LESSONS[LS.id].beats[LS.bi]; if (b.click) b.click(x, y); return; }
  if (t.dataset.lst) { LS.st[t.dataset.lst] = !LS.st[t.dataset.lst]; const ui = document.getElementById('lui'); const b = LESSONS[LS.id].beats[LS.bi]; if (ui && b.ui) ui.innerHTML = b.ui(); return; }
  const a = t.dataset.lsa, L = LESSONS[LS.id];
  if (a === 'close') return lessonClose(false);
  if (a === 'prev') { LS.bi = Math.max(0, LS.bi - 1); lessonRender(); return; }
  if (a === 'replay') { LS.t = 0; LS.st.play = false; return; }
  if (a === 'next') { if (LS.bi < L.beats.length - 1) { LS.bi++; lessonRender(); } else lessonClose(true); return; }
  const b = L.beats[LS.bi]; if (b.act) { b.act(a); const ui = document.getElementById('lui'); if (ui && b.ui) ui.innerHTML = b.ui(); }
}, true);
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset || !t.dataset.ls) return;
  LS.st[t.dataset.ls] = +t.value; const o = t.parentElement.querySelector('output');
  if (o) o.textContent = t.dataset.ls === 'si' ? n(+t.value, 3) : t.value + (t.dataset.ls === 'fe' ? ' g/L' : t.dataset.ls === 'q' ? '' : ' %');
});
document.addEventListener('keydown', e => { const el = document.getElementById('lesson'); if (el && !el.hidden && e.key === 'Escape') lessonClose(false); });
