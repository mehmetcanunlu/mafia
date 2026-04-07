import { oyun, bolgeById, kullanilabilirBiz, ownerToplamPersonel, ownerPersonelTavan } from "./state.js";
import { logYaz, uiGuncel } from "./ui.js";
import { AYAR, SOHRET, BINA_TIPLERI, DIPLOMASI, MEKANIK, EKONOMI_DENGE } from "./config.js";
import { kisaRota } from "./map.js";
import { saldiriMaliyeti } from "./combat.js";
import { sohretCarpani } from "./state.js";
import { yiginaEkle } from "./state.js";
import { showAlert, showConfirm, showPrompt } from "./modal.js";
import { BIRIM_TIPLERI, TASIT_TIPLERI } from "./units.js";
import { kesifYap, suikastYap } from "./spy.js";
import { arastirmaEfekt } from "./research.js";
import { konvoyBaslaAnimasyonu } from "./animations.js";
import { ownerTasit, ownerTasitAyir, ownerTasitIade, ownerTasitKombinasyonu, ownerToplamKapasite, bolgeFetihTasitGanmetiEkle } from "./logistics.js";
import { sesCal } from "./audio.js";
import {
  barisTeklifiEt,
  savasBildir,
  ittifakTeklifiEt,
  ticaretTeklifiEt,
  sabotajTeklifiEt,
  rusvetVer,
  tehditEt,
  istihbaratPaylas,
  diplomasiSaldiriMumkunMu,
  diplomasiSaldiriYasakSebebi,
  diplomasiSaldiriBaslat,
  iliskiDurumu,
  iliskiDegeri,
  iliskiDegistir,
  oyuncuDiploAksiyonMumkunMu,
  oyuncuDiploAksiyonKullan,
  oyuncuDiploAksiyonDurumu,
  isDostCete,
  isDostIttifak,
} from "./diplomasi.js";

function liderBinaIndirimi() {
  return oyun.fraksiyon.biz?.lider?.bonus?.binaMaliyetiIndirim || 0;
}

function binaKaydiBul(bolge, tip) {
  return (bolge.binalar || []).find((bina) => bina.tip === tip);
}

function binaMaliyetiHesapla(tip, seviye) {
  const tanim = BINA_TIPLERI[tip];
  if (!tanim) return null;
  const carp = tanim.seviyeMaliyetCarpani || 1.5;
  const ham = tanim.maliyet * Math.pow(carp, Math.max(0, seviye - 1));
  const indirimli = ham * (1 - liderBinaIndirimi());
  return Math.ceil(indirimli);
}

function garnizonKapasitesi(bolge) {
  const taban = Math.max(10, Math.round((bolge.nufusMax || bolge.nufus || 60) / 8));
  const arastirma = 1 + arastirmaEfekt("garnizonBonus");
  return Math.round(taban * arastirma + (bolge.yGuv || 0) * 2);
}

function tasitPlanMetni(plan) {
  if (!plan) return "taşıt yok";
  const parcalar = [];
  if (plan.araba > 0) parcalar.push(`${plan.araba} 🚗`);
  if (plan.motor > 0) parcalar.push(`${plan.motor} 🏍️`);
  return parcalar.length ? parcalar.join(" + ") : "taşıt yok";
}

function tasitStokMetni(owner) {
  const t = ownerTasit(owner);
  return `Filo: ${t.araba} 🚗, ${t.motor} 🏍️`;
}

function ownerTasitToplamKapasite(owner) {
  const t = ownerTasit(owner);
  const arabaKap = (t.araba || 0) * (TASIT_TIPLERI.araba?.kapasite || 4);
  const motorKap = (t.motor || 0) * (TASIT_TIPLERI.motor?.kapasite || 2);
  return { arabaKap, motorKap, toplam: arabaKap + motorKap };
}

function lojistikKapasiteMetni(owner, gereken = 0) {
  const guvenliGereken = Math.max(0, Math.floor(Number(gereken) || 0));
  const kapasite = ownerTasitToplamKapasite(owner);
  const kalan = kapasite.toplam - guvenliGereken;
  return (
    `Filo kapasitesi: ${kapasite.toplam} (🚗 ${kapasite.arabaKap} + 🏍️ ${kapasite.motorKap})\n` +
    `Kullanım: ${guvenliGereken}/${kapasite.toplam} • Kalan: ${kalan >= 0 ? kalan : 0}\n` +
    `${tasitStokMetni(owner)}`
  );
}

function rotaDostTransitVarMi(owner, rota = []) {
  return (rota || []).some((id) => {
    const b = bolgeById(id);
    if (!b || b.owner === owner || b.owner === "tarafsiz") return false;
    return isDostCete(owner, b.owner);
  });
}

function rotaIlkAdiminiAyir(rota) {
  if (!Array.isArray(rota) || rota.length < 2) return null;
  return {
    konumId: rota[0],
    hedefId: rota[1],
    rota: rota.slice(2),
  };
}

function operasyonIdUret() {
  return `op_${(oyun.tur || 0)}_${Math.random().toString(36).slice(2, 8)}`;
}

function aktifKonvoylar(owner) {
  return oyun.birimler.filter(
    (k) => k.owner === owner && !k._sil && k.adet > 0 && (!k.rota || k.rota.length === 0) && !k.hedefId
  );
}

function ownerEnYakinYiginKaynak(owner, hedefId) {
  const aday = aktifKonvoylar(owner)
    .map((k) => {
      const bolge = bolgeById(k.konumId);
      const rota = bolge ? kisaRota(bolge.id, hedefId) : null;
      if (!bolge || !rota || rota.length < 2) return null;
      return { birim: k, bolge, rota, tur: rota.length - 1 };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const turFark = (a.tur || 999) - (b.tur || 999);
      if (turFark !== 0) return turFark;
      return (b.birim?.adet || 0) - (a.birim?.adet || 0);
    })[0];
  return aday || null;
}

function ownerBolgeHazirBirimleri(owner, bolgeId) {
  return oyun.birimler
    .filter((k) => k.owner === owner && k.konumId === bolgeId)
    .filter((k) => !k._sil && (k.adet || 0) > 0)
    .filter((k) => !k.hedefId && (!k.rota || k.rota.length === 0));
}

function ownerBolgeHazirToplam(owner, bolgeId) {
  return ownerBolgeHazirBirimleri(owner, bolgeId).reduce((t, k) => t + (k.adet || 0), 0);
}

function ownerSaldiriKaynakAdaylari(owner, hedefId) {
  return oyun.bolgeler
    .filter((b) => b.owner === owner)
    .map((b) => {
      const adet = ownerBolgeHazirToplam(owner, b.id);
      if (adet <= 0) return null;
      const rota = kisaRota(b.id, hedefId);
      if (!rota || rota.length < 2) return null;
      return {
        bolge: b,
        adet,
        rota,
        tur: rota.length - 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const turFark = (a.tur || 999) - (b.tur || 999);
      if (turFark !== 0) return turFark;
      return (b.adet || 0) - (a.adet || 0);
    });
}

function rotaUstundeDusmanVarMi(owner, rota = []) {
  return (rota || []).slice(1, -1).some((id) => {
    const b = bolgeById(id);
    return b && b.owner !== owner && b.owner !== "tarafsiz";
  });
}

async function saldiriKaynagiSec(owner, hedef, baslik, bosMesaj) {
  const adaylar = ownerSaldiriKaynakAdaylari(owner, hedef.id);
  if (!adaylar.length) {
    await showAlert(bosMesaj);
    return null;
  }
  if (adaylar.length === 1) return adaylar[0];

  const secenekler = adaylar
    .map((k, i) => {
      const rotaRisk = rotaUstundeDusmanVarMi(owner, k.rota) ? " ⚠" : "";
      return `${i + 1}. ${k.bolge.ad} (${k.tur} tur, ${k.adet} birlik)${rotaRisk}`;
    })
    .join("\n");
  const secim = await showPrompt(
    `Hangi bölgeden saldıracaksın?\n\n${secenekler}\n\nNumara gir:`,
    baslik,
    "1"
  );
  if (secim === null) return null;
  const idx = parseInt(secim, 10) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= adaylar.length) {
    await showAlert("Geçersiz seçim.");
    return null;
  }
  return adaylar[idx];
}

function bolgedenBirlikCek(owner, bolgeId, adet) {
  if (!Number.isFinite(adet) || adet <= 0) return null;
  const adaylar = ownerBolgeHazirBirimleri(owner, bolgeId)
    .sort((a, b) => (b.adet || 0) - (a.adet || 0));
  const toplam = adaylar.reduce((t, k) => t + (k.adet || 0), 0);
  if (toplam < adet) return null;

  const onceki = adaylar.map((k) => ({ k, adet: k.adet, sil: !!k._sil }));
  let kalan = adet;
  const tipToplam = {};
  adaylar.forEach((k) => {
    if (kalan <= 0) return;
    const al = Math.min(k.adet || 0, kalan);
    if (al <= 0) return;
    k.adet -= al;
    if (k.adet <= 0) k._sil = true;
    const tip = k.tip || "tetikci";
    tipToplam[tip] = (tipToplam[tip] || 0) + al;
    kalan -= al;
  });

  if (kalan > 0) {
    onceki.forEach((o) => {
      o.k.adet = o.adet;
      o.k._sil = o.sil;
    });
    return null;
  }

  const baskinTip = Object.entries(tipToplam).sort((a, b) => b[1] - a[1])[0]?.[0] || "tetikci";
  return { tip: baskinTip };
}

function asayisDurumu() {
  if (!oyun.asayis || typeof oyun.asayis !== "object") {
    oyun.asayis = { sucluluk: 0, polisBaski: 0, sonBaskinTur: -999 };
  }
  if (!Number.isFinite(oyun.asayis.sucluluk)) oyun.asayis.sucluluk = 0;
  if (!Number.isFinite(oyun.asayis.polisBaski)) oyun.asayis.polisBaski = 0;
  if (!Number.isFinite(oyun.asayis.sonBaskinTur)) oyun.asayis.sonBaskinTur = -999;
  return oyun.asayis;
}

