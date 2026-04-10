// save.js — 3 Slotlu LocalStorage Kayıt/Yükleme Sistemi

import {
  oyun,
  hazirlaBolgeDurumu,
  hazirlaBirimDurumu,
  bolgeMapTemizle,
  diplomasiDurumuTamamla,
  ekonomiDurumuTamamla,
} from "./state.js";
import { istatistik } from "./stats.js";

const VERIYON = 8;
const SLOT_ANAHTARI = (slot) => `mafya-kayit-slot-${slot}`;

function birimSayacHesapla(yuklenenOyun) {
  let sayac = Math.max(1, Math.floor(Number(yuklenenOyun?.birimSayac) || 1));
  (yuklenenOyun?.birimler || []).forEach((birim) => {
    const eslesme = /^k(\d+)$/.exec(String(birim?.id || ""));
    if (eslesme) sayac = Math.max(sayac, Number(eslesme[1]));
  });
  return sayac;
}

function legacyGarnizonlariBirimlereTasi(yuklenenOyun) {
  if (!Array.isArray(yuklenenOyun?.bolgeler)) return;
  if (!Array.isArray(yuklenenOyun.birimler)) yuklenenOyun.birimler = [];
  let sayac = birimSayacHesapla(yuklenenOyun);

  yuklenenOyun.bolgeler.forEach((bolge) => {
    const legacy = Math.max(0, Math.floor(Number(bolge?.garnizon) || 0));
    if (legacy > 0 && bolge.owner && bolge.owner !== "tarafsiz") {
      const tip = bolge.baslangicBirimTipi || "tetikci";
      const mevcut = yuklenenOyun.birimler.find(
        (birim) =>
          birim.owner === bolge.owner &&
          birim.konumId === bolge.id &&
          (birim.tip || "tetikci") === tip &&
          !birim._sil &&
          !birim.hedefId &&
          (!birim.rota || birim.rota.length === 0)
      );
      if (mevcut) {
        mevcut.adet = Math.max(0, Math.floor(Number(mevcut.adet) || 0)) + legacy;
      } else {
        yuklenenOyun.birimler.push({
          id: `k${++sayac}`,
          owner: bolge.owner,
          adet: legacy,
          tip,
          konumId: bolge.id,
          hedefId: null,
          rota: [],
          durum: "bekle",
          gecisHakki: false,
          operasyonId: null,
          bekliyor: false,
        });
      }
    }
    if (bolge && Object.prototype.hasOwnProperty.call(bolge, "garnizon")) delete bolge.garnizon;
  });
  yuklenenOyun.birimSayac = Math.max(sayac, Math.floor(Number(yuklenenOyun.birimSayac) || 1));
}

