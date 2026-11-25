'use strict';
/* =========================================================
   HDG Architect & Plant Master — SIMULATION ENGINE
   All baths, the kettle and the economy are coupled here.
   ========================================================= */

const R = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wpick = o => { let s = Math.random() * Object.values(o).reduce((a, b) => a + b, 0); for (const k in o) { s -= o[k]; if (s <= 0) return k; } return Object.keys(o)[0]; };
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const usd = v => (v < 0 ? '−' : '') + '$' + (Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e4 ? Math.round(Math.abs(v) / 1e3) + 'k' : Math.round(Math.abs(v)).toLocaleString('tr-TR'));
const n = (v, d = 1) => Number(v).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

let S; // global game state

function defaultChoices() {
  const ch = {};
  EPC_STEPS.forEach(s => s.fields.forEach(f => { ch[f.key] = f.type === 'number' ? f.def : f.opts[0].v; }));
  ch.capacity = 'medium'; ch.height = 11;
  return ch;
}
function newState() {
  return {
    v: 4, mode: 'epc', day: 1, hour: 6, rep: 60, money: 0, tut: null,
    epc: { step: 0, ch: defaultChoices(), done: false, gw: +R(2.3, 7.2).toFixed(1), layout: { items: {} } },
    plant: null, comm: null, prod: null,
    market: { lme: 2850, prem: 185, hist: [], stock: 0, ashKg: 0, drossKg: 0 },
    pl: { revenue: 0, zinc: 0, chem: 0, energy: 0, labor: 0, byprod: 0, other: 0, capex: 0 },
    log: []
  };
}
function logMsg(t, lvl = 'info') { S.log.unshift({ d: S.day, h: Math.floor(S.hour), t, lvl }); if (S.log.length > 120) S.log.pop(); }
function spend(v, cat = 'other') { S.money -= v; if (S.pl[cat] !== undefined) S.pl[cat] += v; }
const zincPrice = () => S.market.lme + S.market.prem; // $/t delivered

/* ================= PHASE 1 – EPC ================= */
function fieldOpt(f, v) { return f.opts.find(o => String(o.v) === String(v)); }
function epcCost(ch) {
  const C = CAP[ch.capacity], ev = evalLayout(ch); let sum = C.building * 0.55 + shedCost(ch, ev.missing.length ? null : ev), items = [];
  EPC_STEPS.forEach(s => s.fields.forEach(f => {
    if (f.type === 'number') return;
    const o = fieldOpt(f, ch[f.key]); if (!o) return;
    const c = o.fixed ? o.c : o.c * C.scale; sum += c; items.push(c);
  }));
  return sum;
}
const pitDepth = ch => CAP[ch.capacity].kettle.D + 1.2;
const reqHeight = ch => +(ch.partH + 6.2).toFixed(1);
function pitRiskOf(ch, gw) {
  const pd = pitDepth(ch);
  if (ch.pitwp === 'hdpe') return false;
  if (ch.pitwp === 'bitumen') return gw < pd + 0.5;
  return gw < pd + 2;
}
function epcReview(ch, gw) {
  const out = [], C = CAP[ch.capacity];
  const add = (lvl, t, enc) => out.push({ lvl, t, enc });
  const rh = reqHeight(ch);
  if (ch.height < rh) add('crit', `Kanca yüksekliği yetersiz: gerekli ${n(rh)} m, seçilen ${n(ch.height)} m. Uzun parçalar çift daldırılmak zorunda kalır.`, 'height');
  else add('ok', `Kanca yüksekliği yeterli (gerekli ${n(rh)} m).`, 'height');
  if (ch.ced === 'basic') add('crit', 'ÇED: HCl buharı ve beyaz duman için arıtma taahhüdü yok. Başvuru reddedilir: 90 gün gecikme + $250k revizyon.', 'ced');
  else add('ok', 'ÇED emisyon taahhüdü yeterli.', 'ced');
  const pd = pitDepth(ch);
  if (ch.survey === 'yes') {
    const risk = pitRiskOf(ch, gw);
    add(risk ? 'crit' : 'ok', `Zemin etüdü: yeraltı suyu ${n(gw)} m, kazan çukuru tabanı ${n(pd)} m. ${risk ? 'Mevcut yalıtım suyu tutamaz – buhar patlaması riski!' : 'Yalıtım yeterli.'}`, 'survey');
  } else add(ch.pitwp === 'hdpe' ? 'warn' : 'crit', `Zemin etüdü yapılmadı: yeraltı suyu bilinmiyor (çukur tabanı ${n(pd)} m).${ch.pitwp === 'hdpe' ? ' HDPE membran güvenli tarafta.' : ' Yalıtım şansa bırakıldı.'}`, 'survey');
  if (+ch.runout < 100) add(+ch.runout === 0 ? 'crit' : 'warn', `Acil çinko haznesi kazan hacminin %${ch.runout}’i. Kazan delinmesinde sıvı çinko kontrolsüz yayılır.`, 'runout');
  else add('ok', 'Acil çinko toplama haznesi %110.', 'runout');
  if (ch.bund === 'plain') add('crit', 'Çıplak beton asit tavası: HCl betonu çözer, sızıntı yeraltı suyuna ulaşır.', 'bund');
  if (ch.drain === 'combined') add('warn', 'Ortak drenaj: alkali ve asidik atıksular karışır, nötralizasyon çamuru artar.', 'drain');
  if (ch.degHeat === 'cu') add('warn', 'Yağ alma serpantini bakır: alkali banyoda korozyon ve sık arıza.', 'heater');
  if (ch.skimmer === 'no') add('warn', 'Yağ sıyırıcı yok: yağ alma banyosunda yağ hızla birikir.', 'skimmer');
  if (ch.pickTank === 'cs') add('crit', 'Çıplak karbon çeliği asit tankı: HCl tankı haftalar içinde deler.', 'pickling');
  if (ch.pickTank === 'lead' && ch.acid === 'hcl') add('crit', 'Kurşun kaplama HCl ile uyumsuz (PbCl₂ oluşur). Kurşun yalnız H₂SO₄ için uygundur.', 'pickling');
  if (ch.acid === 'h2so4') add('warn', 'H₂SO₄ seçildi: banyo 60–80 °C ısıtılmalı (enerji maliyeti), duman emişi şart.', 'pickling');
  if (ch.acid === 'h2so4' && ch.pickTank === 'hdpe') add('warn', 'HDPE tank 60 °C üstünde sünme (creep) yapar; H₂SO₄ için kauçuk veya kurşun/tuğla tercih edilir.', 'pickling');
  if (ch.rinseTank === 'cs') add('warn', 'Karbon çeliği durulama tankı asidik sürüklenmeyle korozyona uğrar ve Fe taşır.', 'rinse');
  if (ch.cascade === 'no') add('warn', 'Kaskad yok: su tüketimi yüksek ve durulama 2 demiri yavaş düşer.', 'rinse');
  if (ch.fluxTank === 'ss') add('warn', 'Paslanmaz flux tankı 60 °C klorürde oyuklanır (pitting): flux demiri sürekli artar.', 'fluxing');
  if (ch.fluxHeat === 'cu') add('crit', 'Bakır flux eşanjörü: ZnCl₂/NH₄Cl bakırı çözer, eşanjör delinir.', 'heater');
  if (ch.fluxFilter === 'no') add('warn', 'Flux filtrasyonu yok: H₂O₂ ile çöktürülen Fe(OH)₃ tank dibinde kalır.', 'fluxfilter');
  if (ch.refr === 'brick') add('warn', 'Seramik fiber yok: ısı kaybı ve gaz tüketimi ~%15 yüksek.', 'refractory');
  if (ch.burner === 'conv') add('crit', 'Konvansiyonel brülör: alev çarpması kazan duvarında sıcak nokta yapar, kazan ömrü kısalır.', 'burner');
  if (ch.kSteel === 's235') add('crit', 'S235 kazan sacı (Si ≈ %0,20): Sandelin reaktivitesiyle duvar ~3 kat hızlı incelir.', 'kettle');
  if (+ch.kThk === 30) add('warn', '30 mm kazan et kalınlığı: korozyon payı düşük.', 'kettle');
  if (ch.fume === 'none') add('crit', 'Duman emiş yok: işçi sağlığı ve emisyon cezası riski.', 'fume');
  if (ch.ip === 'ip54') add('warn', 'IP54 motorlar asit buharında sık arıza yapar.', 'ip');
  if (ch.oven === 'none') add('warn', 'Kurutma fırını yok: ıslak parça kazanda çinko sıçratır, flux kurumaz.', 'oven');
  if (ch.neut === 'no') add('crit', 'Nötralizasyon yok: tüm atık su ve asit lisanslı bertarafa gider, deşarj cezası riski.', 'neut');
  if (ch.lab === 'basic') add('warn', 'Temel laboratuvar: titrasyon, OES ve metalografi dış laboratuvara gönderilir (5× maliyet).', 'lab');
  if (ch.spin === 'no') add('info', 'Santrifüj hattı yok: cıvata siparişleri ana kazanda risklidir.', 'spin');
  if (ch.acidRec === 'none') add('info', 'Asit geri kazanımı yok: asit yenileme maliyeti yüksek.', 'acidrec');
  const lev = evalLayout(ch);
  lev.issues.forEach(i => add(i.lvl, 'Yerleşim: ' + i.t, i.enc));
  const cost = epcCost(ch), budget = C.budget, zincFill = kettleTonnes(C) * 3035;
  if (cost + zincFill > budget) add('crit', `Bütçe aşımı: yatırım ${usd(cost)} + ilk çinko dolumu ≈ ${usd(zincFill)} > bütçe ${usd(budget)}.`, 'capacity');
  return out;
}
function confirmEPC() {
  const ch = S.epc.ch, C = CAP[ch.capacity], cost = epcCost(ch);
  S.money = C.budget; spend(cost, 'capex');
  S.epc.done = true;
  S.plant = {
    cap: ch.capacity, kT: kettleTonnes(C), ch: { ...ch },
    hookShort: ch.height < reqHeight(ch), pitRisk: pitRiskOf(ch, S.epc.gw),
    kettleWear: 0, built: true
  };
  const lev = evalLayout(ch);
  S.plant.layout = JSON.parse(JSON.stringify(S.epc.layout));
  S.plant.lay = { flow: lev.flow, route: lev.route, turns: lev.turns, flags: lev.flags, hrsF: lev.hrsF, sameSide: lev.sameSide, area: lev.area };
  S.plant.ch.flow = lev.flow;
  if (ch.ced === 'basic') { spend(250e3, 'other'); logMsg('ÇED başvurusu reddedildi: arıtma revizyonu ve 90 gün gecikme ($250k).', 'crit'); S.plant.ch.ced = 'std'; }
  logMsg(`Yerleşim: ${FLOW_NAMES[lev.flow]}, rota ${Math.round(lev.route)} m, bina ≈ ${Math.round(lev.area)} m².`, 'info');
  logMsg(`EPC tamamlandı. Yatırım ${usd(cost)}. Kazan kapasitesi ${S.plant.kT} t sıvı çinko.`, 'ok');
  S.comm = newComm();
  S.mode = 'comm';
}

