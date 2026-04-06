// save.js — 3 Slotlu LocalStorage Kayıt/Yükleme Sistemi

import { oyun, hazirlaBolgeDurumu, hazirlaBirimDurumu, bolgeMapTemizle } from "./state.js";
import { istatistik } from "./stats.js";

const VERIYON = 6;
const SLOT_ANAHTARI = (slot) => `mafya-kayit-slot-${slot}`;

function oyunDurumuNormallestir(yuklenenOyun) {
  if (!yuklenenOyun || typeof yuklenenOyun !== "object") return yuklenenOyun;

  if (!Array.isArray(yuklenenOyun.bolgeler)) yuklenenOyun.bolgeler = [];
  yuklenenOyun.bolgeler = yuklenenOyun.bolgeler.map((bolge) => hazirlaBolgeDurumu(bolge));

  if (!yuklenenOyun.gorevler) yuklenenOyun.gorevler = { aktif: [], tamamlanan: [] };
  if (!Array.isArray(yuklenenOyun.yaralilar)) yuklenenOyun.yaralilar = [];
  if (!Array.isArray(yuklenenOyun.esirler)) yuklenenOyun.esirler = [];
  if (!yuklenenOyun.olaylar) yuklenenOyun.olaylar = { sonrakiTur: 10, gecmis: [] };
  if (!yuklenenOyun.istatistikler) yuklenenOyun.istatistikler = { kazanilanSavaslar: 0, fetihler: 0 };
  if (!yuklenenOyun.toplanma) yuklenenOyun.toplanma = { biz: null, ai1: null, ai2: null };
  if (!Array.isArray(yuklenenOyun.birimler)) yuklenenOyun.birimler = [];
  yuklenenOyun.birimler = yuklenenOyun.birimler.map((birim) => hazirlaBirimDurumu(birim));
  if (!yuklenenOyun.arastirma) {
    yuklenenOyun.arastirma = {
      aktifDal: "org",
      org: { seviye: 0, puan: 0 },
      ekonomi: { seviye: 0, puan: 0 },
      istihbarat: { seviye: 0, puan: 0 },
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
