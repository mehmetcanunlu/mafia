# Savaş / Barış / İttifak Sistemi — Kapsamlı Analiz ve Plan

_Tarih: 2026-04-07_

---

## MEVCUT DURUM ANALİZİ

### İlişki Skoru Bantları (`diplomasi.js:187-193`)

```
>= 70  → İttifak  🟢
>= 30  → Dostluk  💚
> -30  → Tarafsız ⚪
> -70  → Gerilim  🟠
<= -70 → Savaş    🔴
```

Bu bantlar sadece **etiket** üretiyor. Mekanik davranışı **doğrudan belirlemiyorlar**.
Gerçek mekanik davranış iki fonksiyona dayanıyor:

```js
// diplomasi.js:309-319
isDostCete(a, b)   → ilişki >= 30  VEYA ittifak anlaşması aktif
isDostIttifak(a, b)→ ilişki >= 70  VEYA ittifak anlaşması aktif

// diplomasi.js:328-330
diplomasiSaldiriMumkunMu(a, b) → SADECE ateşkes ve ittifak var mı diye kontrol eder
```

---

## KRİTİK SORUNLAR (Koddan Doğrulandı)

### SORUN-01: Savaş Durumu Mekanik Olarak Yok

`diplomasiSaldiriMumkunMu` sadece **aktif ateşkes** veya **aktif ittifak** kontrol eder.
İlişki skoru saldırı izni için **hiç kullanılmıyor**.

Sonuçlar:
- İlişki +50 (Dostluk) olsa da saldırabilirsin — ihanet işlemi başlar ama saldırı engellenmez
- İlişki -100 (Savaş) olsa da barış teklifi yapılabilir; kabul edilince "ateşkes" eklenir
- "Savaş" ve "Gerilim" bantları oynanış açısından birbirinden **sıfır farkı** var
- Resmi savaş ilanı mekanizması yok; saldırarak fiilen savaş başlatılıyor

---

### SORUN-02: isDostCete / isDostIttifak Çakışması

```js
// Senaryo: İttifak anlaşması var, ilişki ihanet sonrası -50'ye düştü
isDostIttifak("biz", "ai1")  // → TRUE (anlaşma hâlâ aktif)
iliskiDurumu("biz", "ai1")   // → { etiket: "Gerilim", ikon: "🟠" }
```

- Anlaşma varken ilişki "Gerilim" gösteriyor ama konvoylar ittifak geçişi yapıyor
- Oyuncu neyi görüyor ile ne oluyor çakışıyor
- **Anlaşma durumu** ile **ilişki skoru etiketi** bağımsız hareket ediyor

---

### SORUN-03: Barış Teklifi = Ateşkes (Anlam Karışıklığı)

```js
// diplomasi.js:128
anlasmaEkle("ateskes", gonderen, hedef, DIPLOMASI.BARIS_SURESI); // 5 tur
```

- UI'da "Barış teklifi kabul edildi" yazıyor
- Ama aslında 5 turlu **geçici ateşkes** ekleniyor
- Süre dolunca savaş otomatik devam ediyor — oyuncu bunun farkında değil
- Kalıcı barış / normalleşme mekanizması yok

---

### SORUN-04: İttifak Müdahalesi Sadece Log

```js
// diplomasi.js:660-667
hedefIttifaklari.forEach((ortak) => {
  diploKayitEkle("ittifak-uyari", `... savunma uyarısı geçti.`);
  // Gerçek savunma müdahalesi YOK
});
```

- Müttefik saldırı altındaysa ittifak ortağı otomatik savaşa katılmıyor
- "Savunma uyarısı" sadece log kaydına düşüyor
- İttifakın oynanış değeri çok düşük

---

### SORUN-05: Barış Teklifi Eşiği Geriye Dönük Çalışıyor

```js
// diplomasi.js:117-119
if (iliski >= -29) {
  return { ok: false, mesaj: "Barış teklifi için ilişki Gerilim/Savaş seviyesinde olmalı." };
}
```