function sinirla(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function suclulukEkle(miktar) {
  const a = asayisDurumu();
  a.sucluluk = sinirla(a.sucluluk + miktar, 0, 200);
  a.polisBaski = sinirla(a.polisBaski + miktar * 0.45, 0, 100);
}

function ekonomiDurumu() {
  if (!oyun.ekonomi || typeof oyun.ekonomi !== "object") {
    oyun.ekonomi = { haracSeviye: "orta", alimBuTur: 0, sonHaracGeliri: 0, personelTavanEk: 0 };
  }
  const h = oyun.ekonomi.haracSeviye;
  if (!EKONOMI_DENGE.haracSeviyeleri[h]) oyun.ekonomi.haracSeviye = "orta";
  oyun.ekonomi.alimBuTur = Math.max(0, Math.floor(Number(oyun.ekonomi.alimBuTur) || 0));
  oyun.ekonomi.sonHaracGeliri = Math.max(0, Math.round(Number(oyun.ekonomi.sonHaracGeliri) || 0));
  oyun.ekonomi.personelTavanEk = Math.max(0, Math.round(Number(oyun.ekonomi.personelTavanEk) || 0));
  return oyun.ekonomi;
}

function bizToplamPersonel() {
  return ownerToplamPersonel("biz");
}

function ownerToplamTasitKapasite(owner = "biz") {
  return ownerToplamKapasite(owner);
}

function bizOrtalamaSadakat() {
  const bolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
  if (!bolgeler.length) return 55;
  const toplam = bolgeler.reduce((t, b) => t + (Number(b.sadakat) || 55), 0);
  return toplam / bolgeler.length;
}

function birimAlimLimitleri() {
  const eco = ekonomiDurumu();
  const sahipBolgeler = oyun.bolgeler.filter((b) => b.owner === "biz");
  const ortSadakat = bizOrtalamaSadakat();
  const as = asayisDurumu();

  let turKotasi =
    EKONOMI_DENGE.alimiTurBazKota +
    Math.floor(sahipBolgeler.length * EKONOMI_DENGE.alimiTurBolgeKota) +
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
  turKotasi = Math.max(3, turKotasi);

  const toplamKapasite = ownerPersonelTavan("biz");
  const toplamPersonel = ownerToplamPersonel("biz");
  return {
    turKotasi,
    buTurAlim: eco.alimBuTur || 0,
    toplamKapasite,
    toplamPersonel,
  };
}

function alimEkMaliyetiHesapla(adet) {
  const guvenliAdet = Math.max(0, Math.floor(Number(adet) || 0));
  if (guvenliAdet <= 0) return 0;
  const eco = ekonomiDurumu();
  const harac = EKONOMI_DENGE.haracSeviyeleri[eco.haracSeviye] || EKONOMI_DENGE.haracSeviyeleri.orta;
  const haracCarpani =
    1 + Math.max(0, (harac.gelirCarpani || 1) - 1) * EKONOMI_DENGE.alimiEkMaliyetHaracCarpani;
  return Math.max(0, Math.round(guvenliAdet * EKONOMI_DENGE.alimiEkMaliyetKisiBasi * haracCarpani));
}

function alimSadakatCezasiHesapla(oncekiAlim, yeniAlim) {
  const baslangic = Math.max(0, Math.floor(Number(oncekiAlim) || 0));
  const bitis = Math.max(baslangic, Math.floor(Number(yeniAlim) || 0));
  const esik = Math.max(0, EKONOMI_DENGE.alimiSadakatEsik || 0);
  const oncekiAsim = Math.max(0, baslangic - esik);
  const yeniAsim = Math.max(0, bitis - esik);
  const etkiliAsim = yeniAsim - oncekiAsim;
  if (etkiliAsim <= 0) return 0;
  const eco = ekonomiDurumu();
  const haracCarpani =
    eco.haracSeviye === "yuksek" ? EKONOMI_DENGE.alimiSadakatYuksekHaracCarpani : 1;
  return Number((etkiliAsim * EKONOMI_DENGE.alimiSadakatCezaKisiBasi * haracCarpani).toFixed(2));
}

function alimSadakatCezasiUygula(oncekiAlim, yeniAlim) {
  const ceza = alimSadakatCezasiHesapla(oncekiAlim, yeniAlim);
  if (ceza <= 0) return 0;
  const sadakatTabani = Number(EKONOMI_DENGE.alimiSadakatTaban) || 0;
  oyun.bolgeler.forEach((bolge) => {
    if (bolge.owner !== "biz") return;
    const mevcut = Number(bolge.sadakat) || 55;
    bolge.sadakat = Math.max(sadakatTabani, Math.min(100, mevcut - ceza));
  });
  return ceza;
}

function haracSeviyeEtiketi(seviye) {
  return EKONOMI_DENGE.haracSeviyeleri[seviye]?.ad || "Orta";
}

function hedefeKomsuBizBolgesi(hedefId) {
  const komsular = oyun.komsu[hedefId] || [];
  for (const id of komsular) {
    const b = bolgeById(id);
    if (b && b.owner === "biz") return b;
  }
  return null;
}

/* === [YATIRIMLAR] === */
export async function yatirimGelir() {
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") return;
  const maliyet = 100 * (1 + b.yGel);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert("Yeterli paran yok.");
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;
  b.yGel++;
  logYaz(`${b.ad} gelir yatırımı yapıldı (+0.5x).`);
  uiGuncel(callbacklar);
}

export async function yatirimGuv() {
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") return;
  const maliyet = 80 * (1 + b.yGuv);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert("Yeterli paran yok.");
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;
  b.yGuv++;
  logYaz(`${b.ad} güvenlik seviyesi arttı (+1).`);
  uiGuncel(callbacklar);
}

export async function yatirimAdam() {
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") return;
  const maliyet = 90 * (1 + b.yAdam);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert("Yeterli paran yok.");
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;
  b.yAdam++;
  logYaz(`${b.ad} adam geliş oranı arttı (x+0.7).`);
  uiGuncel(callbacklar);
}

export async function haracSeviyesiAyarla(seviye) {
  const hedef = EKONOMI_DENGE.haracSeviyeleri[seviye];
  if (!hedef) {
    await showAlert("Geçersiz haraç seviyesi.");
    return;
  }
  const eco = ekonomiDurumu();
  if (eco.haracSeviye === seviye) return;
  eco.haracSeviye = seviye;
  logYaz(
    `💸 Haraç seviyesi ${haracSeviyeEtiketi(seviye)} oldu: gelir x${hedef.gelirCarpani.toFixed(2)}, ` +
    `sadakat ${hedef.sadakatDelta >= 0 ? "+" : ""}${hedef.sadakatDelta.toFixed(2)}/tur.`
  );
  uiGuncel(callbacklar);
}

export async function adamAlimSayacSifirla() {
  const eco = ekonomiDurumu();
  if ((eco.alimBuTur || 0) <= 0) {
    await showAlert("Bu tur için alım sayacı zaten sıfır.");
    return;
  }
  eco.alimBuTur = 0;
  logYaz("🔁 Bu tur adam alım sayacı manuel olarak sıfırlandı.");
  uiGuncel(callbacklar);
}

function profilMetniTemizle(v, max = 26) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function profilSahipGecerliMi(owner) {
  return owner === "biz" || owner === "ai1" || owner === "ai2" || owner === "ai3";
}

function liderOzelligiVarMi(lider) {
  const ozellik = String(lider?.ozellik || "").trim();
  if (!ozellik) return false;
  const norm = ozellik.toLowerCase();
  return norm !== "yok" && norm !== "-" && norm !== "none";
}

function efsaneAdlariniYenile() {
  const map = {
    biz: "efs-biz",
    ai1: "efs-ai1",
    ai2: "efs-ai2",
    ai3: "efs-ai3",
  };
  Object.entries(map).forEach(([owner, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = oyun.fraksiyon?.[owner]?.ad || owner;
  });
}

export async function profilOzellestirmeKaydet(veri = {}) {
  const ownerHam = String(veri.hedefOwner || "biz").trim();
  const owner = profilSahipGecerliMi(ownerHam) ? ownerHam : "biz";
  const fr = oyun.fraksiyon?.[owner];
  if (!fr) return;
  if (!fr.lider || typeof fr.lider !== "object") fr.lider = { ad: "Lider", lakap: "", ikon: "👤", bonus: {} };

  const onceki = {
    ceteAdi: String(fr.ad || ""),
    liderAd: String(fr.lider.ad || ""),
    liderLakap: String(fr.lider.lakap || ""),
    liderIkon: String(fr.lider.ikon || ""),
  };

  const ceteAdi = profilMetniTemizle(veri.ceteAdi, 26) || onceki.ceteAdi || owner;
  const liderAd = profilMetniTemizle(veri.liderAd, 26) || onceki.liderAd || "Lider";
  const liderLakap = profilMetniTemizle(veri.liderLakap, 36);
  const liderIkonHam = profilMetniTemizle(veri.liderIkon, 4);
  const emojiAktif = liderOzelligiVarMi(fr.lider);
  const liderIkon = emojiAktif ? (liderIkonHam || onceki.liderIkon || "👤") : "";

  const degisimVar =
    ceteAdi !== onceki.ceteAdi ||
    liderAd !== onceki.liderAd ||
    liderLakap !== onceki.liderLakap ||
    liderIkon !== onceki.liderIkon;

  if (!degisimVar) {
    await showAlert("Profilde değişiklik yok.");
    return;
  }

  fr.ad = ceteAdi;
  fr.lider.ad = liderAd;
  fr.lider.lakap = liderLakap;
  fr.lider.ikon = liderIkon;
  efsaneAdlariniYenile();

  logYaz(`👤 Profil güncellendi: ${fr.ad} (${owner}) • Lider "${fr.lider.ad}".`);
  uiGuncel(callbacklar);
}

export async function binaKur(tip) {
  const b = bolgeById(oyun.seciliId);
  const tanim = BINA_TIPLERI[tip];
  if (!b || b.owner !== "biz" || !tanim) return;

  b.binalar = b.binalar || [];
  const mevcut = binaKaydiBul(b, tip);
  if (mevcut) {
    await showAlert("Bu binadan zaten var. Yükseltme kullan.");
    return;
  }
  if (b.binalar.length >= (b.binaLimit || 2)) {
    await showAlert("Bu bölgede boş bina slotu yok.");
    return;
  }

  const maliyet = binaMaliyetiHesapla(tip, 1);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }

  const onay = await showConfirm(
    `${b.ad} bölgesine ${tanim.ikon} ${tanim.ad} kurulsun mu?\nMaliyet: ${maliyet} ₺\nEtki: ${tanim.aciklama}`,
    "Bina Kur"
  );
  if (!onay) return;

  oyun.fraksiyon.biz.para -= maliyet;
  b.binalar.push({ tip, seviye: 1 });
  logYaz(`${b.ad} bölgesine ${tanim.ikon} ${tanim.ad} kuruldu.`);
  uiGuncel(callbacklar);
}

export async function binaYukselt(tip) {
  const b = bolgeById(oyun.seciliId);
  const tanim = BINA_TIPLERI[tip];
  if (!b || b.owner !== "biz" || !tanim) return;

  const kayit = binaKaydiBul(b, tip);
  if (!kayit) {
    await showAlert("Önce bu binayı kurmalısın.");
    return;
  }
  if ((kayit.seviye || 1) >= 3) {
    await showAlert("Bu bina zaten maksimum seviyede.");
    return;
  }

  const yeniSeviye = (kayit.seviye || 1) + 1;
  const maliyet = binaMaliyetiHesapla(tip, yeniSeviye);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }

  const onay = await showConfirm(
    `${b.ad} bölgesindeki ${tanim.ikon} ${tanim.ad} bina seviyesi ${yeniSeviye} olsun mu?\nMaliyet: ${maliyet} ₺`,
    "Bina Yükselt"
  );
  if (!onay) return;

  oyun.fraksiyon.biz.para -= maliyet;
  kayit.seviye = yeniSeviye;
  logYaz(`${b.ad} bölgesindeki ${tanim.ikon} ${tanim.ad} seviye ${yeniSeviye} oldu.`);
  uiGuncel(callbacklar);
}

