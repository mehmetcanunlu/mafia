import {
  oyun,
  bolgeById,
  fraksiyonAdi,
  bizBolgeSayisi,
  rozetSayilari,
} from "./state.js";
import { komsuMu } from "./map.js";
import { BOLGE_OZELLIKLERI, AYAR, BINA_TIPLERI } from "./config.js";
import { istatistikGrafik } from "./stats.js";
import { ISTANBUL_ILCELER, KOPRULER } from "./istanbul.js";
import { sadakatRenk, sadakatEtiket } from "./loyalty.js";
import { BIRIM_TIPLERI, TASIT_TIPLERI, ownerBakimToplami } from "./units.js";
import {
  ARASTIRMA_DALLARI,
  dalIlerleme,
  arastirmaDalDegistir,
  arastirmaEfekt,
  arastirmaPuanDetayi,
  arastirmaDurumunuDogrula,
} from "./research.js";
import { kesifAktifMi, operasyonMumkunMu } from "./spy.js";
import { bolgeTasitDurumu, ownerToplamKapasite, ownerToplamTasit } from "./logistics.js";

export function logYaz(msg) {
  const p = document.getElementById("log");
  const d = document.createElement("div");
  d.textContent = `[${oyun.tur}. tur] ${msg}`;
  p.insertBefore(d, p.firstChild);
}

let aktifSagSekme = "detay";
let sonSeciliBolgeId = null;
let arastirmaSayfaAcik = false;
let arastirmaSayfaFiltre = "tum";
let aktifCallbacklar = null;
const ISTANBUL_VIEWBOX = Object.freeze({
  x: 0,
  y: 0,
  w: 870,
  h: 580,
  maxZoom: 5,
});
let istanbulKamera = {
  x: ISTANBUL_VIEWBOX.x,
  y: ISTANBUL_VIEWBOX.y,
  w: ISTANBUL_VIEWBOX.w,
  h: ISTANBUL_VIEWBOX.h,
};
let istanbulSuruklemePx = 0;
let istanbulEtiketFitTimer = null;
const istanbulPathCache = new Map();
const istanbulLabelCache = new Map();
const istanbulPoligonCache = new Map();
const ISTANBUL_TIK_SURUKLEME_ESIK = 8;
const ILCE_KISA_ADLAR = Object.freeze({
  gaziosmanpasa: "GOP",
  kucukcekmece: "K.Çek.",
  bahcelievler: "Bahç.",
  zeytinburnu: "Z.Burnu",
  beylikduzu: "B.Düzü",
  sultanbeyli: "S.Beyli",
});

function istanbulDomCacheSifirla() {
  if (istanbulEtiketFitTimer) {
    clearTimeout(istanbulEtiketFitTimer);
    istanbulEtiketFitTimer = null;
  }
  istanbulPathCache.clear();
  istanbulLabelCache.clear();
}

function sayiyiSinirla(deger, min, max) {
  return Math.max(min, Math.min(max, deger));
}

function istanbulKameraSifirla() {
  istanbulKamera = {
    x: ISTANBUL_VIEWBOX.x,
    y: ISTANBUL_VIEWBOX.y,
    w: ISTANBUL_VIEWBOX.w,
    h: ISTANBUL_VIEWBOX.h,
  };
}

function istanbulKameraSinirla() {
  const minW = ISTANBUL_VIEWBOX.w / ISTANBUL_VIEWBOX.maxZoom;
  const maxW = ISTANBUL_VIEWBOX.w;
  istanbulKamera.w = sayiyiSinirla(istanbulKamera.w, minW, maxW);
  istanbulKamera.h = (istanbulKamera.w * ISTANBUL_VIEWBOX.h) / ISTANBUL_VIEWBOX.w;

  const maxX = ISTANBUL_VIEWBOX.x + ISTANBUL_VIEWBOX.w - istanbulKamera.w;
  const maxY = ISTANBUL_VIEWBOX.y + ISTANBUL_VIEWBOX.h - istanbulKamera.h;
  istanbulKamera.x = sayiyiSinirla(istanbulKamera.x, ISTANBUL_VIEWBOX.x, Math.max(ISTANBUL_VIEWBOX.x, maxX));
  istanbulKamera.y = sayiyiSinirla(istanbulKamera.y, ISTANBUL_VIEWBOX.y, Math.max(ISTANBUL_VIEWBOX.y, maxY));
}

function istanbulViewBoxUygula(svg) {
  if (!svg) return;
  istanbulKameraSinirla();
  svg.setAttribute(
    "viewBox",
    `${istanbulKamera.x.toFixed(2)} ${istanbulKamera.y.toFixed(2)} ${istanbulKamera.w.toFixed(2)} ${istanbulKamera.h.toFixed(2)}`
  );
}

function istanbulEkranToDunya(svg, clientX, clientY) {
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const rx = (clientX - rect.left) / rect.width;
  const ry = (clientY - rect.top) / rect.height;
  return {
    x: istanbulKamera.x + rx * istanbulKamera.w,
    y: istanbulKamera.y + ry * istanbulKamera.h,
  };
}

function ilceEtiketOlcegi(ilce, secili = false) {
  const zoom = ISTANBUL_VIEWBOX.w / istanbulKamera.w;
  const bbox = ilce?.bbox;
  const bboxW = bbox ? Math.max(1, bbox.maxX - bbox.minX) : 42;
  const bboxH = bbox ? Math.max(1, bbox.maxY - bbox.minY) : 30;
  const alan = bbox ? Math.max(1, (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)) : 1800;
  const sekilOrani = Math.min(bboxW, bboxH) / Math.max(bboxW, bboxH);
  const sekilCarpani = sekilOrani < 0.34 ? 0.78 : sekilOrani < 0.48 ? 0.88 : 1.0;
  const alanCarpani = alan < 900 ? 0.76 : alan < 1500 ? 0.88 : alan < 2600 ? 1.0 : 1.12;
  const zoomCarpani = sayiyiSinirla(1 / Math.pow(Math.max(1, zoom), 0.88), 0.24, 1.0);
  const adBoyut = sayiyiSinirla(6.2 * alanCarpani * zoomCarpani * sekilCarpani, 1.1, 6.5);
  const adGoster = true;
  return {
    adBoyut,
    adGoster,
  };
}

function ilceDarMi(ilce) {
  const bbox = ilce?.bbox;
  if (!bbox) return false;
  const w = Math.max(1, bbox.maxX - bbox.minX);
  const h = Math.max(1, bbox.maxY - bbox.minY);
  const minSpan = Math.min(w, h);
  const oran = minSpan / Math.max(w, h);
  return minSpan < 24 || (w < 36 && h < 30) || oran < 0.42;
}

function varsayilanKisaAd(ad) {
  if (!ad || ad.length <= 8) return ad;
  const parcalar = ad.split(" ").filter(Boolean);
  if (parcalar.length >= 2) {
    return parcalar.map((p) => `${p[0]}.`).join("");
  }
  return `${ad.slice(0, 5)}.`;
}

function ilceKisaAdi(bolge) {
  const tamAd = bolge?.ad || "";
  if (!tamAd) return "";
  return ILCE_KISA_ADLAR[bolge.id] || varsayilanKisaAd(tamAd) || tamAd;
}

function ilceEtiketKonumu(ilce) {
  const labelOffset = ilce.labelOffset || { x: 0, y: 0 };
  const referans = ilce.labelPoint || ilce.center;
  let cx = referans.x + (labelOffset.x || 0);
  let cy = referans.y + (labelOffset.y || 0);
  const bbox = ilce.bbox;
  if (bbox) {
    const bboxW = Math.max(1, bbox.maxX - bbox.minX);
    const bboxH = Math.max(1, bbox.maxY - bbox.minY);
    const marginX = Math.min(7, Math.max(1.8, bboxW * 0.07));
    const marginY = Math.min(7, Math.max(1.8, bboxH * 0.08));
    cx = sayiyiSinirla(cx, bbox.minX + marginX, bbox.maxX - marginX);
    cy = sayiyiSinirla(cy, bbox.minY + marginY, bbox.maxY - marginY);
  }
  return { cx, cy };
}

function pathPoligonlariniCoz(svgPath) {
  if (typeof svgPath !== "string" || !svgPath.trim()) return [];
  const poligonlar = [];
  const bolumler = svgPath.split(/z/i);
  bolumler.forEach((bolum) => {
    const noktalar = [];
    const eslesmeler = bolum.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g);
    for (const eslesme of eslesmeler) {
      const x = Number(eslesme[1]);
      const y = Number(eslesme[2]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        noktalar.push({ x, y });
      }
    }
    if (noktalar.length >= 3) poligonlar.push(noktalar);
  });
  return poligonlar;
}

function ilcePoligonlariniGetir(ilce) {
  if (!ilce?.svgPath) return [];
  if (istanbulPoligonCache.has(ilce.svgPath)) {
    return istanbulPoligonCache.get(ilce.svgPath);
  }
  const poligonlar = pathPoligonlariniCoz(ilce.svgPath);
  istanbulPoligonCache.set(ilce.svgPath, poligonlar);
  return poligonlar;
}

function kopruIlceKenarNoktasi(ilce, merkez, ux, uy, iceriPay = 2.4) {
  if (!merkez) return null;
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;

  let t = Number.POSITIVE_INFINITY;
  const poligonlar = ilcePoligonlariniGetir(ilce);
  for (const poligon of poligonlar) {
    for (let i = 0; i < poligon.length; i += 1) {
      const p1 = poligon[i];
      const p2 = poligon[(i + 1) % poligon.length];
      const sx = p2.x - p1.x;
      const sy = p2.y - p1.y;
      const payda = cross(ux, uy, sx, sy);
      if (Math.abs(payda) < 1e-7) continue;

      const rx = p1.x - merkez.x;
      const ry = p1.y - merkez.y;
      const adayT = cross(rx, ry, sx, sy) / payda;
      const segOran = cross(rx, ry, ux, uy) / payda;
      if (adayT >= 0 && segOran >= 0 && segOran <= 1) {
        t = Math.min(t, adayT);
      }
    }
  }

  const bbox = ilce?.bbox;
  if (!Number.isFinite(t) && bbox) {
    if (Math.abs(ux) > 1e-6) {
      const tx = ux > 0 ? (bbox.maxX - merkez.x) / ux : (bbox.minX - merkez.x) / ux;
      if (Number.isFinite(tx) && tx > 0) t = Math.min(t, tx);
    }
    if (Math.abs(uy) > 1e-6) {
      const ty = uy > 0 ? (bbox.maxY - merkez.y) / uy : (bbox.minY - merkez.y) / uy;
      if (Number.isFinite(ty) && ty > 0) t = Math.min(t, ty);
    }
  }

  if (!Number.isFinite(t)) {
    return { x: merkez.x, y: merkez.y };
  }

  const adim = Math.max(0, t - iceriPay);
  return {
    x: merkez.x + ux * adim,
    y: merkez.y + uy * adim,
  };
}