- Barış teklifini **yalnızca** ilişki -30'dan düşükken yapabilirsin
- Ama saldırı yapabilmek için ilişki skorunun önemi yok (ateşkes yoksa)
- Sonuç: Dostluk (>=30) bandındayken saldırabilir ama barış teklifi yapamazsın (çelişki)
- Oyuncu: "Neden barış teklifim reddedildi? İlişkimiz iyi değil mi?"

---

### SORUN-06: Koalisyon Bildirimi ve UI Yok

```js
// diplomasi.js:813-835 — koalisyonKontrol()
d.koalisyon = { hedef: lider.owner, uyeler, baslangic: ... }
messages.push(`Denge Koalisyonu kuruldu: hedef ${ownerAd(lider.owner)}.`)
```

- Koalisyon mantığı çalışıyor, saldırı bonusu var (`ittifakSaldiriCarpani` içinde)
- Ama oyuncuya "Sen koalisyon hedefisin" veya "Sen koalisyon üyesisin" diyen **panel/uyarı yok**
- Koalisyon ne zaman biter? `koalisyonKontrol` içinde `else` dalında `d.koalisyon = null` var ama oyuncuya bildirilmiyor

---

### SORUN-07: Bekleyen Teklif Süresi Sessizce Doluyor

```js
// diplomasi.js:108-109
bitis: oyun.tur + OYUNCU_TEKLIF_GECERLILIK  // 3 tur
```

- AI'dan gelen teklif 3 tur geçerli; süre dolunca teklif kaybolacak
- Oyuncu'ya "X teklifin 1 tur içinde sona eriyor" uyarısı yok
- Tekliflerin `bekleyenTeklifler` listesi UI'da süre göstergesi olmadan sıralanıyor

---

### SORUN-08: İlişki Tarihçesi Toplanıyor Ama Gösterilmiyor

```js
// state.js:138-139
iliskiTarihce: [...].slice(-40)
```

- Her turda ilişki snapshot'ı kaydediliyor (40 tur geçmişi)
- Hiçbir UI bileşeni bu veriyi grafik/tablo olarak render etmiyor
- Oyuncu "Bu fraksiyon ile ilişkimiz nasıl değişti?" sorusunu cevaplayamıyor

---

### SORUN-09: Savaş İlanı → Karşı Taraf Diplo Tepkisi Yok

```js
// diplomasi.js:652
iliskiDegistir(saldiran, hedef, -15, "Askeri saldırı başlatıldı");
```

- Her saldırıda -15 ilişki → birikince -100 → "Savaş" etiketi
- Ama diğer fraksiyonlar (ai2, ai3) bu saldırıya tepki vermiyor
- "ai1, bizi saldırdı" → ai2 ve ai3 "biz ile ai1 arasında ilişki değişimi" yaşamıyor
- Gerçek politika: "Güçlü fraksiyon saldırıda → diğerleri tetikte"

---

### SORUN-10: `_ofke` Sistemi Sadece AI'da

```js
// ai.js — oyun.fraksiyon[hedef]._ofke
// Oyuncu fraksiyonunda _ofke yok
```

- AI'ın oyuncuya öfkesi var ve misilleme mantığı var
- Oyuncunun AI'a öfkesi (ve buna göre strateji önerisi) yok
- Asimetrik bilgi: AI oyuncunun ne yapacağını "hissedemiyor"

---

## ÇÖZÜM PLANI

### FAZ A — Anlam Netliği (Temel Düzeltmeler)

#### A-1: Anlaşma tiplerini yeniden adlandır ve ayır

Mevcut `"ateskes"` tipini ikiye böl:

| Anlaşma Tipi | Süre | Anlam | Mevcut Durum |
|---|---|---|---|
| `"ateskes"` | Kısa (5 tur) | Geçici saldırmazlık, tehditten doğar | Var |
| `"baris"` | Uzun (15 tur) | Müzakere barışı, ilişki yükselir | **YOK** |
| `"ittifak"` | 10 tur | Tam ittifak, bakım maliyeti var | Var |
| `"ticaret"` | 8 tur | Ekonomik anlaşma | Var |

