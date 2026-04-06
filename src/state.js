import {
  BASLANGIC_FRAKSIYONLAR,
} from "./config.js";
import { SOHRET } from "./config.js";
import { istanbulBolgelerOlustur, istanbulKomsuOlustur } from "./istanbul.js";

const ILK_BOLGELER = istanbulBolgelerOlustur("buyuk", "orta");

export const oyun = {
  tur: 0,
  duraklat: true,
  seciliId: null,
  zorluk: "orta",
  mapSize: "istanbul-buyuk",
  mapTipi: "istanbul",
  fraksiyon: BASLANGIC_FRAKSIYONLAR("orta"),
  bolgeler: ILK_BOLGELER,
  komsu: istanbulKomsuOlustur(ILK_BOLGELER.map((b) => b.id)),
  aiCooldown: { ai1: 0, ai2: 0, ai3: 0 },
  hizKatsayi: 1.0,
  sohret: { biz: 0, ai1: 0, ai2: 0, ai3: 0 },
  hareketEmri: null, // {owner:'biz', kaynakId: number, adet: number}

  // --- yeni: hareketli birlikler ---
  // konvoy = hareket eden birlik yığını
  // { id, owner, adet, konumId, hedefId, rota:[id...], durum:'hareket'|'bekle'|'hedefe-gidiyor' }
  birimler: [],
  birimSayac: 1,
  // toplanma noktaları
  toplanma: { biz: null, ai1: null, ai2: null },
  // --- YENİ SİSTEMLER ---
  gorevler: { aktif: [], tamamlanan: [] },
  yaralilar: [], // { owner, adet, turKaldi, bolgeId }
  esirler: [],   // { owner, tutulan, adet }
  olaylar: { sonrakiTur: 10, gecmis: [] },
  istatistikler: { kazanilanSavaslar: 0, fetihler: 0 },
  arastirma: {
    aktifDal: "org",
    org:         { seviye: 0, puan: 0 },
    ekonomi:     { seviye: 0, puan: 0 },
    istihbarat:  { seviye: 0, puan: 0 },
  },
  asayis: {
    sucluluk: 0,
    polisBaski: 0,
    sonBaskinTur: -999,
  },
};

export function yeniOyun({ zorluk, mapSize }) {
  const seciliHarita = "istanbul-buyuk";
  oyun.tur = 0;
  oyun.duraklat = true;
  oyun.seciliId = null;
  oyun.zorluk = zorluk;
  oyun.mapSize = seciliHarita;
  oyun.fraksiyon = BASLANGIC_FRAKSIYONLAR(zorluk);

  oyun.mapTipi = "istanbul";
  oyun.bolgeler = istanbulBolgelerOlustur("buyuk", zorluk);
  const aktifIds = oyun.bolgeler.map((b) => b.id);
  oyun.komsu = istanbulKomsuOlustur(aktifIds);

  oyun.aiCooldown = { ai1: 0, ai2: 0, ai3: 0 };
  oyun.hizKatsayi = 1.0;
  oyun.sohret = { biz: 0, ai1: 0, ai2: 0, ai3: 0 };
  oyun.birimler = [];
  oyun.birimSayac = 1;
  oyun.toplanma = { biz: null, ai1: null, ai2: null };
  oyun.hareketEmri = null;
  // Yeni sistemler
  oyun.gorevler = { aktif: [], tamamlanan: [] };
  oyun.yaralilar = [];
  oyun.esirler = [];
  oyun.olaylar = { sonrakiTur: 10, gecmis: [] };
  oyun.istatistikler = { kazanilanSavaslar: 0, fetihler: 0 };
  oyun.arastirma = {
    aktifDal: "org",
    org:        { seviye: 0, puan: 0 },
    ekonomi:    { seviye: 0, puan: 0 },
    istihbarat: { seviye: 0, puan: 0 },
  };
  oyun.asayis = {
    sucluluk: 0,
    polisBaski: 0,
    sonBaskinTur: -999,
  };
  // Faz 6 veri alanları
  oyun.bolgeler.forEach(hazirlaBolgeDurumu);
  bolgeMapTemizle();
}

export function hazirlaBolgeDurumu(bolge) {
  if (!bolge) return bolge;
  if (typeof bolge.sadakat !== "number") bolge.sadakat = 55;
  if (!Array.isArray(bolge.binalar)) bolge.binalar = [];
  if (typeof bolge.binaLimit !== "number") bolge.binaLimit = 2;
  if (!bolge.tasit || typeof bolge.tasit !== "object") bolge.tasit = { motor: 0, araba: 0 };
  bolge.tasit.motor = Math.max(0, Math.floor(Number(bolge.tasit.motor) || 0));
  bolge.tasit.araba = Math.max(0, Math.floor(Number(bolge.tasit.araba) || 0));
  return bolge;
}

