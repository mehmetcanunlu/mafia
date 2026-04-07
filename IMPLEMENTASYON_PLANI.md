# Mafia Bölge Savaşı — İmplementasyon Planı

_Tarih: 2026-04-07_

---

## BÖLÜM 1: Aktif Hatalar

### P0 — Oyun Kırıcı

#### BUG-01: İttifak arazisinden transit geçiş duraksıyor
- **Dosya:** `src/main.js:494-499` (`hareketTick`)
- **Sorun:** `isDostIttifak` dalı, konvoyun devam eden rotası (`k.rota.length > 0`) olup olmadığını kontrol etmeden birliği oraya yerleştiriyor. Müttefik topraklarından geçen bir konvoy, asıl hedefe ulaşmak yerine müttefik topraklarında takılı kalıyor.
- **Düzeltme:**
```js
if (isDostIttifak(k.owner, hedef.owner)) {
  // Rotada hâlâ adım varsa geçmeye devam et
  if (k.rota && k.rota.length > 0) {
    k.konumId = k.hedefId;
    k.hedefId = k.rota.shift() || null;
    k._hazir = false;
    k.durum = "hareket";
    continue;
  }
  yiginaEkle(hedef.id, k.owner, k.adet, k.tip || "tetikci");
  konvoyTasitIade(k, hedef.id);
  k._sil = true;
  continue;
}
```

---

#### BUG-02: AI öfke sıfırlama — misilleme asla tırmanmıyor
- **Dosya:** `src/ai.js:583-587` (`aiCasuslukYap`)
- **Sorun:** Suikast başarısız olduğunda `fr._ofke += 10` yapılıyor ama hemen ardından gelen `fr._ofke = 0` koşulsuz sıfırlama satırıyla boşa çıkıyor. Öfke hiçbir zaman birikerek tırmanan misillemeye dönüşmüyor.
- **Düzeltme:** Koşulsuz `fr._ofke = 0` satırını kaldır. Öfkeyi yalnızca başarılı suikastta sıfırla:
```js
if (Math.random() < sans) {
  fr._ofke = 0; // başarıda sıfırla
  // ... başarı logu
} else {
  fr._ofke = (fr._ofke || 0) + 10; // başarısızlıkta biriktir, sıfırlama
}
// Satır 587'deki koşulsuz fr._ofke = 0; KALDIRILDI
```

---

#### BUG-03: Saldırı kaynağı hesabında garnizon sayılmıyor
- **Dosya:** `src/actions.js` — `ownerBolgeHazirToplam`, `bolgedenBirlikCek`, `saldiriHizliAcil`
- **Sorun:** Bu fonksiyonlar yalnızca `oyun.birimler` yığınlarını sayıyor; `bolge.garnizon`'ı görmüyor. Bir bölgede sadece garnizon varsa saldırı kaynağı olarak görünmüyor, saldırıya da dahil edilmiyor.
- **Düzeltme (stopgap):** `ownerBolgeHazirToplam`'a garnizon ekle:
```js
const garnizon = bolgeById(bolgeId)?.garnizon || 0;
return yiginToplam + garnizon;
```
- **Uzun vadeli:** Garnizon tek-durum mimarisine geçiş (bkz. ARCH-01).

---

### P1 — Oynanışı Bozan

#### BUG-04: Garnizon çift-durum tutarsızlığı
- **Dosya:** `src/main.js`, `src/actions.js`, `src/state.js`
- **Sorun:** `garnizonAyarla()` oyun ortasında `bolge.garnizon`'a yazıyor, oysa `garnizonTemizleVeYiginaTasi()` başlangıçta hepsini `oyun.birimler`'e taşıdı. İkisi aynı anda var olunca savunma hesaplaması çift sayabiliyor.
- **Düzeltme:** `garnizonAyarla` artık `bolge.garnizon`'a yazmamalı; bunun yerine `yiginaEkle` / `yigindanAl` kullanarak durağan bir `oyun.birimler` yığını oluşturmalı. Detaylar: ARCH-01.

---

#### BUG-05: `bribeCostNeutral` — oyuncu ile AI formülü farklı
- **Dosya:** `src/actions.js` (`teslimAl`) ve `src/ai.js`
- **Sorun:** Tarafsız bölge rüşveti için iki farklı formül kullanılıyor → AI, oyuncudan farklı maliyetle bölge satın alabiliyor. Dengesiz rekabet.
- **Düzeltme:** `ai.js`'deki formülü `MEKANIK.bribeNeutralBase / bribeNeutralPerGuv / bribeNeutralPerNufus` sabitlerini kullanacak şekilde güncelle.

---

### P2 — Küçük / Kenar Durumlar