**Değişiklik:**
- `barisTeklifiSonuclandir` → `anlasmaEkle("baris", ...)` kullan, `"ateskes"` değil
- `DIPLOMASI.BARIS_SURESI` = 15 tur (şu an 5, artır)
- `"baris"` anlaşması aktifken saldırı yapılamaz (`diplomasiSaldiriYasakSebebi` güncelle)
- Tehditten doğan anlaşma hâlâ `"ateskes"` kalsın (5 tur, daha kırılgan)

**Dosya:** `src/diplomasi.js`, `src/config.js`

---

#### A-2: Barış teklifi eşik mantığını düzelt

Mevcut kural: ilişki < -30 olunca barış teklifi yapılabilir.
**Yeni kural:**

```
Ateşkes teklifi: ilişki <= -30 (Gerilim veya Savaş bandında)
Barış müzakeresi: ilişki <= -50 (derin gerilim/savaş durumu)
Normalleşme teklifi: ilişki -30 ile 0 arasında (tarafsız, dostane olmayan)
```

Oyuncuya her diplo aksiyon için **ne zaman ne yapılabileceğini** gösteren bir koşul tablosu UI'a ekle.

**Dosya:** `src/diplomasi.js:115-135`, `src/ui.js`

---

#### A-3: Savaş İlanı Mekanizması Ekle

Yeni aksiyon: `savasBildir(gonderen, hedef)`:

```js
export function savasBildir(gonderen, hedef) {
  // Zaten savaş durumundaysa gereksiz
  if (iliskiDegeri(gonderen, hedef) <= -70) return { ok: false, mesaj: "Zaten savaş durumundasınız." };
  // Aktif ittifak varsa savaş ilanı → ihanet olur
  ihanetIsle(gonderen, hedef, "Savaş ilanı");
  // İlişkiyi direkt -70'e çek
  iliskiKoy(gonderen, hedef, -70);
  // Tüm aktif anlaşmalar iptal
  tarafAnlasmalari(gonderen, hedef).forEach(a => anlasmaSil(a.id));
  diploKayitEkle("savas-ilani", `${ownerAd(gonderen)}, ${ownerAd(hedef)} ile savaş ilan etti.`, "kotu");
  // Üçüncü taraflar etkilenir
  DIPLO_OWNERLER.filter(x => x !== gonderen && x !== hedef).forEach(x => {
    iliskiDegistir(gonderen, x, -5, "Savaşçı itibarı", { sessiz: true });
  });
  return { ok: true };
}
```

UI'da "Savaş İlan Et" butonu → onay dialogu → `savasBildir("biz", hedefOwner)`.

**Dosya:** `src/diplomasi.js`, `src/ui.js`

---

### FAZ B — Savaş Durumu Mekanik Bağlantısı

#### B-1: İlişki Bandı → Mekanik Efektler Tablosu

Şu an bandlar sadece etiket üretiyor. Her bant için gerçek mekanik ekle:

| Bant | Değer | Mevcut Etki | Eklenecek Etki |
|---|---|---|---|
| İttifak | ≥ 70 | Konvoy geçişi, saldırı yasak | Ortak savunma müdahalesi (Faz C) |
| Dostluk | ≥ 30 | Konvoy dostluk geçişi | Keşif bilgisi otomatik paylaşımı (-10% maliyet) |
| Tarafsız | > -30 | Saldırı serbest | — |
| Gerilim | > -70 | Saldırı serbest (anlamsız) | Her tur ek -1 ilişki (gerilim çürümesi); ateşkes fırsatı |
| Savaş | ≤ -70 | Saldırı serbest (anlamsız) | Her tur ek -2 ilişki; barış müzakeresi mümkün; AI misilleme bonusu +15% |

