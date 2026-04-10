import {
  BASLANGIC_FRAKSIYONLAR,
  liderlerArasiBaslangicIliski,
  EKONOMI_DENGE,
  DIPLOMASI,
} from "./config.js";
import { SOHRET } from "./config.js";
import { istanbulBolgelerOlustur, istanbulKomsuOlustur } from "./istanbul.js";

const ILK_BOLGELER = istanbulBolgelerOlustur("buyuk", "orta");
const ILK_FRAKSIYONLAR = BASLANGIC_FRAKSIYONLAR("orta");
const DIPLO_OWNERLER = Object.freeze(["biz", "ai1", "ai2", "ai3"]);
const DIPLO_LOG_LIMIT = 80;

function iliskiAnahtar(a, b) {
  return [a, b].sort().join("-");
}

function rastgeleAralik(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function liderBazliIliski(fraksiyonlar, a, b) {
  const liderA = fraksiyonlar?.[a]?.lider;
  const liderB = fraksiyonlar?.[b]?.lider;
  if (!liderA || !liderB) return null;
  const deger = liderlerArasiBaslangicIliski(liderA, liderB);
  if (!Number.isFinite(deger)) return null;
  return Math.max(-100, Math.min(100, Math.round(deger)));
}

export function ekonomiDurumuTamamla(ekonomi) {
  const e = (ekonomi && typeof ekonomi === "object") ? ekonomi : {};
  const haracSeviye = (e.haracSeviye === "dusuk" || e.haracSeviye === "orta" || e.haracSeviye === "yuksek")
    ? e.haracSeviye
    : "orta";
  return {
    haracSeviye,
    alimBuTur: Math.max(0, Math.floor(Number(e.alimBuTur) || 0)),
    sonHaracGeliri: Math.max(0, Math.round(Number(e.sonHaracGeliri) || 0)),
    personelTavanEk: Math.max(0, Math.round(Number(e.personelTavanEk) || 0)),
  };
}

function ownerOrtalamaSadakat(owner) {
  const bolgeler = (oyun.bolgeler || []).filter((b) => b.owner === owner);
  if (!bolgeler.length) return 55;
  const toplam = bolgeler.reduce((t, b) => t + (Number(b.sadakat) || 55), 0);
  return toplam / bolgeler.length;
}

function ownerHaracGelirCarpani(owner) {
  if (owner !== "biz") return 1;
  const eco = ekonomiDurumuTamamla(oyun.ekonomi);
  const harac = EKONOMI_DENGE.haracSeviyeleri[eco.haracSeviye] || EKONOMI_DENGE.haracSeviyeleri.orta;
  return Number(harac?.gelirCarpani || 1);
}

export function ownerToplamPersonel(owner = "biz") {
  return (oyun.birimler || [])
    .filter((b) => b.owner === owner && !b._sil)
    .reduce((toplam, b) => toplam + (b.adet || 0), 0);
}

export function ownerPersonelTavan(owner = "biz") {
  const ownerBolgeler = (oyun.bolgeler || []).filter((b) => b.owner === owner);
  const ortSadakat = ownerOrtalamaSadakat(owner);
  const toplamNufus = ownerBolgeler.reduce((toplam, b) => toplam + (b.nufus || b.nufusMax || 0), 0);
  const haracKatkisi = (ownerHaracGelirCarpani(owner) - 1) * 16;
  const eco = ekonomiDurumuTamamla(oyun.ekonomi);
  const arastirmaEk = owner === "biz" ? Math.max(0, Number(eco.personelTavanEk) || 0) : 0;
  const bazMaksKapasite = Math.max(25, Math.round(Number(EKONOMI_DENGE.toplamBirimMaksKapasite) || 220));
  const ownerMaksKapasite = owner === "biz" ? bazMaksKapasite + arastirmaEk : bazMaksKapasite;
  let tavan = Math.round(
    EKONOMI_DENGE.toplamBirimTabanKapasite +
    ownerBolgeler.length * EKONOMI_DENGE.toplamBirimBolgeCarpani +
    toplamNufus * EKONOMI_DENGE.toplamBirimNufusCarpani +
    ortSadakat * EKONOMI_DENGE.toplamBirimSadakatCarpani +
    haracKatkisi +
    arastirmaEk
  );

  if (owner === "biz") {
    const para = Number(oyun.fraksiyon?.biz?.para || 0);
    if (para >= EKONOMI_DENGE.alimiTurParaDestekEsik) tavan += EKONOMI_DENGE.alimiTurParaDestekBonus;
    if (para <= EKONOMI_DENGE.alimiTurParaCezaEsik) tavan -= EKONOMI_DENGE.alimiTurParaCeza;
  }
  tavan = Math.min(tavan, ownerMaksKapasite);
  return Math.max(25, tavan);
}

export function yeniDiplomasiDurumu(fraksiyonlar = null) {
  const iliskiler = {};
  for (let i = 0; i < DIPLO_OWNERLER.length; i += 1) {
    for (let j = i + 1; j < DIPLO_OWNERLER.length; j += 1) {
      const a = DIPLO_OWNERLER[i];
      const b = DIPLO_OWNERLER[j];
      const key = iliskiAnahtar(a, b);
      const liderDegeri = liderBazliIliski(fraksiyonlar, a, b);
      iliskiler[key] = Number.isFinite(liderDegeri)
        ? liderDegeri
        : ((a === "biz" || b === "biz") ? 0 : rastgeleAralik(-20, 20));
    }
  }
  return {
    iliskiler,
    anlasmalar: [],
    itibar: 50,
    ihanetSayisi: 0,
    gucSiralamasi: [],
    iliskiTarihce: [],
    olayGunlugu: [],
    tehditCooldown: {},
    aiTeklifCooldown: {},
    redCooldown: {},
    savasDurumu: {},
    savasKayit: {},
    oyuncuTeklifTipCooldown: {},
    bekleyenTeklifler: [],
    koalisyon: null,
    ittifakMudahaleKuyrugu: [],
    kritikBildirim: {
      savasDurumu: {},
      anlasmaKalan: {},
    },
    oyuncuAksiyon: {
      tur: -1,
      tip: null,
      hedef: null,
    },
  };
}

export function diplomasiDurumuTamamla(diplomasi, fraksiyonlar = oyun?.fraksiyon) {
  const yeni = yeniDiplomasiDurumu(fraksiyonlar);
  const d = (diplomasi && typeof diplomasi === "object") ? diplomasi : {};
  const iliskiler = { ...yeni.iliskiler, ...(d.iliskiler || {}) };
  Object.keys(iliskiler).forEach((key) => {
    const v = Number(iliskiler[key]);
    iliskiler[key] = Number.isFinite(v) ? Math.max(-100, Math.min(100, Math.round(v * 10) / 10)) : 0;
  });
  const anlasmalar = Array.isArray(d.anlasmalar)
    ? d.anlasmalar
      .filter(Boolean)
      .map((a) => {
        const tip = String(a.tip || "");
        const meta = (a.meta && typeof a.meta === "object") ? { ...a.meta } : {};
        const kaliciBaris = tip === "baris";
        if (kaliciBaris) meta.kalici = true;
        else if (tip === "ateskes") delete meta.kalici;
        const varsayilanSure =
          tip === "ateskes" ? Number(DIPLOMASI.ATESKES_SURESI || 0)
            : tip === "ittifak" ? Number(DIPLOMASI.ITTIFAK_SURESI || 0)
              : tip === "ticaret" ? Number(DIPLOMASI.TICARET_SURESI || 0)
                : 0;
        const baslangic = Number.isFinite(a.baslangic) ? a.baslangic : 0;
        const bitis =
          kaliciBaris
            ? null
            : Number.isFinite(a.bitis)
              ? a.bitis
              : (varsayilanSure > 0 ? baslangic + varsayilanSure : oyun.tur);
        return {
          ...a,
          bitis,
          meta,
        };
      })
    : [];
  const olayGunlugu = Array.isArray(d.olayGunlugu) ? d.olayGunlugu.filter(Boolean).slice(-DIPLO_LOG_LIMIT) : [];
  const iliskiTarihce = Array.isArray(d.iliskiTarihce)
    ? d.iliskiTarihce
      .filter((x) => x && typeof x === "object" && Number.isFinite(x.tur) && x.iliskiler && typeof x.iliskiler === "object")
      .slice(-40)
      .map((x) => ({ tur: x.tur, iliskiler: { ...x.iliskiler } }))
    : [];
  const tehditCooldown = (d.tehditCooldown && typeof d.tehditCooldown === "object") ? { ...d.tehditCooldown } : {};
  const aiTeklifCooldown = (d.aiTeklifCooldown && typeof d.aiTeklifCooldown === "object")
    ? { ...d.aiTeklifCooldown }
    : {};
  const redCooldown = (d.redCooldown && typeof d.redCooldown === "object") ? { ...d.redCooldown } : {};
  const savasDurumu = (d.savasDurumu && typeof d.savasDurumu === "object")
    ? { ...d.savasDurumu }
    : {};
  Object.keys(savasDurumu).forEach((key) => {
    if (!savasDurumu[key]) delete savasDurumu[key];
  });
  const savasKayit = (d.savasKayit && typeof d.savasKayit === "object")
    ? { ...d.savasKayit }
    : {};
  const oyuncuTeklifTipCooldown = (d.oyuncuTeklifTipCooldown && typeof d.oyuncuTeklifTipCooldown === "object")
    ? { ...d.oyuncuTeklifTipCooldown }
    : {};
  const bekleyenTeklifler = Array.isArray(d.bekleyenTeklifler)
    ? d.bekleyenTeklifler
      .filter((t) => t && typeof t === "object" && t.id)
      .slice(-12)
      .map((t) => ({
        id: String(t.id),
        tip: String(t.tip || ""),
        gonderen: String(t.gonderen || ""),
        hedef: String(t.hedef || ""),
        durum: t.durum === "beklemede" ? "beklemede" : "sonuclandi",
        tur: Number.isFinite(t.tur) ? t.tur : 0,
        bitis: Number.isFinite(t.bitis) ? t.bitis : null,
        meta: (t.meta && typeof t.meta === "object") ? { ...t.meta } : {},
      }))
    : [];
  const ittifakMudahaleKuyrugu = Array.isArray(d.ittifakMudahaleKuyrugu)
    ? d.ittifakMudahaleKuyrugu
      .filter((m) => m && typeof m === "object")
      .map((m) => ({
        owner: String(m.owner || ""),
        savunulan: String(m.savunulan || ""),
        saldiran: String(m.saldiran || ""),
        tetikTur: Number.isFinite(m.tetikTur) ? m.tetikTur : 0,
        kaynak: String(m.kaynak || "ittifak"),
      }))
      .filter((m) => m.owner && m.savunulan && m.saldiran)
      .slice(-16)
    : [];
  const kritikBildirimKaydi = (d.kritikBildirim && typeof d.kritikBildirim === "object")
    ? d.kritikBildirim
    : {};
  const kritikBildirim = {
    savasDurumu:
      (kritikBildirimKaydi.savasDurumu && typeof kritikBildirimKaydi.savasDurumu === "object")
        ? { ...kritikBildirimKaydi.savasDurumu }
        : {},
    anlasmaKalan:
      (kritikBildirimKaydi.anlasmaKalan && typeof kritikBildirimKaydi.anlasmaKalan === "object")
        ? { ...kritikBildirimKaydi.anlasmaKalan }
        : {},
  };
  const oyuncuAksiyon = (d.oyuncuAksiyon && typeof d.oyuncuAksiyon === "object")
    ? { ...yeni.oyuncuAksiyon, ...d.oyuncuAksiyon }
    : { ...yeni.oyuncuAksiyon };
  if (!Number.isFinite(oyuncuAksiyon.tur)) oyuncuAksiyon.tur = -1;
  oyuncuAksiyon.tip = oyuncuAksiyon.tip || null;
  oyuncuAksiyon.hedef = oyuncuAksiyon.hedef || null;

  return {
    iliskiler,
    anlasmalar,
    itibar: Math.max(0, Math.min(100, Number(d.itibar ?? yeni.itibar) || 50)),
    ihanetSayisi: Math.max(0, Math.floor(Number(d.ihanetSayisi ?? yeni.ihanetSayisi) || 0)),
    gucSiralamasi: Array.isArray(d.gucSiralamasi) ? d.gucSiralamasi.slice(-10) : [],
    iliskiTarihce,
    olayGunlugu,
    tehditCooldown,
    aiTeklifCooldown,
    redCooldown,
    savasDurumu,
    savasKayit,
    oyuncuTeklifTipCooldown,
    bekleyenTeklifler,
    koalisyon: d.koalisyon && typeof d.koalisyon === "object" ? { ...d.koalisyon } : null,
    ittifakMudahaleKuyrugu,
    kritikBildirim,
    oyuncuAksiyon,
  };
}

export const oyun = {
  tur: 0,
  duraklat: true,
  seciliId: null,
  zorluk: "orta",
  mapSize: "istanbul-buyuk",
  mapTipi: "istanbul",
  fraksiyon: ILK_FRAKSIYONLAR,
  bolgeler: ILK_BOLGELER,
  komsu: istanbulKomsuOlustur(ILK_BOLGELER.map((b) => b.id)),
  aiCooldown: { ai1: 0, ai2: 0, ai3: 0 },
  hizKatsayi: 1.0,
  sohret: { biz: 0, ai1: 0, ai2: 0, ai3: 0 },
  hareketEmri: null, // {owner:'biz', kaynakId: number, adet: number}
  toplantiNoktasi: { biz: [], ai1: [], ai2: [], ai3: [] },
  operasyonlar: [],

  // --- yeni: hareketli birlikler ---
  // konvoy = hareket eden birlik yığını
  // { id, owner, adet, konumId, hedefId, rota:[id...], durum:'hareket'|'bekle'|'hedefe-gidiyor' }
  birimler: [],
  birimSayac: 1,
  // --- YENİ SİSTEMLER ---
  gorevler: { aktif: [], tamamlanan: [] },
  yaralilar: [], // { owner, adet, turKaldi, bolgeId }
  esirler: [],   // { owner, tutulan, adet }
  olaylar: { sonrakiTur: 10, gecmis: [] },
  istatistikler: { kazanilanSavaslar: 0, fetihler: 0 },
  ekonomiKpi: { hedefTurlar: [20, 40, 60], kayitlar: [] },
  arastirma: {
    aktifDal: "org",
    org:         { seviye: 0, puan: 0 },
    taktik:      { seviye: 0, puan: 0 },
    lojistik:    { seviye: 0, puan: 0 },
    ekonomi:     { seviye: 0, puan: 0 },
    finans:      { seviye: 0, puan: 0 },
    istihbarat:  { seviye: 0, puan: 0 },
    propaganda:  { seviye: 0, puan: 0 },
  },
  asayis: {
    sucluluk: 0,
    polisBaski: 0,
    sonBaskinTur: -999,
  },
  ekonomi: ekonomiDurumuTamamla(null),
  diplomasi: yeniDiplomasiDurumu(ILK_FRAKSIYONLAR),
};

export function yeniOyun({ zorluk, mapSize, baslangicKonumlari = null, fraksiyonAdlari = null }) {
  const seciliHarita = "istanbul-buyuk";
  oyun.tur = 0;
  oyun.duraklat = true;
  oyun.seciliId = null;
  oyun.zorluk = zorluk;
  oyun.mapSize = seciliHarita;
  oyun.fraksiyon = BASLANGIC_FRAKSIYONLAR(zorluk);
  if (fraksiyonAdlari && typeof fraksiyonAdlari === "object") {
    const sahipler = ["biz", "ai1", "ai2", "ai3"];
    sahipler.forEach((owner) => {
      const ad = String(fraksiyonAdlari[owner] || "").trim();
      if (ad) oyun.fraksiyon[owner].ad = ad;
    });
  }

  oyun.mapTipi = "istanbul";
  oyun.bolgeler = istanbulBolgelerOlustur("buyuk", zorluk, {
    baslangicKonumlari: baslangicKonumlari && typeof baslangicKonumlari === "object"
      ? baslangicKonumlari
      : null,
  });
  const aktifIds = oyun.bolgeler.map((b) => b.id);
  oyun.komsu = istanbulKomsuOlustur(aktifIds);

  oyun.aiCooldown = { ai1: 0, ai2: 0, ai3: 0 };
  oyun.hizKatsayi = 1.0;
  oyun.sohret = { biz: 0, ai1: 0, ai2: 0, ai3: 0 };
  oyun.birimler = [];
  oyun.birimSayac = 1;
  oyun.hareketEmri = null;
  oyun.toplantiNoktasi = { biz: [], ai1: [], ai2: [], ai3: [] };
  oyun.operasyonlar = [];
  // Yeni sistemler
  oyun.gorevler = { aktif: [], tamamlanan: [] };
  oyun.yaralilar = [];
  oyun.esirler = [];
  oyun.olaylar = { sonrakiTur: 10, gecmis: [] };
  oyun.istatistikler = { kazanilanSavaslar: 0, fetihler: 0 };
  oyun.ekonomiKpi = { hedefTurlar: [20, 40, 60], kayitlar: [] };
  oyun.arastirma = {
    aktifDal: "org",
    org:         { seviye: 0, puan: 0 },
    taktik:      { seviye: 0, puan: 0 },
    lojistik:    { seviye: 0, puan: 0 },
    ekonomi:     { seviye: 0, puan: 0 },
    finans:      { seviye: 0, puan: 0 },
    istihbarat:  { seviye: 0, puan: 0 },
    propaganda:  { seviye: 0, puan: 0 },
  };
  oyun.asayis = {
    sucluluk: 0,
    polisBaski: 0,
    sonBaskinTur: -999,
  };
  oyun.ekonomi = ekonomiDurumuTamamla(null);
  oyun.diplomasi = yeniDiplomasiDurumu(oyun.fraksiyon);
  // Faz 6 veri alanları
  oyun.bolgeler.forEach(hazirlaBolgeDurumu);
  legacyGarnizonlariBirimlereAktar();
  bolgeMapTemizle();
}

export function hazirlaBolgeDurumu(bolge) {
  if (!bolge) return bolge;
  if (typeof bolge.sadakat !== "number") bolge.sadakat = 55;
  if (!Number.isFinite(bolge._isyanKorumaTur)) bolge._isyanKorumaTur = 0;
  if (!Array.isArray(bolge.binalar)) bolge.binalar = [];
  if (typeof bolge.binaLimit !== "number") bolge.binaLimit = 2;
  // Eski kayıtlarda bolge.tasit varsa temizle (artık fraksiyon havuzunda)
  if (Object.prototype.hasOwnProperty.call(bolge, "tasit")) delete bolge.tasit;
  return bolge;
}

export function hazirlaBirimDurumu(birim) {
  if (!birim) return birim;
  if (!birim.tip) birim.tip = "tetikci";
  if (birim.tip === "motorlu") birim.tip = "tetikci";
  if (birim.gecisHakki === undefined) birim.gecisHakki = false;
  if (birim.operasyonId === undefined) birim.operasyonId = null;
  if (birim.bekliyor === undefined) birim.bekliyor = false;
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

// Haritadaki “o anda bulunan” adam (hazır birlik + konvoylar) — renk bazlı
export function bulunanSayisi(bolgeId, owner) {
  return oyun.birimler
    .filter((k) => k.konumId === bolgeId && k.owner === owner)
    .reduce((t, k) => t + k.adet, 0);
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

export function yiginaEkle(bolgeId, owner, adet, tip = "tetikci", secenekler = null) {
  const istenecek = Math.max(0, Math.floor(Number(adet) || 0));
  if (istenecek <= 0) return 0;
  let eklenecek = istenecek;
  const tavanUygula = secenekler?.tavanUygula !== false;
  if (tavanUygula && owner && owner !== "tarafsiz") {
    const tavan = ownerPersonelTavan(owner);
    const mevcut = ownerToplamPersonel(owner);
    const kalan = Math.max(0, tavan - mevcut);
    eklenecek = Math.min(eklenecek, kalan);
  }
  if (eklenecek <= 0) return 0;
  const y = oyun.birimler.find(
    (k) =>
      k.owner === owner &&
      k.konumId === bolgeId &&
      (k.tip || "tetikci") === tip &&
      (!k.rota || k.rota.length === 0) &&
      !k.hedefId
  );
  if (y) {
    y.adet += eklenecek;
    birimSayaçHazirla(y);
    return eklenecek;
  }
  const yeni = {
    id: `k${++oyun.birimSayac}`,
    owner,
    adet: eklenecek,
    tip,
    konumId: bolgeId,
    hedefId: null,
    rota: [],
    durum: "bekle",
    gecisHakki: false,
    operasyonId: null,
    bekliyor: false,
  };
  birimSayaçHazirla(yeni);
  oyun.birimler.push(yeni);
  return eklenecek;
}
export function yigindanAl(bolgeId, owner, adet) {
  const y = yiginBul(bolgeId, owner);
  if (!y || y.adet < adet) return false;
  y.adet -= adet;
  if (y.adet <= 0) y._sil = true;
  return true;
}

export function legacyGarnizonlariBirimlereAktar() {
  oyun.bolgeler.forEach((bolge) => {
    const legacy = Math.max(0, Math.floor(Number(bolge?.garnizon) || 0));
    if (legacy > 0 && bolge.owner && bolge.owner !== "tarafsiz") {
      yiginaEkle(bolge.id, bolge.owner, legacy, bolge.baslangicBirimTipi || "tetikci");
    }
    if (bolge && Object.prototype.hasOwnProperty.call(bolge, "garnizon")) delete bolge.garnizon;
  });
}

export function tileToplam(owner, bolgeId) {
  return oyun.birimler
    .filter((k) => k.owner === owner && k.konumId === bolgeId)
    .reduce((t, k) => t + k.adet, 0);
}
