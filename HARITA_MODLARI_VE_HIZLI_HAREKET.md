# Harita Modları & Hızlı Asker Kaydırma

> Mevcut harita altyapısı (SVG İstanbul + Grid) üzerine ekleme kılavuzu.

---

## 1. Mevcut Sorun

Şu anki hareket akışı 4 tıklama gerektirir:

```
1. Bölge seç (tıkla)
2. Sağ panel → "Hareket Emri" butonu
3. Haritada hedef bölgeye tıkla
4. "Buraya Gönder" mini butonuna tıkla
```

Her harekette aynı akış → yavaş, yorucu, hata-prone.  
Ayrıca harita her zaman aynı görünür — savunma, ekonomi, diplomasi katmanları yoktur.

---

## 2. Çözüm Özeti

### 2.1 Üç Harita Modu

| Mod | Kısayol | Ne Gösterir |
|---|---|---|
| **Siyasi** (mevcut) | `1` | Sahiplik renkleri, konvoy rozetleri |
| **Askeri** | `2` | Garnizon yoğunluğu ısı haritası, konvoy okları, savunma puanları |
| **Ekonomi** | `3` | Gelir ısı haritası, sadakat renkleri, bina ikonları, nüfus |

*İleride eklenebilir: Diplomatik mod (`4`) — ilişki renkleri.*

### 2.2 Hızlı Hareket Yöntemleri

| Yöntem | Tetikleyici | Akış |
|---|---|---|
| **Sürükle-Bırak** | Kendi bölge üzerinde `mousedown` + sürükle | En doğal, 1 hareket |
| **Çift Tık Saldırı** | Düşman bölgede `dblclick` | Anında optimal kuvvetle saldır |
| **Shift+Tık Transfer** | Kendi bölge seçiliyken Shift+hedef tıkla | Hızlı transfer, modal yok |
| **Sağ Tık Menü** | `contextmenu` | Küçük bağlam menüsü |

---

## 3. Harita Modları — Tasarım

### 3.1 Mod State'i

`ui.js` içinde modül seviyesinde bir değişken:

```js
// ui.js — dosya başına ekle (~line 32 civarı)
let aktifHaritaModu = "siyasi";  // "siyasi" | "askeri" | "ekonomi"

export function haritaModuAyarla(mod) {
  aktifHaritaModu = mod;
  document.getElementById("istanbul-svg")
    ?.setAttribute("data-mod", mod);
  haritaGuncel();          // tüm ilçe renklerini yeniden çiz
  modLejandGoster(mod);
}
```

SVG'ye `data-mod` attribute'u CSS selectorları için yeterli:

```css
/* index.html <style> bloğuna ekle */

/* === ASKERİ MOD === */
#istanbul-svg[data-mod="askeri"] .ilce-path.biz    { fill: url(#heatmap-biz); }
#istanbul-svg[data-mod="askeri"] .ilce-path.ai1    { fill: url(#heatmap-ai1); }

/* === EKONOMİ MOD === */
#istanbul-svg[data-mod="ekonomi"] .ilce-path       { fill-opacity: 0.6; }
```

---

### 3.2 Mod 1 — Siyasi (Mevcut, Geliştirilmiş)

**Değişiklikler:**
- Konvoy okları SVG'ye eklenir (şu an sadece text badge var)
- İttifak ilişkisi varsa sınır çizgisi rengi değişir

```js
// istanbulSvgGuncel() içine ekle:
if (aktifHaritaModu === "siyasi") {
  cizKonvoyOklari(svg);  // Bkz. Bölüm 5.1
}
```

---

### 3.3 Mod 2 — Askeri

**Gösterilecekler:**
- **Garnizon yoğunluğu:** Bölge fill rengi garnizon sayısına göre 4 ton:
  - `< 5`: Şeffaf (tehlike)
  - `5–15`: Açık ton
  - `15–30`: Orta ton
  - `> 30`: Koyu ton (güçlü)
