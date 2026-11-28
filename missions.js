'use strict';
/* =========================================================
   Mission map: lesson → in-game goal → 1–3 stars
   ========================================================= */
const msInit = () => { S.ms = S.ms || {}; S.ms.stars = S.ms.stars || {}; S.ms.start = S.ms.start || {}; S.ms.lessonDone = S.ms.lessonDone || {}; return S.ms; };
const netResult = () => { const pl = S.pl; return pl.revenue - pl.byprod - pl.zinc - pl.chem - pl.energy - pl.labor - pl.other; };
function since(id) { const pr = S.prod; if (!pr) return []; const s = S.ms.start[id] ?? 0; return pr.results.slice(0, Math.max(0, pr.stats.batches - s)).reverse(); }
const batchStars = r => !r ? 0 : (r.isoOk !== false && r.defects === 0) ? 3 : (r.isoOk !== false && !r.crit) ? 2 : 1;
const MISSIONS = [
  { id: 'zinc101', t: 'Galvaniz nedir?', lesson: 'zinc101', goal: 'Dersi izle ve saf çinko katmanını bul.', go: null,
    done: () => !!S.ms.lessonDone.zinc101, stars: () => (S.ms.q1 || 1) <= 1 ? 3 : S.ms.q1 === 2 ? 2 : 1, rule: '★★★ ilk denemede doğru' },
  { id: 'build', t: 'Tesisi kur', lesson: 'plant', goal: 'Tesisi inşa et.', go: 'epc',
    done: () => S.epc.done, stars: () => { const c = epcReview(S.plant.ch, S.epc.gw).filter(r => r.lvl === 'crit').length; return c === 0 ? 3 : c <= 2 ? 2 : 1; }, rule: '★★★ kritik tasarım hatası yok' },
  { id: 'melt', t: 'İlk ergitme', lesson: 'melt', goal: 'Kazanı ergit ve devreye al.', go: 'comm',
    done: () => !!(S.comm && S.comm.done), stars: () => { const d = S.ms.meltDmg || 0; return d < 1 && !S.ms.autoUsed ? 3 : d < 10 ? 2 : 1; }, rule: '★★★ hasar %0 ve otomatik operatörsüz' },
  { id: 'first', t: 'İlk parti', lesson: 'pre', goal: 'Kazanı alaşımla, ilk partiyi sevk et.', go: 'prod',
    done: () => since('first').length >= 1, stars: () => batchStars(since('first')[0]), rule: '★★★ kusursuz ve ISO 1461’e uygun', prog: () => `${Math.min(1, since('first').length)}/1 parti` },
  { id: 'reactive', t: 'Reaktif çelik', lesson: 'sandelin', goal: '“Reaktif çelik” etiketli bir siparişi sevk et.', go: 'prod',
    done: () => since('reactive').some(r => r.reactive), stars: () => Math.max(...since('reactive').filter(r => r.reactive).map(batchStars)), rule: '★★★ reaktif partide kusur yok', prog: () => since('reactive').some(r => r.reactive) ? '1/1' : 'reaktif sipariş bekleniyor' },
  { id: 'chain', t: 'Demir zinciri', lesson: 'iron', goal: '5 parti sevk et; banyoları yeşilde tut.', go: 'prod',
    done: () => since('chain').length >= 5, stars: () => { const k = since('chain').slice(0, 5).filter(r => batchStars(r) === 3).length; return k === 5 ? 3 : k >= 3 ? 2 : 1; }, rule: '★★★ 5 partinin 5’i kusursuz', prog: () => `${Math.min(5, since('chain').length)}/5 parti` },
  { id: 'profit', t: 'Kârlı tesis', lesson: 'zinc', goal: 'Bu görev başladıktan sonra +$100k işletme kârı yap.', go: 'prod',
    done: () => S.prod && netResult() - (S.ms.net0 ?? netResult()) >= 100e3, stars: () => { const r = since('profit'); const k = r.length ? r.filter(x => batchStars(x) === 3).length / r.length : 0; return k >= 0.8 ? 3 : k >= 0.6 ? 2 : 1; }, rule: '★★★ partilerin %80’i kusursuz', prog: () => S.prod ? `${usd(Math.max(0, netResult() - (S.ms.net0 ?? netResult())))} / $100k` : '' }
];
const curMission = () => { msInit(); return MISSIONS.find(m => !(m.id in S.ms.stars)); };
function missionBegin(m) {
  msInit();
  if (S.ms.start[m.id] == null) S.ms.start[m.id] = S.prod ? S.prod.stats.batches : 0;
  if (m.id === 'profit' && S.ms.net0 == null) S.ms.net0 = netResult();
}
function playLesson(m, thenGo) {
  lessonOpen(m.lesson, st => {
    msInit(); S.ms.lessonDone[m.lesson] = true;
    if (m.id === 'zinc101' && !S.ms.q1) S.ms.q1 = st.tries || 1;
    missionBegin(m);
    if (thenGo && m.go) { if (m.go === 'prod' && !S.prod) S.mode = S.comm && S.comm.done ? 'prod' : S.epc.done ? 'comm' : 'epc'; else S.mode = m.go; }
    render(); window.scrollTo(0, 0);
  });
}
function starsHTML(k, big) { return `<span class="stars${big ? ' big' : ''}" aria-label="${k} yıldız">${[1, 2, 3].map(i => `<i class="${i <= k ? 'on' : ''}" style="--d:${i * 0.18}s">★</i>`).join('')}</span>`; }

