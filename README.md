# HDG Plant Master

Sıcak daldırma galvaniz tesisi kurma ve işletme simülatörü. Boş bir arsadan başlayıp tesisi tasarlıyor, galvaniz kazanını ilk kez ergitiyor ve laboratuvar kontrollü günlük üretim yapıyorsunuz.

*Hot-dip galvanizing plant simulator: design the plant, commission the kettle, run daily production with lab control and ISO 1461 inspection.*

## Oynamak

Derleme veya kurulum gerekmez. `index.html` dosyasını tarayıcıda açın.

Yerel sunucuyla çalıştırmak isterseniz:

```bash
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini açın.

## Modlar

**Kolay mod (animasyonlu):** Varsayılan mod.
- Görev haritası: 7 görev, her biri kısa bir görsel dersle başlar ve 1–3 yıldızla puanlanır.
- Görsel dersler: katman büyümesi, katodik koruma, kuru duvar, ön işlem zinciri, Sandelin etkisi, demir → dross zinciri, çinko dağılımı. Çoğu etkileşimlidir.
- Dört seçimle tesisi kurarsınız: kapasite, tesis tipi, yerleşim şekli, donanım seviyesi.
- Kazanı animasyonlu kesit üzerinde ergitirsiniz. İsterseniz otomatik operatör sizin yerinize yapar.
- Üretim hattını izlersiniz. Banyolar renkli göstergelerle görünür, düzeltmek tek tık.

**Uzman mod:** Tam kontrol.
- Bütün EPC ekipman seçimleri ve sürükle-bırak yerleşim planı editörü (I / L / U veya serbest düzen).
- Laboratuvar titrasyonları, Baumé ve OES analizleri.
- ISO 1461 muayenesi ve kusurlar için kök neden analizi (CAPA).
- LME çinko piyasası ve kâr/zarar.
- 38 adımlı rehber.

**Tesis tipleri:**
- **Manuel:** Askıyı her banyodan siz çıkarırsınız.
- **Yarı otomatik:** Vinç askıyı kendisi taşır, kazandan çekmeyi siz yaparsınız.
- **Tam otomatik:** PLC her şeyi reçeteye göre yapar.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Sayfa iskeleti ve stiller |
| `data.js` | Kapasiteler, EPC seçenekleri, ürünler, ISO 1461 tablosu, ansiklopedi |
| `engine.js` | Simülasyon: ısıl ergitme modeli, banyo kimyası, kaplama kalınlığı, kusurlar, ekonomi |
| `layout.js` | Yerleşim planı: şablonlar, mesafe kuralları, editör |
| `tutorial.js` | Uzman mod rehberi ve mentör notları |
| `anim.js` | Canvas animasyonları (üretim hattı, kazan kesiti) |
| `simple.js` | Kolay mod ekranları |
| `lessons.js` | Animasyonlu görsel dersler (canvas) |
| `missions.js` | Görev haritası, hedefler ve yıldızlar |
| `ui.js` | Uzman mod ekranları, izometrik görünüm, olay yönetimi |

Oyun ilerlemesi tarayıcının `localStorage` alanına otomatik kaydedilir.
