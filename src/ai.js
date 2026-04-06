import { oyun, sohretCarpani, bolgeById } from "./state.js";
import { komsuMu } from "./map.js";
import { logYaz } from "./ui.js";
import { ZORLUK, AYAR, MEKANIK, BOLGE_OZELLIKLERI, BINA_TIPLERI } from "./config.js";
import { savasKazanmaIhtimali, saldiriMaliyeti } from "./combat.js";
import { yiginaEkle, tileToplam } from "./state.js";
import { krizCarpani } from "./events.js";
import { BIRIM_TIPLERI, TASIT_TIPLERI, ownerBakimToplami } from "./units.js";
import { ARASTIRMA_DALLARI } from "./research.js";
import { konvoyBaslaAnimasyonu } from "./animations.js";
import {
  bolgeTasitDurumu,
  bolgeTasitAyir,
  bolgeTasitIadeEt,
  ownerUygunTasitliBolgeBul,
} from "./logistics.js";

function liderBonus(fr, tip) {
  return fr.lider?.bonus?.[tip] || 0;
}

function bolgeBonus(b, tip) {
  if (!b.ozellik) return 0;
  const oz = BOLGE_OZELLIKLERI[b.ozellik];
  return oz ? (oz[tip] || 0) : 0;
}

function binaBonus(b, tip) {
  return (b.binalar || []).reduce((toplam, kayit) => {
    const tanim = BINA_TIPLERI[kayit.tip];
    return toplam + ((tanim?.etkiler?.[tip] || 0) * (kayit.seviye || 1));
  }, 0);
}

function aiArastirmaDurumu(fr) {
  if (!fr._arastirma) {
    fr._arastirma = {
      aktifDal: "org",
      org: { seviye: 0, puan: 0 },
      ekonomi: { seviye: 0, puan: 0 },
      istihbarat: { seviye: 0, puan: 0 },
    };
  }
  return fr._arastirma;
}

function aiArastirmaEfekt(id, kategori) {
  const ar = oyun.fraksiyon[id]?._arastirma;
  if (!ar) return 0;
  let toplam = 0;
  Object.entries(ARASTIRMA_DALLARI).forEach(([dalId, dalBilgisi]) => {
    const durum = ar[dalId];
    if (!durum) return;
    for (let i = 0; i < durum.seviye; i++) {
      const efekt = dalBilgisi.seviyeler[i]?.efekt;
      if (efekt?.[kategori]) toplam += efekt[kategori];
    }
  });
  return toplam;
}

export function aiArastirmaTick(id) {
  const fr = oyun.fraksiyon[id];
  if (!fr) return;
  const ar = aiArastirmaDurumu(fr);
  const sahip = oyun.bolgeler.filter((b) => b.owner === id);
  const univBonus = sahip.filter((b) => b.ozellik === "universite").length * 2;
  const labBonus = sahip.reduce((t, b) => t + binaBonus(b, "arastirmaBonus"), 0);
  const aktifDal = ar.aktifDal || "org";
  const dal = ar[aktifDal];
  if (!dal) return;

  dal.puan += 2 + univBonus + labBonus;
  const hedef = ARASTIRMA_DALLARI[aktifDal]?.seviyeler[dal.seviye];
  if (hedef && dal.puan >= hedef.gerekPuan) {
    dal.seviye++;
    if (dal.seviye >= 3 && aktifDal === "org") ar.aktifDal = "ekonomi";
    else if (dal.seviye >= 3 && aktifDal === "ekonomi") ar.aktifDal = "istihbarat";
    else if (dal.seviye >= 3 && aktifDal === "istihbarat") ar.aktifDal = Math.random() < 0.5 ? "org" : "ekonomi";
    logYaz(`🧠 ${fr.ad} araştırmada ilerledi: ${hedef.ad}.`);
  }
}

function aiGarnizonKapasitesi(id, bolge) {
  const taban = Math.max(10, Math.round((bolge.nufusMax || bolge.nufus || 60) / 8));
  return Math.round(taban * (1 + aiArastirmaEfekt(id, "garnizonBonus")) + (bolge.yGuv || 0) * 2);
}

function aiBirlikOlustur(owner, bolgeId, tip, adet = 1) {
  const birim = {
    id: `k${++oyun.birimSayac}`,
    owner,
    adet,
    tip,
    konumId: bolgeId,
    hedefId: null,
    rota: [],
    durum: "bekle",
  };
  if (tip === "genc") {
    birim.egitimKalan = Math.max(2, BIRIM_TIPLERI.genc.egitimTur - aiArastirmaEfekt(owner, "egitimSureAzaltma"));
  } else if (BIRIM_TIPLERI[tip]?.terfiTur) {
    birim.terfiKalan = BIRIM_TIPLERI[tip].terfiTur;
  }
  oyun.birimler.push(birim);
}