/* ================= PHASE 2 – COMMISSIONING ================= */
const CP_S = 0.39, CP_L = 0.48, LAT = 112, TM = 419.5, E_S = CP_S * (TM - 20); // MJ/t
function newComm() {
  return { method: null, done: false,
    A: { hr: 0, power: 30, m: 0, E: 0, wall: 20, dmg: 0, pile: 0, liqHrs: 0, alloyEarly: false, moist: 0, gas: 0, events: [], running: false },
    B: { kpre: 400, ramp: 20, thermosOK: false, crack: 0, fill: 60, chain: true, hf: shuffleHF(), order: [], done: false, report: null } };
}
function shuffleHF() {
  const t = [['HF-1', '05:10'], ['HF-2', '06:35'], ['HF-3', '07:50']];
  return t.sort(() => Math.random() - 0.5).map(([id, time]) => ({ id, time }));
}
function bulkState(A) {
  if (A.m <= 0) return { T: 20, melt: 0, liq: 0 };
  const e = A.E / A.m;
  if (e < E_S) return { T: 20 + e / CP_S, melt: 0, liq: 0 };
  if (e < E_S + LAT) { const f = (e - E_S) / LAT; return { T: TM, melt: f, liq: f * A.m }; }
  return { T: TM + (e - E_S - LAT) / CP_L, melt: 1, liq: A.m };
}
function commStep(hours = 1) {
  const A = S.comm.A, P = S.plant, C = CAP[P.cap];
  for (let i = 0; i < hours; i++) {
    if (S.comm.done || A.dmg >= 100) break;
    const pw = A.power / 100, eff = P.ch.refr === 'fiber' ? 0.5 : 0.42;
    let bs = bulkState(A);
    const qIn = C.burnerMW * pw * 3600 * eff; // MJ/h
    const qLoss = A.m > 0 ? C.burnerMW * 0.18 * (bs.T - 20) / 430 * 3600 * (P.ch.refr === 'fiber' ? 0.85 : 1) : 0;
    if (A.m > 0) A.E = Math.max(0, A.E + qIn - qLoss);
    bs = bulkState(A);
    if (bs.T > 465) { A.E -= (bs.T - 465) * A.m * CP_L * 0.5; bs = bulkState(A); } // overheated small melt radiates heat away
    const level = bs.liq / P.kT;
    const hv = P.ch.burner === 'hv' ? 1 : 1.12;
    const dryTarget = 20 + pw * 620 * hv * (1 - 0.65 * level) + (A.m === 0 ? 160 * pw : 0);
    const wetTarget = bs.T + pw * 25 * hv;
    const target = level > 0.9 ? wetTarget : dryTarget; // below 90 % level the hottest point is the dry upper wall
    A.wall += (target - A.wall) * 0.55;
    if (level < 0.9 && A.wall > 420) {
      A.dmg += (A.wall - 420) * 0.05;
      if (!A.alarm) { A.alarm = true; A.running = false; A.events.push(`Saat ${A.hr + 1}: ALARM – kuru duvar ${Math.round(A.wall)} °C > 420 °C. Otomatik çalışma durduruldu; brülör gücünü düşürün.`); if (typeof toast === 'function') toast(`ALARM: kuru duvar ${Math.round(A.wall)} °C. Brülörü düşürün.`, 'crit'); }
    } else A.alarm = false;
    if (A.wall > 480) A.dmg += (A.wall - 480) * 0.1;
    if (A.dmg >= 50 && !A.warned50) { A.warned50 = true; A.running = false; queueEvent({ title: 'Kazan hasarı %50', lvl: 'warn', enc: 'kettle', body: `Ultrasonik ölçüm kazan duvarında lokal incelme gösteriyor (hasar %${Math.round(A.dmg)}). Hasar %100’e ulaşırsa kazan delinir. Sebep çoğunlukla <b>kuru duvarın 420 °C’yi aşmasıdır</b>: sıvı seviye düşükken brülör gücü fazla. Gücü %40–55’e indirin, sıvı havuz büyüdükçe kademeli artırın.`, choices: [{ t: 'Anladım – brülörü %40’a düşür', fn: () => { A.power = 40; } }] }); }
    A.gas += C.burnerMW * pw * 1000 / 9.5; // Nm3 per hour
    spend(C.burnerMW * pw * 1000 / 9.5 * 0.42, 'energy');
    A.hr++;
    if (bs.liq > 0) A.liqHrs++;
    // groundwater moisture in pit
    if (P.pitRisk && A.liqHrs === 5 && !A.moist) { A.moist = 1; A.running = false; queueEvent(eventPitMoisture('comm')); }
    if (A.moist === 2 && Math.random() < 0.35) { steamExplosion('comm'); }
    commCheckBreach();
  }
}
function commCheckBreach() { const A = S.comm && S.comm.A; if (A && !S.comm.done && A.dmg >= 100 && !(S.plant && S.plant.breach)) { A.running = false; kettleBreach('comm'); } }
function commAddIngot(where) {
  if (S.comm.A.dmg >= 100) return commCheckBreach();
  const A = S.comm.A, P = S.plant, bs = bulkState(A);
  if (A.m + 10 > P.kT * 1.02) return toast('Kazan dolu – fazla külçe taşma yapar.', 'warn');
  if (S.market.stock >= 10) S.market.stock -= 10; else spend(10 * zincPrice(), 'zinc');
  const liqFrac = A.m > 0 ? bs.liq / A.m : 0;
  if (where === 'center') {
    A.pile += 10;
    if (A.pile > P.kT * 0.35 && liqFrac < 0.1) { A.dmg += 4; A.events.push(`Saat ${A.hr}: Piramit stabilitesini kaybetti, külçeler duvara yaslandı (+4 hasar).`); }
  } else {
    A.side = (A.side || 0) + 10;
    if (liqFrac < 0.25 || bs.liq / P.kT < 0.08) { A.dmg += 6; A.events.push(`Saat ${A.hr}: Sıvı havuz yokken yan duvara soğuk külçe – termal şok/darbe (+6 hasar).`); }
    else A.events.push(`Saat ${A.hr}: Yan duvarlara 10 t külçe eklendi – ısı transferi iyileşti.`);
  }
  A.m += 10;
  commCheckBreach();
}
function commAlloyEarly() {
  const A = S.comm.A; A.alloyEarly = true; A.dmg += 2;
  A.events.push(`Saat ${A.hr}: Ergitme bitmeden alaşım atıldı – Ni/Al segregasyonu, ilk dross oluştu.`);
  toast('Kural ihlali: ergitme tamamlanmadan alaşım eklenmez.', 'crit');
  commCheckBreach();
}
function commCanFinish() { const A = S.comm.A, bs = bulkState(A); return bs.liq >= S.plant.kT * 0.9 && bs.melt >= 1 && bs.T >= 440 && bs.T <= 465; }
function commFinish(method) {
  const P = S.plant;
  let zinc = P.kT, wear = 0, note = '';
  if (method === 'A') { const A = S.comm.A; zinc = A.m; wear = A.dmg * 0.4; note = `${A.hr} saat, ${Math.round(A.gas).toLocaleString('tr-TR')} Nm³ gaz, kazan hasarı %${n(A.dmg, 0)}`; }
  else { wear = S.comm.B.report.dmg * 0.4; note = S.comm.B.report.summary; }
  P.kettleWear = wear;
  S.comm.done = true;
  advanceDays(method === 'A' ? Math.max(1, Math.ceil(S.comm.A.hr / 24)) : 3);
  S.prod = newProd(zinc, method === 'A' && S.comm.A.alloyEarly);
  S.rep += method === 'A' && S.comm.A.dmg < 10 ? 4 : 0;
  logMsg(`Kazan devreye alındı (${method === 'A' ? 'külçe ergitme' : 'sıvı çinko transferi'}): ${note}.`, 'ok');
  S.mode = 'prod';
}
function commMethodB() {
  const B = S.comm.B, P = S.plant, C = CAP[P.cap];
  let dmg = 0, cost = 0, lines = [];
  // kettle preheat
  if (B.kpre > 420) { dmg += (B.kpre - 420) * 0.5; lines.push(['crit', `Boş kazan ${B.kpre} °C’ye ısıtıldı: kuru duvar 420 °C sınırını aştı (+${n((B.kpre - 420) * 0.5, 0)} hasar).`]); }
  else if (B.kpre < 250) { dmg += 15; lines.push(['crit', `Kazan yalnız ${B.kpre} °C: ilk döküm duvarda dondu (skull), termal şok (+15 hasar).`]); }
  else if (B.kpre < 350) { dmg += 5; lines.push(['warn', `Kazan ${B.kpre} °C: kısmi donma, transfer yavaşladı (+5 hasar).`]); }
  else lines.push(['ok', `Kazan ${B.kpre} °C’de kuru duvar sınırı içinde ön ısıtıldı.`]);
  // thermos preheat
  const hrs = (450 - 20) / B.ramp;
  if (B.ramp > 25) { cost += 120e3; lines.push(['crit', `Thermos ${B.ramp} °C/saat ile ısıtıldı (${n(hrs)} saat): refrakter ana çatlak, yeniden örüm $120k.`]); }
  else if (B.ramp > 20) { cost += 40e3; lines.push(['warn', `Thermos ${B.ramp} °C/saat: kılcal çatlaklar, tamir $40k.`]); }
  else lines.push(['ok', `Thermos ${B.ramp} °C/saat ile ${n(hrs)} saatte kurutuldu ve ön ısıtıldı.`]);
  // fill level
  const tripT = B.fill < 50 ? 26 : 25 - (B.fill - 60) * 0.06;
  const trips = Math.ceil(P.kT / tripT);
  if (B.fill < 50) { cost += 65e3; S.rep -= 4; lines.push(['crit', `Dolum kapağa ${B.fill} mm: taşıma sırasında sıvı çinko taştı – yanık riski, zemin hasarı $65k.`]); }
  else if (B.fill > 75) lines.push(['warn', `Dolum kapağa ${B.fill} mm: pota verimsiz, ${trips} sefer gerekti.`]);
  else lines.push(['ok', `Dolum kapağın ${B.fill} mm altında: güvenli genleşme payı.`]);
  if (!B.chain) { cost += 55e3; dmg += 3; lines.push(['crit', '3. seferde flanş gerilmesi: kaldırma kulağında çatlak, tamir $55k.']); }
  else lines.push(['ok', 'Zincir destek mekanizması devrede: flanş gerilmesi yok.']);
  const correct = [...B.hf].sort((a, b) => a.time.localeCompare(b.time)).map(h => h.id).join('>');
  if (B.order.join('>') !== correct) { cost += 90e3; lines.push(['crit', `Bekletme fırını sırası hatalı (${B.order.join(' → ')}). Bekleyen fırında aşırı ısınma ve LMC: pompa + fırın tamiri $90k. Doğru: ${correct.replace(/>/g, ' → ')}.`]); }
  else lines.push(['ok', `Pompalama sırası doğru: ${correct.replace(/>/g, ' → ')} (ilk dolan önce).`]);
  const zc = P.kT * (zincPrice() + 60) + trips * 1800;
  spend(zc, 'zinc'); spend(cost, 'other');
  spend(C.burnerMW * 0.5 * 36 * 1000 / 9.5 * 0.42, 'energy');
  B.report = { dmg, lines, trips, zc, cost, summary: `${trips} pota seferi, ek hasar maliyeti ${usd(cost)}, kazan hasarı %${n(dmg, 0)}` };
  if (P.pitRisk) queueEvent(eventPitMoisture('commB'));
}

