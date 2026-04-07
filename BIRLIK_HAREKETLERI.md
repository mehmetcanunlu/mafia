# Birlik Hareketleri — Tasarım & Uygulama Kılavuzu

> Bu belge, mevcut konvoy sisteminin **neden** koordineli çete hareketlerini destekleyemediğini  
> analiz eder ve adım adım nasıl ekleneceğini açıklar.

---

## 1. Sorun: Mevcut Sistemin Sınırları

Şu anda her konvoy (`oyun.birimler` içindeki bir obje) bağımsız hareket eder.  
`hareketTick()` fonksiyonu (`main.js:59`) her konvoyu **sırayla ve izole** işler:

```
for (const k of varanlar) {
    if (hedef.owner === k.owner)  → dost bölge, yerleş
    if (hedef.owner === "tarafsiz") → dur
    else → SAVAŞ (kendi başına)
}
```

Bu yapı 4 temel sorunu doğurur:

---

### Sorun 1 — İttifak Geçişi Yok

**Dosya:** `main.js:81`

```js
if (hedef.owner === "tarafsiz" || hedef.owner === k.owner) {
  yiginaEkle(hedef.id, k.owner, k.adet);  // Dost bölgeyse yerleş
  ...
}
```

Bir bölge ya "bizim" (`k.owner`) ya "tarafsız" ya da "düşman"dır.  
İttifak halinde olduğumuz AI'nın toprakları buraya düşmez → konvoy o bölgeye girince **savaş başlar**.

**Sonuç:** İttifak kursan bile müttefikin topraklarından geçemezsin.

---

### Sorun 2 — Koordineli Saldırı Yok (Makas Hareketi İmkânsız)

**Dosya:** `main.js:132-267`

İki farklı noktadan aynı hedefe aynı anda saldırmak istersen:
- Konvoy A hedefe varır → kendi başına savaşır → kaybeder veya kazanır
- Konvoy B bir tur sonra varır → önceki savaşın sonucuna göre tamamen farklı bir durum bulur

Her konvoyun savaşı **ayrı bir `Math.random()`** çekimine dayanır.  
İki konvoyun saldırı güçleri **asla toplanmaz** → gerçek bir koordineli saldırı yapılamaz.

```js
// Şu an böyle çalışıyor (her konvoy için ayrı):
const efektifAdet = Math.round(k.adet * tipCarpani * ...);  // sadece BU konvoy
const p = savasKazanmaIhtimali(efektifAdet, savunan, guv);
```

---

### Sorun 3 — Bekleme Modu Yok

Konvoyların birbirini bekleyeceği bir mekanik yoktur.  
`_hazir` flag'i sadece "bu tur yeni yaratıldı, bekle" içindir; kalıcı bir bekleme komutu değildir.

**Sonuç:** Koordineli saldırı planlarsan, iki konvoyun **aynı turda** hedefe varmasını  
piksel gibi ayarlamak zorundasın — bu neredeyse imkânsız.

---

### Sorun 4 — Ortak Garnizon Yok

Bir bölgede iki farklı `owner`'ın birimi olamaz.  
Bir AI müttefikinin birimi senin bölgene girerse → savaş başlar (Sorun 1 ile aynı kök).

---

## 2. Çözüm Mimarisi — 3 Katman

Sistemi üç bağımsız katmanda çözeceğiz.  
Her katman öncekine dayanır ama kendi başına da deploy edilebilir.

```
Katman 1: İttifak Tanımlama (isDostCete helper)
    ↓
Katman 2: Geçiş Hakkı & Ortak Garnizon
    ↓
Katman 3: Koordineli Saldırı (Operasyon Sistemi)
```

---

## 3. Katman 1 — İttifak Tanımlama Yardımcısı

Bu her şeyin temelidir. Tek bir yerde yazılır, her yerde kullanılır.

### 3.1 Nereye Eklenecek

**Dosya:** `src/diplomasi.js` (yeni dosya — diplomasi sistemiyle birlikte gelecek)  
veya geçici olarak `src/state.js` sonuna eklenebilir.