export async function garnizonAyarla() {
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") return;
  const kullan = kullanilabilirBiz();
  const kapasite = garnizonKapasitesi(b);
  const mevcut = ownerBolgeHazirToplam("biz", b.id);
  const v = await showPrompt(
    `Yeni garnizon sayısı?\nŞu an: ${mevcut} | Kullanılabilir: ${kullan} | Kapasite: ${kapasite}`,
    'Garnizon Ayarla'
  );
  if (v === null) return;
  const hedef = parseInt(v);
  if (isNaN(hedef) || hedef < 0) {
    await showAlert("Geçersiz sayı.");
    return;
  }
  const fark = hedef - mevcut;
  if (fark > 0 && fark > kullan) {
    await showAlert("Yeterli kullanılabilir adam yok.");
    return;
  }
  if (hedef > kapasite) {
    await showAlert(`Bu bölge için maksimum garnizon kapasitesi ${kapasite}.`);
    return;
  }

  if (fark > 0) {
    yiginaEkle(b.id, "biz", fark, "tetikci");
  } else if (fark < 0) {
    const cekim = bolgedenBirlikCek("biz", b.id, -fark);
    if (!cekim) {
      await showAlert("Bu bölgede yeterli hazır birlik yok.");
      return;
    }
  }
  logYaz(`${b.ad} garnizon ${hedef} olarak ayarlandı.`);
  uiGuncel(callbacklar);
}

/* SADECE TARAFSIZ İÇİN RÜŞVET */
export async function teslimAl() {
  const hedef = bolgeById(oyun.seciliId);
  if (!hedef || hedef.owner !== "tarafsiz") {
    await showAlert("Sadece tarafsız bölgelere rüşvet verebilirsin.");
    return;
  }

  const guv = (hedef.guv || 0) + (hedef.yGuv || 0);
  const maliyet = Math.ceil(
    (MEKANIK.bribeNeutralBase || 400) +
    guv * (MEKANIK.bribeNeutralPerGuv || 150) +
    (hedef.nufus || 0) * (MEKANIK.bribeNeutralPerNufus || 6)
  );

  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }

  const onay = await showConfirm(
    `${hedef.ad} bölgesine ${maliyet} ₺ rüşvet verip satın almak istiyor musun?`,
    'Rüşvet ile Teslim Al'
  );
  if (!onay) return;

  oyun.fraksiyon.biz.para -= maliyet;
  hedef.owner = "biz";
  const tasitGanmeti = bolgeFetihTasitGanmetiEkle(hedef, "biz");
  hedef._isyanKorumaTur = Math.max(Number(hedef._isyanKorumaTur) || 0, (oyun.tur || 0) + 10);

  const takviye = Math.max(3, Math.floor((hedef.nufus || 0) * 0.05));
  if (takviye > 0) {
    yiginaEkle(hedef.id, "biz", takviye);
    logYaz(`${hedef.ad} için otomatik savunma takviyesi: +${takviye} adam.`);
  }

  hedef.korumaTur = (oyun.tur || 0) + 1;
  ["ai1", "ai2", "ai3"].forEach((ai) => {
    if (oyun.fraksiyon?.[ai]) iliskiDegistir("biz", ai, -5, "Tarafsız bölge rüşvetle satın alındı");
  });
  logYaz(`${hedef.ad} bölgesi ${maliyet} ₺ karşılığında satın alındı.`);
  if ((tasitGanmeti.araba || 0) > 0 || (tasitGanmeti.motor || 0) > 0) {
    logYaz(`🚚 Bölge stoku ele geçirildi: +${tasitGanmeti.araba || 0} 🚗, +${tasitGanmeti.motor || 0} 🏍️`);
  }
  uiGuncel(callbacklar);
}

/* === [SALDIRI] === */
export async function saldiri() {
  const hedef = bolgeById(oyun.seciliId);
  if (!hedef || hedef.owner === "biz") return;

  if (hedef.owner === "tarafsiz") {
    await showAlert("Tarafsız bölgelere saldırı kapalı. Rüşvet kullan.");
    return;
  }
  if (!diplomasiSaldiriMumkunMu("biz", hedef.owner)) {
    await showAlert(diplomasiSaldiriYasakSebebi("biz", hedef.owner) || "Bu hedefe saldırı şu an mümkün değil.");
    return;
  }

  const kaynakSecim = await saldiriKaynagiSec(
    "biz",
    hedef,
    "Saldırı Kaynağı Seç",
    "Saldırı için kullanılabilir birlik veya ulaşım yolu yok."
  );
  if (!kaynakSecim) return;
  const kaynakBolge = kaynakSecim.bolge;
  const rota = kaynakSecim.rota;
  const turSur = kaynakSecim.tur;
  const gecisTransit = rotaDostTransitVarMi("biz", rota);

  const kaynakToplam = kaynakSecim.adet;
  if (kaynakToplam <= 0) {
    await showAlert("Saldırı için kullanılabilir adam yok.");
    return;
  }

  const girdi = await showPrompt(
    `Kaç adam göndereceksin?\nKaynak (${kaynakBolge.ad}) hazır birlik: ${kaynakToplam}\n` +
    `${lojistikKapasiteMetni(kaynakBolge)}\nHedef ${turSur} tur uzakta.`,
    'Saldırı'
  );
  if (girdi === null) return;
  const gonder = parseInt(girdi);
  if (isNaN(gonder) || gonder <= 0 || gonder > kaynakToplam) {
    await showAlert("Geçersiz sayı.");
    return;
  }
  const tasitPlan = ownerTasitKombinasyonu("biz", gonder);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${gonder}\n${lojistikKapasiteMetni(kaynakBolge, gonder)}`
    );
    return;
  }

  const guvTop = hedef.guv + hedef.yGuv;
  const maliyet = saldiriMaliyeti(
    {
      taban: AYAR.saldiriTaban,
      guvenlikCarpani: AYAR.saldiriGuvenlikCarpani,
      adamCarpani: AYAR.saldiriAdamCarpani,
    },
    guvTop,
    gonder
  );
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }

  const onay = await showConfirm(
    `${hedef.ad} bölgesine ${gonder} adamla sefer düzenle.\nMaliyet: ${maliyet} ₺\n` +
    `Taşıt: ${tasitPlanMetni(tasitPlan)}\n${lojistikKapasiteMetni(kaynakBolge, gonder)}\n` +
    `Tahmini varış: ${turSur} tur sonra.\nDevam?`,
    'Saldırıyı Onayla'
  );
  if (!onay) return;
  const ayrilanTasit = ownerTasitAyir("biz", gonder);
  if (!ayrilanTasit) {
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni("biz")}`);
    return;
  }
  const cekim = bolgedenBirlikCek("biz", kaynakBolge.id, gonder);
  if (!cekim) {
    ownerTasitIade("biz", ayrilanTasit.araba || 0, ayrilanTasit.motor || 0);
    await showAlert("Kaynak birlik miktarı değişti. Tekrar dene.");
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;

  const birim = {
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet: gonder,
    tip: cekim.tip || "tetikci",
    konumId: rota[0],
    hedefId: rota[1] || rota[0],
    _hazir: false,
    durum: "hareket",
    rota: rota.slice(2),
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
    gecisHakki: gecisTransit,
    operasyonId: null,
    bekliyor: false,
  };
  oyun.birimler.push(birim);
  konvoyBaslaAnimasyonu(rota[0]);
  diplomasiSaldiriBaslat("biz", hedef.owner, "Doğrudan saldırı");

  logYaz(`${hedef.ad} hedefine ${gonder} asker yola çıktı (${tasitPlanMetni(ayrilanTasit)}).`);
  uiGuncel(callbacklar);
}