**Gerilim/Savaş bandında ek pasif etki:** `diplomasiTick` içinde:
```js
// Her turda çürüme
if (val <= -30 && val > -70) iliskiKoy(a, b, val - 1);  // Gerilim kötüleşiyor
if (val <= -70) iliskiKoy(a, b, Math.max(-100, val - 2)); // Savaş derinleşiyor
```

**Dosya:** `src/diplomasi.js` — `diplomasiTick` içi

---

#### B-2: Savaş Durumunda Saldırı Bonusu / Cezası Ayrımı

Mevcut: Her saldırıda aynı combat formülü.
Eklenecek: `iliskiDurumu` bandına göre savaş modifiyeri:

```js
// combat.js veya main.js savaş hesabında
function savasModifiyeri(saldiran, savunan) {
  const iliski = iliskiDegeri(saldiran, savunan);
  if (iliski <= -70) return { saldiriBonus: 0.05, logMesaj: "Savaş durumu" };
  if (iliski <= -30) return { saldiriBonus: 0, logMesaj: "Gerilim" };
  // Dostluk bandında saldırı → ceza (ihanet şoku)
  if (iliski >= 30) return { saldiriBonus: -0.1, logMesaj: "İhanet şoku" };
  return { saldiriBonus: 0, logMesaj: "" };
}
```

**Dosya:** `src/main.js` — `hareketTick` savaş çözümü bölümü

---

### FAZ C — İttifak Müdahalesi (Gerçek Ortak Savunma)

#### C-1: Müttefik Otomatik Savunma Katılımı

`diplomasiSaldiriBaslat` içinde uyarı log'undan öteye geç:

```js
hedefIttifaklari.forEach((ortak) => {
  if (ortak === "biz") {
    // Oyuncuya popup: "Müttefikin saldırı altında, yardım ister misin?"
    // → oyuncu kabul ederse: bekleme modundan çıkıp saldırı emri tetikle
    diploPopupKuyrugaEkle({
      metin: `${ownerAd(hedef)} ittifak müttefikin saldırı altında! Yardıma koşmak ister misin?`,
      baslik: "İttifak Müdahalesi",
      teklifId: `müdahale-${oyun.tur}-${ortak}-${hedef}`,
    });
  } else {
    // AI müttefik: savunma şansı hesapla
    const müdahaleŞansı = 0.55 + (iliskiDegeri(ortak, hedef) - 70) * 0.005;
    if (Math.random() < müdahaleŞansı) {
      // AI en yakın müttefik bölgesinden birlik gönder
      aiIttifakMüdahalesiBaslat(ortak, hedef, saldiran);
    }
  }
});
```

**Yeni fonksiyon:** `aiIttifakMüdahalesiBaslat(müdahale_eden, savunulan, saldiran)`
- `ai.js` içinde en güçlü AI bölgesinden saldırana yakın konuma hareket emri ver
- En az 1 tur gecikme (müdahale hemen olmaz)

**Dosya:** `src/diplomasi.js`, `src/ai.js`

---

#### C-2: İttifak Süre ve Maliyetini UI'da Göster

Mevcut: İttifak anlaşmaları `oyun.diplomasi.anlasmalar` içinde var ama UI'da kalan tur gösterilmiyor.

Diplomasi panelinde her aktif anlaşma için:
```
🤝 ai1 ile İttifak — 7 tur kaldı | Bakım: 50₺/tur
📦 ai2 ile Ticaret — 3 tur kaldı | Gelir: +80₺/tur
⚔ ai3 ile Ateşkes — 2 tur kaldı ⚠️
```

Ateşkes son 2 turda sarı uyarı, son 1 turda kırmızı uyarı.

**Dosya:** `src/ui.js` — diplomasi paneli render bölümü

---

### FAZ D — Koalisyon Sistemi Tamamlama

#### D-1: Koalisyon Paneli

`oyun.diplomasi.koalisyon` verisi var ama UI'a bağlı değil.

