'use strict';
/* =========================================================
   HDG Architect & Plant Master — STATIC DATA
   ========================================================= */

const CAP = {
  small:  { name:'Küçük Ölçek', tpy:15000, budget:11e6, building:3.2e6, scale:0.6, kettle:{L:7,  W:1.4, D:2.4}, burnerMW:1.2, acidVol:60,  degVol:30, fluxVol:20, dayCost:6500,  batch:[6,14] },
  medium: { name:'Orta Ölçek',  tpy:35000, budget:18e6, building:5.5e6, scale:1.0, kettle:{L:12, W:1.6, D:3.0}, burnerMW:2.6, acidVol:120, degVol:60, fluxVol:40, dayCost:11500, batch:[10,24] },
  heavy:  { name:'Ağır Yapısal Çelik', tpy:70000, budget:30e6, building:9.5e6, scale:1.6, kettle:{L:15, W:1.9, D:3.4}, burnerMW:4.0, acidVol:200, degVol:100, fluxVol:70, dayCost:20500, batch:[18,40] }
};
const kettleTonnes = c => Math.round(c.kettle.L * c.kettle.W * c.kettle.D * 0.92 * 6.6);

/* ---------- EPC steps: every option carries cost (USD, medium scale) ---------- */
const EPC_STEPS = [
  { id:'s11', code:'1.1', title:'Fizibilite & Yerleşim', en:'Feasibility & Layout', enc:'layout',
    intro:'Kapasite ve bina yüksekliği tesisin bütün geri kalanını boyutlandırır. Akış tipini (I, L, U) 1.6 Yerleşim planında ekipmanları yerleştirerek siz belirleyeceksiniz. ÇED dosyası emisyon taahhüdünüzle birlikte verilir.',
    fields:[
      { key:'capacity', label:'Yıllık hedef kapasite', en:'Annual design capacity', enc:'capacity', opts:[
        { v:'small',  t:'Küçük – 15.000 t/yıl (kazan 7,0 × 1,4 × 2,4 m)', c:0, fixed:true },
        { v:'medium', t:'Orta – 35.000 t/yıl (kazan 12,0 × 1,6 × 3,0 m)', c:0, fixed:true },
        { v:'heavy',  t:'Ağır yapısal – 70.000 t/yıl (kazan 15,0 × 1,9 × 3,4 m)', c:0, fixed:true } ] },
      { key:'conv', label:'Tesis tipi (otomasyon)', en:'Plant automation type', enc:'conveyor', opts:[
        { v:'manual', t:'Manuel – monoray vinçler, her daldırmayı operatör yapar', c:300e3, note:'Ucuz yatırım. İşçilik +%30, parti süresi +%40, kalite operatöre bağlı.' },
        { v:'semi', t:'Yarı otomatik – vinç programla taşır, kazanı operatör yönetir', c:900e3, note:'Dengeli: standart işçilik ve süre.' },
        { v:'auto', t:'Tam otomatik – PLC kontrollü hat, reçeteyle daldırma', c:2.2e6, note:'Pahalı. İşçilik –%25, parti süresi –%20, tekrarlanabilir kalite.' } ] },
      { key:'partH', label:'Askıdaki en büyük parça dikey boyu', en:'Max hung part height', enc:'height', type:'number', min:2, max:9, step:0.5, unit:'m', def:6 },
      { key:'height', label:'Kanca altı / bina iç yüksekliği', en:'Building clear height', enc:'height', opts:[
        { v:9,    t:'9,0 m',  c:-300e3, fixed:true },
        { v:11,   t:'11,0 m', c:0, fixed:true },
        { v:12.5, t:'12,5 m', c:200e3, fixed:true },
        { v:14,   t:'14,0 m', c:450e3, fixed:true },
        { v:16,   t:'16,0 m', c:800e3, fixed:true } ] },
      { key:'ced', label:'ÇED emisyon taahhüt paketi', en:'EIA emission package', enc:'ced', opts:[
        { v:'basic', t:'Asgari (yalnız baca, ölçüm yok)', c:40e3 },
        { v:'std',   t:'Asit buharı yaş yıkayıcı (scrubber) + periyodik ölçüm', c:380e3 },
        { v:'full',  t:'Yıkayıcı + sürekli emisyon izleme (CEMS)', c:650e3, note:'Denetimlerde itibar bonusu.' } ] }
    ]},
  { id:'s12', code:'1.2', title:'İnşaat & Kazan Çukuru', en:'Civil Works & Kettle Pit', enc:'kettlepit',
    intro:'Erimiş çinko ile suyun teması ani buharlaşma ile patlamaya yol açar. Çukur sızdırmazlığı ve acil çinko toplama haznesi en kritik inşaat kalemleridir.',
    fields:[
      { key:'survey', label:'Zemin etüdü (sondaj + yeraltı suyu ölçümü)', en:'Geotechnical survey', enc:'survey', opts:[
        { v:'no', t:'Yapma', c:0 },
        { v:'yes', t:'Yap – 3 sondaj kuyusu, piezometre', c:35e3, fixed:true } ] },
      { key:'pitwp', label:'Kazan çukuru su yalıtımı', en:'Kettle pit waterproofing', enc:'kettlepit', opts:[
        { v:'none', t:'Yalıtımsız betonarme', c:0 },
        { v:'bitumen', t:'Bitümlü membran', c:60e3 },
        { v:'hdpe', t:'HDPE membran + kristalize beton + drenaj/dewatering pompası', c:320e3 } ] },
      { key:'runout', label:'Acil çinko toplama haznesi (Run-out Pit)', en:'Emergency zinc run-out pit', enc:'runout', opts:[
        { v:0, t:'Yok', c:0 },
        { v:50, t:'Kazan hacminin %50’si', c:120e3 },
        { v:110, t:'Kazan hacminin %110’u (refrakter kaplı)', c:260e3 } ] },
      { key:'bund', label:'Ön işlem havuz çukuru kaplaması', en:'Acid containment bund', enc:'bund', opts:[
        { v:'plain', t:'Çıplak beton', c:0 },
        { v:'epoxy', t:'Epoksi kaplama', c:140e3 },
        { v:'vinyl', t:'Vinilester + aside dayanıklı tuğla', c:420e3 } ] },
      { key:'drain', label:'Zemin drenajı', en:'Floor drainage', enc:'drain', opts:[
        { v:'combined', t:'Tek ortak kanal', c:50e3 },
        { v:'segregated', t:'Ayrık kanallar (yağ / asit / durulama → nötralizasyon)', c:190e3 } ] }
    ]},
  { id:'s13', code:'1.3', title:'Kimyasal Tanklar', en:'Pretreatment Tanks', enc:'tanks',
    intro:'Tank ve eşanjör malzemesi banyo kimyasıyla uyumlu olmalı. Yanlış malzeme işletmede kaçak, kirlenme ve duruş olarak geri döner.',
    fields:[
      { key:'degTank', label:'Yağ alma tankı', en:'Degreasing tank', enc:'degreasing', opts:[
        { v:'cs', t:'Karbon çeliği', c:90e3 }, { v:'pp', t:'Polipropilen (PP)', c:140e3 } ] },
      { key:'degHeat', label:'Yağ alma ısıtma serpantini', en:'Degreasing heater', enc:'heater', opts:[
        { v:'cu', t:'Bakır', c:20e3 }, { v:'ss', t:'Paslanmaz çelik', c:45e3 }, { v:'ti', t:'Titanyum', c:80e3 } ] },
      { key:'skimmer', label:'Yağ sıyırıcı + koalesans separatör', en:'Oil skimmer & coalescer', enc:'skimmer', opts:[
        { v:'no', t:'Yok', c:0 }, { v:'yes', t:'Var', c:55e3 } ] },
      { key:'acid', label:'Asitleme kimyası', en:'Pickling acid', enc:'pickling', opts:[
        { v:'hcl', t:'Hidroklorik asit (HCl, oda sıcaklığı)', c:0 },
        { v:'h2so4', t:'Sülfürik asit (H₂SO₄, 60–80 °C ısıtmalı)', c:150e3, note:'Isıtma enerjisi gerekir.' } ] },
      { key:'pickTank', label:'Asit tankı konstrüksiyonu', en:'Pickling tank construction', enc:'pickling', opts:[
        { v:'cs', t:'Çıplak karbon çeliği', c:150e3 },
        { v:'rubber', t:'Kauçuk kaplı çelik (rubber-lined)', c:380e3 },
        { v:'hdpe', t:'Ağır hizmet HDPE / PP', c:330e3 },
        { v:'lead', t:'Kurşun / asit tuğlası kaplı', c:520e3 } ] },
      { key:'pickN', label:'Asit tankı sayısı', en:'Number of pickling tanks', enc:'pickling', opts:[
        { v:2, t:'2 tank', c:0 }, { v:3, t:'3 tank (+ kademeli kullanım)', c:180e3 }, { v:4, t:'4 tank', c:360e3 } ] },
      { key:'rinseTank', label:'Durulama tankları', en:'Rinse tanks', enc:'rinse', opts:[
        { v:'cs', t:'Karbon çeliği', c:60e3 }, { v:'pp', t:'PP / HDPE', c:110e3 } ] },
      { key:'cascade', label:'Kaskad (ters akış) su sistemi', en:'Counter-flow cascade rinse', enc:'rinse', opts:[
        { v:'no', t:'Yok – tek geçiş taze su', c:0 }, { v:'yes', t:'Var', c:45e3 } ] },
      { key:'agit', label:'Hava çalkalama boruları', en:'Air agitation', enc:'rinse', opts:[
        { v:'no', t:'Yok', c:0 }, { v:'yes', t:'Var', c:25e3 } ] },
      { key:'fluxTank', label:'Flux tankı', en:'Preflux tank', enc:'fluxing', opts:[
        { v:'ss', t:'Paslanmaz çelik AISI 316', c:160e3 },
        { v:'pp', t:'PP', c:120e3 },
        { v:'rubber', t:'Kauçuk kaplı çelik', c:150e3 } ] },
      { key:'fluxHeat', label:'Flux ısıtma eşanjörü (50–65 °C)', en:'Flux heat exchanger', enc:'heater', opts:[
        { v:'cu', t:'Bakır', c:15e3 }, { v:'ti', t:'Titanyum', c:70e3 } ] },
      { key:'fluxFilter', label:'Flux rejenerasyon / filtrasyon ünitesi', en:'Flux regeneration & filter press', enc:'fluxfilter', opts:[
        { v:'no', t:'Yok', c:0 }, { v:'yes', t:'Var (H₂O₂ oksidasyon + filtre pres)', c:210e3 } ] }
    ]},
  { id:'s14', code:'1.4', title:'Galvaniz Fırını & Kazan', en:'Galvanizing Furnace & Kettle', enc:'furnace',
    intro:'Galvaniz fırını (ocak) kazanı dışından ısıtır; kazan fırının içine oturur. Kazan, tesisin kalbidir ve en pahalı sarf kalemidir. Kazan ömrünü malzeme kimyası, alev tipi ve işletme sıcaklığı belirler.',
    fields:[
      { key:'refr', label:'Fırın iç izolasyonu', en:'Furnace lining', enc:'refractory', opts:[
        { v:'brick', t:'Yalnız refrakter tuğla', c:380e3 },
        { v:'fiber', t:'Refrakter tuğla + seramik fiber modüller', c:520e3 } ] },
      { key:'burner', label:'Brülör sistemi', en:'Burner system', enc:'burner', opts:[
        { v:'conv', t:'Konvansiyonel alevli brülör', c:260e3 },
        { v:'hv', t:'Yüksek hızlı resirkülasyon brülörü (High-Velocity)', c:480e3 } ] },
      { key:'kSteel', label:'Kazan sacı', en:'Kettle steel', enc:'kettle', opts:[
        { v:'s235', t:'Standart S235JR (Si ≈ %0,20)', c:420e3 },
        { v:'armco', t:'Özel kazan sacı (Si < %0,005, C < %0,08)', c:780e3 } ] },
      { key:'kThk', label:'Kazan et kalınlığı', en:'Kettle wall thickness', enc:'kettle', opts:[
        { v:30, t:'30 mm', c:0 }, { v:40, t:'40 mm', c:120e3 }, { v:50, t:'50 mm', c:260e3 } ] },
      { key:'fume', label:'Duman toplama ve filtrasyon', en:'Fume extraction', enc:'fume', opts:[
        { v:'none', t:'Yok (çatı fanı)', c:0 },
        { v:'lip', t:'Dudak emiş (Lip Extraction) + torba filtre', c:350e3 },
        { v:'enclosure', t:'Kapalı kabin (White Fume Enclosure) + kıvılcım tutucu + jet-pulse torba filtre', c:900e3 } ] }
    ]},
  { id:'s15', code:'1.5', title:'Malzeme Taşıma & Yardımcı Sistemler', en:'Handling & Auxiliary Systems', enc:'aux',
    intro:'Vinç ve konveyör sistemi verimi, kurutma fırını kaplama kalitesini, laboratuvar ise elinizdeki ölçüm imkânını belirler.',
    fields:[
      { key:'ip', label:'Motor / kablo koruma sınıfı', en:'Motor protection class', enc:'ip', opts:[
        { v:'ip54', t:'IP54 standart', c:0 }, { v:'ip66', t:'IP66 + aside dayanıklı kablo', c:90e3 } ] },
      { key:'oven', label:'Kurutma fırını (80–110 °C)', en:'Drying oven', enc:'oven', opts:[
        { v:'none', t:'Yok', c:0 },
        { v:'burner', t:'Brülörlü sıcak hava sirkülasyonlu', c:280e3 },
        { v:'waste', t:'Ocak baca gazı atık ısı geri kazanımlı (WHR)', c:420e3 } ] },
      { key:'spin', label:'Santrifüj galvaniz hattı', en:'Spin galvanizing line', enc:'spin', opts:[
        { v:'no', t:'Yok', c:0 }, { v:'yes', t:'Var (sepet + santrifüj)', c:850e3 } ] },
      { key:'acidRec', label:'Asit geri kazanım', en:'Acid recovery', enc:'acidrec', opts:[
        { v:'none', t:'Yok (atık asit bertarafı)', c:0 },
        { v:'retard', t:'Asit retardasyon ünitesi', c:650e3 },
        { v:'cryst', t:'FeCl₂ kristalizasyon', c:1.1e6 } ] },
      { key:'neut', label:'Atık su nötralizasyon tesisi', en:'Wastewater neutralisation', enc:'neut', opts:[
        { v:'no', t:'Yok', c:0 }, { v:'yes', t:'Kireç sütü + flokülasyon + filtre pres', c:520e3 } ] },
      { key:'lab', label:'Laboratuvar', en:'Laboratory', enc:'lab', opts:[
        { v:'basic', t:'Temel (pH metre, Baumé hidrometresi, termometre, Elcometer)', c:60e3 },
        { v:'full', t:'Tam donanımlı (titrasyon seti, OES spektrometre, metalografi mikroskobu)', c:380e3 } ] }
    ]}
];