/* === [DURAKLAT] === */
export function duraklatDevam() {
  oyun.duraklat = !oyun.duraklat;
  uiGuncel(callbacklar);
}
export function hizAyarla(k) {
  oyun.hizKatsayi = Number(k);
  logYaz(
    `Oyun hızı ${oyun.hizKatsayi.toFixed(2)}× (Seviye ${(() => {
      if (k <= 0.5) return 1;
      if (k <= 0.75) return 2;
      if (k <= 1) return 3;
      if (k <= 1.5) return 4;
      return 5;
    })()})`
  );
  const arka = document.getElementById("ayar-arka");
  if (arka) arka.style.display = "none";
  uiGuncel(callbacklar);
}

function sohretMaliyeti(artis) {
  const s = Math.max(0, Math.min(100, oyun.sohret.biz || 0));
  const infl = 1 + s * (SOHRET.buyInflationPerPoint || 0.015);
  const base = artis === 10 ? SOHRET.buy10Base || 1100 : SOHRET.buy5Base || 600;
  return Math.ceil(base * infl);
}

export async function sohretSatinAl(artis) {
  if (artis !== 5 && artis !== 10) return;
  const maliyet = sohretMaliyeti(artis);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }
  const onay = await showConfirm(
    `Şöhreti +${artis} arttır.\nMaliyet: ${maliyet} ₺`,
    'Şöhret Satın Al'
  );
  if (!onay) return;
  oyun.fraksiyon.biz.para -= maliyet;
  oyun.sohret.biz = Math.min(100, (oyun.sohret.biz || 0) + artis);
  logYaz(
    `Şöhret +${artis}. Yeni şöhret: ${oyun.sohret.biz}/100. Adam gelişim çarpanı: x${sohretCarpani("biz").toFixed(2)}`
  );
  uiGuncel(callbacklar);
}

export async function hareketEmriSaldiriBaslat() {
  const hedef = bolgeById(oyun.seciliId);
  if (!hedef || hedef.owner === "biz") {
    await showAlert("Hedef düşman bölge olmalı.");
    return;
  }
  if (hedef.owner === "tarafsiz") {
    await showAlert("Tarafsızlara saldırı kapalı.");
    return;
  }
  if (!diplomasiSaldiriMumkunMu("biz", hedef.owner)) {
    await showAlert(diplomasiSaldiriYasakSebebi("biz", hedef.owner) || "Bu hedefe saldırı şu an mümkün değil.");
    return;
  }

  const kaynakSecim = await saldiriKaynagiSec(
    "biz",
    hedef,
    "Saldırı Emri Kaynağı",
    "Saldırı emri için kullanılabilir birlik veya ulaşım yolu yok."
  );
  if (!kaynakSecim) return;

  const varsayilan = Math.min(
    kaynakSecim.adet,
    Math.max(1, Math.floor(kaynakSecim.adet * 0.5))
  );
  const girdi = await showPrompt(
    `${kaynakSecim.bolge.ad} → ${hedef.ad}\n` +
    `Kaç birlik gönderilsin?\nMevcut: ${kaynakSecim.adet}\n` +
    `${lojistikKapasiteMetni(kaynakSecim.bolge)}\nTahmini varış: ${kaynakSecim.tur} tur`,
    "Saldırı Emri",
    String(varsayilan)
  );
  if (girdi === null) return;
  const adet = parseInt(girdi, 10);
  if (!Number.isFinite(adet) || adet <= 0 || adet > kaynakSecim.adet) {
    await showAlert("Geçersiz birlik sayısı.");
    return;
  }

  oyun.hareketEmri = { owner: "biz", kaynakId: kaynakSecim.bolge.id, adet };
  await hareketEmriHedefSec(hedef.id);
}

export async function koordineliSaldiriBaslat() {
  const hedef = bolgeById(oyun.seciliId);
  if (!hedef || hedef.owner === "biz" || hedef.owner === "tarafsiz") {
    await showAlert("Koordineli saldırı için düşman bir bölge seçmelisin.");
    return;
  }
  if (!diplomasiSaldiriMumkunMu("biz", hedef.owner)) {
    await showAlert(diplomasiSaldiriYasakSebebi("biz", hedef.owner) || "Bu hedefe saldırı şu an mümkün değil.");
    return;
  }

  const bizimKaynak = ownerEnYakinYiginKaynak("biz", hedef.id);
  if (!bizimKaynak?.bolge || !bizimKaynak?.birim) {
    await showAlert("Koordineli saldırı için ulaşılabilir bir rotada hazır bir birliğin olmalı.");
    return;
  }

  const ittifakAdaylari = ["ai1", "ai2", "ai3"]
    .filter((owner) => isDostIttifak("biz", owner))
    .filter((owner) => diplomasiSaldiriMumkunMu(owner, hedef.owner))
    .map((owner) => ({
      owner,
      iliski: iliskiDegeri("biz", owner),
      kaynak: ownerEnYakinYiginKaynak(owner, hedef.id),
    }))
    .filter((x) => x.kaynak?.birim && x.kaynak?.bolge)
    .sort((a, b) => b.iliski - a.iliski);

  if (!ittifakAdaylari.length) {
    await showAlert("Ulaşılabilir rotada ve ittifak durumunda bir müttefik hazır değil.");
    return;
  }
  const secilenIttifak = ittifakAdaylari[0];
  const ittifakAd = oyun.fraksiyon?.[secilenIttifak.owner]?.ad || secilenIttifak.owner;

  const maxBiz = bizimKaynak.birim.adet || 0;
  if (maxBiz <= 0) {
    await showAlert("Gönderilecek birlik yok.");
    return;
  }
  const bizRota = bizimKaynak.rota || kisaRota(bizimKaynak.bolge.id, hedef.id);
  const bizRotaPlan = rotaIlkAdiminiAyir(bizRota);
  if (!bizRotaPlan) {
    await showAlert("Bizim kaynak için geçerli rota bulunamadı.");
    return;
  }
  const bizGecisTransit = rotaDostTransitVarMi("biz", bizRota);

  const girdi = await showPrompt(
    `Koordineli saldırı: ${hedef.ad}\nMüttefik: ${ittifakAd}\nKaynak: ${bizimKaynak.bolge.ad}\n` +
    `${lojistikKapasiteMetni(bizimKaynak.bolge)}\nKaç asker göndereceksin? (max ${maxBiz})`,
    "Koordineli Saldırı"
  );
  if (girdi === null) return;
  const bizAdet = parseInt(girdi, 10);
  if (!Number.isFinite(bizAdet) || bizAdet <= 0 || bizAdet > maxBiz) {
    await showAlert("Geçersiz asker sayısı.");
    return;
  }

  const bizPlan = ownerTasitKombinasyonu("biz", bizAdet);
  if (!bizPlan) {
    await showAlert(`Bizim birlik için taşıt yetersiz.\n${lojistikKapasiteMetni(bizimKaynak.bolge, bizAdet)}`);
    return;
  }

  const ittifakKaynakBirim = secilenIttifak.kaynak.birim;
  const ittifakAdet = Math.max(1, Math.min(ittifakKaynakBirim.adet || 0, Math.round((ittifakKaynakBirim.adet || 0) * 0.6)));
  if (ittifakAdet <= 0) {
    await showAlert(`${ittifakAd} bu operasyona uygun birlik ayıramıyor.`);
    return;
  }
  const ittifakRota =
    secilenIttifak.kaynak.rota || kisaRota(secilenIttifak.kaynak.bolge.id, hedef.id);
  const ittifakRotaPlan = rotaIlkAdiminiAyir(ittifakRota);
  if (!ittifakRotaPlan) {
    await showAlert(`${ittifakAd} kaynak konumu için geçerli rota bulunamadı.`);
    return;
  }
  const ittifakGecisTransit = rotaDostTransitVarMi(secilenIttifak.owner, ittifakRota);

  const kabulSans = Math.max(0.35, Math.min(0.92, 0.58 + (secilenIttifak.iliski / 220)));
  if (Math.random() > kabulSans) {
    await showAlert(`${ittifakAd} koordineli saldırı teklifini reddetti.`);
    return;
  }

  const ittifakPlan = ownerTasitKombinasyonu(secilenIttifak.owner, ittifakAdet);
  if (!ittifakPlan) {
    await showAlert(`${ittifakAd} için taşıt yetersiz. Operasyon başlatılamadı.`);
    return;
  }

  const onay = await showConfirm(
    `${hedef.ad} için koordineli saldırı başlatılsın mı?\n` +
    `Biz: ${bizAdet} kişi (${tasitPlanMetni(bizPlan)}, ~${bizRota.length - 1} tur)\n` +
    `${lojistikKapasiteMetni(bizimKaynak.bolge, bizAdet)}\n` +
    `${ittifakAd}: ${ittifakAdet} kişi (${tasitPlanMetni(ittifakPlan)}, ~${ittifakRota.length - 1} tur)`,
    "Koordineli Saldırı Onayı"
  );
  if (!onay) return;

  if ((bizimKaynak.birim.adet || 0) < bizAdet) {
    await showAlert("Bizim kaynak birlik değişti. Tekrar dene.");
    return;
  }
  bizimKaynak.birim.adet -= bizAdet;
  if (bizimKaynak.birim.adet <= 0) bizimKaynak.birim._sil = true;
  const bizAyrilanTasit = ownerTasitAyir("biz", bizAdet);
  if (!bizAyrilanTasit) {
    bizimKaynak.birim.adet += bizAdet;
    bizimKaynak.birim._sil = false;
    await showAlert(`Bizim taşıt stoğu değişti. ${tasitStokMetni(bizimKaynak.bolge)}`);
    return;
  }

  if ((ittifakKaynakBirim.adet || 0) < ittifakAdet) {
    ownerTasitIade("biz", bizAyrilanTasit.araba || 0, bizAyrilanTasit.motor || 0);
    bizimKaynak.birim.adet += bizAdet;
    bizimKaynak.birim._sil = false;
    await showAlert(`${ittifakAd} birlik miktarı değişti. Operasyon iptal edildi.`);
    return;
  }
  const ittifakAyrilanTasit = ownerTasitAyir(secilenIttifak.owner, ittifakAdet);
  if (!ittifakAyrilanTasit) {
    ownerTasitIade("biz", bizAyrilanTasit.araba || 0, bizAyrilanTasit.motor || 0);
    bizimKaynak.birim.adet += bizAdet;
    bizimKaynak.birim._sil = false;
    await showAlert(`${ittifakAd} taşıt ayıramadı. Operasyon iptal edildi.`);
    return;
  }
  ittifakKaynakBirim.adet -= ittifakAdet;
  if (ittifakKaynakBirim.adet <= 0) ittifakKaynakBirim._sil = true;

  const opId = operasyonIdUret();
  const bizKonvoyId = `k${++oyun.birimSayac}`;
  const ittifakKonvoyId = `k${++oyun.birimSayac}`;

  oyun.birimler.push({
    id: bizKonvoyId,
    owner: "biz",
    adet: bizAdet,
    tip: bizimKaynak.birim.tip || "tetikci",
    konumId: bizRotaPlan.konumId,
    hedefId: bizRotaPlan.hedefId,
    rota: bizRotaPlan.rota.slice(),
    _hazir: false,
    durum: "bekliyor-op",
    tasitAraba: bizAyrilanTasit.araba || 0,
    tasitMotor: bizAyrilanTasit.motor || 0,
    gecisHakki: bizGecisTransit,
    operasyonId: opId,
    bekliyor: true,
  });

  oyun.birimler.push({
    id: ittifakKonvoyId,
    owner: secilenIttifak.owner,
    adet: ittifakAdet,
    konumId: ittifakRotaPlan.konumId,
    hedefId: ittifakRotaPlan.hedefId,
    rota: ittifakRotaPlan.rota.slice(),
    _hazir: false,
    durum: "bekliyor-op",
    tasitAraba: ittifakAyrilanTasit.araba || 0,
    tasitMotor: ittifakAyrilanTasit.motor || 0,
    gecisHakki: ittifakGecisTransit,
    operasyonId: opId,
    bekliyor: true,
  });

  oyun.operasyonlar.push({
    id: opId,
    tip: "koordineli_saldiri",
    hedefId: hedef.id,
    baslatanOwner: "biz",
    katilimcilar: [
      { owner: "biz", hazir: false, konvoyIdler: [bizKonvoyId] },
      { owner: secilenIttifak.owner, hazir: false, konvoyIdler: [ittifakKonvoyId] },
    ],
    durum: "hazirlik",
    yaratildisTur: oyun.tur || 0,
    zaman_asimi: 8,
  });

  diplomasiSaldiriBaslat("biz", hedef.owner, "Koordineli saldırı");
  diplomasiSaldiriBaslat(secilenIttifak.owner, hedef.owner, "Koordineli saldırı");
  logYaz(`⚔ Koordineli saldırı başlatıldı: ${bizimKaynak.bolge.ad} + ${secilenIttifak.kaynak.bolge.ad} → ${hedef.ad}`);
  uiGuncel(callbacklar);
}