function kopruMinimumMesafeUygula(am, bm, taban, minMesafe = 16) {
  if (!am || !bm || !taban) return taban;
  const dx = taban.x2 - taban.x1;
  const dy = taban.y2 - taban.y1;
  const mesafe = Math.hypot(dx, dy);
  if (!Number.isFinite(mesafe) || mesafe >= minMesafe || mesafe < 1e-6) {
    return taban;
  }
  const ux = (bm.x - am.x) / Math.max(1e-6, Math.hypot(bm.x - am.x, bm.y - am.y));
  const uy = (bm.y - am.y) / Math.max(1e-6, Math.hypot(bm.x - am.x, bm.y - am.y));
  const fark = (minMesafe - mesafe) / 2;
  return {
    x1: taban.x1 - ux * fark,
    y1: taban.y1 - uy * fark,
    x2: taban.x2 + ux * fark,
    y2: taban.y2 + uy * fark,
  };
}

function kopruKoordinatlari(kopru) {
  const a = kopru?.avrupa ? ISTANBUL_ILCELER[kopru.avrupa] : null;
  const b = kopru?.asya ? ISTANBUL_ILCELER[kopru.asya] : null;
  if (!a || !b) {
    if (
      Number.isFinite(kopru?.x1) &&
      Number.isFinite(kopru?.y1) &&
      Number.isFinite(kopru?.x2) &&
      Number.isFinite(kopru?.y2)
    ) {
      return { x1: kopru.x1, y1: kopru.y1, x2: kopru.x2, y2: kopru.y2 };
    }
    return null;
  }

  const avrupaOffset = kopru.avrupaOffset || { x: 0, y: 0 };
  const asyaOffset = kopru.asyaOffset || { x: 0, y: 0 };
  const am = {
    x: (a.labelPoint?.x ?? a.center.x) + (avrupaOffset.x || 0),
    y: (a.labelPoint?.y ?? a.center.y) + (avrupaOffset.y || 0),
  };
  const bm = {
    x: (b.labelPoint?.x ?? b.center.x) + (asyaOffset.x || 0),
    y: (b.labelPoint?.y ?? b.center.y) + (asyaOffset.y || 0),
  };

  const dx = bm.x - am.x;
  const dy = bm.y - am.y;
  const mesafe = Math.hypot(dx, dy);
  if (!Number.isFinite(mesafe) || mesafe < 1e-3) {
    return { x1: am.x, y1: am.y, x2: bm.x, y2: bm.y };
  }
  const ux = dx / mesafe;
  const uy = dy / mesafe;

  const aKenar = kopruIlceKenarNoktasi(a, am, ux, uy);
  const bKenar = kopruIlceKenarNoktasi(b, bm, -ux, -uy);
  const tabanHam = aKenar && bKenar ? { x1: aKenar.x, y1: aKenar.y, x2: bKenar.x, y2: bKenar.y } : {
    x1: am.x,
    y1: am.y,
    x2: bm.x,
    y2: bm.y,
  };
  const taban = kopruMinimumMesafeUygula(am, bm, tabanHam, Number.isFinite(kopru.minMesafe) ? kopru.minMesafe : 16);

  const kaydir = Number.isFinite(kopru.kaydir) ? kopru.kaydir : 0;
  if (!kaydir) return taban;
  const px = -uy;
  const py = ux;
  return {
    x1: taban.x1 + px * kaydir,
    y1: taban.y1 + py * kaydir,
    x2: taban.x2 + px * kaydir,
    y2: taban.y2 + py * kaydir,
  };
}

function etiketNoktasiniPoligonIcineTasi(svg, bolgeId, x, y) {
  const path =
    istanbulPathCache.get(bolgeId) || svg?.querySelector(`#ilce-${bolgeId}`) || null;
  if (path && !istanbulPathCache.has(bolgeId)) istanbulPathCache.set(bolgeId, path);
  if (!path || typeof path.isPointInFill !== "function") return { x, y };

  const p = svg.createSVGPoint();
  p.x = x;
  p.y = y;
  if (path.isPointInFill(p)) return { x, y };

  const adim = 4;
  const maxYariCap = 72;
  for (let r = adim; r <= maxYariCap; r += adim) {
    const ornek = Math.max(8, Math.floor((2 * Math.PI * r) / adim));
    for (let i = 0; i < ornek; i += 1) {
      const a = (i / ornek) * Math.PI * 2;
      const nx = x + Math.cos(a) * r;
      const ny = y + Math.sin(a) * r;
      p.x = nx;
      p.y = ny;
      if (path.isPointInFill(p)) return { x: nx, y: ny };
    }
  }

  return { x, y };
}

function etiketKutusuIcerideMi(svg, path, labelEl) {
  if (!svg || !path || !labelEl || typeof path.isPointInFill !== "function") return true;
  const bb = labelEl.getBBox();
  const p = svg.createSVGPoint();
  const ornekler = [
    [bb.x, bb.y],
    [bb.x + bb.width, bb.y],
    [bb.x, bb.y + bb.height],
    [bb.x + bb.width, bb.y + bb.height],
    [bb.x + bb.width / 2, bb.y + bb.height / 2],
  ];
  for (const [x, y] of ornekler) {
    p.x = x;
    p.y = y;
    if (!path.isPointInFill(p)) return false;
  }
  return true;
}

function ilceEtiketiniOturt(svg, bolgeId, ilce, labelEl) {
  const path =
    istanbulPathCache.get(bolgeId) || svg?.querySelector(`#ilce-${bolgeId}`) || null;
  if (path && !istanbulPathCache.has(bolgeId)) istanbulPathCache.set(bolgeId, path);
  if (!svg || !path || !labelEl) return;
  const ilkX = Number(labelEl.getAttribute("x"));
  const ilkY = Number(labelEl.getAttribute("y"));
  if (!Number.isFinite(ilkX) || !Number.isFinite(ilkY)) return;

  if (etiketKutusuIcerideMi(svg, path, labelEl)) return;
  const merkez = etiketNoktasiniPoligonIcineTasi(svg, bolgeId, ilkX, ilkY);
  labelEl.setAttribute("x", merkez.x.toFixed(1));
  labelEl.setAttribute("y", merkez.y.toFixed(1));

  if (etiketKutusuIcerideMi(svg, path, labelEl)) return;

  const adim = 4;
  const maxYariCap = 88;
  for (let r = adim; r <= maxYariCap; r += adim) {
    const ornek = Math.max(8, Math.floor((2 * Math.PI * r) / adim));
    for (let i = 0; i < ornek; i += 1) {
      const a = (i / ornek) * Math.PI * 2;
      const nx = merkez.x + Math.cos(a) * r;
      const ny = merkez.y + Math.sin(a) * r;
      labelEl.setAttribute("x", nx.toFixed(1));
      labelEl.setAttribute("y", ny.toFixed(1));
      if (etiketKutusuIcerideMi(svg, path, labelEl)) return;
    }
  }
}

function ilceEtiketleriniPoligonaHizala(svg, sadeceLabelPointEksik = false) {
  if (!svg) return;
  oyun.bolgeler.forEach((b) => {
    const ilce = ISTANBUL_ILCELER[b.id];
    if (!ilce) return;
    if (sadeceLabelPointEksik && ilce.labelPoint) return;
    const label =
      istanbulLabelCache.get(b.id) || svg.querySelector(`[data-label-id="${b.id}"]`);
    if (label && !istanbulLabelCache.has(b.id)) istanbulLabelCache.set(b.id, label);
    if (!ilce || !label) return;
    ilceEtiketiniOturt(svg, b.id, ilce, label);
  });
}

function istanbulEtiketFitPlanla(svg, gecikmeMs = 90) {
  if (!svg) return;
  if (istanbulEtiketFitTimer) clearTimeout(istanbulEtiketFitTimer);
  istanbulEtiketFitTimer = setTimeout(() => {
    istanbulEtiketFitTimer = null;
    ilceEtiketleriniPoligonaHizala(svg, true);
  }, gecikmeMs);
}

function istanbulEtiketTipografiGuncelle() {
  oyun.bolgeler.forEach((b) => {
    const ilce = ISTANBUL_ILCELER[b.id];
    if (!ilce) return;
    const label =
      istanbulLabelCache.get(b.id) || document.querySelector(`[data-label-id="${b.id}"]`);
    if (label && !istanbulLabelCache.has(b.id)) istanbulLabelCache.set(b.id, label);
    if (!label) return;
    const stil = ilceEtiketOlcegi(ilce, oyun.seciliId === b.id);
    const zoom = ISTANBUL_VIEWBOX.w / istanbulKamera.w;
    const zoomNorm = sayiyiSinirla(
      (zoom - 1) / Math.max(1, ISTANBUL_VIEWBOX.maxZoom - 1),
      0,
      1
    );
    const dusukZoom = zoom <= 1.35;
    const zoomSafe = Math.max(1, zoom);
    const dar = ilceDarMi(ilce);
    let etiketMetni = b.ad;
    const bboxW = ilce?.bbox ? Math.max(26, ilce.bbox.maxX - ilce.bbox.minX) : 70;
    const maxEtiketW = bboxW * sayiyiSinirla(0.88 - zoomNorm * 0.16, 0.64, 0.88);
    label.textContent = etiketMetni;
    label.style.fontSize = `${stil.adBoyut.toFixed(1)}px`;

    const metinGenisligi = () =>
      typeof label.getComputedTextLength === "function"
        ? label.getComputedTextLength()
        : Math.max(1, String(label.textContent || "").length) * stil.adBoyut * 0.55;

    let gercekGenislik = metinGenisligi();
    if (dusukZoom && dar && gercekGenislik > maxEtiketW * 1.02) {
      const kisa = ilceKisaAdi(b);
      if (kisa && kisa !== etiketMetni) {
        etiketMetni = kisa;
        label.textContent = etiketMetni;
        gercekGenislik = metinGenisligi();
      }
    }

    const widthCarpani = gercekGenislik > maxEtiketW ? maxEtiketW / gercekGenislik : 1;
    const minFontBase = dar ? 4.1 : 4.7;
    const maxFontBase = dar ? 5.3 : 6.2;
    const minFont = Math.max(0.75, minFontBase / zoomSafe);
    const maxFont = Math.max(minFont + 0.3, maxFontBase / zoomSafe);
    const adBoyutFinal = sayiyiSinirla(stil.adBoyut * widthCarpani, minFont, maxFont);
    label.style.fontSize = `${adBoyutFinal.toFixed(1)}px`;
    label.removeAttribute("textLength");
    label.removeAttribute("lengthAdjust");
    label.style.display = stil.adGoster ? "" : "none";
  });
}