```js
/**
 * İki owner arasında aktif ittifak var mı?
 * Diplomasi sistemi aktif değilse daima false döner.
 */
export function isDostCete(ownerA, ownerB) {
  if (ownerA === ownerB) return true;  // kendisi
  if (!oyun.diplomasi?.iliskiler) return false;
  const key = [ownerA, ownerB].sort().join("-");
  const iliski = oyun.diplomasi.iliskiler[key] ?? 0;
  return iliski >= 70;  // +70 = İttifak eşiği (Bölüm 2 tablosundan)
}
```

### 3.2 Neden Bu Eşik

Diplomasi belgesindeki 5 kademe:

| Değer | Durum | Geçiş Hakkı | Ortak Garnizon | Koordineli Saldırı |
|---|---|---|---|---|
| +70 … +100 | İttifak | ✅ | ✅ | ✅ |
| +30 … +69 | Dostluk | ✅ sadece transit | ❌ | ❌ |
| diğerleri | — | ❌ | ❌ | ❌ |

"Dostluk" geçiş hakkı transit içindir: topraktan geçebilirsin ama orada birlik bırakamazsın.

---

## 4. Katman 2 — Geçiş Hakkı & Ortak Garnizon

### 4.1 Konvoy State Değişikliği

`oyun.birimler` içindeki her konvoy objesine iki alan eklenir:

```js
{
  // Mevcut alanlar (değişmez):
  id, owner, adet, tip, konumId, hedefId, rota, _hazir, durum,
  tasitAraba, tasitMotor,

  // YENİ — Katman 2:
  gecisHakki: false,    // true ise ittifak topraklarından transit geçer, oturmaz
  operasyonId: null,    // Katman 3 için — bağlı olduğu ortak operasyon ID'si
  bekliyor: false,      // Katman 3 için — koordineli saldırıda bekleme modu
}
```

### 4.2 `hareketTick()` Değişikliği

**Dosya:** `main.js:80-119`

Şu anki kod:
```js
// Dost veya tarafsız
if (hedef.owner === "tarafsiz" || hedef.owner === k.owner) {
  yiginaEkle(hedef.id, k.owner, k.adet);
  konvoyTasitIade(k, hedef.id);
  k._sil = true;
  continue;
}
```

Yeni kod:
```js
// ─── DOST BÖLGE: Yerleş ───
if (hedef.owner === k.owner) {
  yiginaEkle(hedef.id, k.owner, k.adet);
  konvoyTasitIade(k, hedef.id);
  k._sil = true;
  continue;
}

// ─── YENİ: İTTİFAK TRANSİTİ ───
if (isDostCete(k.owner, hedef.owner)) {
  if (k.gecisHakki && k.rota && k.rota.length > 0) {
    // Rota devam ediyorsa → geçip git (bölgeye yerleşme)
    k.konumId = k.hedefId;
    k.hedefId = k.rota.shift();
    k._hazir = false;
    continue;
  }
  if (isDostIttifak(k.owner, hedef.owner)) {
    // İttifak halindeyse → bölgeye yerleşebilir (ortak garnizon)
    yiginaEkle(hedef.id, k.owner, k.adet);
    konvoyTasitIade(k, hedef.id);
    k._sil = true;
    continue;
  }
  // Dostluk ama ittifak değilse → transit geçiş izni ama oturamaz
  if (k.rota && k.rota.length > 0) {
    k.konumId = k.hedefId;
    k.hedefId = k.rota.shift();
    k._hazir = false;
    continue;
  }
  // Rota bitti ama oturamıyorsa → geri dön
  k._sil = true;
  continue;
}

// ─── TARAFSIZ ───
if (hedef.owner === "tarafsiz") { ... }  // mevcut kod aynı kalır
```

Nerede: `isDostIttifak(a, b)` = `iliski >= 70`, `isDostCete(a, b)` = `iliski >= 30`.

### 4.3 Ortak Garnizon: Savaş Hesabı Değişikliği

**Dosya:** `main.js:133-135`

Şu an savunan birlikler sadece `hedef.owner`'a ait:
```js
const savunanBirimler = oyun.birimler.filter(
  (x) => x.konumId === hedef.id && x.owner === hedef.owner
);
```