#### BUG-06: `aiDiploEsneklik` tanımlı ama kullanılmıyor
- **Dosya:** `src/config.js`, `src/diplomasi.js`
- **Sorun:** `ZORLUK[zorluk].aiDiploEsneklik` config'de tanımlı ama `diplomasi.js`'deki AI kabul formülüne hiç bağlanmamış; zorluk seviyesi, AI'ın diplomatik tekliflere yanıtını etkilemiyor.
- **Düzeltme:** `diplomasi.js`'deki AI kabul hesabına ekle:
```js
const z = ZORLUK[oyun.zorluk] || ZORLUK.orta;
const esnek = z.aiDiploEsneklik || 0;
acceptProbability += esnek;
```

---

## BÖLÜM 2: Eksik / Yarım Özellikler

| # | Eksiklik | Mevcut Durum | Oyuncu Etkisi |
|---|---|---|---|
| EK-01 | **Yaralı iyileşme mekaniği** | `oyun.yaralilar` doluyor ama hiç tüketilmiyor | Kayıplar kaybolup gidiyor, geri dönüş yok |
| EK-02 | **Esir sistemi** | Veri toplanıyor, mekanik etkisi yok | Keşif/fidye yolu kullanılamıyor |
| EK-03 | **Lider avatarları** | `liderHavuzu.js` tam, `ui.js`'de render edilmiyor | Lider portresi görünmüyor |
| EK-04 | **Güç sıralaması paneli** | `gucSiralamasiHesapla()` çalışıyor, UI'a taşınmıyor | Oyuncu güç dengesini göremez |
| EK-05 | **Asayiş / Suçluluk göstergesi** | Polis baskını gerçekleşiyor ama HUD'da gösterilmiyor | Oyuncu neden baskın yediğini bilmiyor |
| EK-06 | **Ekonomi KPI kilometre taşları** | `hedefTurlar: [20,40,60]` tanımlı, log/karşılaştırma yok | Oyuncu ekonomik ilerlemeyi takip edemiyor |

### EK-01 Çözüm — Yaralı iyileşme tick'i
`src/main.js` — `turIsle()` içine ekle:
```js
function yaraliTick() {
  oyun.yaralilar = oyun.yaralilar.filter((y) => {
    y.turKaldi--;
    if (y.turKaldi <= 0) {
      const geri = Math.floor(y.adet * 0.6); // %60 iyileşme oranı
      if (geri > 0) yiginaEkle(y.bolgeId, y.owner, geri);
      return false;
    }
    return true;
  });
}
```

### EK-06 Çözüm — KPI kilometre taşı logu
`src/main.js` — `turIsle()` içine ekle:
```js
if ([20, 40, 60].includes(oyun.tur)) {
  const netGelir = /* gelir - bakim */;
  oyun.ekonomiKpi.kayitlar.push({ tur: oyun.tur, netGelir });
  logYaz(`[KPI] Tur ${oyun.tur}: Net gelir ${netGelir.toFixed(0)} ₺/tur`);
}
```

---

## BÖLÜM 3: Tasarım Dokümanlarındaki Uygulanmamış Özellikler

_Kaynak: `HARITA_MODLARI_VE_HIZLI_HAREKET.md`, `DIPLOMASI_SISTEMI.md`_

### YEN-01: Harita Modları
Toplam 4 mod, `1 / 2 / 3 / 4` tuş kısayolları ile geçiş. Her mod bölge renklerini ve tooltip içeriğini değiştirir; aktif mod adı HUD'da gösterilir.

| Tuş | Mod | Isı haritası kriteri | Tooltip içeriği |
|---|---|---|---|
| `1` | **Siyasi** | Sahiplik rengi (varsayılan) | Bölge adı, sahip, nüfus |
| `2` | **Askeri** | Toplam birlik yoğunluğu (garnizon + yığın) | Birlik sayısı, garnizon, savunma puanı |
| `3` | **Ekonomik** | Gelir miktarı (düşük → açık, yüksek → koyu) | Gelir ₺, üretim, bakım maliyeti |
| `4` | **Lojistik** | Taşıt varlığı (araba + motor toplamı) | Araba sayısı, motor sayısı, konvoy kapasitesi |

**Lojistik mod detayı:**
- Her bölgede `bolge.tasitlar.araba` ve `bolge.tasitlar.motor` (veya `oyun.birimler` üzerinden hesaplanan taşıt havuzu) okunur.
- Taşıt yoksa bölge gri; az ise sarı; çok ise koyu turuncu/kırmızı tonu.
- Tooltip: `🚗 Araba: 3 | 🏍 Motor: 5 | Kapasite: ~16 birlik`

**Uygulama adımları:**
1. `src/ui.js`'e `aktifHaritaModu` (string: `"siyasi"|"askeri"|"ekonomik"|"lojistik"`) state'i ekle.
2. `haritaModuAyarla(mod)` fonksiyonu → SVG container'a `data-mod` set et + tüm bölgeleri yeniden renklendir.
3. `bolgeRenkHesapla(bolge, mod)` yardımcı fonksiyonu → moda göre normalleştirilmiş 0-1 değer döner, CSS `hsl()` ile renk üretilir.
4. `main.js` veya `ui.js`'de `keydown` listener: `1`→siyasi, `2`→askeri, `3`→ekonomik, `4`→lojistik.
5. HUD'a aktif mod etiketi ekle (sol üst köşe).
6. Efsane (legend) render: mod değiştiğinde küçük bir ölçek çizgisi güncellenir.

