// research.js — Araştırma / Gelişim Ağacı (Geniş Ağaç Yapısı)

import { oyun } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";
import { sesCal } from "./audio.js";

export const ARASTIRMA_DALLARI = {
  org: {
    ad: "Örgütlenme",
    ikon: "⚔️",
    aciklama: "Çete çekirdeği, adam kalitesi ve saha kontrolü.",
    seviyeler: [
      { ad: "Sokak Çekirdeği", gerekPuan: 150, aciklama: "Tetikçi maliyeti bir miktar azalır.", efekt: { tetikciMaliyetIndirim: 0.03 } },
      { ad: "Silah Hattı", gerekPuan: 400, aciklama: "Garnizon kapasitesi ve ekip verimi artar.", efekt: { tetikciMaliyetIndirim: 0.04, garnizonBonus: 0.05, personelTavanBonus: 4 } },
      { ad: "Ekip Disiplini", gerekPuan: 850, aciklama: "Saldırı hazırlığı iyileşir.", efekt: { saldiriBonus: 0.04 } },
      { ad: "Alan Komutanlığı", gerekPuan: 1500, aciklama: "Bölge tutma kapasitesi artar.", efekt: { garnizonBonus: 0.08, personelTavanBonus: 6 } },
      { ad: "Uzman Talimi", gerekPuan: 2500, aciklama: "Eğitim hattı hızlanır.", efekt: { egitimSureAzaltma: 1 } },
      { ad: "Saldırı Doktrini", gerekPuan: 3800, aciklama: "Saha baskını etkinliği yükselir.", efekt: { saldiriBonus: 0.06 } },
      { ad: "Cephane Standardı", gerekPuan: 5600, aciklama: "Tedarik israfı azalır.", efekt: { tetikciMaliyetIndirim: 0.05 } },
      { ad: "Kara Operasyon Merkezi", gerekPuan: 8000, aciklama: "Üst seviye örgüt gücü açılır.", efekt: { saldiriBonus: 0.08, garnizonBonus: 0.10, personelTavanBonus: 10 } },
    ],
  },
  taktik: {
    ad: "Taktik",
    ikon: "🗺️",
    aciklama: "Çatışma şablonları, karşı hamle ve kuşatma düzeni.",
    seviyeler: [
      { ad: "Köşe Baskısı", gerekPuan: 180, aciklama: "İlk hücum kalitesi artar.", efekt: { saldiriBonus: 0.03 } },
      { ad: "Karşı Pusu", gerekPuan: 460, aciklama: "Savunma hattı daha sağlam olur.", efekt: { garnizonBonus: 0.04 } },
      { ad: "Bölge Kilitleme", gerekPuan: 920, aciklama: "Sokak baskısı güçlenir.", efekt: { saldiriBonus: 0.04 } },
      { ad: "Katmanlı Savunma", gerekPuan: 1600, aciklama: "İç güvenlik derinliği artar.", efekt: { garnizonBonus: 0.07 } },
      { ad: "Gece Baskını", gerekPuan: 2700, aciklama: "Riskli saldırıların etkinliği yükselir.", efekt: { saldiriBonus: 0.05 } },
      { ad: "Ateş Destek Timi", gerekPuan: 4000, aciklama: "Düşman çözme hızı artar.", efekt: { saldiriBonus: 0.06 } },
      { ad: "Saha Komuta Hattı", gerekPuan: 5800, aciklama: "Tutulan hatlar daha dayanıklı olur.", efekt: { garnizonBonus: 0.09 } },
      { ad: "Kentsel Harp Doktrini", gerekPuan: 8200, aciklama: "Tam saha taktik uzmanlığı.", efekt: { saldiriBonus: 0.08, garnizonBonus: 0.08 } },
    ],
  },
  lojistik: {
    ad: "Lojistik",
    ikon: "🚚",
    aciklama: "Hat planlama, bakım ve sevkiyat verimliliği.",
    seviyeler: [
      { ad: "Rota Planlama", gerekPuan: 180, aciklama: "Bölge tutma hatları optimize edilir.", efekt: { garnizonBonus: 0.03 } },
      { ad: "Vardiya Düzeni", gerekPuan: 470, aciklama: "Eğitim döngüsü hızlanır.", efekt: { egitimSureAzaltma: 1 } },
      { ad: "Saha Depoları", gerekPuan: 940, aciklama: "Mühimmat erişimi iyileşir.", efekt: { garnizonBonus: 0.05 } },
      { ad: "Yakıt Hatları", gerekPuan: 1620, aciklama: "Saldırı birlikleri daha hazır olur.", efekt: { saldiriBonus: 0.04 } },
      { ad: "Hızlı Sevkiyat", gerekPuan: 2720, aciklama: "Dağıtım gücü artar.", efekt: { garnizonBonus: 0.07 } },
      { ad: "Mobil Komuta", gerekPuan: 4020, aciklama: "Saha operasyon kalitesi artar.", efekt: { saldiriBonus: 0.05 } },
      { ad: "Bakım Zinciri", gerekPuan: 5850, aciklama: "Ekipman maliyeti azaltılır.", efekt: { tetikciMaliyetIndirim: 0.04 } },
      { ad: "Stratejik Lojistik", gerekPuan: 8300, aciklama: "Lojistik ağ üst seviyeye çıkar.", efekt: { garnizonBonus: 0.08, saldiriBonus: 0.06 } },
    ],
  },
  ekonomi: {
    ad: "Ekonomi",
    ikon: "💰",
    aciklama: "Gelir üretimi, gece ekonomisi ve para akışı.",
    seviyeler: [
      { ad: "Tahsilat Defteri", gerekPuan: 160, aciklama: "Bölgesel gelir artışı başlar.", efekt: { gelirBonus: 0.05 } },
      { ad: "Vergi Rotaları", gerekPuan: 420, aciklama: "Gelir toplama verimi yükselir.", efekt: { gelirBonus: 0.06 } },
      { ad: "Dağıtım Ağı", gerekPuan: 900, aciklama: "Düzenli küçük pasif gelir sağlar.", efekt: { pasifGelir: 10 } },
      { ad: "Gece Vardiyası", gerekPuan: 1550, aciklama: "Gece ekonomisi güçlenir.", efekt: { geceEkonomiBonus: 0.12 } },
      { ad: "Konsolide İşletme", gerekPuan: 2600, aciklama: "Gelir istikrarı artar.", efekt: { gelirBonus: 0.08 } },
      { ad: "Kumarhane Zinciri", gerekPuan: 3900, aciklama: "Gece piyasası daha karlı olur.", efekt: { geceEkonomiBonus: 0.18 } },
      { ad: "Finans Optimizasyonu", gerekPuan: 5700, aciklama: "Pasif gelir akışı yükselir.", efekt: { pasifGelir: 18 } },
      { ad: "Şehir Ekonomi Karteli", gerekPuan: 8100, aciklama: "Gelir ağı üst seviyeye taşınır.", efekt: { gelirBonus: 0.10, pasifGelir: 24 } },
    ],
  },
  finans: {
    ad: "Finans",
    ikon: "🏦",
    aciklama: "Nakit çevrimi, fon yönetimi ve gölge sermaye.",
    seviyeler: [
      { ad: "Ön Muhasebe", gerekPuan: 170, aciklama: "Temel pasif gelir oluşturur.", efekt: { pasifGelir: 8 } },
      { ad: "Nakit Akış Kontrolü", gerekPuan: 450, aciklama: "Günlük gelir kaybı azalır.", efekt: { gelirBonus: 0.05 } },
      { ad: "Risk Dağıtımı", gerekPuan: 950, aciklama: "Fon akışı daha dengeli olur.", efekt: { pasifGelir: 12 } },
      { ad: "Cephe Tedariki", gerekPuan: 1650, aciklama: "Operasyon finansmanı iyileşir.", efekt: { gelirBonus: 0.06 } },
      { ad: "Gecelik Pazar", gerekPuan: 2750, aciklama: "Gece kazancı büyür.", efekt: { geceEkonomiBonus: 0.12 } },
      { ad: "Büyüme Fonları", gerekPuan: 4050, aciklama: "Pasif gelir artar.", efekt: { pasifGelir: 16 } },
      { ad: "Ticari Sinerji", gerekPuan: 5900, aciklama: "Gelir motorları birleşir.", efekt: { gelirBonus: 0.07 } },
      { ad: "Gölge Bankası", gerekPuan: 8400, aciklama: "Üst seviye finans erişimi.", efekt: { pasifGelir: 24, gelirBonus: 0.08 } },
    ],
  },
  istihbarat: {
    ad: "İstihbarat",
    ikon: "🕵️",
    aciklama: "Keşif, karşı istihbarat ve operasyon hazırlığı.",
    seviyeler: [
      { ad: "Mahalle Gözleri", gerekPuan: 200, aciklama: "Keşif başarı oranı artar.", efekt: { kesifBonus: 0.08 } },
      { ad: "Sessiz Hat", gerekPuan: 500, aciklama: "Polis baskısı etkisi azalır.", efekt: { polisKorumaBonus: 0.08 } },
      { ad: "Dosya Toplama", gerekPuan: 1000, aciklama: "Hedef lider operasyonu güçlenir.", efekt: { suikastBonus: 0.05 } },
      { ad: "İçerden Adam", gerekPuan: 1700, aciklama: "Keşif ve olay kontrolü artar.", efekt: { kesifBonus: 0.10, olayKontrolBonus: 0.06 } },
      { ad: "Karakol Bağlantısı", gerekPuan: 2800, aciklama: "Baskın etkisi daha da düşer.", efekt: { polisKorumaBonus: 0.10 } },
      { ad: "Operasyon Odası", gerekPuan: 4100, aciklama: "Suikast planları güçlenir.", efekt: { suikastBonus: 0.07 } },
      { ad: "Bilgi Satışı", gerekPuan: 6000, aciklama: "Rastgele olay yönetimi güçlenir.", efekt: { olayKontrolBonus: 0.10 } },
      { ad: "Ülke Çapı Ağ", gerekPuan: 8600, aciklama: "İstihbarat tam ölçeğe ulaşır.", efekt: { kesifBonus: 0.12, suikastBonus: 0.10 } },
    ],
  },
  propaganda: {
    ad: "Propaganda",
    ikon: "📣",
    aciklama: "Kamu etkisi, kriz kontrolü ve baskı yönetimi.",
    seviyeler: [
      { ad: "Mahalle Yardımı", gerekPuan: 190, aciklama: "Olay etkileri biraz yumuşar.", efekt: { olayKontrolBonus: 0.05 } },
      { ad: "Yerel Medya", gerekPuan: 480, aciklama: "Polis baskısına karşı alan kazanılır.", efekt: { polisKorumaBonus: 0.05 } },
      { ad: "Sadakat Kampanyası", gerekPuan: 980, aciklama: "Gelir kaçışı azalır.", efekt: { gelirBonus: 0.04 } },
      { ad: "Etki Operasyonu", gerekPuan: 1680, aciklama: "Kriz yönetimi güçlenir.", efekt: { olayKontrolBonus: 0.08 } },
      { ad: "Kamu Ağı", gerekPuan: 2760, aciklama: "Baskınlara karşı zemin oluşturur.", efekt: { polisKorumaBonus: 0.07 } },
      { ad: "Gecelik Etkinlik", gerekPuan: 4080, aciklama: "Gece gelirlerine destek verir.", efekt: { geceEkonomiBonus: 0.10 } },
      { ad: "Gücü Meşrulaştırma", gerekPuan: 5950, aciklama: "Olay baskısı azalır.", efekt: { olayKontrolBonus: 0.10 } },
      { ad: "Kent Çapı Algı", gerekPuan: 8450, aciklama: "Kamu yönlendirme kapasitesi yükselir.", efekt: { olayKontrolBonus: 0.12, gelirBonus: 0.06 } },
    ],
  },
};