Yeni — ittifak birliklerini de dahil et:
```js
const savunanBirimler = oyun.birimler.filter(
  (x) => x.konumId === hedef.id &&
  (x.owner === hedef.owner || isDostIttifak(x.owner, hedef.owner))
);
```

### 4.4 Pathfinding Değişikliği

**Dosya:** `map.js:7` — `kisaRota()` şu an tüm bölgeleri eşit görür.  
Sorun yok; ittifak geçişi `hareketTick()`'te yönetilir.

Ancak `actions.js:269`'daki saldırı rotası hesabında bir ek kontrol gerekli:

```js
// Eski: kisaRota(enYakinGuvenli("biz"), hedef.id)
// Yeni: rotayı bul, ittifak bölgelerine işaretle
const rota = kisaRota(kaynak.id, hedef.id);
const gecisHakkiVar = rota?.some(id => {
  const b = bolgeById(id);
  return b && isDostCete("biz", b.owner);
});
// Konvoy yaratılırken gecisHakki: gecisHakkiVar ekle
```

---

## 5. Katman 3 — Koordineli Saldırı (Operasyon Sistemi)

Bu en karmaşık kısım. Birden fazla çetenin aynı hedefe koordineli saldırısını yönetir.

### 5.1 Yeni State: Operasyonlar

`state.js`'e eklenir:

```js
oyun.operasyonlar = [
  // {
  //   id: "op_001",
  //   tip: "koordineli_saldiri",   // veya "makas", "cevirme"
  //   hedefId: 5,                  // saldırılacak bölge
  //   baslatanOwner: "biz",
  //   katilimcilar: [
  //     { owner: "biz",  hazir: false, konvoyIdler: ["k12", "k15"] },
  //     { owner: "ai1",  hazir: false, konvoyIdler: ["k23"] },
  //   ],
  //   durum: "hazirlik",  // "hazirlik" | "saldirim" | "tamamlandi"
  //   yaratildisTur: 14,
  //   zaman_asimi: 8,  // max tur bekleme
  // }
];
```

### 5.2 Bekleme Modu (`bekliyor`)

Bir konvoy hedefe yakınken diğerini bekleyebilir.

**Yeni durum değerleri:**

```
"hareket"           → Hareket ediyor (mevcut)
"hedefe-gidiyor"    → Hedefine doğru gidiyor (mevcut)
"bekliyor-op"       → Operasyon için bekliyor (YENİ)
```

`hareketTick()` başında, `bekliyor: true` olan konvoylar `varanlar` listesine **eklenmez**:

```js
// Mevcut:
const varanlar = oyun.birimler.filter((k) => k._hazir && k.hedefId);

// Yeni:
const varanlar = oyun.birimler.filter(
  (k) => k._hazir && k.hedefId && !k.bekliyor
);
```

### 5.3 Operasyon Tick Fonksiyonu

Her tur, `hareketTick()`'ten **önce** çalışır:

```js
function operasyonTick() {
  for (const op of oyun.operasyonlar) {
    if (op.durum !== "hazirlik") continue;

    // Zaman aşımı kontrolü
    if (oyun.tur - op.yaratildisTur > op.zaman_asimi) {
      // Beklemeyi kaldır, kendi başlarına hareket etsinler
      serbest_birak_operasyon(op.id);
      op.durum = "iptal";
      continue;
    }

    // Tüm katılımcılar hazır mı?
    for (const kat of op.katilimcilar) {
      const konvoylar = oyun.birimler.filter(
        (k) => kat.konvoyIdler.includes(k.id)
      );
      const hedefKomsusu = konvoylar.some(
        (k) => k.konumId !== undefined && komsuMu(k.konumId, op.hedefId)
      );
      kat.hazir = hedefKomsusu;
    }

    const hepsiHazir = op.katilimcilar.every((k) => k.hazir);
    if (hepsiHazir) {
      // Beklemeyi kaldır → bu tur saldırsınlar
      op.katilimcilar.forEach((kat) => {
        kat.konvoyIdler.forEach((kid) => {
          const k = oyun.birimler.find((b) => b.id === kid);
          if (k) k.bekliyor = false;
        });
      });
      op.durum = "saldirim";
    }
  }
}
```

### 5.4 Kombine Savaş Hesabı

`hareketTick()` içinde, düşman bölgeye ulaşan konvoylar işlenirken:

```js
// Mevcut — tek konvoy:
const efektifAdet = Math.round(k.adet * tipCarpani * (1 + saldiriGucu + arastrSaldiri));
const p = savasKazanmaIhtimali(efektifAdet, savunan, guv);

// YENİ — koordineli saldırı varsa, aynı turda aynı hedefe gelen tüm konvoyları bul:
function koordineliSaldiriGrubu(k, varanlar) {
  if (!k.operasyonId) return [k];
  return varanlar.filter(
    (k2) => k2.operasyonId === k.operasyonId &&
             k2.hedefId === k.hedefId &&
             !k2._islendi  // Bu tur zaten işlenmediyse
  );
}

// Uygulama:
const grup = koordineliSaldiriGrubu(k, varanlar);
if (grup.length > 1) {
  // ORTAK SAVAŞ HESABI
  let toplamEfektif = 0;
  for (const kg of grup) {
    const tc = BIRIM_TIPLERI[kg.tip]?.saldiri || 1.0;
    const sg = liderDevreDisiMi(kg.owner) ? 0 : liderBonus(kg.owner, "saldiriGucu");
    const ar = kg.owner === "biz" ? arastirmaEfekt("saldiriBonus") : 0;
    toplamEfektif += Math.round(kg.adet * tc * (1 + sg + ar));
  }
  // İttifak saldırı bonusu: +15% (Diplomasi belgesi Bölüm 4.2)
  toplamEfektif = Math.round(toplamEfektif * 1.15);

  const p = savasKazanmaIhtimali(toplamEfektif, savunan, guv);
  const kazandi = Math.random() < p;

  // Kayıpları grup içinde proporsiyonel dağıt
  grup.forEach((kg) => {
    const oran = kg.adet / grup.reduce((t, x) => t + x.adet, 0);
    // Kazananın kayıp hesabı * oran
    kg._islendi = true;
  });
}
```

---

## 6. UI: Oyuncu Arayüzü

### 6.1 Yeni Komutlar

**"Koordineli Saldırı" butonu** — diplomasi panelinde ittifak seçili iken:

```
[Birlikte Saldır →]
  1. Oyuncu hedef seçer
  2. "Hangi kuvvetleri gönderiyorsun?" (normal saldırı gibi)
  3. "AI müttefikin de katılsın mı?" → AI'ya operasyon teklifi gönderilir
  4. AI kabul ederse: operasyon oluşturulur, koordineli konvoylar başlatılır
```

**"Bekle" komutu** — seçili konvoy için:

```
Hareket eden konvoy seçiliyken:
[⏸ Bekle]  →  k.bekliyor = true; durum = "bekliyor-op"
[▶ Devam]  →  k.bekliyor = false
```

### 6.2 Harita Görsel Gösterimi

Koordineli operasyondaki konvoylar haritada **farklı ikon** ile gösterilir:

```
Normal konvoy:      ▶ (beyaz ok)
Bekleyen konvoy:    ⏸ (sarı pause)
Koordineli konvoy:  ⚔ (çift kılıç - kırmızı)
İttifak transit:    ↗ (mavi geçiş oku)
```

---

## 7. Özel Hareket Tipleri

### 7.1 Makas Hareketi (Pincer Attack)

İki farklı yönden aynı hedefe eş zamanlı saldırı.  
Savunma bonusu yarıya düşer (düşman iki cephe açmak zorunda):

```js
// Eğer saldırı iki farklı komşu bölgeden geliyorsa:
const farkliYonler = new Set(grup.map(k => k.konumId)).size;
if (farkliYonler >= 2) {
  const efektifGuv = guv * 0.5;  // Savunma bonusu yarıya iner
  logYaz(`⚔⚔ Makas hareketi! Savunma yarıya düştü.`);
}
```

### 7.2 Kuşatma (Encirclement)

Düşman bölgenin tüm komşu bölgeleri kontrol altına alınmışsa:

```js
function kusatmaKontrol(hedefId, attackerOwners) {
  const komsular = oyun.komsu[hedefId] || [];
  return komsular.every(id => {
    const b = bolgeById(id);
    return attackerOwners.includes(b.owner) || isDostCete(b.owner, attackerOwners[0]);
  });
}
// Kuşatma varsa: düşman kaçış puanı yok → defKalan otomatik 0
```