/* ---------- map ---------- */
function viewMap() {
  msInit();
  const cur = curMission(), total = Object.values(S.ms.stars).reduce((a, b) => a + b, 0);
  const pos = MISSIONS.map((_, i) => [70 + i * 126, i % 2 ? 230 : 110]);
  let path = `M${pos[0][0]} ${pos[0][1]}`; for (let i = 1; i < pos.length; i++) { const [x0, y0] = pos[i - 1], [x1, y1] = pos[i]; path += ` C${x0 + 60} ${y0} ${x1 - 60} ${y1} ${x1} ${y1}`; }
  const nodes = MISSIONS.map((m, i) => {
    const [x, y] = pos[i], st = S.ms.stars[m.id], isCur = cur && cur.id === m.id, locked = !st && !isCur;
    return `<g class="mnode ${st ? 'done' : isCur ? 'cur' : 'lock'}" data-mission="${m.id}" tabindex="${locked ? -1 : 0}" role="button" aria-label="Görev ${i + 1}: ${esc(m.t)}">
      ${isCur ? `<circle cx="${x}" cy="${y}" r="44" class="ring"/>` : ''}<circle cx="${x}" cy="${y}" r="34" class="disc"/>
      <text x="${x}" y="${y + 9}" class="num">${locked ? '🔒' : i + 1}</text>
      <text x="${x}" y="${y + 60}" class="ttl">${esc(m.t)}</text>
      ${st ? `<text x="${x}" y="${y - 44}" class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</text>` : ''}</g>`;
  }).join('');
  const card = cur ? `<div class="panel mcur"><div class="row" style="gap:14px;flex-wrap:nowrap;align-items:flex-start">${MASCOT}<div style="flex:1;min-width:0">
      <div class="small muted">Görev ${MISSIONS.indexOf(cur) + 1} / ${MISSIONS.length}</div><h2>${cur.t}</h2><p style="margin-top:4px">${cur.goal}</p><p class="small muted" style="margin-top:2px">${cur.rule}${cur.prog && S.ms.start[cur.id] != null ? ' · ' + cur.prog() : ''}</p>
      <div class="row" style="margin-top:10px"><button class="btn zinc big" data-ms-play="${cur.id}">${S.ms.lessonDone[cur.lesson] ? 'Dersi tekrar izle' : '▶ Dersi izle'}</button>${cur.go ? `<button class="btn big" data-ms-go="${cur.id}">Göreve git →</button>` : ''}</div></div></div></div>`
    : `<div class="panel mcur"><div class="row" style="gap:14px;flex-wrap:nowrap">${MASCOT}<div><h2>Bütün görevler tamam!</h2><p>Toplam ${total} / ${MISSIONS.length * 3} yıldız. Tesisi işletmeye devam edebilir, eksik yıldızlar için görev dersini tekrar izleyebilirsiniz.</p><button class="btn zinc" data-mode="prod" style="margin-top:8px">Üretime dön →</button></div></div></div>`;
  return `<div class="col"><div class="panel"><div class="ph"><h2>Görev haritası</h2><span class="pill info">★ ${total} / ${MISSIONS.length * 3}</span></div>
    <p class="muted">Her görev kısa bir görsel dersle başlar, sonra oyunda bir hedef verir. Ne kadar iyi yaparsanız o kadar yıldız.</p>
    <div class="mapwrap"><svg viewBox="0 0 900 320" class="map" role="img" aria-label="Görev haritası"><path d="${path}" class="mpath"/>${nodes}</svg></div></div>${card}</div>`;
}
function missionBanner() {
  if (!S.simple) return '';
  const m = curMission(); if (!m || !m.go) return '';
  const here = m.go === S.mode;
  if (!here) return '';
  return `<div class="mbar">${MASCOT}<div style="flex:1;min-width:0"><b>Görev ${MISSIONS.indexOf(m) + 1}: ${m.t}</b> · ${m.goal}<div class="small muted">${m.rule}${m.prog && S.ms.start[m.id] != null ? ' · <b>' + m.prog() + '</b>' : ''}</div></div><button class="btn sm" data-ms-play="${m.id}">Ders</button><button class="btn sm ghost" data-mode="map">Harita</button></div>`;
}
function checkMissions() {
  if (!S.simple) return;
  const lesson = document.getElementById('lesson'); if ((lesson && !lesson.hidden) || !$('#modal').hidden) return;
  const m = curMission(); if (!m) return;
  let ok = false; try { ok = m.done(); } catch (e) { ok = false; }
  if (!ok) return;
  let k = 1; try { k = Math.max(1, Math.min(3, m.stars() || 1)); } catch (e) {}
  S.ms.stars[m.id] = k; S.rep = clamp(S.rep + k, 0, 100); save();
  const next = curMission();
  const words = ['', 'Tamamlandı.', 'İyi iş!', 'Mükemmel!'];
  const md = $('#modal');
  md.innerHTML = `<div class="card cele" role="dialog" aria-modal="true" aria-label="Görev tamamlandı"><div class="row" style="gap:14px;flex-wrap:nowrap">${MASCOT}<div><div class="small muted">Görev ${MISSIONS.indexOf(m) + 1} tamamlandı</div><h2>${m.t}</h2></div></div>
    <div style="text-align:center">${starsHTML(k, true)}<p style="margin-top:6px"><b>${words[k]}</b> ${k < 3 ? `Üç yıldız için: ${m.rule.replace('★★★ ', '')}.` : ''}</p></div>
    <div class="row" style="justify-content:flex-end">${next ? `<button class="btn" data-ms-close>Haritaya dön</button><button class="btn zinc" data-ms-play="${next.id}">Sıradaki: ${next.t} ▶</button>` : '<button class="btn zinc" data-ms-close>Harika!</button>'}</div></div>`;
  md.hidden = false;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-mission],[data-ms-play],[data-ms-go],[data-ms-close]'); if (!t) return;
  e.stopPropagation();
  const id = t.dataset.mission || t.dataset.msPlay || t.dataset.msGo, m = id && MISSIONS.find(x => x.id === id);
  if (t.dataset.msClose != null) { $('#modal').hidden = true; S.mode = 'map'; render(); return; }
  if (t.dataset.msPlay) { $('#modal').hidden = true; playLesson(m, true); return; }
  if (t.dataset.msGo) { missionBegin(m); S.mode = m.go === 'prod' && !S.prod ? (S.comm && S.comm.done ? 'prod' : S.epc.done ? 'comm' : 'epc') : m.go; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.mission) { const cur = curMission(), done = m.id in S.ms.stars; if (done || (cur && cur.id === m.id)) playLesson(m, !done); else toast('Önce önceki görevleri tamamlayın.', 'warn'); }
}, true);
document.addEventListener('keydown', e => { const g = e.target.closest && e.target.closest('[data-mission]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