function aiUretimTipiSec(id, bolge, fr) {
  const agirVar = oyun.birimler.some((b) => b.owner === id && b.tip === "agir_silahli");
  if ((bolge.ozellik === "gecekondu" || fr.para < 180) && Math.random() < 0.55) return "genc";
  if (!agirVar && fr.para < 260 && Math.random() < 0.4) return "genc";
  return Math.random() < 0.35 ? "genc" : "tetikci";
}

function aiSadakatYonet(id, sahip) {
  const fr = oyun.fraksiyon[id];
  if (!fr) return;
  const dusukler = sahip
    .filter((b) => (b.sadakat || 55) < 45)
    .sort((a, b) => (a.sadakat || 55) - (b.sadakat || 55));
  dusukler.forEach((b, idx) => {
    if (idx > 1) return;
    if (fr.para >= 80 * (1 + (b.yGuv || 0))) {
      fr.para -= 80 * (1 + (b.yGuv || 0));
      b.yGuv = (b.yGuv || 0) + 1;
      b.sadakat = Math.min(100, (b.sadakat || 55) + 8);
    } else if (fr.para >= 100 * (1 + (b.yGel || 0))) {
      fr.para -= 100 * (1 + (b.yGel || 0));
      b.yGel = (b.yGel || 0) + 1;
      b.sadakat = Math.min(100, (b.sadakat || 55) + 5);
    }
  });
}

function aiBinaMaliyeti(fr, tip, seviye) {
  const tanim = BINA_TIPLERI[tip];
  if (!tanim) return Infinity;
  const carp = tanim.seviyeMaliyetCarpani || 1.5;
  const ham = tanim.maliyet * Math.pow(carp, Math.max(0, seviye - 1));
  const indirim = liderBonus(fr, "binaMaliyetiIndirim");
  return Math.ceil(ham * (1 - indirim));
}

function aiBinaTipiSec(id, bolge) {
  const mevcut = new Set((bolge.binalar || []).map((b) => b.tip));
  if ((bolge.sadakat || 55) < 38 && !mevcut.has("karargah")) return "karargah";
  if (bolge.ozellik === "universite" && !mevcut.has("laboratuvar")) return "laboratuvar";
  if ((bolge.ozellik === "gecekondu" || (bolge.nufus || 0) > 110) && !mevcut.has("atolye")) return "atolye";
  if (oyun.bolgeler.some((b) => b.owner !== id && b.owner !== "tarafsiz" && komsuMu(b.id, bolge.id)) && !mevcut.has("depo")) return "depo";
  if ((oyun.yaralilar || []).some((y) => y.owner === id) && !mevcut.has("klinik")) return "klinik";
  if (!mevcut.has("karargah")) return "karargah";
  if (!mevcut.has("depo")) return "depo";
  if (!mevcut.has("atolye")) return "atolye";
  if (!mevcut.has("klinik")) return "klinik";
  if (!mevcut.has("laboratuvar")) return "laboratuvar";
  return null;
}