const RECOMMENDED = { capacity:'medium', partH:6, height:14, ced:'std', survey:'yes', pitwp:'hdpe', runout:110, bund:'vinyl', drain:'segregated',
  degTank:'pp', degHeat:'ti', skimmer:'yes', acid:'hcl', pickTank:'rubber', pickN:3, rinseTank:'pp', cascade:'yes', agit:'yes', fluxTank:'pp', fluxHeat:'ti', fluxFilter:'yes',
  refr:'fiber', burner:'hv', kSteel:'armco', kThk:50, fume:'enclosure', conv:'semi', ip:'ip66', oven:'waste', spin:'no', acidRec:'retard', neut:'yes', lab:'full' };

/* ---------- Products & customers ---------- */
const PRODUCTS = [
  { id:'hea',   name:'HEA 300 kiriş',                    en:'HEA 300 beam',              grade:'S355J2+N', t:14,  len:12,  closed:false, chem:{alk:.35,peak:.25,seb:.25,hyp:.15}, price:410, tons:[1.0,1.6], surf:['millscale','millscale','rust'], hanger:'hook' },
  { id:'rhs',   name:'Kutu profil 100×100×4',             en:'RHS 100×100×4',            grade:'S235JRH',  t:4,   len:6,   closed:true,  chem:{alk:.6,peak:.3,seb:.1,hyp:0},    price:470, tons:[0.6,1.0], surf:['millscale','grease','rust'], hanger:'wire' },
  { id:'pole',  name:'Aydınlatma direği Ø168×5',          en:'Lighting pole Ø168×5',     grade:'S355J0H',  t:5,   len:10,  closed:true,  chem:{alk:.45,peak:.35,seb:.2,hyp:0},  price:480, tons:[0.7,1.1], surf:['millscale','laser','grease'], hanger:'hook' },
  { id:'angle', name:'Enerji nakil kulesi köşebent L80×8', en:'Lattice tower angle L80×8', grade:'S355JR', t:8,   len:7,   closed:false, chem:{alk:.3,peak:.35,seb:.25,hyp:.1}, price:430, tons:[0.9,1.4], surf:['millscale','rust'], hanger:'wire' },
  { id:'guard', name:'Otoyol bariyeri (W-beam) 3 mm',     en:'Highway guardrail 3 mm',    grade:'S235JR',   t:3,   len:4.3, closed:false, chem:{alk:.75,peak:.2,seb:.05,hyp:0},  price:455, tons:[0.8,1.2], surf:['millscale','grease'], hanger:'jig' },
  { id:'grat',  name:'Platform ızgarası 30×3',            en:'Steel grating 30×3',        grade:'S235JR',   t:3,   len:6,   closed:false, chem:{alk:.7,peak:.25,seb:.05,hyp:0},  price:520, tons:[0.5,0.9], surf:['millscale','slag','grease'], hanger:'jig' },
  { id:'plate', name:'Ağır plaka 25 mm (Si-yatıştırılmış)', en:'Heavy plate 25 mm Si-killed', grade:'S355J2', t:25, len:8,  closed:false, chem:{alk:0,peak:.1,seb:.4,hyp:.5},   price:395, tons:[1.2,1.8], surf:['millscale','laser','paint'], hanger:'hook' },
  { id:'bolt',  name:'HV cıvata M20 10.9 + somun',        en:'HV bolt M20 grade 10.9',    grade:'10.9 (Q+T)', t:8, len:0.12, closed:false, chem:{alk:.8,peak:.2,seb:0,hyp:0},  price:880, tons:[0.15,0.35], surf:['grease','rust'], hanger:'basket', spin:true, hs:true },
  { id:'tray',  name:'Kablo tavası sac 1,2 mm',           en:'Cable tray 1.2 mm',         grade:'DX51D',    t:1.2, len:3,   closed:false, chem:{alk:.85,peak:.15,seb:0,hyp:0}, price:560, tons:[0.4,0.8], surf:['grease','grease','millscale'], hanger:'jig' }
];
const CUSTOMERS = ['Toros Kule Montaj','Ege Aydınlatma Sistemleri','Marmara Çelik Yapı','Kuzey Bağlantı Elemanları','Yol Güvenlik Ekipmanları','Delta Kablo Tavası','Kapadokya Sera Konstrüksiyon','Trakya Enerji Altyapı','Başkent Köprü Çelik'];

