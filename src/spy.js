// spy.js — Casusluk Sistemi: Taşıt + Ekip Kaynakları

import { oyun, bolgeById, yiginaEkle } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";
import { arastirmaEfekt } from "./research.js";
import { sesCal } from "./audio.js";
import { bolgeTasitAyir, bolgeTasitIadeEt, bolgeTasitKombinasyonu } from "./logistics.js";
import { diplomasiSuikastSonucu } from "./diplomasi.js";
import { rastgeleLiderSecimi } from "./liderHavuzu.js";

const SUIKAST_MALIYET_TABAN = 300; // ₺
const SUIKAST_KAPASITE_GEREK = 4;
const SUIKAST_EKIP_GEREK = 2;
const KESIF_MALIYET_TABAN = 100;
const KESIF_KAPASITE_GEREK = 2;
const KESIF_EKIP_GEREK = 1;
const KESIF_SURE_TABAN = 6; // tur — keşif bilgisi ne kadar geçerli
const SUIKAST_DEVRE_DISI_TUR = 8; // lider kaç tur devre dışı
const SUIKAST_CETE_COKUS_SANSI = 0.10;
const SUIKAST_BOLGE_KAYBI_SANSI = 0.20;
const SUIKAST_MIN_BASARI = 0.06;
const SUIKAST_MAX_BASARI = 0.78;
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
    if ((p?.adet || 0) > 0) {
      yiginaEkle(bolgeId, owner, p.adet, p.tip || "tetikci", { tavanUygula: false });
    }
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

function suikastSonrasiYeniLiderSec(oncekiLiderId = null) {
  const aktifLiderIdleri = new Set(
    Object.values(oyun.fraksiyon || {})
      .map((f) => f?.lider?.id)
      .filter((id) => Number.isFinite(id))
      .map((id) => Number(id))
  );
  const adaylar = rastgeleLiderSecimi(24);
  return (
    adaylar.find((l) => Number(l?.id) !== Number(oncekiLiderId) && !aktifLiderIdleri.has(Number(l?.id))) ||
    adaylar.find((l) => Number(l?.id) !== Number(oncekiLiderId)) ||
    adaylar[0] ||
    null
  );
}

function ownerBirimleriSil(owner, bolgeId = null) {
  oyun.birimler = (oyun.birimler || []).filter((u) => {
    if (u?.owner !== owner) return true;
    if (bolgeId === null || bolgeId === undefined) return false;
    return u.konumId !== bolgeId;
  });
}

function suikastBolgeKaybiUygula(hedefOwner, saldiranOwner = "biz") {
  const ownerBolgeler = (oyun.bolgeler || []).filter((b) => b.owner === hedefOwner);
  if (!ownerBolgeler.length) return null;

  const sinirAdaylari = ownerBolgeler.filter((b) =>
    (oyun.komsu?.[b.id] || []).some((kid) => bolgeById(kid)?.owner === saldiranOwner)
  );
  const kaynak = (sinirAdaylari.length ? sinirAdaylari : ownerBolgeler)
    .slice()
    .sort((a, b) => {
      const aBirim = (oyun.birimler || [])
        .filter((u) => u.owner === hedefOwner && u.konumId === a.id)
        .reduce((t, u) => t + (u.adet || 0), 0);
      const bBirim = (oyun.birimler || [])
        .filter((u) => u.owner === hedefOwner && u.konumId === b.id)
        .reduce((t, u) => t + (u.adet || 0), 0);
      const aSkor = (a.gelir || 0) * 1.5 + (a.guv || 0) + (a.yGuv || 0) + aBirim * 0.4;
      const bSkor = (b.gelir || 0) * 1.5 + (b.guv || 0) + (b.yGuv || 0) + bBirim * 0.4;
      return bSkor - aSkor;
    })[0];
  if (!kaynak) return null;

  const devralan = sinirAdaylari.length ? saldiranOwner : "tarafsiz";
  ownerBirimleriSil(hedefOwner, kaynak.id);
  kaynak.owner = devralan;
  kaynak.garnizon = Math.max(2, Math.round((kaynak.garnizon || 4) * 0.5));
  if (devralan !== "tarafsiz") {
    yiginaEkle(kaynak.id, devralan, Math.max(3, Math.round(kaynak.garnizon || 3)), "tetikci", { tavanUygula: false });
  }
  return { bolgeId: kaynak.id, bolgeAd: kaynak.ad, devralan };
}

