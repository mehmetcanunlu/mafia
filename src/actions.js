import { oyun, bolgeById, kullanilabilirBiz } from "./state.js";
import { logYaz, uiGuncel } from "./ui.js";
import { AYAR, SOHRET, BINA_TIPLERI } from "./config.js";
import { kisaRota, enYakinGuvenli } from "./map.js";
import { saldiriMaliyeti } from "./combat.js";
import { sohretCarpani } from "./state.js";
import { yigindanAl, yiginaEkle, yiginBul } from "./state.js";
import { showAlert, showConfirm, showPrompt } from "./modal.js";
import { BIRIM_TIPLERI, TASIT_TIPLERI, tasitKombinasyonuBul } from "./units.js";
import { kesifYap, suikastYap } from "./spy.js";
import { arastirmaEfekt } from "./research.js";
import { konvoyBaslaAnimasyonu } from "./animations.js";
import { bolgeTasitAyir, bolgeTasitDurumu, bolgeTasitKombinasyonu } from "./logistics.js";

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

function tasitStokMetni(bolge) {
  const t = bolgeTasitDurumu(bolge);
  return `Stok: ${t.araba} 🚗, ${t.motor} 🏍️`;
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
  const v = await showPrompt(
    `Yeni garnizon sayısı?\nŞu an: ${b.garnizon} | Kullanılabilir: ${kullan} | Kapasite: ${kapasite}`,
    'Garnizon Ayarla'
  );
  if (v === null) return;
  const hedef = parseInt(v);
  if (isNaN(hedef) || hedef < 0) {
    await showAlert("Geçersiz sayı.");
    return;
  }
  const fark = hedef - b.garnizon;
  if (fark > 0 && fark > kullan) {
    await showAlert("Yeterli kullanılabilir adam yok.");
    return;
  }
  if (hedef > kapasite) {
    await showAlert(`Bu bölge için maksimum garnizon kapasitesi ${kapasite}.`);
    return;
  }
  b.garnizon = hedef;
  logYaz(`${b.ad} garnizon ${b.garnizon} olarak ayarlandı.`);
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
  const taban = 500 + (hedef.gelir || 0) * 20 + guv * 100;
  const zorlukKatsayi =
    oyun.zorluk === "zor" ? 1.8 : oyun.zorluk === "orta" ? 1.4 : 1.1;
  const maliyet = Math.ceil(taban * zorlukKatsayi);

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

  const takviye = Math.max(3, Math.floor((hedef.nufus || 0) * 0.05));
  if (takviye > 0) {
    yiginaEkle(hedef.id, "biz", takviye);
    logYaz(`${hedef.ad} için otomatik savunma takviyesi: +${takviye} adam.`);
  }

  hedef.korumaTur = (oyun.tur || 0) + 1;
  logYaz(`${hedef.ad} bölgesi ${maliyet} ₺ karşılığında satın alındı.`);
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

  const rota = kisaRota(enYakinGuvenli(hedef.id, "biz"), hedef.id);
  if (!rota || rota.length === 0) {
    await showAlert("Bu bölgeye ulaşım yolu yok (veya senin bölgen yok).");
    return;
  }
  const kaynakBolge = bolgeById(rota[0]);
  if (!kaynakBolge || kaynakBolge.owner !== "biz") {
    await showAlert("Saldırı için geçerli bir çıkış bölgesi bulunamadı.");
    return;
  }
  const turSur = rota.length - 1;

  const kullan = kullanilabilirBiz();
  if (kullan <= 0) {
    await showAlert("Saldırı için kullanılabilir adam yok.");
    return;
  }

  const girdi = await showPrompt(
    `Kaç adam göndereceksin?\nKullanılabilir: ${kullan}\nHedef ${turSur} tur uzakta.`,
    'Saldırı'
  );
  if (girdi === null) return;
  const gonder = parseInt(girdi);
  if (isNaN(gonder) || gonder <= 0 || gonder > kullan) {
    await showAlert("Geçersiz sayı.");
    return;
  }
  const tasitPlan = bolgeTasitKombinasyonu(kaynakBolge, gonder);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${gonder}\n${tasitStokMetni(kaynakBolge)}`
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
    `${hedef.ad} bölgesine ${gonder} adamla sefer düzenle.\nMaliyet: ${maliyet} ₺\nTaşıt: ${tasitPlanMetni(tasitPlan)}\nTahmini varış: ${turSur} tur sonra.\nDevam?`,
    'Saldırıyı Onayla'
  );
  if (!onay) return;
  const ayrilanTasit = bolgeTasitAyir(kaynakBolge, gonder);
  if (!ayrilanTasit) {
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni(kaynakBolge)}`);
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;

  const birim = {
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet: gonder,
    konumId: rota[0],
    hedefId: rota[1] || rota[0],
    _hazir: false,
    durum: "hareket",
    rota: rota.slice(2),
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
  };
  oyun.birimler.push(birim);
  konvoyBaslaAnimasyonu(rota[0]);

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

