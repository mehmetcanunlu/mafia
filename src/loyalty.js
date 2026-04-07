// loyalty.js — Halk Sadakati Sistemi

import { oyun, bolgeById } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";
import { sesCal } from "./audio.js";
import { savasKazanmaIhtimali } from "./combat.js";
import { grupEfektifSavunma } from "./units.js";

export const SADAKAT_BASLANGIC = 55;
const ISYAN_ESIGI = 12;
const FETIH_ISYAN_KORUMA_TUR = 10;

/**
 * Sadakat hesaplama kuralları (tur bazı değişim):
 *  + güvenlik yatırımı artışı
 *  + gelir yatırımı
 *  + uzun süreli sakin dönem
 *  − düşman konvoyu geliyor
 *  − bölge az önce fethedildi (_fetihDarbe)
 */
function sadakatDegisim(b) {
  let d = 0;
  const guv = (b.guv || 0) + (b.yGuv || 0);

  d += guv * 0.4;                  // güvenlik yatırımı → güven artırır
  d += (b.yGel || 0) * 0.6;       // gelir yatırımı → refah = güven
  d += 0.25;                       // pasif istikrar

  // Düşman konvoyu geliyorsa korku düşürür
  const gelenler = oyun.birimler.filter(
    (k) => k.hedefId === b.id && k.owner !== b.owner
  );
  if (gelenler.length > 0) d -= 6;

  // Fetih travması (bir tur etki)
  if (b._fetihDarbe) {
    d -= 20;
    delete b._fetihDarbe;
  }

  return d;
}

/**
 * Her tur çağrılır — tüm bölgelerin sadakatini günceller.
 */
export function sadakatTick() {
  oyun.bolgeler.forEach((b) => {
    // Tarafsız bölge — çok yavaş doğal yükseliş
    if (b.owner === "tarafsiz") {
      b.sadakat = Math.min(100, (b.sadakat ?? SADAKAT_BASLANGIC) + 0.5);
      return;
    }

    const onceki = b.sadakat ?? SADAKAT_BASLANGIC;
    const degisim = sadakatDegisim(b);
    b.sadakat = Math.max(0, Math.min(100, onceki + degisim));

    // İsyan riski: sadece bizim bölge, düşük sadakat
    if (b.owner === "biz" && b.sadakat < ISYAN_ESIGI && Math.random() < 0.12) {
      if (Number.isFinite(b._isyanKorumaTur) && oyun.tur < b._isyanKorumaTur) return;
      isyanCikar(b);
    }
  });
}

function bolgeSavunmaBirimleri(bolgeId, owner) {
  return oyun.birimler.filter(
    (k) =>
      !k._sil &&
      k.owner === owner &&
      k.konumId === bolgeId &&
      (!k.rota || k.rota.length === 0) &&
      !k.hedefId &&
      (k.adet || 0) > 0
  );
}

function birliklerdenKayipDus(birimler, hedefKayip) {
  const aktif = (birimler || []).filter((k) => !k._sil && (k.adet || 0) > 0);
  const kayipHedef = Math.max(0, Math.floor(Number(hedefKayip) || 0));
  if (!aktif.length || kayipHedef <= 0) return 0;

  const toplam = aktif.reduce((t, k) => t + (k.adet || 0), 0);
  if (toplam <= 0) return 0;

  let uygulanan = 0;
  aktif.forEach((k) => {
    const pay = Math.min(k.adet || 0, Math.floor(((k.adet || 0) / toplam) * kayipHedef));
    if (pay <= 0) return;
    k.adet -= pay;
    uygulanan += pay;
  });

  let kalan = Math.max(0, kayipHedef - uygulanan);
  for (let i = 0; i < aktif.length && kalan > 0; i += 1) {
    const k = aktif[i];
    if ((k.adet || 0) <= 0) continue;
    k.adet -= 1;
    kalan -= 1;
    uygulanan += 1;
    if (i === aktif.length - 1 && kalan > 0) i = -1;
  }

  aktif.forEach((k) => {
    if ((k.adet || 0) <= 0) k._sil = true;
  });
  return uygulanan;
}