export const PUAN_PER_TUR = 3;
export const ARASTIRMA_DAL_IDLERI = Object.keys(ARASTIRMA_DALLARI);

function bosDalDurumu() {
  return { seviye: 0, puan: 0 };
}

function kategoriEfektToplami(kategori) {
  const ar = oyun.arastirma || {};
  let toplam = 0;
  Object.entries(ARASTIRMA_DALLARI).forEach(([dalId, dalBilgisi]) => {
    const seviye = Math.max(0, Math.floor(Number(ar?.[dalId]?.seviye) || 0));
    for (let i = 0; i < seviye; i += 1) {
      toplam += Number(dalBilgisi?.seviyeler?.[i]?.efekt?.[kategori] || 0);
    }
  });
  return toplam;
}

function personelTavanBonusunuYansit() {
  if (!oyun.ekonomi || typeof oyun.ekonomi !== "object") {
    oyun.ekonomi = { haracSeviye: "orta", alimBuTur: 0, sonHaracGeliri: 0, personelTavanEk: 0 };
  }
  oyun.ekonomi.personelTavanEk = Math.max(0, Math.round(kategoriEfektToplami("personelTavanBonus")));
}

export function arastirmaDurumunuDogrula() {
  if (!oyun.arastirma || typeof oyun.arastirma !== "object") {
    oyun.arastirma = { aktifDal: ARASTIRMA_DAL_IDLERI[0] };
  }
  const ar = oyun.arastirma;
  if (!ARASTIRMA_DALLARI[ar.aktifDal]) ar.aktifDal = ARASTIRMA_DAL_IDLERI[0];

  ARASTIRMA_DAL_IDLERI.forEach((dalId) => {
    if (!ar[dalId] || typeof ar[dalId] !== "object") {
      ar[dalId] = bosDalDurumu();
      return;
    }
    const maxSeviye = ARASTIRMA_DALLARI[dalId].seviyeler.length;
    const seviye = Number(ar[dalId].seviye);
    const puan = Number(ar[dalId].puan);
    ar[dalId].seviye = Number.isFinite(seviye) ? Math.max(0, Math.min(maxSeviye, Math.floor(seviye))) : 0;
    ar[dalId].puan = Number.isFinite(puan) ? Math.max(0, Math.floor(puan)) : 0;
  });
  personelTavanBonusunuYansit();
}