function istanbulZoomUygula(svg, factor, center = null) {
  if (!svg || !Number.isFinite(factor) || factor <= 0) return;
  const oncekiW = istanbulKamera.w;
  const oncekiH = istanbulKamera.h;
  const minW = ISTANBUL_VIEWBOX.w / ISTANBUL_VIEWBOX.maxZoom;
  const yeniW = sayiyiSinirla(oncekiW * factor, minW, ISTANBUL_VIEWBOX.w);
  const yeniH = (yeniW * ISTANBUL_VIEWBOX.h) / ISTANBUL_VIEWBOX.w;

  const c = center || {
    x: istanbulKamera.x + oncekiW / 2,
    y: istanbulKamera.y + oncekiH / 2,
  };
  const rx = (c.x - istanbulKamera.x) / oncekiW;
  const ry = (c.y - istanbulKamera.y) / oncekiH;
  istanbulKamera.w = yeniW;
  istanbulKamera.h = yeniH;
  istanbulKamera.x = c.x - rx * yeniW;
  istanbulKamera.y = c.y - ry * yeniH;
  istanbulViewBoxUygula(svg);
  istanbulEtiketTipografiGuncelle();
  istanbulEtiketFitPlanla(svg, 80);
}

function istanbulPanUygula(svg, dxPx, dyPx) {
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  istanbulKamera.x -= (dxPx / rect.width) * istanbulKamera.w;
  istanbulKamera.y -= (dyPx / rect.height) * istanbulKamera.h;
  istanbulViewBoxUygula(svg);
  istanbulEtiketTipografiGuncelle();
  istanbulEtiketFitPlanla(svg, 120);
}

function istanbulZoomKontrolOlustur(svgKap, svg) {
  const wrap = document.createElement("div");
  wrap.id = "istanbul-zoom-kontrol";
  wrap.innerHTML = `
    <button class="zoom-btn" data-zoom="in" title="Yakınlaştır">+</button>
    <button class="zoom-btn" data-zoom="out" title="Uzaklaştır">-</button>
    <button class="zoom-btn" data-zoom="reset" title="Sıfırla">↺</button>
  `;
  svgKap.appendChild(wrap);
  wrap.querySelector('[data-zoom="in"]').onclick = () => {
    istanbulZoomUygula(svg, 0.86);
  };
  wrap.querySelector('[data-zoom="out"]').onclick = () => {
    istanbulZoomUygula(svg, 1.16);
  };
  wrap.querySelector('[data-zoom="reset"]').onclick = () => {
    istanbulKameraSifirla();
    istanbulViewBoxUygula(svg);
    istanbulEtiketTipografiGuncelle();
    istanbulEtiketFitPlanla(svg, 0);
  };
}

function istanbulEtkilesimBagla(svgKap, svg, onBolgeSec) {
  if (!svgKap || !svg) return;
  let drag = null;
  let tiklananBolgeId = null;

  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const center = istanbulEkranToDunya(svg, e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 0.88 : 1.14;
      istanbulZoomUygula(svg, factor, center);
    },
    { passive: false }
  );

  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const hedefPath = e.target?.closest?.(".ilce-path");
    tiklananBolgeId = hedefPath?.getAttribute("data-id") || null;
    drag = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    istanbulSuruklemePx = 0;
    svgKap.classList.add("panning");
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    istanbulSuruklemePx += Math.hypot(dx, dy);
    if (istanbulSuruklemePx > ISTANBUL_TIK_SURUKLEME_ESIK) {
      tiklananBolgeId = null;
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
    istanbulPanUygula(svg, dx, dy);
  });

  const dragBitir = (e) => {
    if (!drag || (e && e.pointerId !== drag.pointerId)) return;
    const secimId = tiklananBolgeId;
    drag = null;
    tiklananBolgeId = null;
    svgKap.classList.remove("panning");
    istanbulEtiketFitPlanla(svg, 0);
    istanbulSuruklemePx = 0;
    if (secimId && typeof onBolgeSec === "function") onBolgeSec(secimId);
  };
  svg.addEventListener("pointerup", dragBitir);
  svg.addEventListener("pointercancel", dragBitir);
  svg.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const center = istanbulEkranToDunya(svg, e.clientX, e.clientY);
    istanbulZoomUygula(svg, 0.82, center);
  });
}

function sagSekmeAyarla(sekmeId) {
  aktifSagSekme = sekmeId;
  document.querySelectorAll(".sag-sekme").forEach((btn) => {
    btn.classList.toggle("aktif", btn.getAttribute("data-sekme") === sekmeId);
  });
  document.querySelectorAll(".sag-panel").forEach((panel) => {
    panel.classList.toggle("aktif", panel.getAttribute("data-panel") === sekmeId);
  });
}

function sagSekmeleriBagla() {
  document.querySelectorAll(".sag-sekme").forEach((btn) => {
    if (btn.dataset.bagli === "1") return;
    btn.dataset.bagli = "1";
    btn.onclick = () => sagSekmeAyarla(btn.getAttribute("data-sekme"));
  });
}

function tipIkonOzet(bolgeId, owner = null) {
  const hedefOwner = owner ?? bolgeById(bolgeId)?.owner;
  if (!hedefOwner || hedefOwner === "tarafsiz") return "";
  const ozet = {};
  oyun.birimler
    .filter((k) => k.konumId === bolgeId && k.owner === hedefOwner && k.adet > 0)
    .forEach((k) => {
      const tip = k.tip || "tetikci";
      ozet[tip] = (ozet[tip] || 0) + k.adet;
    });
  return Object.entries(ozet)
    .map(([tip, adet]) => {
      const ikon = BIRIM_TIPLERI[tip]?.ikon || "•";
      return `${ikon}${adet}`;
    })
    .join(" ");
}

function dusmanIstihbaratiGizliMi(bolge) {
  if (!bolge) return false;
  return bolge.owner !== "biz" && bolge.owner !== "tarafsiz" && !kesifAktifMi(bolge.id);
}

function bolgeTooltipMetni(bolge) {
  if (dusmanIstihbaratiGizliMi(bolge)) {
    return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - İstihbarat: ?`;
  }
  return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - Garnizon: ${bolge.garnizon || 0}`;
}

function konvoyTipRozeti(konvoylar) {
  const ozet = {};
  konvoylar.forEach((u) => {
    const tip = u.tip || "tetikci";
    ozet[tip] = (ozet[tip] || 0) + u.adet;
  });
  return Object.entries(ozet)
    .map(([tip, adet]) => `${BIRIM_TIPLERI[tip]?.ikon || "•"}${adet}`)
    .join(" ");
}

function kontrolSinifi(owner) {
  if (owner === "biz") return "biz";
  if (owner === "ai1") return "ai1";
  if (owner === "ai2") return "ai2";
  return "tarafsiz";
}
function miniAksiyonHTML(bolgeId) {
  // sadece hareket emri varken göster
  if (!oyun.hareketEmri) return "";
  return `<button class="mini-aksiyon" data-hedef="${bolgeId}" title="Hareket emrini buraya gönder">Buraya Gönder</button>`;
}

function ensureAyarModal() {
  if (document.getElementById("ayar-arka")) return;
  const wrap = document.createElement("div");
  wrap.id = "ayar-arka";
  wrap.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);align-items:center;justify-content:center;z-index:9999";
  wrap.innerHTML = `
      <div id="ayar-icerik" style="background:#1e1e1e;color:#eee;padding:16px 18px;border-radius:10px;min-width:260px;box-shadow:0 10px 30px rgba(0,0,0,.6)">
        <h3 style="margin:0 0 8px 0">Ayarlar</h3>
        <div style="font-size:13px;color:#bbb;margin-bottom:10px;">Oyun Hızı</div>
        <div id="hiz-grup" style="display:flex;gap:8px;margin-bottom:10px;justify-content:center">
          <button data-seviye="1" class="hiz-btn">1</button>
          <button data-seviye="2" class="hiz-btn">2</button>
          <button data-seviye="3" class="hiz-btn">3</button>
          <button data-seviye="4" class="hiz-btn">4</button>
          <button data-seviye="5" class="hiz-btn">5</button>
        </div>
        <p style="font-size:12px;color:#999;text-align:center;margin-bottom:12px">
          1=Çok yavaş • 3=Normal • 5=Çok hızlı
        </p>
        <div style="display:flex;justify-content:center">
          <button id="ayar-kapat" style="padding:6px 12px;border-radius:8px;border:1px solid #333;background:#2a2a2a;cursor:pointer">Kapat</button>
        </div>
      </div>`;
  document.body.appendChild(wrap);
}

function arastirmaSayfaAc() {
  arastirmaDurumunuDogrula();
  ensureArastirmaSayfa();
  arastirmaSayfaAcik = true;
  const sayfa = document.getElementById("arastirma-sayfa");
  if (sayfa) sayfa.classList.add("acik");
  arastirmaSayfaGuncel();
}

function arastirmaSayfaKapat() {
  arastirmaSayfaAcik = false;
  const sayfa = document.getElementById("arastirma-sayfa");
  if (sayfa) sayfa.classList.remove("acik");
}

function ensureArastirmaSayfa() {
  if (document.getElementById("arastirma-sayfa")) return;

  const sayfa = document.createElement("section");
  sayfa.id = "arastirma-sayfa";
  sayfa.innerHTML = `
    <div class="arastirma-sayfa-ust">
      <div>
        <div class="arastirma-sayfa-baslik">🔬 Büyük Araştırma Ağacı</div>
        <div class="arastirma-sayfa-alt">Dal dal ilerleyen uzun vadeli teknoloji planı</div>
      </div>
      <button class="buton grimsi" id="arastirma-sayfa-kapat">Kapat</button>
    </div>
    <div id="arastirma-sayfa-govde"></div>
  `;
  document.body.appendChild(sayfa);

  const kapat = document.getElementById("arastirma-sayfa-kapat");
  if (kapat) kapat.onclick = arastirmaSayfaKapat;

  if (!document.body.dataset.arastirmaEscBagli) {
    document.body.dataset.arastirmaEscBagli = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && arastirmaSayfaAcik) arastirmaSayfaKapat();
    });
  }
}