/* ---------- Events ---------- */
let EVQ = [];
function queueEvent(ev) { EVQ.push(ev); if (typeof showNextEvent === 'function') showNextEvent(); }
function eventPitMoisture(ctx) {
  return { title: 'ALARM: Kazan çukurunda nem', lvl: 'crit', enc: 'kettlepit',
    body: `Çukur tabanındaki nem sensörü ve drenaj kuyusu yükselen yeraltı suyunu gösteriyor (seviye ${n(S.epc.gw)} m). Kazan altında su birikirse ve bir sızıntı olursa erimiş çinko ile temas buhar patlamasına yol açar.`,
    choices: [
      { t: 'Ateşi düşür, dewatering pompası + enjeksiyon membran onarımı ($180k, 2 gün)', fn: () => { spend(180e3, 'other'); S.plant.pitRisk = false; if (S.comm?.A) S.comm.A.moist = 3; advanceDays(2); logMsg('Kazan çukuru drenajı ve membran onarımı yapıldı.', 'ok'); } },
      { t: 'Riski kabul et ve devam et', fn: () => { if (ctx === 'comm') S.comm.A.moist = 2; else S.plant.pitMoistIgnored = true; logMsg('Çukur nem alarmı yok sayıldı.', 'crit'); } }
    ] };
}
function steamExplosion(ctx) {
  spend(1.2e6, 'other'); S.rep -= 30; S.plant.pitRisk = false; S.plant.pitMoistIgnored = false;
  if (ctx === 'comm') { S.comm.A.dmg += 45; setTimeout(commCheckBreach, 0); S.comm.A.moist = 3; S.comm.A.running = false; S.comm.A.events.push('BUHAR PATLAMASI: çukura sızan su erimiş çinkoyla temas etti.'); }
  else S.plant.kettleWear += 30;
  logMsg('BUHAR PATLAMASI – kazan çukuru. 3 yaralı, tesis 3 hafta kapalı, $1,2M hasar.', 'crit');
  queueEvent({ title: 'BUHAR PATLAMASI', lvl: 'crit', enc: 'kettlepit', body: 'Kazan çukuruna sızan yeraltı suyu sıvı çinko ile temas etti. Su ~1700 kat hacimle buharlaştı ve sıvı çinko fışkırdı. 3 operatör yaralandı, tesis 21 gün kapalı kaldı. Maliyet: $1,2M, itibar −30.', choices: [{ t: 'Kök neden: çukur yalıtımı + nem alarmının yok sayılması. Devam et.', fn: () => advanceDays(21) }] });
}
function kettleBreach(ctx) {
  const P = S.plant, ro = +P.ch.runout, kT = P.kT;
  let cost = 0, text = '';
  const kc = (P.ch.kSteel === 'armco' ? 780e3 : 420e3) * CAP[P.cap].scale;
  if (ro >= 100) { cost = kc + 150e3; text = 'Sıvı çinko refrakter kanallardan acil toplama haznesine aktı ve dondu. Yaralanma yok. Çinko blokları kırılıp yeniden ergitilecek (%85 geri kazanım).'; }
  else if (ro > 0) { cost = kc + 1.1e6; S.rep -= 15; text = 'Acil hazne yetersiz kaldı: taşan çinko kablo kanallarını ve fırın temelini tahrip etti.'; }
  else { cost = kc + 2.8e6; S.rep -= 35; text = 'Acil toplama haznesi yok: yüzlerce ton sıvı çinko tesise yayıldı. Yangın, büyük çaplı hasar.'; }
  spend(cost, 'other');
  logMsg(`KAZAN DELİNDİ – ${usd(cost)} kayıp.`, 'crit');
  P.breach = { ctx, text, cost, recovered: ro >= 100 ? 0.85 : 0.5 };
  queueEvent(breachEvent());
}
function breachEvent() {
  const b = S.plant.breach;
  return { title: 'KAZAN DELİNDİ', lvl: 'crit', enc: 'runout', body: `${b.text} Yeni kazan + onarım: ${usd(b.cost)}.<br><br><b>Ders:</b> devreye almada hasarın ana kaynağı, sıvı seviye düşükken kuru duvarın 420 °C’yi aşmasıdır. Yeni denemede brülörü %50–55’te tutun, sıvı havuz oluşunca kademeli artırın; yan duvarlara ancak havuz oluşunca külçe ekleyin.`,
    choices: [{ t: 'Yeni kazanı kur ve devreye almayı yeniden başlat', fn: () => replaceKettle() }] };
}
function replaceKettle() {
  const P = S.plant, b = P.breach; if (!b) return;
  advanceDays(25);
  const zincBack = b.ctx === 'comm' ? S.comm.A.m : (S.prod ? S.prod.kettle.zinc : P.kT);
  S.market.stock += Math.round(zincBack * b.recovered);
  P.kettleWear = 0; P.wearWarned = false; P.breach = null; S.comm = newComm(); S.prod = null; S.mode = 'comm';
  logMsg(`${Math.round(zincBack * b.recovered)} t çinko blok stoğa alındı. Yeni kazan kuruldu; devreye alma yeniden başlıyor.`, 'warn');
}
function commRecover() {
  if (S.plant && S.plant.breach) { if (!EVQ.length) queueEvent(breachEvent()); return; }
  commCheckBreach();
}