function aiBinaYonet(id, sahip) {
  const fr = oyun.fraksiyon[id];
  if (!fr || oyun.tur % 14 !== 0) return;

  const oncelikli = [...sahip].sort((a, b) => {
    const tehditA = oyun.bolgeler.some((x) => x.owner !== id && x.owner !== "tarafsiz" && komsuMu(x.id, a.id)) ? 1 : 0;
    const tehditB = oyun.bolgeler.some((x) => x.owner !== id && x.owner !== "tarafsiz" && komsuMu(x.id, b.id)) ? 1 : 0;
    return (tehditB + (b.gelir || 0) * 0.05 + ((100 - (b.sadakat || 55)) * 0.02)) -
      (tehditA + (a.gelir || 0) * 0.05 + ((100 - (a.sadakat || 55)) * 0.02));
  });

  for (const bolge of oncelikli) {
    bolge.binalar = bolge.binalar || [];
    if (bolge.binalar.length < (bolge.binaLimit || 2)) {
      const tip = aiBinaTipiSec(id, bolge);
      if (!tip) continue;
      const maliyet = aiBinaMaliyeti(fr, tip, 1);
      if (fr.para >= maliyet) {
        fr.para -= maliyet;
        bolge.binalar.push({ tip, seviye: 1 });
        logYaz(`🏗️ ${fr.ad} ${bolge.ad} bölgesine ${BINA_TIPLERI[tip].ad} kurdu.`);
        return;
      }
      continue;
    }

    const yukseltilebilir = (bolge.binalar || [])
      .filter((b) => (b.seviye || 1) < 3)
      .sort((a, b) => {
        const oncelik = { karargah: 5, depo: 4, atolye: 3, laboratuvar: 2, klinik: 1 };
        return (oncelik[b.tip] || 0) - (oncelik[a.tip] || 0);
      })[0];
    if (!yukseltilebilir) continue;
    const yeniSeviye = (yukseltilebilir.seviye || 1) + 1;
    const maliyet = aiBinaMaliyeti(fr, yukseltilebilir.tip, yeniSeviye);
    if (fr.para >= maliyet) {
      fr.para -= maliyet;
      yukseltilebilir.seviye = yeniSeviye;
      logYaz(`🏗️ ${fr.ad} ${bolge.ad} bölgesindeki ${BINA_TIPLERI[yukseltilebilir.tip].ad} seviyesini yükseltti.`);
      return;
    }
  }
}

function aiTasitYonet(id, sahip) {
  const fr = oyun.fraksiyon[id];
  if (!fr || oyun.tur % 6 !== 0) return;

  const oncelik = [...sahip].sort((a, b) => {
    const aSinir = (oyun.komsu[a.id] || []).some((kid) => {
      const kb = bolgeById(kid);
      return kb && kb.owner !== id && kb.owner !== "tarafsiz";
    }) ? 1 : 0;
    const bSinir = (oyun.komsu[b.id] || []).some((kid) => {
      const kb = bolgeById(kid);
      return kb && kb.owner !== id && kb.owner !== "tarafsiz";
    }) ? 1 : 0;
    return (bSinir * 10 + (b.gelir || 0)) - (aSinir * 10 + (a.gelir || 0));
  });

  for (const bolge of oncelik) {
    const tasit = bolgeTasitDurumu(bolge);
    const kapasite = (tasit.araba || 0) * 4 + (tasit.motor || 0) * 2;
    const sinirBolgesi = (oyun.komsu[bolge.id] || []).some((kid) => {
      const kb = bolgeById(kid);
      return kb && kb.owner !== id && kb.owner !== "tarafsiz";
    });
    const hedefKapasite = sinirBolgesi ? 8 : 4;

    if (kapasite >= hedefKapasite) continue;
    if (sinirBolgesi && fr.para >= TASIT_TIPLERI.araba.maliyet && (tasit.araba || 0) < 1) {
      fr.para -= TASIT_TIPLERI.araba.maliyet;
      tasit.araba = (tasit.araba || 0) + 1;
      return;
    }
    if (fr.para >= TASIT_TIPLERI.motor.maliyet) {
      fr.para -= TASIT_TIPLERI.motor.maliyet;
      tasit.motor = (tasit.motor || 0) + 1;
      return;
    }
    if (fr.para >= TASIT_TIPLERI.araba.maliyet) {
      fr.para -= TASIT_TIPLERI.araba.maliyet;
      tasit.araba = (tasit.araba || 0) + 1;
      return;
    }
  }
}