const SURFACES = {
  millscale:{ t:'Hadde tufalı (mill scale)', scaleKg:9,  treq:45, enc:'millscale' },
  rust:     { t:'Pas (Sa 0 – C derecesi)',   scaleKg:7,  treq:35, enc:'millscale' },
  grease:   { t:'Ağır gres / kesme yağı',     scaleKg:4,  treq:30, enc:'degreasing', oil:true },
  laser:    { t:'Lazer kesim oksit tabakası', scaleKg:5,  treq:90, enc:'laser', blastPref:true },
  paint:    { t:'Boya / marker işaretleri',   scaleKg:3,  treq:40, enc:'paint', blastReq:true },
  slag:     { t:'Kaynak cürufu ve sıçrantı',  scaleKg:4,  treq:40, enc:'slag', blastReq:true }
};

const SANDELIN = [
  { v:'hypo', t:'Hipo-Sandelin (< %0,03)', en:'Hypo-Sandelin' },
  { v:'peak', t:'Sandelin pik bölgesi (%0,03 – %0,12)', en:'Sandelin peak' },
  { v:'seb',  t:'Sebisty bölgesi (%0,12 – %0,25)', en:'Sebisty range' },
  { v:'hyp',  t:'Hiper-Sandelin (> %0,25)', en:'Hyper-Sandelin' }
];
const sandelinClass = se => se < 0.03 ? 'hypo' : se <= 0.12 ? 'peak' : se <= 0.25 ? 'seb' : 'hyp';