export async function toplanmaNoktasiYap() {
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") {
    await showAlert("Toplanma noktası sadece kendi bölgen olabilir.");
    return;
  }
  oyun.toplanma.biz = b.id;
  logYaz(`Toplanma noktası: ${b.ad}`);
  uiGuncel(callbacklar);
}

export async function toplanmayaGonder() {
  const b = bolgeById(oyun.seciliId);
  if (!b || b.owner !== "biz") {
    await showAlert("Önce kendi bir bölgeni seç.");
    return;
  }
  if (!oyun.toplanma.biz) {
    await showAlert("Önce bir toplanma noktası seç.");
    return;
  }
  if (oyun.toplanma.biz === b.id) {
    await showAlert("Zaten toplanma noktasındasın.");
    return;
  }
  const max = b.garnizon || 0;
  if (max <= 0) {
    await showAlert("Bu bölgede gönderilecek adam yok.");
    return;
  }
  const girdi = await showPrompt(
    `Kaç adam göndereceksin?\nMevcut: ${max}`,
    'Toplanmaya Gönder'
  );
  if (girdi === null) return;
  const adet = parseInt(girdi);
  if (isNaN(adet) || adet <= 0 || adet > max) {
    await showAlert("Geçersiz sayı.");
    return;
  }

  const rota = kisaRota(b.id, oyun.toplanma.biz);
  if (!rota) {
    await showAlert("Toplanma noktasına rota bulunamadı.");
    return;
  }
  const tasitPlan = bolgeTasitKombinasyonu(b, adet);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${adet}\n${tasitStokMetni(b)}`
    );
    return;
  }

  const ayrilanTasit = bolgeTasitAyir(b, adet);
  if (!ayrilanTasit) {
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni(b)}`);
    return;
  }
  b.garnizon -= adet;
  oyun.birimler.push({
    id: `k${oyun.birimSayac++}`,
    owner: "biz",
    adet,
    konumId: b.id,
    hedefId: oyun.toplanma.biz,
    rota: rota.slice(1),
    durum: "hareket",
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
  });
  konvoyBaslaAnimasyonu(b.id);
  logYaz(`${b.ad} → toplanma (${adet}) yola çıktı (${tasitPlanMetni(ayrilanTasit)}).`);
  uiGuncel(callbacklar);
}