function arastirmaSayfaIcerikHTML() {
  arastirmaDurumunuDogrula();
  const ar = oyun.arastirma;
  if (!ar) return "";

  const puan = arastirmaPuanDetayi("biz");
  const dalListesi = Object.entries(ARASTIRMA_DALLARI);
  const aktifDalId = ar.aktifDal || dalListesi[0]?.[0];
  const aktifDal = ARASTIRMA_DALLARI[aktifDalId];
  const aktifDurum = ar[aktifDalId] || { seviye: 0, puan: 0 };
  const hedef = aktifDal?.seviyeler?.[aktifDurum.seviye];
  const kalan = hedef ? Math.max(0, hedef.gerekPuan - (aktifDurum.puan || 0)) : 0;
  const tahmini = hedef && puan.toplam > 0 ? Math.ceil(kalan / puan.toplam) : 0;
  const toplamDugum = dalListesi.reduce((t, [, d]) => t + d.seviyeler.length, 0);
  const acilanDugum = dalListesi.reduce((t, [id, d]) => t + Math.min(ar[id]?.seviye || 0, d.seviyeler.length), 0);
  const genelYuzde = toplamDugum > 0 ? Math.round((acilanDugum / toplamDugum) * 100) : 0;

  let html = `<div class="arastirma-genel-ozet">
      <div class="arastirma-ozet-kutu">
        <strong>Akış</strong>
        <span>+${puan.toplam} puan/tur</span>
      </div>
      <div class="arastirma-ozet-kutu">
        <strong>Genel İlerleme</strong>
        <span>${acilanDugum}/${toplamDugum} (%${genelYuzde})</span>
      </div>
      <div class="arastirma-ozet-kutu">
        <strong>Aktif Dal</strong>
        <span>${aktifDal?.ikon || "🔬"} ${aktifDal?.ad || "—"}</span>
      </div>
      <div class="arastirma-ozet-kutu">
        <strong>Sıradaki Kilit</strong>
        <span>${hedef ? `${hedef.ad} • ~${tahmini} tur` : "Dal tamamlandı"}</span>
      </div>
    </div>`;

  html += `<div class="arastirma-filtre-satir">
      <button class="buton grimsi btn-arastirma-sayfa-filtre" data-filtre="tum" ${arastirmaSayfaFiltre === "tum" ? "data-secili='1'" : ""}>Tümü</button>`;
  dalListesi.forEach(([dalId, dal]) => {
    html += `<button class="buton grimsi btn-arastirma-sayfa-filtre" data-filtre="${dalId}" ${arastirmaSayfaFiltre === dalId ? "data-secili='1'" : ""}>
      ${dal.ikon} ${dal.ad}
    </button>`;
  });
  html += `</div>`;

  html += `<div class="arastirma-matris">`;
  dalListesi.forEach(([dalId, dal]) => {
    if (arastirmaSayfaFiltre !== "tum" && arastirmaSayfaFiltre !== dalId) return;
    const durum = ar[dalId] || { seviye: 0, puan: 0 };
    const aktif = dalId === aktifDalId;
    html += `<section class="arastirma-matris-dal ${aktif ? "aktif" : ""}" data-dal="${dalId}">
      <div class="arastirma-matris-sol">
        <div class="arastirma-dal-ad">${dal.ikon} ${dal.ad}</div>
        <div class="arastirma-dal-acik">${dal.aciklama}</div>
        <div class="arastirma-dal-durum">Seviye ${durum.seviye}/${dal.seviyeler.length}</div>
        <button class="buton btn-arastirma-sayfa-dal" data-dal="${dalId}">
          ${aktif ? "Aktif Dal" : "Bu Dala Odaklan"}
        </button>
      </div>
      <div class="arastirma-matris-sag">
        <div class="arastirma-zincir">`;

    dal.seviyeler.forEach((seviye, idx) => {
      const acik = idx < durum.seviye;
      const hedefHalka = idx === durum.seviye;
      const ilerleme = hedefHalka ? dalIlerleme(dalId) : acik ? 100 : 0;
      const etiket = acik ? "Açıldı" : hedefHalka ? "Araştırılıyor" : "Kilitli";
      const sinif = acik ? "acik" : hedefHalka ? "hedef" : "kilitli";
      html += `<article class="arastirma-zincir-dugum ${sinif}">
        <div class="arastirma-zincir-ust">
          <span class="arastirma-zincir-ad">${seviye.ad}</span>
          <span class="arastirma-zincir-etiket">${etiket}</span>
        </div>
        <div class="arastirma-zincir-aciklama">${seviye.aciklama}</div>
        <div class="arastirma-cubuk"><div class="arastirma-cubuk-dolgu" style="width:${ilerleme}%"></div></div>
        <div class="arastirma-zincir-puan">${hedefHalka ? `${durum.puan}/${seviye.gerekPuan}` : seviye.gerekPuan} puan</div>
      </article>`;
      if (idx < dal.seviyeler.length - 1) html += `<div class="arastirma-zincir-baglanti"></div>`;
    });

    html += `</div></div></section>`;
  });
  html += `</div>`;

  return html;
}

function arastirmaSayfaGuncel() {
  if (!arastirmaSayfaAcik) return;
  ensureArastirmaSayfa();
  const govde = document.getElementById("arastirma-sayfa-govde");
  if (!govde) return;
  govde.innerHTML = arastirmaSayfaIcerikHTML();

  govde.querySelectorAll(".btn-arastirma-sayfa-dal").forEach((btn) => {
    btn.onclick = () => {
      const dalId = btn.getAttribute("data-dal");
      arastirmaDalDegistir(dalId);
      arastirmaSayfaGuncel();
      if (aktifCallbacklar) uiGuncel(aktifCallbacklar);
    };
  });
  govde.querySelectorAll(".btn-arastirma-sayfa-filtre").forEach((btn) => {
    btn.onclick = () => {
      arastirmaSayfaFiltre = btn.getAttribute("data-filtre") || "tum";
      arastirmaSayfaGuncel();
    };
  });
}

// Net gelir hesaplama (üst bar için)
function hesaplaNetGelirDetay(owner) {
  const fr = oyun.fraksiyon[owner];
  if (!fr) return { net: "0", detay: "Veri yok." };
  const bolgeler = oyun.bolgeler.filter((b) => b.owner === owner);
  let temelGelir = 0;
  let yatirimBonusu = 0;
  let ozelBonusToplam = 0;
  let binaBonusToplam = 0;
  let arastirmaBonusToplam = 0;
  let geceBonusToplam = 0;
  const gelir = bolgeler.reduce((t, b) => {
    const temel = b.gelir || 0;
    const gelX = 1 + (b.yGel || 0) * 0.5;
    const ozelBonus = b.ozellik && BOLGE_OZELLIKLERI[b.ozellik] ? (BOLGE_OZELLIKLERI[b.ozellik].gelirBonus || 0) : 0;
    const binaBonusOran = (b.binalar || []).reduce((toplam, kayit) => {
      const tanim = BINA_TIPLERI[kayit.tip];
      return toplam + ((tanim?.etkiler?.gelirBonus || 0) * (kayit.seviye || 1));
    }, 0);
    const geceBonus = owner === "biz" && (b.ozellik === "kumarhane" || b.ozellik === "carsi")
      ? arastirmaEfekt("geceEkonomiBonus")
      : 0;
    const arastirmaBonus = owner === "biz" ? arastirmaEfekt("gelirBonus") : 0;
    const yatirimOran = gelX - 1;
    temelGelir += temel;
    yatirimBonusu += temel * yatirimOran;
    ozelBonusToplam += temel * ozelBonus * gelX;
    binaBonusToplam += temel * binaBonusOran * gelX;
    arastirmaBonusToplam += temel * arastirmaBonus * gelX;
    geceBonusToplam += temel * geceBonus * gelX;
    const bBonus = 1 + ozelBonus + binaBonusOran + geceBonus + arastirmaBonus;
    return t + temel * gelX * bBonus;
  }, 0);
  const gider = ownerBakimToplami(owner);
  const pasifGelir = owner === "biz" ? arastirmaEfekt("pasifGelir") : 0;
  const net = Math.round(gelir + pasifGelir - gider);
  const detay = [
    `Temel gelir: ${Math.round(temelGelir)}₺`,
    `Yatırım bonusu: +${Math.round(yatirimBonusu)}₺`,
    `Bölge özellikleri: +${Math.round(ozelBonusToplam)}₺`,
    `Bina bonusları: +${Math.round(binaBonusToplam)}₺`,
    `Araştırma bonusu: +${Math.round(arastirmaBonusToplam)}₺`,
    `Gece ekonomisi: +${Math.round(geceBonusToplam)}₺`,
    `Pasif gelir: +${Math.round(pasifGelir)}₺`,
    `Bakım gideri: -${Math.round(gider)}₺`,
    `Net: ${net >= 0 ? "+" : ""}${Math.round(net)}₺`,
  ].join("\n");
  return { net: net >= 0 ? `+${net}` : `${net}`, detay };
}

export function durumCiz() {
  const sol = document.getElementById("durum-sol");
  const sag = document.getElementById("durum-sag");

  const biz = oyun.fraksiyon.biz;
  const lider = biz.lider;
  const asayis = oyun.asayis || { sucluluk: 0, polisBaski: 0, sonBaskinTur: -999 };
  const yaraliToplam = oyun.yaralilar.filter((y) => y.owner === "biz").reduce((t, y) => t + y.adet, 0);
  const esirToplam = oyun.esirler.filter((e) => e.owner === "biz").reduce((t, e) => t + e.adet, 0);
  sol.innerHTML = `
    <span class="etiket">Çetemiz:</span> <span id="biz-adi">${biz.ad}</span>
    &nbsp; | &nbsp; <span class="etiket">Lider:</span> ${lider ? `${lider.ikon} ${lider.ad}` : '—'}
    &nbsp; | &nbsp; <span class="etiket">Para:</span> ${Math.floor(biz.para)} ₺
    ${yaraliToplam > 0 ? `&nbsp; | &nbsp; <span style="color:#f39c12">🩹 ${yaraliToplam}</span>` : ''}
    ${esirToplam > 0 ? `&nbsp; | &nbsp; <span style="color:#e74c3c">⛓️ ${esirToplam}</span>` : ''}
  `;
  const netGelir = hesaplaNetGelirDetay("biz");
  sag.innerHTML = `
  ${oyun.hareketEmri
      ? `<span style="color:#f5c542;font-weight:600">Hedef seç: ${oyun.hareketEmri.adet} asker gönderiliyor...</span> &nbsp; | &nbsp;`
      : ""
    }

  <span class="etiket">Bizim Bölge:</span> ${bizBolgeSayisi()}
  &nbsp; | &nbsp; <span class="etiket">Tur:</span> ${oyun.tur}
  &nbsp; | &nbsp; <span class="etiket">Hız:</span> ${Number(
      oyun.hizKatsayi
    ).toFixed(2)}×
  &nbsp; | &nbsp; <span class="etiket">Şöhret:</span> ${Math.round(
      oyun.sohret.biz
    )}/100
  &nbsp; | &nbsp; <span class="etiket" title="Suçluluk arttıkça polis baskın riski yükselir.">Suç:</span> ${Math.round(asayis.sucluluk || 0)}
  &nbsp; | &nbsp; <span class="etiket" title="Polis baskısı yüksekse ceza ve taşıt el koyma riski artar.">Polis:</span> %${Math.round(asayis.polisBaski || 0)}
  &nbsp; | &nbsp; <span class="etiket" title="${netGelir.detay.replace(/"/g, "&quot;")}">Net:</span> <span title="${netGelir.detay.replace(/"/g, "&quot;")}">${netGelir.net}</span>
  &nbsp; | &nbsp; <button class="buton grimsi" id="pause-btn">${oyun.duraklat ? "Devam Et" : "Duraklat"
    }</button>
  &nbsp; <button class="buton grimsi" id="tutorial-btn">📘 Tutorial</button>
  &nbsp; <button class="buton grimsi" id="arastirma-sayfa-btn">Araştırma</button>
  &nbsp; <button class="buton" id="ayarlar-btn">Ayarlar</button>
`;

  const harita = document.getElementById("harita");
  if (oyun.mapTipi !== "istanbul") {
    harita.style.gridTemplateColumns = `repeat(${oyun.mapSize},1fr)`;
  }
}

