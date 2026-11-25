'use strict';
/* =========================================================
   Kolay mod — animation-first screens built on the same engine
   ========================================================= */
const SU = { st: 'pick', auto: false, playing: false, acc: 0, caption: '', dwellUI: false, result: null, justBuilt: false };

/* ---------------- quick setup (EPC) ---------------- */
const LEVELS = {
  eco: { t: 'Ekonomik', d: 'Ucuz başlar, işletmede sorun çıkarır: standart kazan sacı, alevli brülör, temel lab, filtre yok.', ov: { survey: 'no', pitwp: 'bitumen', runout: 50, bund: 'epoxy', drain: 'combined', degTank: 'cs', degHeat: 'ss', skimmer: 'no', pickTank: 'hdpe', pickN: 2, rinseTank: 'pp', cascade: 'no', agit: 'no', fluxTank: 'pp', fluxHeat: 'ti', fluxFilter: 'no', refr: 'brick', burner: 'conv', kSteel: 's235', kThk: 40, fume: 'lip', ip: 'ip54', oven: 'burner', spin: 'no', acidRec: 'none', neut: 'yes', lab: 'basic' } },
  bal: { t: 'Dengeli', d: 'Deneyimli bir mühendisin seçimi: özel kazan sacı, yüksek hızlı brülör, tam laboratuvar, flux filtresi.', ov: {} },
  prem: { t: 'Premium', d: 'Her şeyin en iyisi: santrifüj hattı, kristalizasyon, sürekli emisyon izleme, 4 asit tankı.', ov: { spin: 'yes', acidRec: 'cryst', ced: 'full', pickN: 4 } }
};
function applyQuick() {
  const q = S.qs || (S.qs = { cap: 'medium', type: 'semi', shape: 'L', lvl: 'bal' });
  if (!q.type) q.type = 'semi';
  const ch = { ...defaultChoices(), ...RECOMMENDED, ...LEVELS[q.lvl].ov, capacity: q.cap, conv: q.type, partH: 6 };
  const hs = [9, 11, 12.5, 14, 16]; ch.height = hs.find(h => h >= reqHeight(ch)) || 16;
  S.epc.ch = ch; S.epc.layout = autoLayout(q.shape, ch);
}
const shapeIcon = k => {
  const b = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" style="fill:${c}"/>`;
  const t = ['#9fb4bd', '#a9d0e4', '#cbc56e', '#cbc56e', '#a9d0e4', '#b5e0d6', '#d9b38c'], hot = ['#8f9ba3', '#86b6cf'];
  let g = '';
  if (k === 'I') { t.concat(hot).forEach((c, i) => g += b(3 + i * 10.6, 10, 8, 26, c)); }
  if (k === 'L') { t.forEach((c, i) => g += b(3 + i * 9.5, 4, 7.5, 22, c)); hot.forEach((c, i) => g += b(72, 4 + i * 14, 24, 12, c)); }
  if (k === 'U') { t.forEach((c, i) => g += b(4 + i * 12.6, 2, 9.5, 18, c)); hot.forEach((c, i) => g += b(72 - i * 22, 26, 20, 16, c)); }
  return `<svg viewBox="0 0 100 46" class="shp" aria-hidden="true">${g}</svg>`;
};
function sEPC() {
  if (S.epc.done) {
    if (SU.justBuilt) {
      const rv = epcReview(S.plant.ch, S.epc.gw).filter(r => r.lvl === 'crit' || r.lvl === 'warn').slice(0, 6);
      return `<div class="hero"><div class="panel build">${isoSVG({ kettleLevel: 0, hot: false })}</div><div class="col"><div class="panel"><h2>Tesis inşa edildi</h2><p class="muted" style="margin-top:6px">${CAP[S.plant.cap].name}, ${FLOW_NAMES[S.plant.lay.flow]} yerleşim, kazanda ${S.plant.kT} t çinko yeri. Şimdi kazanı ilk kez ergitip devreye alacağız.</p>
        <div class="row" style="margin-top:12px"><button class="btn zinc big" data-mode="comm">Kazanı devreye al →</button></div></div>
        ${rv.length ? `<div class="panel"><h4>Bu tasarımın zayıf noktaları</h4><div class="stack small" style="margin-top:8px">${rv.map(r => `<div class="alert ${r.lvl}"><span class="lv">${LV[r.lvl]}</span><span style="flex:1">${r.t}</span>${I(r.enc)}</div>`).join('')}</div></div>` : ''}</div></div>`;
    }
    return viewEPCDone();
  }
  if (!S.qs) applyQuick();
  const q = S.qs, C = CAP[q.cap], cost = epcCost(S.epc.ch), zf = S.plant ? 0 : kettleTonnes(C) * zincPrice(), rest = C.budget - cost - zf;
  const card = (grp, v, title, body, extra = '') => `<button class="qcard ${q[grp] === v ? 'on' : ''}" data-qs="${grp}" data-v="${v}" aria-pressed="${q[grp] === v}">${extra}<b>${title}</b><span>${body}</span></button>`;
  return `<div class="col">
    <div class="panel intro"><h2>Galvaniz tesisini kur</h2><p class="muted">Dört seçim yapın, tesis kendini inşa etsin. Ayrıntıları değiştirmek isterseniz üstteki <b>Uzman mod</b> düğmesine geçebilirsiniz.</p></div>
    <div class="panel"><h3>1 · Kapasite</h3><div class="qgrid" style="margin-top:10px">
      ${card('cap', 'small', 'Küçük · 15.000 t/yıl', `Kazan 7 m · bütçe ${usd(CAP.small.budget)}`)}${card('cap', 'medium', 'Orta · 35.000 t/yıl', `Kazan 12 m · bütçe ${usd(CAP.medium.budget)}`)}${card('cap', 'heavy', 'Ağır · 70.000 t/yıl', `Kazan 15 m · bütçe ${usd(CAP.heavy.budget)}`)}</div></div>
    <div class="panel"><h3>2 · Tesis tipi ${I('conveyor')}</h3><div class="qgrid" style="margin-top:10px">
      ${card('type', 'manual', 'Manuel', `Monoray vinç + operatör. Her banyodan askıyı <b>siz</b> çıkarırsınız. Yatırım ${usd(300e3 * C.scale)}, işçilik +%30, yavaş.`)}${card('type', 'semi', 'Yarı otomatik', `Vinç programla taşır, <b>kazan daldırmasını siz</b> yönetirsiniz. Yatırım ${usd(900e3 * C.scale)}, standart işçilik.`)}${card('type', 'auto', 'Tam otomatik', `PLC her şeyi reçeteyle yapar, siz kimya ve siparişleri yönetirsiniz. Yatırım ${usd(2.2e6 * C.scale)}, işçilik –%25, hızlı.`)}</div></div>
    <div class="panel"><h3>3 · Yerleşim şekli ${I('flow')}</h3><div class="qgrid" style="margin-top:10px">
      ${card('shape', 'I', 'I-hattı', 'Düz hat. Giriş ve çıkış zıt uçlarda.', shapeIcon('I'))}${card('shape', 'L', 'L-tipi', 'Asit bir kanatta, sıcak bölge diğerinde.', shapeIcon('L'))}${card('shape', 'U', 'U-tipi', 'Giriş ve çıkış aynı cephede.', shapeIcon('U'))}</div></div>
    <div class="panel"><h3>4 · Donanım seviyesi</h3><div class="qgrid" style="margin-top:10px">
      ${Object.entries(LEVELS).map(([k, L]) => card('lvl', k, L.t, L.d)).join('')}</div></div>
    <div class="panel"><div class="grid2" style="align-items:center"><div>${isoSVG({ built: 9, kettleLevel: 0, hot: false })}</div>
      <div class="stack"><dl class="kv"><dt>Yatırım</dt><dd>${usd(cost)}</dd><dt>İlk çinko dolumu</dt><dd>${usd(zf)}</dd><dt>Kalan işletme sermayesi</dt><dd style="color:var(--${rest < 0 ? 'crit' : 'ok'})">${usd(rest)}</dd></dl>
      ${rest < 0 ? '<div class="alert crit"><span class="lv">BÜTÇE</span><span>Bu seçim bütçeyi aşıyor. Daha düşük donanım seviyesi seçin.</span></div>' : ''}
      <button class="btn zinc big" data-act="s-build" ${rest < 0 ? 'disabled' : ''}>Tesisi inşa et</button></div></div></div></div>`;
}