/* ================= PHASE 3 – PRODUCTION ================= */
function newProd(zinc, alloyEarly) {
  const C = CAP[S.plant.cap];
  return {
    batch: 0,
    baths: {
      deg: { conc: 4.8, set: 70, oil: 1.2, time: 15 },
      r1: { cond: 600, flow: 'med' },
      pick: { hcl: 150, fe: 22, inh: 0.8, temp: 24, time: 45 },
      r2: { fe: 0.5, acid: 0.4 },
      flux: { zn: 155, nh4: 125, ph: 4.6, fe: 0.7, set: 58, wet: 0.6, time: 2 },
      oven: { set: 100 }
    },
    kettle: { set: 450, temp: 450, zinc, ni: 0, al: 0, bi: 0, dross: alloyEarly ? 4 : 0.5, preSkim: true, postSkim: true, dwell: 4, vw: 2, dipSpd: 'normal', blow: false },
    known: {}, rfqs: [], order: null, stage: 'rfq', hist: [], results: [],
    stats: { tons: 0, zinc: 0, batches: 0, pass: 0, defects: 0 },
    idleHrs: 0
  };
}
/* --- derived values --- */
const fluxSG = f => 1 + 0.00046 * (f.zn + f.nh4) + 0.0008 * f.fe * 2.27;
const fluxBe = f => 145 - 145 / fluxSG(f);
const fluxACN = f => f.nh4 / (f.zn + f.nh4);
const pickSG = p => 1 + 0.00048 * p.hcl + 0.00085 * p.fe * 2.27;
const pickBe = p => 145 - 145 / pickSG(p);
const r1pH = r => +(7 + Math.min(4.5, r.cond / 1400)).toFixed(1);
const r2pH = r => +(Math.max(1.2, 6.5 - r.acid * 2.2)).toFixed(1);

function genRFQ() {
  const C = CAP[S.plant.cap], p = pick(PRODUCTS);
  const tons = +(R(C.batch[0], C.batch[1]) * R(p.tons[0], p.tons[1])).toFixed(1);
  let cls = wpick(p.chem); if (cls === 'alk') cls = 'hypo';
  const Si = { hypo: R(0.005, 0.022), peak: R(0.035, 0.105), seb: R(0.14, 0.22), hyp: R(0.27, 0.42) }[cls];
  const P_ = R(0.006, 0.028);
  let si = Si; // keep Si_eq inside the drawn class
  const se0 = si + 2.5 * P_;
  const target = { hypo: [0.008, 0.028], peak: [0.04, 0.115], seb: [0.13, 0.24], hyp: [0.27, 0.45] }[cls];
  if (se0 > target[1]) si = Math.max(0.002, target[1] - 2.5 * P_ - 0.003);
  if (si + 2.5 * P_ < target[0]) si = target[0] - 2.5 * P_ + 0.003;
  const steel = { C: R(0.08, 0.2), Si: +si.toFixed(3), P: +P_.toFixed(3), Mn: R(0.5, 1.45), S: R(0.004, 0.02), Al: cls === 'hypo' ? R(0.02, 0.05) : R(0.001, 0.008) };
  const surface = pick(p.surf);
  const vent = p.closed ? wpick({ ok: 0.45, missing: 0.35, small: 0.2 }) : null;
  const issues = [];
  if (vent && vent !== 'ok') issues.push('vent');
  const overlap = !p.closed && Math.random() < 0.22; if (overlap) issues.push('overlap');
  const len = p.len;
  const kL = C.kettle.L - 0.3;
  if (len > kL) issues.push('length');
  if (surface === 'paint' || surface === 'slag') issues.push('surface');
  const mixed = p.id === 'plate' || (p.id === 'hea' && Math.random() < 0.3); if (mixed) issues.push('mixed');
  const tgt = Math.round(p.price * R(0.93, 1.1) * (0.85 + S.rep / 400));
  return { id: Math.random().toString(36).slice(2, 7).toUpperCase(), cust: pick(CUSTOMERS), p, tons, steel, se: +(steel.Si + 2.5 * steel.P).toFixed(3), cls: sandelinClass(steel.Si + 2.5 * steel.P), surface, vent, overlap, len, mixed, issues, tgt, quote: tgt, flags: [] };
}
function fillRFQs() { const pr = S.prod; while (pr.rfqs.length < 3) pr.rfqs.push(genRFQ()); }
function rfqNotes(q) {
  const notes = [`${q.p.name} – ${q.p.grade}, et kalınlığı ${n(q.p.t)} mm, boy ${n(q.len)} m, ${n(q.tons)} t.`];
  if (q.p.closed) notes.push(q.vent === 'ok' ? 'Uç plakalarında Ø20 mm havalandırma delikleri mevcut.' : q.vent === 'small' ? 'Uç plakalarında Ø6 mm delik var.' : 'Uç plakaları tam nüfuziyetli kaynakla kapatılmış.');
  if (q.overlap) notes.push('Bağlantı levhaları 300×400 mm bindirme kaynaklı (köşe kaynağı, kesintisiz değil).');
  if (q.mixed) notes.push('Aynı parçada 8 mm gövde + 25 mm flanş levhası birleşimi.');
  if (q.surface === 'paint') notes.push('Parçalar atölyede numaralandırılmış, kısmen astar boyalı.');
  if (q.surface === 'slag') notes.push('Örtülü elektrod kaynağı; cüruf temizliği müşteri tarafından yapılmayacak.');
  if (q.surface === 'grease') notes.push('Bükme / kesme yağlı ürün.');
  if (q.surface === 'laser') notes.push('Oksijen lazer kesim kenarları.');
  if (q.p.spin) notes.push('Diş toleransı 6g; somun sonradan geçmeli (overtapped).');
  return notes;
}
const DFG_LABELS = { vent: 'Havalandırma/drenaj deliği yetersiz', overlap: 'Bindirme yüzeyi – asit/flux sıkışması', length: 'Parça boyu kazana sığmıyor (çift daldırma)', surface: 'Boya/cüruf – mekanik temizlik şart', mixed: 'Farklı et kalınlığı – çarpılma ve kalınlık farkı' };
function submitQuote(i) {
  const pr = S.prod, q = pr.rfqs[i];
  const prob = clamp(1 / (1 + Math.exp((q.quote - q.tgt * 1.03) / (q.tgt * 0.045))) * (0.7 + S.rep / 200), 0.03, 0.97);
  const correct = q.flags.filter(f => q.issues.includes(f)).length, wrong = q.flags.filter(f => !q.issues.includes(f)).length;
  S.hour += 0.5;
  const accepted = Math.random() < prob + correct * 0.05;
  if (correct) S.rep = clamp(S.rep + correct * 1.5 - wrong, 0, 100); else if (wrong) S.rep = clamp(S.rep - wrong, 0, 100);
  pr.rfqs.splice(i, 1);
  if (!accepted) { logMsg(`${q.cust}: ${q.p.name} teklifi (${usd(q.quote)}/t) reddedildi.`, 'warn'); fillRFQs(); return false; }
  // customer acts on DfG advice
  if (q.flags.includes('vent') && q.vent !== 'ok') { q.vent = 'ok'; q.dfgFixed = true; }
  if (q.flags.includes('surface') && (q.surface === 'paint' || q.surface === 'slag')) { q.surface = 'millscale'; q.dfgFixed = true; }
  if (q.flags.includes('overlap') && q.overlap) { q.overlap = false; q.dfgFixed = true; }
  q.dec = { cls: '', ventAct: q.vent && q.vent !== 'ok' ? '' : 'ok', blast: false, hanger: '', angle: 12, orient: '' };
  pr.order = q; pr.stage = 'recv';
  logMsg(`Sipariş alındı: ${q.cust} – ${q.p.name}, ${n(q.tons)} t @ ${usd(q.quote)}/t.${q.dfgFixed ? ' Müşteri tasarım uyarınızı uyguladı.' : ''}`, 'ok');
  fillRFQs();
  return true;
}