export async function hareketEmriBaslat() {
  const secili = bolgeById(oyun.seciliId);
  if (!secili || secili.owner !== "biz") {
    await showAlert("Kendi kontrolündeki bir bölgeyi seçmelisin.");
    return;
  }
  const mevcut = ownerBolgeHazirToplam("biz", secili.id);
  if (mevcut <= 0) {
    await showAlert("Bu bölgede gönderilecek adam yok.");
    return;
  }

  const girdi = await showPrompt(
    `Kaç adam göndereceksin?\nMevcut: ${mevcut}\n${lojistikKapasiteMetni(secili)}`,
    'Hareket Emri'
  );
  if (girdi === null) return;
  const adet = parseInt(girdi, 10);
  if (isNaN(adet) || adet <= 0 || adet > mevcut) {
    await showAlert("Geçersiz sayı.");
    return;
  }

  oyun.hareketEmri = { owner: "biz", kaynakId: secili.id, adet };
  logYaz(`${secili.ad} → (hedef seç) [${adet}]`);
  uiGuncel(callbacklar);
}

function bizToplantiNoktasiGetir() {
  if (!oyun.toplantiNoktasi || typeof oyun.toplantiNoktasi !== "object") {
    oyun.toplantiNoktasi = { biz: null, ai1: null, ai2: null, ai3: null };
  }
  const hedefId = oyun.toplantiNoktasi.biz;
  if (hedefId === null || hedefId === undefined) return null;
  const hedef = bolgeById(hedefId);
  if (!hedef || hedef.owner !== "biz") {
    oyun.toplantiNoktasi.biz = null;
    return null;
  }
  return hedef;
}

export async function toplantiNoktasiYap() {
  const secili = bolgeById(oyun.seciliId);
  if (!secili || secili.owner !== "biz") {
    await showAlert("Toplantı noktası için kendi bölgeni seçmelisin.");
    return;
  }
  if (!oyun.toplantiNoktasi || typeof oyun.toplantiNoktasi !== "object") {
    oyun.toplantiNoktasi = { biz: null, ai1: null, ai2: null, ai3: null };
  }
  if (oyun.toplantiNoktasi.biz === secili.id) {
    await showAlert(`${secili.ad} zaten toplantı noktası.`);
    return;
  }
  oyun.toplantiNoktasi.biz = secili.id;
  logYaz(`📍 Toplantı noktası ayarlandı: ${secili.ad}`);
  uiGuncel(callbacklar);
}

export async function toplantiNoktasinaCagir() {
  const hedef = bizToplantiNoktasiGetir();
  if (!hedef) {
    await showAlert("Önce bir toplantı noktası belirlemelisin.");
    return;
  }

  const kaynaklar = [];
  const rotaYok = [];
  oyun.bolgeler
    .filter((b) => b.owner === "biz" && b.id !== hedef.id)
    .forEach((b) => {
      const adet = ownerBolgeHazirToplam("biz", b.id);
      if (adet <= 0) return;
      const rota = kisaRota(b.id, hedef.id);
      if (!Array.isArray(rota) || rota.length < 2) {
        rotaYok.push(b.ad);
        return;
      }
      const rotaPlan = rotaIlkAdiminiAyir(rota);
      if (!rotaPlan) {
        rotaYok.push(b.ad);
        return;
      }
      kaynaklar.push({
        bolge: b,
        adet,
        rota,
        rotaPlan,
        gecisTransit: rotaDostTransitVarMi("biz", rota),
      });
    });

  if (!kaynaklar.length) {
    await showAlert(rotaYok.length ? "Toplantı noktasına çağrı için geçerli rota yok." : "Çağırılacak hazır birlik yok.");
    return;
  }

  const toplamAdet = kaynaklar.reduce((t, k) => t + (k.adet || 0), 0);
  if (ownerToplamKapasite("biz") < toplamAdet) {
    await showAlert(
      `Tüm birlikleri çağırmak için lojistik yetersiz.\nGerekli kapasite: ${toplamAdet}\n${lojistikKapasiteMetni("biz", toplamAdet)}`
    );
    return;
  }

  const ayrilanTasitlar = [];
  for (const kaynak of kaynaklar) {
    const plan = ownerTasitAyir("biz", kaynak.adet);
    if (!plan) {
      ayrilanTasitlar.forEach((t) => ownerTasitIade("biz", t.araba || 0, t.motor || 0));
      await showAlert(
        `Tüm kaynakları aynı anda taşımak için lojistik yetersiz.\n${lojistikKapasiteMetni("biz", toplamAdet)}`
      );
      return;
    }
    kaynak.tasitPlan = plan;
    ayrilanTasitlar.push(plan);
  }

  const cekimler = [];
  for (const kaynak of kaynaklar) {
    const cekim = bolgedenBirlikCek("biz", kaynak.bolge.id, kaynak.adet);
    if (!cekim) {
      cekimler.forEach((c) => {
        yiginaEkle(c.bolgeId, "biz", c.adet, c.tip || "tetikci", { tavanUygula: false });
      });
      ayrilanTasitlar.forEach((t) => ownerTasitIade("biz", t.araba || 0, t.motor || 0));
      await showAlert("Çağrı hazırlanırken birlik sayıları değişti. Tekrar dene.");
      return;
    }
    kaynak.tip = cekim.tip || "tetikci";
    cekimler.push({ bolgeId: kaynak.bolge.id, adet: kaynak.adet, tip: kaynak.tip });
  }

  kaynaklar.forEach((kaynak) => {
    oyun.birimler.push({
      id: `k${++oyun.birimSayac}`,
      owner: "biz",
      adet: kaynak.adet,
      tip: kaynak.tip || "tetikci",
      konumId: kaynak.rotaPlan.konumId,
      hedefId: kaynak.rotaPlan.hedefId,
      rota: kaynak.rotaPlan.rota.slice(),
      _hazir: false,
      durum: "hareket",
      tasitAraba: kaynak.tasitPlan.araba || 0,
      tasitMotor: kaynak.tasitPlan.motor || 0,
      gecisHakki: kaynak.gecisTransit,
      operasyonId: null,
      bekliyor: false,
    });
    konvoyBaslaAnimasyonu(kaynak.bolge.id);
  });

  const rotaYokEk = rotaYok.length ? ` Rota yok: ${rotaYok.join(", ")}.` : "";
  logYaz(
    `📣 Toplantı noktasına çağrı: ${kaynaklar.length} bölgeden ${toplamAdet} birlik ${hedef.ad} hedefine yola çıktı.${rotaYokEk}`
  );
  uiGuncel(callbacklar);
}

export async function toplantiNoktasinaGonder() {
  await toplantiNoktasinaCagir();
}

export async function hizliTransferSeciliBolgeden(hedefId) {
  const kaynak = bolgeById(oyun.seciliId);
  const hedef = bolgeById(hedefId);
  if (!kaynak || !hedef || kaynak.id === hedef.id) return;
  if (kaynak.owner !== "biz" || hedef.owner !== "biz") return;

  const mevcut = ownerBolgeHazirToplam("biz", kaynak.id);
  if (mevcut <= 0) {
    await showAlert("Kaynak bölgede gönderilecek hazır birlik yok.");
    return;
  }

  const varsayilan = Math.min(mevcut, Math.max(1, Math.floor(mevcut * 0.5)));
  const girdi = await showPrompt(
    `${kaynak.ad} → ${hedef.ad}\nKaç birlik gönderilsin?\nMevcut: ${mevcut}\n${lojistikKapasiteMetni(kaynak)}`,
    "Hızlı Transfer",
    String(varsayilan)
  );
  if (girdi === null) return;

  const adet = parseInt(girdi, 10);
  if (!Number.isFinite(adet) || adet <= 0 || adet > mevcut) {
    await showAlert("Geçersiz birlik sayısı.");
    return;
  }

  oyun.hareketEmri = { owner: "biz", kaynakId: kaynak.id, adet };
  await hareketEmriHedefSec(hedef.id);
}