Diplomasi panelinin üstüne koşullu banner ekle:
```
┌─────────────────────────────────────────────────────┐
│ ⚡ DENGE KOALİSYONU AKTİF                           │
│ Hedef: [Fraksiyon X] — Güç payı: %58               │
│ Koalisyon üyeleri: Sen, ai2, ai3                    │
│ Ortak saldırı bonusu: +%10                          │
└─────────────────────────────────────────────────────┘
```

Oyuncu koalisyon hedefiyse farklı banner:
```
┌─────────────────────────────────────────────────────┐
│ 🚨 DENGE KOALİSYONU SENİ HEDEF ALIYOR             │
│ Koalisyon üyeleri: ai1, ai2, ai3                   │
│ Birlik ve savunmaya odaklan!                        │
└─────────────────────────────────────────────────────┘
```

**Dosya:** `src/ui.js`

---

#### D-2: Oyuncunun Koalisyona Davet Edilmesi

Koalisyon oluştuğunda AI'ın oyuncuya teklif gönderebilmesi:

```js
// diplomasi.js — koalisyonKontrol içi
if (koalisyonYeni && "biz" !== lider.owner) {
  // Oyuncuya katılım teklifi
  oyuncuyaTeklifOlustur("ai1", "koalisyon"); // yeni teklif tipi
}
```

**Yeni teklif tipi:** `"koalisyon"` → oyuncu kabul/red edebilir
- Kabul: `oyun.diplomasi.koalisyon.uyeler`'e "biz" ekle, ilişki bonusu
- Red: diğer üyelerle ilişki -5

---

### FAZ E — İlişki Tarihçesi ve Şeffaflık

#### E-1: İlişki Geçmişi Grafiği

`oyun.diplomasi.iliskiTarihce` son 40 tur verisini tutuyor.

Diplomasi panelinde seçili fraksiyon için mini ilişki grafiği:
```
+100 ┤
  70 ┤        ╭──────
  30 ┤───────╮│
   0 ┤       ││
 -30 ┤       ╰╯
 -70 ┤
-100 ┤
     └────────────────→ (son 20 tur)
      [Gerilim] [Dostluk] [İttifak] [Gerilim]
```

Basit CSS/canvas çizgisi, `iliskiTarihce` verisinden.

**Dosya:** `src/ui.js`

---

#### E-2: Bekleyen Teklif Süre Göstergesi

`bekleyenTeklifler` listesindeki her teklife kalan tur göstergesi:

```
📩 ai1'den İttifak Teklifi
   ⏱ 2 tur içinde yanıtlanmalı
   [Kabul] [Red]
```

Son tur kırmızı, önceki tur sarı.

**Dosya:** `src/ui.js`

---

#### E-3: Savaş Günlüğü Paneli Ayır

Şu an `olayGunlugu` hem ticaret hem savaş hem ihanet kayıtlarını bir arada tutuyor.
UI'da filtre ekle:

- **Tümü** | **Savaş/Saldırı** | **Anlaşmalar** | **İhanet** | **Koalisyon**

Filtre: `d.olayGunlugu.filter(k => k.kod.startsWith("fetih") || k.kod === "savas-ilani" ...)`

**Dosya:** `src/ui.js`

---

## ÖZET: DURUM MATRISI (Hedef Tasarım)

| A ile B arasındaki durum | Saldırı | Barış teklifi | İttifak teklifi | Ticaret | Konvoy geçişi |
|---|---|---|---|---|---|
| **İttifak** (anlaşma aktif) | ❌ yasak | ❌ gereksiz | ➖ (yenile) | ✅ | ✅ ittifak geçişi |
| **Dostluk** (≥ 30) | ⚠️ → ihanet | ❌ (ilişki iyi) | ✅ | ✅ | ✅ dostluk geçişi |
| **Tarafsız** (-30..30) | ✅ | ❌ (şart yok) | ✅ (≥ 30 şartı) | ✅ | ❌ geçiş yok |
| **Gerilim** (-70..-30) | ✅ | ✅ ateşkes teklifi | ❌ (ilişki düşük) | ✅ (riskli) | ❌ |
| **Savaş** (≤ -70) | ✅ + %5 bonus | ✅ barış müzakeresi | ❌ | ❌ (yok) | ❌ |
| **Ateşkes aktif** (her bant) | ❌ yasak | ➖ (zaten var) | ✅ | ✅ | ➖ banta göre |

