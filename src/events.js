import { oyun, bolgeById, yiginaEkle } from "./state.js";
import { OLAY_AYAR, BOLGE_OZELLIKLERI } from "./config.js";
import { logYaz } from "./ui.js";
import { arastirmaEfekt } from "./research.js";

function secRastgele(liste) {
  if (!liste.length) return null;
  return liste[Math.floor(Math.random() * liste.length)];
}

function secAgirlikli(liste) {
  if (!liste.length) return null;
  const toplam = liste.reduce((t, oge) => t + Math.max(0, oge.agirlik || 0), 0);
  if (toplam <= 0) return null;
  let r = Math.random() * toplam;
  for (const oge of liste) {
    r -= Math.max(0, oge.agirlik || 0);
    if (r <= 0) return oge;
  }
  return liste[liste.length - 1];
}

function ownerAd(owner) {
  return oyun.fraksiyon[owner]?.ad || owner;
}

function binaSeviye(bolge, tip) {
  return (bolge.binalar || []).find((b) => b.tip === tip)?.seviye || 0;
}

function kayitSil(bolge, tip) {
  bolge.binalar = (bolge.binalar || []).filter((b) => b.tip !== tip);
}

function aktifBolgeler() {
  return oyun.bolgeler.filter((b) => b.owner !== "tarafsiz");
}

function bizBolgeleri() {
  return oyun.bolgeler.filter((b) => b.owner === "biz");
}

function bolgeAgirlikModu(bolge, olayTipi) {
  let agirlik = 1;
  if (olayTipi === "negatif") {
    if (bolge.owner === "biz") {
      agirlik *= 1 - Math.min(0.65, arastirmaEfekt("olayKontrolBonus"));
      agirlik *= 1 - Math.min(0.5, arastirmaEfekt("polisKorumaBonus"));
    }
    if (bolge.ozellik && BOLGE_OZELLIKLERI[bolge.ozellik]?.riskli) agirlik *= 2;
  }
  if (olayTipi === "pozitif" && bolge.owner === "biz") {
    agirlik *= 1 + Math.min(0.5, arastirmaEfekt("olayKontrolBonus"));
  }
  return Math.max(0.15, agirlik);
}