/* ---------------- commissioning ---------------- */
function sComm() {
  if (!S.comm) return '<div class="panel">Önce tesisi kurun.</div>';
  if (S.comm.done) return `<div class="panel"><h2>Kazan hazır</h2><p class="muted">Banyo 450 °C’de, üretime başlayabilirsiniz.</p><div class="row" style="margin-top:10px"><button class="btn zinc big" data-mode="prod">Üretim hattına geç →</button></div></div>`;
  if (S.comm.method !== 'A') S.comm.method = 'A';
  const A = S.comm.A;
  const pw = [[35, 'Kısık'], [55, 'Orta'], [75, 'Güçlü'], [100, 'Tam']];
  return `<div class="col"><div class="panel intro"><h2>Kazanı ilk kez ergit</h2><p class="muted">Külçeleri atın, ateşi ayarlayın. <b>Kural:</b> kazan boşken duvar 420 °C’yi geçmesin, yoksa sac hasar görür. Emin değilseniz <b>Otomatik operatör</b> sizin yerinize yapsın, siz izleyip öğrenin.</p></div>
   <div class="panel" style="padding:8px"><canvas id="s-kettle" class="anim" aria-label="Kazan kesiti animasyonu"></canvas></div>
   <div class="panel"><div class="row" style="justify-content:space-between;gap:12px">
     <div class="row"><span class="small"><b>Ateş</b></span>${pw.map(([v, t]) => `<button class="btn ${A.power === v ? 'primary' : ''}" data-act="s-pow" data-v="${v}">${t}</button>`).join('')}</div>
     <div class="row"><button class="btn" data-act="s-ing" data-v="c">+ Merkeze külçe</button><button class="btn" data-act="s-ing" data-v="s">+ Kenara külçe</button></div>
     <div class="row"><button class="btn ${SU.playing ? 'zinc' : 'primary'}" data-act="s-play">${SU.playing ? '❚❚ Durdur' : '▶ Zamanı akıt'}</button><button class="btn ${SU.auto ? 'zinc' : ''}" data-act="s-auto">${SU.auto ? 'Otomatik operatör açık' : 'Otomatik operatör'}</button></div></div>
   <div id="s-live">${sCommLive()}</div></div></div>`;
}
function sCommLive() {
  const A = S.comm.A, bs = bulkState(A), lvl = bs.liq / S.plant.kT, can = commCanFinish();
  const g = (k, v, c = '') => `<div class="gauge ${c}"><small>${k}</small><b>${v}</b></div>`;
  return `<div class="grid3" style="margin-top:12px">${g('Erime', '%' + Math.round(bs.melt * 100))}${g('Sıvı seviye', '%' + Math.round(lvl * 100))}${g('Kazan hasarı', '%' + Math.round(Math.min(100, A.dmg)), A.dmg > 30 ? 'bad' : A.dmg < 5 ? 'good' : '')}</div>
   <p class="caption">${A.dmg >= 100 ? '<b style="color:var(--crit)">Kazan delindi.</b> Yeni kazan kurulacak.' : SU.caption || (lvl < 0.9 && A.wall > 420 ? '<b style="color:var(--crit)">Duvar çok sıcak!</b> Ateşi kısın.' : bs.liq < 1 ? 'Önce merkeze 6–11 külçe atın, ateşi Orta yapın ve zamanı akıtın.' : bs.liq / Math.max(1, A.m) > 0.3 && bs.liq / S.plant.kT >= 0.1 && A.m < S.plant.kT - 10 ? 'Sıvı havuz yeterince büyüdü (≥ %10): artık kenarlara külçe atabilirsiniz.' : bs.liq > 0 && bs.liq / S.plant.kT < 0.1 ? 'Sıvı havuz oluşuyor. Kenara külçe atmak için seviyenin %10’u geçmesini bekleyin.' : 'Ergitme sürüyor…')}</p>
   ${A.dmg >= 100 ? `<button class="btn zinc" data-act="comm-recover">Yeni kazan kur</button>` : ''}
   ${can ? `<div class="alert ok" style="margin-top:8px"><span class="lv">HAZIR</span><span style="flex:1">Bütün çinko ergidi ve banyo ${Math.round(bs.T)} °C.</span><button class="btn zinc" data-act="s-commdone">Devreye almayı tamamla</button></div>` : ''}`;
}
function autoOperator() {
  const A = S.comm.A, kT = S.plant.kT, bs = bulkState(A), lvl = bs.liq / kT;
  let cap = '';
  if (A.m < kT - 10) {
    if (A.pile < kT * 0.3) { commAddIngot('center'); dropIngot(false); cap = 'Operatör: külçeleri ortada piramit yapıyor, duvara yaslamıyor.'; }
    else if (bs.liq / Math.max(A.m, 1) > 0.45 && bs.liq / kT >= 0.1) { commAddIngot('side'); dropIngot(true); cap = 'Operatör: sıvı havuz var, kenarlara külçe ekliyor. Sıvı ısıyı külçelere taşır.'; }
  }
  let p = lvl > 0.5 ? 90 : lvl > 0.2 ? 70 : 55;
  if (bs.melt >= 1 && bs.T > 452) p = 15; else if (A.m >= kT - 10 && bs.melt >= 1 && bs.T < 445) p = 60;
  if (A.power !== p) cap = cap || `Operatör: ateşi %${p} yaptı (sıvı seviye %${Math.round(lvl * 100)}: ${lvl < 0.2 ? 'kuru duvar çok, ateş orta' : lvl < 0.5 ? 'duvarın yarısı sıvıyla soğuyor' : 'duvar sıvıyla kaplı, tam güç güvenli'}).`;
  A.power = p; if (cap) SU.caption = cap;
}
function sKettleTick(dt) {
  if (!S.comm || S.comm.done || !SU.playing) return;
  SU.acc += dt;
  if (SU.acc < 0.45) return;
  SU.acc = 0;
  const A = S.comm.A;
  if (SU.auto) autoOperator();
  const wasAlarm = A.alarm;
  commStep(1);
  if (!SU.auto && A.alarm && !wasAlarm) SU.playing = false;
  if (A.dmg >= 100 || commCanFinish() || !$('#modal').hidden) SU.playing = false;
  const live = $('#s-live'); if (live) live.innerHTML = sCommLive();
  if (!SU.playing) render(); else renderChips();
}