---

## DOSYA BAZINDA YAPILACAKLAR

### `src/diplomasi.js`

| # | Değişiklik | Satır/Fonksiyon |
|---|---|---|
| 1 | `barisTeklifiSonuclandir` → `anlasmaEkle("baris", ...)` kullan | 128 |
| 2 | `diplomasiSaldiriYasakSebebi` → `"baris"` anlaşmasını da kontrol et | 321-326 |
| 3 | `savasBildir(gonderen, hedef)` fonksiyonu ekle | Yeni export |
| 4 | `diplomasiSaldiriBaslat` → gerçek müdahale tetikle | 660-667 |
| 5 | `diplomasiTick` içine gerilim/savaş çürüme mantığı ekle | `iliskiHafizaSolmasi` yanı |
| 6 | Barış teklifi eşik mantığını düzelt (>= -29 koşulunu gözden geçir) | 117-119 |
| 7 | Koalisyon teklifi → yeni teklif tipi `"koalisyon"` | `koalisyonKontrol` |

### `src/config.js`

| # | Değişiklik |
|---|---|
| 1 | `DIPLOMASI.BARIS_SURESI` → 15 tura çıkar (şu an 5) |
| 2 | `DIPLOMASI.GERILIM_CURUMESI` = 1 ekle |
| 3 | `DIPLOMASI.SAVAS_CURUMESI` = 2 ekle |
| 4 | `DIPLOMASI.SAVAS_SALDIRI_BONUS` = 0.05 ekle |
| 5 | `DIPLOMASI.IHANET_SALDIRI_CEZA` = 0.10 ekle |

### `src/ui.js`

| # | Değişiklik |
|---|---|
| 1 | Aktif anlaşmalar listesi: kalan tur + bakım maliyeti |
| 2 | Ateşkes/barış son 1-2 tur → kırmızı/sarı uyarı |
| 3 | Koalisyon aktif banner (hedef veya üye) |
| 4 | Bekleyen teklif: kalan tur sayacı |
| 5 | İlişki geçmişi mini grafiği (seçili fraksiyon) |
| 6 | Savaş günlüğü filtre sekmeleri |
| 7 | "Savaş İlan Et" butonu (Gerilim/Tarafsız bandında görünür) |
| 8 | Her fraksiyon için durum badge'i: İttifak/Ateşkes/Savaş/Tarafsız |

### `src/ai.js`

| # | Değişiklik |
|---|---|
| 1 | `aiIttifakMüdahalesiBaslat(müdahale_eden, savunulan, saldiran)` yeni fonksiyon |
| 2 | AI gerilim bandında otomatik barış teklifi şansı (savaş yorgunluğu) |

### `src/main.js`

| # | Değişiklik |
|---|---|
| 1 | `hareketTick` savaş çözümünde `savasModifiyeri` uygula |

---

## UYGULAMA SIRASI

```
Faz A (1-2 gün): Anlam netliği
  A-1 → baris/ateskes ayrımı
  A-2 → barış teklifi eşik düzeltmesi
  A-3 → savasBildir() fonksiyonu + UI butonu

Faz B (1 gün): Mekanik bağlantı
  B-1 → gerilim/savaş bandı pasif çürüme
  B-2 → savaş modifiyeri combat'a ekle

Faz C (2 gün): İttifak müdahalesi
  C-1 → gerçek ortak savunma tetikleyicisi
  C-2 → anlaşma süreleri UI'da

Faz D (1 gün): Koalisyon
  D-1 → koalisyon paneli
  D-2 → oyuncuya koalisyon daveti

Faz E (1 gün): Şeffaflık
  E-1 → ilişki geçmişi grafiği
  E-2 → teklif süre göstergesi
  E-3 → savaş günlüğü filtresi
```
