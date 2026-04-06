// loyalty.js — Halk Sadakati Sistemi

import { oyun, bolgeById } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";
import { sesCal } from "./audio.js";

export const SADAKAT_BASLANGIC = 55;
const ISYAN_ESIGI = 12;

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
      isyanCikar(b);
    }
  });
}

function isyanCikar(b) {
  const eskiOwner = b.owner;
  b.owner = "tarafsiz";
  b.sadakat = 30; // kısmi toparlanma

  // Bölgedeki birimleri dağıt
  oyun.birimler
    .filter((k) => k.konumId === b.id && k.owner === eskiOwner)
    .forEach((k) => { k._sil = true; });

  logYaz(`⚠️ HALK İSYANI! ${b.ad} bölgesi kontrolden çıktı. (Sadakat: ${Math.round(b.sadakat)})`);
  sesCal("isyan");
  showToast(`⚠️ ${b.ad} isyan etti!`, "hata", 5000);
}

/**
 * Bölge fethedilince çağrılır — travma etkisi.
 */
export function fetihSonrasiSadakat(bolgeId) {
  const b = bolgeById(bolgeId);
  if (!b) return;
  b.sadakat = Math.max(5, (b.sadakat ?? SADAKAT_BASLANGIC) - 30);
  b._fetihDarbe = true; // bir sonraki tick'te ek düşüş
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