export async function hareketEmriHedefSec(hedefId) {
  const emir = oyun.hareketEmri;
  if (!emir) {
    await showAlert("Önce 'Hareket Emri' başlat.");
    return;
  }

  const kaynak = bolgeById(emir.kaynakId);
  const hedef = bolgeById(hedefId);
  if (!kaynak || !hedef || kaynak.id === hedef.id) {
    await showAlert("Geçersiz hedef.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  if (hedef.owner === "tarafsiz") {
    await showAlert("Tarafsız bölgelere asker gönderemezsin!");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }
  if (hedef.owner !== "biz" && !diplomasiSaldiriMumkunMu("biz", hedef.owner)) {
    await showAlert(diplomasiSaldiriYasakSebebi("biz", hedef.owner) || "Bu hedefe saldırı şu an mümkün değil.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  const rota = kisaRota(kaynak.id, hedef.id);
  if (!rota || rota.length < 2) {
    await showAlert("Bu hedefe ulaşan bir rota bulunamadı.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }
  const rotaPlan = rotaIlkAdiminiAyir(rota);
  if (!rotaPlan) {
    await showAlert("Hedefe geçerli rota bulunamadı.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }
  const gecisTransit = rotaDostTransitVarMi("biz", rota);

  const tasitPlan = ownerTasitKombinasyonu("biz", emir.adet);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${emir.adet}\n${lojistikKapasiteMetni(kaynak, emir.adet)}`
    );
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  const cekim = bolgedenBirlikCek("biz", kaynak.id, emir.adet);
  if (!cekim) {
    await showAlert("Bu bölgede yeterli asker yok.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }
  const ayrilanTasit = ownerTasitAyir("biz", emir.adet);
  if (!ayrilanTasit) {
    yiginaEkle(kaynak.id, "biz", emir.adet, cekim.tip || "tetikci", { tavanUygula: false });
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni("biz")}`);
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet: emir.adet,
    tip: cekim.tip || "tetikci",
    konumId: rotaPlan.konumId,
    hedefId: rotaPlan.hedefId,
    rota: rotaPlan.rota.slice(),
    _hazir: false,
    durum: "hareket",
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
    gecisHakki: gecisTransit,
    operasyonId: null,
    bekliyor: false,
  });
  konvoyBaslaAnimasyonu(kaynak.id);
  if (hedef.owner !== "biz") {
    diplomasiSaldiriBaslat("biz", hedef.owner, "Hareket emri saldırısı");
  }

  oyun.hareketEmri = null;
  const turSur = rota.length - 1;
  logYaz(
    `${kaynak.ad} → ${hedef.ad} (${emir.adet}) yola çıktı (${tasitPlanMetni(ayrilanTasit)}, varış ~${turSur} tur).`
  );
  uiGuncel(callbacklar);
}

// HIZLI SALDIRI (kaynak yığınından al)
export async function saldiriHizliAcil(hedefId) {
  const hedef = bolgeById(hedefId);
  if (!hedef || (hedef.owner !== "ai1" && hedef.owner !== "ai2" && hedef.owner !== "ai3")) {
    await showAlert("Geçersiz hedef.");
    return;
  }
  if (!diplomasiSaldiriMumkunMu("biz", hedef.owner)) {
    await showAlert(diplomasiSaldiriYasakSebebi("biz", hedef.owner) || "Bu hedefe saldırı şu an mümkün değil.");
    return;
  }

  const kaynaklar = oyun.bolgeler
    .filter((b) => b.owner === "biz")
    .map((b) => ({ b, adet: ownerBolgeHazirToplam("biz", b.id), rota: kisaRota(b.id, hedef.id) }))
    .filter((x) => x.adet > 0 && x.rota && x.rota.length >= 2);
  kaynaklar.sort((a, b) => {
    const rotaFark = (a.rota?.length || 999) - (b.rota?.length || 999);
    if (rotaFark !== 0) return rotaFark;
    return (b.adet || 0) - (a.adet || 0);
  });
  const kay = kaynaklar[0];
  if (!kay) {
    await showAlert("Bu hedefe saldırabilecek uygun kaynak bölge yok.");
    return;
  }

  const adetStr = await showPrompt(
    `Kaynak: ${kay.b.ad} (ID:${kay.b.id})\nKaç adam?\nMevcut: ${kay.adet}\n${lojistikKapasiteMetni(kay.b)}`,
    'Hızlı Saldırı — Birlik Sayısı'
  );
  if (adetStr === null) return;
  const adet = parseInt(adetStr, 10);
  if (isNaN(adet) || adet <= 0 || adet > kay.adet) {
    await showAlert("Geçersiz sayı.");
    return;
  }

  const rota = kay.rota || kisaRota(kay.b.id, hedef.id);
  if (!rota || rota.length < 2) {
    await showAlert("Rota bulunamadı.");
    return;
  }
  const rotaPlan = rotaIlkAdiminiAyir(rota);
  if (!rotaPlan) {
    await showAlert("Geçerli rota bulunamadı.");
    return;
  }
  const gecisTransit = rotaDostTransitVarMi("biz", rota);
  const tasitPlan = ownerTasitKombinasyonu("biz", adet);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${adet}\n${lojistikKapasiteMetni(kay.b, adet)}`
    );
    return;
  }
  const guvTop = hedef.guv + hedef.yGuv;
  const maliyet = saldiriMaliyeti(AYAR, guvTop, adet);
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }
  const onay = await showConfirm(
    `${kay.b.ad} → ${hedef.ad} saldırısı\nBirlik: ${adet} | Maliyet: ${maliyet} ₺\n${lojistikKapasiteMetni(kay.b, adet)}`,
    'Hızlı Saldırıyı Onayla'
  );
  if (!onay) return;

  const ayrilanTasit = ownerTasitAyir("biz", adet);
  if (!ayrilanTasit) {
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni(kay.b)}`);
    return;
  }
  const cekim = bolgedenBirlikCek("biz", kay.b.id, adet);
  if (!cekim) {
    ownerTasitIade("biz", ayrilanTasit.araba || 0, ayrilanTasit.motor || 0);
    await showAlert("Kaynak yığın değişti.");
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;

  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet,
    tip: cekim.tip || "tetikci",
    konumId: rotaPlan.konumId,
    hedefId: rotaPlan.hedefId,
    rota: rotaPlan.rota.slice(),
    durum: "hedefe-gidiyor",
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
    gecisHakki: gecisTransit,
    operasyonId: null,
    bekliyor: false,
  });
  konvoyBaslaAnimasyonu(kay.b.id);
  diplomasiSaldiriBaslat("biz", hedef.owner, "Hızlı saldırı");
  logYaz(`${kay.b.ad} → ${hedef.ad} (${adet}) yürüyor (${tasitPlanMetni(ayrilanTasit)}).`);
  uiGuncel(callbacklar);
}

/* === [BİRİM SATIN ALMA] === */
export async function birimSatinAl(tip) {
  const bilgi = BIRIM_TIPLERI[tip];
  if (!bilgi || !bilgi.satinAlinabilir) {
    await showAlert("Bu birim tipi satın alınamaz.");
    return;
  }

  // Satın alma için bir "biz" bölgesi seçili olmalı
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") {
    await showAlert("Birim almak için kendi bölgeni seç.");
    return;
  }

  const indirim =
    tip === "tetikci" ? arastirmaEfekt("tetikciMaliyetIndirim") : 0;
  const maliyet = Math.ceil(bilgi.maliyet * (1 - indirim));
  const birKisiEkMaliyet = alimEkMaliyetiHesapla(1);
  const asgariMaliyet = maliyet + birKisiEkMaliyet;
  if (oyun.fraksiyon.biz.para < asgariMaliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${asgariMaliyet} ₺ (birim + işe alım gideri)`);
    return;
  }

  const onay = await showConfirm(
    `${b.ad} bölgesine ${bilgi.ikon} ${bilgi.ad} al.\nBirim maliyeti: ${maliyet} ₺\n` +
    `İşe alım gideri: ~${birKisiEkMaliyet} ₺ / kişi\nİpucu: Shift + Onay = 5 adet`,
    "Birim Satın Al",
    { ekButonEtiketi: "Miktar Gir", ekButonDegeri: "miktar" }
  );
  if (!onay) return;

  let adet = onay === "shift5" ? 5 : 1;
  if (onay === "miktar") {
    const miktar = await showPrompt(
      `${bilgi.ikon} ${bilgi.ad} için adet gir:`,
      "Miktar Gir",
      "1"
    );
    if (miktar === null) return;
    const parsed = Number(miktar);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      await showAlert("Geçerli bir tam sayı gir (1, 2, 3...).");
      return;
    }
    adet = parsed;
  }
  const toplamMaliyet = maliyet * adet;
  const iseAlimMaliyeti = alimEkMaliyetiHesapla(adet);
  const genelMaliyet = toplamMaliyet + iseAlimMaliyeti;
  if (oyun.fraksiyon.biz.para < genelMaliyet) {
    await showAlert(
      `Yetersiz para.\nBirim maliyeti: ${toplamMaliyet} ₺\nİşe alım gideri: ${iseAlimMaliyeti} ₺\nToplam: ${genelMaliyet} ₺`
    );
    return;
  }

  const limit = birimAlimLimitleri();
  const turKalan = Math.max(0, limit.turKotasi - limit.buTurAlim);
  const toplamKalan = Math.max(0, limit.toplamKapasite - limit.toplamPersonel);
  const alinabilir = Math.min(turKalan, toplamKalan);
  if (alinabilir <= 0) {
    await showAlert(
      `Adam alımı şu an kilitli.\nTur kotası: ${limit.buTurAlim}/${limit.turKotasi}\n` +
      `Personel tavanı: ${limit.toplamPersonel}/${limit.toplamKapasite}`
    );
    return;
  }
  if (adet > alinabilir) {
    await showAlert(
      `Bu alım için üst sınır aşılıyor.\nMaksimum alınabilir: ${alinabilir}\n` +
      `Tur kotası kalan: ${turKalan}\nPersonel tavanı kalan: ${toplamKalan}`
    );
    return;
  }

  const eco = ekonomiDurumu();
  const oncekiAlim = eco.alimBuTur || 0;
  const sonrakiAlim = oncekiAlim + adet;

  oyun.fraksiyon.biz.para -= genelMaliyet;
  eco.alimBuTur = sonrakiAlim;
  const sadakatCezasi = alimSadakatCezasiUygula(oncekiAlim, sonrakiAlim);

  // Birim oluştur
  const yeniBirim = {
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet,
    tip,
    konumId: b.id,
    hedefId: null,
    rota: [],
    durum: "bekle",
    gecisHakki: false,
    operasyonId: null,
    bekliyor: false,
  };

  // Gençler eğitim sayacıyla başlar
  if (bilgi.egitimTur) {
    yeniBirim.egitimKalan = bilgi.egitimTur;
  }
  if (bilgi.terfiTur) {
    yeniBirim.terfiKalan = bilgi.terfiTur;
  }

  oyun.birimler.push(yeniBirim);
  const sadakatMetni = sadakatCezasi > 0 ? ` | Sadakat: -${sadakatCezasi.toFixed(2)}` : "";
  logYaz(
    `${bilgi.ikon} ${bilgi.ad} x${adet} satın alındı → ${b.ad}. ` +
    `(Birim: -${toplamMaliyet}₺, İşe alım: -${iseAlimMaliyeti}₺${sadakatMetni})`
  );
  uiGuncel(callbacklar);
}

export async function tasitSatinAl(tip) {
  const bilgi = TASIT_TIPLERI[tip];
  if (!bilgi) {
    await showAlert("Geçersiz taşıt tipi.");
    return;
  }
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") {
    await showAlert("Taşıt almak için kendi bölgeni seç.");
    return;
  }
  if (oyun.fraksiyon.biz.para < bilgi.maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${bilgi.maliyet} ₺`);
    return;
  }
  const onay = await showConfirm(
    `${b.ad} bölgesine ${bilgi.ikon} ${bilgi.ad} al.\nMaliyet: ${bilgi.maliyet} ₺\nKapasite: +${bilgi.kapasite}\nİpucu: Shift + Onay = 5 adet`,
    "Taşıt Satın Al",
    { ekButonEtiketi: "Miktar Gir", ekButonDegeri: "miktar" }
  );
  if (!onay) return;

  let adet = onay === "shift5" ? 5 : 1;
  if (onay === "miktar") {
    const miktar = await showPrompt(
      `${bilgi.ikon} ${bilgi.ad} için adet gir:`,
      "Miktar Gir",
      "1"
    );
    if (miktar === null) return;
    const parsed = Number(miktar);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      await showAlert("Geçerli bir tam sayı gir (1, 2, 3...).");
      return;
    }
    adet = parsed;
  }
  const toplamMaliyet = bilgi.maliyet * adet;
  if (oyun.fraksiyon.biz.para < toplamMaliyet) {
    await showAlert(`Yetersiz para. ${adet} adet için gerekli: ${toplamMaliyet} ₺`);
    return;
  }

  const toplamPersonel = bizToplamPersonel();
  const mevcutKapasite = ownerToplamTasitKapasite("biz");
  const yeniKapasite = adet * bilgi.kapasite;
  const tasitKapasiteUstSinir = Math.max(
    20,
    Math.round(toplamPersonel * 1.1 + oyun.bolgeler.filter((x) => x.owner === "biz").length * 10)
  );
  if ((mevcutKapasite + yeniKapasite) > tasitKapasiteUstSinir) {
    await showAlert(
      `Taşıt alımı sınırı aşılıyor.\nMevcut kapasite: ${mevcutKapasite}\n` +
      `Yeni kapasite: ${mevcutKapasite + yeniKapasite}\n` +
      `Üst sınır: ${tasitKapasiteUstSinir}\n` +
      `Daha fazla personel olmadan filo büyütmek maliyeti patlatır.`
    );
    return;
  }

  oyun.fraksiyon.biz.para -= toplamMaliyet;
  const tasit = ownerTasit("biz");
  tasit[tip] = (tasit[tip] || 0) + adet;
  logYaz(`Filoya ${bilgi.ikon} ${bilgi.ad} x${adet} eklendi.`);
  uiGuncel(callbacklar);
}

