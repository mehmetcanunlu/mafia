# Mafia — Türk Mafya Strateji Oyunu: Proje Planı & Durum

> **Son kod senkronu:** 2026-08-28 — Bu doküman `src/` içeriğiyle satır satır karşılaştırılarak
> güncellendi. Eski sürümdeki "diplomasi çekirdekten çıkarıldı" iddiası, v4 kayıt sürümü,
> `motorlu` birim tipi ve 3 dallı araştırma tarifi gerçeği yansıtmıyordu; düzeltildi.

## Genel Bakış

**Tür:** Tur tabanlı strateji, Türk mafya temalı  
**Mimari:** Vanilla JavaScript ES modülleri (bundler yok)  
**Giriş noktası:** `public/index.html` → `src/main.js`  
**Harita:** İstanbul SVG haritası (varsayılan ve tek aktif mod; eski 4×4/5×5 grid renderer kodda duruyor ama başlangıç akışı `istanbul-buyuk`'a sabit)  
**Dil:** Türkçe (kod değişken isimleri dahil)

---

## Dosya Haritası

```
mafia/
├── public/
│   └── index.html          — Tek HTML sayfası; tüm CSS burada
├── data/
│   └── istanbul-ilceler.geojson — İlçe geometrisi ham verisi
├── scripts/
│   ├── tutorial/           — Oyun içi tutorial (DİKKAT: src/main.js buradan import eder,
│   │                         yani runtime bağımlılığıdır, build aracı değildir)
│   ├── sim-test.mjs        — Headless ekonomi simülasyonu (assert'süz; gerçek test değil)
│   ├── build-leader-pool.mjs      — Lider havuzu üretim scripti
│   └── build-istanbul-geometry.mjs — GeoJSON → SVG path dönüştürücü
└── src/
    ├── main.js             — Oyun döngüsü, turIsle(), hareketTick(), savaş çözümü, modal bootstrap
    ├── state.js            — `oyun` global nesnesi, bolgeById(), yiginaEkle(), yeniOyun()
    ├── config.js           — ZORLUK, AYAR, MEKANIK, BOLGE_OZELLIKLERI, BINA_TIPLERI, EKONOMI_DENGE
    ├── ui.js               — durumCiz, haritaCiz, istanbulSvg*, harita modları, konvoy okları,
    │                         sürükle-bırak birlik hareketi, detayCiz, islemlerCiz, bitisBanner
    ├── actions.js          — Tüm oyuncu aksiyonları (async, Promise-modal), callbacklar nesnesi
    ├── ai.js               — aiGelisimVeUretim(), aiSaldiriHareket(), aiCasuslukYap(), aiArastirmaTick()
    ├── diplomasi.js        — EN BÜYÜK MODÜL (~3000 satır): savaş/barış, ittifak, ticaret, tehdit,
    │                         sabotaj, rüşvet, koalisyon, itibar, ilişki tarihçesi, diplomasiTick()
    ├── combat.js           — savasKazanmaIhtimali(), saldiriMaliyeti()
    ├── map.js              — kisaRota(), komsuMu()
    ├── logistics.js        — Fraksiyon bazlı taşıt havuzu (🚗/🏍️), kapasite/ayırma/iade
    ├── units.js            — BIRIM_TIPLERI, TASIT_TIPLERI, egitimTick(), terfi zinciri
    ├── events.js           — olayTick(), krizCarpani() — ağırlıklı olay havuzu
    ├── missions.js         — gorevKontrol(), gorevOlustur()
    ├── modal.js            — showAlert/showConfirm/showPrompt/showRangePrompt (Promise), showToast()
    ├── save.js             — 3 slotlu localStorage kayıt (VERIYON=8), oyunDurumuNormallestir()
    ├── audio.js            — Web Audio API sentezleme
    ├── stats.js            — istatistikKaydet(), istatistikGrafik(), istatistikSifirla()
    ├── animations.js       — savasAnimasyonu(), elDegistirmeFlash(), konvoyBaslaAnimasyonu()
    ├── istanbul.js         — ISTANBUL_ILCELER, KOPRULER, başlangıç ataması
    ├── istanbul-geometry.js— Geometri doğrulama/yardımcıları
    ├── spy.js              — kesifYap(), suikastYap(), dinamik maliyetler, liderDevreDisiMi()
    ├── loyalty.js          — sadakatTick(), fetihSonrasiSadakat(), sadakatRenk/Etiket()
    ├── research.js         — ARASTIRMA_DALLARI (7 dal × 8 seviye), arastirmaTick(), arastirmaEfekt()
    ├── gucDengesi.js       — gucSiralamasiHesapla() — güç sıralaması paneli
    ├── liderHavuzu.js      — ~2600 satır statik lider verisi + havuzdan lider seçimi
    └── utils.js            — rastgeleIsim(), htmlKacir(), adTemizle()
```

---

## Güncel Sistemlerin Özeti (kodla doğrulanmış)

### Birim Tipleri (`units.js`)
- `tetikci` 🔫 70₺ — temel birim; 14 turda `uzman`a terfi eder
- `genc` 🧒 35₺ — 8 turda `tetikci`ye dönüşür
- `uzman` 🎯 — satın alınamaz; 18 turda `agir_silahli`ya terfi eder
- `agir_silahli` 💪 — hiyerarşinin tepesi, satın alınamaz
- **`motorlu` birimi YOK.** Eski plandaki bu tip ve no-op `motorluHizTick()`
  tamamen kaldırıldı.
- Taşıtlar birim değildir: `TASIT_TIPLERI` — `motor` 🏍️ 110₺ (kapasite 2),
  `araba` 🚗 240₺ (kapasite 4). Taşıtlar **fraksiyon havuzunda** tutulur
  (`fraksiyon[owner].tasit`), bölgeye bağlı değildir (`logistics.js`).

### Casusluk (`spy.js`)
- Maliyetler dinamiktir: keşif taban 100₺, suikast taban 300₺;
  `operasyonMaliyetIndirim` araştırması ile düşer. Operasyonlar ekip + taşıt
  kapasitesi ayırır (`bolgeTasitAyir`), sabit "motorlu birim" maliyeti yoktur.
- Suikast sonuçları: komuta darbesi, bölge kaybı veya çete çöküşü
  (`suikastKomutaDarbeUygula`, `suikastBolgeKaybiUygula`, `suikastCeteCokusUygula`).

### Araştırma (`research.js`)
- **7 dal × 8 seviye** (eski plandaki 3 dal × 3 seviye tarifi geçersiz):
  `org` (Komuta ve Personel), `taktik` (Savaş Doktrini), `lojistik`, `ekonomi`,
  `finans`, `istihbarat`, `propaganda`
- Seviye maliyetleri dal başına ~220 puandan ~11.000+ puana tırmanır
- ~28 farklı efekt anahtarı (`ui.js` içindeki `ARASTIRMA_EFEKT_BILGI` tablosu günceldir)

### Diplomasi (`diplomasi.js`)
- **Çekirdek sistemdir ve aktiftir** (eski plandaki "kaldırıldı" notu tarihsel bir
  yanlıştı — sistem geri getirilip genişletildi). Kapsam: savaş ilanı, barış,
  ateşkes, ittifak, ittifak müdahale kuyruğu, ticaret, tehdit, sabotaj, rüşvet,
  istihbarat paylaşımı, koalisyon teklifleri, itibar ve ilişki tarihçesi.
- `ai.js`, `actions.js`, `ui.js`, `main.js` tarafından import edilir.

### Harita ve Hareket (`ui.js` + `actions.js`)
- 4 harita modu: `1` Siyasi, `2` Askeri, `3` Ekonomik, `4` Lojistik
  (lojistik ısı kriteri: bölgedeki konvoy taşıt kapasitesi)
- SVG konvoy okları: aktif bacak owner renginde animasyonlu kavisli ok,
  kalan rota soluk kesikli çizgi, bekleyen konvoy ⏸
- Sürükle-bırak birlik hareketi: kendi bölgenden sürükle → geçerli hedefler
  vurgulanır → bırakınca slider dialog (dost: transfer, düşman: saldırı);
  Shift+sürükle her zaman pan
- Toplanma noktası sistemi: owner başına **çoklu** toplanma bölgesi
  (`oyun.toplantiNoktasi`), çağır/gönder/sıfırla aksiyonları
- Esirler: fidye, 1'e 1 takas ve serbest bırakma (ilişki bonusu) akışları

### Asayiş (`actions.js` + `main.js`)
- `oyun.asayis = { sucluluk, polisBaski, sonBaskinTur }`
- Suçluluk 12+ iken tur başına baskın riski; baskında para cezası + taşıt el koyma
- HUD: üst barda "Suç" ve "Polis" göstergeleri, risk eşiklerinde renklenir

---

## Temel Oyun Döngüsü (`main.js` — `turIsle()` gerçek sırası)

1. `oyun.tur++`, `ownerEliminasyonTick()`
2. `kazananVarMi()` — oyun bittiyse banner + **return** (sonrası çalışmaz)
3. `oyuncuUretimTick()` — oyuncu para/adam üretimi
4. `aiGelisimVeUretim(owner)` — aktif AI'lar için
5. `oyuncuBakimTick()`, `ekonomiKpiTick()`
6. `aiArastirmaTick(owner)`
7. `aiSaldiriHareket(owner)`, `aiKoordineliSaldiriDegerlendirYap(owner)`
8. `aiCasuslukYap(owner)`
9. `diplomasiTick()` — mesajlar/popuplar, ardından `ittifakMudahaleTick()`, `ittifakBozulduKontrol()`
10. `olayTick()` — rastgele olaylar
11. `asayisTick()` — suçluluk/polis baskını
12. `yaraliTick()` — yaralı iyileşme
13. `gorevKontrol()`
14. `egitimTick()`, `gecekonduTick()`, `sadakatTick()`, `arastirmaTick(labBonus)`
15. `istatistikKaydet()`
16. `operasyonTick()`, `hareketTick()` — birlik varışı ve savaş çözümü
17. `ownerEliminasyonTick()`
18. `otomatikKaydet()` — her 10 turda slot 0'a (tur tamamen işlendikten SONRA)
19. `uiGuncel()`, `istatistikGrafik()`

---

## Önemli Desenler & Kurallar

### State Yönetimi
- `oyun` nesnesi `state.js`'den export edilir, tüm modüller import eder
- `bolgeById(id)` — Map cache, O(1); `oyun.bolgeler` dizisi değiştirilirse `bolgeMapTemizle()` çağır
- Birimler `oyun.birimler[]` dizisinde; `_sil: true` ile işaretle, tur sonunda temizlenir
- `bolge.garnizon` alanı **ölüdür**: oyun başında/kayıt yüklerken stack'lere
  dönüştürülüp silinir; savunma her zaman `oyun.birimler`'den okunur

### Modal Sistemi
- Tüm `alert/confirm/prompt` yasaklı; `showAlert/showConfirm/showPrompt/showRangePrompt` (Promise) kullan
- `actions.js`'teki tüm fonksiyonlar `async`; await ile modal bekler

### Güvenlik
- Kullanıcı girdisi (çete adı vb.) `utils.js`'teki `adTemizle()` ile kaynağında
  temizlenir; `innerHTML`'e basılan her kullanıcı verisi için `htmlKacir()` kullan
- Kayıttan yüklenen fraksiyon adları da `save.js` normalizasyonunda temizlenir

### Combat (Savaş)
- Saldıran güç: `adet × tip.saldiri × (1 + liderBonus + arastirmaEfekt) × diploCarpan × iliskiCarpan`
- Savunan güç: `grupEfektifSavunma(savunanBirimler)` + güvenlik + bölge/bina bonusu
- Lider devre dışıysa (`liderDevreDisiMi`): lider bonusu sıfır
- Tarafsız bölgelere saldırı YOK; sadece rüşvetle alınır (`teslimAl`)

### Kayıt (`save.js`)
- `VERIYON = 8`; sürüm alanı sayısal değilse veya gelecekten ise kayıt reddedilir
- Eski kayıtlar `oyunDurumuNormallestir()` ile alan alan tamamlanır
  (garnizon→stack taşıma, `toplanma`→`toplantiNoktasi`, taşıt havuzu, asayiş vb.)
- Alanın ANLAMI değişirse normalizasyona sürüm-koşullu dönüşüm eklenmeli
  (şu an sürüm-koşullu migrasyon yok; bilinen açık borç)

---

## Faz Durumu

Faz 1–9 tamamlandı (temel mekanik, genişletilmiş sistemler, UI modernizasyonu,
altyapı, Türk mafya bağlamı, bina/olay sistemi, AI iyileştirmeleri, görsel/ses,
denge). Ayrıntılı görev dökümü için `IMPLEMENTASYON_PLANI.md`,
birlik hareketi için `BIRLIK_HAREKETLERI.md` + `BIRLIK_HAREKETI_YENİ_PLAN.md`,
diplomasi için `DIPLOMASI_SISTEMI.md`, harita için
`HARITA_MODLARI_VE_HIZLI_HAREKET.md` dosyalarına bakın.

**Ağustos 2026 oturumunda kapananlar:**
- [x] Esir serbest bırakma + 1'e 1 takas (Faz 6.4'ün son açık maddesiydi)
- [x] Lojistik harita modu (4. mod)
- [x] SVG konvoy okları
- [x] Sürükle-bırak birlik hareketi
- [x] Kritik bug düzeltmeleri: XSS kaçışlama, otokayıt sırası, zafer sonrası
      fazladan tur, istatistik geri yükleme, kayıt sürüm guard'ları,
      `spy.js` ölü garnizon yazımları

