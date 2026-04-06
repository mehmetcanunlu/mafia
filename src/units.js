// units.js — Birim Tipleri ve Eğitim Sistemi (Türk Mafya Bağlamı)

import { oyun } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";

/**
 * Mafya bağlamında birim tipleri.
 * saldiri/savunma = savaş çarpanı (1.0 = standart tetikçi)
 */
export const BIRIM_TIPLERI = {
  tetikci: {
    ad: "Tetikçi",
    ikon: "🔫",
    aciklama: "Temel çete üyesi. Zamanla Uzman seviyesine terfi eder.",
    maliyet: 70,
    bakim: 0.1,
    saldiri: 1.0,
    savunma: 1.0,
    hizCarpani: 1,
    terfiTur: 14,
    terfiTip: "uzman",
    satinAlinabilir: true,
  },
  genc: {
    ad: "Genç",
    ikon: "🧒",
    aciklama: "Ham eleman. Önce Tetikçiye, sonra üst sınıflara yükselir.",
    maliyet: 35,
    bakim: 0.05,
    saldiri: 0.4,
    savunma: 0.5,
    hizCarpani: 1,
    egitimTur: 8,
    donusumTip: "tetikci",
    satinAlinabilir: true,
  },
  uzman: {
    ad: "Uzman",
    ikon: "🎯",
    aciklama: "Tecrübeli tetikçi. Ağır Silahlı seviyesine terfi eder.",
    maliyet: 0,
    bakim: 0.14,
    saldiri: 1.35,
    savunma: 1.1,
    hizCarpani: 1,
    terfiTur: 18,
    terfiTip: "agir_silahli",
    satinAlinabilir: false,
  },
  agir_silahli: {
    ad: "Ağır Silahlı",
    ikon: "💪",
    aciklama: "Hiyerarşinin son seviyesi. Doğrudan satın alınamaz.",
    maliyet: 0,
    bakim: 0.2,
    saldiri: 1.9,
    savunma: 1.3,
    hizCarpani: 1,
    satinAlinabilir: false,
  },
};

/**
 * Lojistik taşıt tipleri.
 * Bir yerden diğerine birlik taşımak için kapasite gerekir.
 */
export const TASIT_TIPLERI = {
  motor: {
    ad: "Motor",
    ikon: "🏍️",
    maliyet: 120,
    bakim: 0.08,
    kapasite: 2,
  },
  araba: {
    ad: "Araba",
    ikon: "🚗",
    maliyet: 220,
    bakim: 0.14,
    kapasite: 4,
  },
};

export function tasitKapasitesi(tasit) {
  if (!tasit) return 0;
  return (tasit.araba || 0) * TASIT_TIPLERI.araba.kapasite +
    (tasit.motor || 0) * TASIT_TIPLERI.motor.kapasite;
}

/**
 * Belirli kişi sayısını taşımak için uygun araç kombinasyonu bulur.
 * En az araç adedi ile, eşitlikte en az kapasite taşması seçilir.
 */
export function tasitKombinasyonuBul(kisi, arabaVar, motorVar) {
  let enIyi = null;
  for (let araba = 0; araba <= Math.max(0, arabaVar); araba++) {
    for (let motor = 0; motor <= Math.max(0, motorVar); motor++) {
      const kapasite = araba * TASIT_TIPLERI.araba.kapasite + motor * TASIT_TIPLERI.motor.kapasite;
      if (kapasite < kisi) continue;
      const aracAdedi = araba + motor;
      const tasma = kapasite - kisi;
      if (!enIyi) {
        enIyi = { araba, motor, kapasite, aracAdedi, tasma };
        continue;
      }
      if (aracAdedi < enIyi.aracAdedi) {
        enIyi = { araba, motor, kapasite, aracAdedi, tasma };
        continue;
      }
      if (aracAdedi === enIyi.aracAdedi && tasma < enIyi.tasma) {
        enIyi = { araba, motor, kapasite, aracAdedi, tasma };
      }
    }
  }
  return enIyi ? { araba: enIyi.araba, motor: enIyi.motor, kapasite: enIyi.kapasite } : null;
}

/** Birimin etkin saldırı gücünü döndürür */
export function birimEfektifSaldiri(birim) {
  const tipBilgi = BIRIM_TIPLERI[birim.tip] || BIRIM_TIPLERI.tetikci;
  return birim.adet * tipBilgi.saldiri;
}

/** Birimin etkin savunma gücünü döndürür */
export function birimEfektifSavunma(birim) {
  const tipBilgi = BIRIM_TIPLERI[birim.tip] || BIRIM_TIPLERI.tetikci;
  return birim.adet * tipBilgi.savunma;
}

/** Birim grubunun toplam efektif saldırı gücü */
export function grupEfektifSaldiri(birimGrubu) {
  return birimGrubu.reduce((t, b) => t + birimEfektifSaldiri(b), 0);
}

/** Birim grubunun toplam efektif savunma gücü */
export function grupEfektifSavunma(birimGrubu) {
  return birimGrubu.reduce((t, b) => t + birimEfektifSavunma(b), 0);
}

/**
 * Eğitim ticki — her tur çağrılır.
 * Gençlerin egitimKalan sayacını düşürür.
 * Sayaçlar sıfıra inince bir üst hiyerarşi tipine dönüştürür.
 */