export function aiGelisimVeUretim(id) {
  const sahip = oyun.bolgeler.filter((b) => b.owner === id);
  const fr = oyun.fraksiyon[id];
  if (!fr) return;

  const gelirLider = 1 + liderBonus(fr, "gelirCarpani");
  const kriz = krizCarpani(id);
  const ekonomiBonus = aiArastirmaEfekt(id, "gelirBonus");
  const pasifGelir = aiArastirmaEfekt(id, "pasifGelir");
  if (pasifGelir > 0) fr.para += pasifGelir;

  sahip.forEach((b) => {
    const gelX = 1 + (b.yGel || 0) * 0.5;
    const geceBonus =
      (b.ozellik === "kumarhane" || b.ozellik === "carsi") ? aiArastirmaEfekt(id, "geceEkonomiBonus") : 0;
    const bBonus = 1 + bolgeBonus(b, "gelirBonus") + binaBonus(b, "gelirBonus") + ekonomiBonus + geceBonus;
    fr.para += (b.gelir || 0) * gelX * gelirLider * bBonus * kriz;
  });

  if (oyun.tur % 5 === 0) {
    const z = ZORLUK[oyun.zorluk] || {};
    const adamLider = 1 + liderBonus(fr, "adamCarpani");
    sahip.forEach((b) => {
      const bBonus = 1 + bolgeBonus(b, "uretimBonus") + binaBonus(b, "uretimBonus");
      const carp = (1 + (b.yAdam || 0) * 0.7) * (z.recruitRate || 1) * sohretCarpani(id) * adamLider * bBonus;
      let aday = Math.max(0, Math.round(((b.nufus || 0) / 35) * carp));
      aday = Math.min(aday, b.nufus || 0);
      if (aday > 0) {
        b.nufus -= aday;
        let kalan = aday;
        while (kalan > 0) {
          const tip = aiUretimTipiSec(id, b, fr);
          const adet = tip === "tetikci" ? Math.min(kalan, Math.max(1, Math.ceil(aday / 3))) : 1;
          aiBirlikOlustur(id, b.id, tip, adet);
          kalan -= adet;
        }
      }
    });
  }

  if (oyun.tur % 10 === 0) {
    sahip.forEach((b) => {
      b.nufusMax = Math.ceil((b.nufusMax || 0) * 1.01);
      const regenBase = 0.03 + liderBonus(fr, "regenBonus") + bolgeBonus(b, "regenBonus") * 0.03;
      const regen = Math.max(1, Math.floor((b.nufusMax || 0) * regenBase));
      b.nufus = Math.min(b.nufusMax, (b.nufus || 0) + regen);
    });
  }

  fr.para -= ownerBakimToplami(id);

  if (fr.para < 0) {
    sahip.forEach((b) => { if ((b.garnizon || 0) > 0) b.garnizon = Math.floor(b.garnizon * 0.95); });
    oyun.birimler.filter((u) => u.owner === id).forEach((u) => { u.adet = Math.max(1, Math.floor(u.adet * 0.95)); });
  }

  if (oyun.tur % 12 === 0) {
    aiSadakatYonet(id, sahip);
  }

  aiBinaYonet(id, sahip);
  aiTasitYonet(id, sahip);

  if (oyun.tur % 15 === 0) {
    sahip.forEach((b) => {
      if (
        ((b.sadakat || 55) < 40 || Math.random() < 0.35) &&
        oyun.fraksiyon[id].para >= 80 * (1 + (b.yGuv || 0)) &&
        (b.guv || 0) < 9
      ) {
        oyun.fraksiyon[id].para -= 80 * (1 + (b.yGuv || 0));
        b.yGuv = (b.yGuv || 0) + 1;
      }
      if (
        Math.random() < 0.3 &&
        (b.gelir || 0) < 22 &&
        oyun.fraksiyon[id].para >= 100 * (1 + (b.yGel || 0))
      ) {
        oyun.fraksiyon[id].para -= 100 * (1 + (b.yGel || 0));
        b.yGel = (b.yGel || 0) + 1;
      }
      if (
        Math.random() < 0.25 &&
        (b.nufus || 0) > 90 &&
        oyun.fraksiyon[id].para >= 90 * (1 + (b.yAdam || 0))
      ) {
        oyun.fraksiyon[id].para -= 90 * (1 + (b.yAdam || 0));
        b.yAdam = (b.yAdam || 0) + 1;
      }
      const hedefKap = aiGarnizonKapasitesi(id, b);
      if ((b.garnizon || 0) > hedefKap) b.garnizon = hedefKap;
    });
  }
}

function num(x, d = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : d;
}

function aiKesifAktifMi(owner, bolge) {
  if (!bolge?._kesifAi) return false;
  if (bolge._kesifAi.owner !== owner) return false;
  if (oyun.tur > bolge._kesifAi.bitis) {
    delete bolge._kesifAi;
    return false;
  }
  return true;
}

function hedefKomsuSayimiz(id, hedefId) {
  return oyun.bolgeler.filter((b) => b.owner === id && komsuMu(b.id, hedefId)).length;
}

function bribeCostNeutral(h) {
  return Math.ceil(
    num(MEKANIK.bribeNeutralBase) +
    num(h.guv) * num(MEKANIK.bribeNeutralPerGuv) +
    num(h.nufus) * num(MEKANIK.bribeNeutralPerNufus)
  );
}

