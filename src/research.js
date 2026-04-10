// research.js — Araştırma / Gelişim Ağacı (Geniş Ağaç Yapısı)

import { oyun } from "./state.js";
import { logYaz } from "./ui.js";
import { showToast } from "./modal.js";
import { sesCal } from "./audio.js";

export const ARASTIRMA_DALLARI = {
  org: {
    ad: "Komuta ve Personel",
    ikon: "🧱",
    aciklama: "Adam alımı, kadro sürdürülebilirliği ve personel kapasitesi.",
    seviyeler: [
      { ad: "Sokak Hücreleri", gerekPuan: 220, aciklama: "Temel işe alım düzeni kurulur.", efekt: { tetikciMaliyetIndirim: 0.03, alimTurKotasiBonus: 1 } },
      { ad: "İstihdam Bürosu", gerekPuan: 640, aciklama: "İşe alım masrafı ve personel baskısı azalır.", efekt: { alimEkMaliyetAzaltma: 0.05, personelTavanBonus: 8 } },
      { ad: "Kadro Denetimi", gerekPuan: 1350, aciklama: "Hızlı alımın sadakat cezası hafifletilir.", efekt: { alimSadakatCezaAzaltma: 0.08, personelTavanBonus: 8 } },
      { ad: "Disiplin Zinciri", gerekPuan: 2300, aciklama: "Eğitim döngüsü kısalır, tur kotası genişler.", efekt: { egitimSureAzaltma: 1, alimTurKotasiBonus: 1 } },
      { ad: "Bölge Komutanlıkları", gerekPuan: 3600, aciklama: "Saha tutuşu ve personel kontrolü güçlenir.", efekt: { garnizonBonus: 0.04, personelTavanBonus: 12 } },
      { ad: "Personel Rotasyonu", gerekPuan: 5400, aciklama: "Yoğun alımın ekonomik-sosyal yükü dengelenir.", efekt: { alimEkMaliyetAzaltma: 0.06, alimSadakatCezaAzaltma: 0.07 } },
      { ad: "Ana Karargah Ağı", gerekPuan: 7800, aciklama: "Yönetim zinciri hızlanır.", efekt: { egitimSureAzaltma: 1, personelTavanBonus: 16 } },
      { ad: "Şehir Seferberliği", gerekPuan: 10800, aciklama: "Üst düzey kadro organizasyonu.", efekt: { personelTavanBonus: 24, alimTurKotasiBonus: 2, tetikciMaliyetIndirim: 0.05 } },
    ],
  },
  taktik: {
    ad: "Savaş Doktrini",
    ikon: "⚔️",
    aciklama: "Taarruz gücü, savunma disiplinleri ve isyan bastırma kabiliyeti.",
    seviyeler: [
      { ad: "Yakın Çatışma Talimi", gerekPuan: 240, aciklama: "Temel hücum verimi artar.", efekt: { saldiriBonus: 0.02 } },
      { ad: "Barikat Doktrini", gerekPuan: 680, aciklama: "Bölge savunması güçlenir.", efekt: { garnizonBonus: 0.03 } },
      { ad: "Baskın Protokolü", gerekPuan: 1420, aciklama: "Taarruz planları netleşir.", efekt: { saldiriBonus: 0.03 } },
      { ad: "Mahalle Tahkimi", gerekPuan: 2400, aciklama: "Savunma hatları derinleşir.", efekt: { garnizonBonus: 0.04 } },
      { ad: "Karşı İsyan Ekipleri", gerekPuan: 3700, aciklama: "İsyan bastırma organizasyonu kurulur.", efekt: { isyanBastirmaBonus: 0.08, garnizonBonus: 0.03 } },
      { ad: "Operasyon Simülasyonu", gerekPuan: 5500, aciklama: "Sahadaki karar hızı artar.", efekt: { saldiriBonus: 0.04 } },
      { ad: "Katmanlı Savunma", gerekPuan: 7900, aciklama: "Uzun cephelerde dayanıklılık artar.", efekt: { garnizonBonus: 0.05, isyanBastirmaBonus: 0.08 } },
      { ad: "Kentsel Harp Doktrini", gerekPuan: 11000, aciklama: "Tam ölçekli çatışma üstünlüğü.", efekt: { saldiriBonus: 0.06, garnizonBonus: 0.06, isyanBastirmaBonus: 0.09 } },
    ],
  },
  lojistik: {
    ad: "Lojistik ve Filo",
    ikon: "🚗",
    aciklama: "Araba/motor tedariki, filo tavanı ve bakım dengesi.",
    seviyeler: [
      { ad: "Filo Envanteri", gerekPuan: 210, aciklama: "Taşıt alım maliyeti düşmeye başlar.", efekt: { tasitMaliyetIndirim: 0.05 } },
      { ad: "Bakım Planlama", gerekPuan: 610, aciklama: "Toplam bakım yükü hafifler.", efekt: { bakimIndirim: 0.03 } },
      { ad: "Sevk Koridorları", gerekPuan: 1280, aciklama: "Taşıt kapasite tavanı genişler.", efekt: { tasitTavanBonus: 8 } },
      { ad: "Garaj Ağı", gerekPuan: 2200, aciklama: "Filo büyütme maliyeti optimize edilir.", efekt: { tasitMaliyetIndirim: 0.06, tasitTavanBonus: 10 } },
      { ad: "Akaryakıt Anlaşmaları", gerekPuan: 3500, aciklama: "Saha hareketinin sürdürülebilirliği artar.", efekt: { bakimIndirim: 0.04 } },
      { ad: "Hızlı Nakliye", gerekPuan: 5200, aciklama: "Taşıt operasyon verimi güçlenir.", efekt: { tasitHirsizlikBonus: 0.03, tasitTavanBonus: 12 } },
      { ad: "Yedek Parça Havuzu", gerekPuan: 7600, aciklama: "Filo maliyeti daha da düşer.", efekt: { bakimIndirim: 0.05, tasitMaliyetIndirim: 0.04 } },
      { ad: "Bölgesel Lojistik Komuta", gerekPuan: 10600, aciklama: "Şehir çapı lojistik hakimiyeti.", efekt: { tasitTavanBonus: 18, bakimIndirim: 0.06, tasitMaliyetIndirim: 0.05 } },
    ],
  },
  ekonomi: {
    ad: "Haraç ve Gelir",
    ikon: "💰",
    aciklama: "Bölgesel gelir, pasif nakit ve gece ekonomisi ölçeklenmesi.",
    seviyeler: [
      { ad: "Tahsilat Optimizasyonu", gerekPuan: 200, aciklama: "Temel gelir akışı güçlenir.", efekt: { gelirBonus: 0.04, haracGelirBonus: 0.03 } },
      { ad: "Mahalle Muhasebesi", gerekPuan: 560, aciklama: "Sabit nakit akışı başlar.", efekt: { pasifGelir: 8 } },
      { ad: "Gece Tahsilat Hatları", gerekPuan: 1220, aciklama: "Gece bölgesi gelirleri artar.", efekt: { geceEkonomiBonus: 0.08 } },
      { ad: "Vergi İstasyonu", gerekPuan: 2100, aciklama: "Haraç verimliliği yükselir.", efekt: { gelirBonus: 0.05, haracGelirBonus: 0.04 } },
      { ad: "Kaçak Pazar Yönetimi", gerekPuan: 3350, aciklama: "Pasif nakit ve gece geliri birlikte büyür.", efekt: { pasifGelir: 12, geceEkonomiBonus: 0.08 } },
      { ad: "Gelir Konsolidasyonu", gerekPuan: 5000, aciklama: "Bölgesel para akışı stabilize olur.", efekt: { gelirBonus: 0.06 } },
      { ad: "Sermaye Biriktirme", gerekPuan: 7300, aciklama: "Uzun vadeli kasaya güçlü katkı sağlar.", efekt: { pasifGelir: 16, haracGelirBonus: 0.05 } },
      { ad: "Şehir Finans Motoru", gerekPuan: 10200, aciklama: "Gelir altyapısı tam ölçeğe çıkar.", efekt: { gelirBonus: 0.07, pasifGelir: 22, geceEkonomiBonus: 0.10 } },
    ],
  },
  finans: {
    ad: "Ticari Finans",
    ikon: "🏦",
    aciklama: "Sermaye dayanıklılığı, kriz tamponları ve sözleşme yönetimi.",
    seviyeler: [
      { ad: "Ön Muhasebe", gerekPuan: 240, aciklama: "Küçük ölçekli finansal tampon oluşturur.", efekt: { pasifGelir: 6 } },
      { ad: "Sözleşme Takibi", gerekPuan: 680, aciklama: "Gelir kaçakları azalır, diplomatik masraf düşer.", efekt: { gelirBonus: 0.03, diplomasiMaliyetIndirim: 0.04 } },
      { ad: "Gölge Fonlar", gerekPuan: 1450, aciklama: "Gece pazarına finans desteği sağlar.", efekt: { geceEkonomiBonus: 0.06 } },
      { ad: "Alacak Yönetimi", gerekPuan: 2450, aciklama: "Haraç akışında verimlilik sağlar.", efekt: { haracGelirBonus: 0.04 } },
      { ad: "Risk Dağıtımı", gerekPuan: 3800, aciklama: "Olumsuz olay baskısı hafifler, anlaşma maliyetleri azalır.", efekt: { olayKontrolBonus: 0.05, diplomasiMaliyetIndirim: 0.05 } },
      { ad: "Kriz Rezervi", gerekPuan: 5600, aciklama: "Polis dalgası dönemlerinde koruma artar.", efekt: { polisKorumaBonus: 0.05 } },
      { ad: "Ticari Etki Ağı", gerekPuan: 8100, aciklama: "Gelir-pasif akış birlikte büyür.", efekt: { gelirBonus: 0.04, pasifGelir: 10 } },
      { ad: "Finansal Şemsiye", gerekPuan: 11200, aciklama: "Krizlerde mali direnç sağlar.", efekt: { olayKontrolBonus: 0.06, polisKorumaBonus: 0.06, pasifGelir: 12, diplomasiMaliyetIndirim: 0.06 } },
    ],
  },
  istihbarat: {
    ad: "İstihbarat",
    ikon: "🕵️",
    aciklama: "Keşif/suikast operasyonları, maliyet verimi ve süre kontrolü.",
    seviyeler: [
      { ad: "Mahalle Muhbirleri", gerekPuan: 250, aciklama: "Keşif başarı oranı ve kalış süresi artar.", efekt: { kesifBonus: 0.07, kesifSureBonus: 1 } },
      { ad: "Sızma Eğitimi", gerekPuan: 720, aciklama: "Operasyon maliyeti düşer.", efekt: { suikastBonus: 0.04, operasyonMaliyetIndirim: 0.04 } },
      { ad: "Karşı Takip", gerekPuan: 1520, aciklama: "Karşı istihbarat koruması büyür.", efekt: { kesifBonus: 0.06, polisKorumaBonus: 0.04 } },
      { ad: "Arşiv Ağı", gerekPuan: 2560, aciklama: "Keşif kalıcılığı ve saha verimi artar.", efekt: { kesifSureBonus: 1, operasyonMaliyetIndirim: 0.05 } },
      { ad: "Hedef Profilleme", gerekPuan: 3960, aciklama: "Suikast planları keskinleşir.", efekt: { suikastBonus: 0.05, tasitHirsizlikBonus: 0.04 } },
      { ad: "Gizli İkmal", gerekPuan: 5850, aciklama: "Operasyon maliyeti tekrar düşer.", efekt: { operasyonMaliyetIndirim: 0.05, kesifBonus: 0.05 } },
      { ad: "Derin Hücreler", gerekPuan: 8450, aciklama: "Uzun vadeli istihbarat baskısı kurulur.", efekt: { suikastBonus: 0.06, kesifSureBonus: 1 } },
      { ad: "Ülke Çapı Ağ", gerekPuan: 11600, aciklama: "İstihbarat operasyonlarında üst seviye hakimiyet.", efekt: { kesifBonus: 0.08, suikastBonus: 0.07, operasyonMaliyetIndirim: 0.06 } },
    ],
  },
  propaganda: {
    ad: "Asayiş ve Nüfuz",
    ikon: "📣",
    aciklama: "Suçluluk/polis dengesi, olay baskısı ve isyan risk yönetimi.",
    seviyeler: [
      { ad: "Mahalle Temsilcileri", gerekPuan: 230, aciklama: "Olay baskısı hafifler.", efekt: { olayKontrolBonus: 0.04 } },
      { ad: "Polis Bağlantıları", gerekPuan: 660, aciklama: "Baskın riski ilk kez düşürülür.", efekt: { polisKorumaBonus: 0.05, polisBaskinRiskAzaltma: 0.05 } },
      { ad: "Kriz İletişimi", gerekPuan: 1380, aciklama: "İsyan ihtimali kontrol altına alınır.", efekt: { olayKontrolBonus: 0.05, isyanRiskAzaltma: 0.05 } },
      { ad: "Sosyal Yardım Ağları", gerekPuan: 2320, aciklama: "Sadakat kayıpları yumuşatılır.", efekt: { haracSadakatCezaAzaltma: 0.08, alimSadakatCezaAzaltma: 0.05 } },
      { ad: "Kamu İmajı", gerekPuan: 3680, aciklama: "Suçluluk kaynaklı baskı düşer.", efekt: { polisKorumaBonus: 0.06, suclulukArtisAzaltma: 0.06 } },
      { ad: "Arabulucu Kadro", gerekPuan: 5480, aciklama: "Polis artışı ve isyan riski azalır.", efekt: { isyanRiskAzaltma: 0.08, haracPolisArtisAzaltma: 0.08 } },
      { ad: "Basın ve Sokak", gerekPuan: 7950, aciklama: "Kriz dönemlerinde denge korunur.", efekt: { olayKontrolBonus: 0.07, polisBaskinRiskAzaltma: 0.08 } },
      { ad: "Şehir Etki Operasyonu", gerekPuan: 11050, aciklama: "Asayiş katmanları maksimum seviyeye çıkar.", efekt: { olayKontrolBonus: 0.08, polisKorumaBonus: 0.08, suclulukArtisAzaltma: 0.10, isyanRiskAzaltma: 0.10 } },
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