function oyunDurumuNormallestir(yuklenenOyun) {
  if (!yuklenenOyun || typeof yuklenenOyun !== "object") return yuklenenOyun;

  if (!Array.isArray(yuklenenOyun.bolgeler)) yuklenenOyun.bolgeler = [];
  yuklenenOyun.bolgeler = yuklenenOyun.bolgeler.map((bolge) => hazirlaBolgeDurumu(bolge));

  if (!yuklenenOyun.gorevler) yuklenenOyun.gorevler = { aktif: [], tamamlanan: [] };
  if (!Array.isArray(yuklenenOyun.yaralilar)) yuklenenOyun.yaralilar = [];
  if (!Array.isArray(yuklenenOyun.esirler)) yuklenenOyun.esirler = [];
  if (!yuklenenOyun.olaylar) yuklenenOyun.olaylar = { sonrakiTur: 10, gecmis: [] };
  if (!yuklenenOyun.istatistikler) yuklenenOyun.istatistikler = { kazanilanSavaslar: 0, fetihler: 0 };
  if (!yuklenenOyun.ekonomiKpi) yuklenenOyun.ekonomiKpi = { hedefTurlar: [20, 40, 60], kayitlar: [] };
  if (!Array.isArray(yuklenenOyun.operasyonlar)) yuklenenOyun.operasyonlar = [];
  if (!Array.isArray(yuklenenOyun.birimler)) yuklenenOyun.birimler = [];
  yuklenenOyun.birimler = yuklenenOyun.birimler.map((birim) => hazirlaBirimDurumu(birim));
  legacyGarnizonlariBirimlereTasi(yuklenenOyun);
  yuklenenOyun.operasyonlar = yuklenenOyun.operasyonlar
    .filter((op) => op && typeof op === "object")
    .map((op) => ({
      id: op.id || `op-${Math.random().toString(36).slice(2, 8)}`,
      tip: op.tip || "koordineli_saldiri",
      hedefId: (typeof op.hedefId === "string" || Number.isFinite(op.hedefId)) ? op.hedefId : null,
      baslatanOwner: op.baslatanOwner || "biz",
      katilimcilar: Array.isArray(op.katilimcilar)
        ? op.katilimcilar
          .filter((kat) => kat && typeof kat === "object")
          .map((kat) => ({
            owner: kat.owner || "biz",
            hazir: !!kat.hazir,
            konvoyIdler: Array.isArray(kat.konvoyIdler) ? kat.konvoyIdler.filter(Boolean) : [],
          }))
        : [],
      durum: op.durum || "hazirlik",
      yaratildisTur: Number.isFinite(op.yaratildisTur) ? op.yaratildisTur : (Number(yuklenenOyun.tur) || 0),
      zaman_asimi: Number.isFinite(op.zaman_asimi) ? op.zaman_asimi : 8,
    }))
    .filter((op) => op.hedefId !== null);
  if (!yuklenenOyun.arastirma) {
    yuklenenOyun.arastirma = {
      aktifDal: "org",
      org: { seviye: 0, puan: 0 },
      taktik: { seviye: 0, puan: 0 },
      lojistik: { seviye: 0, puan: 0 },
      ekonomi: { seviye: 0, puan: 0 },
      finans: { seviye: 0, puan: 0 },
      istihbarat: { seviye: 0, puan: 0 },
      propaganda: { seviye: 0, puan: 0 },
    };
  }
  if (!yuklenenOyun.asayis || typeof yuklenenOyun.asayis !== "object") {
    yuklenenOyun.asayis = { sucluluk: 0, polisBaski: 0, sonBaskinTur: -999 };
  }
  yuklenenOyun.asayis.sucluluk = Number(yuklenenOyun.asayis.sucluluk) || 0;
  yuklenenOyun.asayis.polisBaski = Number(yuklenenOyun.asayis.polisBaski) || 0;
  if (!Number.isFinite(yuklenenOyun.asayis.sonBaskinTur)) yuklenenOyun.asayis.sonBaskinTur = -999;
  if (!yuklenenOyun.sohret) yuklenenOyun.sohret = { biz: 0, ai1: 0, ai2: 0, ai3: 0 };
  if (!yuklenenOyun.fraksiyon) yuklenenOyun.fraksiyon = {};
  // Fraksiyon araç havuzu normalizasyonu (eski kayıt uyumluluğu)
  ["biz", "ai1", "ai2", "ai3"].forEach((owner) => {
    const fr = yuklenenOyun.fraksiyon[owner];
    if (!fr) return;
    if (!fr.tasit || typeof fr.tasit !== "object") fr.tasit = { araba: 4, motor: 6 };
    fr.tasit.araba = Math.max(0, Math.floor(Number(fr.tasit.araba) || 0));
    fr.tasit.motor = Math.max(0, Math.floor(Number(fr.tasit.motor) || 0));
  });
  const eskiToplanma = (yuklenenOyun.toplanma && typeof yuklenenOyun.toplanma === "object")
    ? yuklenenOyun.toplanma
    : {};
  if (!yuklenenOyun.toplantiNoktasi || typeof yuklenenOyun.toplantiNoktasi !== "object") {
    yuklenenOyun.toplantiNoktasi = {
      biz: eskiToplanma.biz ?? [],
      ai1: eskiToplanma.ai1 ?? [],
      ai2: eskiToplanma.ai2 ?? [],
      ai3: eskiToplanma.ai3 ?? [],
    };
  }
  const bolgeIdHaritasi = new Map(
    (yuklenenOyun.bolgeler || []).map((b) => [String(b?.id), b?.id])
  );
  ["biz", "ai1", "ai2", "ai3"].forEach((owner) => {
    const ham = yuklenenOyun.toplantiNoktasi?.[owner];
    const adaylar = Array.isArray(ham)
      ? ham
      : (ham !== null && ham !== undefined ? [ham] : []);
    const temizMap = new Map();
    adaylar.forEach((id) => {
      if (id === null || id === undefined) return;
      const cozulmus = bolgeIdHaritasi.get(String(id));
      if (cozulmus === null || cozulmus === undefined) return;
      temizMap.set(String(cozulmus), cozulmus);
    });
    yuklenenOyun.toplantiNoktasi[owner] = [...temizMap.values()];
  });
  if (Object.prototype.hasOwnProperty.call(yuklenenOyun, "toplanma")) delete yuklenenOyun.toplanma;
  yuklenenOyun.ekonomi = ekonomiDurumuTamamla(yuklenenOyun.ekonomi);
  yuklenenOyun.diplomasi = diplomasiDurumuTamamla(yuklenenOyun.diplomasi, yuklenenOyun.fraksiyon);

  return yuklenenOyun;
}