/* --- Lab tests --- */
const LAB = {
  deg_ph: { b: 'deg', t: 'pH ölçümü', basic: true, cost: 5 },
  deg_alk: { b: 'deg', t: 'Alkalinite titrasyonu', basic: false, cost: 25 },
  deg_temp: { b: 'deg', t: 'Sıcaklık', basic: true, cost: 0 },
  deg_oil: { b: 'deg', t: 'Yüzey yağ tabakası', basic: true, cost: 10 },
  r1_ph: { b: 'r1', t: 'pH + iletkenlik', basic: true, cost: 5 },
  pick_acid: { b: 'pick', t: 'Serbest asit (NaOH titrasyonu)', basic: false, cost: 25 },
  pick_fe: { b: 'pick', t: 'Fe²⁺ (KMnO₄ titrasyonu)', basic: false, cost: 30 },
  pick_be: { b: 'pick', t: 'Baumé', basic: true, cost: 5 },
  r2_fe: { b: 'r2', t: 'Fe taşınma testi', basic: true, cost: 10 },
  flux_be: { b: 'flux', t: 'Baumé hidrometre', basic: true, cost: 5 },
  flux_acn: { b: 'flux', t: 'ACN analizi (EDTA + AgNO₃)', basic: false, cost: 45 },
  flux_ph: { b: 'flux', t: 'pH', basic: true, cost: 5 },
  flux_fe: { b: 'flux', t: 'Fe tayini', basic: false, cost: 30 },
  flux_temp: { b: 'flux', t: 'Sıcaklık', basic: true, cost: 0 },
  k_oes: { b: 'kettle', t: 'OES spektrometre (Ni/Al/Bi/Fe)', basic: false, cost: 60 },
  k_dross: { b: 'kettle', t: 'Dross seviye sondajı', basic: true, cost: 0 }
};
function labCost(k) { const L = LAB[k]; return Math.round((S.plant.ch.lab === 'full' || L.basic ? L.cost : L.cost * 5 + 120) * (LF().labNear ? 1.3 : 1)); }
const LF = () => (S.plant && S.plant.lay && S.plant.lay.flags) || {};
function runLab(k) {
  const pr = S.prod, b = pr.baths, kt = pr.kettle, c = labCost(k);
  spend(c, 'chem'); S.hour += 0.1;
  const nz = s => 1 + gauss() * s; let r;
  switch (k) {
    case 'deg_ph': r = { 'pH': n(clamp(11.2 + b.deg.conc * 0.35 - b.deg.oil * 0.04, 9, 13.4) * nz(0.005), 1) }; break;
    case 'deg_alk': { const V = b.deg.conc / 0.2 * nz(0.01); r = { 'Harcanan 0,1 N HCl (10 mL numune)': n(V, 2) + ' mL', 'Konsantrasyon = V × 0,20': '%' + n(V * 0.2, 2) }; break; }
    case 'deg_temp': r = { 'Sıcaklık': n(b.deg.set + gauss() * 0.6, 1) + ' °C' }; break;
    case 'deg_oil': r = { 'Serbest + emülsiye yağ': n(b.deg.oil * nz(0.04), 1) + ' g/L' }; break;
    case 'r1_ph': r = { 'pH': n(r1pH(b.r1), 1), 'İletkenlik': Math.round(b.r1.cond * nz(0.03)) + ' µS/cm' }; break;
    case 'pick_acid': { const V = b.pick.hcl * 5 / 36.46 * nz(0.008); r = { 'Harcanan 1 N NaOH (5 mL numune)': n(V, 2) + ' mL', 'HCl = V × 1 × 36,46 / 5': n(V * 36.46 / 5, 1) + ' g/L', 'Yaklaşık %': '%' + n(V * 36.46 / 5 / 10.5, 1) }; break; }
    case 'pick_fe': { const V = b.pick.fe * 2 / (0.1 * 55.85) * nz(0.01); r = { 'Harcanan 0,1 N KMnO₄ (2 mL numune)': n(V, 2) + ' mL', 'Fe = V × 0,1 × 55,85 / 2': n(V * 0.1 * 55.85 / 2, 1) + ' g/L' }; break; }
    case 'pick_be': { const sg = pickSG(b.pick) * nz(0.001); r = { 'Özgül ağırlık': n(sg, 3), '°Bé = 145 − 145/SG': n(145 - 145 / sg, 1) + ' °Bé' }; break; }
    case 'r2_fe': r = { 'Fe': n(b.r2.fe * nz(0.05), 2) + ' g/L', 'pH': n(r2pH(b.r2), 1) }; break;
    case 'flux_be': { const sg = fluxSG(b.flux) * nz(0.001); r = { 'Özgül ağırlık': n(sg, 3), '°Bé': n(145 - 145 / sg, 1) + ' °Bé' }; break; }
    case 'flux_acn': { const zn = b.flux.zn * nz(0.01), nh = b.flux.nh4 * nz(0.01); r = { 'ZnCl₂': n(zn, 0) + ' g/L', 'NH₄Cl': n(nh, 0) + ' g/L', 'ACN = NH₄Cl/(ZnCl₂+NH₄Cl)': n(nh / (zn + nh), 2) }; break; }
    case 'flux_ph': r = { 'pH': n(b.flux.ph + gauss() * 0.03, 2) }; break;
    case 'flux_fe': { const V = b.flux.fe * 10 / (0.02 * 55.85) * nz(0.015); r = { 'Harcanan 0,02 N KMnO₄ (10 mL)': n(V, 2) + ' mL', 'Fe = V × 0,02 × 55,85 / 10': n(V * 0.02 * 55.85 / 10, 2) + ' g/L' }; break; }
    case 'flux_temp': r = { 'Sıcaklık': n(b.flux.set + gauss() * 0.8, 1) + ' °C' }; break;
    case 'k_oes': r = { 'Ni': '%' + n(kt.ni * nz(0.03), 3), 'Al': '%' + n(kt.al * nz(0.05), 4), 'Bi': '%' + n(kt.bi * nz(0.03), 3), 'Fe (doygun)': '%' + n(0.03 + (kt.temp - 450) * 0.0012, 3) }; break;
    case 'k_dross': r = { 'Dip dross': n(kt.dross, 1) + ' t', 'Dross yüksekliği': n(kt.dross / (6.9 * CAP[S.plant.cap].kettle.L * CAP[S.plant.cap].kettle.W) * 100, 0) + ' cm' }; break;
  }
  pr.known[k] = { r, batch: pr.batch, day: S.day };
}

/* --- Interventions --- */
function act(k, amt) {
  const pr = S.prod, b = pr.baths, kt = pr.kettle, C = CAP[S.plant.cap], ch = S.plant.ch;
  switch (k) {
    case 'deg_add': b.deg.conc += amt / (10 * C.degVol); spend(amt * 1.6, 'chem'); break; // amt kg concentrate: 10 kg/m3 = 1%
    case 'deg_skim': b.deg.oil *= 0.6; S.hour += 1; spend(300, 'labor'); break;
    case 'deg_dump': b.deg.oil = 0.3; b.deg.conc = 5; spend(C.degVol * 70 + 4000, 'chem'); S.hour += 6; break;
    case 'pick_hcl': b.pick.hcl += amt * 371 / C.acidVol; spend(amt * 230, 'chem'); break; // m3 of 32% HCl
    case 'pick_inh': b.pick.inh = clamp(b.pick.inh + amt / (C.acidVol * 0.5), 0, 1.5); spend(amt * 9, 'chem'); break; // kg
    case 'pick_regen': { const frac = 0.35; b.pick.fe *= 1 - frac; b.pick.hcl = b.pick.hcl * (1 - frac) + 180 * frac; const vol = C.acidVol * frac; spend(vol * (ch.acidRec === 'none' ? (ch.neut === 'yes' ? 210 : 340) : ch.acidRec === 'retard' ? 95 : 70), 'chem'); S.hour += 2; break; }
    case 'r2_renew': b.r2.fe *= 0.15; b.r2.acid *= 0.2; spend(C.acidVol * 0.5 * 2.2, 'chem'); S.hour += 1; break;
    case 'flux_double': b.flux.zn += amt * 0.55 / C.fluxVol; b.flux.nh4 += amt * 0.45 / C.fluxVol; spend(amt * 1.35, 'chem'); break; // kg salt
    case 'flux_triple': b.flux.zn += amt * 0.35 / C.fluxVol; b.flux.nh4 += amt * 0.65 / C.fluxVol; spend(amt * 1.2, 'chem'); break;
    case 'flux_nh3': b.flux.ph = Math.min(6.2, b.flux.ph + amt * 0.9 / C.fluxVol * 0.6); b.flux.nh4 += amt * 0.25 / C.fluxVol; spend(amt * 0.9, 'chem'); break; // L 25% NH4OH
    case 'flux_h2o2': {
      if (b.flux.ph < 3.8) { b.flux.fe *= 0.85; logMsg('H₂O₂ düşük pH’ta Fe(OH)₃ çöktüremedi; önce amonyakla pH yükseltin.', 'warn'); }
      else if (ch.fluxFilter === 'yes') { b.flux.fe *= 0.12; b.flux.ph -= 0.25; S.hour += 2; }
      else { b.flux.fe *= 0.55; b.flux.ph -= 0.25; S.hour += 3; logMsg('Filtre olmadan çamur tank dibinde kaldı, Fe kısmen düştü.', 'warn'); }
      spend(C.fluxVol * 6 + 400, 'chem'); break; }
    case 'flux_wet': b.flux.wet = clamp(b.flux.wet + amt / (C.fluxVol * 0.4), 0, 1.3); spend(amt * 7, 'chem'); break;
    case 'k_ni': kt.ni += amt / (kt.zinc * 1000) * 100; spend(amt * 19, 'chem'); break; // kg Ni equiv
    case 'k_al': kt.al += amt / (kt.zinc * 1000) * 100 * 0.8; spend(amt * 4, 'chem'); break;
    case 'k_bi': kt.bi += amt / (kt.zinc * 1000) * 100; spend(amt * 11, 'chem'); break;
    case 'k_zinc': { const t = Math.min(amt, S.market.stock, S.plant.kT - kt.zinc); if (t <= 0) return toast('Stok yok veya kazan dolu.', 'warn'); S.market.stock -= t; const f = kt.zinc / (kt.zinc + t); kt.ni *= f; kt.al *= f; kt.bi *= f; kt.zinc += t; S.hour += t / 20; break; }
    case 'k_dross': { const rem = kt.dross * 0.9; kt.dross -= rem; S.market.drossKg += rem * 1000; spend(1500, 'labor'); S.hour += 1.5; logMsg(`Dross temizliği: ${n(rem, 1)} t dip dross alındı.`, 'info'); break; }
    case 'buy_zinc': { const c = amt * zincPrice(); spend(c, 'zinc'); S.market.stock += amt; logMsg(`${amt} t SHG çinko külçe alındı (${usd(c)}).`); break; }
    case 'sell_ash': { const v = S.market.ashKg / 1000 * S.market.lme * 0.45; S.money += v; S.pl.byprod -= v; logMsg(`${n(S.market.ashKg / 1000, 1)} t çinko külü satıldı: ${usd(v)}.`, 'ok'); S.market.ashKg = 0; break; }
    case 'sell_dross': { const v = S.market.drossKg / 1000 * S.market.lme * 0.68; S.money += v; S.pl.byprod -= v; logMsg(`${n(S.market.drossKg / 1000, 1)} t dross satıldı: ${usd(v)}.`, 'ok'); S.market.drossKg = 0; break; }
  }
  checkDay();
}