const OLAYLAR = [
  {
    id: "polis_baskini",
    ad: "🚔 Polis Baskını",
    tip: "negatif",
    adaylar() {
      return aktifBolgeler().map((bolge) => ({
        bolgeId: bolge.id,
        agirlik:
          (3 + (bolge.yGuv || 0) * 0.2 + binaSeviye(bolge, "karargah") * 0.5) *
          bolgeAgirlikModu(bolge, "negatif"),
      }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      const stackler = oyun.birimler.filter((k) => k.konumId === bolge.id && k.owner === bolge.owner);
      stackler.forEach((k) => {
        k.adet = Math.max(1, Math.floor(k.adet * 0.7));
      });
      if (oyun.fraksiyon[bolge.owner]) {
        oyun.fraksiyon[bolge.owner].para = Math.max(0, oyun.fraksiyon[bolge.owner].para - 180);
      }
      return { mesaj: `${bolge.ad} bölgesinde baskın yapıldı. Birlikler dağıldı ve ${ownerAd(bolge.owner)} 180₺ kaybetti.` };
    },
  },
  {
    id: "bina_yangini",
    ad: "🔥 Bina Yangını",
    tip: "negatif",
    adaylar() {
      return aktifBolgeler()
        .filter((bolge) => (bolge.binalar || []).length > 0)
        .map((bolge) => ({
          bolgeId: bolge.id,
          agirlik: (2 + (bolge.binalar || []).length) * bolgeAgirlikModu(bolge, "negatif"),
        }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge || !(bolge.binalar || []).length) return null;
      const kayit = secRastgele(bolge.binalar);
      if (!kayit) return null;
      const tip = kayit.tip;
      kayit.seviye -= 1;
      if (kayit.seviye <= 0) kayitSil(bolge, tip);
      return { mesaj: `${bolge.ad} bölgesindeki ${tip} binası yangında hasar gördü.` };
    },
  },
  {
    id: "ic_hesaplasma",
    ad: "⚠️ İç Hesaplaşma",
    tip: "negatif",
    adaylar() {
      return aktifBolgeler()
        .filter((bolge) => (bolge.sadakat || 50) < 45)
        .map((bolge) => ({
          bolgeId: bolge.id,
          agirlik: (55 - (bolge.sadakat || 50)) * bolgeAgirlikModu(bolge, "negatif"),
        }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      const stackler = oyun.birimler.filter((k) => k.konumId === bolge.id && k.owner === bolge.owner);
      if (stackler.length) {
        const hedef = secRastgele(stackler);
        hedef.adet = Math.max(1, hedef.adet - 2);
      }
      bolge.sadakat = Math.max(0, (bolge.sadakat || 50) - 12);
      return { mesaj: `${bolge.ad} içinde hizip kavgası çıktı. Sadakat düştü ve savunma zayıfladı.` };
    },
  },
  {
    id: "ekonomik_kriz",
    ad: "📉 Ekonomik Kriz",
    tip: "negatif",
    adaylar() {
      return ["biz", "ai1", "ai2", "ai3"]
        .filter((id) => oyun.fraksiyon[id])
        .map((owner) => ({ owner, agirlik: owner === "biz" ? 2 : 1.5 }));
    },
    uygula({ owner }) {
      const fr = oyun.fraksiyon[owner];
      if (!fr) return null;
      fr._krizBitis = oyun.tur + 4;
      return { mesaj: `${fr.ad} ekonomik krize girdi. Gelirleri 4 tur boyunca düşecek.` };
    },
  },
  {
    id: "mahalle_destegi",
    ad: "🤝 Mahalle Desteği",
    tip: "pozitif",
    adaylar() {
      return aktifBolgeler().map((bolge) => ({
        bolgeId: bolge.id,
        agirlik: (2 + ((bolge.sadakat || 50) / 20)) * bolgeAgirlikModu(bolge, "pozitif"),
      }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      bolge.sadakat = Math.min(100, (bolge.sadakat || 50) + 10);
      if (oyun.fraksiyon[bolge.owner]) oyun.fraksiyon[bolge.owner].para += 120;
      return { mesaj: `${bolge.ad} mahallesi sahip çıktı. Sadakat arttı ve kasaya 120₺ girdi.` };
    },
  },
  {
    id: "kacakcilik_hatti",
    ad: "🚛 Kaçakçılık Hattı",
    tip: "pozitif",
    adaylar() {
      return aktifBolgeler()
        .filter((bolge) => bolge.ozellik === "liman" || bolge.ozellik === "carsi" || bolge.ozellik === "kumarhane")
        .map((bolge) => ({ bolgeId: bolge.id, agirlik: 3 * bolgeAgirlikModu(bolge, "pozitif") }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      const gelir = bolge.ozellik === "kumarhane" ? 260 : 180;
      oyun.fraksiyon[bolge.owner].para += gelir;
      return { mesaj: `${bolge.ad} üzerinden kurulan yeni hat ${ownerAd(bolge.owner)} kasasına ${gelir}₺ getirdi.` };
    },
  },
  {
    id: "muhbir",
    ad: "🕵️ Muhbir",
    tip: "pozitif",
    adaylar() {
      return oyun.bolgeler
        .filter((bolge) => bolge.owner !== "biz" && bolge.owner !== "tarafsiz")
        .map((bolge) => ({ bolgeId: bolge.id, agirlik: 2.5 }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      bolge._kesif = { bitis: oyun.tur + 5 };
      return { mesaj: `${bolge.ad} için içeriden bilgi geldi. Bölge 5 tur boyunca keşif altında.` };
    },
  },
  {
    id: "goc_dalgasi",
    ad: "🏘️ Göç Dalgası",
    tip: "pozitif",
    adaylar() {
      return aktifBolgeler().map((bolge) => ({ bolgeId: bolge.id, agirlik: 2.2 }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      const artis = Math.ceil((bolge.nufus || 60) * 0.2);
      bolge.nufus = Math.min((bolge.nufusMax || bolge.nufus || 0) + artis, (bolge.nufusMax || 0) * 1.25);
      bolge.nufusMax = Math.max(bolge.nufusMax || 0, bolge.nufus);
      return { mesaj: `${bolge.ad} yeni göç aldı. Nüfus hızla büyüdü.` };
    },
  },
  {
    id: "sokak_atismasi",
    ad: "💥 Sokak Çatışması",
    tip: "negatif",
    adaylar() {
      return aktifBolgeler().map((bolge) => ({
        bolgeId: bolge.id,
        agirlik: (1.5 + binaSeviye(bolge, "depo") * 0.4) * bolgeAgirlikModu(bolge, "negatif"),
      }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      bolge.guv = Math.max(1, (bolge.guv || 1) - 1);
      bolge.sadakat = Math.max(0, (bolge.sadakat || 50) - 8);
      return { mesaj: `${bolge.ad} sokaklarında sert çatışmalar yaşandı. Güvenlik ve sadakat düştü.` };
    },
  },
  {
    id: "arastirma_atilimi",
    ad: "🧪 Araştırma Atılımı",
    tip: "pozitif",
    adaylar() {
      return bizBolgeleri()
        .filter((bolge) => bolge.ozellik === "universite" || binaSeviye(bolge, "laboratuvar") > 0)
        .map((bolge) => ({
          bolgeId: bolge.id,
          agirlik: 2 + binaSeviye(bolge, "laboratuvar"),
        }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      const puan = 12 + binaSeviye(bolge, "laboratuvar") * 6;
      oyun.arastirma[oyun.arastirma.aktifDal].puan += puan;
      return { mesaj: `${bolge.ad} kaynaklı araştırma ivmesi ${puan} ek puan kazandırdı.` };
    },
  },
  {
    id: "cephane_sevkiyati",
    ad: "📦 Cephane Sevkiyatı",
    tip: "pozitif",
    adaylar() {
      return bizBolgeleri().map((bolge) => ({
        bolgeId: bolge.id,
        agirlik: 1.6 + binaSeviye(bolge, "depo"),
      }));
    },
    uygula({ bolgeId }) {
      const bolge = bolgeById(bolgeId);
      if (!bolge) return null;
      yiginaEkle(bolge.id, "biz", 5 + binaSeviye(bolge, "depo") * 2);
      return { mesaj: `${bolge.ad} için yeni cephane ve adam sevkiyatı ulaştı.` };
    },
  },
];

function olayHavuzuOlustur() {
  const havuz = [];
  OLAYLAR.forEach((olay) => {
    const adaylar = olay.adaylar();
    adaylar.forEach((aday) => {
      if ((aday.agirlik || 0) > 0) havuz.push({ olay, aday, agirlik: aday.agirlik });
    });
  });
  return havuz;
}

export function olayTick() {
  if (oyun.tur < oyun.olaylar.sonrakiTur) return;

  const havuz = olayHavuzuOlustur();
  const secim = secAgirlikli(havuz);
  if (secim) {
    const sonuc = secim.olay.uygula(secim.aday);
    if (sonuc?.mesaj) {
      logYaz(`[OLAY] ${secim.olay.ad}: ${sonuc.mesaj}`);
      oyun.olaylar.gecmis.push({
        tur: oyun.tur,
        id: secim.olay.id,
        ad: secim.olay.ad,
        mesaj: sonuc.mesaj,
      });
    }
  }

  const { minAra, maxAra } = OLAY_AYAR;
  oyun.olaylar.sonrakiTur =
    oyun.tur + minAra + Math.floor(Math.random() * (maxAra - minAra + 1));
}

export function krizCarpani(owner) {
  const fr = oyun.fraksiyon[owner];
  if (!fr || !fr._krizBitis) return 1.0;
  if (oyun.tur > fr._krizBitis) {
    delete fr._krizBitis;
    return 1.0;
  }
  return 0.6;
}