export async function saldiriEmriVer() {
  const hedef = bolgeById(oyun.seciliId);
  if (!hedef || hedef.owner === "biz") {
    await showAlert("Hedef düşman bölge olmalı.");
    return;
  }
  if (hedef.owner === "tarafsiz") {
    await showAlert("Tarafsızlara saldırı kapalı.");
    return;
  }
  const rally = oyun.toplanma.biz;
  if (!rally) {
    await showAlert("Önce bir toplanma noktası belirle.");
    return;
  }

  const kaynakBolge = bolgeById(rally);
  if (!kaynakBolge || kaynakBolge.owner !== "biz") {
    await showAlert("Toplanma noktası geçerli değil.");
    return;
  }
  let toplam = kaynakBolge.owner === "biz" ? kaynakBolge.garnizon || 0 : 0;
  const bekleyen = oyun.birimler.filter(
    (k) =>
      k.owner === "biz" &&
      k.konumId === rally &&
      !k.hedefId &&
      (!k.rota || k.rota.length === 0)
  );
  toplam += bekleyen.reduce((t, k) => t + k.adet, 0);
  if (toplam <= 0) {
    await showAlert("Toplanma noktasında yürütülecek adam yok.");
    return;
  }

  const rota = kisaRota(rally, hedef.id);
  if (!rota) {
    await showAlert("Hedefe rota bulunamadı.");
    return;
  }

  const gidecekler = [];
  if ((kaynakBolge.garnizon || 0) > 0) {
    gidecekler.push({ tur: "garnizon", adet: kaynakBolge.garnizon || 0 });
  }
  bekleyen.forEach((k) => {
    gidecekler.push({ tur: "yigin", adet: k.adet || 0, ref: k });
  });
  if (!gidecekler.length) {
    await showAlert("Toplanma noktasında yürütülecek birlik bulunamadı.");
    return;
  }

  const tasit = bolgeTasitDurumu(kaynakBolge);
  let kalanAraba = tasit.araba || 0;
  let kalanMotor = tasit.motor || 0;
  const planlar = new Map();
  const sirali = [...gidecekler].sort((a, b) => (b.adet || 0) - (a.adet || 0));

  for (const parca of sirali) {
    const plan = tasitKombinasyonuBul(parca.adet || 0, kalanAraba, kalanMotor);
    if (!plan) {
      await showAlert(
        `Toplanma saldırısı için taşıt yetersiz.\nGerekli kapasite: ${toplam}\n${tasitStokMetni(kaynakBolge)}`
      );
      return;
    }
    planlar.set(parca, plan);
    kalanAraba -= plan.araba || 0;
    kalanMotor -= plan.motor || 0;
  }

  tasit.araba = kalanAraba;
  tasit.motor = kalanMotor;

  gidecekler.forEach((parca) => {
    const plan = planlar.get(parca) || { araba: 0, motor: 0 };
    if (parca.tur === "garnizon") {
      oyun.birimler.push({
        id: `k${oyun.birimSayac++}`,
        owner: "biz",
        adet: parca.adet,
        tip: "tetikci",
        konumId: rally,
        hedefId: hedef.id,
        rota: rota.slice(1),
        _hazir: false,
        durum: "hedefe-gidiyor",
        tasitAraba: plan.araba || 0,
        tasitMotor: plan.motor || 0,
      });
      kaynakBolge.garnizon = 0;
      return;
    }
    const k = parca.ref;
    if (!k) return;
    k.hedefId = hedef.id;
    k.rota = rota.slice(1);
    k._hazir = false;
    k.durum = "hedefe-gidiyor";
    k.tasitAraba = plan.araba || 0;
    k.tasitMotor = plan.motor || 0;
  });

  const toplamAraba = gidecekler.reduce((t, p) => t + (planlar.get(p)?.araba || 0), 0);
  const toplamMotor = gidecekler.reduce((t, p) => t + (planlar.get(p)?.motor || 0), 0);
  logYaz(
    `Saldırı emri verildi: ${bolgeById(rally).ad} → ${hedef.ad} (${toplamAraba} 🚗 + ${toplamMotor} 🏍️)`
  );
  konvoyBaslaAnimasyonu(rally);
  uiGuncel(callbacklar);
}