export function arastirmaPuanDetayi(owner = "biz") {
  const taban = PUAN_PER_TUR;
  const universite = oyun.bolgeler.filter(
    (b) => b.owner === owner && b.ozellik === "universite"
  ).length * 2;
  const laboratuvar = oyun.bolgeler
    .filter((b) => b.owner === owner)
    .reduce((toplam, b) => {
      return toplam + (b.binalar || []).reduce((araToplam, kayit) => {
        if (kayit.tip !== "laboratuvar") return araToplam;
        return araToplam + (kayit.seviye || 1);
      }, 0);
    }, 0);

  return {
    taban,
    universite,
    laboratuvar,
    toplam: taban + universite + laboratuvar,
  };
}

export function arastirmaTick(ekPuan = 0) {
  arastirmaDurumunuDogrula();
  const ar = oyun.arastirma;

  // Laboratuvar bonusu main.js'den ekPuan olarak gelir; burada tekrar sayılmamalı.
  const puan = arastirmaPuanDetayi("biz");
  const toplamPuan = puan.taban + puan.universite + ekPuan;
  const aktifDal = ar.aktifDal || ARASTIRMA_DAL_IDLERI[0];
  const dal = ar[aktifDal];
  if (!dal) return;

  dal.puan = (dal.puan || 0) + toplamPuan;

  const dalBilgisi = ARASTIRMA_DALLARI[aktifDal];
  const hedefSeviye = dalBilgisi?.seviyeler[dal.seviye];
  if (hedefSeviye && dal.puan >= hedefSeviye.gerekPuan) {
    dal.seviye++;
    logYaz(`🔬 ${dalBilgisi.ad}: "${hedefSeviye.ad}" açıldı!`);
    sesCal("arastirma-seviye");
    showToast(`🔬 ${hedefSeviye.ad} açıldı!`, "gorev", 5000);
  }
}