/* ---------------- production line ---------------- */
function sBathStatus() {
  if (!S.prod) return {};
  const o = {}; sHealth().forEach(c => o[c.id] = c.status); o.pick = o.pick; return o;
}
const fluxBeTo = (f, be) => { const sg = 145 / (145 - be); return Math.max(0, (sg - 1 - 0.0008 * f.fe * 2.27) / 0.00046 - (f.zn + f.nh4)); };
function sHealth() {
  const b = S.prod.baths, k = S.prod.kettle, C = CAP[S.plant.cap], kT = S.plant.kT;
  const bar = (l, v, min, max, lo, hi, fmt) => ({ l, v, min, max, lo, hi, fmt, st: v < lo ? (v < lo - (hi - lo) * 0.6 ? 'crit' : 'warn') : v > hi ? (v > hi + (hi - lo) * 0.6 ? 'crit' : 'warn') : 'ok' });
  const cards = [
    { id: 'deg', name: 'Yağ alma', enc: 'degreasing', bars: [bar('Kimyasal %', b.deg.conc, 0, 8, 3, 6, v => n(v, 1)), bar('Yağ g/L', b.deg.oil, 0, 20, 0, 8, v => n(v, 1))],
      fix: [b.deg.conc < 3.5 && ['Kimyasal ekle', 'deg_add', Math.round((5 - b.deg.conc) * 10 * C.degVol)], b.deg.oil > 6 && ['Yağı sıyır', 'deg_skim']] },
    { id: 'r1', name: 'Durulama 1', enc: 'rinse', bars: [bar('Kirlilik µS', b.r1.cond, 0, 6000, 0, 3000, v => Math.round(v))], fix: [b.r1.cond > 2500 && ['Suyu tazele', 'r1_fresh']] },
    { id: 'pick', name: 'Asit (HCl)', enc: 'pickling', bars: [bar('Asit gücü g/L', b.pick.hcl, 0, 220, 100, 170, v => Math.round(v)), bar('Demir g/L', b.pick.fe, 0, 160, 0, 120, v => Math.round(v))],
      fix: [b.pick.hcl < 115 && ['Taze asit ekle', 'pick_hcl', Math.ceil((150 - b.pick.hcl) * C.acidVol / 371)], b.pick.fe > 100 && ['Banyoyu yenile', 'pick_regen'], b.pick.inh < 0.35 && ['İnhibitör ekle', 'pick_inh', 50]] },
    { id: 'r2', name: 'Durulama 2', enc: 'rinse', bars: [bar('Demir g/L', b.r2.fe, 0, 6, 0, 2, v => n(v, 1))], fix: [b.r2.fe > 1.5 && ['Suyu yenile', 'r2_renew']] },
    { id: 'flux', name: 'Flux', enc: 'fluxing', bars: [bar('Yoğunluk °Bé', fluxBe(b.flux), 5, 25, 12, 18, v => n(v, 1)), bar('pH', b.flux.ph, 3, 6, 4.2, 4.8, v => n(v, 2)), bar('Demir g/L', b.flux.fe, 0, 8, 0, 3, v => n(v, 1))],
      fix: [fluxBe(b.flux) < 13 && ['Tuz ekle', 'flux_double', Math.round(fluxBeTo(b.flux, 15) * C.fluxVol)], b.flux.ph < 4.25 && ['pH düzelt', 'flux_nh3', Math.round((4.5 - b.flux.ph) * C.fluxVol / 0.54)], b.flux.fe > 2.5 && ['Demiri temizle', 'flux_clean']] },
    { id: 'kettle', name: 'Kazan', enc: 'kettleChem', bars: [bar('Nikel %', k.ni, 0, 0.1, 0.04, 0.06, v => n(v, 3)), bar('Alüminyum %', k.al, 0, 0.01, 0.002, 0.0055, v => n(v, 4)), bar('Bizmut %', k.bi, 0, 0.15, 0.05, 0.1, v => n(v, 3)), bar('Dip dross t', k.dross, 0, kT * 0.03, 0, kT * 0.012, v => n(v, 1))],
      fix: [(k.ni < 0.04 || k.al < 0.002 || k.bi < 0.05) && ['Alaşımla', 'k_alloy'], k.dross > kT * 0.01 && ['Dross çek', 'k_dross']] }
  ];
  cards.forEach(c => { c.fix = c.fix.filter(Boolean); c.status = c.bars.some(x => x.st === 'crit') ? 'crit' : c.bars.some(x => x.st === 'warn') ? 'warn' : 'ok'; });
  return cards;
}
function sFix(k, amt) {
  const pr = S.prod, b = pr.baths, kt = pr.kettle;
  if (k === 'r1_fresh') { b.r1.cond = 450; spend(CAP[S.plant.cap].degVol * 2.2, 'chem'); return; }
  if (k === 'flux_clean') { if (b.flux.ph < 4) act('flux_nh3', Math.round((4.4 - b.flux.ph) * CAP[S.plant.cap].fluxVol / 0.54)); act('flux_h2o2'); if (b.flux.ph < 4.2) act('flux_nh3', Math.round((4.5 - b.flux.ph) * CAP[S.plant.cap].fluxVol / 0.54)); return; }
  if (k === 'k_alloy') {
    if (kt.ni < 0.05) act('k_ni', Math.round((0.05 - kt.ni) * kt.zinc * 10));
    if (kt.al < 0.0035) act('k_al', Math.round((0.0035 - kt.al) / 0.8 * kt.zinc * 10));
    if (kt.bi < 0.075) act('k_bi', Math.round((0.075 - kt.bi) * kt.zinc * 10)); return;
  }
  if (k === 'pick_regen') { act('pick_regen'); if (b.pick.fe > 90) act('pick_regen'); return; }
  act(k, amt);
}
function healthHTML() {
  return `<div class="hgrid">${sHealth().map(c => `<section class="hcard ${c.status}"><header><span class="dot ${c.status}"></span><b>${c.name}</b>${I(c.enc)}</header>
    ${c.bars.map(x => { const f = v => Math.max(0, Math.min(100, (v - x.min) / (x.max - x.min) * 100)); return `<div class="hbar"><span class="small">${x.l}</span><span class="mono small ${x.st}">${x.fmt(x.v)}</span><div class="track"><i class="zone" style="left:${f(x.lo)}%;width:${f(x.hi) - f(x.lo)}%"></i><i class="mk ${x.st}" style="left:${f(x.v)}%"></i></div></div>`; }).join('')}
    ${c.fix.length ? `<div class="row">${c.fix.map(([t, k, a]) => `<button class="btn sm zinc" data-sfix="${k}" data-a="${a ?? ''}">${t}</button>`).join('')}</div>` : '<span class="small muted">Normal</span>'}</section>`).join('')}</div>`;
}
const FIX_TXT = { degrease: 'Yağ alma kartından kimyasal ekleyin, yağı sıyırın.', pickle: 'Asit kartından taze asit ekleyin; demir yüksekse banyoyu yenileyin.', surface: 'Boyalı, cüruflu veya lazer kesimli parçayı kumlamaya gönderin.', flux: 'Flux kartından tuz, pH ve demiri düzeltin.', dry: 'Parça ıslak gitti: fırın kazana yakın olmalı (yerleşim).', al: 'Alüminyum fazla: bir süre alaşım eklemeyin.', dross: 'Kazan kartından dross çekin.', skim: 'Kül sıyırmayı atlamayın.', withdraw: 'Cıvatalar için santrifüj hattı gerekir; askı açısı 10–15° olmalı.', temp: 'Kazan sıcaklığı 445–455 °C olmalı.', steel: 'Reaktif çelik: kazanda Ni %0,04+ tutun, kaynama durunca hemen çekin.', vent: 'Kapalı profile mutlaka delik deldirin.', passiv: 'Pasivasyonu atlamayın.', overpickle: 'Asitte inhibitör eksik: inhibitör ekleyin.', dwell: 'Kaynama tamamen durduğu an çekin; erken çekmeyin.', cool: 'Kalın parçayı suda soğutun.' };
const PNAME = { hea: 'Kiriş', rhs: 'Kutu profil', pole: 'Direk', angle: 'Köşebent', guard: 'Bariyer', grat: 'Izgara', plate: 'Ağır plaka', bolt: 'Cıvata', tray: 'Kablo tavası' };

