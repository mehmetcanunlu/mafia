# Mafia — Türk Mafya Strateji Oyunu: Proje Planı & Durum

## Genel Bakış

**Tür:** Tur tabanlı strateji, Türk mafya temalı  
**Mimari:** Vanilla JavaScript ES modülleri (bundler yok)  
**Giriş noktası:** `public/index.html` → `src/main.js`  
**Harita:** Grid (4×4 / 5×5) veya İstanbul SVG haritası  
**Dil:** Türkçe (kod değişken isimleri dahil)

---

## Dosya Haritası

```
mafia/
├── public/
│   └── index.html          — Tek HTML sayfası; tüm CSS burada
└── src/
    ├── main.js             — Oyun döngüsü, turIsle(), harita click, modal bootstrap
    ├── state.js            — `oyun` global nesnesi, bolgeById(), yiginaEkle() vb.
    ├── config.js           — ZORLUK, AYAR, MEKANIK, BOLGE_OZELLIKLERI, LIDERLER, sabitler
    ├── ui.js               — durumCiz, haritaCiz, haritaGuncel, detayCiz, islemlerCiz, bitisBanner
    ├── actions.js          — Tüm oyuncu aksiyonları (async, Promise-modal kullanır)
    ├── ai.js               — aiGelisimVeUretim(), aiSaldiriHareket()
    ├── combat.js           — savasKazanmaIhtimali(), neutralSavunma(), saldiriMaliyeti()
    ├── map.js              — kisaRota(), enYakinGuvenli(), komsuMu()
    ├── events.js           — olayTick(), krizCarpani() — rastgele olay sistemi
    ├── missions.js         — gorevKontrol(), gorevOlustur() — görev sistemi
    ├── modal.js            — showAlert/showConfirm/showPrompt (Promise tabanlı), showToast()
    ├── save.js             — oyunKaydet/Yukle/tumKayitlar/kayitSil/otomatikKaydet (localStorage)
    ├── audio.js            — sesCal(), muzikBaslat/Durdur() — Web Audio API sentezleme
    ├── stats.js            — istatistikKaydet(), istatistikGrafik(), istatistikSifirla()
    ├── animations.js       — savasAnimasyonu(), elDegistirmeFlash(), konvoyBaslaAnimasyonu()
    ├── istanbul.js         — ISTANBUL_ILCELER, BOGAZ_PATH, KOPRULER (SVG harita verisi)
    ├── units.js            — BIRIM_TIPLERI, egitimTick(), motorluHizTick(), grupEfektifSavunma()
    ├── spy.js              — kesifYap(), suikastYap(), liderDevreDisiMi(), kesifAktifMi()
    ├── loyalty.js          — sadakatTick(), fetihSonrasiSadakat(), sadakatRenk/Etiket()
    ├── research.js         — arastirmaTick(), arastirmaEfekt(), arastirmaDalDegistir()
    └── utils.js            — rastgeleIsim() vb. yardımcılar
```

---

## Tamamlanan Fazlar

### Faz 1 — Temel Oyun Mekaniği ✅
- 4×4 grid harita, 3 AI fraksiyonu, tarafsız bölgeler
- Tur sistemi (`turIsle()`), para + adam üretimi
- Saldırı / rüşvet / garnizon mekanikleri
- Temel AI (saldırı kararı, üretim)

### Faz 2 — Genişletilmiş Sistemler ✅
- Diplomasi (ateşkes, ittifak, ticaret)
- Görev sistemi (fetih, savunma, para görevleri)
- Olaylar (polis baskını, iç isyan vb.)
- Liderler (her fraksiyona rastgele lider, bonus)
- İstatistik grafik paneli
- Animasyonlar (savaş, el değiştirme, konvoy)
- Harita boyutu seçimi (4×4 / 5×5)
- Zorluk seçimi (kolay / orta / zor)