// =============================================
// İSTANBUL SVG HARİTA RENDERER
// =============================================
function ownerSinif(owner) {
  if (owner === "biz") return "biz";
  if (owner === "ai1") return "ai1";
  if (owner === "ai2") return "ai2";
  if (owner === "ai3") return "ai3";
  return "tarafsiz";
}

function istanbulSvgOlustur(onBolgeSec) {
  const kap = document.getElementById("harita-kap");
  const haritaDiv = document.getElementById("harita");
  istanbulDomCacheSifirla();
  
  // Grid haritayı gizle, SVG kapsayıcı oluştur
  haritaDiv.style.display = "none";
  
  // Daha önce oluşturulmuşsa temizle
  let svgKap = document.getElementById("istanbul-svg-kap");
  if (svgKap) svgKap.remove();
  
  svgKap = document.createElement("div");
  svgKap.id = "istanbul-svg-kap";
  kap.appendChild(svgKap);
  
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.id = "istanbul-svg";
  istanbulKameraSifirla();
  istanbulViewBoxUygula(svg);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  
  // === GRADIENT TANIMLARI ===
  const defs = document.createElementNS(NS, "defs");
  const gradients = [
    { id: "grad-biz", c1: "#145a32", c2: "#1e8449" },
    { id: "grad-ai1", c1: "#641e16", c2: "#922b21" },
    { id: "grad-ai2", c1: "#3b1566", c2: "#6c2bb8" },
    { id: "grad-ai3", c1: "#7d6608", c2: "#b7950b" },
    { id: "grad-tar", c1: "#2c3e50", c2: "#34495e" },
  ];
  gradients.forEach(g => {
    const grad = document.createElementNS(NS, "linearGradient");
    grad.id = g.id;
    grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "100%");
    const s1 = document.createElementNS(NS, "stop");
    s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", g.c1);
    const s2 = document.createElementNS(NS, "stop");
    s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", g.c2);
    grad.appendChild(s1); grad.appendChild(s2);
    defs.appendChild(grad);
  });
  
  // Glow filter
  const filter = document.createElementNS(NS, "filter");
  filter.id = "glow";
  const blur = document.createElementNS(NS, "feGaussianBlur");
  blur.setAttribute("stdDeviation", "3"); blur.setAttribute("result", "glow");
  filter.appendChild(blur);
  const merge = document.createElementNS(NS, "feMerge");
  const mn1 = document.createElementNS(NS, "feMergeNode"); mn1.setAttribute("in", "glow");
  const mn2 = document.createElementNS(NS, "feMergeNode"); mn2.setAttribute("in", "SourceGraphic");
  merge.appendChild(mn1); merge.appendChild(mn2);
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);
  
  // === İLÇE POLYGONLARI ===
  const ilceGrup = document.createElementNS(NS, "g");
  ilceGrup.id = "ilce-grup";
  
  oyun.bolgeler.forEach(b => {
    const ilce = ISTANBUL_ILCELER[b.id];
    if (!ilce) return;
    
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", ilce.svgPath);
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("class", `ilce-path ${ownerSinif(b.owner)}`);
    path.setAttribute("data-id", b.id);
    path.id = `ilce-${b.id}`;
    istanbulPathCache.set(b.id, path);
    
    // Tooltip
    const title = document.createElementNS(NS, "title");
    title.textContent = bolgeTooltipMetni(b);
    path.appendChild(title);
    
    ilceGrup.appendChild(path);
  });
  svg.appendChild(ilceGrup);

  // === KÖPRÜ GÖRSELLERİ ===
  const kopruGrup = document.createElementNS(NS, "g");
  kopruGrup.id = "kopru-grup";
  kopruGrup.setAttribute("pointer-events", "none");
  KOPRULER.forEach((k) => {
    const uclar = kopruKoordinatlari(k);
    if (!uclar) return;
    const cizgi = document.createElementNS(NS, "line");
    cizgi.setAttribute("x1", uclar.x1.toFixed(1));
    cizgi.setAttribute("y1", uclar.y1.toFixed(1));
    cizgi.setAttribute("x2", uclar.x2.toFixed(1));
    cizgi.setAttribute("y2", uclar.y2.toFixed(1));
    cizgi.setAttribute("class", `kopru-line${k.denizalti ? " kopru-tunel" : ""}`);
    const title = document.createElementNS(NS, "title");
    title.textContent = k.ad;
    cizgi.appendChild(title);
    kopruGrup.appendChild(cizgi);
  });
  svg.appendChild(kopruGrup);
  
  // === İLÇE ETİKETLERİ ===
  const labelGrup = document.createElementNS(NS, "g");
  labelGrup.id = "label-grup";
  
  oyun.bolgeler.forEach(b => {
    const ilce = ISTANBUL_ILCELER[b.id];
    if (!ilce) return;
    const { cx, cy } = ilceEtiketKonumu(ilce);
    
    // İlçe adı
    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", cx);
    label.setAttribute("y", cy);
    label.setAttribute("class", "ilce-label");
    label.setAttribute("data-id", b.id);
    label.setAttribute("data-label-id", b.id);
    label.setAttribute("dominant-baseline", "middle");
    label.textContent = b.ad;
    istanbulLabelCache.set(b.id, label);
    labelGrup.appendChild(label);
    
  });
  svg.appendChild(labelGrup);
  
  svgKap.appendChild(svg);
  istanbulEtiketTipografiGuncelle();
  requestAnimationFrame(() => {
    ilceEtiketleriniPoligonaHizala(svg, true);
  });
  istanbulZoomKontrolOlustur(svgKap, svg);
  istanbulEtkilesimBagla(svgKap, svg, onBolgeSec);
}

function istanbulSvgGuncel() {
  oyun.bolgeler.forEach(b => {
    const ilce = ISTANBUL_ILCELER[b.id];
    if (!ilce) return;
    
    // Path rengini güncelle
    const path = istanbulPathCache.get(b.id) || document.getElementById(`ilce-${b.id}`);
    if (path && !istanbulPathCache.has(b.id)) istanbulPathCache.set(b.id, path);
    if (path) {
      path.setAttribute("class", `ilce-path ${ownerSinif(b.owner)} ${oyun.seciliId === b.id ? "secili" : ""}`);
      // Tooltip güncelle
      const title = path.querySelector("title");
      if (title) {
        title.textContent = bolgeTooltipMetni(b);
      }
    }
    
  });
  istanbulEtiketTipografiGuncelle();
}

function rozetHTML(m) {
  // m = {biz:12, ai1:5, ai2:3, ai3:2}
  const renk = { biz: "#2ecc71", ai1: "#e74c3c", ai2: "#9b59b6", ai3: "#f1c40f" };
  return Object.entries(m)
    .map(
      ([o, s]) =>
        `<span class="rozet" style="background:${renk[o] || '#888'}">${s}</span>`
    )
    .join("");
}