/* ISO 1461 Table 3 (not centrifuged) and Table 4 (centrifuged) */
const ISO1461 = [
  { lim:t=>t>6,    label:'Çelik > 6 mm',        local:70, mean:85 },
  { lim:t=>t>3,    label:'Çelik > 3 – ≤ 6 mm',  local:55, mean:70 },
  { lim:t=>t>=1.5, label:'Çelik ≥ 1,5 – ≤ 3 mm', local:45, mean:55 },
  { lim:()=>true,  label:'Çelik < 1,5 mm',      local:35, mean:45 }
];
const ISO1461_SPIN = { label:'Santrifüj, dişli parça Ø ≥ 6 – ≤ 20 mm', local:35, mean:45 };

const ROOT_CAUSES = [
  ['degrease','Yetersiz yağ alma (konsantrasyon / sıcaklık / yağ yükü)'],
  ['pickle','Yetersiz asitleme (serbest asit düşük, Fe yüksek, süre kısa)'],
  ['surface','Mekanik temizlik gerekli (boya, cüruf, lazer oksit) – kumlama yapılmadı'],
  ['flux','Flux banyosu bozuk (Baumé / pH / ACN / Fe)'],
  ['dry','Kurutma hatası (nem kaldı veya flux yandı)'],
  ['al','Banyoda alüminyum fazlası (flux ile reaksiyon)'],
  ['dross','Dip dross birikimi / dross temizliği yapılmadı'],
  ['skim','Kül (ash) sıyırma yapılmadı'],
  ['withdraw','Çekme hızı / drenaj açısı / askı yönü hatalı'],
  ['temp','Banyo sıcaklığı uygun değil'],
  ['steel','Çelik kimyası (Sandelin) – Ni dozajı yetersiz'],
  ['vent','Havalandırma/drenaj deliği eksik'],
  ['passiv','Pasivasyon yok / ıslak istifleme'],
  ['overpickle','İnhibitörsüz aşırı asitleme'],
  ['dwell','Bekleme süresi (dwell time) uygun değil'],
  ['cool','Soğutma yöntemi (havada yavaş soğuma)']
];