function aiSaldiriSkoru(id, birim, hedef) {
  const savunan = tileToplam(hedef.owner, hedef.id);
  const guv = (hedef.guv || 0) + (hedef.yGuv || 0);
  const tipCarpani = BIRIM_TIPLERI[birim.tip || "tetikci"]?.saldiri || 1;
  const arastirma = aiArastirmaEfekt(id, "saldiriBonus");
  const gonder = Math.max(1, Math.floor(birim.adet * (birim.tip === "genc" ? 0.72 : 0.85)));
  const efektif = Math.round(gonder * tipCarpani * (1 + arastirma));
  const p = savasKazanmaIhtimali(efektif, savunan, guv);
  const gelirGain = hedef.gelir * (1 + 0.1 * hedefKomsuSayimiz(id, hedef.id));
  const denyBonus = hedef.owner === "biz" ? 4 : 0;
  const ozelDeger =
    (hedef.ozellik === "universite" ? 2.5 : 0) +
    (hedef.ozellik === "kumarhane" ? 2 : 0) +
    (hedef.ozellik === "liman" ? 1.5 : 0);
  const dusukSadakatFirsati = hedef.owner === "biz" ? Math.max(0, (35 - (hedef.sadakat || 55)) * 0.08) : 0;
  const sinirBaskisi = (oyun.komsu[hedef.id] || []).filter((komsuId) => bolgeById(komsuId)?.owner === id).length * 0.25;
  const kesifAktif = aiKesifAktifMi(id, hedef);
  const kesifSkoru = kesifAktif ? 0.9 : (hedef.owner === "biz" ? -0.35 : 0);
  const maliyet = saldiriMaliyeti(AYAR, guv, gonder);
  const skor =
    p * (gelirGain + denyBonus + ozelDeger) +
    dusukSadakatFirsati +
    sinirBaskisi -
    maliyet * 0.02 -
    guv * 0.04 +
    kesifSkoru;
  return { p, skor, gonder, guv, kesifAktif };
}

function aiOperasyonTasitAyir(id, gerekKapasite) {
  const secim = ownerUygunTasitliBolgeBul(id, gerekKapasite);
  if (!secim?.bolge) return null;
  const plan = bolgeTasitAyir(secim.bolge, gerekKapasite);
  if (!plan) return null;
  return { bolgeId: secim.bolge.id, plan };
}

function aiOperasyonTasitIade(kullanim) {
  if (!kullanim) return;
  bolgeTasitIadeEt(kullanim.bolgeId, kullanim.plan?.araba || 0, kullanim.plan?.motor || 0);
}

export function aiCasuslukYap(id) {
  const fr = oyun.fraksiyon[id];
  if (!fr || !oyun.bolgeler.some((b) => b.owner === "biz")) return;
  if (oyun.tur % 9 !== 0 && !(fr._ofke > 0 && oyun.tur % 5 === 0)) return;

  const hedefler = oyun.bolgeler.filter((b) => b.owner === "biz");
  const hedefSiralama = [...hedefler].sort((a, b) => (b.gelir + b.guv) - (a.gelir + a.guv));
  const hedef = hedefSiralama.find((b) => !aiKesifAktifMi(id, b)) || hedefSiralama[0];
  if (!hedef) return;

  const istihbarat = aiArastirmaEfekt(id, "suikastBonus");

  if (fr.para >= 300 && Math.random() < 0.28 + istihbarat) {
    const suikastTasit = aiOperasyonTasitAyir(id, 4);
    if (suikastTasit) {
      const sans = Math.max(0.1, Math.min(0.9, 0.42 + istihbarat - (hedef.guv + hedef.yGuv) * 0.03));
      fr.para -= 300;
      if (Math.random() < sans) {
        oyun.fraksiyon.biz._liderDevreDisi = oyun.tur + 6;
        logYaz(`🗡️ ${fr.ad} bizim lidere suikast düzenledi. Lider bir süre devre dışı.`);
      } else {
        oyun.fraksiyon.biz._ofke = (oyun.fraksiyon.biz._ofke || 0) + 10;
      }
      aiOperasyonTasitIade(suikastTasit);
      fr._ofke = 0;
      return;
    }
  }

  if (fr.para >= 100 && Math.random() < 0.35) {
    const kesifTasit = aiOperasyonTasitAyir(id, 2);
    if (kesifTasit) {
      fr.para -= 100;
      hedef._kesifAi = { owner: id, bitis: oyun.tur + 5 };
      logYaz(`🔍 ${fr.ad} ${hedef.ad} hakkında keşif ağı kurdu.`);
      aiOperasyonTasitIade(kesifTasit);
    }
  }
}