/* --- Core batch processing: pretreatment → kettle → coating --- */
function pretreat() {
  const pr = S.prod, o = pr.order, b = pr.baths, ch = S.plant.ch, C = CAP[S.plant.cap], T = o.tons, sf = SURFACES[o.surface];
  const res = { };
  const blasted = o.dec.blast;
  // 1. degreasing
  const tempF = clamp(1 - Math.max(0, 60 - b.deg.set) * 0.02 - Math.max(0, b.deg.set - 82) * 0.01, 0.4, 1);
  const eD = clamp(Math.pow(b.deg.conc / 4, 0.6), 0, 1.15) * tempF * (1 - Math.min(0.7, b.deg.oil / 14)) * Math.sqrt(Math.min(1, b.deg.time / 12));
  const need = sf.oil && !blasted ? 0.85 : 0.5;
  res.eD = eD; res.ro = clamp((need - eD) / need, 0, 1);
  const oilIn = T * (sf.oil && !blasted ? 2.2 : 0.3) / C.degVol * 3;
  b.deg.oil += oilIn * (ch.skimmer === 'yes' ? 0.4 : 1);
  b.deg.conc = Math.max(0, b.deg.conc - T * 0.0025 * (60 / C.degVol) * 3);
  // 2. rinse 1
  const r1Flow = { low: 0.88, med: 0.7, high: 0.5 }[b.r1.flow];
  b.r1.cond = b.r1.cond * r1Flow + T * 60 * (60 / C.degVol) * 2;
  spend({ low: 15, med: 35, high: 70 }[b.r1.flow], 'chem');
  if (b.r1.cond > 3500) b.pick.hcl -= 1.5;
  // 3. pickling
  const p = b.pick;
  let r = Math.pow(Math.max(p.hcl, 1) / 130, 0.8) * (p.fe < 120 ? 1 : Math.max(0.15, 1 - (p.fe - 120) / 55)) * clamp(1 + (p.temp - 22) * 0.03, 0.7, 1.4);
  if (ch.acid === 'h2so4') r *= 1.05;
  r *= 1 - 0.8 * res.ro;
  let treq = (blasted ? 10 : sf.treq) / Math.max(r, 0.05);
  const comp = Math.min(1, p.time / treq);
  const ratio = p.time / treq;
  const over = Math.max(0, ratio - 1.6) * (p.inh > 0.3 ? 0.15 : 1);
  res.pComp = comp; res.treq = treq; res.over = over;
  let cap = 1; if (!blasted && sf.blastReq) cap = 0.25; if (!blasted && o.surface === 'laser') cap = 0.8;
  res.cap = cap;
  const feKg = T * ((blasted ? 1 : sf.scaleKg) * comp + over * 4 + (p.inh < 0.3 ? 0.6 : 0.1));
  const dFe = feKg / C.acidVol * 2.4;
  p.fe += dFe; p.hcl = Math.max(5, p.hcl - dFe * 1.6 - T * 0.05);
  p.inh = Math.max(0, p.inh - T * 0.012 * (120 / C.acidVol));
  // 4. rinse 2
  const casc = ch.cascade === 'yes' ? 0.55 : 0.72;
  b.r2.fe = b.r2.fe * casc + p.fe * 0.004 * T / 12 * 3;
  b.r2.acid = b.r2.acid * casc + p.hcl * 0.0006 * T / 12 * 3;
  if (ch.rinseTank === 'cs') b.r2.fe += 0.12;
  // 5. flux
  const f = b.flux;
  f.fe += b.r2.fe * 0.05 * T / 12 * (40 / C.fluxVol) * 2 + (f.ph < 4 ? 0.08 : 0.01) + (ch.fluxTank === 'ss' ? 0.04 : 0);
  f.ph -= b.r2.acid * 0.05 * T / 12 * (40 / C.fluxVol);
  f.zn = Math.max(20, f.zn - T * 0.12 * (40 / C.fluxVol)); f.nh4 = Math.max(10, f.nh4 - T * 0.1 * (40 / C.fluxVol));
  f.wet = Math.max(0, f.wet - T * 0.01);
  const be = fluxBe(f), acn = fluxACN(f);
  let qF = 1;
  if (be < 12) qF -= (12 - be) * 0.09; if (be > 18) qF -= (be - 18) * 0.03;
  if (f.ph < 4.2) qF -= (4.2 - f.ph) * 0.3; if (f.ph > 4.8) qF -= (f.ph - 4.8) * 0.15;
  const acnDev = acn < 0.4 ? 0.4 - acn : acn > 0.7 ? acn - 0.7 : 0; qF -= acnDev * 1.4;
  if (f.fe > 3) qF -= (f.fe - 3) * 0.025;
  if (f.set < 45) qF -= 0.1; if (f.set > 70) qF -= 0.05;
  qF += Math.min(0.05, f.wet * 0.05);
  qF *= clamp(Math.sqrt(f.time / 1.5), 0.7, 1);
  res.qF = clamp(qF, 0.1, 1.05); res.be = be; res.acn = acn;
  // 6. drying
  let dry = 1, burn = 0;
  const ot = ch.oven === 'none' ? 35 : b.oven.set;
  if (ot < 80) dry = clamp(0.5 + (ot - 30) / 100, 0.4, 0.95);
  if (ot > 130) burn = (ot - 130) * 0.02;
  if (LF().ovenFar) dry = Math.min(dry, 0.74);
  if (LF().tankGap) spend(T * 3, 'chem');
  res.dry = dry; res.burn = burn; res.ovenT = ot;
  res.q = comp * cap * (1 - res.ro * 0.6) * res.qF * (1 - burn);
  res.feCarry = f.fe;
  // costs
  if (ch.acid === 'h2so4') spend(T * 6, 'energy');
  if (blasted) spend(T * 25, 'other');
  return res;
}
function dipBatch() {
  const pr = S.prod, o = pr.order, kt = pr.kettle, ch = S.plant.ch, C = CAP[S.plant.cap], d = o.dec, T = o.tons;
  const pre = pretreat(); o.pre = pre;
  kt.temp = kt.set;
  const t = o.p.t, Tb = kt.temp;
  const reqDwell = o.p.spin ? 1.2 : 1.2 + 0.28 * t;
  o.reqDwell = reqDwell;
  const niOK = kt.ni >= 0.035, ni = kt.ni;
  // ---- coating thickness model ----
  const base = t > 6 ? 72 : t > 3 ? 58 : t >= 1.5 ? 44 : 32;
  let k = 1, cls = o.cls;
  if (cls === 'peak') k = ni >= 0.035 ? 1.2 + Math.max(0, 0.05 - ni) * 4 : ni > 0.015 ? 1.7 : 2.4;
  if (cls === 'seb') k = 1.15;
  if (cls === 'hyp') k = 1.5 + (o.se - 0.25) * 4 - Math.min(0.1, ni);
  const reactive = cls === 'peak' && !niOK || cls === 'hyp';
  const fT = reactive ? clamp(1 + (Tb - 450) * 0.025, 0.6, 2) : clamp(1 + (Tb - 450) * 0.005, 0.85, 1.2);
  const rt = kt.dwell / reqDwell;
  const tf = reactive ? Math.pow(rt, 0.9) : Math.sqrt(rt);
  let alloy = base * k * fT * tf * (d.blast ? 1.18 : 1) * (pre.over > 0.3 ? 1.1 : 1);
  let eta = reactive ? clamp(8 - (k - 1.4) * 6, 0, 8) : 17 + (kt.vw - 1.8) * 9 + Math.max(0, 445 - Tb) * 1.3;
  eta *= 1 - clamp(kt.bi, 0, 0.12) * 2;
  if (o.p.spin) { alloy *= 0.75; eta *= ch.spin === 'yes' ? 0.25 : 1.4; }
  if (kt.blow && o.p.closed) eta *= 0.9;
  eta = Math.max(0, eta);
  const mean = alloy + eta;
  // ---- defects ----
  const defects = [];
  const D = (id, t, cause, sev, enc) => defects.push({ id, t, cause, sev, enc, pick: '' });
  // closed sections
  if (o.p.closed && o.vent !== 'ok' && d.ventAct === 'approve') {
    if (o.vent === 'missing' || Math.random() < 0.5) { D('explode', 'Patlama / sıvı çinko fışkırması', 'vent', 'crit', 'vent'); spend(45e3, 'other'); S.rep -= 8; logMsg('KAZANDA PATLAMA: kapalı profilde hava/nem sıkıştı. Operatör yaralanması önlendi ama ekipman hasarı $45k.', 'crit'); }
    else D('spatter', 'Çinko sıçraması / iç yüzey kaplanmamış', 'vent', 'major', 'vent');
  }
  if (o.p.closed && d.orient === 'flat') D('airpocket', 'Hava cebi – iç yüzeyde kaplamasız bölge', 'withdraw', 'major', 'jig');
  // bare spots: weakest link in pretreatment chain
  const alHi = kt.al > 0.007;
  const qEff = pre.q * (alHi ? 1 - (kt.al - 0.007) * 60 : 1) * (pre.dry < 0.8 ? 0.97 : 1);
  if (qEff < 0.88) {
    const links = { degrease: 1 - pre.ro * 0.6, pickle: pre.pComp, surface: pre.cap, flux: pre.qF, dry: 1 - pre.burn, al: alHi ? 1 - (kt.al - 0.007) * 60 : 1 };
    const cause = Object.entries(links).sort((a, b) => a[1] - b[1])[0][0];
    D('bare', `Çıplak bölgeler (yüzeyin ~%${n((0.88 - qEff) * 40, 1)}’i)`, cause, qEff < 0.75 ? 'crit' : 'major', 'bare');
  }
  if (rt < 0.75) D('dwell', 'Eksik reaksiyon – kaynama sürerken çekildi, ince ve düzensiz kaplama', 'dwell', 'major', 'dwell');
  const drossLimit = S.plant.kT * 0.012;
  if (kt.dross > drossLimit && Math.random() < 0.4 + (kt.dross - drossLimit) / drossLimit) D('dross', 'Dross kabarcıkları (pimples) / inklüzyon', 'dross', 'minor', 'dross');
  if (!kt.preSkim || !kt.postSkim) D('ash', 'Kül yapışması (ash inclusion)', 'skim', kt.postSkim ? 'minor' : 'major', 'skimming');
  if (d.angle < 10 || kt.vw > 3.2 || Tb < 440) D('runs', 'Akıntı, sarkıt (icicle) ve çinko göllenmesi', d.angle < 10 || kt.vw > 3.2 ? 'withdraw' : 'temp', 'minor', 'drainAngle');
  if (o.p.spin && ch.spin !== 'yes') D('threads', 'Dişler çinko ile dolmuş – somun geçmiyor', 'withdraw', 'major', 'spin');
  if (pre.dry < 0.8) D('spatter2', 'Çinko sıçraması (ıslak parça)', 'dry', 'minor', 'oven');
  if (Tb > 462) D('lumpy', 'Kaba / pürüzlü yüzey (yüksek sıcaklık)', 'temp', 'minor', 'kettleChem');
  if (pre.over > 0.5) D('rough', 'Aşırı asitleme pürüzlülüğü', 'overpickle', 'minor', 'inhibitor');
  if (o.p.hs && pre.over > 0.2 && !o.dec.blast) D('embr', 'Hidrojen gevrekliği – cıvata kırılması', 'overpickle', 'crit', 'embrittlement');
  if (o.overlap) D('weep', 'Bindirme yerinden sızıntı (weeping) – kahverengi leke', 'surface', 'minor', 'overlap');
  const kL = C.kettle.L - 0.3, dbl = o.len > kL;
  if (dbl || (S.plant.hookShort && o.len > 9)) D('double', 'Çift daldırma ek izi', 'withdraw', 'minor', 'height');
  if (o.p.hanger && d.hanger && d.hanger !== o.p.hanger) D('hang', 'Askı/temas izleri, düzensiz süzülme', 'withdraw', 'minor', 'jig');
  // ---- zinc balance ----
  const area = 254.8 / Math.max(t, 0.8) * (o.p.spin ? 0.6 : 1) * T; // m2
  const coatKg = area * mean * 7.14 / 1000;
  const dripKg = defects.some(x => x.id === 'runs' || x.id === 'threads') ? T * 6 : T * 2.5;
  const drossKg = T * ((LF().acidNear ? 2.8 : 2.2) + pre.feCarry * 1.4 + Math.max(0, Tb - 455) * 0.45 + (ch.kSteel === 's235' ? 0.8 : 0) + (S.plant.ch.oven === 'none' ? 0.5 : 0));
  const alOK = kt.al >= 0.002 && kt.al <= 0.006;
  const ashKg = T * (8 + Math.max(0, pre.be - 18) * 1.4 + (kt.preSkim ? 0 : 1.5) + Math.max(0, Tb - 455) * 0.3 + (pre.dry < 0.8 ? 2.5 : 0) + (fluxACN(pr.baths.flux) > 0.6 ? 1.2 : 0)) * (alOK ? 0.8 : 1) * (dbl ? 1.4 : 1);
  const used = coatKg + dripKg + drossKg + ashKg;
  const usedT = used / 1000;
  const frac = usedT / kt.zinc;
  kt.zinc -= usedT;
  kt.dross += drossKg / 1000;
  S.market.ashKg += ashKg;
  kt.ni = Math.max(0, kt.ni * (1 - frac * 2.6));
  kt.al = Math.max(0, kt.al * (1 - frac * 7) - 0.00025);
  kt.bi = Math.max(0, kt.bi * (1 - frac * 1.2));
  // kettle wear
  const wearF = (ch.kSteel === 's235' ? 3 : 1) * (ch.burner === 'conv' ? 1.8 : 1) * ({ 30: 1.4, 40: 1, 50: 0.8 }[ch.kThk]) * Math.exp((Tb - 450) / 12);
  S.plant.kettleWear += 0.025 * wearF * T / 15 * (LF().acidNear ? 1.3 : 1);
  if (LF().coolNear && Math.random() < 0.04) { spend(18e3, 'other'); S.rep -= 2; logMsg('Soğutma tankından kazana su sıçradı: çinko fışkırması, ekipman hasarı $18k (yerleşim: soğutma kazana bitişik).', 'crit'); }
  // energy
  spend(T * 22 * (ch.refr === 'fiber' ? 0.87 : 1) * (ch.oven === 'waste' ? 0.92 : 1), 'energy');
  const hrs = (1.6 + pr.baths.pick.time / 60 + kt.dwell / 60 + T / 25) * ({ manual: 1.4, semi: 1, auto: 0.8 }[ch.conv]) * (S.plant.lay ? S.plant.lay.hrsF : 1) * (dbl ? 1.4 : 1);
  S.hour += hrs;
  o.coat = { alloy, eta, mean, reactive, area, coatKg, dripKg, drossKg, ashKg, used, pickup: used / (T * 10), hrs, Tb, niOK, dbl };
  o.defects = defects;
  o.qc = { cooled: false, tests: {} };
  pr.stage = 'qc';
  pr.batch++;
  pr.hist.push({ b: pr.batch, fe: pr.baths.pick.fe, hcl: pr.baths.pick.hcl, ffe: pr.baths.flux.fe, pick: o.coat.pickup });
  if (pr.hist.length > 60) pr.hist.shift();
  if (S.plant.kettleWear >= 100) kettleBreach('prod');
  checkDay();
}
function coolBatch(method, passiv) {
  const o = S.prod.order, c = o.coat;
  o.qc.cool = method; o.qc.passiv = passiv; o.qc.cooled = true;
  if (method === 'quench' && LF().coolFar && c.reactive && c.eta > 0) { const conv = Math.min(c.eta, 4); c.eta -= conv; c.alloy += conv * 1.3; c.mean = c.alloy + c.eta; }
  if (method === 'air' && (c.reactive || o.p.t >= 14) && c.eta > 0) { const conv = Math.min(c.eta, o.p.t >= 14 ? 10 : 6); c.eta -= conv; c.alloy += conv * 1.3; c.mean = c.alloy + c.eta; }
  if (c.eta < 4) o.defects.push({ id: 'grey', t: 'Mat gri kaplama (η tabakası yok)', cause: method === 'air' && !c.reactive ? 'cool' : 'steel', sev: 'minor', enc: 'sandelin', pick: '' });
  if (c.mean > 250 || (c.reactive && c.mean > 200)) o.defects.push({ id: 'flake', t: 'Soyulma / pullanma (kırılgan ζ tabakası)', cause: 'steel', sev: 'crit', enc: 'hammer', pick: '' });
  if (!passiv && method === 'quench' && Math.random() < 0.55) o.defects.push({ id: 'white', t: 'Beyaz pas (ıslak istif lekesi)', cause: 'passiv', sev: 'minor', enc: 'whiteRust', pick: '' });
  if (!passiv && method === 'air' && Math.random() < 0.2) o.defects.push({ id: 'white', t: 'Beyaz pas (ıslak istif lekesi)', cause: 'passiv', sev: 'minor', enc: 'whiteRust', pick: '' });
  if (passiv) spend(o.tons * 4, 'chem');
  // ISO thickness readings
  const iso = o.p.spin ? ISO1461_SPIN : ISO1461.find(r => r.lim(o.p.t));
  const bare = o.defects.some(x => x.id === 'bare' || x.id === 'dwell');
  const readings = Array.from({ length: 10 }, (_, i) => Math.max(bare && i === 7 ? 8 : 10, Math.round(c.mean * (1 + gauss() * (c.reactive ? 0.14 : 0.08)) * (o.defects.some(x => x.id === 'dwell') && i % 3 === 0 ? 0.6 : 1))));
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
  o.qc.iso = iso; o.qc.readings = readings; o.qc.mean = mean; o.qc.min = Math.min(...readings);
  if (mean < iso.mean || o.qc.min < iso.local) o.defects.push({ id: 'thin', t: `ISO 1461 altı kalınlık (ort. ${n(mean, 0)} µm < ${iso.mean} µm veya yerel < ${iso.local} µm)`, cause: o.defects.some(x => x.id === 'dwell') ? 'dwell' : 'temp', sev: 'crit', enc: 'iso1461', pick: '' });
  S.hour += 0.5;
}
function qcTest(k) {
  const o = S.prod.order;
  if (k === 'metal') spend(S.plant.ch.lab === 'full' ? 40 : 350, 'chem');
  if (k === 'hammer') spend(5, 'chem');
  o.qc.tests[k] = true; S.hour += 0.2;
}
function shipBatch(rework) {
  const pr = S.prod, o = pr.order, c = o.coat;
  const crit = o.defects.filter(x => x.sev === 'crit' && x.id !== 'explode');
  let capaOK = 0; o.defects.forEach(x => { if (x.pick === x.cause) capaOK++; });
  const capaTot = o.defects.length;
  S.rep = clamp(S.rep + capaOK * 0.8 - (capaTot - capaOK) * 0.5, 0, 100);
  if (o.dec.cls === o.cls) S.rep = clamp(S.rep + 0.5, 0, 100);
  let rev = o.tons * o.quote;
  if (rework && crit.length) {
    const zc = c.used / 1000 * zincPrice() * 0.9; spend(zc, 'zinc'); spend(o.tons * 60, 'chem');
    pr.baths.pick.fe += o.tons * 4 / CAP[S.plant.cap].acidVol * 2.4; S.hour += c.hrs * 0.8;
    pr.kettle.zinc -= c.used / 1000 * 0.9;
    logMsg(`Rework: ${o.id} söküm asidinde soyulup yeniden galvanizlendi (${usd(zc)} çinko).`, 'warn');
  } else if (crit.length) { rev *= 0.7; S.rep = clamp(S.rep - 8, 0, 100); logMsg(`${o.cust} kusurlu ürün için %30 iade talep etti (${crit.map(x => x.t).join(', ')}).`, 'crit'); }
  if (o.defects.some(x => x.id === 'explode')) rev = 0;
  S.money += rev; S.pl.revenue += rev;
  spend(c.used / 1000 * zincPrice(), 'zinc');
  pr.stats.tons += o.tons; pr.stats.zinc += c.used / 1000; pr.stats.batches++; if (!o.defects.length) pr.stats.pass++; pr.stats.defects += o.defects.length;
  pr.results.unshift({ id: o.id, cust: o.cust, prod: o.p.name, tons: o.tons, mean: o.qc.mean, pickup: c.pickup, defects: o.defects.length, crit: crit.length, rev, capa: capaTot ? `${capaOK}/${capaTot}` : '–', day: S.day });
  if (pr.results.length > 40) pr.results.pop();
  logMsg(`Sevk: ${o.id} ${o.cust}, ${n(o.tons)} t, ort. ${n(o.qc.mean, 0)} µm, sarfiyat %${n(c.pickup, 2)}, gelir ${usd(rev)}.`, crit.length && !rework ? 'warn' : 'ok');
  pr.order = null; pr.stage = 'rfq';
  fillRFQs(); checkDay();
}