function sProd() {
  const pr = S.prod; fillRFQs();
  return `<div class="col"><div class="panel" style="padding:8px"><div class="animwrap"><canvas id="s-line" class="anim" aria-label="Üretim hattı animasyonu"></canvas></div>
     <div class="row" style="justify-content:space-between;margin-top:6px"><span class="small muted">Tanka tıklayıp bilgi almak için alttaki kartlardaki <b>i</b> düğmelerini kullanın.</span><span class="row"><span class="small">Hız</span>${[1, 2, 4].map(v => `<button class="btn sm ${AN.speed === v ? 'primary' : ''}" data-act="s-speed" data-v="${v}">${v}×</button>`).join('')}</span></div></div>
   <div class="layout"><div class="col"><div class="panel" id="s-ctx">${sCtx()}</div></div><div class="col"><div class="panel"><div class="ph"><h4>Banyo durumu</h4><span class="small muted">canlı sensör</span></div>${healthHTML()}</div></div></div></div>`;
}
function sCtx() {
  const pr = S.prod, o = pr.order;
  if (SU.st === 'result' && SU.result) return resultHTML();
  if (SU.st === 'run') {
    if (SU.dwellUI) { const D = AN.dwell, k = D.id === 'kettle', mx = Math.max(D.hi * 1.8, D.lo + 2), pc = v => Math.min(100, v / mx * 100);
      return `<h3>${D.title}</h3><p class="caption">${k ? (D.auto ? 'PLC reçetesi parçayı kaynama durduktan hemen sonra kendisi çekecek. İzleyin: kabarcıklar azalıyor, flux tuzları ayrışıyor, çelik ısınıyor.' : 'Yüzeyde kaynama görüyorsunuz: flux tuzları ayrışıyor, çelik ısınıyor. <b>Kaynama durunca parçayı çekin.</b> Erken çekerseniz kaplama eksik kalır; reaktif çelikte geç çekerseniz kaplama çok kalınlaşır.') : D.hint + ' <b>Yeşil aralıkta çıkarın.</b>'}</p>
      ${k ? `<div class="boil"><span class="small">Kaynama</span><div class="boilbar"><i id="boil-i" style="width:100%"></i></div></div>` : ''}
      <div class="row" style="justify-content:space-between;margin-top:8px"><span class="small">Süre${k ? '' : ` · hedef ${n(D.lo, 0)}–${n(D.hi, 0)} dk`}</span><span class="mono" id="boil-t">0,0 dk</span></div>
      ${k ? '' : `<div class="track big"><i class="zone" style="left:${pc(D.lo)}%;width:${pc(D.hi) - pc(D.lo)}%"></i><i class="mk" id="dw-mk" style="left:0%"></i></div>`}
      ${D.auto ? '<p class="small muted">Otomatik tesis: müdahale gerekmiyor.</p>' : `<button class="btn zinc huge" data-act="s-pull">${k ? 'Yukarı çek' : 'Çıkar'}</button>`}`; }
    return `<h3>Hat çalışıyor</h3>${S.plant.ch.conv === 'manual' ? '<p class="small"><b>Manuel tesis:</b> askı her banyoya girdiğinde çıkarma zamanını siz belirleyeceksiniz.</p>' : ''}<p class="caption">${o ? `${esc(o.cust)} · ${esc(o.p.name)} · ${n(o.tons)} t` : ''}</p><p class="small muted">Askı sırasıyla yağ alma, durulama, asit, durulama ve flux banyolarına girip kurutma fırınından geçiyor. Parçanın rengine dikkat: siyah tufal asitte temiz gri çeliğe dönüşür.</p>`;
  }
  if (o && pr.stage === 'qc') { if (!o.qc.cooled) coolBatch('quench', true); ['thk', 'metal', 'hammer'].forEach(x => o.qc.tests[x] = true); o.defects.forEach(x => x.pick = x.cause); SU.st = 'result'; SU.result = o; return resultHTML(); }
  if (o && ['recv', 'jig', 'line'].includes(pr.stage)) return inspectHTML(o);
  // pick order
  return `<h3>Sipariş seç</h3><p class="small muted" style="margin-bottom:10px">Bir siparişi alın; hat onu sizin için işler. Etiketler size dikkat etmeniz gerekeni söyler.</p>
   <div class="stack">${pr.rfqs.map((q, i) => { const tags = sTags(q); return `<div class="order"><div><b>${PNAME[q.p.id] || q.p.name}</b> <span class="small muted">${esc(q.p.name)} · ${esc(q.cust)}</span><div class="row" style="margin-top:4px">${tags.map(([c, t]) => `<span class="pill ${c}">${t}</span>`).join('')}</div></div><div class="stack" style="align-items:flex-end"><span class="mono">${n(q.tons)} t · ${usd(q.tgt)}/t</span><span class="mono small muted">≈ ${usd(q.tons * q.tgt)}</span><button class="btn sm primary" data-act="s-take" data-i="${i}">Siparişi al</button></div></div>`; }).join('')}</div>`;
}
function sTags(q) {
  const t = [];
  if (q.p.closed) t.push(q.vent === 'ok' ? ['ok', 'Kapalı profil, delikli'] : ['crit', 'Kapalı profil, delik ' + (q.vent === 'small' ? 'küçük' : 'yok')]);
  if (q.cls === 'peak' || q.cls === 'hyp') t.push(['warn', 'Reaktif çelik']);
  if (['paint', 'slag', 'laser'].includes(q.surface)) t.push(['warn', { paint: 'Boyalı', slag: 'Kaynak cüruflu', laser: 'Lazer kesim' }[q.surface]]);
  if (q.surface === 'grease') t.push(['info', 'Yağlı']);
  if (q.overlap) t.push(['warn', 'Bindirme kaynaklı']);
  if (q.len > CAP[S.plant.cap].kettle.L - 0.3) t.push(['warn', 'Kazandan uzun']);
  if (q.p.spin) t.push([S.plant.ch.spin === 'yes' ? 'info' : 'crit', S.plant.ch.spin === 'yes' ? 'Santrifüj hattında' : 'Santrifüj hattı yok']);
  if (!t.length) t.push(['ok', 'Sorunsuz']);
  return t;
}
function inspectHTML(o) {
  const d = o.dec, qs = [];
  if (o.p.closed && o.vent !== 'ok') qs.push(`<div class="q"><b>Kapalı profilde delik ${o.vent === 'small' ? 'çok küçük' : 'yok'}.</b> ${I('vent')}<p class="small">Kazanda içerideki hava ve nem 450 °C’de genleşir: parça patlayabilir, çinko fışkırır.</p><div class="row">${[['drill', `Delik deldir (${usd(35 * o.tons)})`], ['approve', 'Riske at']].map(([v, t]) => `<button class="btn ${d.ventAct === v ? 'primary' : ''}" data-act="s-dec" data-k="ventAct" data-v="${v}">${t}</button>`).join('')}</div></div>`);
  if (['paint', 'slag', 'laser'].includes(o.surface)) qs.push(`<div class="q"><b>Yüzeyde ${{ paint: 'boya', slag: 'kaynak cürufu', laser: 'lazer kesim oksidi' }[o.surface]} var.</b> ${I(SURFACES[o.surface].enc)}<p class="small">Asit bunu çözemez (veya çok yavaş çözer): o bölge çinko tutmaz.</p><div class="row">${[[true, `Kumlamaya gönder (${usd(25 * o.tons)})`], [false, 'Olduğu gibi']].map(([v, t]) => `<button class="btn ${d.blast === v && d.blastSet ? 'primary' : ''}" data-act="s-dec" data-k="blast" data-v="${v}">${t}</button>`).join('')}</div></div>`);
  const info = [];
  if (o.cls === 'peak' || o.cls === 'hyp') info.push(`<div class="alert warn"><span class="lv">ÇELİK</span><span>Si<sub>eq</sub> = %Si + 2,5 × %P = ${n(o.steel.Si, 3)} + 2,5 × ${n(o.steel.P, 3)} = <b>${n(o.se, 3)}</b> → ${SANDELIN.find(c => c.v === o.cls).t}. Kaplama kalın ve mat olabilir. Kazanda Ni %0,04+ olsun, kaynama durunca hemen çekin.</span>${I('sandelin')}</div>`);
  if (o.surface === 'grease') info.push(`<div class="alert info"><span class="lv">YAĞ</span><span>Ağır yağlı malzeme: yağ alma banyosu güçlü olmalı, yoksa asit çalışmaz.</span></div>`);
  if (o.p.spin && S.plant.ch.spin !== 'yes') info.push(`<div class="alert crit"><span class="lv">CIVATA</span><span>Santrifüj hattı yok: dişler çinkoyla dolacak.</span></div>`);
  const ready = (!o.p.closed || o.vent === 'ok' || d.ventAct) && (!['paint', 'slag', 'laser'].includes(o.surface) || d.blastSet);
  return `<h3>Malzeme kabul: ${PNAME[o.p.id] || ''}</h3><p class="small muted">${esc(o.cust)} · ${esc(o.p.name)} · ${n(o.tons)} t · ${usd(o.quote)}/t</p>
    <div class="stack" style="margin-top:10px">${qs.join('')}${info.join('')}${!qs.length && !info.length ? '<div class="alert ok"><span class="lv">OK</span><span>Malzeme hazır, bir sorun görünmüyor.</span></div>' : ''}</div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn zinc big" data-act="s-run" ${ready ? '' : 'disabled'}>Hatta gönder ▶</button></div>`;
}
function resultHTML() {
  const o = SU.result, c = o.coat, q = o.qc, iso = q.iso, ok = q.mean >= iso.mean && q.min >= iso.local, crit = o.defects.some(x => x.sev === 'crit' && x.id !== 'explode');
  const mx = Math.max(220, q.mean * 1.3), pct = v => Math.min(100, v / mx * 100);
  const look = c.eta < 4 ? ['Mat gri', '#9ea4a8'] : ['Parlak gümüş', '#d5dde2'];
  return `<h3>Parti tamamlandı</h3>
   <div class="row" style="gap:14px;margin-top:8px"><span class="swatch" style="background:${look[1]}"></span><div><b>${look[0]}</b><div class="small muted">${n(c.alloy, 0)} µm alaşım + ${n(c.eta, 0)} µm saf çinko</div></div></div>
   <div style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="small">Kaplama kalınlığı</span><span class="mono"><b>${n(q.mean, 0)} µm</b> · ISO 1461 en az ${iso.mean} µm</span></div>
     <div class="track big"><i class="fill ${ok ? 'ok' : 'crit'}" style="width:${pct(q.mean)}%"></i><i class="line" style="left:${pct(iso.mean)}%"></i></div>
     <p class="small">${ok ? '<span class="pill ok">ISO 1461 UYGUN</span>' : '<span class="pill crit">ISO 1461 ALTI</span>'} ${I('iso1461')}</p></div>
   <div class="stack" style="margin-top:10px">${o.defects.length ? o.defects.map(x => `<div class="alert ${x.sev === 'crit' ? 'crit' : x.sev === 'major' ? 'warn' : 'info'}"><span class="lv">${x.sev === 'crit' ? 'KRİTİK' : x.sev === 'major' ? 'MAJÖR' : 'MİNÖR'}</span><span style="flex:1"><b>${x.t}</b><br><span class="small">Neden: ${x.id === 'weep' ? 'Tasarım: bindirme kaynaklı yüzeyler arasına asit ve flux sıkıştı, kazanda buharlaşıp sızdı' : ROOT_CAUSES.find(r => r[0] === x.cause)[1]}</span><br><span class="small">Çözüm: ${x.id === 'weep' ? 'Müşteriye bindirme yüzeyini kesintisiz kaynakla kapatmasını veya delik açmasını önerin (tasarım hatası).' : FIX_TXT[x.cause]}</span></span>${I(x.enc)}</div>`).join('') : '<div class="alert ok"><span class="lv">KUSURSUZ</span><span>Düzgün, sürekli, parlak kaplama. Müşteri memnun.</span></div>'}</div>
   <dl class="kv" style="margin-top:10px"><dt>Çinko sarfiyatı</dt><dd>${n(c.used, 0)} kg · %${n(c.pickup, 2)}</dd><dt>Fatura</dt><dd>${usd(o.tons * o.quote * (crit ? 0.7 : 1))}${crit ? ' (iade kesintisi)' : ''}</dd></dl>
   <div class="row" style="justify-content:flex-end;margin-top:12px">${crit ? '<button class="btn" data-act="s-ship" data-v="rework">Yeniden galvanizle ve sevk et</button>' : ''}<button class="btn zinc big" data-act="s-ship" data-v="ship">Sevk et</button></div>`;
}
/* --- flow --- */
function sTake(i) {
  const pr = S.prod, q = pr.rfqs.splice(i, 1)[0];
  q.quote = q.tgt; q.dec = { cls: q.cls, ventAct: q.vent && q.vent !== 'ok' ? '' : 'ok', blast: false, blastSet: false, hanger: q.p.hanger, angle: 12, orient: 'incline' };
  pr.order = q; pr.stage = 'recv'; SU.st = 'inspect'; S.hour += 0.5;
  logMsg(`Sipariş alındı: ${q.cust} – ${q.p.name}, ${n(q.tons)} t @ ${usd(q.quote)}/t.`, 'ok'); fillRFQs(); checkDay();
}
function sPrepLine(o) {
  const pr = S.prod, b = pr.baths, k = pr.kettle, kT = S.plant.kT;
  if (o.dec.ventAct === 'drill') { spend(35 * o.tons, 'other'); o.vent = 'ok'; }
  if (o.dec.blast) S.hour += o.tons / 12;
  // operator auto-settings
  const sf = SURFACES[o.surface];
  let r = Math.pow(Math.max(b.pick.hcl, 1) / 130, 0.8) * (b.pick.fe < 120 ? 1 : Math.max(0.15, 1 - (b.pick.fe - 120) / 55)) * clamp(1 + (b.pick.temp - 22) * 0.03, 0.7, 1.4);
  const treq = (o.dec.blast ? 10 : sf.treq) / Math.max(r, 0.05);
  b.pick.time = clamp(Math.round(treq * 1.15 / 5) * 5, 10, 120);
  o.win = { pick: [Math.round(treq), Math.round(treq * 1.45)], kettle: o.p.spin ? 1.2 : 1.2 + 0.28 * o.p.t };
  b.deg.time = 15; b.flux.time = 2; b.oven.set = 100; k.set = 450; k.temp = 450; k.vw = 2; k.preSkim = true; k.postSkim = true; k.blow = !!o.p.closed; k.dipSpd = 'normal';
  // keep kettle full
  if (k.zinc < kT * 0.95) { const need = Math.round(kT - k.zinc); if (S.market.stock < need) act('buy_zinc', need - Math.floor(S.market.stock)); act('k_zinc', need); toast(`Kazana ${need} t külçe eklendi.`, 'info'); }
  pr.stage = 'line'; S.hour += 0.4;
}
function sStartRun() {
  const o = S.prod.order, d = o.dec; d.cls = d.cls || o.cls; d.hanger = d.hanger || o.p.hanger; d.orient = d.orient || 'incline'; d.angle = d.angle || 12; if (d.ventAct === '') d.ventAct = 'approve';
  sPrepLine(o); SU.st = 'run'; SU.dwellUI = false;
  AN.dwell = { on: false, t: 0, req: o.win.kettle, pulled: false };
  buildScript(o, sOnPull, sOnDone);
  render();
}
function sDwellStart() { SU.dwellUI = true; const c = $('#s-ctx'); if (c) c.innerHTML = sCtx(); dwellUiLoop(); }
function sDwellEnd() { SU.dwellUI = false; const c = $('#s-ctx'); if (c && SU.st === 'run') c.innerHTML = sCtx(); }
function dwellUiLoop() {
  if (!SU.dwellUI) return;
  const i = $('#boil-i'), t = $('#boil-t'), D = AN.dwell;
  if (i) { const inten = Math.max(0, 1 - D.t / D.req); i.style.width = (inten * 100).toFixed(0) + '%'; i.parentElement.classList.toggle('done', inten <= 0); }
  if (t) t.textContent = n(D.t, 1) + ' dk' + (D.id === 'kettle' && D.t >= D.req ? ' · kaynama durdu' : D.id !== 'kettle' && D.t >= D.lo && D.t <= D.hi ? ' · uygun' : D.id !== 'kettle' && D.t > D.hi ? ' · fazla' : '');
  const mk = $('#dw-mk'); if (mk) { const mx = Math.max(D.hi * 1.8, D.lo + 2); mk.style.left = Math.min(100, D.t / mx * 100) + '%'; mk.className = 'mk ' + (D.t < D.lo ? 'warn' : D.t > D.hi ? 'crit' : ''); }
  if (D.on) requestAnimationFrame(dwellUiLoop);
}
function sOnPull() {
  const o = S.prod.order; SU.dwellUI = false;
  S.prod.kettle.dwell = Math.max(0.5, +AN.dwell.t.toFixed(1));
  dipBatch(); coolBatch('quench', true); ['thk', 'metal', 'hammer'].forEach(x => { o.qc.tests[x] = true; });
  o.defects.forEach(x => x.pick = x.cause);
  const c = o.coat, P = AN.part;
  P.spots = o.defects.some(x => x.id === 'bare') ? 9 : 0; P.paint = false;
  tint(c.eta < 4 ? [158, 164, 168] : [214, 222, 227], 1.2); P.shine = c.eta >= 10 ? 1 : 0;
  const ctx = $('#s-ctx'); if (ctx) ctx.innerHTML = sCtx();
}
function sOnDone() { SU.st = 'result'; SU.result = S.prod.order; AN.rack.show = false; render(); }
function sShip(rework) {
  const o = S.prod.order, money0 = S.money;
  shipBatch(rework);
  // sell by-products automatically when bins fill up
  if (S.market.ashKg > 3000) act('sell_ash'); if (S.market.drossKg > 3000) act('sell_dross');
  toast(`Sevk edildi: ${usd(S.money - money0)} (kasa ${usd(S.money)})`, 'ok');
  SU.st = 'pick'; SU.result = null; AN.part = null;
}