/**
 * Mevcut oyunu belirtilen slota kaydeder.
 */
export function oyunKaydet(slot = 0) {
  try {
    const kayit = {
      versiyon: VERIYON,
      tarih: new Date().toISOString(),
      ozet: {
        ceteAdi: oyun.fraksiyon?.biz?.ad || "Bilinmiyor",
        tur: oyun.tur,
        bolge: oyun.bolgeler.filter((b) => b.owner === "biz").length,
        zorluk: oyun.zorluk || "orta",
      },
      oyunDurumu: JSON.stringify(oyun),
      istatistikDurumu: JSON.stringify(istatistik),
    };
    localStorage.setItem(SLOT_ANAHTARI(slot), JSON.stringify(kayit));
    return true;
  } catch (e) {
    console.error("Kayıt hatası:", e);
    return false;
  }
}

/**
 * Belirtilen slotun kayıt bilgisini döndürür (oyunu yüklemez).
 * Slot boşsa null döner.
 */
export function kayitBilgisi(slot = 0) {
  try {
    const raw = localStorage.getItem(SLOT_ANAHTARI(slot));
    if (!raw) return null;
    const k = JSON.parse(raw);
    if (!k || k.versiyon > VERIYON) return null;
    return k.ozet
      ? {
          ceteAdi: k.ozet.ceteAdi,
          tur: k.ozet.tur,
          bolge: k.ozet.bolge,
          zorluk: k.ozet.zorluk,
          tarih: k.tarih,
        }
      : null;
  } catch {
    return null;
  }
}

/**
 * Tüm slotların bilgilerini dizi olarak döndürür (3 eleman, boşsa null).
 */
export function tumKayitlar() {
  return [0, 1, 2].map((s) => kayitBilgisi(s));
}

/**
 * Belirtilen slotu oyun state'ine yükler.
 * Başarılıysa true, aksi halde false döner.
 */
export function oyunYukle(slot = 0) {
  try {
    const raw = localStorage.getItem(SLOT_ANAHTARI(slot));
    if (!raw) return false;
    const k = JSON.parse(raw);
    if (!k || k.versiyon > VERIYON) return false;

    const yuklenenOyun = oyunDurumuNormallestir(JSON.parse(k.oyunDurumu));
    const yuklenenIstat = k.istatistikDurumu ? JSON.parse(k.istatistikDurumu) : null;

    // oyun objesine tüm field'ları kopyala
    Object.assign(oyun, yuklenenOyun);
    bolgeMapTemizle();

    // istatistik objesine kopyala
    if (yuklenenIstat) {
      Object.assign(istatistik, yuklenenIstat);
    }

    return true;
  } catch (e) {
    console.error("Yükleme hatası:", e);
    return false;
  }
}

/**
 * Slotu siler.
 */
export function kayitSil(slot = 0) {
  localStorage.removeItem(SLOT_ANAHTARI(slot));
}

/**
 * Otomatik kaydetme: oyun.tur % 10 === 0 olduğunda slot 0'a kaydeder.
 */
export function otomatikKaydet() {
  if (oyun.tur > 0 && oyun.tur % 10 === 0) {
    oyunKaydet(0);
  }
}