function suikastKomutaDarbeUygula(hedefOwner) {
  let kayip = 0;
  (oyun.birimler || []).forEach((u) => {
    if (u.owner !== hedefOwner) return;
    const azalma = Math.max(0, Math.round((u.adet || 0) * 0.35));
    if (azalma <= 0) return;
    u.adet -= azalma;
    kayip += azalma;
    if (u.adet <= 0) u._sil = true;
  });
  oyun.birimler = (oyun.birimler || []).filter((u) => !u._sil && (u.adet || 0) > 0);
  const fr = oyun.fraksiyon?.[hedefOwner];
  const paraKaybi = fr ? Math.min(fr.para || 0, Math.max(80, Math.round((fr.para || 0) * 0.2))) : 0;
  if (fr) {
    fr.para = Math.max(0, (fr.para || 0) - paraKaybi);
    fr.havuz = Math.max(0, (fr.havuz || 0) - 6);
  }
  return { kayip, paraKaybi };
}

function suikastCeteCokusUygula(hedefOwner) {
  const ownerBolgeler = (oyun.bolgeler || []).filter((b) => b.owner === hedefOwner);
  ownerBolgeler.forEach((b) => {
    b.owner = "tarafsiz";
    b.garnizon = Math.max(3, Math.round((b.nufus || b.nufusMax || 70) / 28));
  });
  ownerBirimleriSil(hedefOwner);
  const fr = oyun.fraksiyon?.[hedefOwner];
  if (fr) {
    fr.para = 0;
    fr.havuz = 0;
    fr.tasit = { araba: 0, motor: 0 };
  }
  return { bolgeKaybi: ownerBolgeler.length };
}

function operasyonMaliyetCarpani(owner = "biz") {
  const indirim = Math.max(0, Math.min(0.6, arastirmaEfekt("operasyonMaliyetIndirim")));
  return owner === "biz" ? (1 - indirim) : 1;
}

export function kesifMaliyeti(owner = "biz") {
  return Math.max(20, Math.round(KESIF_MALIYET_TABAN * operasyonMaliyetCarpani(owner)));
}

export function suikastMaliyeti(owner = "biz") {
  return Math.max(60, Math.round(SUIKAST_MALIYET_TABAN * operasyonMaliyetCarpani(owner)));
}

