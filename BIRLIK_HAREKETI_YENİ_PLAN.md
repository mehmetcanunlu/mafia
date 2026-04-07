# Birlik Hareketi — Yeni Mekanik Planı

_Tarih: 2026-04-08_

---

## MEVCUT DURUMUN KISA ANALİZİ

### Neden "sadece komşulara gidiyorlar"?

Pathfinding (`kisaRota` — BFS) **zaten var** ve çoklu bölge üzerinden rota bulabiliyor.
Sorun pathfinding'de değil, **UI katmanındaki kısıt**:

```js
// ui.js:2700-2713
const komsuVar = oyun.bolgeler.some(
  (x) => x.owner === 'biz' && komsuMu(x.id, b.id)  // komşu owned region var mı?
);
// ...
<button id="btn-saldir" ${komsuVar ? `` : `disabled`}>Saldır</button>
<button id="btn-saldir-hizli" ${komsuVar ? `` : `disabled`}>Hızlı Saldırı</button>
```

Eğer oyuncunun hedef bölgeye **komşu** bir bölgesi yoksa, saldırı butonu tamamen pasif.
Uzak bir düşmana ulaşmak için önce aradaki bölgeleri fethetmek zorundasın.

### Koordineli Saldırı da Komşu Kısıtlı

```js
// actions.js:1019
const bizimKaynak = ownerKomsuYiginKaynak("biz", hedef.id);
// → sadece hedefin komşularındaki yığınlara bakıyor
```

---

## KALDIRILACAK ÖZELLİKLER

### 1. Toplanma Noktası Sistemi

Karmaşıklık katıyor, benzer işlevi "Hareket Emri" zaten kapsıyor.

**Silinecekler:**
| Yer | Satır/Fonksiyon |
|---|---|
| `src/state.js` | `oyun.toplanma = { biz: null, ai1: null, ai2: null }` |
| `src/state.js` | `oyun.toplanma` yeniOyun reset |
| `src/save.js` | `if (!yuklenenOyun.toplanma)...` normalizasyonu |
| `src/actions.js` | `toplanmaNoktasiYap()` export |
| `src/actions.js` | `toplanmayaGonder()` export |
| `src/actions.js` | `saldiriEmriVer()` içindeki `rally = oyun.toplanma.biz` mantığı |
| `src/actions.js` | `callbacklar`'dan `toplanmaNoktasiYap`, `toplanmayaGonder` kaldır |
| `src/ui.js:2684-2685` | "Toplanma Noktası Yap" ve "Toplanmaya Gönder" butonları |
| `src/ui.js:2749-2760` | `bt`, `btg` event listener bağlamaları |

**`saldiriEmriVer` → `hareketEmriSaldiriBaslat` olarak yeniden yaz** (aşağıda detay)

---

### 2. Konvoy Beklet / Devam Butonları

`konvoyBekletSecili` ve `konvoyDevamSecili` — bekletme modunu koordineli saldırının içine entegre et, ayrı buton olarak sunma.

**Silinecekler:**
| Yer | Satır/Fonksiyon |
|---|---|
| `src/actions.js:863-901` | `konvoyBekletSecili()`, `konvoyDevamSecili()` export |
| `src/actions.js:1981-1982` | callbacklar'dan kaldır |
| `src/ui.js:2688-2690` | "⏸ Konvoy Beklet" / "▶ Konvoy Devam" buton satırları |
| `src/ui.js:2751-2752,2760` | `bkb`, `bkd` event listener bağlamaları |

---

## YENİ HAREKETLİ BİRLİK MEKANİĞİ

### Temel Kural Değişimi

| Eski | Yeni |
|---|---|
| Saldır butonu sadece komşu sahiplenilmiş bölge varsa aktif | Saldır butonu **her düşman bölge** için aktif (ulaşılabilir rota varsa) |
| Kaynak otomatik seçilir (en yakın) | Oyuncu **kaynak bölgeyi seçer** |
| Hareket: sadece 1 adım (komşuya) | Hareket: **N adım** — rota otomatik hesaplanır, tur/tur 1 bölge ilerler |
| Koordineli saldırı: sadece komşu kaynak | Koordineli saldırı: uzak kaynaklardan da |

---

## UYGULAMA PLANI

### ADIM 1 — UI Kısıtı Kaldır

**Dosya:** `src/ui.js:2700-2716`

Mevcut `komsuVar` kontrolünü **saldırı butonlarından** kaldır.
Yerine `rotaVar` kontrolü koy:

```js
// komsuVar yerine:
const rotaVar = !!kisaRota(
  oyun.bolgeler.find(x => x.owner === "biz" && kisaRota(x.id, b.id))?.id,
  b.id
);
// Veya daha basit: bizim herhangi bir bölgemiz var mı?
const bizBolgeVar = oyun.bolgeler.some(x => x.owner === "biz");
```

Gerçek ulaşılabilirlik kontrolü `saldiri()` içinde zaten yapılıyor
(`kisaRota` null dönerse uyarı verir). UI'da sadece "bölge var mı" yeterli.

**Değişiklik:**
```js
// ESKİ:
<button id="btn-saldir" ${komsuVar ? `` : `disabled`}>Saldır</button>
<button id="btn-saldir-hizli" ${komsuVar ? `` : `disabled`}>Hızlı Saldırı</button>
<button id="btn-koordineli-saldiri" ${komsuVar && koordineliMumkun ? `` : `disabled`}>

// YENİ:
<button id="btn-saldir">Saldır</button>
<button id="btn-saldir-hizli">Hızlı Saldırı</button>
<button id="btn-koordineli-saldiri" ${koordineliMumkun ? `` : `disabled`}>
```

`komsuVar` kullanan araç çalma butonları için kısıt **kalabilir** (mantıklı — çalmak için yakın olmalısın).

---

### ADIM 2 — Saldırı Kaynağı Oyuncu Seçsin

**Dosya:** `src/actions.js` — `saldiri()`

Mevcut `saldiri()` en yakın kendi bölgesini otomatik kaynak olarak alıyor.
Oyuncuya "Hangi bölgeden göndereceksin?" sorusu ekle.

```js
export async function saldiri() {
  const hedef = bolgeById(oyun.seciliId);
  // ... mevcut kontroller ...

  // Kullanılabilir kaynak bölgeler: birliği olan tüm bölgeler
  const kaynakAdaylar = oyun.bolgeler
    .filter(b => b.owner === "biz" && ownerBolgeHazirToplam("biz", b.id) > 0)
    .map(b => {
      const rota = kisaRota(b.id, hedef.id);
      return rota ? { bolge: b, tur: rota.length - 1, rota } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.tur - b.tur); // yakından uzağa sırala

  if (!kaynakAdaylar.length) {
    await showAlert("Saldırı için kullanılabilir birlik veya ulaşım yolu yok.");
    return;
  }

  // Seçim listesi göster
  const secenekler = kaynakAdaylar.map(
    (k, i) => `${i + 1}. ${k.bolge.ad} (${k.tur} tur uzakta, ${ownerBolgeHazirToplam("biz", k.bolge.id)} birim)`
  ).join("\n");

  const secim = await showPrompt(
    `Hangi bölgeden saldıracaksın?\n\n${secenekler}\n\nNumara gir:`,
    "Saldırı Kaynağı Seç"
  );
  if (secim === null) return;
  const idx = parseInt(secim, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= kaynakAdaylar.length) {
    await showAlert("Geçersiz seçim.");
    return;
  }

  const { bolge: kaynakBolge, rota } = kaynakAdaylar[idx];
  const turSur = rota.length - 1;
  // ... geri kalan saldırı kodu aynı, sadece kaynakBolge ve rota değişkenlerini kullan ...
}
```

---

### ADIM 3 — Hareket Emri de Uzak Hedeflere

**Dosya:** `src/actions.js` — `hareketEmriHedefSec()`

Mevcut hareket emri seçimi nasıl çalışıyor?

```js
// Oyuncu kendi bölgesini seçer → Hareket Emri butonuna basar
// → hareketEmriBaslat() set edilir
// → haritada başka bölgeye tıklanır → hareketEmriHedefSec() çağrılır
```

`hareketEmriHedefSec` içinde hedef kısıtı var mı kontrol et.
Yoksa bu adım zaten çalışıyor olabilir — mevcut kod `kisaRota` kullanıyor.

**Kontrol:** `src/actions.js:hareketEmriHedefSec` fonksiyonunu incele,
eğer `komsuMu` filtresi varsa kaldır.

---

### ADIM 4 — Hızlı Saldırı (`saldiriHizliAcil`) Güncelle

**Dosya:** `src/actions.js` — `saldiriHizliAcil()`

Mevcut kod `ownerBolgeHazirBirimleri` ile sadece komşu bölgelerdeki yığınlara bakıyor.
Yeni versiyon tüm bölgelerdeki yığınlara bakmalı, mesafeye göre sıralamalı:

```js
// ESKİ:
const kaynaklar = bizKomsular.map(b => ({ b, adet: ownerBolgeHazirToplam("biz", b.id) }))
  .filter(x => x.adet > 0);

// YENİ:
const kaynaklar = oyun.bolgeler
  .filter(b => b.owner === "biz")
  .map(b => {
    const rota = kisaRota(b.id, hedef.id);
    if (!rota) return null;
    return { b, adet: ownerBolgeHazirToplam("biz", b.id), rota };
  })
  .filter(x => x && x.adet > 0)
  .sort((a, b) => a.rota.length - b.rota.length); // yakından uzağa
```

---

### ADIM 5 — Koordineli Saldırı Kaynak Kısıtını Kaldır

**Dosya:** `src/actions.js:1019`

```js
// ESKİ:
const bizimKaynak = ownerKomsuYiginKaynak("biz", hedef.id);

// YENİ: en yakın sahiplenilmiş yığını bul (komşu kısıtı olmadan)
function ownerEnYakinYiginKaynak(owner, hedefId) {
  return oyun.bolgeler
    .filter(b => b.owner === owner)
    .map(b => {
      const birim = yiginBul(b.id, owner);
      if (!birim || !birim.adet) return null;
      const rota = kisaRota(b.id, hedefId);
      if (!rota) return null;
      return { birim, bolge: b, rota, tur: rota.length - 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.tur - b.tur)[0] || null;
}
```

---

### ADIM 6 — Hareket Eden Birlik UI Gösterimi

Birlik hareket halindeyken (rota > 1 adım), haritada:
- Kaynak bölgede küçük "→" ok ikonu
- Tur sayısı tooltip: "2 tur sonra hedefe ulaşır"

**Dosya:** `src/ui.js` — `rozetSayilari` veya `durumCiz` bölümü

```js
// Hareketli birlikler için "yolda X birim" göstergesi
const harekettekileri = oyun.birimler.filter(
  k => k.owner === "biz" && k.hedefId && !k.bekliyor
);
```

---

## ÖZET: DOKUNULACAK DOSYALAR

### `src/ui.js`
- `komsuVar` kısıtını saldırı/hızlı saldırı butonlarından kaldır
- Toplanma butonlarını kaldır (2684-2685, 2749-2760)
- Konvoy Beklet/Devam butonlarını kaldır (2688-2690, 2751-2752)
- "Saldırı Emri (Toplanmadan)" butonunu koru ama yeniden adlandır

### `src/actions.js`
- `saldiri()`: kaynak seçim listesi ekle
- `saldiriHizliAcil()`: komşu kısıtını kaldır, tüm bölgelerden en yakın
- `koordineliSaldiriBaslat()`: `ownerKomsuYiginKaynak` → `ownerEnYakinYiginKaynak`
- `toplanmaNoktasiYap`, `toplanmayaGonder` fonksiyonlarını sil
- `konvoyBekletSecili`, `konvoyDevamSecili` fonksiyonlarını sil
- `callbacklar`'dan bu 4 fonksiyonu kaldır

### `src/state.js`
- `oyun.toplanma` alanını kaldır (yeniOyun'dan da)

### `src/save.js`
- `toplanma` normalizasyonunu kaldır

---

## UYGULAMA SIRASI

```
1. Adım 1 — UI kısıt kaldır (5 dk, test edilebilir)
2. Adım 5 — ownerEnYakinYiginKaynak (10 dk)
3. Adım 4 — saldiriHizliAcil güncelle (15 dk)
4. Adım 2 — saldiri() kaynak seçim listesi (20 dk)
5. Toplanma + Konvoy buton temizliği (10 dk)
6. Adım 6 — UI gösterim (20 dk, isteğe bağlı)
```

---

## EDGE CASE'LER

### EC-1: Rota üzerinde düşman bölge varsa ne olur?
`hareketTick` içinde birim adım adım ilerler. Düşman bölgeye gelince savaş başlar.
Bu **kasıtlı** bir davranış — oyuncu rota üzerinde düşman varsa bilgi verilmeli.

**Önerilen:** `saldiri()` kaynak seçim prompt'unda rotayı göster:
```
1. Fatih (3 tur uzakta) — Rota: Fatih → Beyoğlu [düşman ⚠️] → Şişli → hedef
```

### EC-2: Rota üzerindeki bölge el değiştirirse?
Birim hareket halindeyken rota bölgelerinden biri el değiştirebilir.
`hareketTick` zaten her adımda `hedefId`'yi anlık kontrol ediyor — bu zaten çalışıyor.

### EC-3: Çok uzak saldırılar dengesizleştirirse?
Harita tur ekonomisi küçük. 5-6 tur uzakta bir saldırı çok planlamacı.
Şimdilik serbest bırak, oynanışta dengelemeye bak.