### 7.3 Destekli Savunma

İttifak ortağı, saldırıya uğrayan bölgeye destek gönderebilir:

- Operasyon tipi: `"savunma_destegi"`
- Ortak saldırı bonusu: +10% savunma (ittifak kuralı)
- UI: "Müttefikin savunmaya yardım çağırıyor! [Destek Gönder / Reddet]"

---

## 8. AI Koordineli Saldırı Davranışı

**Dosya:** `src/ai.js` — `aiSaldiriHareket()` sonuna eklenir.

```js
function aiKoordineliSaldiriDegerlendirYap(aiOwner) {
  // Ittifak var mı?
  const ittifakPartner = ["biz", "ai1", "ai2", "ai3"].find(
    (o) => o !== aiOwner && isDostIttifak(aiOwner, o)
  );
  if (!ittifakPartner) return;

  // Ortak saldırı için uygun hedef var mı?
  // (Hedef: partnerın komşusu ve AI'nın da komşusu olan düşman bölge)
  const ortak_hedefler = oyun.bolgeler.filter(b => {
    if (b.owner === aiOwner || b.owner === ittifakPartner) return false;
    if (b.owner === "tarafsiz") return false;
    const aiKomsu = (oyun.komsu[b.id] || []).some(id => bolgeById(id)?.owner === aiOwner);
    const partnerKomsu = (oyun.komsu[b.id] || []).some(id => bolgeById(id)?.owner === ittifakPartner);
    return aiKomsu && partnerKomsu;
  });

  if (!ortak_hedefler.length) return;

  // En değerli ortak hedefi seç
  const hedef = ortak_hedefler.sort((a, b) => b.gelir - a.gelir)[0];

  // Koordineli operasyon oluştur
  olusturOperasyon(aiOwner, ittifakPartner, hedef.id);
}
```

---

## 9. Uygulama Sırası & Zorluk Tahmini

| Adım | İş | Zorluk | Dosyalar |
|---|---|---|---|
| **1** | `isDostCete()` yardımcısı | Kolay | `state.js` veya `diplomasi.js` |
| **2** | Transit geçiş (ittifak topraklarından geçiş) | Orta | `main.js:80-119` |
| **3** | Ortak garnizon (ittifak birliği aynı bölgede) | Orta | `main.js:133`, `units.js` |
| **4** | `bekliyor` flag'i + duraklatma UI | Kolay | `main.js`, `actions.js`, `ui.js` |
| **5** | Operasyon state yapısı | Orta | `state.js`, `save.js` |
| **6** | `operasyonTick()` — bekleme & tetikleme | Zor | `main.js` |
| **7** | Kombine savaş hesabı | Zor | `main.js:132-267` |
| **8** | Makas bonusu | Kolay | `main.js` |
| **9** | AI koordineli saldırı davranışı | Zor | `ai.js` |
| **10** | Harita görsel gösterimi | Orta | `ui.js`, `animations.js` |

**Toplam süre tahmini:** Adım 1-4 tek bir oturumda, Adım 5-7 iki oturumda yapılabilir.  
Adım 8-10 cilalama fazı.

---

## 10. Kritik Edge Case'ler

### EC-1: İttifak Bozulursa Ortak Birimler Ne Olur?

İttifak sona erdiğinde (`iliski < 70`), rakip bölgede kalmış ittifak birimleri:
- **3 tur uyarı** al: "İttifak bitiyor, birlikleri geri çek"
- 3 tur sonra hâlâ oradaysalar → otomatik savaş başlar

```js
function ittifakBozulduKontrol() {
  // Her tur çalışır (diplomasiTick içinde)
  for (const k of oyun.birimler) {
    const bulunduguBolge = bolgeById(k.konumId);
    if (!bulunduguBolge) continue;
    if (bulunduguBolge.owner !== k.owner && 
        !isDostIttifak(k.owner, bulunduguBolge.owner)) {
      k._ittifakUyari = (k._ittifakUyari || 0) + 1;
      if (k._ittifakUyari >= 3) {
        // Savaş başlat veya zorla geri çek
        zorlaGeriCek(k);
      }
    }
  }
}
```

