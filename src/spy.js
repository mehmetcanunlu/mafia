// spy.js — Casusluk Sistemi: Taşıt + Ekip Kaynakları

import { oyun, bolgeById, yiginaEkle } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";
import { arastirmaEfekt } from "./research.js";
import { sesCal } from "./audio.js";
import { bolgeTasitAyir, bolgeTasitIadeEt, bolgeTasitKombinasyonu } from "./logistics.js";

const SUIKAST_MALIYET = 300; // ₺
const SUIKAST_KAPASITE_GEREK = 4;
const SUIKAST_EKIP_GEREK = 2;
const KESIF_MALIYET = 100;
const KESIF_KAPASITE_GEREK = 2;
const KESIF_EKIP_GEREK = 1;
const KESIF_SURE = 6; // tur — keşif bilgisi ne kadar geçerli
const SUIKAST_DEVRE_DISI_TUR = 8; // lider kaç tur devre dışı
const TIP_ONCELIK = { genc: 0, tetikci: 1, uzman: 2, agir_silahli: 3 };

function bosEkipToplami(owner, bolgeId) {
  return oyun.birimler
    .filter(
      (b) =>
        b.owner === owner &&
        b.konumId === bolgeId &&
        !b.hedefId &&
        (!b.rota || b.rota.length === 0) &&
        b.adet > 0
    )
    .reduce((t, b) => t + b.adet, 0);
}

function bolgeEkipStackleri(owner, bolgeId) {
  return oyun.birimler
    .filter(
      (b) =>
        b.owner === owner &&
        b.konumId === bolgeId &&
        !b.hedefId &&
        (!b.rota || b.rota.length === 0) &&
        b.adet > 0
    )
    .sort((a, b) => (TIP_ONCELIK[a.tip || "tetikci"] || 9) - (TIP_ONCELIK[b.tip || "tetikci"] || 9));
}

function ekipAyir(owner, bolgeId, adet) {
  const toplam = bosEkipToplami(owner, bolgeId);
  if (toplam < adet) return null;
  const parcalar = [];
  let kalan = adet;

  for (const s of bolgeEkipStackleri(owner, bolgeId)) {
    if (kalan <= 0) break;
    const al = Math.min(s.adet, kalan);
    if (al <= 0) continue;
    s.adet -= al;
    if (s.adet <= 0) s._sil = true;
    parcalar.push({ tip: s.tip || "tetikci", adet: al });
    kalan -= al;
  }
  oyun.birimler = oyun.birimler.filter((b) => !b._sil && b.adet > 0);
  return kalan <= 0 ? parcalar : null;
}

function ekipIade(owner, bolgeId, parcalar = []) {
  parcalar.forEach((p) => {
    if ((p?.adet || 0) > 0) yiginaEkle(bolgeId, owner, p.adet, p.tip || "tetikci");
  });
}

function operasyonKaynagiBul(owner, kapasiteGerek, ekipGerek, tercihBolgeId = null) {
  const adaylar = oyun.bolgeler.filter((b) => b.owner === owner);
  if (tercihBolgeId !== null) {
    adaylar.sort((a, b) => (a.id === tercihBolgeId ? -1 : b.id === tercihBolgeId ? 1 : 0));
  }

  let secim = null;
  let enSkor = Infinity;
  adaylar.forEach((b) => {
    const plan = bolgeTasitKombinasyonu(b, kapasiteGerek);
    if (!plan) return;
    const ekipToplam = bosEkipToplami(owner, b.id);
    if (ekipToplam < ekipGerek) return;
    const tasma = (plan.kapasite || 0) - kapasiteGerek;
    const aracAdedi = (plan.araba || 0) + (plan.motor || 0);
    const skor = tasma * 10 + aracAdedi;
    if (skor < enSkor) {
      secim = { bolge: b, plan };
      enSkor = skor;
    }
  });
  return secim;
}