/* ---------- Interactive encyclopedia (TR / EN / formula / principle / field tip) ---------- */
const ENC = {
  layout:{ tr:'Tesis yerleşimi', en:'Plant layout', p:'Ön işlem → kurutma → kazan → soğutma → kontrol sırası tek yönlü akmalıdır. Asit buharı kazan bölgesinden ve elektrik panolarından ayrılır.', tip:'Asit tanklarını hakim rüzgâr ve emiş yönüne göre kazanın aksi tarafına yerleştirin.' },
  capacity:{ tr:'Tasarım kapasitesi', en:'Design capacity', f:'Kazan boyu ≥ en uzun parça + 0,5 m', p:'Kapasite; kazan hacmini, brülör gücünü, asit hacmini ve vardiya başına daldırma sayısını belirler.', tip:'Yıllık tonaj / (vardiya × gün × doluluk) ile saatlik daldırma ihtiyacını kontrol edin.' },
  flow:{ tr:'Akış tipi', en:'Process flow (I / L / U)', p:'I-hattı: düz, giriş ve çıkış zıt cephelerde, uzun bina. L-tipi: ön işlem bir kanatta, kazan ve son işlemler diğer kanatta; köşeli arsalara uyar, asit bölgesini sıcak bölgeden ayırır. U-tipi: giriş ve çıkış aynı cephede; saha lojistiği en kısa.', tip:'Her dönüş bir transfer arabası veya vinç aktarması demektir: rota kısa, dönüş az olmalı.' },
  plotplan:{ tr:'Yerleşim planı', en:'Plot plan / plant layout', f:'Tank arası ≤ 1,5 m · asit ↔ kazan ≥ 6 m · fırın ↔ kazan ≤ 4 m · lab ↔ asit ≥ 8 m', p:'Ekipmanlar proses sırasıyla dizilir. Ön işlem tankları yan yana durur ve askı traversi tank boyuna dik hareket eder. Asit buharı kazan, elektrik ve laboratuvardan uzak tutulur. Kurutma fırını kazanın hemen önündedir.', tip:'Bina zarfı ekipmanın kapladığı alana göre fiyatlanır: kompakt plan hem yatırımı hem parti süresini düşürür.' },
  height:{ tr:'Kanca yüksekliği', en:'Crane hook height', f:'H_min = vinç yapısı (3,5 m) + askı aparatı (1,2 m) + parça boyu + tank kenarı payı (1,5 m)', p:'Yetersiz yükseklikte uzun parçalar dik daldırılamaz; çift daldırma (double dipping) gerekir.', tip:'Tipik tesislerde 11–14 m yeterlidir.' },
  ced:{ tr:'Çevresel Etki Değerlendirmesi (ÇED)', en:'Environmental Impact Assessment (EIA)', p:'HCl buharı, NH₄Cl beyaz dumanı (ZnCl₂·NH₄Cl aerosolü), baca gazı ve atık sular için emisyon sınır değerleri taahhüt edilir.', tip:'Yıkayıcı olmadan HCl emisyon limitlerini sağlamak pratikte mümkün değildir.' },
  survey:{ tr:'Zemin etüdü', en:'Geotechnical survey', p:'Sondaj ve piezometre ile yeraltı su seviyesi, taşıma gücü ve sülfat/klorür agresifliği belirlenir.', tip:'Kazan çukuru tabanı yeraltı suyu seviyesine 1 m’den fazla yaklaşıyorsa sürekli drenaj şarttır.' },
  kettlepit:{ tr:'Kazan çukuru', en:'Kettle pit', p:'Kazan, fırın ve acil toplama haznesi betonarme çukura oturur. Suyun erimiş çinko ile teması ani buharlaşma (~1700 kat hacim artışı) ile patlamaya neden olur.', tip:'Çukur tabanı mutlaka kuru, membranlı ve pompalı drenajlı olmalıdır.' },
  runout:{ tr:'Acil çinko toplama haznesi', en:'Emergency run-out pit / sump', p:'Kazan delinirse 200–400 ton sıvı çinko refrakter kaplı kanallarla bu hazneye akar ve donar.', tip:'Hacmi kazandaki çinkonun en az %100’ünü almalı; içinde su birikmemeli.' },
  bund:{ tr:'Asit sızdırmaz toplama tavası', en:'Acid containment bund', p:'Tankların altında, en büyük tankın %110’unu tutan sızdırmaz havuz. HCl betonu (Ca(OH)₂) hızla çözer.', tip:'Vinilester üzeri aside dayanıklı tuğla en uzun ömürlü çözümdür.' },
  drain:{ tr:'Ayrık drenaj', en:'Segregated drainage', p:'Alkali yağ alma, asidik durulama ve yağmur suları ayrı toplanır; nötralizasyon dozajı kontrollü olur.', tip:'Karışık atıksu nötralizasyonda çamur miktarını artırır.' },
  tanks:{ tr:'Ön işlem tankları', en:'Pretreatment tanks', p:'Yağ alma → durulama → asitleme → durulama → flux sırasıyla kimyasal yüzey hazırlığı yapılır.', tip:'Banyolar zincirleme bağlıdır: bir banyodaki hata sonrakine taşınır.' },
  degreasing:{ tr:'Yağ alma', en:'Degreasing', f:'Yağ + NaOH → sabun (saponifikasyon); emülsiyon için yüzey aktif madde', p:'Alkali (pH 12–13) veya asidik yağ alma; 60–80 °C’de kesme yağları ve gresler emülsiye edilir.', tip:'Yağ alınmamış yüzeyde asit çalışmaz ve flux tutmaz: çıplak bölge (bare spot) oluşur.' },
  heater:{ tr:'Isıtma eşanjörü', en:'Immersion heat exchanger', p:'Banyoya daldırılan serpantin veya plakalı eşanjör. Klorürlü ortamda yalnızca titanyum ve PTFE uzun ömürlüdür.', tip:'Bakır flux içinde çözünür ve kazanı kirletir; paslanmaz çelik klorürde oyuklanır (pitting).' },
  skimmer:{ tr:'Yağ sıyırıcı', en:'Oil skimmer & coalescer', p:'Yüzeye çıkan serbest yağı bant veya disk ile toplar; koalesans separatörü emülsiyonu ayırır.', tip:'Sıyırıcısız banyoda yağ birikir, banyo ömrü yarıya iner.' },
  pickling:{ tr:'Asitleme (Dekapaj)', en:'Pickling', f:'Fe₃O₄ + 8HCl → FeCl₂ + 2FeCl₃ + 4H₂O   |   Fe + 2HCl → FeCl₂ + H₂↑', p:'Hadde tufalı ve pas %10–15 HCl ile çözülür. Banyo Fe arttıkça yavaşlar; 120–140 g/L Fe’de etkisini yitirir.', tip:'Fe yükseldikçe taze asit eklemek yerine banyonun bir kısmını rejenerasyona gönderin.' },
  inhibitor:{ tr:'Asit inhibitörü', en:'Pickling inhibitor', p:'Organik amin bazlı inhibitör ana çeliğe adsorbe olarak oksit çözünürken metal çözünmesini durdurur.', tip:'İnhibitörsüz aşırı asitlemede yüzey pürüzlenir, hidrojen gevrekliği riski artar.' },
  titrationAcid:{ tr:'Serbest asit titrasyonu', en:'Free acid titration', f:'HCl (g/L) = V(NaOH, mL) × N × 36,46 / V(numune, mL)', p:'Numune metil oranj indikatörüyle 1 N NaOH ile kırmızıdan sarıya titre edilir.', tip:'Fe yüksekse dönüm noktası bulanıklaşır; numuneyi seyreltin.' },
  titrationFe:{ tr:'Demir tayini (KMnO₄)', en:'Iron determination (permanganate)', f:'5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O   |   Fe (g/L) = V × N × 55,85 / V(numune)', p:'Asitlendirilmiş numune 0,1 N KMnO₄ ile kalıcı pembe renge kadar titre edilir.', tip:'Dikromat yöntemi klorürden etkilenmez; KMnO₄ ile Zimmermann-Reinhardt çözeltisi kullanın.' },
  baume:{ tr:'Baumé ölçümü', en:'Baumé hydrometer', f:'°Bé = 145 − 145 / SG', p:'Hidrometre ile yoğunluk okunur. Flux için 12–18 °Bé (≈ 200–300 g/L toplam tuz) idealdir.', tip:'Ölçümü 20 °C’ye düzeltin; sıcak flux düşük okur.' },
  rinse:{ tr:'Durulama', en:'Rinsing', p:'Kimyasal sürüklenmeyi (drag-out) keser. Kaskad sistemde taze su son tanka girer, ters yönde akar.', tip:'Durulama 2’de Fe < 2 g/L tutulmazsa flux demiri hızla yükselir.' },
  fluxing:{ tr:'Fluxlama (ön flux)', en:'Prefluxing', f:'ZnCl₂·xNH₄Cl  |  ACN = NH₄Cl / (ZnCl₂ + NH₄Cl)', p:'Asitlenmiş yüzeye ince tuz filmi bırakır; kurutma sonrası yeniden oksitlenmeyi önler, kazanda yüzeyi aktive eder.', tip:'pH 4,2–4,8, Fe < 3 g/L, 50–65 °C. Islatıcı yüzey gerilimini düşürür.' },
  acn:{ tr:'ACN oranı', en:'Ammonium chloride ratio', f:'ACN = NH₄Cl / (ZnCl₂ + NH₄Cl)  (kütlesel)', p:'Çift tuz ≈ 0,45, üçlü tuz ≈ 0,65. Yüksek NH₄Cl daha fazla duman ve kül, düşük NH₄Cl zayıf ıslatma demektir.', tip:'Ağır profillerde çift tuz, ince sac ve yüksek hızda üçlü tuz tercih edilir.' },
  fluxfilter:{ tr:'Flux rejenerasyonu', en:'Flux regeneration', f:'2Fe²⁺ + H₂O₂ + 2H⁺ → 2Fe³⁺ + 2H₂O   |   Fe³⁺ + 3NH₄OH → Fe(OH)₃↓ + 3NH₄⁺', p:'Fe²⁺ peroksitle Fe³⁺’e yükseltgenir, pH ~4,5’te Fe(OH)₃ olarak çöker ve filtre preste kek olarak ayrılır.', tip:'Filtresiz yapılırsa çamur tank dibinde kalır ve tekrar çözünür.' },
  oven:{ tr:'Kurutma fırını (kurutma ocağı)', en:'Drying oven', p:'Galvaniz fırınından ayrı, kazanın hemen önündeki ısıtma tüneli. Atık ısılı tipte galvaniz fırınının baca gazı bir kanalla buraya taşınır. 80–110 °C’de nem buharlaşır, flux kristalize olur. Kuru olmayan parça kazanda çinko sıçratır.', tip:'130 °C üzerinde flux yanar (kahverengi-siyah), aktivitesini kaybeder.' },
  furnace:{ tr:'Galvaniz ocağı', en:'Galvanizing furnace', p:'Kazanı dış yüzeyinden ısıtan refrakter kaplı yanma odası. Isı akısı kazan duvarı boyunca eşit dağıtılmalıdır.', tip:'Duvar ısı akısı 30–40 kW/m² altında tutulursa kazan ömrü uzar.' },
  refractory:{ tr:'Refrakter ve seramik fiber', en:'Refractory & ceramic fibre', p:'Düşük termal kütleli seramik fiber modüller ısı kaybını azaltır ve sıcaklık kontrolünü hızlandırır.', tip:'Fiber modüller ~%15 yakıt tasarrufu sağlar.' },
  burner:{ tr:'Yüksek hızlı brülör', en:'High-velocity burner', p:'Alev doğrudan kazana çarpmaz; yüksek hızlı sıcak gaz yanma odasında resirküle olur ve ısıyı eşit dağıtır.', tip:'Alev çarpması (flame impingement) lokal sıcak noktaya ve kazan delinmesine yol açar.' },
  kettle:{ tr:'Galvaniz kazanı', en:'Galvanizing kettle', p:'Düşük Si (< %0,005) ve düşük C (< %0,08) özel saçtan 40–50 mm et kalınlığında kaynaklı kazan. Si’li çelik Sandelin etkisiyle çinkoda hızla çözünür.', tip:'Duvar sıcaklığını 480 °C altında tutun; kazan ömrü 5–8 yıl hedeflenir.' },
  fume:{ tr:'Duman emiş', en:'Fume extraction', p:'Daldırma anında oluşan ZnCl₂/NH₄Cl beyaz dumanı kabin veya dudak emişi ile torba filtreye alınır.', tip:'Torba filtre tozu (flux tozu) çinko içerir ve geri kazanılabilir.' },
  conveyor:{ tr:'Tesis tipi: manuel / yarı otomatik / tam otomatik', en:'Manual / semi-automatic / fully automatic plant', p:'Manuel tesiste operatör monoray vinçle askıyı her banyoya kendisi indirip çıkarır. Yarı otomatikte vinç programla taşır, kazan daldırmasını operatör yönetir. Tam otomatikte PLC reçeteye göre tüm süreleri uygular; kalite tekrarlanabilir, personel az.', tip:'Asit buharında IP66 motor ve korumalı kablo kullanılmazsa arızalar sık olur.' },
  ip:{ tr:'IP koruma sınıfı', en:'Ingress protection (IP)', p:'IP66: toza tam koruma ve güçlü su jetine dayanım. Asit buharlı ortamda conta ve kablo malzemesi de önemlidir.', tip:'IP54 motorlar HCl buharında 6–18 ayda arızalanır.' },
  spin:{ tr:'Santrifüj galvaniz', en:'Spin (centrifugal) galvanizing', p:'Küçük parçalar sepette daldırılır, çıkışta 300–900 dev/dk savrularak fazla çinko atılır; dişler temiz kalır.', tip:'Santrifüjsüz daldırılan cıvatalarda dişler çinkoyla dolar, somun takılmaz.' },
  acidrec:{ tr:'Asit geri kazanım', en:'Acid recovery', p:'Retardasyon reçinesi serbest HCl’i tutar, FeCl₂’yi geçirir; kristalizasyon FeCl₂·4H₂O olarak demiri ayırır.', tip:'Asit tüketimini %30–50 azaltır.' },
  neut:{ tr:'Nötralizasyon', en:'Neutralisation plant', f:'2HCl + Ca(OH)₂ → CaCl₂ + 2H₂O   |   Fe²⁺ + 2OH⁻ → Fe(OH)₂↓', p:'Kireç sütü ile pH 8,5–9,5’e çıkarılır, metal hidroksitler flokülasyonla çöktürülüp filtre preste kek alınır.', tip:'Deşarj izni olmadan atık asit lisanslı firmaya verilmelidir (yüksek maliyet).' },
  lab:{ tr:'Kalite laboratuvarı', en:'QC laboratory', p:'Banyo titrasyonları, Baumé, pH, OES ile kazan alaşım analizi, kaplama kalınlığı ve metalografi.', tip:'Temel laboratuvarda titrasyon ve OES dış laboratuvara gönderilir (pahalı).' },
  aux:{ tr:'Yardımcı sistemler', en:'Auxiliary systems', p:'Kurutma, taşıma, geri kazanım ve laboratuvar tesisin verim ve kalite kaldıraçlarıdır.', tip:'Atık ısı geri kazanımı kurutma fırınının yakıt ihtiyacını büyük ölçüde karşılar.' },
  ingot:{ tr:'Çinko külçe', en:'Zinc ingot (SHG / HG)', p:'SHG: %99,995 Zn (Special High Grade). HG: %99,95. Külçe tipik 25 kg veya 1 t jumbo blok.', tip:'İlk ergitmede yalnızca saf çinko kullanılır; alaşım ergitme tamamlandıktan sonra eklenir.' },
  thermos:{ tr:'Sıvı çinko taşıma potası', en:'Thermos ladle', p:'Refrakter kaplı, kapaklı taşıma potası. Ön ısıtma hızı ≤ 20 °C/saat; dolum kapağın 50–75 mm altında durdurulur.', tip:'Ani ısıtma refrakterdeki nemi buhara çevirir, çatlatır.' },
  holding:{ tr:'Bekletme fırını', en:'Holding furnace', p:'Sıvı çinkoyu transfer öncesi sıcak tutar. Pompalama ilk dolan fırından başlar.', tip:'Sıra bozulursa bekleyen fırında aşırı ısınma ve sıvı metal korozyonu (LMC) riski oluşur.' },
  lmc:{ tr:'Sıvı metal korozyonu', en:'Liquid metal corrosion (LMC)', p:'Sıvı çinko çeliği yüksek sıcaklıkta hızla çözer; lokal aşırı ısınma bu hızı katlar.', tip:'Pompa ve fırın sırası bu nedenle sabit bir prosedüre bağlanır.' },
  sandelin:{ tr:'Sandelin etkisi', en:'Sandelin effect', f:'Si_eq = %Si + 2,5 × %P', p:'%0,03–0,12 Si_eq aralığında ζ fazı kolonlu büyür, η tabakası oluşamaz: kalın, mat gri ve kırılgan kaplama.', tip:'Banyoya %0,04–0,06 Ni eklemek pik bölgeyi bastırır; hiper-Sandelin’de etkisi sınırlıdır.' },
  mtc:{ tr:'Malzeme test sertifikası', en:'Mill test certificate (EN 10204 3.1)', p:'Çeliğin döküm analizini (C, Si, P, Mn, S, Al) ve mekanik değerlerini verir.', tip:'Si değeri yoksa XRF tabanca ile yerinde ölçüm yapın.' },
  vent:{ tr:'Havalandırma / drenaj deliği', en:'Vent & drain holes', f:'Boru Ø ≤ 25 mm: 10 mm; Ø 50 mm: 12 mm; Ø 100 mm: 20 mm; Ø 150 mm: 25 mm (EN ISO 14713-2)', p:'Kapalı hacimdeki hava ve nem 450 °C’de genleşir; delik yoksa parça patlar.', tip:'Delikler parça asılı konumdayken en üst ve en alt noktada, çapraz köşelerde olmalıdır.' },
  millscale:{ tr:'Hadde tufalı', en:'Mill scale', p:'FeO/Fe₃O₄/Fe₂O₃ katmanlı oksit. Asitte çözünmesi pasa göre yavaştır.', tip:'Kalın tufalı malzemede asit süresini Fe seviyesine göre uzatın.' },
  laser:{ tr:'Lazer kesim oksidi', en:'Laser-cut oxide', p:'Oksijenle lazer kesimde kenarda ince, sert ve asitte çok yavaş çözünen oksit oluşur.', tip:'Kesim kenarlarını taşlayın veya kumlayın.' },
  paint:{ tr:'Boya kalıntısı', en:'Paint / marker', p:'Organik kaplamalar asitte çözünmez; kumlama veya solvent ile alınmalıdır.', tip:'Müşteriye suda çözünür marker kullanmasını şartnameye yazdırın.' },
  slag:{ tr:'Kaynak cürufu', en:'Weld slag', p:'Silikat esaslı cüruf asitte çözünmez; çıplak bölge bırakır.', tip:'Gaz altı kaynak (MAG) ve tel fırça/kumlama tercih edin.' },
  blasting:{ tr:'Kumlama / bilyalı temizleme', en:'Abrasive / shot blasting', p:'Mekanik olarak oksit, boya ve cürufu kaldırır; yüzey pürüzlülüğünü artırır (daha kalın kaplama).', tip:'Kumlanmış yüzeyde Fe-Zn reaksiyonu hızlanır, kaplama ~%20 kalınlaşır.' },
  jig:{ tr:'Askılama', en:'Jigging & rigging', p:'Siyah tavlı tel, kanca veya özel aparat ile parça 10–15° eğimle asılır; hava cebi kalmamalı.', tip:'Askı teli temas noktasında iz bırakır; kritik yüzeylerden uzak tutun.' },
  drainAngle:{ tr:'Drenaj açısı', en:'Drainage angle', p:'Çinkonun süzülmesi ve flux gazının çıkışı için parça eğik asılır.', tip:'< 10° ise çinko göllenir ve sarkıt (icicle) oluşur.' },
  kettleChem:{ tr:'Banyo kimyası', en:'Bath chemistry', p:'Ni %0,04–0,06 Sandelin’i dizginler; Al %0,002–0,005 parlaklık ve az kül; Bi %0,05–0,10 akışkanlık.', tip:'Al > %0,007 flux ile reaksiyona girer (AlCl₃) ve çıplak bölge yapar.' },
  nickel:{ tr:'Nikel', en:'Nickel (Ni)', f:'Hedef %0,04 – %0,06', p:'Ni, ζ fazının kolonlu büyümesini bastırır; Sandelin pik çeliklerinde kaplama kalınlığını normale çeker.', tip:'Ni dross ile birlikte tükenir; günlük OES ile takip edin.' },
  aluminium:{ tr:'Alüminyum', en:'Aluminium (Al)', f:'Hedef %0,002 – %0,005', p:'Yüzeyde ince Al₂O₃ film oluşturur, oksidasyonu ve külü azaltır, parlak görünüm verir.', tip:'Yüzeyde yanarak hızla tükenir; küçük ve sık dozlayın.' },
  bismuth:{ tr:'Bizmut', en:'Bismuth (Bi)', f:'Hedef %0,05 – %0,10', p:'Yüzey gerilimini düşürür, süzülmeyi iyileştirir, çinko sarfiyatını azaltır.', tip:'Kurşunun (Pb) çevre dostu alternatifidir.' },
  dwell:{ tr:'Bekleme süresi', en:'Immersion (dwell) time', p:'Parça banyo sıcaklığına ulaşana kadar (kaynama durana kadar) bekletilir.', tip:'Kalın parçalar ince parçalardan daha uzun süre ister.' },
  withdrawal:{ tr:'Çekme hızı', en:'Withdrawal speed', p:'Yavaş çekmede (1,5–2,5 m/dk) serbest çinko (η) süzülür; hızlı çekmede akıntı ve kalın kaplama oluşur.', tip:'Çok yavaş çekme kalın parçada alaşım büyümesini sürdürür.' },
  skimming:{ tr:'Kül sıyırma', en:'Skimming', p:'Banyo yüzeyindeki ZnO ve flux kalıntısı (zinc ash) daldırma öncesi ve çekme öncesi sıyrılır.', tip:'Sıyırmadan çekilen parçaya kül yapışır.' },
  dross:{ tr:'Dip dross (sert çinko)', en:'Bottom dross / hard zinc', f:'FeZn₁₃ (ζ) kristalleri, ~%5–6 Fe, ~%94 Zn', p:'Banyoya giren demir (flux Fe, parça çözünmesi, kazan duvarı) çinko ile intermetalik oluşturur ve dibe çöker.', tip:'1 kg demir ≈ 20–25 kg dross demektir; flux Fe kontrolü en ucuz dross önlemidir.' },
  ash:{ tr:'Çinko külü', en:'Zinc ash', p:'ZnO, ZnCl₂ ve metalik çinko karışımı; yüzeyde oluşur. Geri kazanım firmalarına satılır.', tip:'Sıcaklık ve aşırı flux kül oluşumunu artırır.' },
  iso1461:{ tr:'ISO 1461', en:'EN ISO 1461', p:'Sıcak daldırma galvaniz kaplamaların özellikleri ve deney yöntemleri. Çelik kalınlığına göre yerel ve ortalama minimum kalınlıklar.', tip:'Referans alanında en az 5 ölçüm alın; parça başına minimum ortalamayı kontrol edin.' },
  elcometer:{ tr:'Manyetik kalınlık ölçer', en:'Magnetic induction gauge', p:'Ferromanyetik altlık üzerindeki manyetik olmayan kaplamanın kalınlığını ölçer (ISO 2178).', tip:'Kenarlardan en az 10 mm içeride ölçün.' },
  metallography:{ tr:'Metalografi', en:'Metallographic cross-section', p:'Kesit parlatılıp %2 nital ile dağlanır. Γ (Fe₃Zn₁₀), δ (FeZn₁₀), ζ (FeZn₁₃), η (saf Zn) katmanları görülür.', tip:'η tabakası yoksa yüzey mat gridir; bu bir kusur değil, görünüm farkıdır (ISO 1461).' },
  hammer:{ tr:'Mafsallı çekiç testi', en:'Pivoted hammer test', p:'Belirli yükseklikten bırakılan çekiçle yapışma kontrol edilir; kaplama pul pul ayrılmamalı.', tip:'250 µm üzerindeki kırılgan kaplamalar bu testte sorun çıkarır.' },
  bare:{ tr:'Çıplak bölge', en:'Bare spots', p:'Kaplamanın oluşmadığı bölge. Yüzey hazırlığı zincirindeki en zayıf halkayı gösterir.', tip:'ISO 1461: tamir edilebilir toplam alan yüzeyin %0,5’ini, tek alan 10 cm²’yi aşmamalı.' },
  whiteRust:{ tr:'Beyaz pas', en:'Wet storage stain (white rust)', f:'Zn + H₂O + O₂ → Zn(OH)₂ / ZnO (beyaz)', p:'Taze galvanizin nemli ve havasız ortamda istiflenmesiyle oluşur.', tip:'Kromatsız pasivasyon ve aralıklı istif kullanın.' },
  embrittlement:{ tr:'Hidrojen gevrekliği', en:'Hydrogen embrittlement', p:'Asitlemede açığa çıkan atomik hidrojen yüksek mukavemetli çeliğe (≥ 10.9, > 1000 MPa) difüze olur.', tip:'10.9 cıvatalarda inhibitörlü kısa asitleme veya kumlama kullanın.' },
  lme:{ tr:'LME çinko fiyatı', en:'LME zinc cash price', p:'Londra Metal Borsası nakit fiyatı + bölgesel prim + nakliye = teslim külçe maliyeti.', tip:'Sarfiyat oranı %1 düşerse 35.000 t/yıl tesiste yaklaşık 350 t çinko tasarruf edilir.' },
  pickup:{ tr:'Çinko sarfiyat oranı', en:'Zinc pick-up / consumption ratio', f:'Sarfiyat (%) = (kaplama + dross + kül + akıntı) / galvanizlenen çelik × 100', p:'İdeal %5,5 – %7,5. İnce saclarda yüzey alanı büyük olduğundan oran yükselir.', tip:'Dross ve kül sarfiyatın %25–40’ıdır; kimya kontrolü doğrudan kârdır.' },
  dfg:{ tr:'Galvanize uygun tasarım', en:'Design for galvanizing (EN ISO 14713-2)', p:'Havalandırma delikleri, bindirme kaynaklarından kaçınma, simetrik et kalınlığı, kazana sığan boyutlar.', tip:'Teklif aşamasında yapılan tasarım uyarısı, üretimdeki şikâyeti önler.' },
  overlap:{ tr:'Bindirme yüzeyleri', en:'Overlapping surfaces', p:'İki levha arasına giren asit ve flux kazanda buharlaşıp kaynak dikişinden sızar (weeping), kahverengi leke bırakır.', tip:'Bindirme alanı > 400 cm² ise havalandırma deliği veya kesintisiz kaynak gerekir.' }
};