export function hazirlaBirimDurumu(birim) {
  if (!birim) return birim;
  if (!birim.tip) birim.tip = "tetikci";
  if (birim.tip === "motorlu") birim.tip = "tetikci";
  if (birim.tip === "genc" && birim.egitimKalan === undefined) birim.egitimKalan = 8;
  if (birim.tip === "tetikci" && birim.terfiKalan === undefined) birim.terfiKalan = 14;
  if (birim.tip === "uzman" && birim.terfiKalan === undefined) birim.terfiKalan = 18;
  return birim;
}

// Map cache — O(1) bölge araması
let _bolgeMap = null;

export function bolgeMapTemizle() {
  _bolgeMap = null;
}

export function bolgeById(id) {
  if (!_bolgeMap || _bolgeMap.size !== oyun.bolgeler.length) {
    _bolgeMap = new Map(oyun.bolgeler.map((b) => [b.id, b]));
  }
  return _bolgeMap.get(id);
}
export function fraksiyonAdi(owner) {
  return owner === "tarafsiz" ? "Tarafsız" : oyun.fraksiyon[owner]?.ad || owner;
}
export function bizBolgeSayisi() {
  return oyun.bolgeler.filter((b) => b.owner === "biz").length;
}
// Artık sadece bekleyen yığınlardaki toplam asker
export function kullanilabilirBiz() {
  return oyun.birimler
    .filter((k) => k.owner === "biz" && (!k.rota || k.rota.length === 0))
    .reduce((t, k) => t + k.adet, 0);
}

// Haritadaki “o anda bulunan” adam (garnizon + konvoylar) — renk bazlı
export function bulunanSayisi(bolgeId, owner) {
  let s =
    (bolgeById(bolgeId)?.garnizon || 0) *
    (bolgeById(bolgeId)?.owner === owner ? 1 : 0);
  s += oyun.birimler
    .filter((k) => k.konumId === bolgeId && k.owner === owner)
    .reduce((t, k) => t + k.adet, 0);
  return s;
}
export function sohretCarpani(kime = "biz") {
  const s = Math.max(0, Math.min(100, oyun.sohret[kime] || 0));
  // 1 + s*0.01  → 0'da 1.00x, 100'de 2.00x
  return 1 + s * (SOHRET.recruitPerPoint || 0.01);
}
export function rozetSayilari(bolgeId) {
  const sahipler = ["biz", "ai1", "ai2", "ai3"];
  const res = {};
  sahipler.forEach((o) => {
    const s = oyun.birimler
      .filter((k) => k.konumId === bolgeId && k.owner === o)
      .reduce((t, k) => t + k.adet, 0);
    if (s > 0) res[o] = s;
  });
  return res;
}

export function yiginBul(bolgeId, owner) {
  return oyun.birimler.find(
    (k) =>
      k.owner === owner &&
      k.konumId === bolgeId &&
      (!k.rota || k.rota.length === 0) &&
      !k.hedefId
  );
}

function birimSayaçHazirla(birim) {
  if (!birim || !birim.tip) return;
  if (birim.tip === "genc") {
    if (birim.egitimKalan === undefined) birim.egitimKalan = 8;
    delete birim.terfiKalan;
    return;
  }
  if (birim.tip === "tetikci") {
    if (birim.terfiKalan === undefined) birim.terfiKalan = 14;
    delete birim.egitimKalan;
    return;
  }
  if (birim.tip === "uzman") {
    if (birim.terfiKalan === undefined) birim.terfiKalan = 18;
    delete birim.egitimKalan;
    return;
  }
  delete birim.egitimKalan;
}

export function yiginaEkle(bolgeId, owner, adet, tip = "tetikci") {
  if (adet <= 0) return;
  const y = oyun.birimler.find(
    (k) =>
      k.owner === owner &&
      k.konumId === bolgeId &&
      (k.tip || "tetikci") === tip &&
      (!k.rota || k.rota.length === 0) &&
      !k.hedefId
  );
  if (y) {
    y.adet += adet;
    birimSayaçHazirla(y);
    return;
  }
  const yeni = {
    id: `k${++oyun.birimSayac}`,
    owner,
    adet,
    tip,
    konumId: bolgeId,
    hedefId: null,
    rota: [],
    durum: "bekle",
  };
  birimSayaçHazirla(yeni);
  oyun.birimler.push(yeni);
}
export function yigindanAl(bolgeId, owner, adet) {
  const y = yiginBul(bolgeId, owner);
  if (!y || y.adet < adet) return false;
  y.adet -= adet;
  if (y.adet <= 0) y._sil = true;
  return true;
}
export function tileToplam(owner, bolgeId) {
  return oyun.birimler
    .filter((k) => k.owner === owner && k.konumId === bolgeId)
    .reduce((t, k) => t + k.adet, 0);
}