function operasyonKaynakAyir(owner, kapasiteGerek, ekipGerek, tercihBolgeId = null) {
  const secim = operasyonKaynagiBul(owner, kapasiteGerek, ekipGerek, tercihBolgeId);
  if (!secim?.bolge) return null;

  const tasit = bolgeTasitAyir(secim.bolge, kapasiteGerek);
  if (!tasit) return null;
  const ekip = ekipAyir(owner, secim.bolge.id, ekipGerek);
  if (!ekip) {
    bolgeTasitIadeEt(secim.bolge.id, tasit.araba || 0, tasit.motor || 0);
    return null;
  }
  return { owner, bolgeId: secim.bolge.id, tasit, ekip };
}

function operasyonKaynakIade(kaynak) {
  if (!kaynak) return;
  bolgeTasitIadeEt(kaynak.bolgeId, kaynak.tasit?.araba || 0, kaynak.tasit?.motor || 0);
  ekipIade(kaynak.owner, kaynak.bolgeId, kaynak.ekip || []);
}

export function operasyonMumkunMu(hedefBolgeId, operasyon) {
  const kapasite = operasyon === "suikast" ? SUIKAST_KAPASITE_GEREK : KESIF_KAPASITE_GEREK;
  const ekip = operasyon === "suikast" ? SUIKAST_EKIP_GEREK : KESIF_EKIP_GEREK;
  return !!operasyonKaynagiBul("biz", kapasite, ekip, hedefBolgeId);
}

/**
 * Keşif operasyonu.
 * Başarılı olursa hedef bölgenin detayları 6 tur boyunca görünür olur.
 */
export function kesifYap(hedefBolgeId) {
  const hedef = bolgeById(hedefBolgeId);
  if (!hedef) return { basarili: false, mesaj: "Geçersiz hedef." };
  if (hedef.owner === "biz") return { basarili: false, mesaj: "Kendi bölgeni keşifleyemezsin." };

  if (oyun.fraksiyon.biz.para < KESIF_MALIYET) {
    return { basarili: false, mesaj: `Yetersiz para. Gerekli: ${KESIF_MALIYET} ₺` };
  }
  const kaynak = operasyonKaynakAyir("biz", KESIF_KAPASITE_GEREK, KESIF_EKIP_GEREK, hedefBolgeId);
  if (!kaynak) {
    return { basarili: false, mesaj: `En az ${KESIF_EKIP_GEREK} ekip ve ${KESIF_KAPASITE_GEREK} kişilik taşıt kapasitesi gerekli.` };
  }

  oyun.fraksiyon.biz.para -= KESIF_MALIYET;

  const basariSansi = Math.min(0.95, 0.75 + arastirmaEfekt("kesifBonus"));
  const basarili = Math.random() < basariSansi;

  if (basarili) {
    hedef._kesif = { bitis: oyun.tur + KESIF_SURE };
    const garnizon = oyun.birimler
      .filter((b) => b.konumId === hedefBolgeId && b.owner === hedef.owner)
      .reduce((t, b) => t + b.adet, 0);

    logYaz(
      `🔍 ${hedef.ad} keşfedildi! Garnizon: ${garnizon}, Güvenlik: ${hedef.guv + hedef.yGuv}, Gelir: ${hedef.gelir} ₺/tur`
    );
    sesCal("kesif");
    showToast(`🔍 ${hedef.ad} keşfedildi! Bilgiler ${KESIF_SURE} tur geçerli.`, "bilgi", 4000);
    operasyonKaynakIade(kaynak);
    return {
      basarili: true,
      mesaj: `${hedef.ad} keşfedildi.`,
      detay: { garnizon, guv: hedef.guv + hedef.yGuv, gelir: hedef.gelir },
    };
  } else {
    logYaz(`🔍 Keşif başarısız: ${hedef.ad} — ekip fark edildi.`);
    return { basarili: false, mesaj: "Keşif başarısız. Operasyon ekibi ve taşıt kaybedildi." };
  }
}

/**
 * Suikast operasyonu.
 * Başarılı olursa hedef fraksiyonun lider bonusu 8 tur devre dışı kalır.
 */
