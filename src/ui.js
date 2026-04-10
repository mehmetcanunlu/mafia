import {
  oyun,
  bolgeById,
  fraksiyonAdi,
  bizBolgeSayisi,
  rozetSayilari,
  ownerToplamPersonel,
  ownerPersonelTavan,
} from "./state.js";
import { BOLGE_OZELLIKLERI, AYAR, BINA_TIPLERI, EKONOMI_DENGE, DIPLOMASI, liderAvatarUrl } from "./config.js";
import { istatistikGrafik } from "./stats.js";
import { ISTANBUL_ILCELER, KOPRULER } from "./istanbul.js";
import { sadakatRenk, sadakatEtiket } from "./loyalty.js";
import { BIRIM_TIPLERI, TASIT_TIPLERI, ownerBakimToplami } from "./units.js";
import { gucSiralamasiHesapla } from "./gucDengesi.js";
import {
  ARASTIRMA_DALLARI,
  dalIlerleme,
  arastirmaDalDegistir,
  arastirmaEfekt,
  arastirmaPuanDetayi,
  arastirmaDurumunuDogrula,
} from "./research.js";
import { kesifAktifMi, operasyonMumkunMu, kesifMaliyeti, suikastMaliyeti } from "./spy.js";
import { ownerTasit, ownerToplamKapasite, ownerToplamTasit } from "./logistics.js";
import { diplomasiOzet, iliskiDurumu, isDostIttifak } from "./diplomasi.js";

export function logYaz(msg) {
  const p = document.getElementById("log");
  const d = document.createElement("div");
  d.textContent = `[${oyun.tur}. tur] ${msg}`;
  p.insertBefore(d, p.firstChild);
}

function liderAvatarHTML(lider, boyut = 20) {
  if (!lider) return "";
  const src = lider.avatarUrl || liderAvatarUrl(lider);
  if (!src) return "";
  const safeSrc = String(src).replace(/"/g, "&quot;");
  const safeAd = String(lider.ad || "Lider").replace(/"/g, "&quot;");
  return `<img src="${safeSrc}" alt="${safeAd}" style="width:${boyut}px;height:${boyut}px;border-radius:50%;border:1px solid rgba(255,255,255,.35);vertical-align:middle;object-fit:cover;margin-right:4px">`;
}

function htmlEsc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let aktifSagSekme = "detay";
let sonSeciliBolgeId = null;
let arastirmaSayfaAcik = false;
let arastirmaSayfaFiltre = "tum";
let arastirmaSayfaScrollTop = 0;
const arastirmaDalScrollLeft = new Map();
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
const istanbulHareketCache = new Map();
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
const HARITA_MODLARI = Object.freeze({
  siyasi: { ad: "Siyasi", tus: "1" },
  askeri: { ad: "Askeri", tus: "2" },
  ekonomik: { ad: "Ekonomik", tus: "3" },
});
const HARITA_MOD_SIRASI = Object.freeze(["siyasi", "askeri", "ekonomik"]);
let aktifHaritaModu = "siyasi";
let haritaKisayolBagli = false;
let duraklatKisayolBagli = false;
let contextMenuKapatBagli = false;
let profilMenuAcik = false;
let profilSonAcilanBolgeId = null;
let profilAcilisTalepBolgeId = null;
let diploGunlukFiltre = "tum";
const ARASTIRMA_EFEKT_BILGI = Object.freeze({
  tetikciMaliyetIndirim: { ad: "Tetikçi maliyet indirimi", tip: "pct" },
  alimTurKotasiBonus: { ad: "Alım tur kotası", tip: "int" },
  alimEkMaliyetAzaltma: { ad: "Alım ek maliyet azaltma", tip: "pct" },
  personelTavanBonus: { ad: "Personel tavanı", tip: "int" },
  alimSadakatCezaAzaltma: { ad: "Alım sadakat ceza azaltma", tip: "pct" },
  egitimSureAzaltma: { ad: "Eğitim süresi azaltma", tip: "turn" },
  garnizonBonus: { ad: "Garnizon bonusu", tip: "pct" },
  saldiriBonus: { ad: "Saldırı bonusu", tip: "pct" },
  isyanBastirmaBonus: { ad: "İsyan bastırma bonusu", tip: "pct" },
  tasitMaliyetIndirim: { ad: "Taşıt maliyet indirimi", tip: "pct" },
  bakimIndirim: { ad: "Bakım indirimi", tip: "pct" },
  tasitTavanBonus: { ad: "Taşıt tavanı", tip: "int" },
  tasitHirsizlikBonus: { ad: "Taşıt hırsızlık bonusu", tip: "pct" },
  gelirBonus: { ad: "Gelir bonusu", tip: "pct" },
  haracGelirBonus: { ad: "Haraç gelir bonusu", tip: "pct" },
  pasifGelir: { ad: "Pasif gelir", tip: "money" },
  geceEkonomiBonus: { ad: "Gece ekonomi bonusu", tip: "pct" },
  diplomasiMaliyetIndirim: { ad: "Diplomasi maliyet indirimi", tip: "pct" },
  olayKontrolBonus: { ad: "Olay kontrol bonusu", tip: "pct" },
  polisKorumaBonus: { ad: "Polis koruma bonusu", tip: "pct" },
  kesifBonus: { ad: "Keşif bonusu", tip: "pct" },
  kesifSureBonus: { ad: "Keşif süresi", tip: "turn" },
  suikastBonus: { ad: "Suikast bonusu", tip: "pct" },
  operasyonMaliyetIndirim: { ad: "Operasyon maliyet indirimi", tip: "pct" },
  polisBaskinRiskAzaltma: { ad: "Polis baskın risk azaltma", tip: "pct" },
  isyanRiskAzaltma: { ad: "İsyan risk azaltma", tip: "pct" },
  haracSadakatCezaAzaltma: { ad: "Haraç sadakat ceza azaltma", tip: "pct" },
  suclulukArtisAzaltma: { ad: "Suçluluk artış azaltma", tip: "pct" },
  haracPolisArtisAzaltma: { ad: "Haraç polis artış azaltma", tip: "pct" },
});

function arastirmaEfektParcaMetni(anahtar, deger) {
  const bilgi = ARASTIRMA_EFEKT_BILGI[anahtar] || { ad: anahtar, tip: "num" };
  const n = Number(deger);
  if (!Number.isFinite(n) || n === 0) return "";
  const isaret = n > 0 ? "+" : "-";
  const mutlak = Math.abs(n);

  if (bilgi.tip === "pct") {
    const yuzdeHam = mutlak * 100;
    const yuzde = yuzdeHam >= 10 ? Math.round(yuzdeHam) : Math.round(yuzdeHam * 10) / 10;
    return `${bilgi.ad} ${isaret}%${yuzde}`;
  }
  if (bilgi.tip === "money") {
    return `${bilgi.ad} ${isaret}${Math.round(mutlak)}₺/tur`;
  }
  if (bilgi.tip === "turn") {
    return `${bilgi.ad} ${isaret}${Math.round(mutlak)} tur`;
  }
  if (bilgi.tip === "int") {
    return `${bilgi.ad} ${isaret}${Math.round(mutlak)}`;
  }
  return `${bilgi.ad} ${isaret}${Math.round(mutlak * 100) / 100}`;
}

function arastirmaEfektKutuMetni(efekt) {
  if (!efekt || typeof efekt !== "object") return "";
  const parcalar = Object.entries(efekt)
    .map(([anahtar, deger]) => arastirmaEfektParcaMetni(anahtar, deger))
    .filter(Boolean);
  return parcalar.join(" • ");
}

function istanbulDomCacheSifirla() {
  if (istanbulEtiketFitTimer) {
    clearTimeout(istanbulEtiketFitTimer);
    istanbulEtiketFitTimer = null;
  }
  istanbulPathCache.clear();
  istanbulLabelCache.clear();
  istanbulHareketCache.clear();
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

function ilceHareketIndikatorKonumGuncelle(bolgeId, labelEl, svg = null) {
  if (!labelEl) return;
  const indikator =
    istanbulHareketCache.get(bolgeId)
    || (svg ? svg.querySelector(`[data-hareket-id="${bolgeId}"]`) : document.querySelector(`[data-hareket-id="${bolgeId}"]`));
  if (!indikator) return;
  if (!istanbulHareketCache.has(bolgeId)) istanbulHareketCache.set(bolgeId, indikator);
  const x = Number(labelEl.getAttribute("x"));
  const y = Number(labelEl.getAttribute("y"));
  const fontSize = parseFloat(labelEl.style.fontSize || "8");
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const offset = Math.max(5.2, fontSize * 0.9);
  indikator.setAttribute("x", x.toFixed(1));
  indikator.setAttribute("y", (y + offset).toFixed(1));
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
    ilceHareketIndikatorKonumGuncelle(b.id, label, svg);
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
    let adMetni = b.ad;
    let bilgiMetni = bolgeEtiketIstihbaratMetni(b, "normal");
    let etiketMetni = bilgiMetni ? `${adMetni} ${bilgiMetni}` : adMetni;
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
      if (kisa && kisa !== adMetni) {
        adMetni = kisa;
      }
      if (bilgiMetni) {
        bilgiMetni = bolgeEtiketIstihbaratMetni(b, "kisa");
      }
      etiketMetni = bilgiMetni ? `${adMetni} ${bilgiMetni}` : adMetni;
      label.textContent = etiketMetni;
      gercekGenislik = metinGenisligi();
    }

    if (gercekGenislik > maxEtiketW * 1.06 && bilgiMetni) {
      bilgiMetni = bolgeEtiketIstihbaratMetni(b, "dar");
      etiketMetni = bilgiMetni ? `${adMetni} ${bilgiMetni}` : adMetni;
      label.textContent = etiketMetni;
      gercekGenislik = metinGenisligi();
    }

    if (dusukZoom && gercekGenislik > maxEtiketW * 1.1) {
      const kisa = ilceKisaAdi(b);
      if (kisa && kisa !== adMetni) {
        adMetni = kisa;
        etiketMetni = bilgiMetni ? `${adMetni} ${bilgiMetni}` : adMetni;
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
    ilceHareketIndikatorKonumGuncelle(b.id, label);
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
    const shift = !!e?.shiftKey;
    drag = null;
    tiklananBolgeId = null;
    svgKap.classList.remove("panning");
    istanbulEtiketFitPlanla(svg, 0);
    istanbulSuruklemePx = 0;
    if (secimId && typeof onBolgeSec === "function") onBolgeSec(secimId, { shiftKey: shift, kaynak: "pointer" });
  };
  svg.addEventListener("pointerup", dragBitir);
  svg.addEventListener("pointercancel", dragBitir);
  svg.addEventListener("dblclick", (e) => {
    const hedefPath = e.target?.closest?.(".ilce-path");
    const bolgeId = hedefPath?.getAttribute("data-id");
    const hedef = bolgeId ? bolgeById(bolgeId) : null;
    if (hedef && hedef.owner !== "biz" && hedef.owner !== "tarafsiz" && typeof onBolgeSec === "function") {
      e.preventDefault();
      onBolgeSec(bolgeId, { dblclick: true, kaynak: "dblclick" });
      return;
    }
    e.preventDefault();
    const center = istanbulEkranToDunya(svg, e.clientX, e.clientY);
    istanbulZoomUygula(svg, 0.82, center);
  });
  svg.addEventListener("contextmenu", (e) => {
    const hedefPath = e.target?.closest?.(".ilce-path");
    const bolgeId = hedefPath?.getAttribute("data-id");
    if (!bolgeId) return;
    e.preventDefault();
    if (e.shiftKey) {
      haritaContextMenuAc(e.clientX, e.clientY, bolgeId, onBolgeSec);
      return;
    }
    if (typeof onBolgeSec === "function") {
      onBolgeSec(bolgeId, { contextmenu: true, kaynak: "contextmenu" });
    }
  });
}

function haritaContextMenuKapat() {
  const menu = document.getElementById("harita-context-menu");
  if (!menu) return;
  menu.style.display = "none";
  menu.innerHTML = "";
}

function haritaContextMenuAc(x, y, bolgeId, onBolgeSec) {
  const bolge = bolgeById(bolgeId);
  if (!bolge) return;

  let menu = document.getElementById("harita-context-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "harita-context-menu";
    menu.style.cssText = "position:fixed;z-index:10020;min-width:180px;background:rgba(12,20,30,.96);border:1px solid rgba(255,255,255,.16);border-radius:10px;padding:6px;box-shadow:0 10px 28px rgba(0,0,0,.45);backdrop-filter:blur(4px);";
    document.body.appendChild(menu);
  }

  const secVeYenile = () => {
    oyun.seciliId = bolgeId;
    if (aktifCallbacklar) uiGuncel(aktifCallbacklar);
  };

  const aksiyonlar = [];
  aksiyonlar.push({
    etiket: "Bölgeyi Seç",
    calistir: () => {
      if (typeof onBolgeSec === "function") onBolgeSec(bolgeId, { kaynak: "context" });
      else secVeYenile();
    },
  });

  if (bolge.owner === "tarafsiz") {
    aksiyonlar.push({
      etiket: "💰 Rüşvet ile Teslim Al",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.teslimAl?.();
      },
    });
  } else if (bolge.owner !== "biz") {
    aksiyonlar.push({
      etiket: "⚔ Hızlı Saldırı",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.saldiriHizliAcil?.(bolgeId);
      },
    });
    aksiyonlar.push({
      etiket: "🔍 Keşif",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.casuslukOperasyon?.(bolgeId, "kesif");
      },
    });
    aksiyonlar.push({
      etiket: "🗡️ Suikast",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.casuslukOperasyon?.(bolgeId, "suikast");
      },
    });
  } else {
    aksiyonlar.push({
      etiket: "📦 Hareket Emri Başlat",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.hareketEmriBaslat?.();
      },
    });
    aksiyonlar.push({
      etiket: "📍 Toplanma Noktası Ekle/Çıkar",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.toplantiNoktasiYap?.();
      },
    });
    aksiyonlar.push({
      etiket: "🚚 Toplanma Noktalarına Çağır",
      calistir: async () => {
        secVeYenile();
        const cagir = aktifCallbacklar?.toplantiNoktasinaCagir || aktifCallbacklar?.toplantiNoktasinaGonder;
        if (typeof cagir === "function") await cagir();
      },
    });
    aksiyonlar.push({
      etiket: "🧹 Toplanma Noktalarını Sıfırla",
      calistir: async () => {
        secVeYenile();
        await aktifCallbacklar?.toplantiNoktalariSifirla?.();
      },
    });
  }

  menu.innerHTML = `
    <div style="padding:4px 6px 6px 6px;font-size:11px;color:#a9bdd2;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:4px;">
      ${bolge.ad} • ${fraksiyonAdi(bolge.owner)}
    </div>
  `;
  aksiyonlar.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = "buton grimsi";
    btn.style.cssText = "display:block;width:100%;text-align:left;margin:4px 0;padding:7px 9px;font-size:12px;";
    btn.textContent = a.etiket;
    btn.onclick = async (e) => {
      e.stopPropagation();
      haritaContextMenuKapat();
      await a.calistir();
    };
    menu.appendChild(btn);
  });

  menu.style.display = "block";
  menu.style.left = `${Math.min(window.innerWidth - 210, Math.max(8, x))}px`;
  menu.style.top = `${Math.min(window.innerHeight - 220, Math.max(8, y))}px`;

  if (!contextMenuKapatBagli) {
    contextMenuKapatBagli = true;
    document.addEventListener("click", () => haritaContextMenuKapat());
    document.addEventListener("scroll", () => haritaContextMenuKapat(), true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") haritaContextMenuKapat();
    });
  }
}