export function kesifSuresi(owner = "biz") {
  const bonus = owner === "biz" ? Math.max(0, Math.round(arastirmaEfekt("kesifSureBonus"))) : 0;
  return Math.max(2, KESIF_SURE_TABAN + bonus);
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

  const maliyet = kesifMaliyeti("biz");
  if (oyun.fraksiyon.biz.para < maliyet) {
    return { basarili: false, mesaj: `Yetersiz para. Gerekli: ${maliyet} ₺` };
  }
  const kaynak = operasyonKaynakAyir("biz", KESIF_KAPASITE_GEREK, KESIF_EKIP_GEREK, hedefBolgeId);
  if (!kaynak) {
    return { basarili: false, mesaj: `En az ${KESIF_EKIP_GEREK} ekip ve ${KESIF_KAPASITE_GEREK} kişilik taşıt kapasitesi gerekli.` };
  }

  oyun.fraksiyon.biz.para -= maliyet;

  const basariSansi = Math.min(0.95, 0.75 + arastirmaEfekt("kesifBonus"));
  const basarili = Math.random() < basariSansi;
  const sure = kesifSuresi("biz");

  if (basarili) {
    hedef._kesif = { bitis: oyun.tur + sure };
    const garnizon = oyun.birimler
      .filter((b) => b.konumId === hedefBolgeId && b.owner === hedef.owner)
      .reduce((t, b) => t + b.adet, 0);

    logYaz(
      `🔍 ${hedef.ad} keşfedildi! Garnizon: ${garnizon}, Güvenlik: ${hedef.guv + hedef.yGuv}, Gelir: ${hedef.gelir} ₺/tur`
    );
    sesCal("kesif");
    showToast(`🔍 ${hedef.ad} keşfedildi! Bilgiler ${sure} tur geçerli.`, "bilgi", 4000);
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

  const maliyet = suikastMaliyeti("biz");
  if (oyun.fraksiyon.biz.para < maliyet) {
    return { basarili: false, mesaj: `Yetersiz para. Gerekli: ${maliyet} ₺` };
  }
  const kaynak = operasyonKaynakAyir("biz", SUIKAST_KAPASITE_GEREK, SUIKAST_EKIP_GEREK, hedefBolgeId);
  if (!kaynak) {
    return { basarili: false, mesaj: `En az ${SUIKAST_EKIP_GEREK} ekip ve ${SUIKAST_KAPASITE_GEREK} kişilik taşıt kapasitesi gerekli.` };
  }

  oyun.fraksiyon.biz.para -= maliyet;

  // Başarı şansı zorlaştırıldı: güvenlik daha sert etkiler, keşif varsa sınırlı bonus verir.
  const guvPenalti = (hedef.guv + hedef.yGuv) * 0.05;
  const kesifBonus = kesifAktifMi(hedefBolgeId) ? 0.08 : 0;
  const basariSansi = Math.max(
    SUIKAST_MIN_BASARI,
    Math.min(SUIKAST_MAX_BASARI, 0.34 + arastirmaEfekt("suikastBonus") + kesifBonus - guvPenalti)
  );
  const basarili = Math.random() < basariSansi;

  const liderAd = hedefFr.lider.ad;

  if (basarili) {
    const oncekiLiderId = hedefFr.lider?.id || null;
    const yeniLider = suikastSonrasiYeniLiderSec(oncekiLiderId);
    if (yeniLider) hedefFr.lider = yeniLider;
    delete hedefFr._liderDevreDisi;
    hedefFr._ofke = (hedefFr._ofke || 0) + 30;

    const kriz = Math.random();
    let krizMesaj = "";
    let toastMesaj = `🗡️ ${liderAd} etkisiz hale getirildi.`;
    if (kriz < SUIKAST_CETE_COKUS_SANSI) {
      const cokme = suikastCeteCokusUygula(hedef.owner);
      krizMesaj = `${hedefFr.ad} suikast sonrası iç savaşla çöktü (${cokme.bolgeKaybi} bölge dağıldı).`;
      toastMesaj = `💀 ${hedefFr.ad} çöktü!`;
    } else if (kriz < (SUIKAST_CETE_COKUS_SANSI + SUIKAST_BOLGE_KAYBI_SANSI)) {
      const bolgeKaybi = suikastBolgeKaybiUygula(hedef.owner, "biz");
      if (bolgeKaybi) {
        krizMesaj = `${hedefFr.ad} kriz yaşadı ve ${bolgeKaybi.bolgeAd} kontrolünü ${
          bolgeKaybi.devralan === "biz" ? "bize" : "tarafsızlara"
        } kaybetti.`;
        toastMesaj = `🏴 ${bolgeKaybi.bolgeAd} el değiştirdi!`;
      }
    } else {
      const darbe = suikastKomutaDarbeUygula(hedef.owner);
      krizMesaj = `${hedefFr.ad} komuta zinciri sarsıldı (yaklaşık ${darbe.kayip} birlik dağıldı, ${darbe.paraKaybi}₺ kayıp).`;
      toastMesaj = `⚠️ ${hedefFr.ad} komuta darbesi yedi.`;
    }

    diplomasiSuikastSonucu("biz", hedef.owner, true);
    const yeniLiderAd = hedefFr.lider?.ad || "Yeni lider";
    logYaz(`🗡️ Suikast başarılı! "${liderAd}" etkisiz. ${hedefFr.ad} yeni lideri: "${yeniLiderAd}".`);
    if (krizMesaj) logYaz(`💥 ${krizMesaj}`);
    sesCal("suikast");
    showToast(toastMesaj, "basari", 5200);
    operasyonKaynakIade(kaynak);
    return {
      basarili: true,
      mesaj: `${liderAd} etkisiz. ${hedefFr.ad} yeni lider: ${yeniLiderAd}.${krizMesaj ? ` ${krizMesaj}` : ""}`,
    };
  } else {
    // Başarısız: hedef öfkeli, saldırma ihtimali artar
    hedefFr._ofke = (hedefFr._ofke || 0) + 20;
    diplomasiSuikastSonucu("biz", hedef.owner, false);
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