/* --- events --- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-qs],[data-sfix],[data-act^="s-"]'); if (!t) return;
  e.stopPropagation();
  if (t.dataset.qs) { S.qs[t.dataset.qs] = t.dataset.v; applyQuick(); render(); return; }
  if (t.dataset.sfix) { const a = t.dataset.a === '' ? 0 : +t.dataset.a; sFix(t.dataset.sfix, a); checkDay(); toast(t.textContent.trim() + ': uygulandı.', 'ok'); render(); return; }
  const a = t.dataset.act, A = S.comm && S.comm.A;
  switch (a) {
    case 's-build': confirmEPC(); S.mode = 'epc'; SU.justBuilt = true; S.comm.method = 'A'; break;
    case 's-pow': A.power = +t.dataset.v; SU.caption = ''; break;
    case 's-ing': commAddIngot(t.dataset.v === 's' ? 'side' : 'center'); dropIngot(t.dataset.v === 's'); SU.caption = ''; const l = $('#s-live'); if (l) l.innerHTML = sCommLive(); renderChips(); return;
    case 's-play': SU.playing = !SU.playing; break;
    case 's-auto': SU.auto = !SU.auto; if (SU.auto) { SU.playing = true; SU.caption = 'Otomatik operatör devrede. İzleyin: her kararı burada açıklayacak.'; } break;
    case 's-commdone': SU.playing = false; SU.auto = false; commFinish('A'); S.mode = 'prod'; SU.st = 'pick'; toast('Kazan devrede. İlk iş: Kazan kartında “Alaşımla”.', 'ok'); break;
    case 's-speed': AN.speed = +t.dataset.v; break;
    case 's-take': sTake(+t.dataset.i); break;
    case 's-dec': { const d = S.prod.order.dec; if (t.dataset.k === 'blast') { d.blast = t.dataset.v === 'true'; d.blastSet = true; } else d[t.dataset.k] = t.dataset.v; break; }
    case 's-run': sStartRun(); return;
    case 's-pull': AN.dwell.pulled = true; return;
    case 's-ship': sShip(t.dataset.v === 'rework'); break;
  }
  render();
}, true);