- **Dosyalar:** `src/ui.js`, `public/index.html`

### YEN-02: Çift Tıkla Hızlı Saldırı
- Düşman bölgeye `dblclick` → `saldiriHizliAcil(id)` tetiklenir
- Yeni oyun mekaniği gerektirmiyor; sadece event bağlantısı
- **Dosya:** `src/ui.js`

### YEN-03: Shift+Tıkla Birlik Transferi
- Seçili bölgeden başka kendi bölgeye Shift+tıkla → hızlı hareket emri
- 4 tıklık akışı 2'ye indiriyor
- **Dosya:** `src/ui.js`, `src/actions.js`

### YEN-04: Sağ Tık Bağlam Menüsü
- SVG üzerinde `contextmenu` event → bölge sahibine göre aksiyonlar listesi
- Aksiyonlar: Saldır / Keşif / Suikast / Rüşvet
- **Dosya:** `src/ui.js`, `public/index.html`

---

## BÖLÜM 4: Teknik Borç

### ARCH-01: Garnizon tek kaynak mimarisine geçiş
- **Sorun:** `bolge.garnizon` (integer) ve `oyun.birimler` (yığın) aynı anda var; tutarsızlık kaçınılmaz.
- **Çözüm:**
  1. `garnizonAyarla()` içinde `b.garnizon = hedef` yerine `yiginaEkle` / `yigindanAl` kullan.
  2. `savunmaDurumuHesapla` yalnızca `oyun.birimler`'i okusun.
  3. `garnizonTemizleVeYiginaTasi` çağrısını başlangıçtan kaldır (artık gerekmiyor).
  4. `b.garnizon`'a erişen tüm yerleri (`ai.js`, `logistics.js`, `ui.js`) güncelle.

### ARCH-02: `liderBonus` imza tutarsızlığı
- `main.js:liderBonus(owner: string, tip)` — string alıyor, kendi içinde faction'ı buluyor
- `ai.js:liderBonus(fr: object, tip)` — faction objesini doğrudan alıyor
- **Çözüm:** İkisini de string owner alacak şekilde standartlaştır.

### ARCH-03: Test altyapısı yok
- Tüm testler elle oynanarak yapılıyor.
- Ekonomi dengelemesi için headless simülasyon şart.
- **Çözüm:** `scripts/sim-test.mjs` — N tur headless çalıştır, KPI çıktısı üret.

---

## Uygulama Öncelik Tablosu

| Öncelik | Madde | Dosya(lar) | Efor |
|---|---|---|---|
| P0 | İttifak transit rotası duraksıyor | `main.js:494-499` | Küçük |
| P0 | AI öfke sıfırlama — misilleme yok | `ai.js:583-587` | Önemsiz |
| P0 | Garnizon saldırı kaynağında görünmüyor | `actions.js` | Küçük |
| P1 | `aiDiploEsneklik` kabul formülüne bağla | `diplomasi.js` | Önemsiz |
| P1 | Garnizon çift-durum mimarisi düzelt | `main.js`, `actions.js`, `state.js` | Orta |
| P2 | Yaralı iyileşme tick'i | `main.js` | Küçük |
| P2 | Ekonomi KPI kilometre taşı logu | `main.js` | Küçük |
| P2 | Lider avatar render | `ui.js` | Küçük |
| P2 | Güç sıralaması paneli | `ui.js` | Küçük |
| P2 | Asayiş suçluluk HUD göstergesi | `ui.js` | Küçük |
| P3 | Harita modları (askeri/ekonomik ısı haritası) | `ui.js`, `index.html` | Orta |
| P3 | Çift tıkla hızlı saldırı | `ui.js` | Önemsiz |
| P3 | Shift+tıkla transfer | `ui.js`, `actions.js` | Küçük |
| P3 | Sağ tık bağlam menüsü | `ui.js`, `index.html` | Orta |
| P4 | Headless test simülasyon harnesi | `scripts/sim-test.mjs` | Orta |
| P4 | `liderBonus` imza standardizasyonu | `main.js`, `ai.js` | Küçük |

---

## Faz Planı

### Faz 1 — Kır Düzelt (Hemen Başla)
> BUG-01, BUG-02, BUG-03

### Faz 2 — Oynanış Tutarlılığı
> BUG-04 (garnizon mimarisi), BUG-05, BUG-06, EK-01 (yaralı)

### Faz 3 — UI Görünürlük
> EK-03 (avatarlar), EK-04 (güç sıralaması), EK-05 (asayiş), EK-06 (KPI)

### Faz 4 — Yeni Özellikler
> YEN-01 harita modları → YEN-02/03 kısayollar → YEN-04 bağlam menüsü

### Faz 5 — Altyapı
> ARCH-01 garnizon mimarisi (tam geçiş), ARCH-02 liderBonus, ARCH-03 test harnesi