function isyanSaldiriGucu(bolge) {
  const sadakat = Math.max(0, Math.min(100, Number(bolge.sadakat) || SADAKAT_BASLANGIC));
  const nufus = Math.max(0, Number(bolge.nufus || bolge.nufusMax || 0));
  const huzursuzluk = (100 - sadakat) / 100;
  const taban = nufus * 0.11 * huzursuzluk;
  const sadakatBaskisi = Math.max(0, (ISYAN_ESIGI - sadakat) * 1.4);
  return Math.max(4, Math.round(taban + sadakatBaskisi + Math.random() * 5));
}

function isyanCikar(b) {
  const eskiOwner = b.owner;
  const guvTop = Math.max(0, (b.guv || 0) + (b.yGuv || 0));
  const savunanBirimler = bolgeSavunmaBirimleri(b.id, eskiOwner);
  const savunanEfektif = Math.max(0, Math.round(grupEfektifSavunma(savunanBirimler)));
  const isyanciAdet = isyanSaldiriGucu(b);
  const isyanciEfektif = Math.max(1, Math.round(isyanciAdet * (0.95 + Math.random() * 0.3)));
  const isyanKazanmaSans = savasKazanmaIhtimali(isyanciEfektif, Math.max(1, savunanEfektif), guvTop);
  const isyanBasarili = Math.random() < isyanKazanmaSans;

  if (isyanBasarili) {
    const savunanKayip = Math.max(1, Math.round(savunanBirimler.reduce((t, k) => t + (k.adet || 0), 0) * (0.65 + Math.random() * 0.2)));
    birliklerdenKayipDus(savunanBirimler, savunanKayip);
    b.owner = "tarafsiz";
    b.sadakat = 30; // kısmi toparlanma
    delete b._isyanKorumaTur;

    logYaz(
      `⚠️ HALK İSYANI! ${b.ad} bölgesi kontrolden çıktı. ` +
      `(İsyancı: ${isyanciAdet}, Savunma: ${savunanEfektif})`
    );
    sesCal("isyan");
    showToast(`⚠️ ${b.ad} isyan etti!`, "hata", 5000);
    return;
  }

  const savunanToplam = savunanBirimler.reduce((t, k) => t + (k.adet || 0), 0);
  const savunanKayip = Math.max(0, Math.round(Math.max(1, savunanToplam) * (0.08 + Math.random() * 0.12)));
  const uygulananKayip = birliklerdenKayipDus(savunanBirimler, savunanKayip);
  b.sadakat = Math.max(15, Math.min(100, (b.sadakat ?? SADAKAT_BASLANGIC) + 6));
  b._isyanKorumaTur = Math.max(Number(b._isyanKorumaTur) || 0, (oyun.tur || 0) + 3);
  logYaz(
    `🛡️ ${b.ad} isyanı bastırıldı. ` +
    `(İsyancı: ${isyanciAdet}, Savunma: ${savunanEfektif}, Kayıp: ${uygulananKayip})`
  );
  showToast(`🛡️ ${b.ad} isyanı bastırıldı.`, "basari", 3800);
}

/**
 * Bölge fethedilince çağrılır — travma etkisi.
 */
export function fetihSonrasiSadakat(bolgeId) {
  const b = bolgeById(bolgeId);
  if (!b) return;
  b.sadakat = Math.max(5, (b.sadakat ?? SADAKAT_BASLANGIC) - 30);
  b._fetihDarbe = true; // bir sonraki tick'te ek düşüş
  b._isyanKorumaTur = Math.max(Number(b._isyanKorumaTur) || 0, (oyun.tur || 0) + FETIH_ISYAN_KORUMA_TUR);
}

/**
 * Sadakat seviyesinin renkli gösterimi için yardımcı.
 */
export function sadakatRenk(sadakat) {
  if (sadakat >= 70) return "#2ecc71";
  if (sadakat >= 40) return "#f39c12";
  if (sadakat >= 20) return "#e67e22";
  return "#e74c3c";
}

export function sadakatEtiket(sadakat) {
  if (sadakat >= 70) return "Sadık";
  if (sadakat >= 40) return "Tarafsız";
  if (sadakat >= 20) return "Huzursuz";
  return "İsyana Hazır";
}