**Bilinen açık borçlar (koddan tespit):**
- [x] ~~Gelir formülü 5 kopya halinde~~ — `src/ekonomi.js` tek kaynak oldu (main/ui/stats/sim hepsi oradan);
      ekonomi/asayiş normalizer'ları ve ortalama sadakat `state.js`'te tekilleşti
- [x] ~~`sim-test.mjs` deterministik değil, assert'süz~~ — `--seed` ile deterministik,
      assert ihlalinde çıkış kodu 1, gelir hesabı artık gerçek formül
- [x] ~~Ölü kod temizliği~~ — 16 kullanılmayan fonksiyon/alan silindi (`neutralSavunma`,
      `enYakinGuvenli`, eski grid üreteci `uretKomsulukGrid`/`BASLANGIC_BOLGELER`,
      `motorluHizTick` no-op'u, `garnizonAyarla` vb.); kayıt yüklemedeki tavan-atlayan
      garnizon migrasyon kopyası da state'in kanonik fonksiyonuyla birleştirildi
- [ ] `liderHavuzu.js` statik verisinin `data/` altına JSON olarak taşınması
- [ ] index.html erişilebilirlik (aria/landmark yok) ve responsive iyileştirme
- [ ] Sürüm-koşullu kayıt migrasyonu altyapısı

---

## Yön Değişikliği Notu (güncel)

- ~~"Diplomasi çekirdekten çıkarıldı"~~ — **geçersiz**: diplomasi geri getirildi ve
  oyunun en büyük modülüne dönüştü (koalisyon, itibar, müdahale kuyruğu dahil)
- Rastgele olaylar ağırlıklı olay havuzundan seçiliyor (geçerli)
- Bölge gelişimi bina kurma/yükseltme sistemiyle oyuncu kontrolünde (geçerli)
- Taşıt/lojistik bölge bazından fraksiyon havuzuna taşındı
- Garnizon kavramı kaldırıldı; tek kaynak `oyun.birimler`

---

## Kod Eklerken Dikkat Edilecekler

1. **Yeni aksiyon eklerken:** `actions.js`'e `async` fonksiyon yaz → `callbacklar` nesnesine ekle → `ui.js`'te butonu bağla
2. **Yeni tur efekti eklerken:** `main.js` `turIsle()` içine doğru sıraya ekle; savaş
   çözümünden (`operasyonTick/hareketTick`) sonra mı önce mi çalışacağına bilinçli karar ver
3. **State değişikliği:** `oyun.bolgeler` dizisi yenilenirse `bolgeMapTemizle()` çağır;
   yeni alan eklersen `save.js` `oyunDurumuNormallestir()`'e varsayılanını ekle
4. **Modal:** `await showAlert/showConfirm/showPrompt` kullan, native dialog kullanma
5. **Birim silme:** `birim._sil = true` işaretle, tur sonu otomatik temizlenir
6. **Kullanıcı verisi render:** `innerHTML` şablonuna giren her serbest metin için `htmlKacir()`
7. **Syntax kontrolü:** `node --input-type=module --check < src/dosya.js`
8. **Smoke test:** `node scripts/sim-test.mjs --runs 2 --turns 30`

---

## Oyun Başlangıç Parametreleri (İstanbul, orta zorluk)

```
Fraksiyon biz: para 600₺, başlangıç bölgesi Fatih (veya haritadan seçim), 4 tetikçi
AI1: Esenyurt, AI2: Tuzla, AI3: Beykoz — her biri ~8 birim (nüfusa göre)
Taşıt havuzu: biz 6 🚗 + 10 🏍️; AI'lar 4 🚗 + 8 🏍️
Tüm bölge sadakati: 55; araştırma: tüm dallar seviye 0
Diğer tüm bölgeler tarafsız (saldırılamaz, rüşvetle alınır)
```