- **Konvoy okları:** SVG `<line>` + `<marker>` ile animasyonlu ok
- **Garnizon sayısı:** İlçe üzerine büyük font ile rakam
- **Savunma puanı:** `guv + yGuv + savunmaBonus` bölge üzerinde küçük etiket

**Renk Hesabı:**

```js
function askeriTon(bolge) {
  const g = bolge.garnizon || 0;
  const maxG = 40;
  const oran = Math.min(g / maxG, 1.0);
  // owner rengini oran ile koyulaştır
  const baseRenk = { biz: [46,204,113], ai1: [231,76,60], ai2: [155,89,182], ai3: [241,196,15] };
  const [r, g2, b] = baseRenk[bolge.owner] || [153,153,153];
  const alpha = 0.2 + oran * 0.8;
  return `rgba(${r},${g2},${b},${alpha})`;
}
```

**Uygulama (`istanbulSvgGuncel()` içinde):**

```js
if (aktifHaritaModu === "askeri") {
  oyun.bolgeler.forEach(b => {
    const path = istanbulPathCache.get(b.id);
    if (path) path.style.fill = askeriTon(b);
  });
  cizKonvoyOklari(svg);
  cizGarnizonEtiketleri();
}
```

**Görünüm Taslağı:**
```
┌─────────────────────────────────────────┐
│  [Mod: Siyasi] [Askeri ✓] [Ekonomi]     │  ← mod çubuğu
│                                          │
│   Beşiktaş ██████ 28 🛡3.4              │  ← garnizon (28), savunma puanı
│   Beyoğlu  ████░░ 15 🛡1.8              │
│   Sarıyer  ██░░░░  6 🛡0.9              │
│   Şişli    ░░░░░░  2 ⚠️ (tehlikede)     │
│                                          │
│   ──→──→──→  (konvoy oku, 24 asker)     │
└─────────────────────────────────────────┘
```

---

### 3.4 Mod 3 — Ekonomi

**Gösterilecekler:**
- **Gelir ısı haritası:** Yüksek gelirli bölgeler daha parlak (sarı → turuncu → kırmızı)
- **Sadakat rengi:** İlçe sınırı kalınlığı sadakata göre (ince = huzursuz)
- **Bina ikonları:** `🏢🔧📦🩺🧪` — hangi binalar inşa edilmiş
- **Ekonomik kriz:** Mor overlay (kriz bölgeleri)
- **Nüfus barı:** İlçe altında küçük `▓▓▓░░` bar

**Gelir Rengi:**

```js
function ekonomiRenk(bolge) {
  const maxGelir = Math.max(...oyun.bolgeler.map(b => b.gelir));
  const oran = bolge.gelir / maxGelir;
  // Yeşilden turuncuya
  const r = Math.round(46 + oran * (255 - 46));
  const g = Math.round(204 - oran * (204 - 100));
  return `rgb(${r}, ${g}, 30)`;
}
```

**Sadakat Sınırı:**

```js
function sadakatSinirKalinligi(sadakat) {
  if (sadakat >= 70) return "2px solid #2ecc71";
  if (sadakat >= 40) return "2px solid #f39c12";
  if (sadakat >= 20) return "3px solid #e74c3c";
  return "4px dashed #c0392b";  // İsyana hazır — kesik çizgi
}
// SVG için: stroke-width ve stroke-dasharray değişir
```

**Görünüm Taslağı:**
```
┌─────────────────────────────────────────┐
│  [Mod: Siyasi] [Askeri] [Ekonomi ✓]    │
│                                          │
│   Beşiktaş  💰120  🏢🔧  ▓▓▓▓▓ (87) │  ← gelir, binalar, sadakat
│   Beyoğlu   💰 85  🏢    ▓▓▓░░ (55) │
│   Sarıyer   💰 40  —     ▓▓░░░ (32) │
│   Şişli     💰 65  🔧📦  ▓░░░░ (18)⚠ │  ← Huzursuz!
└─────────────────────────────────────────┘
```

---

### 3.5 Mod Çubuğu UI

Harita üstüne sabit konumlu 3 buton:

```html
<!-- index.html — #harita-kap içine ekle -->
<div id="harita-mod-cubugu">
  <button data-mod="siyasi"  class="mod-btn aktif" title="Tuş: 1">🗺️ Siyasi</button>
  <button data-mod="askeri"  class="mod-btn"       title="Tuş: 2">⚔️ Askeri</button>
  <button data-mod="ekonomi" class="mod-btn"       title="Tuş: 3">💰 Ekonomi</button>
</div>
```

```css
#harita-mod-cubugu {
  position: absolute;
  top: 8px; left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 4px;
  z-index: 20;
  background: rgba(0,0,0,0.7);
  padding: 4px 8px;
  border-radius: 8px;
}
.mod-btn { padding: 4px 10px; font-size: 0.8em; cursor: pointer; border-radius: 4px; border: 1px solid #555; background: #222; color: #ccc; }
.mod-btn.aktif { background: #2ecc71; color: #000; border-color: #27ae60; }
```

```js
// ui.js — uiKurulum() içine ekle
document.querySelectorAll(".mod-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mod-btn").forEach(b => b.classList.remove("aktif"));
    btn.classList.add("aktif");
    haritaModuAyarla(btn.getAttribute("data-mod"));
  };
});
// Klavye kısayolları
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  if (e.key === "1") haritaModuAyarla("siyasi");
  if (e.key === "2") haritaModuAyarla("askeri");
  if (e.key === "3") haritaModuAyarla("ekonomi");
});
```

---

### 3.6 Mod Lejandı

Her modda harita altında küçük açıklama kutusu:

```js
function modLejandGoster(mod) {
  const el = document.getElementById("harita-lejand");
  if (!el) return;
  const lejandlar = {
    siyasi:  `<span class="lejand-biz">■</span> Senin  <span class="lejand-ai1">■</span> AI1  <span class="lejand-ai2">■</span> AI2  <span class="lejand-ai3">■</span> AI3  <span class="lejand-tar">■</span> Tarafsız`,
    askeri:  `<span>░ Zayıf</span> → <span>█ Güçlü</span> garnizon &nbsp;|&nbsp; ──→ Konvoy hareketi`,
    ekonomi: `<span>🟡 Yüksek gelir</span> &nbsp;|&nbsp; Sınır kalınlığı = sadakat &nbsp;|&nbsp; ⚠️ İsyan riski`,
  };
  el.innerHTML = lejandlar[mod] || "";
}
```

---

## 4. Hızlı Hareket — Sürükle-Bırak

Bu en kritik iyileştirme. SVG üzerinde `mousedown → mousemove → mouseup` akışı.

### 4.1 Drag State

```js
// ui.js — dosya başına ekle
let dragState = null;
// dragState = {
//   aktif: true,
//   kaynakId: 5,
//   gecerliHedefler: Set([3, 7, 12]),  // komşu biz bölgeleri + saldırılabilir bölgeler
//   ghostEl: SVGElement,               // sürükleme sırasında izi
// };
```

### 4.2 SVG'ye Event Bağlama

**Dosya:** `ui.js` — `istanbulEtkilesimBagla()` fonksiyonu içine ekle

