import { oyun, bolgeById } from "./state.js";

export const TASIT_KAPASITE = {
  motor: 2,
  araba: 4,
};

const FETIH_TASIT_GANIMETI = Object.freeze({
  araba: 1,
  motor: 1,
});

function sayiyaZorla(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function ownerCoz(bolgeVeyaIdVeyaOwner) {
  if (!bolgeVeyaIdVeyaOwner) return null;
  if (typeof bolgeVeyaIdVeyaOwner === "string" && oyun.fraksiyon?.[bolgeVeyaIdVeyaOwner]) {
    return bolgeVeyaIdVeyaOwner;
  }
  if (typeof bolgeVeyaIdVeyaOwner === "object" && bolgeVeyaIdVeyaOwner.owner) {
    return bolgeVeyaIdVeyaOwner.owner;
  }
  const bolge = bolgeById(bolgeVeyaIdVeyaOwner);
  return bolge?.owner || null;
}

// Owner'ın global araç havuzunu döner (yoksa oluşturur)
export function ownerTasit(owner) {
  if (!owner || !oyun.fraksiyon?.[owner]) return { motor: 0, araba: 0 };
  const fr = oyun.fraksiyon[owner];
  if (!fr.tasit || typeof fr.tasit !== "object") fr.tasit = { motor: 0, araba: 0 };
  fr.tasit.motor = sayiyaZorla(fr.tasit.motor);
  fr.tasit.araba = sayiyaZorla(fr.tasit.araba);
  return fr.tasit;
}

// Kaç kişi taşıyabildiğini döner
export function ownerTasitKombinasyonu(owner, kisi) {
  if (!owner || kisi <= 0) return null;
  const tasit = ownerTasit(owner);
  return tasitKombinasyonuBul(kisi, tasit.araba || 0, tasit.motor || 0);
}

// Araç ayırır, havuzdan düşer, planı döner
export function ownerTasitAyir(owner, kisi) {
  if (!owner || kisi <= 0) return null;
  const plan = ownerTasitKombinasyonu(owner, kisi);
  if (!plan) return null;
  const tasit = ownerTasit(owner);
  tasit.araba = Math.max(0, tasit.araba - plan.araba);
  tasit.motor = Math.max(0, tasit.motor - plan.motor);
  return plan;
}

// Araçları havuza geri iade eder
export function ownerTasitIade(owner, araba = 0, motor = 0) {
  if (!owner) return;
  const tasit = ownerTasit(owner);
  tasit.araba += sayiyaZorla(araba);
  tasit.motor += sayiyaZorla(motor);
}

// Fetih ganimetini owner havuzuna ekler
export function bolgeFetihTasitGanmetiEkle(bolge, owner = "biz") {
  if (!bolge || !owner) return { araba: 0, motor: 0 };
  const tasit = ownerTasit(owner);
  tasit.araba += FETIH_TASIT_GANIMETI.araba;
  tasit.motor += FETIH_TASIT_GANIMETI.motor;
  return { ...FETIH_TASIT_GANIMETI };
}

export function ownerToplamTasit(owner) {
  return ownerTasit(owner);
}

export function ownerToplamKapasite(owner) {
  const tasit = ownerTasit(owner);
  return (
    (tasit.araba || 0) * TASIT_KAPASITE.araba +
    (tasit.motor || 0) * TASIT_KAPASITE.motor
  );
}

// Geriye dönük uyumluluk: bölge tabanlı API çağrıları owner havuzuna yönlendirilir.
export function bolgeTasitKombinasyonu(bolgeVeyaId, kisi) {
  const owner = ownerCoz(bolgeVeyaId);
  if (!owner || owner === "tarafsiz") return null;
  return ownerTasitKombinasyonu(owner, kisi);
}

export function bolgeTasitAyir(bolgeVeyaId, kisi) {
  const owner = ownerCoz(bolgeVeyaId);
  if (!owner || owner === "tarafsiz") return null;
  return ownerTasitAyir(owner, kisi);
}

export function bolgeTasitIadeEt(bolgeVeyaId, araba = 0, motor = 0) {
  const owner = ownerCoz(bolgeVeyaId);
  if (!owner || owner === "tarafsiz") return;
  ownerTasitIade(owner, araba, motor);
}

export function bolgeTasitDurumu(bolgeVeyaId) {
  const owner = ownerCoz(bolgeVeyaId);
  if (!owner || owner === "tarafsiz") return { araba: 0, motor: 0 };
  const tasit = ownerTasit(owner);
  return { araba: tasit.araba || 0, motor: tasit.motor || 0 };
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
