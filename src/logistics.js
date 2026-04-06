import { oyun, bolgeById } from "./state.js";

const TASIT_KAPASITE = {
  motor: 2,
  araba: 4,
};

function sayiyaZorla(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function bolgeTasitDurumu(bolge) {
  if (!bolge) return { motor: 0, araba: 0 };
  if (!bolge.tasit || typeof bolge.tasit !== "object") bolge.tasit = { motor: 0, araba: 0 };
  bolge.tasit.motor = sayiyaZorla(bolge.tasit.motor);
  bolge.tasit.araba = sayiyaZorla(bolge.tasit.araba);
  return bolge.tasit;
}

export function bolgeTasitKombinasyonu(bolge, kisi) {
  if (!bolge || kisi <= 0) return { motor: 0, araba: 0, kapasite: 0 };
  const tasit = bolgeTasitDurumu(bolge);
  return tasitKombinasyonuBul(kisi, tasit.araba || 0, tasit.motor || 0);
}

export function bolgeTasitAyir(bolge, kisi) {
  if (!bolge || kisi <= 0) return { motor: 0, araba: 0, kapasite: 0 };
  const plan = bolgeTasitKombinasyonu(bolge, kisi);
  if (!plan) return null;
  const tasit = bolgeTasitDurumu(bolge);
  tasit.araba -= plan.araba;
  tasit.motor -= plan.motor;
  return plan;
}

export function bolgeTasitIadeEt(bolgeId, araba = 0, motor = 0) {
  const b = bolgeById(Number(bolgeId));
  if (!b) return;
  const tasit = bolgeTasitDurumu(b);
  tasit.araba += sayiyaZorla(araba);
  tasit.motor += sayiyaZorla(motor);
}

export function ownerToplamTasit(owner) {
  const toplam = { motor: 0, araba: 0 };
  oyun.bolgeler
    .filter((b) => b.owner === owner)
    .forEach((b) => {
      const tasit = bolgeTasitDurumu(b);
      toplam.motor += tasit.motor || 0;
      toplam.araba += tasit.araba || 0;
    });
  return toplam;
}

export function ownerToplamKapasite(owner) {
  const toplam = ownerToplamTasit(owner);
  return (
    (toplam.araba || 0) * TASIT_KAPASITE.araba +
    (toplam.motor || 0) * TASIT_KAPASITE.motor
  );
}

export function ownerUygunTasitliBolgeBul(owner, kisi, tercihBolgeId = null) {
  if (kisi <= 0) return null;
  const adaylar = oyun.bolgeler.filter((b) => b.owner === owner);
  if (!adaylar.length) return null;

  if (tercihBolgeId !== null) {
    adaylar.sort((a, b) => (a.id === tercihBolgeId ? -1 : b.id === tercihBolgeId ? 1 : 0));
  }

  let secilen = null;
  let secilenPlan = null;
  let enSkor = Infinity;
  adaylar.forEach((b) => {
    const plan = bolgeTasitKombinasyonu(b, kisi);
    if (!plan) return;
    const tasma = (plan.kapasite || 0) - kisi;
    const aracAdedi = (plan.araba || 0) + (plan.motor || 0);
    const skor = tasma * 10 + aracAdedi;
    if (skor < enSkor) {
      secilen = b;
      secilenPlan = plan;
      enSkor = skor;
    }
  });

  if (!secilen || !secilenPlan) return null;
  return { bolge: secilen, plan: secilenPlan };
}

function tasitKombinasyonuBul(kisi, arabaVar, motorVar) {
  let enIyi = null;
  for (let araba = 0; araba <= Math.max(0, arabaVar); araba++) {
    for (let motor = 0; motor <= Math.max(0, motorVar); motor++) {
      const kapasite = araba * TASIT_KAPASITE.araba + motor * TASIT_KAPASITE.motor;
      if (kapasite < kisi) continue;
      const aracAdedi = araba + motor;
      const tasma = kapasite - kisi;
      if (!enIyi) {
        enIyi = { araba, motor, kapasite, aracAdedi, tasma };
        continue;
      }
      if (aracAdedi < enIyi.aracAdedi || (aracAdedi === enIyi.aracAdedi && tasma < enIyi.tasma)) {
        enIyi = { araba, motor, kapasite, aracAdedi, tasma };
      }
    }
  }
  return enIyi ? { araba: enIyi.araba, motor: enIyi.motor, kapasite: enIyi.kapasite } : null;
}