export function haritaCiz(onBolgeSec) {
  // İstanbul modunda SVG haritası çiz
  if (oyun.mapTipi === "istanbul") {
    istanbulSvgOlustur(onBolgeSec);
    return;
  }
  
  const h = document.getElementById("harita");
  h.innerHTML = "";
  oyun.bolgeler.forEach((b) => {
    const k = document.createElement("div");
    k.className = `bolge ${b.owner === "biz"
      ? "biz"
      : b.owner === "ai1"
        ? "ai1"
        : b.owner === "ai2"
          ? "ai2"
          : b.owner === "ai3"
            ? "ai3"
            : "tarafsiz"
      }`;
    k.id = "bolge-" + b.id;
    // haritaCiz içinde her bölge kartına:
    const istihbaratGizli = dusmanIstihbaratiGizliMi(b);
    const ozIkon = b.ozellik && BOLGE_OZELLIKLERI[b.ozellik] ? BOLGE_OZELLIKLERI[b.ozellik].ikon + ' ' : '';
    const ownerAd = fraksiyonAdi(b.owner);
    // Lider bilgisi bul
    let liderBilgi = "";
    if (!istihbaratGizli && b.owner !== "tarafsiz" && oyun.fraksiyon[b.owner]?.lider) {
      const l = oyun.fraksiyon[b.owner].lider;
      // Bonus açıklaması
      const bonusMap = {
        saldiriGucu: "Saldırı Gücü",
        savunmaGucu: "Savunma Gücü",
        binaMaliyetiIndirim: "Yapı Maliyeti",
        gelirCarpani: "Gelir",
        adamCarpani: "Adam Hızı",
        kayipAzaltma: "Kayıp Azaltma",
        regenBonus: "Nüfus Artışı"
      };
      const bonusAd = bonusMap[Object.keys(l.bonus)[0]] || "Bilinmiyor";
      liderBilgi = `<br><span style="color:#ddd;font-size:0.9em">Lider: ${l.ikon} ${l.ad} (${bonusAd})</span>`;
    }

    const renk = { biz: "#2ecc71", ai1: "#e74c3c", ai2: "#9b59b6", ai3: "#f1c40f", tarafsiz: "#999" }[b.owner] || "#999";

    const ozelEtiket = b.ozellik
      ? `<br><span class="etiket" style="color:#f39c12">★ ${istihbaratGizli ? "?" : b.ozellik.toUpperCase()}</span>`
      : "";
    const detaySatirlari = istihbaratGizli
      ? `
        <div style="color:#f39c12">Istihbarat: Kesif gerekli</div>
        <div>Gelir: ?</div>
        <div>Güvenlik: ?</div>
        <div>Nüfus: ?</div>
        <div>Garnizon: <strong>?</strong></div>
        <div>Birim Tipleri: <span style="color:#ddd">?</span></div>
      `
      : `
        <div>Gelir: ${b.gelir} <span style="color:#777">(+${b.yGel} yat.)</span></div>
        <div>Güvenlik: ${b.guv} <span style="color:#777">(+${b.yGuv} yat.)</span></div>
        <div>Nüfus: ${Math.floor(b.nufus)}/${b.nufusMax} <span style="color:#777">(+${b.yAdam} yat.)</span></div>
        <div>Garnizon: <strong>${b.garnizon || 0}</strong></div>
        <div>Birim Tipleri: <span style="color:#ddd">${tipIkonOzet(b.id, b.owner) || "Yok"}</span></div>
      `;

    let html = `
        <div style="margin-bottom:10px">
          <strong style="font-size:1.2em; color:${renk}">${b.ad}</strong>
          ${ozelEtiket}
        </div>
        <div>Sahibi: <span style="color:${renk};font-weight:bold">${ownerAd}</span>${liderBilgi}</div>
        ${detaySatirlari}
      `;
    k.innerHTML = html; // Assign the constructed HTML to k.innerHTML

    k.onclick = (e) => {
      // mini aksiyon varsa ve butona basıldıysa, kare seçimini tetiklemeyelim
      if (e.target && e.target.classList.contains("mini-aksiyon")) return;
      onBolgeSec(b.id);
    };
    h.appendChild(k);
  });

  // mini aksiyon butonlarını bağla (hareket emri varsa)
  if (oyun.hareketEmri) {
    h.querySelectorAll(".mini-aksiyon").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const hedefId = btn.getAttribute("data-hedef");
        import("./actions.js").then((m) => m.hareketEmriHedefSec(hedefId));
        e.stopPropagation();
      });
    });
  }
}
export function haritaGuncel() {
  // İstanbul modunda SVG güncelle
  if (oyun.mapTipi === "istanbul") {
    istanbulSvgGuncel();
    return;
  }
  
  oyun.bolgeler.forEach((b) => {
    const k = document.getElementById("bolge-" + b.id);

    if (!k) return;
    k.className = `bolge ${b.owner === "biz"
      ? "biz"
      : b.owner === "ai1"
        ? "ai1"
        : b.owner === "ai2"
          ? "ai2"
          : b.owner === "ai3"
            ? "ai3"
            : "tarafsiz"
      } ${oyun.seciliId === b.id ? "secili" : ""}`;
    const mini = k.querySelector(".mini");
    if (mini) {
      if (dusmanIstihbaratiGizliMi(b)) {
        mini.innerHTML = `Gelir: ?<br>Güvenlik: ?<br>Nüfus: ?<br>Kontrol: ${fraksiyonAdi(b.owner)}`;
      } else {
        mini.innerHTML = `Gelir: ${b.gelir}<br>Güvenlik: ${b.guv + b.yGuv
          }<br>Nüfus: ${b.nufus}<br>Kontrol: ${fraksiyonAdi(b.owner)}`;
      }
    }
    // haritaGuncel içinde:
    const rk = k.querySelector(".rozet-kume");
    if (rk) rk.innerHTML = rozetHTML(rozetSayilari(b.id));

    // === KONVOY BADGE'LERİ ===
    // Önceki badge'leri temizle
    k.querySelectorAll(".konvoy-badge").forEach((e) => e.remove());

    // Giden konvoylar (bu bölgeden çıkan)
    const gidenler = oyun.birimler.filter(
      (u) => u.konumId === b.id && u.hedefId && u.hedefId !== b.id && u.adet > 0
    );
    if (gidenler.length > 0) {
      const toplam = gidenler.reduce((t, u) => t + u.adet, 0);
      const badge = document.createElement("div");
      badge.className = "konvoy-badge";
      const hedefAd = bolgeById(gidenler[0].hedefId)?.ad || "?";
      const tipRozet = konvoyTipRozeti(gidenler);
      badge.textContent = `🚶 ${toplam} ${tipRozet} → ${hedefAd}`;
      badge.title = `${tipRozet || toplam} ${hedefAd} bölgesine gidiyor`;
      k.appendChild(badge);
    }

    // Gelen konvoylar (bu bölgeye doğru gelen)
    const gelenler = oyun.birimler.filter(
      (u) => u.hedefId === b.id && u.konumId !== b.id && u.adet > 0
    );
    if (gelenler.length > 0) {
      const toplam = gelenler.reduce((t, u) => t + u.adet, 0);
      const dost = gelenler.some((u) => u.owner === b.owner);
      const badge = document.createElement("div");
      badge.className = `konvoy-badge ${dost ? '' : 'gelen'}`;
      const tipRozet = konvoyTipRozeti(gelenler);
      badge.textContent = dost ? `🛡️ ← ${toplam} ${tipRozet}` : `⚔️ ← ${toplam} ${tipRozet}`;
      badge.title = `${tipRozet || toplam} bu bölgeye geliyor`;
      k.appendChild(badge);
    }

    // mini aksiyon görünürlüğü
    let ma = k.querySelector(".mini-aksiyon");
    if (oyun.hareketEmri) {
      if (!ma) {
        ma = document.createElement("button");
        ma.className = "mini-aksiyon";
        ma.setAttribute("data-hedef", b.id);
        ma.textContent = "Buraya Gönder";
        ma.title = "Hareket emrini buraya gönder";
        ma.onclick = (e) => {
          import("./actions.js").then((m) => m.hareketEmriHedefSec(b.id));
          e.stopPropagation();
        };
        k.appendChild(ma);
      }
    } else {
      if (ma) ma.remove();
    }
  });
}
export function uiGuncel(cb) {
  aktifCallbacklar = cb;
  durumCiz();
  haritaGuncel();
  detayCiz();
  islemlerCiz(cb);

  // İstatistik panelini göster (oyun başladıysa)
  const statPanel = document.getElementById("istatistik-panel");
  if (statPanel && oyun.tur > 0) {
    istatistikGrafik();
  }

  sagSekmeleriBagla();
  sagSekmeAyarla(aktifSagSekme);

  // Pause bağla
  const pauseBtn = document.getElementById("pause-btn");
  if (pauseBtn) pauseBtn.onclick = cb.duraklatDevam;
  const tutorialBtn = document.getElementById("tutorial-btn");
  if (tutorialBtn) {
    tutorialBtn.onclick = () => {
      document.dispatchEvent(new CustomEvent("tutorial:open"));
    };
  }

  // Ayarlar modalı hazırla + bağla
  ensureAyarModal();
  ensureArastirmaSayfa();
  const arastirmaBtn = document.getElementById("arastirma-sayfa-btn");
  if (arastirmaBtn) arastirmaBtn.onclick = arastirmaSayfaAc;
  const arastirmaBtnPanel = document.getElementById("btn-arastirma-sayfa");
  if (arastirmaBtnPanel) arastirmaBtnPanel.onclick = arastirmaSayfaAc;
  const ayarBtn = document.getElementById("ayarlar-btn");
  if (ayarBtn) {
    ayarBtn.onclick = () => {
      const arka = document.getElementById("ayar-arka");
      arka.style.display = "flex";
      document.querySelectorAll("#hiz-grup .hiz-btn").forEach((btn) => {
        btn.onclick = () => {
          const seviye = parseInt(btn.getAttribute("data-seviye"));
          const katsayi = [0, 0.5, 0.75, 1, 1.5, 2][seviye]; // 1→0.5, 5→2
          cb.hizAyarla(katsayi);
        };
      });
      document.getElementById("ayar-kapat").onclick = () => {
        arka.style.display = "none";
      };
    };
  }

  if (arastirmaSayfaAcik) arastirmaSayfaGuncel();
  document.dispatchEvent(new CustomEvent("ui:guncel"));
}

export function detayCiz() {
  const d = document.getElementById("detay");
  const b = bolgeById(oyun.seciliId);
  if (!b) {
    d.innerHTML = `<h2>Bölge Bilgisi</h2><p>Soldan bir bölge seç.</p>`;
    return;
  }
  const kesifVar = kesifAktifMi(b.id);
  const istihbaratGerekli = b.owner !== "biz" && b.owner !== "tarafsiz" && !kesifVar;
  const guvTop = b.guv + b.yGuv;
  const gelX = (1 + b.yGel * 0.5).toFixed(1);
  const adamX = (1 + b.yAdam * 0.7).toFixed(1);
  let ek = b.owner !== "tarafsiz" && !istihbaratGerekli
    ? `<p><strong>Garnizon:</strong> ${b.garnizon}</p><p><strong>Birim Tipleri:</strong> ${tipIkonOzet(b.id, b.owner) || "Yok"}</p>`
    : "";
  // Özel bölge bilgisi
  let ozelEk = '';
  if (b.ozellik && BOLGE_OZELLIKLERI[b.ozellik]) {
    const oz = BOLGE_OZELLIKLERI[b.ozellik];
    ozelEk = `<p style="color:#f1c40f"><strong>${oz.ikon} ${oz.ad}:</strong> `;
    if (oz.gelirBonus > 0) ozelEk += `Gelir +%${Math.round(oz.gelirBonus * 100)} `;
    if (oz.uretimBonus > 0) ozelEk += `Üretim +%${Math.round(oz.uretimBonus * 100)} `;
    if (oz.regenBonus > 0) ozelEk += `Regen x${(1 + oz.regenBonus).toFixed(1)} `;
    if (oz.savunmaBonus > 0) ozelEk += `Savunma +${oz.savunmaBonus} `;
    ozelEk += '</p>';
  }
  // Sadakat gösterimi
  const sad = b.sadakat ?? 55;
  const sadRenk = sadakatRenk(sad);
  const sadEtiket = sadakatEtiket(sad);
  const sadakEk = b.owner !== "tarafsiz" && !istihbaratGerekli
    ? `<p><strong>Sadakat:</strong> <span style="color:${sadRenk};font-weight:bold">${Math.round(sad)}/100 — ${sadEtiket}</span>
        <div style="height:6px;background:#333;border-radius:3px;margin:3px 0">
          <div style="height:6px;background:${sadRenk};border-radius:3px;width:${Math.round(sad)}%"></div>
        </div>
      </p>`
    : "";

  // Keşif bilgisi aktifse göster
  const kesifEk = kesifVar
    ? `<p style="color:#3498db;font-size:12px">🔍 Keşif aktif — detaylar doğrulanmış.</p>`
    : istihbaratGerekli
      ? `<p style="color:#f39c12;font-size:12px">🕵️ Bu bölgede net veri yok. Kesin sayılar için önce keşif yap.</p>`
      : "";
  const binaEk = !istihbaratGerekli && (b.binalar || []).length > 0
    ? `<p><strong>Binalar:</strong> ${(b.binalar || []).map((kayit) => {
        const tanim = BINA_TIPLERI[kayit.tip];
        return tanim ? `${tanim.ikon} ${tanim.ad} S${kayit.seviye}` : null;
      }).filter(Boolean).join(", ")}</p>`
    : istihbaratGerekli
      ? `<p><strong>Binalar:</strong> Bilinmiyor</p>`
      : `<p><strong>Binalar:</strong> Yok</p>`;

  const gizliOzet = istihbaratGerekli
    ? `
      <div style="background:#17130f;border:1px solid #4a3520;border-radius:8px;padding:10px 12px;margin-top:8px">
        <div style="font-size:12px;color:#e0b26d;margin-bottom:6px">İstihbarat Kilidi</div>
        <p style="margin:0 0 6px 0"><strong>Gelir:</strong> ?</p>
        <p style="margin:0 0 6px 0"><strong>Güvenlik:</strong> ?</p>
        <p style="margin:0 0 6px 0"><strong>Nüfus:</strong> ?</p>
        <p style="margin:0 0 6px 0"><strong>Adam Gelişi:</strong> ?</p>
        <p style="margin:0"><strong>Garnizon ve Birimler:</strong> ?</p>
      </div>`
    : `
      <p><strong>Gelir Oranı:</strong> ${b.gelir} ₺/tur (Yat: x${gelX})</p>
      <p><strong>Güvenlik:</strong> ${guvTop} (Temel ${b.guv}, Yatırım +${b.yGuv})</p>
      <p><strong>Nüfus:</strong> ${b.nufus} / ${b.nufusMax}</p>
      <p><strong>Adam Geliş Çarpanı:</strong> x${adamX} (Seviye ${b.yAdam})</p>
      ${binaEk}
      ${ek}
    `;

  d.innerHTML = `
    <h2>${b.ad}</h2>
    <p><strong>Kontrol:</strong> ${fraksiyonAdi(b.owner)}</p>
    ${ozelEk}
    ${sadakEk}
    ${kesifEk}
    ${gizliOzet}
  `;
}