export function aiSaldiriHareket(id) {
  const fr = oyun.fraksiyon[id];
  if (!fr) return;

  const sahip = oyun.bolgeler.filter((b) => b.owner === id);
  const tarafsizAdaylar = [];
  for (const kaynak of sahip) {
    (oyun.komsu[kaynak.id] || [])
      .map((idH) => bolgeById(idH))
      .filter((h) => h && h.owner === "tarafsiz")
      .forEach((h) => {
        const cost = bribeCostNeutral(h);
        const skor =
          (h.gelir || 0) * 5 +
          (h.nufus || 0) * 0.08 +
          (h.ozellik === "universite" ? 10 : 0) +
          (h.ozellik === "kumarhane" ? 8 : 0) -
          cost * 0.06 -
          ((h.guv || 0) + (h.yGuv || 0)) * 1.5;
        tarafsizAdaylar.push({ hedef: h, cost, skor });
      });
  }
  if (tarafsizAdaylar.length) {
    const secim = tarafsizAdaylar
      .sort((a, b) => b.skor - a.skor)
      .find((a) => fr.para >= a.cost && fr.para - a.cost >= 200);
    if (secim) {
      fr.para -= secim.cost;
      secim.hedef.owner = id;
      secim.hedef.garnizon = Math.max(MEKANIK.bribeMinGarrison || 4, secim.hedef.garnizon || 0);
      yiginaEkle(secim.hedef.id, id, Math.max(2, Math.round((secim.hedef.nufus || 60) / 30)));
      logYaz(`${fr.ad} rüşvetle ${secim.hedef.ad} bölgesini aldı.`);
    }
  }

  const yiginlar = oyun.birimler.filter(
    (b) => b.owner === id && !b.hedefId && (!b.rota || b.rota.length === 0) && b.adet > 0
  );
  if (!yiginlar.length) return;

  for (const y of yiginlar) {
    if (y._aiCd && y._aiCd > oyun.tur) continue;
    const kaynak = bolgeById(y.konumId);
    if (!kaynak || kaynak.owner !== id) continue;

    const hedefler = (oyun.komsu[kaynak.id] || [])
      .map((idH) => bolgeById(idH))
      .filter((h) => h && h.owner !== id && h.owner !== "tarafsiz")
      .filter((h) => !(h.korumaTur && oyun.tur < h.korumaTur));
    if (!hedefler.length) continue;

    let enIyi = null;
    let enSkor = -Infinity;
    for (const hedef of hedefler) {
      const aday = aiSaldiriSkoru(id, y, hedef);
      const sadakatBaskisi = hedef.owner === "biz" && (hedef.sadakat || 55) < 35 ? 0.12 : 0;
      const finalSkor = aday.skor + sadakatBaskisi;
    if (finalSkor > enSkor) {
        enSkor = finalSkor;
        enIyi = { hedef, ...aday };
      }
    }
    if (!enIyi) continue;
    const minP =
      y.tip === "genc"
        ? 0.48
        : y.tip === "agir_silahli"
          ? 0.32
          : 0.40;
    const hedefP = enIyi.kesifAktif ? Math.max(0.22, minP - 0.05) : minP;
    if (enIyi.p < hedefP) {
      y._aiCd = oyun.tur + 2;
      continue;
    }
    const maliyet = saldiriMaliyeti(AYAR, enIyi.guv, enIyi.gonder);
    if (fr.para < maliyet) {
      y._aiCd = oyun.tur + 2;
      continue;
    }
    if (y.adet < enIyi.gonder) {
      y._aiCd = oyun.tur + 1;
      continue;
    }
    const tasitPlan = bolgeTasitAyir(kaynak, enIyi.gonder);
    if (!tasitPlan) {
      y._aiCd = oyun.tur + 1;
      continue;
    }
    fr.para -= maliyet;
    y.adet -= enIyi.gonder;
    if (y.adet <= 0) y._sil = true;

    oyun.birimler.push({
      id: `k${++oyun.birimSayac}`,
      owner: id,
      adet: enIyi.gonder,
      tip: y.tip || "tetikci",
      konumId: kaynak.id,
      hedefId: enIyi.hedef.id,
      _hazir: false,
      durum: "hareket",
      tasitAraba: tasitPlan.araba || 0,
      tasitMotor: tasitPlan.motor || 0,
    });
    konvoyBaslaAnimasyonu(kaynak.id);
    logYaz(`${fr.ad} ${kaynak.ad} → ${enIyi.hedef.ad} (${enIyi.gonder} ${BIRIM_TIPLERI[y.tip || "tetikci"].ad}) saldırısı başlattı.`);
    y._aiCd = oyun.tur + 1;
  }
}