```js
function hizliHareketDragBagla(svgKap, svg) {
  let suruklemeBasladi = false;
  let basX, basY;

  svg.addEventListener("mousedown", (e) => {
    const path = e.target.closest("[data-id]");
    if (!path) return;
    const bolgeId = parseInt(path.getAttribute("data-id"));
    const bolge = bolgeById(bolgeId);

    // Sadece kendi bölgelerinde drag başlatılabilir
    if (!bolge || bolge.owner !== "biz") return;
    if ((bolge.garnizon || 0) <= 0 && !yiginVarMi(bolgeId)) return;

    basX = e.clientX; basY = e.clientY;
    suruklemeBasladi = false;

    dragState = {
      aktif: false,  // mousemove'da true olacak (hareket varsa)
      kaynakId: bolgeId,
      gecerliHedefler: gecerliHedeflerHesapla(bolgeId),
      ghostEl: null,
    };

    e.preventDefault();
  });

  svg.addEventListener("mousemove", (e) => {
    if (!dragState) return;
    const dx = e.clientX - basX, dy = e.clientY - basY;
    if (!dragState.aktif && Math.hypot(dx, dy) > 8) {
      dragState.aktif = true;
      gecerliHedefleriVurgula(dragState.gecerliHedefler, true);
      dragGhostOlustur(svg, dragState);
    }
    if (dragState.aktif) {
      dragGhostGuncelle(e, svg, dragState);
    }
  });

  svg.addEventListener("mouseup", (e) => {
    if (!dragState?.aktif) { dragState = null; return; }

    const path = e.target.closest("[data-id]");
    const hedefId = path ? parseInt(path.getAttribute("data-id")) : null;

    gecerliHedefleriVurgula(dragState.gecerliHedefler, false);
    dragGhostKaldir(dragState);

    if (hedefId && dragState.gecerliHedefler.has(hedefId)) {
      dragHareketOnayla(dragState.kaynakId, hedefId);
    }
    dragState = null;
  });

  // Parmak desteği (tablet)
  svg.addEventListener("touchstart", (e) => { /* mousedown'ı simüle et */ }, { passive: false });
  svg.addEventListener("touchmove",  (e) => { e.preventDefault(); /* mousemove simüle */ }, { passive: false });
  svg.addEventListener("touchend",   (e) => { /* mouseup simüle */ });
}
```

### 4.3 Geçerli Hedefler

```js
function gecerliHedeflerHesapla(kaynakId) {
  const hedefler = new Set();
  const komsular = oyun.komsu[kaynakId] || [];
  komsular.forEach(id => {
    const b = bolgeById(id);
    if (!b) return;
    if (b.owner === "biz") hedefler.add(id);           // Transfer
    if (b.owner !== "tarafsiz") hedefler.add(id);      // Saldırı (tarafsıza saldırı yok)
    // İttifak geçişi (Katman 2 varsa):
    // if (isDostCete("biz", b.owner)) hedefler.add(id);
  });
  return hedefler;
}
```

### 4.4 Görsel Vurgulama

```js
function gecerliHedefleriVurgula(hedefler, aktif) {
  oyun.bolgeler.forEach(b => {
    const path = istanbulPathCache.get(b.id);
    if (!path) return;
    if (aktif && hedefler.has(b.id)) {
      path.classList.add("drag-hedef");   // CSS animasyonu
    } else {
      path.classList.remove("drag-hedef");
    }
  });
  // Kaynak bölgeyi de vurgula
}
```

```css
/* Drag hedef vurgusu */
.ilce-path.drag-hedef {
  stroke: #f1c40f;
  stroke-width: 3;
  filter: brightness(1.4);
  cursor: crosshair;
  animation: hedef-nabiz 0.8s ease-in-out infinite alternate;
}
@keyframes hedef-nabiz {
  from { stroke-opacity: 0.6; }
  to   { stroke-opacity: 1.0; }
}
.ilce-path.drag-kaynak {
  stroke: #fff;
  stroke-width: 2;
  stroke-dasharray: 4 2;
}
```

### 4.5 Ghost Asker İzi

Sürüklerken fareyi takip eden hayalet görsel:

```js
function dragGhostOlustur(svg, state) {
  const NS = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(NS, "g");
  g.id = "drag-ghost";
  g.setAttribute("pointer-events", "none");

  const daire = document.createElementNS(NS, "circle");
  daire.setAttribute("r", "18");
  daire.setAttribute("fill", "rgba(46,204,113,0.85)");
  daire.setAttribute("stroke", "#fff");
  daire.setAttribute("stroke-width", "2");

  const yazi = document.createElementNS(NS, "text");
  yazi.setAttribute("text-anchor", "middle");
  yazi.setAttribute("dominant-baseline", "middle");
  yazi.setAttribute("fill", "#fff");
  yazi.setAttribute("font-size", "12");
  const b = bolgeById(state.kaynakId);
  yazi.textContent = `🚶 ${b?.garnizon || 0}`;

  g.appendChild(daire);
  g.appendChild(yazi);
  svg.appendChild(g);
  state.ghostEl = g;
}

function dragGhostGuncelle(e, svg, state) {
  if (!state.ghostEl) return;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
  state.ghostEl.setAttribute("transform", `translate(${svgP.x}, ${svgP.y})`);
}
```