export function islemlerCiz(cb) {
  const p = document.getElementById("islemler");
  const b = bolgeById(oyun.seciliId);
  if (!b) {
    p.innerHTML = `<h3>İşlemler</h3><p>Önce bir bölge seç.</p>`;
    return;
  }

  if (oyun.seciliId && sonSeciliBolgeId !== oyun.seciliId) {
    aktifSagSekme = b.owner === "biz" ? "islemler" : "detay";
    sonSeciliBolgeId = oyun.seciliId;
  }

  let html = `<h3>${b.ad} – İşlemler</h3>`;
  if (b.owner === 'biz') {
    const mGel = 100 * (1 + b.yGel),
      mGuv = 80 * (1 + b.yGuv),
      mAdam = 90 * (1 + b.yAdam);
    html += `
        <p>Bu bölge senin. Yatırım yapabilir veya birlik gönderebilirsin.</p>
        <div class="btn-grid">
          <button class="buton" id="btn-y-gel">Geliri Artır (+0.5x) [${mGel} ₺]</button>
          <button class="buton" id="btn-y-guv">Güvenliği Artır (+1) [${mGuv} ₺]</button>
          <button class="buton" id="btn-y-adam">Adam Gelişini Artır (x+0.7) [${mAdam} ₺]</button>
        </div>
        <div class="btn-grid" style="margin-top:8px">
          <button class="buton" id="btn-hareket-emri">Hareket Emri (Gönder → Hedef Seç)</button>
          <button class="buton grimsi" id="btn-toplanma">Toplanma Noktası Yap</button>
          <button class="buton" id="btn-toplanmaya-gonder">Toplanmaya Gönder</button>
        </div>
        <div class="btn-grid" style="margin-top:8px">
          <button class="buton" id="btn-sohret5">Şöhret +5</button>
          <button class="buton" id="btn-sohret10">Şöhret +10</button>
        </div>
        <p class="ipucu">Hareket emri aktifteyken karelerin üzerinde “Buraya Gönder” butonu çıkar.</p>
      `;
    html += binaPanelHTML(b);
    html += birimSatinAlPanelHTML();
  } else {
    const komsuVar = oyun.bolgeler.some(
      (x) => x.owner === 'biz' && komsuMu(x.id, b.id)
    );
    const tarafsiz = b.owner === 'tarafsiz';
    html += `
        <p>Bu bölge bizde değil.</p>
        ${tarafsiz
        ? `<button class="buton" id="btn-teslim" ${komsuVar ? `` : `disabled`
        }>Teslim Al (Rüşvet)</button>
             <p class="ipucu">Tarafsızlara saldırı yok. Kendi bölgeni seçip birlik gönderebilirsin; varınca bekler.</p>`
        : `<p class="tehlike">Düşman bölgesi</p>
             <div class="btn-grid">
               <button class="buton tehlike" id="btn-saldir" ${komsuVar ? `` : `disabled`}>Saldır</button>
               <button class="buton tehlike" id="btn-saldir-hizli" ${komsuVar ? `` : `disabled`}>Hızlı Saldırı</button>
               <button class="buton" id="btn-saldiri-emri">Saldırı Emri (Toplanmadan)</button>
             </div>
	             ${casuslukPanelHTML(b.id)}
	             <p class="ipucu">Veya kendi bölgeni seç → <strong>Hareket Emri</strong> → bu hedef için haritada “Buraya Gönder”.</p>`
      }
      `;
    html += `
      <hr><h4>🚘 Araç Operasyonu</h4>
      <p class="ipucu">Hedef bölgeden motor/araba çal. Başarısızlıkta suçluluk ve polis baskısı yükselir.</p>
      <div class="btn-grid">
        <button class="buton grimsi" id="btn-cal-motor" ${komsuVar ? "" : "disabled"}>🏍️ Motor Çal</button>
        <button class="buton grimsi" id="btn-cal-araba" ${komsuVar ? "" : "disabled"}>🚗 Araba Çal</button>
      </div>
    `;
  }

  // === ARAŞTIRMA PANELİ ===
  html += arastirmaPanelHTML();

  // === GÖREV PANELI ===
  html += gorevPanelHTML();

  // === ESİR PANELİ ===
  html += esirPanelHTML();

  p.innerHTML = html;

  // bağlamalar
  if (b.owner === "biz") {
    const g1 = document.getElementById("btn-y-gel");
    const g2 = document.getElementById("btn-y-guv");
    const g3 = document.getElementById("btn-y-adam");
    const bh = document.getElementById("btn-hareket-emri");
    const bt = document.getElementById("btn-toplanma");
    const btg = document.getElementById("btn-toplanmaya-gonder");
    const bs5 = document.getElementById("btn-sohret5");
    const bs10 = document.getElementById("btn-sohret10");
    if (g1) g1.onclick = cb.yatirimGelir;
    if (g2) g2.onclick = cb.yatirimGuv;
    if (g3) g3.onclick = cb.yatirimAdam;
    if (bh) bh.onclick = () => cb.hareketEmriBaslat();
    if (bt) bt.onclick = cb.toplanmaNoktasiYap;
    if (btg) btg.onclick = cb.toplanmayaGonder;
    if (bs5) bs5.onclick = () => cb.sohretSatinAl(5);
    if (bs10) bs10.onclick = () => cb.sohretSatinAl(10);
    document.querySelectorAll(".btn-bina-kur").forEach((btn) => {
      btn.onclick = () => cb.binaKur(btn.getAttribute("data-tip"));
    });
    document.querySelectorAll(".btn-bina-yukselt").forEach((btn) => {
      btn.onclick = () => cb.binaYukselt(btn.getAttribute("data-tip"));
    });
  } else {
    if (b.owner === "tarafsiz") {
      const t = document.getElementById("btn-teslim");
      if (t) t.onclick = cb.teslimAl;
    } else {
      const sa = document.getElementById("btn-saldir");
      const sh = document.getElementById("btn-saldir-hizli");
      const se = document.getElementById("btn-saldiri-emri");
      if (sa) sa.onclick = cb.saldiri;
      if (sh) sh.onclick = () => cb.saldiriHizliAcil(b.id);
      if (se) se.onclick = cb.saldiriEmriVer;
    }
    const cMotor = document.getElementById("btn-cal-motor");
    const cAraba = document.getElementById("btn-cal-araba");
    if (cMotor) cMotor.onclick = () => cb.tasitCal("motor");
    if (cAraba) cAraba.onclick = () => cb.tasitCal("araba");
  }

  // Birim satın alma butonları
  document.querySelectorAll(".btn-birim-al").forEach((btn) => {
    btn.onclick = () => {
      const tip = btn.getAttribute("data-tip");
      cb.birimSatinAl(tip);
    };
  });
  document.querySelectorAll(".btn-tasit-al").forEach((btn) => {
    btn.onclick = () => {
      const tip = btn.getAttribute("data-tip");
      cb.tasitSatinAl(tip);
    };
  });

  // Casusluk butonları
  const bKesif = document.getElementById("btn-kesif");
  const bSuikast = document.getElementById("btn-suikast");
  if (bKesif) bKesif.onclick = () => cb.casuslukOperasyon(b.id, "kesif");
  if (bSuikast) bSuikast.onclick = () => cb.casuslukOperasyon(b.id, "suikast");

  // Araştırma dal seçimi butonları
  document.querySelectorAll(".btn-arastirma-dal").forEach((btn) => {
    btn.onclick = () => {
      const dal = btn.getAttribute("data-dal");
      arastirmaDalDegistir(dal);
      uiGuncel(cb);
    };
  });

  // Fidye butonları
  document.querySelectorAll(".btn-fidye").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      const esir = oyun.esirler[idx];
      if (!esir) return;
      const maliyet = esir.adet * 15;
      if (oyun.fraksiyon.biz.para < maliyet) return;
      oyun.fraksiyon.biz.para -= maliyet;
      const dost = oyun.bolgeler.find((b2) => b2.owner === "biz");
      if (dost) {
        import("./state.js").then((m) => m.yiginaEkle(dost.id, "biz", esir.adet));
      }
      logYaz(`💰 ${esir.adet} esir fidye ile kurtarıldı!`);
      oyun.esirler.splice(idx, 1);
      islemlerCiz(cb);
    };
  });
}

// === YARDIMCI PANELLER ===
function birimSatinAlPanelHTML() {
  const secili = bolgeById(oyun.seciliId);
  const tasit = secili ? bolgeTasitDurumu(secili) : { motor: 0, araba: 0 };
  let html = `<hr><h4>🪖 Birlik Satın Al</h4>
    <div class="btn-grid">`;
  Object.entries(BIRIM_TIPLERI).forEach(([tipKey, t]) => {
    if (!t.satinAlinabilir) return;
    const maliyet = tipKey === "tetikci"
      ? Math.ceil(t.maliyet * (1 - arastirmaEfekt("tetikciMaliyetIndirim")))
      : t.maliyet;
    const yeterli = oyun.fraksiyon.biz.para >= maliyet;
    html += `<button class="buton grimsi btn-birim-al" data-tip="${tipKey}"
      ${yeterli ? "" : "disabled"}
      title="${t.aciklama}">
      ${t.ikon} ${t.ad} [${maliyet}₺]
    </button>`;
  });
  html += `</div><p class="ipucu" style="font-size:11px">
    Hiyerarşi: Genç → Tetikçi → Uzman → Ağır Silahlı
  </p>`;
  html += `<hr><h4>🚚 Taşıt Lojistiği</h4>
    <div style="font-size:12px;color:#aaa;margin-bottom:6px">
      Bu bölge stoku: ${tasit.araba} 🚗, ${tasit.motor} 🏍️
    </div>
    <div class="btn-grid">`;
  Object.entries(TASIT_TIPLERI).forEach(([tipKey, t]) => {
    const yeterli = oyun.fraksiyon.biz.para >= t.maliyet;
    html += `<button class="buton grimsi btn-tasit-al" data-tip="${tipKey}"
      ${yeterli ? "" : "disabled"}
      title="${t.ad} • Kapasite +${t.kapasite} • Bakım ${t.bakim.toFixed(2)}">
      ${t.ikon} ${t.ad} [${t.maliyet}₺]
    </button>`;
  });
  html += `</div><p class="ipucu" style="font-size:11px">
    Hareket için taşıt zorunlu: Motor 2 kişi, Araba 4 kişi taşır.
  </p>`;

  // Mevcut birimler özeti
  const bizBirimler = oyun.birimler.filter(b => b.owner === "biz");
  if (bizBirimler.length > 0) {
    const ozet = {};
    bizBirimler.forEach(b => {
      const tip = b.tip || "tetikci";
      ozet[tip] = (ozet[tip] || 0) + b.adet;
    });
    html += `<div style="font-size:11px;color:#aaa;margin-top:4px">`;
    Object.entries(ozet).forEach(([tip, adet]) => {
      const t = BIRIM_TIPLERI[tip];
      if (t) html += `${t.ikon} ${t.ad}: ${adet}  `;
    });
    html += `</div>`;
  }
  return html;
}

