// save.js — 3 Slotlu LocalStorage Kayıt/Yükleme Sistemi

import {
  oyun,
  hazirlaBolgeDurumu,
  hazirlaBirimDurumu,
  bolgeMapTemizle,
  diplomasiDurumuTamamla,
  ekonomiDurumuTamamla,
  asayisDurumuTamamla,
  legacyGarnizonlariBirimlereAktar,
} from "./state.js";
import { istatistik, istatistikSifirla } from "./stats.js";
import { adTemizle } from "./utils.js";

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
  // Eski `bolge.garnizon` alanının stack'lere taşınması oyunYukle içinde,
  // state'in kanonik legacyGarnizonlariBirimlereAktar()'ı ile yapılır
  // (eskiden buradaki kopya personel tavanını atlıyordu).
  yuklenenOyun.birimSayac = birimSayacHesapla(yuklenenOyun);
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
  yuklenenOyun.asayis = asayisDurumuTamamla(yuklenenOyun.asayis);
  if (!yuklenenOyun.sohret) yuklenenOyun.sohret = { biz: 0, ai1: 0, ai2: 0, ai3: 0 };
  if (!yuklenenOyun.fraksiyon) yuklenenOyun.fraksiyon = {};
  // Fraksiyon araç havuzu normalizasyonu (eski kayıt uyumluluğu)
  ["biz", "ai1", "ai2", "ai3"].forEach((owner) => {
    const fr = yuklenenOyun.fraksiyon[owner];
    if (!fr) return;
    // localStorage'a başka yoldan yazılmış zararlı adlar innerHTML'e ulaşmasın
    fr.ad = adTemizle(fr.ad) || owner;
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
    if (!k || !Number.isFinite(Number(k.versiyon)) || k.versiyon > VERIYON) return null;
    return k.ozet
      ? {
          ceteAdi: adTemizle(k.ozet.ceteAdi) || "Bilinmiyor",
          tur: k.ozet.tur,
          bolge: k.ozet.bolge,
          zorluk: k.ozet.zorluk || "orta",
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
    if (!k || !Number.isFinite(Number(k.versiyon)) || k.versiyon > VERIYON) return false;

    const yuklenenOyun = oyunDurumuNormallestir(JSON.parse(k.oyunDurumu));
    const yuklenenIstat = k.istatistikDurumu ? JSON.parse(k.istatistikDurumu) : null;

    // oyun objesine tüm field'ları kopyala
    Object.assign(oyun, yuklenenOyun);
    bolgeMapTemizle();
    legacyGarnizonlariBirimlereAktar();

    // istatistik: önce eski oyunun izlerini temizle, sonra kayıttakini geri yükle
    istatistikSifirla();
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
    const basarili = oyunKaydet(0);
    if (!basarili) {
      // localStorage kotası dolduğunda otokayıt sessizce ölmesin
      import("./modal.js")
        .then((m) => m.showToast("⚠️ Otomatik kayıt başarısız — depolama dolu olabilir.", "hata", 4000))
        .catch(() => {});
    }
  }
}