export function suikastYap(hedefBolgeId) {
  const hedef = bolgeById(hedefBolgeId);
  if (!hedef) return { basarili: false, mesaj: "Geçersiz hedef." };
  if (hedef.owner === "biz" || hedef.owner === "tarafsiz") {
    return { basarili: false, mesaj: "Geçersiz hedef." };
  }

  const hedefFr = oyun.fraksiyon[hedef.owner];
  if (!hedefFr?.lider) return { basarili: false, mesaj: "Hedefin lideri yok." };

  // Lider zaten devre dışıysa
  if (liderDevreDisiMi(hedef.owner)) {
    return { basarili: false, mesaj: `${hedefFr.lider.ad} zaten devre dışı (${hedefFr._liderDevreDisi - oyun.tur} tur kaldı).` };
  }

  if (oyun.fraksiyon.biz.para < SUIKAST_MALIYET) {
    return { basarili: false, mesaj: `Yetersiz para. Gerekli: ${SUIKAST_MALIYET} ₺` };
  }
  const kaynak = operasyonKaynakAyir("biz", SUIKAST_KAPASITE_GEREK, SUIKAST_EKIP_GEREK, hedefBolgeId);
  if (!kaynak) {
    return { basarili: false, mesaj: `En az ${SUIKAST_EKIP_GEREK} ekip ve ${SUIKAST_KAPASITE_GEREK} kişilik taşıt kapasitesi gerekli.` };
  }

  oyun.fraksiyon.biz.para -= SUIKAST_MALIYET;

  // Başarı şansı: düşman güvenliğine ve istihbarat araştırmasına göre
  const guvPenalti = (hedef.guv + hedef.yGuv) * 0.04;
  const basariSansi = Math.max(
    0.10,
    Math.min(0.95, 0.50 + arastirmaEfekt("suikastBonus") - guvPenalti)
  );
  const basarili = Math.random() < basariSansi;

  const liderAd = hedefFr.lider.ad;

  if (basarili) {
    hedefFr._liderDevreDisi = oyun.tur + SUIKAST_DEVRE_DISI_TUR;
    logYaz(`🗡️ Suikast başarılı! "${liderAd}" ${SUIKAST_DEVRE_DISI_TUR} tur devre dışı.`);
    sesCal("suikast");
    showToast(`🗡️ ${liderAd} devre dışı! (${SUIKAST_DEVRE_DISI_TUR} tur)`, "basari", 5000);
    operasyonKaynakIade(kaynak);
    return { basarili: true, mesaj: `${liderAd} devre dışı bırakıldı.` };
  } else {
    // Başarısız: hedef öfkeli, saldırma ihtimali artar
    hedefFr._ofke = (hedefFr._ofke || 0) + 20;
    logYaz(`🗡️ Suikast başarısız! ${hedefFr.ad} öfkeli — misilleme yapabilir.`);
    showToast(`🗡️ Suikast başarısız! ${hedefFr.ad} öfkeli.`, "hata", 4000);
    return { basarili: false, mesaj: "Suikast başarısız. Operasyon ekibi ve taşıt kaybedildi." };
  }
}

/**
 * Liderin devre dışı olup olmadığını kontrol eder.
 * main.js'deki liderBonus fonksiyonu bu kontrolü kullanır.
 */
export function liderDevreDisiMi(owner) {
  const fr = oyun.fraksiyon[owner];
  if (!fr?._liderDevreDisi) return false;
  if (oyun.tur > fr._liderDevreDisi) {
    delete fr._liderDevreDisi;
    if (fr.lider) logYaz(`${fr.ad} lideri "${fr.lider.ad}" yeniden aktif.`);
    return false;
  }
  return true;
}

/**
 * Keşif bilgisinin aktif olup olmadığını kontrol eder.
 */
export function kesifAktifMi(bolgeId) {
  const b = bolgeById(bolgeId);
  if (!b?._kesif) return false;
  if (oyun.tur > b._kesif.bitis) {
    delete b._kesif;
    return false;
  }
  return true;
}