### 4.6 Onay Dialogu (Hızlı)

```js
async function dragHareketOnayla(kaynakId, hedefId) {
  const kaynak = bolgeById(kaynakId);
  const hedef  = bolgeById(hedefId);
  const mevcut = (kaynak.garnizon || 0);

  if (hedef.owner === "biz") {
    // Transfer → direkt gönder, sorma
    import("./actions.js").then(m => m.hizliTransfer(kaynakId, hedefId, mevcut));
    return;
  }

  // Saldırı → minimal dialog (slider ile)
  const onay = await showHizliSaldiriDialog(kaynak, hedef, mevcut);
  if (!onay) return;
  import("./actions.js").then(m => m.hizliSaldiri(kaynakId, hedefId, onay.adet));
}
```

**Hızlı saldırı dialog'u** (mevcut `showAlert` yerine daha kompakt):

```
┌─────────────────────────────┐
│  Beşiktaş → Şişli (AI1)     │
│  Garnizon: ██████████  28   │
│  Gönder:  [────●────] 18    │  ← slider
│  Tahmini kazanma: %67        │
│  [İptal]           [Saldır] │
└─────────────────────────────┘
```

---

## 5. Hızlı Hareket — Diğer Yöntemler

### 5.1 Çift Tık ile Hızlı Saldırı

**Dosya:** `ui.js` — `istanbulEtkilesimBagla()` içine ekle

```js
// Mevcut tıklama event'ine çift tık ekle
path.addEventListener("dblclick", (e) => {
  const bolgeId = parseInt(path.getAttribute("data-id"));
  const b = bolgeById(bolgeId);
  if (!b || b.owner === "biz" || b.owner === "tarafsiz") return;

  // Optimal kuvvetle anında saldırı (saldiriHizliAcil benzeri)
  import("./actions.js").then(m => m.saldiriHizliAcil(bolgeId));
  e.stopPropagation();
});
```

*`saldiriHizliAcil()` zaten `actions.js:693`'te mevcut!*  
Sadece SVG için event bağlama eklemek yeterli.

---

### 5.2 Shift+Tık Transfer (Komşu Kendi Bölgeler Arası)

Bir kendi bölge seçiliyken, Shift+tık ile komşu kendi bölgeye anında transfer:

```js
// Mevcut tıklama handler'ına ekle (istanbulEtkilesimBagla içinde)
path.addEventListener("click", (e) => {
  const bolgeId = parseInt(path.getAttribute("data-id"));

  if (e.shiftKey && oyun.seciliId && oyun.seciliId !== bolgeId) {
    const secili = bolgeById(oyun.seciliId);
    const hedef  = bolgeById(bolgeId);
    if (secili?.owner === "biz" && hedef?.owner === "biz" &&
        komsuMu(oyun.seciliId, bolgeId)) {
      import("./actions.js").then(m => m.hizliTransfer(oyun.seciliId, bolgeId));
      return;
    }
  }
  // Normal tıklama (mevcut kod)
  onBolgeSec(bolgeId);
});
```

---

### 5.3 Sağ Tık Bağlam Menüsü

```js
// istanbulEtkilesimBagla içine ekle
svg.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const path = e.target.closest("[data-id]");
  if (!path) return;
  const bolgeId = parseInt(path.getAttribute("data-id"));
  baglamMenusuGoster(e.clientX, e.clientY, bolgeId);
});
```