function sagSekmeAyarla(sekmeId) {
  const hedefSekme = document.querySelector(`.sag-sekme[data-sekme="${sekmeId}"]`) ? sekmeId : "detay";
  aktifSagSekme = hedefSekme;
  document.querySelectorAll(".sag-sekme").forEach((btn) => {
    btn.classList.toggle("aktif", btn.getAttribute("data-sekme") === hedefSekme);
  });
  document.querySelectorAll(".sag-panel").forEach((panel) => {
    panel.classList.toggle("aktif", panel.getAttribute("data-panel") === hedefSekme);
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
    .filter((k) => !k._sil && !k.hedefId && (!k.rota || k.rota.length === 0))
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

function bolgeHazirBirimSayisi(bolgeId, owner = null) {
  const hedefOwner = owner ?? bolgeById(bolgeId)?.owner;
  if (!hedefOwner || hedefOwner === "tarafsiz") return 0;
  return oyun.birimler
    .filter((k) => k.konumId === bolgeId && k.owner === hedefOwner)
    .filter((k) => !k._sil && !k.hedefId && (!k.rota || k.rota.length === 0))
    .reduce((t, k) => t + (k.adet || 0), 0);
}

function dusmanIstihbaratiGizliMi(bolge) {
  if (!bolge) return false;
  return bolge.owner !== "biz" && bolge.owner !== "tarafsiz" && !kesifAktifMi(bolge.id);
}

function bolgeBirlikToplami(bolgeId, owner = null, sadeceHazir = false) {
  const hedefOwner = owner ?? bolgeById(bolgeId)?.owner;
  if (!hedefOwner || hedefOwner === "tarafsiz") return 0;
  return oyun.birimler
    .filter((u) => u.konumId === bolgeId && u.owner === hedefOwner && !u._sil)
    .filter((u) => (sadeceHazir ? (!u.hedefId && (!u.rota || u.rota.length === 0)) : true))
    .reduce((t, u) => t + (u.adet || 0), 0);
}

function bolgeGidenKonvoyToplami(bolgeId, owner = null) {
  const hedefOwner = owner ?? bolgeById(bolgeId)?.owner;
  if (!hedefOwner || hedefOwner === "tarafsiz") return 0;
  return oyun.birimler
    .filter((u) => u.konumId === bolgeId && u.owner === hedefOwner && u.hedefId && u.hedefId !== bolgeId && !u._sil)
    .reduce((t, u) => t + (u.adet || 0), 0);
}

function bolgeGeliriHesapla(bolge) {
  return Math.round((bolge?.gelir || 0) * (1 + (bolge?.yGel || 0) * 0.5));
}

function bolgeEtiketIstihbaratMetni(bolge, seviye = "normal", mod = aktifHaritaModu) {
  if (!bolge || dusmanIstihbaratiGizliMi(bolge)) return "";
  const birlikToplam = bolgeBirlikToplami(bolge.id, bolge.owner, true);
  const gidenToplam = bolgeGidenKonvoyToplami(bolge.id, bolge.owner);
  const gelir = bolgeGeliriHesapla(bolge);
  if (mod === "askeri") {
    if (seviye === "dar") return gidenToplam > 0 ? `A${birlikToplam}→${gidenToplam}` : `A${birlikToplam}`;
    return gidenToplam > 0 ? `⚔${birlikToplam} ▶${gidenToplam}` : `⚔${birlikToplam}`;
  }
  if (mod === "ekonomik") {
    return seviye === "dar" ? `+${gelir}` : `+${gelir}₺`;
  }
  return "";
}

function bolgeTooltipMetni(bolge) {
  if (dusmanIstihbaratiGizliMi(bolge)) {
    if (aktifHaritaModu === "askeri") return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - Askeri istihbarat: ?`;
    if (aktifHaritaModu === "ekonomik") return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - Ekonomi istihbaratı: ?`;
    return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - İstihbarat: ?`;
  }

  const birlikToplam = bolgeBirlikToplami(bolge.id, bolge.owner, true);
  const savunmaPuani = (bolge.guv || 0) + (bolge.yGuv || 0);

  if (aktifHaritaModu === "askeri") {
    return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - Birlik: ${birlikToplam} | Savunma: ${savunmaPuani}`;
  }
  if (aktifHaritaModu === "ekonomik") {
    const gelir = bolgeGeliriHesapla(bolge);
    return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - Gelir: ${gelir}₺ | Adam x${(1 + (bolge.yAdam || 0) * 0.7).toFixed(1)}`;
  }
  return `${bolge.ad} (${fraksiyonAdi(bolge.owner)}) - Garnizon: ${bolgeHazirBirimSayisi(bolge.id, bolge.owner)}`;
}

function bolgeMetrikDegeri(bolge, mod) {
  if (mod !== "siyasi" && dusmanIstihbaratiGizliMi(bolge)) {
    return Number.NaN;
  }
  if (mod === "askeri") {
    return bolgeBirlikToplami(bolge.id, bolge.owner, true);
  }
  if (mod === "ekonomik") {
    return (bolge.gelir || 0) * (1 + (bolge.yGel || 0) * 0.5);
  }
  return 0;
}

function normalizasyonaCevir(v, min, max) {
  if (!Number.isFinite(v)) return 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function bolgeRenkHesapla(bolge, mod, min, max) {
  if (mod === "siyasi") return "";
  if (dusmanIstihbaratiGizliMi(bolge)) {
    return "hsl(215 18% 34%)";
  }
  const v = bolgeMetrikDegeri(bolge, mod);
  const n = normalizasyonaCevir(v, min, max);
  if (mod === "askeri") {
    const light = 84 - n * 48;
    return `hsl(8 72% ${light}%)`;
  }
  if (mod === "ekonomik") {
    const light = 85 - n * 44;
    return `hsl(38 78% ${light}%)`;
  }
  const light = 86 - n * 46;
  if (v <= 0) return "hsl(215 18% 38%)";
  return `hsl(196 76% ${light}%)`;
}

function haritaModLegendMetni(mod) {
  if (mod === "askeri") return "Düşük birlik  •  Yüksek birlik";
  if (mod === "ekonomik") return "Düşük gelir  •  Yüksek gelir";
  return "Sahiplik renkleri";
}

function haritaModUstKontrolHTML() {
  return `<span id="harita-mod-kontrol-ust" style="display:inline-flex;gap:4px;vertical-align:middle">${HARITA_MOD_SIRASI.map((mod) => {
    const ad = HARITA_MODLARI[mod]?.ad || mod;
    const tus = HARITA_MODLARI[mod]?.tus || "?";
    const aktif = mod === aktifHaritaModu;
    return `<button class="buton grimsi harita-mod-btn" data-map-mod="${mod}" style="min-height:26px;padding:3px 8px;font-size:11px;${aktif ? "border-color:#f5c542;color:#f5c542;background:rgba(245,197,66,.12);" : ""}" title="${ad} [${tus}]">${tus} ${ad}</button>`;
  }).join("")}</span>`;
}

function haritaModUstKontrolBagla() {
  document.querySelectorAll(".harita-mod-btn").forEach((btn) => {
    if (btn.dataset.bagli === "1") return;
    btn.dataset.bagli = "1";
    btn.onclick = () => {
      const mod = btn.getAttribute("data-map-mod");
      if (!mod) return;
      haritaModSec(mod);
    };
  });
}

function haritaModEfsaneGuncelle() {
  const kap = document.getElementById("istanbul-svg-kap");
  if (!kap) return;
  let kutu = document.getElementById("harita-mod-legend");
  if (!kutu) {
    kutu = document.createElement("div");
    kutu.id = "harita-mod-legend";
    kutu.style.cssText = "position:absolute;left:12px;bottom:12px;z-index:28;padding:8px 10px;border-radius:9px;background:rgba(7,14,22,.82);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(4px);font-size:11px;color:#dbe7f6;min-width:180px;";
    kap.appendChild(kutu);
  }
  const mod = HARITA_MODLARI[aktifHaritaModu] || HARITA_MODLARI.siyasi;
  const grad =
    aktifHaritaModu === "askeri"
      ? "linear-gradient(90deg, hsl(8 72% 84%), hsl(8 72% 36%))"
      : aktifHaritaModu === "ekonomik"
        ? "linear-gradient(90deg, hsl(38 78% 85%), hsl(38 78% 42%))"
        : "linear-gradient(90deg, #1e8449, #922b21, #6c2bb8, #b7950b)";
  kutu.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
      <strong>Harita Modu: ${mod.ad}</strong>
      <span style="font-size:10px;opacity:.8">[${mod.tus}]</span>
    </div>
    <div style="height:6px;border-radius:4px;margin-top:6px;background:${grad};"></div>
    <div style="margin-top:4px;opacity:.85">${haritaModLegendMetni(aktifHaritaModu)}</div>
  `;
}

function haritaModSec(mod, sessiz = false) {
  if (!HARITA_MODLARI[mod]) return;
  if (aktifHaritaModu === mod) return;
  aktifHaritaModu = mod;
  const svgKap = document.getElementById("istanbul-svg-kap");
  const svg = document.getElementById("istanbul-svg");
  if (svgKap) svgKap.setAttribute("data-mod", mod);
  if (svg) svg.setAttribute("data-mod", mod);
  haritaGuncel();
  durumCiz();
  ustPanelOyunButonlariniBagla(aktifCallbacklar);
  if (!sessiz) logYaz(`🗺️ Harita modu: ${HARITA_MODLARI[mod].ad}`);
}

function haritaModKisayolBagla() {
  if (haritaKisayolBagli) return;
  haritaKisayolBagli = true;
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (!/^[1-9]$/.test(e.key)) return;
    const idx = Number(e.key) - 1;
    if (idx < 0 || idx >= HARITA_MOD_SIRASI.length) return;
    haritaModSec(HARITA_MOD_SIRASI[idx]);
  });
}

function duraklatKisayolBagla() {
  if (duraklatKisayolBagli) return;
  duraklatKisayolBagli = true;
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.repeat) return;
    if (e.code !== "Space" && e.key !== " ") return;
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    e.preventDefault();
    if (typeof aktifCallbacklar?.duraklatDevam === "function") {
      aktifCallbacklar.duraklatDevam();
    }
  });
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