export async function tasitCal(tip) {
  if (tip !== "motor" && tip !== "araba") {
    await showAlert("Geçersiz araç tipi.");
    return;
  }
  const hedef = bolgeById(oyun.seciliId);
  if (!hedef || hedef.owner === "biz") {
    await showAlert("Araç çalmak için bize ait olmayan bir bölge seç.");
    return;
  }
  const cikis = hedefeKomsuBizBolgesi(hedef.id);
  if (!cikis) {
    await showAlert("Araç hırsızlığı için hedefe komşu bir bölgen olmalı.");
    return;
  }

  const maliyet = tip === "araba" ? 120 : 80;
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Operasyon maliyeti: ${maliyet} ₺`);
    return;
  }

  const hedefOwner = hedef.owner;
  const hedefTasit = ownerTasit(hedefOwner);
  const stokVar = (hedefTasit[tip] || 0) > 0;
  const guvenlik = (hedef.guv || 0) + (hedef.yGuv || 0);
  const as = asayisDurumu();
  let sans = (tip === "motor" ? 0.62 : 0.52) - guvenlik * 0.035 - as.polisBaski * 0.005;
  sans += stokVar ? 0.1 : -0.12;
  sans = sinirla(sans, 0.08, 0.82);

  const onay = await showConfirm(
    `${hedef.ad} bölgesinden ${tip === "motor" ? "🏍️ motor" : "🚗 araba"} çalma operasyonu.\n` +
      `Çıkış bölgesi: ${cikis.ad}\nMaliyet: ${maliyet} ₺\nBaşarı olasılığı: %${Math.round(sans * 100)}\n` +
      `Başarısızlıkta suçluluk artar ve polis cezası gelebilir.\nDevam?`,
    "Araç Çalma"
  );
  if (!onay) return;

  oyun.fraksiyon.biz.para -= maliyet;
  const basarili = Math.random() < sans;

  if (basarili) {
    if (stokVar) hedefTasit[tip] = Math.max(0, (hedefTasit[tip] || 0) - 1);
    ownerTasitIade("biz", tip === "araba" ? 1 : 0, tip === "motor" ? 1 : 0);
    suclulukEkle(stokVar ? 6 : 8);
    logYaz(
      `🕶️ ${hedef.ad} bölgesinden ${tip === "motor" ? "🏍️ motor" : "🚗 araba"} çalındı. ` +
        `Filoya eklendi.`
    );
  } else {
    suclulukEkle(tip === "araba" ? 12 : 10);
    const ceza = Math.min(oyun.fraksiyon.biz.para, Math.round(60 + guvenlik * 12 + Math.random() * 80));
    oyun.fraksiyon.biz.para -= ceza;
    logYaz(
      `🚔 ${hedef.ad} operasyonu patladı. Polis cezası: ${ceza} ₺. ` +
        `${tip === "motor" ? "Motor" : "Araba"} alınamadı.`
    );
  }

  uiGuncel(callbacklar);
}

export function asayisTick() {
  const as = asayisDurumu();
  as.sucluluk = Math.max(0, as.sucluluk - 1.5);
  as.polisBaski = sinirla(Math.max(0, as.polisBaski - 0.8) + as.sucluluk * 0.03, 0, 100);
  if (as.sucluluk < 12) return;

  const risk = sinirla(0.02 + as.polisBaski * 0.003 + Math.max(0, as.sucluluk - 25) * 0.004, 0, 0.65);
  if (Math.random() >= risk) return;

  const paraCeza = Math.min(
    oyun.fraksiyon.biz.para,
    Math.round(100 + as.sucluluk * 4 + Math.random() * 140)
  );
  oyun.fraksiyon.biz.para -= paraCeza;

  let elKonan = "";
  const bizTasit = ownerTasit("biz");
  const arabaVar = (bizTasit.araba || 0) > 0;
  const motorVar = (bizTasit.motor || 0) > 0;
  if (arabaVar || motorVar) {
    if (arabaVar && (!motorVar || Math.random() < 0.55)) {
      bizTasit.araba -= 1;
      elKonan = `1 🚗`;
    } else if (motorVar) {
      bizTasit.motor -= 1;
      elKonan = `1 🏍️`;
    }
  }

  as.sonBaskinTur = oyun.tur;
  as.sucluluk = Math.max(0, as.sucluluk * 0.72);
  as.polisBaski = sinirla(as.polisBaski + 8, 0, 100);
  logYaz(
    `🚨 Polis baskını! Para cezası: ${paraCeza} ₺` +
      (elKonan ? `, el konulan taşıt: ${elKonan}` : "") +
      `.`
  );
}

/* === [CASUSLUK] === */
export async function casuslukOperasyon(hedefId, operasyon) {
  const hedef = bolgeById(hedefId);
  if (!hedef) return;

  let sonuc;
  if (operasyon === "kesif") {
    sonuc = kesifYap(hedefId);
  } else if (operasyon === "suikast") {
    const hedefFr = oyun.fraksiyon[hedef.owner];
    const liderIkon = hedefFr?.lider && liderOzelligiVarMi(hedefFr.lider) && hedefFr.lider.ikon
      ? `${hedefFr.lider.ikon} `
      : "";
    const liderAd = hedefFr?.lider ? `${liderIkon}${hedefFr.lider.ad}` : "lider";
    const onay = await showConfirm(
      `${hedef.ad} bölgesindeki ${liderAd} için suikast emri.\nMaliyet: 300 ₺ + 2 ekip + 4 kişilik taşıt kapasitesi.\nBaşarılı olursa ekip/taşıt geri döner.\nDevam?`,
      "Suikast Operasyonu"
    );
    if (!onay) return;
    sonuc = suikastYap(hedefId);
  } else {
    return;
  }

  if (!sonuc.basarili) {
    await showAlert(sonuc.mesaj, "Operasyon Başarısız");
  }
  uiGuncel(callbacklar);
}

function diploHedefGecerliMi(hedefOwner) {
  return ["ai1", "ai2", "ai3"].includes(hedefOwner) && !!oyun.fraksiyon?.[hedefOwner];
}

async function diploAksiyonKilidiKontrol() {
  if (oyuncuDiploAksiyonMumkunMu()) return true;
  const durum = oyuncuDiploAksiyonDurumu();
  const hedefAd = durum.hedef ? (oyun.fraksiyon?.[durum.hedef]?.ad || durum.hedef) : "bilinmeyen hedef";
  await showAlert(
    `Bu tur zaten diplomatik aksiyon kullandın (${durum.tip || "aksiyon"} → ${hedefAd}). Yeni turu bekle.`
  );
  return false;
}

function diploAksiyonTuket(tip, hedefOwner) {
  oyuncuDiploAksiyonKullan(tip, hedefOwner);
}

function diploAksiyonSayilirMi(sonuc) {
  if (!sonuc || typeof sonuc !== "object") return false;
  if (sonuc.ok) return true;
  const mesaj = String(sonuc.mesaj || "").toLocaleLowerCase("tr-TR");
  return (
    mesaj.includes("reddetti") ||
    mesaj.includes("geri tepti") ||
    mesaj.includes("geri adım") ||
    mesaj.includes("kabul etti")
  );
}

export async function diplomasiBarisTeklif(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  const il = iliskiDurumu("biz", hedefOwner);
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} için barış teklifi gönderilsin mi?\nMevcut ilişki: ${il.ikon} ${il.deger} (${il.etiket})`,
    "Barış Teklifi"
  );
  if (!onay) return;
  const sonuc = barisTeklifiEt("biz", hedefOwner);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("baris", hedefOwner);
  logYaz(`🤝 ${sonuc.mesaj}`);
  if (sonuc.ok) sesCal("diplo");
  uiGuncel(callbacklar);
}