export function egitimTick() {
  const gencIlerlemeTuru = oyun.tur % 2 === 0; // Genç eğitimi her 2 turda 1 ilerler
  const terfiIlerlemeTuru = oyun.tur % 3 === 0; // Terfi süreci her 3 turda 1 ilerler

  function hedefYiginaBirEkle(kaynak, yeniTip) {
    const hedef = oyun.birimler.find(
      (k) =>
        k.owner === kaynak.owner &&
        k.konumId === kaynak.konumId &&
        k.tip === yeniTip &&
        (!k.rota || k.rota.length === 0) &&
        !k.hedefId
    );
    if (hedef) {
      hedef.adet += 1;
      if (yeniTip === "genc") {
        if (hedef.egitimKalan === undefined) hedef.egitimKalan = BIRIM_TIPLERI.genc.egitimTur || 8;
        delete hedef.terfiKalan;
      } else {
        delete hedef.egitimKalan;
        if (BIRIM_TIPLERI[yeniTip]?.terfiTip && hedef.terfiKalan === undefined) {
          hedef.terfiKalan = BIRIM_TIPLERI[yeniTip].terfiTur || 0;
        }
      }
      return;
    }

    const yeni = {
      id: `k${++oyun.birimSayac}`,
      owner: kaynak.owner,
      adet: 1,
      tip: yeniTip,
      konumId: kaynak.konumId,
      hedefId: null,
      rota: [],
      durum: "bekle",
    };
    if (yeniTip === "genc") {
      yeni.egitimKalan = BIRIM_TIPLERI.genc.egitimTur || 8;
    } else if (BIRIM_TIPLERI[yeniTip]?.terfiTip) {
      yeni.terfiKalan = BIRIM_TIPLERI[yeniTip].terfiTur || 0;
    }
    oyun.birimler.push(yeni);
  }

  oyun.birimler.forEach((b) => {
    if (b.tip === "genc" && b.egitimKalan !== undefined) {
      if (!gencIlerlemeTuru) return;
      b.egitimKalan--;
      if (b.egitimKalan <= 0) {
        hedefYiginaBirEkle(b, "tetikci");
        b.adet -= 1;
        if (b.adet > 0) b.egitimKalan = BIRIM_TIPLERI.genc.egitimTur || 8;
        else b._sil = true;
        if (b.owner === "biz") {
          logYaz(`🔫 1x Genç eğitimini tamamladı → Tetikçi!`);
          showToast(`🔫 1x Tetikçi hazır!`, "basari", 2200);
        }
      }
      return;
    }

    const tipBilgi = BIRIM_TIPLERI[b.tip];
    if (!tipBilgi?.terfiTip || b.terfiKalan === undefined) return;
    if (!terfiIlerlemeTuru) return;
    b.terfiKalan--;
    if (b.terfiKalan > 0) return;

    hedefYiginaBirEkle(b, tipBilgi.terfiTip);
    b.adet -= 1;
    if (b.adet > 0) b.terfiKalan = tipBilgi.terfiTur || 0;
    else b._sil = true;

    const yeniTip = BIRIM_TIPLERI[tipBilgi.terfiTip];

    if (b.owner === "biz") {
      logYaz(`${yeniTip?.ikon || "⬆️"} 1x birlik terfi etti → ${yeniTip?.ad || tipBilgi.terfiTip}!`);
      showToast(`${yeniTip?.ikon || "⬆️"} 1x ${yeniTip?.ad || tipBilgi.terfiTip} oldu!`, "basari", 2200);
    }
  });

  oyun.birimler = oyun.birimler.filter((b) => !b._sil && b.adet > 0);
}

/**
 * Eski motorlu hız mekanizması geriye dönük uyumluluk için no-op.
 * Hareket artık araç kapasitesiyle yönetiliyor.
 */
export function motorluHizTick() {
  return;
}

/** Birim tipinin kısa açıklamasını döndürür */
export function tipKartHTML(tipAd) {
  const t = BIRIM_TIPLERI[tipAd];
  if (!t) return "";
  return `<span style="font-size:18px">${t.ikon}</span> <strong>${t.ad}</strong><br>
    <small style="color:#aaa">${t.aciklama}</small>`;
}

export function birimBakimGideri(birim) {
  const tipBilgi = BIRIM_TIPLERI[birim.tip] || BIRIM_TIPLERI.tetikci;
  return (birim.adet || 0) * (tipBilgi.bakim || 0.1);
}

export function ownerBakimToplami(owner) {
  const garnizonGideri = oyun.bolgeler
    .filter((b) => b.owner === owner)
    .reduce((toplam, b) => toplam + ((b.garnizon || 0) * (BIRIM_TIPLERI.tetikci.bakim || 0.1)), 0);
  const birimGideri = oyun.birimler
    .filter((b) => b.owner === owner)
    .reduce((toplam, b) => toplam + birimBakimGideri(b), 0);
  const tasitGideri = oyun.bolgeler
    .filter((b) => b.owner === owner)
    .reduce((toplam, b) => {
      const tasit = b.tasit || { motor: 0, araba: 0 };
      return toplam +
        (tasit.motor || 0) * TASIT_TIPLERI.motor.bakim +
        (tasit.araba || 0) * TASIT_TIPLERI.araba.bakim;
    }, 0);
  return garnizonGideri + birimGideri + tasitGideri;
}