export async function hareketEmriBaslat() {
  const secili = bolgeById(oyun.seciliId);
  if (!secili || secili.owner !== "biz") {
    await showAlert("Kendi kontrolündeki bir bölgeyi seçmelisin.");
    return;
  }
  const y = yiginBul(secili.id, "biz");
  const mevcut = y ? y.adet : 0;
  if (mevcut <= 0) {
    await showAlert("Bu bölgede gönderilecek adam yok.");
    return;
  }

  const girdi = await showPrompt(
    `Kaç adam göndereceksin?\nMevcut: ${mevcut}`,
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

  const komsular = oyun.komsu[kaynak.id] || [];
  if (!komsular.includes(hedef.id)) {
    await showAlert("Sadece komşu bölgelere gönderilebilir.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  const tasitPlan = bolgeTasitKombinasyonu(kaynak, emir.adet);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${emir.adet}\n${tasitStokMetni(kaynak)}`
    );
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  const basarili = yigindanAl(kaynak.id, "biz", emir.adet);
  if (!basarili) {
    await showAlert("Bu bölgede yeterli asker yok.");
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }
  const ayrilanTasit = bolgeTasitAyir(kaynak, emir.adet);
  if (!ayrilanTasit) {
    yiginaEkle(kaynak.id, "biz", emir.adet);
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni(kaynak)}`);
    oyun.hareketEmri = null;
    uiGuncel(callbacklar);
    return;
  }

  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet: emir.adet,
    konumId: kaynak.id,
    hedefId: hedef.id,
    _hazir: false,
    durum: "hareket",
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
  });
  konvoyBaslaAnimasyonu(kaynak.id);

  oyun.hareketEmri = null;
  logYaz(`${kaynak.ad} → ${hedef.ad} (${emir.adet}) yola çıktı (${tasitPlanMetni(ayrilanTasit)}).`);
  uiGuncel(callbacklar);
}

// HIZLI SALDIRI (kaynak yığınından al)
export async function saldiriHizliAcil(hedefId) {
  const hedef = bolgeById(hedefId);
  if (!hedef || (hedef.owner !== "ai1" && hedef.owner !== "ai2" && hedef.owner !== "ai3")) {
    await showAlert("Geçersiz hedef.");
    return;
  }

  const kaynaklar = oyun.bolgeler
    .filter((b) => b.owner === "biz")
    .map((b) => ({ b, y: yiginBul(b.id, "biz") || { adet: 0 } }))
    .filter((x) => x.y.adet > 0);
  const adaylar = kaynaklar
    .map((x) => ({ ...x, rota: kisaRota(x.b.id, hedef.id) }))
    .filter((x) => x.rota && x.rota.length >= 2);
  adaylar.sort((a, b) => {
    const rotaFark = (a.rota?.length || 999) - (b.rota?.length || 999);
    if (rotaFark !== 0) return rotaFark;
    return (b.y?.adet || 0) - (a.y?.adet || 0);
  });
  const kay = adaylar[0];
  if (!kay) {
    await showAlert("Bu hedefe saldırabilecek uygun kaynak bölge yok.");
    return;
  }

  const adetStr = await showPrompt(
    `Kaynak: ${kay.b.ad} (ID:${kay.b.id})\nKaç adam?\nMevcut: ${kay.y.adet}`,
    'Hızlı Saldırı — Birlik Sayısı'
  );
  if (adetStr === null) return;
  const adet = parseInt(adetStr, 10);
  if (isNaN(adet) || adet <= 0 || adet > kay.y.adet) {
    await showAlert("Geçersiz sayı.");
    return;
  }

  const rota = kay.rota || kisaRota(kay.b.id, hedef.id);
  if (!rota || rota.length < 2) {
    await showAlert("Rota bulunamadı.");
    return;
  }
  const tasitPlan = bolgeTasitKombinasyonu(kay.b, adet);
  if (!tasitPlan) {
    await showAlert(
      `Bu hareket için yeterli taşıt yok.\nGerekli kapasite: ${adet}\n${tasitStokMetni(kay.b)}`
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
    `${kay.b.ad} → ${hedef.ad} saldırısı\nBirlik: ${adet} | Maliyet: ${maliyet} ₺`,
    'Hızlı Saldırıyı Onayla'
  );
  if (!onay) return;

  const ayrilanTasit = bolgeTasitAyir(kay.b, adet);
  if (!ayrilanTasit) {
    await showAlert(`Taşıt stoğu değişti. ${tasitStokMetni(kay.b)}`);
    return;
  }
  if (!yigindanAl(kay.b.id, "biz", adet)) {
    const t = bolgeTasitDurumu(kay.b);
    t.araba += ayrilanTasit.araba || 0;
    t.motor += ayrilanTasit.motor || 0;
    await showAlert("Kaynak yığın değişti.");
    return;
  }
  oyun.fraksiyon.biz.para -= maliyet;

  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: "biz",
    adet,
    konumId: kay.b.id,
    hedefId: hedef.id,
    rota: rota.slice(1),
    durum: "hedefe-gidiyor",
    tasitAraba: ayrilanTasit.araba || 0,
    tasitMotor: ayrilanTasit.motor || 0,
  });
  konvoyBaslaAnimasyonu(kay.b.id);
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
  if (oyun.fraksiyon.biz.para < maliyet) {
    await showAlert(`Yetersiz para. Gerekli: ${maliyet} ₺`);
    return;
  }

  const onay = await showConfirm(
    `${b.ad} bölgesine ${bilgi.ikon} ${bilgi.ad} al.\nMaliyet: ${maliyet} ₺\nİpucu: Shift + Onay = 5 adet`,
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
  if (oyun.fraksiyon.biz.para < toplamMaliyet) {
    await showAlert(`Yetersiz para. ${adet} adet için gerekli: ${toplamMaliyet} ₺`);
    return;
  }

  oyun.fraksiyon.biz.para -= toplamMaliyet;

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
  };

  // Gençler eğitim sayacıyla başlar
  if (bilgi.egitimTur) {
    yeniBirim.egitimKalan = bilgi.egitimTur;
  }
  if (bilgi.terfiTur) {
    yeniBirim.terfiKalan = bilgi.terfiTur;
  }

  oyun.birimler.push(yeniBirim);
  logYaz(`${bilgi.ikon} ${bilgi.ad} x${adet} satın alındı → ${b.ad}.`);
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

  oyun.fraksiyon.biz.para -= toplamMaliyet;
  const tasit = bolgeTasitDurumu(b);
  tasit[tip] = (tasit[tip] || 0) + adet;
  logYaz(`${b.ad} bölgesine ${bilgi.ikon} ${bilgi.ad} x${adet} alındı.`);
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

  const hedefTasit = bolgeTasitDurumu(hedef);
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
    const cikisTasit = bolgeTasitDurumu(cikis);
    cikisTasit[tip] = (cikisTasit[tip] || 0) + 1;
    suclulukEkle(stokVar ? 6 : 8);
    logYaz(
      `🕶️ ${hedef.ad} bölgesinden ${tip === "motor" ? "🏍️ motor" : "🚗 araba"} çalındı. ` +
        `${cikis.ad} stokuna eklendi.`
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
  const adaylar = oyun.bolgeler
    .filter((b) => b.owner === "biz")
    .map((b) => ({ bolge: b, tasit: bolgeTasitDurumu(b) }))
    .filter((x) => (x.tasit.araba || 0) + (x.tasit.motor || 0) > 0);
  if (adaylar.length) {
    const hedef = adaylar[Math.floor(Math.random() * adaylar.length)];
    if ((hedef.tasit.araba || 0) > 0 && ((hedef.tasit.motor || 0) === 0 || Math.random() < 0.55)) {
      hedef.tasit.araba -= 1;
      elKonan = `1 🚗 (${hedef.bolge.ad})`;
    } else if ((hedef.tasit.motor || 0) > 0) {
      hedef.tasit.motor -= 1;
      elKonan = `1 🏍️ (${hedef.bolge.ad})`;
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
    const liderAd = hedefFr?.lider ? `${hedefFr.lider.ikon} ${hedefFr.lider.ad}` : "lider";
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

export const callbacklar = {
  yatirimGelir,
  yatirimGuv,
  yatirimAdam,
  binaKur,
  binaYukselt,
  saldiri,
  teslimAl,
  duraklatDevam,
  hizAyarla,
  sohretSatinAl,
  toplanmaNoktasiYap,
  toplanmayaGonder,
  saldiriEmriVer,
  hareketEmriBaslat,
  hareketEmriHedefSec,
  saldiriHizliAcil,
  birimSatinAl,
  tasitSatinAl,
  tasitCal,
  casuslukOperasyon,
};