function konvoyDurumIkonu(konvoylar) {
  if (!Array.isArray(konvoylar) || !konvoylar.length) return "";
  if (konvoylar.some((u) => u.bekliyor)) return "⏸";
  if (konvoylar.some((u) => u.operasyonId)) return "⚔";
  if (konvoylar.some((u) => u.gecisHakki)) return "↗";
  return "▶";
}

function konvoyTahminiKalanTur(konvoy) {
  if (!konvoy || !konvoy.hedefId) return 0;
  const rotaUzunlugu = Array.isArray(konvoy.rota) ? konvoy.rota.length : 0;
  const adimSayisi = 1 + rotaUzunlugu;
  const ilkTurGecikme = konvoy._hazir ? 0 : 1;
  return adimSayisi + ilkTurGecikme;
}

function konvoyGrubuTahminiTurMetni(konvoylar) {
  if (!Array.isArray(konvoylar) || !konvoylar.length) return "";
  const turlar = konvoylar
    .map((k) => konvoyTahminiKalanTur(k))
    .filter((t) => Number.isFinite(t) && t > 0);
  if (!turlar.length) return "";
  const min = Math.min(...turlar);
  const max = Math.max(...turlar);
  return min === max ? `${min} tur` : `${min}-${max} tur`;
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

function ensureProfilYanMenu() {
  if (document.getElementById("profil-sol-arka")) return;
  const wrap = document.createElement("div");
  wrap.id = "profil-sol-arka";
  wrap.style.cssText =
    "display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10030;align-items:stretch;justify-content:flex-start";
  wrap.innerHTML = `
    <aside id="profil-sol-menu" style="width:min(420px,92vw);height:100%;background:#141c26;color:#e8eef7;border-right:1px solid rgba(255,255,255,.12);box-shadow:10px 0 34px rgba(0,0,0,.45);display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px 14px;border-bottom:1px solid rgba(255,255,255,.1)">
        <strong>👤 Bölge Profili</strong>
        <button id="profil-sol-kapat" class="buton grimsi">Kapat</button>
      </div>
      <div id="profil-sol-menu-icerik" style="padding:12px;overflow:auto"></div>
    </aside>
  `;
  document.body.appendChild(wrap);

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) profilYanMenuKapat();
  });
  const kapat = document.getElementById("profil-sol-kapat");
  if (kapat) kapat.onclick = profilYanMenuKapat;

  if (!document.body.dataset.profilEscBagli) {
    document.body.dataset.profilEscBagli = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && profilMenuAcik) profilYanMenuKapat();
    });
  }
}

function profilYanMenuKapat() {
  profilMenuAcik = false;
  const wrap = document.getElementById("profil-sol-arka");
  if (wrap) wrap.style.display = "none";
}

function profilYanMenuAc(cb, bolgeId = oyun.seciliId) {
  ensureProfilYanMenu();
  profilMenuAcik = true;
  const wrap = document.getElementById("profil-sol-arka");
  if (wrap) wrap.style.display = "flex";
  profilYanMenuGuncel(cb, bolgeId);
}

export function profilSolMenuAcilisTalebiAyarla(bolgeId = null) {
  profilAcilisTalepBolgeId = bolgeId || null;
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
      const efektMetni = arastirmaEfektKutuMetni(seviye.efekt);
      html += `<article class="arastirma-zincir-dugum ${sinif}">
        <div class="arastirma-zincir-ust">
          <span class="arastirma-zincir-ad">${seviye.ad}</span>
          <span class="arastirma-zincir-etiket">${etiket}</span>
        </div>
        <div class="arastirma-zincir-aciklama">${seviye.aciklama}</div>
        ${efektMetni
    ? `<div style="font-size:11px;color:#9fd9ff;margin-top:4px">(${htmlEsc(efektMetni)})</div>`
    : ""}
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

  arastirmaSayfaScrollTop = govde.scrollTop;
  govde.querySelectorAll(".arastirma-matris-dal").forEach((dalEl) => {
    const dalId = dalEl.getAttribute("data-dal");
    const sag = dalEl.querySelector(".arastirma-matris-sag");
    if (!dalId || !sag) return;
    arastirmaDalScrollLeft.set(dalId, sag.scrollLeft);
  });

  govde.innerHTML = arastirmaSayfaIcerikHTML();
  govde.scrollTop = arastirmaSayfaScrollTop;
  govde.querySelectorAll(".arastirma-matris-dal").forEach((dalEl) => {
    const dalId = dalEl.getAttribute("data-dal");
    const sag = dalEl.querySelector(".arastirma-matris-sag");
    if (!dalId || !sag) return;
    sag.scrollLeft = arastirmaDalScrollLeft.get(dalId) || 0;
  });

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

function ekonomiDurumuUi() {
  if (!oyun.ekonomi || typeof oyun.ekonomi !== "object") {
    oyun.ekonomi = { haracSeviye: "orta", alimBuTur: 0, sonHaracGeliri: 0, personelTavanEk: 0 };
  }
  if (!EKONOMI_DENGE.haracSeviyeleri[oyun.ekonomi.haracSeviye]) oyun.ekonomi.haracSeviye = "orta";
  if (!Number.isFinite(oyun.ekonomi.alimBuTur)) oyun.ekonomi.alimBuTur = 0;
  if (!Number.isFinite(oyun.ekonomi.sonHaracGeliri)) oyun.ekonomi.sonHaracGeliri = 0;
  if (!Number.isFinite(oyun.ekonomi.personelTavanEk)) oyun.ekonomi.personelTavanEk = 0;
  return oyun.ekonomi;
}

function aktifHaracSeviyesiUi() {
  const eco = ekonomiDurumuUi();
  return EKONOMI_DENGE.haracSeviyeleri[eco.haracSeviye] || EKONOMI_DENGE.haracSeviyeleri.orta;
}

function haracGeliriTahminBiz() {
  const bizBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
  const harac = aktifHaracSeviyesiUi();
  const taban = bizBolgeler.reduce((toplam, b) => {
    const gelirTabani = (b.gelir || 0) * EKONOMI_DENGE.haracGelirOrani;
    const nufusKatkisi = (b.nufus || 0) * EKONOMI_DENGE.haracNufusCarpani;
    const yatirimCarpani = 1 + (b.yGel || 0) * EKONOMI_DENGE.haracYatirimBonus;
    return toplam + (gelirTabani + nufusKatkisi) * yatirimCarpani;
  }, 0);
  return Math.max(0, Math.round(taban * (harac?.gelirCarpani || 1)));
}

function bizOrtalamaSadakatUi() {
  const bizBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
  if (!bizBolgeler.length) return 55;
  const toplam = bizBolgeler.reduce((t, b) => t + (Number(b.sadakat) || 55), 0);
  return toplam / bizBolgeler.length;
}

function bizToplamPersonelUi() {
  return ownerToplamPersonel("biz");
}

function bizAlimLimitDurumu() {
  const eco = ekonomiDurumuUi();
  const bizBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
  const ortSadakat = bizOrtalamaSadakatUi();
  const as = oyun.asayis || { polisBaski: 0 };

  let turKotasi =
    EKONOMI_DENGE.alimiTurBazKota +
    Math.floor(bizBolgeler.length * EKONOMI_DENGE.alimiTurBolgeKota) +
    Math.floor(ortSadakat / Math.max(1, EKONOMI_DENGE.alimiTurSadakatBoleni));
  if ((as.polisBaski || 0) >= EKONOMI_DENGE.alimiTurPolisCezaEsik) {
    turKotasi -= EKONOMI_DENGE.alimiTurPolisCeza;
  }
  if (oyun.fraksiyon.biz.para >= EKONOMI_DENGE.alimiTurParaDestekEsik) {
    turKotasi += EKONOMI_DENGE.alimiTurParaDestekBonus;
  }
  if (oyun.fraksiyon.biz.para <= EKONOMI_DENGE.alimiTurParaCezaEsik) {
    turKotasi -= EKONOMI_DENGE.alimiTurParaCeza;
  }
  turKotasi += Math.max(0, Math.round(arastirmaEfekt("alimTurKotasiBonus")));
  turKotasi = Math.max(3, turKotasi);

  const toplamKapasite = ownerPersonelTavan("biz");
  const toplamPersonel = ownerToplamPersonel("biz");
  const turKalan = Math.max(0, turKotasi - (eco.alimBuTur || 0));
  const toplamKalan = Math.max(0, toplamKapasite - toplamPersonel);

  return {
    turKotasi,
    buTurAlim: eco.alimBuTur || 0,
    toplamKapasite,
    toplamPersonel,
    alinabilir: Math.min(turKalan, toplamKalan),
  };
}

function alimEkMaliyetiUi(adet = 1) {
  const guvenliAdet = Math.max(0, Math.floor(Number(adet) || 0));
  if (guvenliAdet <= 0) return 0;
  const harac = aktifHaracSeviyesiUi();
  const haracCarpani =
    1 + Math.max(0, (harac.gelirCarpani || 1) - 1) * EKONOMI_DENGE.alimiEkMaliyetHaracCarpani;
  const alimIndirim = Math.max(0, Math.min(0.45, arastirmaEfekt("alimEkMaliyetAzaltma")));
  return Math.max(0, Math.round(guvenliAdet * EKONOMI_DENGE.alimiEkMaliyetKisiBasi * haracCarpani * (1 - alimIndirim)));
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
  const haracGeliri = owner === "biz" ? haracGeliriTahminBiz() : 0;
  const net = Math.round(gelir + pasifGelir + haracGeliri - gider);
  const detay = [
    `Temel gelir: ${Math.round(temelGelir)}₺`,
    `Yatırım bonusu: +${Math.round(yatirimBonusu)}₺`,
    `Bölge özellikleri: +${Math.round(ozelBonusToplam)}₺`,
    `Bina bonusları: +${Math.round(binaBonusToplam)}₺`,
    `Araştırma bonusu: +${Math.round(arastirmaBonusToplam)}₺`,
    `Gece ekonomisi: +${Math.round(geceBonusToplam)}₺`,
    `Pasif gelir: +${Math.round(pasifGelir)}₺`,
    `Haraç geliri: +${Math.round(haracGeliri)}₺`,
    `Bakım gideri: -${Math.round(gider)}₺`,
    `Net: ${net >= 0 ? "+" : ""}${Math.round(net)}₺`,
  ].join("\n");
  return { net: net >= 0 ? `+${net}` : `${net}`, detay };
}

function diploAnlasmaEtiketi(tip) {
  if (tip === "baris") return "Barış";
  if (tip === "ateskes") return "Ateşkes";
  if (tip === "ittifak") return "İttifak";
  if (tip === "ticaret") return "Ticaret";
  if (tip === "koalisyon") return "Koalisyon";
  return tip;
}

function diploTeklifEtiketi(tip) {
  if (tip === "baris") return "Barış";
  if (tip === "ittifak") return "İttifak";
  if (tip === "ticaret") return "Ticaret";
  if (tip === "koalisyon") return "Koalisyon";
  if (tip === "ittifak-mudahale") return "İttifak Müdahalesi";
  return diploAnlasmaEtiketi(tip);
}

function diploTrendSembol(deger) {
  const skala = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const oran = Math.max(0, Math.min(1, ((Number(deger) || 0) + 100) / 200));
  const idx = Math.max(0, Math.min(skala.length - 1, Math.round(oran * (skala.length - 1))));
  return skala[idx];
}

function diploTrendMetni(tarihce) {
  const dizi = Array.isArray(tarihce) ? tarihce : [];
  if (!dizi.length) return { spark: "—", ozet: "Trend verisi yok" };
  const spark = dizi.map((x) => diploTrendSembol(x.deger)).join("");
  const ilk = Math.round(dizi[0].deger || 0);
  const son = Math.round(dizi[dizi.length - 1].deger || 0);
  const delta = son - ilk;
  const deltaStr = `${delta > 0 ? "+" : ""}${delta}`;
  return { spark, ozet: `${ilk} → ${son} (${deltaStr})` };
}

function diploMiniGrafikSVG(tarihce = []) {
  const dizi = Array.isArray(tarihce) ? tarihce.slice(-20) : [];
  const w = 138;
  const h = 44;
  if (!dizi.length) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="rgba(255,255,255,.18)" stroke-width="1" />
      <text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" fill="#7f93a8" font-size="9">veri yok</text>
    </svg>`;
  }
  const xAdim = dizi.length <= 1 ? w : (w / (dizi.length - 1));
  const yFromVal = (v) => {
    const oran = Math.max(0, Math.min(1, ((Number(v) || 0) + 100) / 200));
    return h - (oran * h);
  };
  const path = dizi
    .map((n, i) => `${i === 0 ? "M" : "L"} ${Number((i * xAdim).toFixed(2))} ${Number(yFromVal(n.deger).toFixed(2))}`)
    .join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <line x1="0" y1="${yFromVal(70).toFixed(2)}" x2="${w}" y2="${yFromVal(70).toFixed(2)}" stroke="rgba(102,255,154,.18)" stroke-width="1" />
    <line x1="0" y1="${yFromVal(-30).toFixed(2)}" x2="${w}" y2="${yFromVal(-30).toFixed(2)}" stroke="rgba(247,178,103,.2)" stroke-width="1" />
    <line x1="0" y1="${yFromVal(-70).toFixed(2)}" x2="${w}" y2="${yFromVal(-70).toFixed(2)}" stroke="rgba(255,125,125,.2)" stroke-width="1" />
    <path d="${path}" fill="none" stroke="#74b9ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`;
}