export async function diplomasiSavasIlan(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  const il = iliskiDurumu("biz", hedefOwner);
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} için resmi savaş ilanı yapılsın mı?\n` +
    `Mevcut ilişki: ${il.ikon} ${il.deger} (${il.etiket})\n` +
    "Aktif anlaşmalar varsa ihanet sayılır ve bozulur.",
    "Savaş İlanı"
  );
  if (!onay) return;
  const sonuc = savasBildir("biz", hedefOwner);
  if (sonuc.ok) {
    diploAksiyonTuket("savas", hedefOwner);
    sesCal("savas");
  }
  logYaz(`⚔️ ${sonuc.mesaj}`);
  uiGuncel(callbacklar);
}

export async function diplomasiIttifakTeklif(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  if (oyun.fraksiyon.biz.para < DIPLOMASI.ITTIFAK_MALIYETI) {
    await showAlert(`İttifak için en az ${DIPLOMASI.ITTIFAK_MALIYETI}₺ gerekir.`);
    return;
  }
  const il = iliskiDurumu("biz", hedefOwner);
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} ile ittifak teklifi gönderilsin mi?\nBaşlangıç maliyeti: ${DIPLOMASI.ITTIFAK_MALIYETI}₺\nMevcut ilişki: ${il.ikon} ${il.deger} (${il.etiket})`,
    "İttifak Teklifi"
  );
  if (!onay) return;
  const sonuc = ittifakTeklifiEt("biz", hedefOwner);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("ittifak", hedefOwner);
  if (sonuc.ok) {
    oyun.fraksiyon.biz.para -= DIPLOMASI.ITTIFAK_MALIYETI;
    sesCal("diplo");
  }
  logYaz(`🤝 ${sonuc.mesaj}`);
  uiGuncel(callbacklar);
}

export async function diplomasiTicaretTeklif(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  const minSermaye = Math.max(0, Math.round(DIPLOMASI.TICARET_MIN_SERMAYE || 0));
  if ((oyun.fraksiyon.biz?.para || 0) < minSermaye) {
    await showAlert(`Ticaret için en az ${minSermaye}₺ sermaye gerekir. Mevcut: ${Math.round(oyun.fraksiyon.biz?.para || 0)}₺`);
    return;
  }
  const batmaYuzde = Math.round((DIPLOMASI.TICARET_BATMA_SANSI || 0) * 100);
  const batmaMin = Math.round(DIPLOMASI.TICARET_BATMA_MIN_KAYIP || 0);
  const batmaMax = Math.round(DIPLOMASI.TICARET_BATMA_MAX_KAYIP || 0);
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} ile ticaret anlaşması teklif edilsin mi?\n` +
    `Sermaye şartı: iki taraf da min ${minSermaye}₺.\n` +
    `Not: Ticaret aktifken her tur %${batmaYuzde} batma riski var (${batmaMin}-${batmaMax}₺ kayıp).`,
    "Ticaret Teklifi"
  );
  if (!onay) return;
  const sonuc = ticaretTeklifiEt("biz", hedefOwner);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("ticaret", hedefOwner);
  logYaz(`🤝 ${sonuc.mesaj}`);
  if (sonuc.ok) sesCal("diplo");
  uiGuncel(callbacklar);
}

export async function diplomasiRusvetVer(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  const girdi = await showPrompt(
    `${oyun.fraksiyon[hedefOwner].ad} için rüşvet/ödeme miktarı gir (150-600 önerilir):`,
    "Rüşvet / Gizli Ödeme"
  );
  if (girdi === null) return;
  const miktar = parseInt(girdi, 10);
  if (!Number.isFinite(miktar) || miktar <= 0) {
    await showAlert("Geçersiz miktar.");
    return;
  }
  if (oyun.fraksiyon.biz.para < miktar) {
    await showAlert("Yetersiz para.");
    return;
  }
  const sonuc = rusvetVer("biz", hedefOwner, miktar);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("rusvet", hedefOwner);
  logYaz(`💸 ${sonuc.mesaj}`);
  if (sonuc.ok) sesCal("rusvet");
  uiGuncel(callbacklar);
}

export async function diplomasiTehditEt(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} için ültimatom verilsin mi?\nReddedilirse ilişki daha da kötüleşebilir.`,
    "Tehdit / Ültimatom"
  );
  if (!onay) return;
  const sonuc = tehditEt("biz", hedefOwner);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("tehdit", hedefOwner);
  logYaz(`⚠️ ${sonuc.mesaj}`);
  if (sonuc.ok) sesCal("diplo");
  uiGuncel(callbacklar);
}

export async function diplomasiIstihbaratPaylas(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  if (oyun.fraksiyon.biz.para < 80) {
    await showAlert("İstihbarat paylaşımı için 80₺ gerekir.");
    return;
  }
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} ile istihbarat paylaşımı yapılsın mı?\nMaliyet: 80₺`,
    "İstihbarat Paylaşımı"
  );
  if (!onay) return;
  const sonuc = istihbaratPaylas("biz", hedefOwner);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("istihbarat", hedefOwner);
  logYaz(`🕵️ ${sonuc.mesaj}`);
  if (sonuc.ok) sesCal("diplo");
  uiGuncel(callbacklar);
}

export async function diplomasiSabotajTeklif(hedefOwner) {
  if (!diploHedefGecerliMi(hedefOwner)) {
    await showAlert("Geçersiz diplomasi hedefi.");
    return;
  }
  if (!(await diploAksiyonKilidiKontrol())) return;
  if (oyun.fraksiyon.biz.para < DIPLOMASI.SABOTAJ_MALIYETI) {
    await showAlert(`Sabotaj teklifi için ${DIPLOMASI.SABOTAJ_MALIYETI}₺ gerekir.`);
    return;
  }
  const il = iliskiDurumu("biz", hedefOwner);
  const onay = await showConfirm(
    `${oyun.fraksiyon[hedefOwner].ad} ile sabotaj ortaklığı teklif edilsin mi?\nMaliyet: ${DIPLOMASI.SABOTAJ_MALIYETI}₺\nMevcut ilişki: ${il.ikon} ${il.deger} (${il.etiket})`,
    "Sabotaj Teklifi"
  );
  if (!onay) return;
  const sonuc = sabotajTeklifiEt("biz", hedefOwner);
  if (diploAksiyonSayilirMi(sonuc)) diploAksiyonTuket("sabotaj", hedefOwner);
  logYaz(`🧨 ${sonuc.mesaj}`);
  if (sonuc.ok) sesCal("diplo");
  uiGuncel(callbacklar);
}

export const callbacklar = {
  yatirimGelir,
  yatirimGuv,
  yatirimAdam,
  haracSeviyesiAyarla,
  adamAlimSayacSifirla,
  profilOzellestirmeKaydet,
  binaKur,
  binaYukselt,
  saldiri,
  teslimAl,
  duraklatDevam,
  hizAyarla,
  sohretSatinAl,
  hareketEmriSaldiriBaslat,
  koordineliSaldiriBaslat,
  hareketEmriBaslat,
  toplantiNoktasiYap,
  toplantiNoktasinaCagir,
  toplantiNoktasinaGonder,
  hizliTransferSeciliBolgeden,
  hareketEmriHedefSec,
  saldiriHizliAcil,
  birimSatinAl,
  tasitSatinAl,
  tasitCal,
  casuslukOperasyon,
  diplomasiBarisTeklif,
  diplomasiSavasIlan,
  diplomasiIttifakTeklif,
  diplomasiTicaretTeklif,
  diplomasiRusvetVer,
  diplomasiTehditEt,
  diplomasiIstihbaratPaylas,
  diplomasiSabotajTeklif,
};