export function arastirmaEfekt(kategori) {
  arastirmaDurumunuDogrula();
  const ar = oyun.arastirma;
  let toplam = 0;
  Object.entries(ARASTIRMA_DALLARI).forEach(([dalId, dalBilgisi]) => {
    const dalDurum = ar[dalId];
    if (!dalDurum) return;
    for (let i = 0; i < dalDurum.seviye; i++) {
      const efekt = dalBilgisi.seviyeler[i]?.efekt;
      if (efekt?.[kategori]) toplam += efekt[kategori];
    }
  });
  return toplam;
}

export function arastirmaDalDegistir(dal) {
  arastirmaDurumunuDogrula();
  if (!ARASTIRMA_DALLARI[dal]) return;
  oyun.arastirma.aktifDal = dal;
  logYaz(`🔬 Araştırma odağı: ${ARASTIRMA_DALLARI[dal].ad}`);
}

export function dalIlerleme(dalId) {
  arastirmaDurumunuDogrula();
  const ar = oyun.arastirma?.[dalId];
  if (!ar) return 0;
  const seviyeler = ARASTIRMA_DALLARI[dalId]?.seviyeler;
  if (!seviyeler) return 0;
  const hedef = seviyeler[ar.seviye];
  if (!hedef) return 100;
  return Math.min(100, Math.round((ar.puan / hedef.gerekPuan) * 100));
}