function diploGunlukFiltreEslesir(kod, filtre) {
  if (!filtre || filtre === "tum") return true;
  const deger = String(kod || "");
  if (filtre === "savas") {
    return deger.includes("savas") || deger.includes("fetih") || deger.includes("ateskes");
  }
  if (filtre === "anlasma") {
    return deger.includes("ittifak") || deger.includes("ticaret") || deger.includes("baris") || deger.includes("anlasma");
  }
  if (filtre === "ihanet") {
    return deger.includes("ihanet");
  }
  if (filtre === "koalisyon") {
    return deger.includes("koalisyon");
  }
  return true;
}

export function diplomasiCiz(cb) {
  const panel = document.getElementById("diplomasi");
  if (!panel) return;

  const ozet = diplomasiOzet("biz");
  const gucSirasi = gucSiralamasiHesapla();
  const aksiyonDurum = ozet.oyuncuAksiyon || { kullanildi: false, tip: null, hedef: null };
  const aksiyonKilitli = !!aksiyonDurum.kullanildi;
  const aksiyonHedefAd = aksiyonDurum.hedef ? (oyun.fraksiyon?.[aksiyonDurum.hedef]?.ad || aksiyonDurum.hedef) : "—";
  const aktifAnlasmalar = Array.isArray(ozet.aktifAnlasmalar) ? ozet.aktifAnlasmalar : [];
  const bekleyenTeklifler = Array.isArray(ozet.bekleyenTeklifler) ? ozet.bekleyenTeklifler : [];
  const gunluk = Array.isArray(ozet.olayGunlugu) ? ozet.olayGunlugu : [];
  let html = `<h3>🤝 Diplomasi Merkezi</h3>
    <div class="diplo-itibar">
      <strong>İtibar:</strong> ${Math.round(ozet.itibar)}/100
      &nbsp; | &nbsp;
      <strong>İhanet:</strong> ${ozet.ihanetSayisi}
      <div class="diplo-itibar-cubuk"><div class="diplo-itibar-dolgu" style="width:${Math.round(ozet.itibar)}%"></div></div>
    </div>
    <div class="ipucu" style="margin:6px 0 10px 0;color:${aksiyonKilitli ? "#d9a969" : "#7eb98d"}">
      ${aksiyonKilitli ? `Bu tur aksiyon kullanıldı: ${aksiyonDurum.tip || "aksiyon"} → ${aksiyonHedefAd}` : "Bu tur 1 diplomasi aksiyon hakkın var."}
    </div>`;

  if (ozet.koalisyon?.hedef) {
    const hedefAd = oyun.fraksiyon?.[ozet.koalisyon.hedef]?.ad || ozet.koalisyon.hedef;
    const uyeler = Array.isArray(ozet.koalisyon.uyeler) ? ozet.koalisyon.uyeler : [];
    const uyeAdlari = uyeler.map((id) => oyun.fraksiyon?.[id]?.ad || id).join(", ") || "—";
    const benHedefim = ozet.koalisyon.hedef === "biz";
    const benUyeyim = uyeler.includes("biz");
    html += `
      <div style="margin:0 0 10px 0;padding:8px;border:1px solid ${benHedefim ? "rgba(255,122,122,.4)" : "rgba(120,180,255,.35)"};border-radius:8px;background:${benHedefim ? "rgba(86,18,18,.28)" : "rgba(16,28,48,.45)"}">
        <strong style="font-size:12px;color:${benHedefim ? "#ffb4b4" : "#b8d8ff"}">${benHedefim ? "🚨 Koalisyon Seni Hedefliyor" : "⚡ Denge Koalisyonu Aktif"}</strong>
        <div style="font-size:11px;color:#c8d7e6;margin-top:4px">Hedef: ${hedefAd}</div>
        <div style="font-size:11px;color:#9eb5cc">Üyeler: ${uyeAdlari}</div>
        <div style="font-size:11px;color:#9eb5cc">Ortak saldırı bonusu: +%${Math.round((DIPLOMASI.KOALISYON_SALDIRI_BONUS || 0) * 100)}${benUyeyim ? " (Sana aktif)" : ""}</div>
      </div>`;
  }

  if (gucSirasi.length) {
    html += `<div style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(10,16,24,.45)">
      <strong style="font-size:12px">Güç Sıralaması</strong>`;
    gucSirasi.forEach((s) => {
      const ad = oyun.fraksiyon?.[s.owner]?.ad || s.owner;
      html += `
        <div style="margin-top:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#c9d5e3">
            <span>#${s.sira} ${ad}</span>
            <span>${Math.round(s.puan)}</span>
          </div>
          <div style="height:5px;border-radius:4px;background:#1d2a3a;overflow:hidden">
            <div style="height:100%;width:${Math.max(3, Math.round((s.pay || 0) * 100))}%;background:#4fa3ff"></div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  html += `<div style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(10,16,24,.45)">
    <strong style="font-size:12px">Aktif Anlaşmalar</strong>`;
  if (!aktifAnlasmalar.length) {
    html += `<div style="margin-top:6px;font-size:11px;color:#8fa2b7">Aktif anlaşma yok.</div>`;
  } else {
    aktifAnlasmalar.forEach((a) => {
      const ownerAd = oyun.fraksiyon?.[a.owner]?.ad || a.owner;
      const uyariRenk = a.uyari === "kritik" ? "#ff9f9f" : (a.uyari === "uyari" ? "#f7b267" : "#b9c9da");
      const ekBilgi = a.tip === "ittifak"
        ? `Bakım: ${a.bakim}₺/tur`
        : a.tip === "ticaret"
          ? `Net: ${a.ticaretGeliri >= 0 ? "+" : ""}${a.ticaretGeliri}₺/tur`
          : "";
      html += `<div style="margin-top:6px;font-size:11px;color:${uyariRenk}">
        ${diploAnlasmaEtiketi(a.tip)} · ${ownerAd} · ${a.sureMetni || `${a.kalan} tur kaldı`} ${ekBilgi ? `| ${ekBilgi}` : ""}
      </div>`;
    });
  }
  html += `</div>`;

  html += `<div style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(10,16,24,.45)">
    <strong style="font-size:12px">Bekleyen Teklifler</strong>`;
  if (!bekleyenTeklifler.length) {
    html += `<div style="margin-top:6px;font-size:11px;color:#8fa2b7">Bekleyen teklif yok.</div>`;
  } else {
    bekleyenTeklifler.forEach((t) => {
      const ad = oyun.fraksiyon?.[t.gonderen]?.ad || t.gonderen;
      const kalanRenk = t.kalan !== null && t.kalan <= 1 ? "#ff9f9f" : (t.kalan !== null && t.kalan <= 2 ? "#f7b267" : "#b7c9dd");
      html += `<div style="margin-top:6px;padding:6px;border:1px solid rgba(255,255,255,.07);border-radius:7px;background:rgba(255,255,255,.02)">
        <div style="font-size:11px;color:#d8e5f3">📩 ${ad} → ${diploTeklifEtiketi(t.tip)}</div>
        <div style="font-size:11px;color:${kalanRenk}">⏱ ${t.kalan === null ? "Süre bilgisi yok" : `${t.kalan} tur içinde yanıtlanmalı`}</div>
      </div>`;
    });
  }
  html += `</div>`;

  html += `<details style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(10,16,24,.45)">
    <summary style="cursor:pointer;font-size:12px;color:#c9d8e7"><strong>Diplomasi Koşul Tablosu</strong></summary>
    <div style="margin-top:8px;font-size:11px;color:#9eb1c5;line-height:1.45">
      Barış teklifi: savaşta skor/yorgunluk durumuna göre kabul edilir.<br>
      Savaş durumu: savaş ilanı veya saldırı ile başlar.<br>
      Savaşın bitişi: barış teklifinin kabulü veya tarafın dağılması.<br>
      Uzayan savaşta yorgunluk artar, barış eğilimi yükselir.<br>
      Ateşkes: süreli bir durumdur (tehdit/özel olay kaynaklı olabilir).<br>
      İttifak teklifi: ilişki ≥ +30.<br>
      Savaş ilanı: tüm aktif anlaşmaları bozar ve ihanet sayılabilir.
    </div>
  </details>`;

  html += `<div class="diplo-liste">`;
  ozet.hedefler.forEach((h) => {
    const ad = oyun.fraksiyon?.[h.owner]?.ad || h.owner;
    const lider = oyun.fraksiyon?.[h.owner]?.lider || null;
    const liderSatiri = lider
      ? `<div style="font-size:11px;color:#9eb1c5">${liderProfilAdSatiriHTML(lider, 18)}</div>`
      : "";
    const trend = diploTrendMetni(h.tarihce);
    const anlasmaSatiri = h.anlasmalar.length
      ? h.anlasmalar
          .map((a) => {
            const sure =
              a.kalan === null || a.kalan === undefined || Number.isNaN(a.kalan)
                ? "süresiz"
                : `${a.kalan}t`;
            return `<span class="diplo-anlasma">${diploAnlasmaEtiketi(a.tip)} · ${sure}</span>`;
          })
          .join("")
      : `<span style="font-size:11px;color:#8899ad">Aktif anlaşma yok</span>`;
    const savasDetaySatiri = h.savasDetay
      ? `<div style="font-size:11px;color:#ffb8b8;margin:4px 0 2px 0">
          Savaş skoru: Sen ${Math.round(h.savasDetay.skor.biz)} | ${ad} ${Math.round(h.savasDetay.skor[h.owner] || 0)}
          &nbsp; · &nbsp; Yorgunluk: Sen ${Math.round(h.savasDetay.yorgunluk.biz)} | ${ad} ${Math.round(h.savasDetay.yorgunluk[h.owner] || 0)}
          &nbsp; · &nbsp; Barış kabul tahmini: %${Math.round(h.savasDetay.barisTeklifSans.biz || 0)}
        </div>`
      : "";
    const rozetRenk =
      h.durumRozet?.tip === "ittifak" ? "#8ef1b6"
        : h.durumRozet?.tip === "baris" ? "#7ec7ff"
          : h.durumRozet?.tip === "ateskes" ? "#f7d794"
            : h.durumRozet?.tip === "savas-baris-bekliyor" ? "#f7b267"
              : h.durumRozet?.tip === "savas" ? "#ff9f9f"
                : "#9fb3c8";
    html += `
      <section class="diplo-satir">
        <div class="diplo-ust">
          <strong>${ad}</strong>
          <span class="diplo-durum ${h.sinif}">${h.ikon} ${h.deger} (${h.etiket})</span>
        </div>
        ${liderSatiri}
        <div style="margin:4px 0 4px 0">
          <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.18);font-size:10px;color:${rozetRenk}">
            Durum: ${h.durumRozet?.ad || "Normal"}
          </span>
        </div>
        <div style="font-size:11px;color:#96a7ba;margin-bottom:4px" title="Son 12 tur ilişki trendi">
          Trend: <span style="font-family:monospace;letter-spacing:1px">${trend.spark}</span>
          &nbsp; <span>${trend.ozet}</span>
        </div>
        <div style="margin:4px 0 6px 0">${diploMiniGrafikSVG(h.tarihce)}</div>
        ${savasDetaySatiri}
        <div>${anlasmaSatiri}</div>
        ${h.tehditKalan > 0 ? `<div style="font-size:11px;color:#c0a27a" title="Aynı hedefe tekrar ültimatom için">Tehdit bekleme (aynı hedef): ${h.tehditKalan} tur</div>` : ""}
        <div class="diplo-btn-grid">
          <button class="buton grimsi btn-diplo-baris" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>Barış</button>
          <button class="buton grimsi btn-diplo-savas" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>Savaş İlanı</button>
          <button class="buton grimsi btn-diplo-ittifak" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>İttifak</button>
          <button class="buton grimsi btn-diplo-ticaret" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>Ticaret</button>
          <button class="buton grimsi btn-diplo-rusvet" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>Rüşvet</button>
          <button class="buton grimsi btn-diplo-tehdit" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>Tehdit</button>
          <button class="buton grimsi btn-diplo-istihbarat" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>İstihbarat</button>
          <button class="buton grimsi btn-diplo-sabotaj" data-owner="${h.owner}" ${aksiyonKilitli ? "disabled" : ""}>Sabotaj</button>
        </div>
      </section>`;
  });
  html += `</div>`;

  const filtreler = [
    { id: "tum", ad: "Tümü" },
    { id: "savas", ad: "Savaş/Saldırı" },
    { id: "anlasma", ad: "Anlaşmalar" },
    { id: "ihanet", ad: "İhanet" },
    { id: "koalisyon", ad: "Koalisyon" },
  ];
  const filtreliGunluk = gunluk
    .filter((g) => diploGunlukFiltreEslesir(g.kod, diploGunlukFiltre))
    .slice(0, 14);
  html += `<div class="diplo-tarihce"><strong>Diplomasi Günlüğü</strong>
    <div style="margin:6px 0 6px 0;display:flex;gap:6px;flex-wrap:wrap">`;
  filtreler.forEach((f) => {
    html += `<button class="buton grimsi btn-diplo-log-filtre" data-filtre="${f.id}" ${diploGunlukFiltre === f.id ? 'style="border-color:#4fa3ff;color:#d8ebff"' : ""}>${f.ad}</button>`;
  });
  html += `</div>`;
  if (!filtreliGunluk.length) {
    html += `<div style="color:#8f9eb1;margin-top:4px">Henüz kayıt yok.</div>`;
  } else {
    filtreliGunluk.forEach((g) => {
      html += `<div>[Tur ${g.tur}] ${g.mesaj}</div>`;
    });
  }
  html += `</div>`;

  panel.innerHTML = html;

  panel.querySelectorAll(".btn-diplo-baris").forEach((btn) => {
    btn.onclick = () => cb.diplomasiBarisTeklif(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-savas").forEach((btn) => {
    btn.onclick = () => cb.diplomasiSavasIlan(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-ittifak").forEach((btn) => {
    btn.onclick = () => cb.diplomasiIttifakTeklif(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-ticaret").forEach((btn) => {
    btn.onclick = () => cb.diplomasiTicaretTeklif(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-rusvet").forEach((btn) => {
    btn.onclick = () => cb.diplomasiRusvetVer(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-tehdit").forEach((btn) => {
    btn.onclick = () => cb.diplomasiTehditEt(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-istihbarat").forEach((btn) => {
    btn.onclick = () => cb.diplomasiIstihbaratPaylas(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-sabotaj").forEach((btn) => {
    btn.onclick = () => cb.diplomasiSabotajTeklif(btn.getAttribute("data-owner"));
  });
  panel.querySelectorAll(".btn-diplo-log-filtre").forEach((btn) => {
    btn.onclick = () => {
      diploGunlukFiltre = btn.getAttribute("data-filtre") || "tum";
      diplomasiCiz(cb);
    };
  });
}

function ownerRenk(owner) {
  if (owner === "biz") return "#2ecc71";
  if (owner === "ai1") return "#e74c3c";
  if (owner === "ai2") return "#9b59b6";
  if (owner === "ai3") return "#f1c40f";
  return "#95a5a6";
}

function ownerToplamBirim(owner) {
  return oyun.birimler
    .filter((b) => b.owner === owner && !b._sil)
    .reduce((toplam, b) => toplam + (b.adet || 0), 0);
}

function liderBonusAlanAdi(alan) {
  const map = {
    saldiriGucu: "Saldırı",
    savunmaGucu: "Savunma",
    binaMaliyetiIndirim: "İnşa İndirimi",
    gelirCarpani: "Gelir",
    adamCarpani: "Adam Üretimi",
    kayipAzaltma: "Kayıp Azaltma",
    regenBonus: "Nüfus Yenilenme",
  };
  return map[alan] || alan;
}

function liderBonusSatirlari(lider) {
  if (!lider?.bonus || typeof lider.bonus !== "object") return [];
  return Object.entries(lider.bonus)
    .filter(([, v]) => Number.isFinite(v))
    .map(([alan, deger]) => ({
      alan,
      ad: liderBonusAlanAdi(alan),
      deger,
      yuzde: Math.round(Math.abs(deger) * 100),
      iyi: deger >= 0,
    }));
}

function liderBonusOzeti(lider) {
  const satirlar = liderBonusSatirlari(lider)
    .map((s) => `${s.ad} ${s.deger >= 0 ? "+" : "-"}%${s.yuzde}`);
  return satirlar.length ? satirlar.join(" • ") : "Bonus yok";
}

function liderPuanRozetHTML(s) {
  const arka = s.iyi ? "rgba(46, 204, 113, .18)" : "rgba(231, 76, 60, .18)";
  const kenar = s.iyi ? "rgba(46, 204, 113, .38)" : "rgba(231, 76, 60, .38)";
  const renk = s.iyi ? "#8ef1b6" : "#ff9f9f";
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;border:1px solid ${kenar};background:${arka};color:${renk};font-size:10px;font-weight:700">${htmlEsc(s.ad)} ${s.deger >= 0 ? "+" : "-"}%${s.yuzde}</span>`;
}

function liderIyiKotuPuanHTML(lider, baslik = "Lider Puanları") {
  const satirlar = liderBonusSatirlari(lider);
  const iyiler = satirlar.filter((s) => s.iyi);
  const kotuler = satirlar.filter((s) => !s.iyi);
  const iyiHTML = iyiler.length ? iyiler.map(liderPuanRozetHTML).join("") : `<span style="font-size:10px;color:#6f8ba4">Yok</span>`;
  const kotuHTML = kotuler.length ? kotuler.map(liderPuanRozetHTML).join("") : `<span style="font-size:10px;color:#6f8ba4">Yok</span>`;
  return `
    <div style="margin-top:7px;padding:7px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(7,13,20,.45)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px">
        <strong style="font-size:11px;color:#d5e3f2">${baslik}</strong>
        <span style="font-size:10px;color:#8ba4bb">Salt okunur</span>
      </div>
      <div style="font-size:10px;color:#8ef1b6;margin-bottom:3px">İyi puanlar</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${iyiHTML}</div>
      <div style="font-size:10px;color:#ffabab;margin:6px 0 3px">Kötü puanlar</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${kotuHTML}</div>
    </div>`;
}

function liderOzelligiVarMi(lider) {
  const ozellik = String(lider?.ozellik || "").trim();
  if (!ozellik) return false;
  const norm = ozellik.toLowerCase();
  return norm !== "yok" && norm !== "-" && norm !== "none";
}

function liderProfilAdSatiriHTML(lider, boyut = 20) {
  if (!lider) return "Lider yok";
  const ikon = liderOzelligiVarMi(lider) && lider.ikon ? `${htmlEsc(lider.ikon)} ` : "";
  return `${liderAvatarHTML(lider, boyut)}${ikon}${htmlEsc(lider.ad || "Lider")}`;
}

function profilDiploRenk(sinif) {
  if (sinif === "ittifak") return "#8ef1b6";
  if (sinif === "dostluk") return "#9ce5b3";
  if (sinif === "gerilim") return "#ffbf7a";
  if (sinif === "savas") return "#ff9f9f";
  return "#c7d5e3";
}

function profilIliskiDurumHTML(owner) {
  const ozet = diplomasiOzet(owner);
  const hedefler = Array.isArray(ozet?.hedefler) ? ozet.hedefler : [];
  if (!hedefler.length) {
    return `
      <div style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(7,13,20,.45)">
        <div style="font-size:11px;color:#d5e3f2;font-weight:700">Çetelerle Durum</div>
        <div style="font-size:11px;color:#8fa4b8;margin-top:4px">Diplomasi verisi yok.</div>
      </div>`;
  }

  const satirlar = hedefler.map((h) => {
    const hedefAd = oyun.fraksiyon?.[h.owner]?.ad || h.owner;
    const deger = Math.round(Number(h.deger) || 0);
    const anlasmalar = Array.isArray(h.anlasmalar) ? h.anlasmalar : [];
    const anlasmaMetni = anlasmalar.length
      ? anlasmalar
        .map((a) => `${diploAnlasmaEtiketi(a.tip)} (${Math.max(0, Math.round(a.kalan || 0))} tur)`)
        .join(" • ")
      : "Aktif anlaşma yok";
    return `
      <div style="margin-top:6px;padding:6px 7px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.02)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong style="font-size:11px;color:#dce8f5">${htmlEsc(hedefAd)}</strong>
          <span style="font-size:11px;color:${profilDiploRenk(h.sinif)}">${htmlEsc(h.ikon || "⚪")} ${htmlEsc(h.etiket || "Tarafsız")} (${deger})</span>
        </div>
        <div style="font-size:10px;color:#93a8bd;margin-top:3px">${htmlEsc(anlasmaMetni)}</div>
      </div>`;
  }).join("");

  return `
    <div style="margin-top:8px;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(7,13,20,.45)">
      <div style="font-size:11px;color:#d5e3f2;font-weight:700">Çetelerle Durum</div>
      ${satirlar}
    </div>`;
}

function profilPanelIcerikHTML(bolgeId = oyun.seciliId) {
  const secili = bolgeById(bolgeId);
  if (!secili || secili.owner === "tarafsiz") {
    return `<h3>👤 Bölge Profili</h3><p class="ipucu">Sahipli bir bölgeye sağ tıklayarak profil/özelleştirme panelini açabilirsin.</p>`;
  }

  const owner = secili.owner;
  const fr = oyun.fraksiyon?.[owner];
  if (!fr) {
    return `<h3>👤 Bölge Profili</h3><p class="ipucu">Profil verisi bulunamadı.</p>`;
  }
  const lider = fr.lider || null;
  const guc = gucSiralamasiHesapla().find((g) => g.owner === owner)?.puan ?? 0;
  const bolge = oyun.bolgeler.filter((b) => b.owner === owner).length;
  const birim = ownerToplamBirim(owner);
  const para = Math.round(fr.para || 0);
  const bizFr = oyun.fraksiyon?.biz;
  const bizLider = bizFr?.lider || null;

  let html = `<h3>👤 Bölge Profili</h3>
    <p class="ipucu">Seçili bölge: <strong>${htmlEsc(secili.ad || "")}</strong> • Kontrol: ${htmlEsc(fr.ad || owner)}</p>
    <section style="margin:10px 0;padding:10px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(10,16,24,.45)">
      <div style="font-size:11px;color:#9fb3c5;margin-bottom:6px">Bölgeyi yöneten çete lideri</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <strong style="color:${ownerRenk(owner)}">${htmlEsc(fr.ad || owner)}</strong>
        <span style="font-size:11px;color:#9fb3c5">Güç: ${Math.round(guc)}</span>
      </div>
      <div style="margin-top:5px;font-size:12px;color:#d8e3ee">
        ${liderProfilAdSatiriHTML(lider, 20)}
        ${lider?.lakap ? `<span style="color:#93a7bc"> • ${htmlEsc(lider.lakap)}</span>` : ""}
      </div>
      <div style="margin-top:4px;font-size:11px;color:#9eb1c5">
        Köken: ${htmlEsc(lider?.koken || "—")} • Özellik: ${htmlEsc(lider?.ozellik || "—")}
      </div>
      <div style="margin-top:4px;font-size:11px;color:#8fa4b8">${htmlEsc(liderBonusOzeti(lider))}</div>
      ${liderIyiKotuPuanHTML(lider, "İyi/Kötü Profil Puanları")}
      <div style="margin-top:6px;font-size:11px;color:#b7c7d8">
        Bölge: ${bolge} • Birim: ${birim} • Para: ${para} ₺
      </div>
      ${profilIliskiDurumHTML(owner)}`;

  if (owner !== "biz" && bizFr && bizLider) {
    html += `
      <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(255,255,255,.14)">
        <div style="font-size:11px;color:#bfcddd;margin-bottom:6px">Senin çete liderin</div>
        <div style="font-size:12px;color:#d8e3ee">
          ${liderProfilAdSatiriHTML(bizLider, 20)}
          ${bizLider?.lakap ? `<span style="color:#93a7bc"> • ${htmlEsc(bizLider.lakap)}</span>` : ""}
        </div>
        <div style="margin-top:4px;font-size:11px;color:#9eb1c5">
          Köken: ${htmlEsc(bizLider?.koken || "—")} • Özellik: ${htmlEsc(bizLider?.ozellik || "—")}
        </div>
        <div style="margin-top:4px;font-size:11px;color:#8fa4b8">${htmlEsc(liderBonusOzeti(bizLider))}</div>
        ${liderIyiKotuPuanHTML(bizLider, "Senin İyi/Kötü Puanların")}
      </div>`;
  }

  if (fr) {
    const ozelLider = lider || { ad: "", lakap: "", ikon: "👤" };
    const emojiOzelligiAcik = liderOzelligiVarMi(ozelLider);
    html += `
      <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(255,255,255,.14)">
        <div style="font-size:11px;color:#bfcddd;margin-bottom:6px">Kişiselleştirme (${htmlEsc(fr.ad || owner)})</div>
        <input id="profil-owner" type="hidden" value="${htmlEsc(owner)}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <input id="profil-cete-ad" class="input" maxlength="26" placeholder="Çete adı" value="${htmlEsc(fr.ad || "")}">
          <input id="profil-lider-ad" class="input" maxlength="26" placeholder="Çete lideri adı" value="${htmlEsc(ozelLider.ad || "")}">
          <input id="profil-lider-lakap" class="input" maxlength="36" placeholder="Lider lakabı" value="${htmlEsc(ozelLider.lakap || "")}">
          ${emojiOzelligiAcik
            ? `<input id="profil-lider-ikon" class="input" maxlength="3" placeholder="İkon (örn: 👑)" value="${htmlEsc(ozelLider.ikon || "")}">`
            : `<div style="padding:9px 11px;border-radius:8px;border:1px dashed rgba(255,255,255,.18);background:rgba(255,255,255,.04);font-size:11px;color:#9db2c8">Emoji kapalı (lider özelliği yok)</div>`
          }
        </div>
        <div style="font-size:10px;color:#8fa4b8;margin-top:6px">İyi/Kötü puanlar yukarıda renkli ve salt okunur gösterilir; düzenlenemez.</div>
        <button class="buton" id="btn-profil-kaydet" style="margin-top:8px">Profili Kaydet</button>
      </div>`;
  }
  html += `</section>`;
  return html;
}

function profilYanMenuGuncel(cb, bolgeId = oyun.seciliId) {
  const panel = document.getElementById("profil-sol-menu-icerik");
  if (!panel) return;
  panel.innerHTML = profilPanelIcerikHTML(bolgeId);
  const kaydetBtn = panel.querySelector("#btn-profil-kaydet");
  if (kaydetBtn) {
    kaydetBtn.onclick = () => {
      if (typeof cb.profilOzellestirmeKaydet !== "function") return;
      const hedefOwner =
        panel.querySelector("#profil-owner")?.value
        || bolgeById(bolgeId)?.owner
        || "biz";
      cb.profilOzellestirmeKaydet({
        hedefOwner,
        ceteAdi: panel.querySelector("#profil-cete-ad")?.value || "",
        liderAd: panel.querySelector("#profil-lider-ad")?.value || "",
        liderLakap: panel.querySelector("#profil-lider-lakap")?.value || "",
        liderIkon: panel.querySelector("#profil-lider-ikon")?.value || "",
      });
    };
  }
}

export function durumCiz() {
  const sol = document.getElementById("durum-sol");
  const sag = document.getElementById("durum-sag");

  const biz = oyun.fraksiyon.biz;
  const lider = biz.lider;
  const asayis = oyun.asayis || { sucluluk: 0, polisBaski: 0, sonBaskinTur: -999 };
  const eco = ekonomiDurumuUi();
  const harac = aktifHaracSeviyesiUi();
  const haracGelir = haracGeliriTahminBiz();
  const yoldaBizToplam = oyun.birimler
    .filter((k) => k.owner === "biz" && !k._sil && k.hedefId && !k.bekliyor && (k.adet || 0) > 0)
    .reduce((toplam, k) => toplam + (k.adet || 0), 0);
  const yaraliToplam = oyun.yaralilar.filter((y) => y.owner === "biz").reduce((t, y) => t + y.adet, 0);
  const esirToplam = oyun.esirler.filter((e) => e.owner === "biz").reduce((t, e) => t + e.adet, 0);
  const ilAi1 = iliskiDurumu("biz", "ai1");
  const ilAi2 = iliskiDurumu("biz", "ai2");
  const ilAi3 = iliskiDurumu("biz", "ai3");
  const bizBirlikToplam = ownerToplamPersonel("biz");
  const bizLojistikKapasite = ownerToplamKapasite("biz");
  const bizLojistikKullanim = oyun.birimler
    .filter((k) => k.owner === "biz" && !k._sil && ((k.tasitAraba || 0) > 0 || (k.tasitMotor || 0) > 0))
    .reduce((toplam, k) => toplam + ((k.tasitAraba || 0) * 4) + ((k.tasitMotor || 0) * 2), 0);
  const bizLojistikKalan = Math.max(0, bizLojistikKapasite - bizLojistikKullanim);
  const bizTasit = ownerTasit("biz");
  const lojistikBaslik = `Birlik: ${bizBirlikToplam} • Filo: 🚗 ${bizTasit.araba || 0} • 🏍️ ${bizTasit.motor || 0} • Kalan kapasite: ${bizLojistikKalan}`;
  const lojistikKullanimMetni = bizLojistikKullanim > 0
    ? ` <span style="color:#f7b267">(-${bizLojistikKullanim})</span>`
    : "";
  sol.innerHTML = `
    <span class="etiket">Çetemiz:</span> <span id="biz-adi">${biz.ad}</span>
    &nbsp; | &nbsp; <span class="etiket">Lider:</span> ${lider ? liderProfilAdSatiriHTML(lider, 20) : '—'}
    &nbsp; | &nbsp; <span class="etiket">Para:</span> ${Math.floor(biz.para)} ₺
    &nbsp; | &nbsp; <span class="etiket">Birlik:</span> ${bizBirlikToplam}
    &nbsp; | &nbsp; <span class="etiket" title="${lojistikBaslik}">Lojistik:</span> ${bizLojistikKapasite}${lojistikKullanimMetni}
    ${yaraliToplam > 0 ? `&nbsp; | &nbsp; <span style="color:#f39c12">🩹 ${yaraliToplam}</span>` : ''}
    ${esirToplam > 0 ? `&nbsp; | &nbsp; <span style="color:#e74c3c">⛓️ ${esirToplam}</span>` : ''}
  `;
  const netGelir = hesaplaNetGelirDetay("biz");
  sag.innerHTML = `
  ${oyun.hareketEmri
      ? `<span style="color:#f5c542;font-weight:600">Hedef seç: ${oyun.hareketEmri.adet} asker gönderiliyor...</span> &nbsp; | &nbsp;`
      : ""
    }
  ${yoldaBizToplam > 0
      ? `<span style="color:#9ed0ff;font-weight:600">Yolda: ${yoldaBizToplam}</span> &nbsp; | &nbsp;`
      : ""
    }

  <span class="etiket">Bizim Bölge:</span> ${bizBolgeSayisi()}
  &nbsp; | &nbsp; <span class="etiket">Tur:</span> ${oyun.tur}
  &nbsp; | &nbsp; <span class="etiket">Hız:</span> ${Number(
      oyun.hizKatsayi
    ).toFixed(2)}×
  &nbsp; | &nbsp; <span class="etiket">Harita:</span> ${HARITA_MODLARI[aktifHaritaModu]?.ad || "Siyasi"} ${haritaModUstKontrolHTML()}
  &nbsp; | &nbsp; <span class="etiket">Şöhret:</span> ${Math.round(
      oyun.sohret.biz
    )}/100
  &nbsp; | &nbsp; <span class="etiket" title="Suçluluk arttıkça polis baskın riski yükselir.">Suç:</span> ${Math.round(asayis.sucluluk || 0)}
  &nbsp; | &nbsp; <span class="etiket" title="Polis baskısı yüksekse ceza ve taşıt el koyma riski artar.">Polis:</span> %${Math.round(asayis.polisBaski || 0)}
  &nbsp; | &nbsp; <span class="etiket" title="Seviye: ${harac.ad} | Gelir x${harac.gelirCarpani.toFixed(2)} | Sadakat ${harac.sadakatDelta >= 0 ? "+" : ""}${harac.sadakatDelta.toFixed(2)}/tur | Suç ${harac.suclulukDelta >= 0 ? "+" : ""}${harac.suclulukDelta.toFixed(2)}/tur">Haraç:</span> ${harac.ad} (+${Math.round(eco.sonHaracGeliri || haracGelir)}₺)
  &nbsp; | &nbsp; <span class="etiket" title="${netGelir.detay.replace(/"/g, "&quot;")}">Net:</span> <span title="${netGelir.detay.replace(/"/g, "&quot;")}">${netGelir.net}</span>
  &nbsp; | &nbsp; <span class="etiket">Diplo:</span> ${ilAi1.ikon}${Math.round(ilAi1.deger)} / ${ilAi2.ikon}${Math.round(ilAi2.deger)} / ${ilAi3.ikon}${Math.round(ilAi3.deger)}
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
  svgKap.setAttribute("data-mod", aktifHaritaModu);
  kap.appendChild(svgKap);
  
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.id = "istanbul-svg";
  svg.setAttribute("data-mod", aktifHaritaModu);
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
    const baslangicBilgi = bolgeEtiketIstihbaratMetni(b, "normal");
    label.textContent = baslangicBilgi ? `${b.ad} ${baslangicBilgi}` : b.ad;
    istanbulLabelCache.set(b.id, label);
    labelGrup.appendChild(label);

    const hareketIndikator = document.createElementNS(NS, "text");
    hareketIndikator.setAttribute("x", cx);
    hareketIndikator.setAttribute("y", cy + 9);
    hareketIndikator.setAttribute("class", "ilce-hareket-indikator");
    hareketIndikator.setAttribute("data-hareket-id", b.id);
    hareketIndikator.setAttribute("text-anchor", "middle");
    hareketIndikator.textContent = "";
    istanbulHareketCache.set(b.id, hareketIndikator);
    labelGrup.appendChild(hareketIndikator);
  });
  svg.appendChild(labelGrup);
  
  svgKap.appendChild(svg);
  haritaModKisayolBagla();
  haritaModEfsaneGuncelle();
  istanbulEtiketTipografiGuncelle();
  requestAnimationFrame(() => {
    ilceEtiketleriniPoligonaHizala(svg, true);
  });
  istanbulZoomKontrolOlustur(svgKap, svg);
  istanbulEtkilesimBagla(svgKap, svg, onBolgeSec);
  istanbulSvgGuncel();
}

function istanbulSvgGuncel() {
  const mod = HARITA_MODLARI[aktifHaritaModu] ? aktifHaritaModu : "siyasi";
  const degerler = mod === "siyasi"
    ? []
    : oyun.bolgeler.map((b) => bolgeMetrikDegeri(b, mod)).filter((v) => Number.isFinite(v));
  const min = degerler.length ? Math.min(...degerler) : 0;
  const max = degerler.length ? Math.max(...degerler) : 0;

  oyun.bolgeler.forEach(b => {
    const ilce = ISTANBUL_ILCELER[b.id];
    if (!ilce) return;
    
    // Path rengini güncelle
    const path = istanbulPathCache.get(b.id) || document.getElementById(`ilce-${b.id}`);
    if (path && !istanbulPathCache.has(b.id)) istanbulPathCache.set(b.id, path);
    if (path) {
      path.setAttribute("class", `ilce-path ${ownerSinif(b.owner)} ${oyun.seciliId === b.id ? "secili" : ""}`);
      const fill = bolgeRenkHesapla(b, mod, min, max);
      if (fill) path.style.fill = fill;
      else path.style.removeProperty("fill");
      // Tooltip güncelle
      const title = path.querySelector("title");
      if (title) {
        title.textContent = bolgeTooltipMetni(b);
      }
    }

    const hareketEl = istanbulHareketCache.get(b.id)
      || document.querySelector(`text[data-hareket-id="${b.id}"]`);
    if (hareketEl && !istanbulHareketCache.has(b.id)) istanbulHareketCache.set(b.id, hareketEl);
    if (hareketEl) {
      const gidenler = oyun.birimler.filter(
        (u) => u.konumId === b.id && u.hedefId && u.hedefId !== b.id && (u.adet || 0) > 0
      );
      const istihbaratGizli = mod !== "siyasi" && dusmanIstihbaratiGizliMi(b);
      const ikon = konvoyDurumIkonu(gidenler);
      const toplam = gidenler.reduce((t, u) => t + (u.adet || 0), 0);
      const tahminiTur = konvoyGrubuTahminiTurMetni(gidenler);
      let metin = "";
      if (ikon) {
        if (mod === "askeri" && !istihbaratGizli) {
          metin = `${ikon}${toplam}`;
        } else if (mod !== "askeri") {
          metin = ikon;
        }
      }
      hareketEl.textContent = metin;
      hareketEl.style.opacity = metin ? "0.95" : "0";
      if (ikon) {
        const title = tahminiTur ? `Birlik hareketi • ${tahminiTur} sonra varış` : "Birlik hareketi";
        hareketEl.setAttribute("title", title);
      } else {
        hareketEl.removeAttribute("title");
      }
    }
  });
  haritaModEfsaneGuncelle();
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
      liderBilgi = `<br><span style="color:#ddd;font-size:0.9em">Lider: ${liderProfilAdSatiriHTML(l, 16)} (${bonusAd})</span>`;
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
        <div>Garnizon: <strong>${bolgeHazirBirimSayisi(b.id, b.owner)}</strong></div>
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
      onBolgeSec(b.id, { shiftKey: !!e.shiftKey, kaynak: "grid-click" });
    };
    k.ondblclick = () => {
      onBolgeSec(b.id, { dblclick: true, kaynak: "grid-dblclick" });
    };
    k.oncontextmenu = (e) => {
      e.preventDefault();
      if (e.shiftKey) {
        haritaContextMenuAc(e.clientX, e.clientY, b.id, onBolgeSec);
        return;
      }
      onBolgeSec(b.id, { contextmenu: true, kaynak: "grid-contextmenu" });
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
      const ikon = konvoyDurumIkonu(gidenler);
      const tahminiTur = konvoyGrubuTahminiTurMetni(gidenler);
      badge.textContent = `${ikon || "▶"} ${toplam} ${tipRozet} → ${hedefAd}`;
      badge.title = tahminiTur
        ? `${tipRozet || toplam} ${hedefAd} bölgesine gidiyor • ${tahminiTur} sonra varış`
        : `${tipRozet || toplam} ${hedefAd} bölgesine gidiyor`;
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
      const ikon = konvoyDurumIkonu(gelenler);
      const tahminiTur = konvoyGrubuTahminiTurMetni(gelenler);
      badge.textContent = dost ? `${ikon || "🛡️"} ← ${toplam} ${tipRozet}` : `⚔️ ← ${toplam} ${tipRozet}`;
      badge.title = tahminiTur
        ? `${tipRozet || toplam} bu bölgeye geliyor • ${tahminiTur} içinde varış`
        : `${tipRozet || toplam} bu bölgeye geliyor`;
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

/** durumCiz() üst çubuğu yeniledikten sonra pause / tutorial / ayarlar tıklamalarını yeniden bağlar. */
export function ustPanelOyunButonlariniBagla(cb) {
  if (!cb) return;
  ensureAyarModal();
  ensureProfilYanMenu();
  ensureArastirmaSayfa();
  const pauseBtn = document.getElementById("pause-btn");
  if (pauseBtn) pauseBtn.onclick = cb.duraklatDevam;
  const tutorialBtn = document.getElementById("tutorial-btn");
  if (tutorialBtn) {
    tutorialBtn.onclick = () => {
      document.dispatchEvent(new CustomEvent("tutorial:open"));
    };
  }
  haritaModUstKontrolBagla();
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
}

export function uiGuncel(cb) {
  aktifCallbacklar = cb;
  haritaContextMenuKapat();
  durumCiz();
  haritaGuncel();
  detayCiz();
  islemlerCiz(cb);
  diplomasiCiz(cb);

  // İstatistik panelini göster (oyun başladıysa)
  const statPanel = document.getElementById("istatistik-panel");
  if (statPanel && oyun.tur > 0) {
    istatistikGrafik();
  }

  sagSekmeleriBagla();
  sagSekmeAyarla(aktifSagSekme);

  ustPanelOyunButonlariniBagla(cb);

  const seciliProfilBolge = bolgeById(oyun.seciliId);
  if (seciliProfilBolge && seciliProfilBolge.owner !== "tarafsiz") {
    const ayniProfilBolgesi = profilSonAcilanBolgeId === seciliProfilBolge.id;
    const acilisTalebiVar = profilAcilisTalepBolgeId === seciliProfilBolge.id;
    if (acilisTalebiVar) {
      profilSonAcilanBolgeId = seciliProfilBolge.id;
      profilYanMenuAc(cb, seciliProfilBolge.id);
      profilAcilisTalepBolgeId = null;
    } else if (profilMenuAcik && ayniProfilBolgesi) {
      profilYanMenuGuncel(cb, seciliProfilBolge.id);
    } else if (profilMenuAcik && !ayniProfilBolgesi) {
      profilYanMenuKapat();
    }
  } else {
    profilAcilisTalepBolgeId = null;
    profilSonAcilanBolgeId = null;
    if (profilMenuAcik) profilYanMenuKapat();
  }
  if (arastirmaSayfaAcik) arastirmaSayfaGuncel();
  haritaModKisayolBagla();
  duraklatKisayolBagla();
  document.dispatchEvent(new CustomEvent("ui:guncel"));
}

export function detayCiz() {
  const d = document.getElementById("detay");
  const b = bolgeById(oyun.seciliId);
  if (!b) {
    const biz = oyun.fraksiyon?.biz;
    const bizBolge = oyun.bolgeler.filter((x) => x.owner === "biz").length;
    const bizBirim = ownerToplamBirim("biz");
    d.innerHTML = `
      <h2>Genel Bakış</h2>
      <p>Haritadan bir bölge seçerek detay açabilirsin.</p>
      <p><strong>Çete:</strong> ${htmlEsc(biz?.ad || "Biz")}</p>
      <p><strong>Bölge:</strong> ${bizBolge} • <strong>Birim:</strong> ${bizBirim} • <strong>Para:</strong> ${Math.round(biz?.para || 0)} ₺</p>
      <p class="ipucu">Sahipli bir bölgeye sağ tıkla: solda lider profili/özelleştirme açılır. Kendi bölgene ikinci tık: hareket için birlik seçimi.</p>
    `;
    return;
  }
  const kesifVar = kesifAktifMi(b.id);
  const istihbaratGerekli = b.owner !== "biz" && b.owner !== "tarafsiz" && !kesifVar;
  const bolgeLider = b.owner !== "tarafsiz" ? oyun.fraksiyon?.[b.owner]?.lider : null;
  const liderSatiri = bolgeLider
    ? `<p><strong>Lider:</strong> ${liderProfilAdSatiriHTML(bolgeLider, 16)}${bolgeLider.lakap ? ` <span style="color:#9cb0c3">(${htmlEsc(bolgeLider.lakap)})</span>` : ""}</p>`
    : "";
  const guvTop = b.guv + b.yGuv;
  const gelX = (1 + b.yGel * 0.5).toFixed(1);
  const adamX = (1 + b.yAdam * 0.7).toFixed(1);
  let ek = b.owner !== "tarafsiz" && !istihbaratGerekli
    ? `<p><strong>Garnizon:</strong> ${bolgeHazirBirimSayisi(b.id, b.owner)}</p><p><strong>Birim Tipleri:</strong> ${tipIkonOzet(b.id, b.owner) || "Yok"}</p>`
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
    ${liderSatiri}
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
    sonSeciliBolgeId = oyun.seciliId;
  }
  if (!oyun.toplantiNoktasi || typeof oyun.toplantiNoktasi !== "object") {
    oyun.toplantiNoktasi = { biz: [], ai1: [], ai2: [], ai3: [] };
  }
  const hamToplanti = oyun.toplantiNoktasi.biz;
  const toplantiAdaylari = Array.isArray(hamToplanti)
    ? hamToplanti
    : (hamToplanti !== null && hamToplanti !== undefined ? [hamToplanti] : []);
  const toplantiIdMap = new Map();
  toplantiAdaylari.forEach((hamId) => {
    const direkt = bolgeById(hamId);
    const cozulmus = direkt || oyun.bolgeler.find((x) => String(x?.id) === String(hamId));
    if (!cozulmus || cozulmus.owner !== "biz") return;
    toplantiIdMap.set(String(cozulmus.id), cozulmus.id);
  });
  const bizToplantiBolgeIdleri = [...toplantiIdMap.values()];
  oyun.toplantiNoktasi.biz = bizToplantiBolgeIdleri;
  const bizToplantiBolgeler = bizToplantiBolgeIdleri
    .map((id) => bolgeById(id))
    .filter((x) => !!x && x.owner === "biz");
  const bizToplantiSeciliMi = b.owner === "biz" && bizToplantiBolgeler.some((x) => String(x.id) === String(b.id));
  const bizToplantiMetin = bizToplantiBolgeler.length
    ? bizToplantiBolgeler.map((x) => x.ad).join(", ")
    : "Yok";

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
        </div>
        <div class="btn-grid" style="margin-top:8px">
          <button class="buton grimsi" id="btn-toplanti-yap">📍 ${bizToplantiSeciliMi ? "Toplanma Noktasından Çıkar" : "Toplanma Noktası Ekle"}</button>
          <button class="buton grimsi" id="btn-toplanti-cagir" ${bizToplantiBolgeler.length ? "" : "disabled"}>
            🚚 Toplantı Noktasına Çağır
          </button>
          <button class="buton grimsi" id="btn-toplanti-sifirla" ${bizToplantiBolgeler.length ? "" : "disabled"}>
            🧹 Toplanma Noktalarını Sıfırla
          </button>
        </div>
        <p class="ipucu">Aktif toplanma noktaları: <strong>${bizToplantiMetin}</strong></p>
        <div class="btn-grid" style="margin-top:8px">
          <button class="buton" id="btn-sohret5">Şöhret +5</button>
          <button class="buton" id="btn-sohret10">Şöhret +10</button>
        </div>
        <p class="ipucu">Hareket emri aktifteyken karelerin üzerinde “Buraya Gönder” butonu çıkar.</p>
      `;
    html += binaPanelHTML(b);
    html += birimSatinAlPanelHTML();
  } else {
    const tarafsiz = b.owner === 'tarafsiz';
    const koordineliMumkun = ['ai1', 'ai2', 'ai3'].some((o) => isDostIttifak('biz', o));
    html += `
        <p>Bu bölge bizde değil.</p>
        ${tarafsiz
        ? `<button class="buton" id="btn-teslim">Teslim Al (Rüşvet)</button>
             <p class="ipucu">Tarafsızlara saldırı yok. Kendi bölgeni seçip birlik gönderebilirsin; varınca bekler.</p>`
        : `<p class="tehlike">Düşman bölgesi</p>
             <div class="btn-grid">
               <button class="buton tehlike" id="btn-saldir">Saldır</button>
               <button class="buton tehlike" id="btn-saldir-hizli">Hızlı Saldırı</button>
               <button class="buton" id="btn-saldiri-emri">Saldırı Emri</button>
               <button class="buton grimsi" id="btn-koordineli-saldiri" ${koordineliMumkun ? `` : `disabled`}>Koordineli Saldırı</button>
             </div>
			             ${casuslukPanelHTML(b.id)}
			             <p class="ipucu">Veya kendi bölgeni seç → <strong>Hareket Emri</strong> → bu hedef için haritada “Buraya Gönder”.</p>`
      }
      `;
    html += `
      <hr><h4>🚘 Araç Operasyonu</h4>
      <p class="ipucu">Hedef bölgeden motor/araba çal. Başarısızlıkta suçluluk ve polis baskısı yükselir.</p>
      <div class="btn-grid">
        <button class="buton grimsi" id="btn-cal-motor">🏍️ Motor Çal</button>
        <button class="buton grimsi" id="btn-cal-araba">🚗 Araba Çal</button>
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
    const bt = document.getElementById("btn-toplanti-yap");
    const btc = document.getElementById("btn-toplanti-cagir");
    const bts = document.getElementById("btn-toplanti-sifirla");
    const bs5 = document.getElementById("btn-sohret5");
    const bs10 = document.getElementById("btn-sohret10");
    if (g1) g1.onclick = cb.yatirimGelir;
    if (g2) g2.onclick = cb.yatirimGuv;
    if (g3) g3.onclick = cb.yatirimAdam;
    if (bh) bh.onclick = () => cb.hareketEmriBaslat();
    if (bt && typeof cb.toplantiNoktasiYap === "function") bt.onclick = () => cb.toplantiNoktasiYap();
    if (btc) {
      const cagir = cb.toplantiNoktasinaCagir || cb.toplantiNoktasinaGonder;
      if (typeof cagir === "function") btc.onclick = () => cagir();
    }
    if (bts && typeof cb.toplantiNoktalariSifirla === "function") {
      bts.onclick = () => cb.toplantiNoktalariSifirla();
    }
    if (bs5) bs5.onclick = () => cb.sohretSatinAl(5);
    if (bs10) bs10.onclick = () => cb.sohretSatinAl(10);
    document.querySelectorAll(".btn-bina-kur").forEach((btn) => {
      btn.onclick = () => cb.binaKur(btn.getAttribute("data-tip"));
    });
    document.querySelectorAll(".btn-bina-yukselt").forEach((btn) => {
      btn.onclick = () => cb.binaYukselt(btn.getAttribute("data-tip"));
    });
    document.querySelectorAll(".btn-harac-seviye").forEach((btn) => {
      btn.onclick = () => {
        const seviye = btn.getAttribute("data-seviye");
        if (typeof cb.haracSeviyesiAyarla === "function") cb.haracSeviyesiAyarla(seviye);
      };
    });
    document.querySelectorAll(".btn-alim-sifirla").forEach((btn) => {
      btn.onclick = () => {
        if (typeof cb.adamAlimSayacSifirla === "function") cb.adamAlimSayacSifirla();
      };
    });
  } else {
    if (b.owner === "tarafsiz") {
      const t = document.getElementById("btn-teslim");
      if (t) t.onclick = cb.teslimAl;
    } else {
      const sa = document.getElementById("btn-saldir");
      const sh = document.getElementById("btn-saldir-hizli");
      const se = document.getElementById("btn-saldiri-emri");
      const sk = document.getElementById("btn-koordineli-saldiri");
      if (sa) sa.onclick = cb.saldiri;
      if (sh) sh.onclick = () => cb.saldiriHizliAcil(b.id);
      if (se) se.onclick = cb.hareketEmriSaldiriBaslat;
      if (sk) sk.onclick = cb.koordineliSaldiriBaslat;
    }
    const cMotor = document.getElementById("btn-cal-motor");
    const cAraba = document.getElementById("btn-cal-araba");
    if (cMotor) cMotor.onclick = () => cb.tasitCal("motor");
    if (cAraba) cAraba.onclick = () => cb.tasitCal("araba");
  }

  // Birim satın alma butonları
  document.querySelectorAll(".btn-birim-al").forEach((btn) => {
    btn.onclick = (e) => {
      const tip = btn.getAttribute("data-tip");
      cb.birimSatinAl(tip, { shift5: !!e.shiftKey });
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
  const bizTasit = ownerTasit("biz");
  const eco = ekonomiDurumuUi();
  const harac = aktifHaracSeviyesiUi();
  const limit = bizAlimLimitDurumu();
  const kisiBasiAlimGideri = alimEkMaliyetiUi(1);
  const toplamTasitKapasite = ownerToplamKapasite("biz");
  const tasitTavanBonus = Math.max(0, Math.round(arastirmaEfekt("tasitTavanBonus")));
  const tasitMaliyetIndirim = Math.max(0, Math.min(0.45, arastirmaEfekt("tasitMaliyetIndirim")));
  const tasitKapasiteUstSinir = Math.max(
    20,
    Math.round(bizToplamPersonelUi() * 1.1 + oyun.bolgeler.filter((x) => x.owner === "biz").length * 10 + tasitTavanBonus)
  );
  let html = `<hr><h4>🪖 Birlik Satın Al</h4>
    <div style="font-size:11px;color:#9fb3c5;margin-bottom:6px">
      Alım kotası: ${limit.buTurAlim}/${limit.turKotasi} • Personel tavanı: ${limit.toplamPersonel}/${limit.toplamKapasite}
      <br>İşe alım gideri: ~${kisiBasiAlimGideri}₺/kişi • Yoğun alım sadakat baskısı üretir
    </div>
    <div class="btn-grid">`;
  Object.entries(BIRIM_TIPLERI).forEach(([tipKey, t]) => {
    if (!t.satinAlinabilir) return;
    const maliyet = tipKey === "tetikci"
      ? Math.ceil(t.maliyet * (1 - arastirmaEfekt("tetikciMaliyetIndirim")))
      : t.maliyet;
    const yeterli = oyun.fraksiyon.biz.para >= (maliyet + kisiBasiAlimGideri) && limit.alinabilir > 0;
    html += `<button class="buton grimsi btn-birim-al" data-tip="${tipKey}"
      ${yeterli ? "" : "disabled"}
      title="${t.aciklama}${limit.alinabilir <= 0 ? " • Alım limiti dolu" : ""}">
      ${t.ikon} ${t.ad} [${maliyet}₺]
    </button>`;
  });
  html += `</div><p class="ipucu" style="font-size:11px">
    Hiyerarşi: Genç → Tetikçi → Uzman → Ağır Silahlı • Tıkla=1, Shift+Tık=5 • Bu tur kalan alım: ${limit.alinabilir}
  </p>`;
  html += `<hr><h4>💸 Haraç Politikası</h4>
    <div class="btn-grid">`;
  Object.entries(EKONOMI_DENGE.haracSeviyeleri).forEach(([seviye, bilgi]) => {
    const aktif = eco.haracSeviye === seviye;
    html += `<button class="buton grimsi btn-harac-seviye" data-seviye="${seviye}"
      style="${aktif ? "border:1px solid #f5c542;color:#f5c542;" : ""}"
      title="Gelir x${bilgi.gelirCarpani.toFixed(2)} • Sadakat ${bilgi.sadakatDelta >= 0 ? "+" : ""}${bilgi.sadakatDelta.toFixed(2)}/tur • Polis ${bilgi.polisDelta >= 0 ? "+" : ""}${bilgi.polisDelta.toFixed(2)}/tur">
      ${bilgi.ad}
    </button>`;
  });
  html += `<button class="buton grimsi btn-alim-sifirla"
      title="Bu tur alım sayacını manuel sıfırla">
      🔁 Alım Sayacı Sıfırla
    </button>`;
  html += `</div><p class="ipucu" style="font-size:11px">
    Aktif: ${harac.ad} • Son haraç geliri: +${Math.round(eco.sonHaracGeliri || haracGeliriTahminBiz())}₺
  </p>`;
  html += `<hr><h4>🚚 Taşıt Lojistiği</h4>
    <div style="font-size:12px;color:#aaa;margin-bottom:6px">
      Filo: ${bizTasit.araba} 🚗, ${bizTasit.motor} 🏍️
      <br>Toplam kapasite: ${toplamTasitKapasite}/${tasitKapasiteUstSinir}${tasitTavanBonus > 0 ? ` (Araştırma +${tasitTavanBonus})` : ""}
    </div>
    <div class="btn-grid">`;
  Object.entries(TASIT_TIPLERI).forEach(([tipKey, t]) => {
    const maliyet = Math.max(1, Math.ceil(t.maliyet * (1 - tasitMaliyetIndirim)));
    const yeterli = oyun.fraksiyon.biz.para >= maliyet;
    html += `<button class="buton grimsi btn-tasit-al" data-tip="${tipKey}"
      ${yeterli ? "" : "disabled"}
      title="${t.ad} • Kapasite +${t.kapasite} • Bakım ${t.bakim.toFixed(2)}">
      ${t.ikon} ${t.ad} [${maliyet}₺]
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
  const kesifCost = kesifMaliyeti("biz");
  const suikastCost = suikastMaliyeti("biz");
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
        title="1 ekip + 2 kişilik taşıt kapasitesi + dinamik maliyet — Başarıda kayıp yok">
        🔍 Keşif [${kesifCost}₺]${kesifAktif ? " ✓" : ""}
      </button>
      <button class="buton tehlike btn-suikast" id="btn-suikast"
        ${suikastUygun && !liderDevreDisi ? "" : "disabled"}
        title="2 ekip + 4 kişilik taşıt kapasitesi + dinamik maliyet — Başarıda kayıp yok">
        🗡️ Suikast [${suikastCost}₺]${liderDevreDisi ? " (devre dışı)" : ""}
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
export function isimModalBagla(onRandom, onStart, onMapStart = null) {
  document.getElementById("isim-random").onclick = onRandom;
  document.getElementById("isim-basla").onclick = onStart;
  const mapBtn = document.getElementById("isim-haritadan");
  if (mapBtn) mapBtn.onclick = onMapStart;
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
