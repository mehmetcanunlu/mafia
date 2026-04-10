import { oyun } from "./state.js";

const OWNERLER = Object.freeze(["biz", "ai1", "ai2", "ai3"]);

function ownerArastirmaSeviyeToplami(owner) {
  if (owner === "biz") {
    const ar = oyun.arastirma || {};
    return Object.values(ar)
      .filter((v) => v && typeof v === "object" && Number.isFinite(v.seviye))
      .reduce((t, v) => t + (v.seviye || 0), 0);
  }
  const ar = oyun.fraksiyon?.[owner]?._arastirma || {};
  return Object.values(ar)
    .filter((v) => v && typeof v === "object" && Number.isFinite(v.seviye))
    .reduce((t, v) => t + (v.seviye || 0), 0);
}

function ownerToplamAsker(owner) {
  return (oyun.birimler || [])
    .filter((u) => u.owner === owner)
    .reduce((t, u) => t + (u.adet || 0), 0);
}

export function gucPuani(owner) {
  const bolge = (oyun.bolgeler || []).filter((b) => b.owner === owner).length;
  const asker = ownerToplamAsker(owner);
  const para = Number(oyun.fraksiyon?.[owner]?.para) || 0;
  const arastirma = ownerArastirmaSeviyeToplami(owner);
  return bolge * 10 + asker * 0.5 + para / 100 + arastirma * 5;
}

export function gucSiralamasiHesapla() {
  const liste = OWNERLER.map((owner) => ({
    owner,
    puan: gucPuani(owner),
  })).sort((a, b) => b.puan - a.puan || String(a.owner).localeCompare(String(b.owner)));
  const toplam = liste.reduce((t, s) => t + s.puan, 0) || 1;
  return liste.map((s, sira) => ({
    ...s,
    sira: sira + 1,
    pay: s.puan / toplam,
  }));
}