function binaPanelHTML(bolge) {
  const binalar = bolge.binalar || [];
  const limit = bolge.binaLimit || 2;
  const bosSlot = Math.max(0, limit - binalar.length);

  let html = `<hr><h4>🏗️ Bina Yönetimi</h4>`;
  if (binalar.length === 0) {
    html += `<p class="ipucu">Bu bölgede henüz bina yok. Boş slot: ${bosSlot}/${limit}</p>`;
  } else {
    html += `<div style="font-size:12px;margin-bottom:6px">`;
    binalar.forEach((kayit) => {
      const tanim = BINA_TIPLERI[kayit.tip];
      if (!tanim) return;
      html += `<div style="margin-bottom:6px;background:#1b1b1b;padding:7px 8px;border-radius:6px">
        <strong>${tanim.ikon} ${tanim.ad}</strong> • Seviye ${kayit.seviye}
        <div style="color:#9aa;font-size:11px">${tanim.aciklama}</div>
        ${kayit.seviye < 3
          ? `<button class="buton grimsi btn-bina-yukselt" data-tip="${kayit.tip}" style="margin-top:6px;font-size:11px;padding:4px 8px">Yükselt</button>`
          : `<div style="color:#2ecc71;font-size:11px;margin-top:6px">Maksimum seviye</div>`}
      </div>`;
    });
    html += `</div><p class="ipucu">Boş slot: ${bosSlot}/${limit}</p>`;
  }

  if (bosSlot > 0) {
    html += `<div class="btn-grid">`;
    Object.entries(BINA_TIPLERI).forEach(([tip, tanim]) => {
      const varMi = binalar.some((bina) => bina.tip === tip);
      if (varMi) return;
      html += `<button class="buton grimsi btn-bina-kur" data-tip="${tip}" title="${tanim.aciklama}">
        ${tanim.ikon} ${tanim.ad}
      </button>`;
    });
    html += `</div>`;
  }

  return html;
}

function casuslukPanelHTML(hedefId) {
  const tasit = ownerToplamTasit("biz");
  const kapasite = ownerToplamKapasite("biz");
  const kesifUygun = operasyonMumkunMu(hedefId, "kesif");
  const suikastUygun = operasyonMumkunMu(hedefId, "suikast");
  const hedef = bolgeById(hedefId);
  const hedefFr = hedef ? oyun.fraksiyon[hedef.owner] : null;
  const liderDevreDisi = hedefFr?._liderDevreDisi && oyun.tur <= hedefFr._liderDevreDisi;
  const kesifAktif = kesifAktifMi(hedefId);

  let html = `<hr><h4>🕵️ Casusluk</h4>
    <div style="font-size:12px;color:#aaa;margin-bottom:6px">
      Taşıt: ${tasit.araba} 🚗, ${tasit.motor} 🏍️ (Toplam kapasite: ${kapasite})
    </div>
    <div class="btn-grid">
      <button class="buton grimsi btn-kesif" id="btn-kesif"
        ${kesifUygun ? "" : "disabled"}
        title="1 ekip + 2 kişilik taşıt kapasitesi + 100₺ — Başarıda kayıp yok">
        🔍 Keşif [100₺]${kesifAktif ? " ✓" : ""}
      </button>
      <button class="buton tehlike btn-suikast" id="btn-suikast"
        ${suikastUygun && !liderDevreDisi ? "" : "disabled"}
        title="2 ekip + 4 kişilik taşıt kapasitesi + 300₺ — Başarıda kayıp yok">
        🗡️ Suikast [300₺]${liderDevreDisi ? " (devre dışı)" : ""}
      </button>
    </div>`;
  return html;
}

function arastirmaPanelHTML() {
  arastirmaDurumunuDogrula();
  const ar = oyun.arastirma;
  if (!ar) return "";
  const puan = arastirmaPuanDetayi("biz");
  const aktifDalId = ar.aktifDal || Object.keys(ARASTIRMA_DALLARI)[0];
  const aktifDal = ARASTIRMA_DALLARI[aktifDalId];
  const aktifDurum = ar[aktifDalId] || { seviye: 0, puan: 0 };
  const sonrakiSeviye = aktifDal?.seviyeler?.[aktifDurum.seviye];
  const kalanPuan = sonrakiSeviye ? Math.max(0, sonrakiSeviye.gerekPuan - (aktifDurum.puan || 0)) : 0;
  const tahminiTur = puan.toplam > 0 && sonrakiSeviye ? Math.ceil(kalanPuan / puan.toplam) : 0;
  let html = `<hr><h4>🔬 Araştırma Programı</h4>
    <div style="background:#141b1f;border:1px solid #203745;border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
        <strong style="color:#8fd3ff">${aktifDal?.ikon || "🔬"} ${aktifDal?.ad || "Araştırma"}</strong>
        <span style="font-size:12px;color:#d8ecf8">+${puan.toplam} puan/tur</span>
      </div>
      <div style="font-size:12px;color:#aab7c4;line-height:1.5">
        Taban: +${puan.taban} • Üniversite: +${puan.universite} • Laboratuvar: +${puan.laboratuvar}
      </div>
      <div style="font-size:12px;color:#d0d7de;margin-top:8px">
        ${sonrakiSeviye
          ? `Sıradaki: ${sonrakiSeviye.ad} • ${aktifDurum.puan || 0}/${sonrakiSeviye.gerekPuan} puan • Tahmini ${tahminiTur} tur`
          : `Bu dal maksimum seviyeye ulaştı`}
      </div>
      <button class="buton" id="btn-arastirma-sayfa" style="margin-top:10px">Araştırma Ağacını Aç</button>
    </div>
    <div class="arastirma-baslik">Odağı Değiştir:</div>
    <div class="arastirma-dal-sec">`;
  Object.entries(ARASTIRMA_DALLARI).forEach(([dalId, dal]) => {
    const aktif = ar.aktifDal === dalId;
    html += `<button class="buton grimsi btn-arastirma-dal" data-dal="${dalId}"
      style="${aktif ? "border:1px solid #3498db;" : ""}font-size:11px;padding:3px 7px">
      ${dal.ikon} ${dal.ad}
    </button>`;
  });
  html += `</div>`;
  return html;
}

function gorevPanelHTML() {
  let html = `<hr><h4>📋 Görevler</h4>`;
  const aktif = oyun.gorevler.aktif;
  if (aktif.length === 0) {
    html += `<p class="ipucu">Henüz görev yok. Her 20 turda yeni görev gelir.</p>`;
  } else {
    aktif.forEach((g) => {
      const odulStr = [];
      if (g.odul.para) odulStr.push(`${g.odul.para}₺`);
      if (g.odul.sohret) odulStr.push(`+${g.odul.sohret} şöhret`);
      if (g.odul.adam) odulStr.push(`+${g.odul.adam} adam`);
      html += `<div style="background:#1a2a1a;padding:6px 8px;border-radius:6px;margin:4px 0;font-size:12px">
        <strong>${g.ad}</strong> <span style="color:#f39c12">(${g.kalanTur} tur)</span><br>
        Ödül: ${odulStr.join(', ')}
      </div>`;
    });
  }
  // Tamamlanan görevler (son 3)
  const bitmis = oyun.gorevler.tamamlanan.slice(-3);
  if (bitmis.length > 0) {
    html += `<div style="font-size:11px;color:#888;margin-top:4px">`;
    bitmis.forEach((g) => {
      html += `<div>✅ ${g.ad} (tur ${g.tamamlanmaTur})</div>`;
    });
    html += `</div>`;
  }
  return html;
}

function esirPanelHTML() {
  const bizEsir = oyun.esirler.filter((e) => e.owner === "biz");
  const bizTutuyor = oyun.esirler.filter((e) => e.tutulan === "biz");
  if (bizEsir.length === 0 && bizTutuyor.length === 0) return '';
  let html = `<hr><h4>⛓️ Esirler</h4>`;
  if (bizEsir.length > 0) {
    html += `<div style="font-size:12px;color:#e74c3c">`;
    bizEsir.forEach((e, i) => {
      const tutulanAd = oyun.fraksiyon[e.tutulan]?.ad || e.tutulan;
      const maliyet = e.adet * 15;
      const globalIdx = oyun.esirler.indexOf(e);
      html += `<div>${e.adet} adamamız ${tutulanAd} elinde. 
        <button class="buton grimsi btn-fidye" data-idx="${globalIdx}" style="font-size:11px;padding:2px 6px">Fidye: ${maliyet}₺</button>
      </div>`;
    });
    html += `</div>`;
  }
  if (bizTutuyor.length > 0) {
    html += `<div style="font-size:12px;color:#2ecc71">`;
    bizTutuyor.forEach((e) => {
      const sahibi = oyun.fraksiyon[e.owner]?.ad || e.owner;
      html += `<div>${e.adet} ${sahibi} esiri elimizde.</div>`;
    });
    html += `</div>`;
  }
  return html;
}

export function isimModalGoster() {
  document.getElementById("isim-arka").style.display = "flex";
}
export function isimModalBagla(onRandom, onStart) {
  document.getElementById("isim-random").onclick = onRandom;
  document.getElementById("isim-basla").onclick = onStart;
}

export function isimModalKapat() {
  document.getElementById("isim-arka").style.display = "none";
}

export function bitisBanner(metin, { tip = "ai-kazandi", kazananAd = "" } = {}) {
  // Tam ekran overlay
  const overlay = document.getElementById("bitis-overlay");
  if (overlay) {
    const emoji = { kazandin: "🏆", kaybettin: "💀", "ai-kazandi": "😤" }[tip] || "🏁";
    const baslikSinif = { kazandin: "kazandin", kaybettin: "kaybettin", "ai-kazandi": "ai-kazandi" }[tip] || "";

    document.getElementById("bitis-emoji").textContent = emoji;
    const baslikEl = document.getElementById("bitis-baslik");
    baslikEl.textContent = metin;
    baslikEl.className = `bitis-baslik ${baslikSinif}`;

    const altMetin = tip === "kazandin"
      ? "Tüm bölgeler senin kontrolünde!"
      : tip === "kaybettin"
        ? `${kazananAd} tüm şehri ele geçirdi.`
        : `${kazananAd} oyunu kazandı.`;
    document.getElementById("bitis-alt").textContent = altMetin;

    // İstatistikler
    document.getElementById("stat-tur").textContent = oyun.tur;
    document.getElementById("stat-bolge").textContent = oyun.istatistikler?.fetihler ?? "—";
    document.getElementById("stat-savas").textContent = oyun.istatistikler?.kazanilanSavaslar ?? "—";
    document.getElementById("stat-sohret").textContent = Math.round(oyun.sohret.biz ?? 0);

    overlay.style.display = "flex";

    // Yeniden Oyna butonu
    const btn = document.getElementById("bitis-yeniden");
    if (btn) btn.onclick = () => location.reload();
  }
}
