// ekonomi.js — Gelir ve haraç hesaplarının TEK kaynağı.
// Daha önce aynı formül main.js (2 kopya), ui.js, stats.js ve sim-test'te
// birbirinden ayrışmış kopyalar hâlindeydi; tüm tüketiciler artık burayı kullanır.
// DOM'a dokunmaz — Node (sim-test) tarafından da import edilebilir.

import { oyun } from "./state.js";
import { EKONOMI_DENGE, BOLGE_OZELLIKLERI, BINA_TIPLERI } from "./config.js";
import { arastirmaEfekt } from "./research.js";
import { krizCarpani } from "./events.js";

export function liderBonus(owner, bonusTip) {
  return oyun.fraksiyon?.[owner]?.lider?.bonus?.[bonusTip] || 0;
}

export function bolgeOzellikBonus(b, bonusTip) {
  if (!b?.ozellik) return 0;
  const oz = BOLGE_OZELLIKLERI[b.ozellik];
  return oz ? (oz[bonusTip] || 0) : 0;
}

export function binaBonus(b, bonusTip) {
  if (!Array.isArray(b?.binalar)) return 0;
  return b.binalar.reduce((toplam, kayit) => {
    const tanim = BINA_TIPLERI[kayit.tip];
    const etki = tanim?.etkiler?.[bonusTip] || 0;
    return toplam + etki * (kayit.seviye || 1);
  }, 0);
}

export function geceEkonomiBonusu(b) {
  if (b?.owner !== "biz") return 0;
  if (b.ozellik !== "kumarhane" && b.ozellik !== "carsi") return 0;
  return arastirmaEfekt("geceEkonomiBonus");
}

export function aktifHaracProfili() {
  const seviye = oyun.ekonomi?.haracSeviye;
  return EKONOMI_DENGE.haracSeviyeleri[seviye] || EKONOMI_DENGE.haracSeviyeleri.orta;
}

/** Haraç geliri — araştırma bonusu DAHİL (UI tahmini eskiden bunu atlıyordu). */
export function haracGeliriHesapla(bizBolgeler, harac = aktifHaracProfili()) {
  const taban = bizBolgeler.reduce((toplam, b) => {
    const gelirTabani = (b.gelir || 0) * EKONOMI_DENGE.haracGelirOrani;
    const nufusKatkisi = (b.nufus || 0) * EKONOMI_DENGE.haracNufusCarpani;
    const yatirimCarpani = 1 + (b.yGel || 0) * EKONOMI_DENGE.haracYatirimBonus;
    return toplam + (gelirTabani + nufusKatkisi) * yatirimCarpani;
  }, 0);
  const arastirmaHaracBonus = Math.max(0, arastirmaEfekt("haracGelirBonus"));
  return Math.max(0, Math.round(taban * (harac?.gelirCarpani || 1) * (1 + arastirmaHaracBonus)));
}

/** Bir owner'ın tur geliri hesabında kullanılan ortak çarpanlar. */
export function ownerGelirBaglami(owner) {
  return {
    liderCarpani: 1 + liderBonus(owner, "gelirCarpani"),
    kriz: krizCarpani(owner),
    arastirmaGelirBonus: owner === "biz" ? arastirmaEfekt("gelirBonus") : 0,
    pasifGelir: owner === "biz" ? arastirmaEfekt("pasifGelir") : 0,
  };
}

/** Tek bölgenin bir turdaki geliri (tüm çarpanlar dahil). */
export function bolgeTurGeliri(b, baglam) {
  const gelX = 1 + (b.yGel || 0) * 0.5;
  const bolgeBonus =
    1 +
    bolgeOzellikBonus(b, "gelirBonus") +
    binaBonus(b, "gelirBonus") +
    baglam.arastirmaGelirBonus +
    geceEkonomiBonusu(b);
  return (b.gelir || 0) * gelX * baglam.liderCarpani * bolgeBonus * baglam.kriz;
}

/**
 * Owner'ın bir turdaki toplam geliri: bölge gelirleri + pasif gelir + haraç.
 * Döner: { baglam, bolgeler, bolgeGelir, haracGelir, pasifGelir, toplam }
 */
export function ownerTurGeliri(owner) {
  const baglam = ownerGelirBaglami(owner);
  const bolgeler = (oyun.bolgeler || []).filter((b) => b.owner === owner);
  const bolgeGelir = bolgeler.reduce((t, b) => t + bolgeTurGeliri(b, baglam), 0);
  const haracGelir = owner === "biz" ? haracGeliriHesapla(bolgeler) : 0;
  return {
    baglam,
    bolgeler,
    bolgeGelir,
    haracGelir,
    pasifGelir: baglam.pasifGelir,
    toplam: bolgeGelir + haracGelir + baglam.pasifGelir,
  };
}