/* ---------- Time, market and plant events ---------- */
function advanceDays(dd) { for (let i = 0; i < dd; i++) newDay(true); }
function checkDay() { while (S.hour >= 22) { S.hour -= 16; newDay(false); } }
function newDay(silent) {
  S.day++;
  const C = CAP[S.plant.cap], ch = S.plant.ch, m = S.market;
  m.hist.push(m.lme); if (m.hist.length > 90) m.hist.shift();
  m.lme = Math.round(clamp(m.lme * (1 + gauss() * 0.014 + (2850 - m.lme) * 0.00003), 1900, 4200));
  m.prem = Math.round(clamp(m.prem + gauss() * 4, 120, 280));
  spend(C.dayCost * ({ manual: 1.3, semi: 1, auto: 0.75 }[ch.conv] || 1), 'labor');
  if (S.prod) {
    const kt = S.prod.kettle, b = S.prod.baths;
    spend(C.burnerMW * 0.38 * 24 * 1000 / 9.5 * 0.42 * (ch.refr === 'fiber' ? 0.85 : 1), 'energy');
    S.plant.kettleWear += 0.02 * (ch.kSteel === 's235' ? 3 : 1) * (ch.burner === 'conv' ? 1.8 : 1) * Math.exp((kt.set - 450) / 12);
    kt.al = Math.max(0, kt.al - 0.0008); // surface oxidation burn-off
    b.flux.zn *= 1.004; b.flux.nh4 *= 1.004; // evaporation
    b.pick.temp = clamp(b.pick.temp + gauss() * 1.2, 14, 34);
    if (ch.fluxTank === 'ss') b.flux.fe += 0.15;
    if (ch.acid === 'h2so4') spend(C.acidVol * 4, 'energy');
    if (ch.neut === 'no') spend(1800 * C.scale, 'chem');
    if (silent) return;
    const ev = [];
    if (ch.ip === 'ip54' && Math.random() < 0.08) ev.push(['Vinç motoru arızası (IP54, asit buharı) – 4 saat duruş, $6k.', () => { spend(6000, 'other'); S.hour += 4; }]);
    if (ch.pickTank === 'cs' && S.day > 3 && Math.random() < 0.18) ev.push([`Asit tankı sızıntısı (çıplak karbon çeliği). Tamir $40k${ch.bund === 'plain' ? ' + çevre cezası $120k (tava betonu çözülmüş)' : ''}.`, () => { spend(40e3 + (ch.bund === 'plain' ? 120e3 : 0), 'other'); b.pick.hcl *= 0.85; S.rep -= 3; }]);
    if (ch.pickTank === 'lead' && ch.acid === 'hcl' && Math.random() < 0.1) ev.push(['Kurşun kaplama HCl ile reaksiyona girdi; PbCl₂ çamuru ve kaçak. Tamir $35k.', () => spend(35e3, 'other')]);
    if (ch.bund === 'plain' && Math.random() < 0.03) ev.push(['Tava betonunda asit sızıntısı tespit edildi. Zemin onarımı $25k.', () => spend(25e3, 'other')]);
    if (ch.fluxHeat === 'cu' && Math.random() < 0.07) ev.push(['Bakır flux eşanjörü delindi – değişim $12k, flux 6 saat soğuk.', () => { spend(12e3, 'other'); S.hour += 3; }]);
    if (ch.degHeat === 'cu' && Math.random() < 0.04) ev.push(['Yağ alma bakır serpantini arızalandı – $8k.', () => { spend(8e3, 'other'); }]);
    if (ch.fume === 'none' && Math.random() < 0.06) ev.push(['Çevre denetimi: kontrolsüz beyaz duman emisyonu. Ceza $35k.', () => { spend(35e3, 'other'); S.rep -= 3; }]);
    if (ch.neut === 'no' && Math.random() < 0.05) ev.push(['Atıksu deşarj denetimi: pH ve Zn limit aşımı. Ceza $60k.', () => { spend(60e3, 'other'); S.rep -= 4; }]);
    if (LF().acidNear && Math.random() < 0.05) ev.push(['Kazan bölgesi elektrik panosunda klorür korozyonu (asit tankları çok yakın). Onarım $9k.', () => spend(9e3, 'other')]);
    if (LF().labNear && Math.random() < 0.04) ev.push(['Laboratuvarda asit buharı: pH elektrodu ve analitik terazi arızası. $3k.', () => spend(3e3, 'other')]);
    if (ch.ced === 'full' && Math.random() < 0.05) ev.push(['CEMS kayıtlarınız denetimden sorunsuz geçti (+2 itibar).', () => { S.rep += 2; }]);
    if (S.plant.pitRisk && !S.plant.pitMoistIgnored && Math.random() < 0.05) queueEvent(eventPitMoisture('prod'));
    if (S.plant.pitMoistIgnored && Math.random() < 0.06) steamExplosion('prod');
    ev.forEach(([t, fn]) => { fn(); logMsg(t, 'crit'); });
    if (S.plant.kettleWear > 85 && !S.plant.wearWarned) { S.plant.wearWarned = true; queueEvent({ title: 'Kazan ömrü kritik', lvl: 'warn', enc: 'kettle', body: `Ultrasonik kalınlık ölçümü duvar aşınmasını %${n(S.plant.kettleWear, 0)} gösteriyor. %100’de kazan delinir.`, choices: [
      { t: `Planlı kazan değişimi (${usd((ch.kSteel === 'armco' ? 780e3 : 420e3) * C.scale + 120e3)}, 12 gün)`, fn: () => { spend((ch.kSteel === 'armco' ? 780e3 : 420e3) * C.scale + 120e3, 'other'); S.plant.kettleWear = 0; S.plant.wearWarned = false; advanceDays(12); logMsg('Planlı kazan değişimi yapıldı.', 'ok'); } },
      { t: 'Çalışmaya devam et', fn: () => {} }] }); }
  }
}

/* ---------- persistence ---------- */
function save() { try { localStorage.setItem('hdg-master-v4', JSON.stringify(S)); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem('hdg-master-v4')); if (s && s.v === 4) return s; } catch (e) {} return null; }