```js
function baglamMenusuGoster(x, y, bolgeId) {
  baglamMenusuKapat();  // Önceki menüyü kapat
  const b = bolgeById(bolgeId);
  if (!b) return;

  const menu = document.createElement("div");
  menu.id = "baglamMenusu";
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;
    background:#1a1a2e;border:1px solid #444;border-radius:6px;
    padding:4px 0;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.6)`;

  const maddeler = baglamMenuMaddeleri(b);
  maddeler.forEach(m => {
    const btn = document.createElement("button");
    btn.textContent = m.etiket;
    btn.style.cssText = `display:block;width:100%;text-align:left;
      padding:6px 12px;background:none;border:none;color:#ccc;cursor:pointer`;
    btn.onmouseenter = () => btn.style.background = "#2d2d44";
    btn.onmouseleave = () => btn.style.background = "none";
    btn.onclick = () => { m.aksiyon(); baglamMenusuKapat(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  document.addEventListener("click", baglamMenusuKapat, { once: true });
}

function baglamMenuMaddeleri(b) {
  if (b.owner === "biz") {
    const g = b.garnizon || 0;
    return [
      { etiket: `⚔️ Tüm kuvvetle saldır (${g})`, aksiyon: () => baglamSaldiriEmri(b.id) },
      { etiket: `🛡️ Garnizon ayarla`,             aksiyon: () => baglamGarnizonAyarla(b.id) },
      { etiket: `📍 Toplanma noktası yap`,         aksiyon: () => import("./actions.js").then(m => m.toplanmaNoktasiYap()) },
      { etiket: `🔍 Keşif gönder`,                 aksiyon: () => import("./actions.js").then(m => m.casuslukOperasyon(b.id, "kesif")) },
    ];
  }
  if (b.owner === "tarafsiz") {
    return [
      { etiket: `💰 Rüşvetle satın al`,            aksiyon: () => import("./actions.js").then(m => m.rusvet()) },
    ];
  }
  // Düşman bölge:
  return [
    { etiket: `⚡ Hızlı saldırı`,                  aksiyon: () => import("./actions.js").then(m => m.saldiriHizliAcil(b.id)) },
    { etiket: `⚔️ Saldırı planla (gelişmiş)`,      aksiyon: () => import("./actions.js").then(m => m.saldiri()) },
    { etiket: `🗡️ Suikast`,                        aksiyon: () => import("./actions.js").then(m => m.casuslukOperasyon(b.id, "suikast")) },
    { etiket: `🔍 Keşif yap`,                      aksiyon: () => import("./actions.js").then(m => m.casuslukOperasyon(b.id, "kesif")) },
  ];
}
```

---

## 6. Konvoy Okları (Tüm Modlarda)

Şu an konvoylar sadece text badge ile gösteriliyor. SVG'ye gerçek oklar ekleyelim.

```js
function cizKonvoyOklari(svg) {
  // Önceki okları temizle
  document.getElementById("konvoy-oklar-grup")?.remove();
  const NS = "http://www.w3.org/2000/svg";

  // Ok başı marker tanımı (defs'e bir kez eklenir)
  if (!document.getElementById("marker-ok")) {
    const defs = svg.querySelector("defs");
    const marker = document.createElementNS(NS, "marker");
    marker.id = "marker-ok";
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("refX", "5");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    const okUc = document.createElementNS(NS, "path");
    okUc.setAttribute("d", "M0,0 L0,6 L6,3 z");
    okUc.setAttribute("fill", "#f1c40f");
    marker.appendChild(okUc);
    defs.appendChild(marker);
  }

  const grup = document.createElementNS(NS, "g");
  grup.id = "konvoy-oklar-grup";
  grup.setAttribute("pointer-events", "none");

  oyun.birimler.forEach(k => {
    if (!k.hedefId || k.konumId === k.hedefId) return;
    const kaynak = ilceMerkezi(k.konumId);
    const hedef  = ilceMerkezi(k.hedefId);
    if (!kaynak || !hedef) return;

    const cizgi = document.createElementNS(NS, "line");
    cizgi.setAttribute("x1", kaynak.cx);
    cizgi.setAttribute("y1", kaynak.cy);
    cizgi.setAttribute("x2", hedef.cx);
    cizgi.setAttribute("y2", hedef.cy);
    cizgi.setAttribute("class", `konvoy-ok konvoy-ok-${k.owner}`);
    cizgi.setAttribute("marker-end", "url(#marker-ok)");
    cizgi.setAttribute("stroke-dasharray", "6 3");

    // Adet etiketi (çizginin ortasında)
    const mx = (kaynak.cx + hedef.cx) / 2;
    const my = (kaynak.cy + hedef.cy) / 2;
    const etiket = document.createElementNS(NS, "text");
    etiket.setAttribute("x", mx);
    etiket.setAttribute("y", my - 5);
    etiket.setAttribute("text-anchor", "middle");
    etiket.setAttribute("class", "konvoy-ok-etiket");
    etiket.textContent = `${k.adet}`;

    grup.appendChild(cizgi);
    grup.appendChild(etiket);
  });

  // İlçe grup'tan sonra, label grup'tan önce ekle
  const labelGrup = document.getElementById("label-grup");
  svg.insertBefore(grup, labelGrup);
}

function ilceMerkezi(bolgeId) {
  const ilce = ISTANBUL_ILCELER[bolgeId];
  if (!ilce) return null;
  return ilceEtiketKonumu(ilce);  // {cx, cy} döner
}
```

```css
.konvoy-ok { stroke-width: 2; opacity: 0.85; }
.konvoy-ok-biz  { stroke: #2ecc71; }
.konvoy-ok-ai1  { stroke: #e74c3c; }
.konvoy-ok-ai2  { stroke: #9b59b6; }
.konvoy-ok-ai3  { stroke: #f1c40f; }
.konvoy-ok-etiket { fill: #fff; font-size: 10px; font-weight: bold; }
```

---

## 7. `actions.js`'e Eklenecek Hızlı Fonksiyonlar

### 7.1 `hizliTransfer(kaynakId, hedefId)`

```js
export async function hizliTransfer(kaynakId, hedefId) {
  const kaynak = bolgeById(kaynakId);
  const hedef  = bolgeById(hedefId);
  if (!kaynak || !hedef || kaynak.owner !== "biz" || hedef.owner !== "biz") return;
  if (!komsuMu(kaynakId, hedefId)) return;

  const adet = kaynak.garnizon || 0;
  if (adet <= 0) { await showAlert("Transfer için asker yok."); return; }

  const rota = [kaynakId, hedefId];
  const tasitPlan = tasitKombinasyonuBul(adet, ...bolgeTasitVektor(kaynak));
  if (!tasitPlan) { await showAlert("Taşıt yetersiz."); return; }

  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: "biz", adet, tip: "tetikci",
    konumId: kaynakId, hedefId,
    rota: [], _hazir: false,
    tasitAraba: tasitPlan.araba, tasitMotor: tasitPlan.motor,
  });
  kaynak.garnizon = 0;
  logYaz(`Hızlı transfer: ${kaynak.ad} → ${hedef.ad} (${adet} asker)`);
  sesCal("yatirim");
  uiGuncel(aktifCallbacklar);
}
```

### 7.2 `hizliSaldiri(kaynakId, hedefId, adet)`

`saldiri()` fonksiyonunun (`actions.js:260`) parametreli, dialog-sız versiyonu.  
Mevcut kodu refactor etmek yerine, ortak bir `_konvoyCikisSagla(kaynakId, hedefId, adet)` iç fonksiyon çıkartılabilir:

```js
// İç yardımcı — hem saldiri() hem hizliSaldiri() kullanır
async function _konvoyOlusturVeGonder(kaynakId, hedefId, adet) {
  const kaynak = bolgeById(kaynakId);
  const rota = kisaRota(kaynakId, hedefId);
  if (!rota || rota.length < 2) return false;

  const tasitPlan = tasitKombinasyonuBul(adet, ...bolgeTasitVektor(kaynak));
  if (!tasitPlan) { await showAlert("Taşıt kapasitesi yetersiz."); return false; }

  bolgeTasitKes(kaynak, tasitPlan);
  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: "biz", adet, tip: "tetikci",
    konumId: rota[0], hedefId: rota[1] || rota[0],
    rota: rota.slice(2), _hazir: false,
    tasitAraba: tasitPlan.araba, tasitMotor: tasitPlan.motor,
  });
  return true;
}

export async function hizliSaldiri(kaynakId, hedefId, adet) {
  const basarili = await _konvoyOlusturVeGonder(kaynakId, hedefId, adet);
  if (basarili) {
    logYaz(`Hızlı saldırı: ${bolgeById(kaynakId).ad} → ${bolgeById(hedefId).ad} (${adet})`);
    konvoyBaslaAnimasyonu(kaynakId);
    uiGuncel(aktifCallbacklar);
  }
}
```

---

## 8. Uygulama Sırası

| # | İş | Zorluk | Dosyalar | Etki |
|---|---|---|---|---|
| 1 | Mod çubuğu HTML + CSS | Kolay | `index.html` | Görsel |
| 2 | `aktifHaritaModu` state + `haritaModuAyarla()` | Kolay | `ui.js` | Altyapı |
| 3 | Klavye kısayolları (1/2/3) | Kolay | `ui.js` | UX |
| 4 | Askeri mod renk hesabı | Orta | `ui.js` | Görsel |
| 5 | Ekonomi mod renk + sadakat sınırı | Orta | `ui.js` | Görsel |
| 6 | Konvoy okları SVG | Orta | `ui.js` | Görsel |
| 7 | Sağ tık bağlam menüsü | Orta | `ui.js` | UX |
| 8 | Çift tık hızlı saldırı | Kolay | `ui.js` | UX |
| 9 | Shift+tık transfer | Kolay | `ui.js`, `actions.js` | UX |
| 10 | Sürükle-bırak altyapısı | Zor | `ui.js` | UX |
| 11 | Drag ghost + vurgulama CSS | Orta | `ui.js`, CSS | UX |
| 12 | Hızlı saldırı dialog (slider) | Orta | `modal.js` veya `ui.js` | UX |
| 13 | `hizliTransfer()` + `hizliSaldiri()` | Orta | `actions.js` | Oyun |
| 14 | Touch desteği (tablet) | Zor | `ui.js` | UX |

**Öneri:** 1–6 arası tek oturumda (harita modları + konvoy okları).  
7–9 arası ikinci oturumda (hızlı tıklama yöntemleri).  
10–14 üçüncü oturumda (drag & drop tam uygulama).

---

## 9. Edge Case'ler

| Durum | Çözüm |
|---|---|
| Oyun duraklatılmışken drag başlatılırsa | `dragState` izin verme, `if (oyun.duraklat) return` |
| Taşıt yokken transfer | `hizliTransfer()` içinde kontrol, `showAlert` |
| Drag sırasında tur ilerler (oyun hızlıysa) | `mouseup`ta geçerli hedef tekrar doğrula |
| Bağlam menüsü açıkken tıklanırsa | `document.click` listener → `baglamMenusuKapat()` |
| Askeri modda garnizon 0 olan bölge | Şeffaf fill, `⚠️` ikonu, pulsing animation |
| Zoom'da drag koordinatı | SVG `getScreenCTM().inverse()` matrix dönüşümü gerekli (zaten ghost kodunda var) |

---

## 10. Özet: Haritada Ne Değişecek

**Önce:**
```
Tıkla → Panel → Buton → Tıkla → Buton   (4-5 adım, ~5 sn)
```

**Sonra:**
```
Sürükle → Bırak → Slider              (1 hareket, ~1 sn)
Çift tıkla                             (1 tıklama, anında)
Sağ tıkla → Menü                       (2 tıklama, ~0.5 sn)
Shift+Tıkla                            (1 tıklama, anında)
```

**Harita görsel katmanları:**
```
[1] Siyasi   → sahiplik + konvoy okları
[2] Askeri   → garnizon ısı haritası + ok animasyonları
[3] Ekonomi  → gelir + sadakat + binalar
```