### EC-2: Koordineli Saldırı Sırasında Taraf İhanet Ederse

```js
// operasyonTick içinde:
if (op.durum === "saldirim") {
  for (const kat of op.katilimcilar) {
    if (!isDostCete("biz", kat.owner)) {
      // İhanet! Operasyonu iptal et
      logYaz(`⚠️ ${kat.owner} ihanet etti! Koordineli saldırı iptal.`);
      serbest_birak_operasyon(op.id);
      diplomasiIhanetKaydet(kat.owner);
    }
  }
}
```

### EC-3: Zaman Aşımı

Koordineli saldırıda bekleyen konvoy `zaman_asimi` turu geçerse:

```js
if (oyun.tur - op.yaratildisTur > op.zaman_asimi) {
  // Bekleyen konvoyları serbest bırak — kendi başlarına saldırsınlar
  // (Kombine bonus olmadan)
  op.katilimcilar.forEach(kat => 
    kat.konvoyIdler.forEach(kid => {
      const k = oyun.birimler.find(b => b.id === kid);
      if (k) { k.bekliyor = false; k.operasyonId = null; }
    })
  );
  op.durum = "zaman_asimi";
  logYaz("⏰ Koordineli saldırı zaman aşımına uğradı.");
}
```

### EC-4: Save/Load

`operasyonlar` ve `bekliyor` alanları `save.js`'deki serileştirme/deserileştirme kapsamına alınmalı:

```js
// save.js içinde normalizasyon:
if (!kayit.operasyonlar) kayit.operasyonlar = [];
kayit.birimler.forEach(k => {
  if (k.bekliyor === undefined) k.bekliyor = false;
  if (k.operasyonId === undefined) k.operasyonId = null;
  if (k.gecisHakki === undefined) k.gecisHakki = false;
});
```

---

## 11. Test Senaryoları

Uygulama sonrası şu senaryolar elle test edilmeli:

1. **Transit testi:** Müttefikin 3 bölgesinin ortasından geç → savaş başlamamalı
2. **Ortak garnizon testi:** Müttefikin bölgesine birlik gönder → birleşik savunma çalışmalı
3. **Koordineli saldırı testi:** İki yönden aynı hedefe → tek `Math.random()` çekimi, birleşik güç
4. **Makas testi:** 2 farklı komşudan aynı anda → savunma bonusu yarıya inmeli
5. **İhanet testi:** Koordineli saldırı başlatılmışken ittifak boz → operasyon iptal
6. **Zaman aşımı testi:** Bir konvoy gecikirse → diğeri serbest kalmalı
7. **Save/load testi:** Bekleyen konvoy olduğunda kaydet/yükle → durum korunmalı

---

## 12. Özet: Ne Nereye Eklenecek

```
main.js
├── hareketTick():81    → isDostCete() kontrolü + transit geçiş logic
├── hareketTick():133   → savunanBirimler'e ittifak birimleri dahil et
├── hareketTick():146   → koordineliSaldiriGrubu() ile kombine efektifAdet
├── hareketTick():147   → makas bonusu (farkliYonler >= 2 ise guv * 0.5)
└── [YENİ] operasyonTick() → hareketTick'ten önce çağrılır

state.js
└── oyun.operasyonlar = []  (yeni alan)

actions.js
├── saldiri():269       → konvoy yaratımında gecisHakki flag'i
└── [YENİ] koordineliSaldiriBaslat() → operasyon oluşturma

ai.js
└── [YENİ] aiKoordineliSaldiriDegerlendirYap() → her tur değerlendirme

save.js
└── normalizasyon: operasyonlar, bekliyor, gecisHakki, operasyonId

ui.js
└── konvoy ikonları: bekleyen ⏸, koordineli ⚔, transit ↗
```

---

*Bu belge, `hareketTick()` fonksiyonunun mevcut single-owner mimarisi üzerine kurulmuştur.  
Diplomasi sistemi (`DIPLOMASI_SISTEMI.md`) Katman 1'in ön koşuludur —  
`isDostCete()` ve `iliski` değerleri olmadan bu hiçbir şey çalışmaz.*