### Faz 3 — UI/UX Modernizasyonu ✅
- `modal.js` — native alert/confirm/prompt tamamen kaldırıldı, glassmorphism modal
- `showToast()` — sağ üstte 6 tipli toast bildirimleri (bilgi/basari/uyari/hata/diplo/gorev)
- Oyun sonu ekranı (`#bitis-overlay`) — tam ekran, emoji, istatistik kartları
- Glassmorphism `.panel` stili
- Responsive tasarım (`@media 768px`, `@media 1024px`)

### Faz 4 — Altyapı ✅
- `save.js` — 3 slotlu kayıt/yükleme (localStorage, versiyon 4)
- `audio.js` — Web Audio API ile saf osilatör sentezi (harici dosya yok)
  - Sesler: savas, fetih, yenilgi, rusvet, diplo, yatirim, olay, kayip-bolge, kaydet
  - Arka plan müziği (toggle)
- Üst barda 🔊/🎵/💾 butonları (`ensureGameControls()`)
- `bolgeById()` Map cache — O(1) bölge araması
- İstanbul SVG haritası (küçük/büyük, ilçe polygonları, köprüler, boğaz)

### Faz 5 — Türk Mafya Bağlamı ✅
- **`units.js`** — Birim Tipleri Sistemi
  - `tetikci` (🔫 70₺, saldiri:1.0, savunma:1.0)
  - `motorlu` (🏍️ 180₺, saldiri:0.9, savunma:0.6, hız:2x, suikast+keşif)
  - `genc` (👦 35₺, saldiri:0.4, savunma:0.5, 8 turda `agir_silahli`'ya dönüşür)
  - `agir_silahli` (💪 satın alınamaz, saldiri:1.9, savunma:1.3)
  - `egitimTick()` — gençlerin eğitim sayacını düşürür, biter → ağır silahlı
  - `motorluHizTick()` — motorlu birimler her tur 2 adım atar

- **`spy.js`** — Casusluk Sistemi
  - `kesifYap(bolgeId)` — 100₺ + 1 motorlu, %75+ başarı, 6 tur keşif aktif
  - `suikastYap(bolgeId)` — 300₺ + 2 motorlu, ~%50 başarı, lider 8 tur devre dışı
  - `liderDevreDisiMi(owner)` — main.js'de lider bonus kontrolü
  - `kesifAktifMi(bolgeId)` — UI'da keşif gösterimi

- **`loyalty.js`** — Sadakat Sistemi
  - Her bölgede `b.sadakat` (0–100), başlangıç 55
  - Güvenlik yatırımı + gelir yatırımı sadakati artırır
  - Düşman konvoyu geliyorsa −6, fetih sonrası −30 (travma)
  - Sadakat < 12 ise %12 ihtimalle isyan → bölge tarafsız olur
  - `fetihSonrasiSadakat()` bölge fethedilince çağrılır

- **`research.js`** — Araştırma Ağacı
  - 3 dal: `org` (⚔️ Örgütlenme), `ekonomi` (💰), `istihbarat` (🕵️)
  - Her dalda 3 seviye (60 / 140 / 280 puan)
  - Üniversite bölgesi: +2 puan/tur bonus
  - `arastirmaEfekt(kategori)` — kombat, gelir, casusluk bonusları için

- **`config.js`** — Yeni Bölge Özellikleri
  - `liman` ⚓ gelir +%40
  - `fabrika` 🏭 üretim +%30
  - `hastane` 🏥 regen +%100
  - `kale` 🏰 savunma +2
  - `gecekondu` 🏘️ üretim +%50, genç üretir
  - `kumarhane` 🎰 gelir +%70, riskli (polis baskını 2×)
  - `depo` 📦 savunma +1.5
  - `carsi` 🛒 gelir +%25
  - `universite` 🎓 araştırma +2/tur

- **`actions.js`** — Yeni Aksiyonlar
  - `birimSatinAl(tip)` — seçili bölgeye birim satın al
  - `casuslukOperasyon(hedefId, 'kesif'|'suikast')` — casusluk başlat

- **`ui.js`** — Yeni Paneller
  - `detayCiz()`: sadakat barı (renk kodlu) + keşif aktif notu
  - `islemlerCiz()`: Birlik Satın Al paneli (kendi bölgede), Casusluk paneli (düşman bölgede), Araştırma paneli (her zaman)

- **`state.js`** — Yeni State Alanları
  ```js
  oyun.arastirma = { aktifDal: "org", org: {seviye, puan}, ekonomi: {...}, istihbarat: {...} }
  oyun.birimler[i] = { id, owner, adet, tip, konumId, hedefId, rota, durum, egitimKalan? }
  oyun.bolgeler[i].sadakat   // 0–100
  oyun.fraksiyon[id]._liderDevreDisi  // tur sayısı (suikast)
  oyun.bolgeler[i]._kesif    // { bitis: tur }
  oyun.fraksiyon[id]._ofke   // suikast başarısızsa +20
  ```

---

## Temel Oyun Döngüsü (`main.js` — `turIsle()`)

Her tur sırasıyla:
1. `aiGelisimVeUretim(ai1/ai2/ai3)` — AI para + adam üretimi
2. `hareketTick()` — konvoylar ilerler, savaşlar çözülür
3. `egitimTick()` — gençlerin eğitim sayacı
4. `sadakatTick()` — sadakat güncelle, isyan kontrolü
5. `arastirmaTick()` — araştırma puanı kazan, seviye atla
6. `motorluHizTick()` — motorlu birimler ekstra adım atar
7. `aiSaldiriHareket()` — AI saldırı kararları
8. `olayTick()` — rastgele olay sistemi
9. `diplomasiTick()` — süresi dolan anlaşmaları temizle
10. `gorevKontrol()` — görev durumu kontrol
11. `yarali/garnizon` döngüleri
12. `otomatikKaydet()` — her 10 turda otomatik kayıt
13. `bitisBanner()` — kazanma/kaybetme kontrolü

---

## Önemli Desenler & Kurallar

### State Yönetimi
- `oyun` nesnesi `state.js`'den export edilir, tüm modüller import eder
- `bolgeById(id)` — Map cache, O(1); bölge eklenince `bolgeMapTemizle()` çağır
- Birimler `oyun.birimler[]` dizisinde; `_sil: true` ile işaretle, tur sonunda temizlenir

### Modal Sistemi
- Tüm `alert/confirm/prompt` yasaklı; `showAlert/showConfirm/showPrompt` (Promise) kullan
- `actions.js`'teki tüm fonksiyonlar `async`; await ile modal bekler

### Combat (Savaş)
- Saldıran güç: `k.adet × BIRIM_TIPLERI[k.tip].saldiri × (1 + liderBonus + arastirmaEfekt)`
- Savunan güç: `grupEfektifSavunma(savunanBirimler)` + güvenlik çarpanı + bölge bonusu
- Lider devre dışıysa (`liderDevreDisiMi`): lider bonusu sıfır

### Birim Tipleri
- `oyun.birimler[i].tip` alanı belirler
- Tanımsız `tip` → `tetikci` olarak varsayılan
- Satın alınan `genc` tipi `egitimKalan = 8` ile başlar, `egitimTick()`'te sayılır

### Encoding Uyarısı
- `ui.js` kaynak dosyasında bazı template literal string içindeki HTML attribute quote'ları Unicode curly quote (U+201C/201D) içeriyor — bunlar HTML string içinde zararsız
- JavaScript kod satırlarındaki `=== "biz"` karşılaştırmalarında ASCII straight quote kullanılmalı

---

## Faz Durumu — Guncel

### Faz 6 — Cekirdek Oynanis Yeniden Kurulumu

Bu faz artik mevcut sistemi sadece buyutmek degil, oyunun orta katmanini yeniden kurmak olarak ele alinacak. Ana hedef: diplomasiyi cikarmak, bina sistemini kurmak, olay sistemini buyutmek ve ekonomi-bolge gelisimini bu yeni eksende toplamak.

#### Paket 6.1 — Altyapi ve Temizlik
- [x] **Eski diplomasi sisteminin kaldirilmasi** — Ateskes / ittifak / ticaret akislari ve bunlara bagli UI temizlendi; oyun catisma-ekonomi eksenine tasindi
- [x] **Diplomasi kodunun sokulmesi** — `diplomacy.js` bagimliliklari kaldirildi/sadelestirildi
- [x] **Eski rastgele olay sisteminin devreden cikarilmasi** — Olay seti yeni agirlikli havuz yapisina tasindi
- [x] **State + kayit entegrasyonu** — `bolge.binalar/binaLimit` ve save normalize akisi eklendi

#### Paket 6.2 — Bina Sistemi
- [x] **Bolgelere bina ekleme sistemi** — Kontrol edilen bolgelere bina kurma ve bonus etkileri aktif
- [x] **Bina yukseltme sistemi** — Binalar seviye atlayabiliyor; maliyet ve etki kademeli
- [x] **Bina yonetimi UI/aksiyonlari** — `actions.js` ve `ui.js` panel/buton baglantilari eklendi
- [x] **Bolge gelisimi dengesi** — Bina slotu (`binaLimit`) ve bolge bazli yapilasma kurallari aktif

#### Paket 6.3 — Yeni Olay Sistemi
- [x] **Rastgele olay sisteminin bastan kurulmasi** — Olaylar yeni havuzdan seciliyor
- [x] **Yeni olay havuzu tasarimi** — Pozitif/negatif/notr coklu olay seti eklendi
- [x] **Olay agirlik sistemi** — Olasiliklar bolge/bina/sadakat/arastirma etkileriyle agirlikli
- [x] **Bolge ve bina bagli olaylar** — Kurulu binalar ve bolge ozellikleri olay secimine dogrudan etki ediyor

#### Paket 6.4 — Denge ve Entegrasyon
- [x] **Gecekondu otomatik genc uretimi** — Gecekondu bolgeleri periyodik genc birimi uretiyor
- [x] **Kumarhane polis baskini** — Riskli bolgelerde baskin agirligi artirildi
- [x] **Silah Deposu savunma bonusu** — `depo` savunma bonusu combat hesabinda
- [x] **Arastirma efektlerinin tam entegrasyonu**
  - `gelirBonus` → `turIsle()`'deki gelir hesabina ekle
  - `pasifGelir` → her tur `oyun.fraksiyon.biz.para += 30`
  - `geceEkonomiBonus` → kumarhane/carsi geliri carpani
  - `kesifBonus` → `spy.js`'te `basariSansi`'na ekle
  - `garnizonBonus` → garnizon kapasitesi limiti
  - `tetikciMaliyetIndirim` → `birimSatinAl()` icinde uygula
- [x] **Yarali iyilesme sistemi** — Yaralilar turla iyilesip dost bolgeye geri donuyor
- [ ] **Esir serbest birakma/takas** — Kismi: fidye akisi var, takas/serbest birakma akisi acik

#### Faz 6 Icin Onerilen Uygulama Sirasi
1. Eski diplomasiyi sok
2. State/save yapisini bina sistemine hazirla
3. Bina kurma ve yukseltme sistemini ekle
4. Yeni olay sistemini kur
5. Denge ve entegrasyon islerini tamamla

### Faz 7 — AI İyileştirmeleri
- [x] **AI birim tipi kullanımı** — AI artık duruma göre `tetikci`, `motorlu`, `genc` üretir; `genc` eğitimle `agir_silahli` hattına girer
- [x] **AI casusluk** — AI oyuncuya karşı keşif ve suikast girişimleri yapabilir
- [x] **AI sadakat yönetimi** — AI düşük sadakatlı bölgelerine gelir/güvenlik yatırımı yapar
- [x] **AI araştırma** — AI kendi araştırma puanını biriktirir, dal değiştirir ve efekt kazanır
- [x] **AI bina yönetimi** — AI bölge durumuna göre bina kurar ve mevcut binaları yükseltir
- [x] **AI gelişmiş hedef seçimi** — AI saldırı skorunda özel bölge, sınır baskısı ve düşük sadakat fırsatlarını hesaba katar

### Faz 8 — Görsel & Ses Geliştirme
- [x] **Birim ikonları harita üzerinde** — Bölge kartları, detay paneli ve İstanbul etiketleri artık `tip` bazlı ikon özetlerini gösteriyor
- [x] **Araştırma ağacı tam UI** — Araştırma paneli dal bazlı ağaç/kart görünümüne geçirildi; kilitli/açık/hedef seviyeler görselleştirildi
- [x] **Ses: yeni tipler** — `suikast`, `kesif`, `isyan`, `arastirma-seviye` sesleri eklendi ve ilgili akışlara bağlandı
- [x] **Animasyon: konvoy tipi göster** — Konvoy badge'leri tip ikonlarını gösteriyor; çıkış animasyonu oyuncu ve AI hareketlerine bağlandı

### Faz 9 — Denge & Kalite
- [x] **Birim bakım maliyeti tip bazlı** — Bakım gideri artık `units.js` üstünden tip bazlı hesaplanıyor; oyuncu ve AI ekonomisine uygulanıyor
- [x] **Kayıt versiyonu uyumsuzluğu** — `save.js` versiyon 4'e çıkarıldı; eksik `tip`, `sadakat`, `binalar`, `arastirma` ve benzeri alanlar yükleme sırasında normalize ediliyor
- [x] **Yeni oyun başlatınca birim tipleri** — Başlangıç birlikleri için varsayılan `tetikci` tipi veri ve dönüşüm akışında garanti altına alındı
- [x] **İstanbul haritasında özellik ikonları** — SVG haritada bölge özellik ikonları ayrı katman olarak gösteriliyor

---

## Kritik Bağlantılar (Cross-reference)

| Özellik | Nerede tanımlandı | Nerede kullanılıyor |
|---|---|---|
| `oyun.birimler[].tip` | `units.js / BIRIM_TIPLERI` | `main.js` (combat), `ui.js` (panel), `spy.js` |
| `oyun.bolgeler[].sadakat` | `loyalty.js` | `ui.js` (detay), `loyalty.js` (tick) |
| `oyun.arastirma` | `state.js / research.js` | `main.js` (tick), `ui.js` (panel), `spy.js` (bonus) |
| `fetihSonrasiSadakat()` | `loyalty.js` | `main.js` (hareketTick, fetih anı) |
| `liderDevreDisiMi()` | `spy.js` | `main.js` (liderBonus hesabı) |
| `arastirmaEfekt("saldiriBonus")` | `research.js` | `main.js` (combat) |
| `callbacklar` | `actions.js` | `ui.js` (tüm buton bind'ları) |
| `showToast()` | `modal.js` | Her modül |

---

## Yön Değişikliği Notu

- Diplomasi (ittifak, ateskes, ticaret) sistemi cekirdekten cikarildi; oyun dogrudan catisma-ekonomi hattina alindi
- Rastgele olaylar agirlikli yeni olay havuzuna tasindi
- Bolge gelisimi bina kurma/yukseltme sistemiyle oyuncu kontrolune acildi

---

## Kod Eklerken Dikkat Edilecekler

1. **Yeni aksiyon eklerken:** `actions.js`'e `async` fonksiyon yaz → `callbacklar` nesnesine ekle → `ui.js`'te butonu bağla
2. **Yeni tur efekti eklerken:** `main.js`'te `turIsle()` içinde `hareketTick()` sonrasına ekle
3. **State değişikliği:** `oyun.bolgeler` uzunluğu değişirse `bolgeMapTemizle()` çağır
4. **Modal:** `await showAlert/showConfirm/showPrompt` kullan, native dialog kullanma
5. **Birim silme:** `birim._sil = true` işaretle, tur sonu otomatik temizlenir (main.js)
6. **Test:** `node --check src/dosyaadi.js` ile syntax kontrolü yapılabilir

---

## Oyun Başlangıç Parametreleri

```
Başlangıç durumu (orta zorluk, 4×4 grid):
  Fraksiyon biz: havuz:20, para:600
  Fraksiyon ai1/ai2/ai3: havuz:24-28, para:650
  Bölge sayısı: 16
  Başlangıç bölgeleri: biz=merkez, ai1=sol üst, ai2=sağ alt, ai3=sağ üst
  Tüm bölge sadakati: 55
  Araştırma: tüm dallar seviye 0
```
