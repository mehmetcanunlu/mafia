import { oyun, sohretCarpani, bolgeById } from "./state.js";
import { komsuMu, kisaRota } from "./map.js";
import { logYaz } from "./ui.js";
import { ZORLUK, AYAR, MEKANIK, BOLGE_OZELLIKLERI, BINA_TIPLERI } from "./config.js";
import { savasKazanmaIhtimali, saldiriMaliyeti } from "./combat.js";
import { yiginaEkle } from "./state.js";
import { krizCarpani } from "./events.js";
import { BIRIM_TIPLERI, TASIT_TIPLERI, ownerBakimToplami } from "./units.js";
import { ARASTIRMA_DALLARI } from "./research.js";
import { konvoyBaslaAnimasyonu } from "./animations.js";
import {
  ownerTasit,
  ownerTasitAyir,
  ownerTasitIade,
} from "./logistics.js";
import {
  DIPLO_OWNERLER,
  diplomasiSaldiriMumkunMu,
  diplomasiSaldiriBaslat,
  ittifakSaldiriCarpani,
  savasIliskiModifiyeri,
  diplomasiSuikastSonucu,
  iliskiDegistir,
  isDostIttifak,
} from "./diplomasi.js";

function liderBonus(owner, tip) {
  return oyun.fraksiyon?.[owner]?.lider?.bonus?.[tip] || 0;
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
  const istenecek = Math.max(0, Math.floor(Number(adet) || 0));
  if (istenecek <= 0) return 0;
  const eklenen = yiginaEkle(bolgeId, owner, istenecek, tip);
  if (eklenen <= 0) return 0;

  const yigin = oyun.birimler.find(
    (k) =>
      k.owner === owner &&
      k.konumId === bolgeId &&
      (k.tip || "tetikci") === tip &&
      !k.hedefId &&
      (!k.rota || k.rota.length === 0)
  );
  if (!yigin) return eklenen;

  if (tip === "genc") {
    const hedefEgitim = Math.max(2, (BIRIM_TIPLERI.genc.egitimTur || 8) - aiArastirmaEfekt(owner, "egitimSureAzaltma"));
    const mevcut = Number(yigin.egitimKalan);
    yigin.egitimKalan = Number.isFinite(mevcut) ? Math.max(1, Math.min(Math.floor(mevcut), hedefEgitim)) : hedefEgitim;
    delete yigin.terfiKalan;
  } else if (BIRIM_TIPLERI[tip]?.terfiTur) {
    const hedefTerfi = Math.max(1, Math.floor(BIRIM_TIPLERI[tip].terfiTur || 0));
    const mevcut = Number(yigin.terfiKalan);
    yigin.terfiKalan = Number.isFinite(mevcut) ? Math.max(1, Math.min(Math.floor(mevcut), hedefTerfi)) : hedefTerfi;
    delete yigin.egitimKalan;
  }
  return eklenen;
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

function aiBinaMaliyeti(owner, tip, seviye) {
  const tanim = BINA_TIPLERI[tip];
  if (!tanim) return Infinity;
  const carp = tanim.seviyeMaliyetCarpani || 1.5;
  const ham = tanim.maliyet * Math.pow(carp, Math.max(0, seviye - 1));
  const indirim = liderBonus(owner, "binaMaliyetiIndirim");
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
      const maliyet = aiBinaMaliyeti(id, tip, 1);
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
    const maliyet = aiBinaMaliyeti(id, yukseltilebilir.tip, yeniSeviye);
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

  const tasit = ownerTasit(id);
  const kapasite = (tasit.araba || 0) * 4 + (tasit.motor || 0) * 2;
  const sinirBolgesineSahip = oncelik.some((bolge) =>
    (oyun.komsu[bolge.id] || []).some((kid) => {
      const kb = bolgeById(kid);
      return kb && kb.owner !== id && kb.owner !== "tarafsiz";
    })
  );
  const hedefKapasite = sinirBolgesineSahip ? 8 : 4;
  if (kapasite >= hedefKapasite) return;

  if (sinirBolgesineSahip && fr.para >= TASIT_TIPLERI.araba.maliyet && (tasit.araba || 0) < 1) {
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
  }
}

export function aiGelisimVeUretim(id) {
  const sahip = oyun.bolgeler.filter((b) => b.owner === id);
  const fr = oyun.fraksiyon[id];
  if (!fr) return;

  const gelirLider = 1 + liderBonus(id, "gelirCarpani");
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
    const adamLider = 1 + liderBonus(id, "adamCarpani");
    sahip.forEach((b) => {
      const bBonus = 1 + bolgeBonus(b, "uretimBonus") + binaBonus(b, "uretimBonus");
      const carp = (1 + (b.yAdam || 0) * 0.7) * (z.recruitRate || 1) * sohretCarpani(id) * adamLider * bBonus;
      let aday = Math.max(0, Math.round(((b.nufus || 0) / 35) * carp));
      aday = Math.min(aday, b.nufus || 0);
      if (aday > 0) {
        let eklenenToplam = 0;
        let kalan = aday;
        while (kalan > 0) {
          const tip = aiUretimTipiSec(id, b, fr);
          const adet = tip === "tetikci" ? Math.min(kalan, Math.max(1, Math.ceil(aday / 3))) : 1;
          const eklenen = aiBirlikOlustur(id, b.id, tip, adet);
          if (eklenen <= 0) break;
          eklenenToplam += eklenen;
          kalan -= eklenen;
          if (eklenen < adet) break;
        }
        if (eklenenToplam > 0) b.nufus -= eklenenToplam;
      }
    });
  }

  if (oyun.tur % 10 === 0) {
    sahip.forEach((b) => {
      b.nufusMax = Math.ceil((b.nufusMax || 0) * 1.01);
      const regenBase = 0.03 + liderBonus(id, "regenBonus") + bolgeBonus(b, "regenBonus") * 0.03;
      const regen = Math.max(1, Math.floor((b.nufusMax || 0) * regenBase));
      b.nufus = Math.min(b.nufusMax, (b.nufus || 0) + regen);
    });
  }

  fr.para -= ownerBakimToplami(id);

  if (fr.para < 0) {
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
      const bolgeToplam = oyun.birimler
        .filter((u) => u.owner === id && u.konumId === b.id && !u.hedefId && (!u.rota || u.rota.length === 0))
        .reduce((t, u) => t + (u.adet || 0), 0);
      if (bolgeToplam > hedefKap) {
        const azaltimOrani = hedefKap / Math.max(1, bolgeToplam);
        oyun.birimler
          .filter((u) => u.owner === id && u.konumId === b.id && !u.hedefId && (!u.rota || u.rota.length === 0))
          .forEach((u) => { u.adet = Math.max(1, Math.floor((u.adet || 0) * azaltimOrani)); });
      }
    });
  }
}

function num(x, d = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : d;
}

function aiZorlukAyari() {
  return ZORLUK[oyun.zorluk] || ZORLUK.orta;
}

function aiBeklemeTuru(z, minEk = 0, maxEk = 0) {
  const min = Math.max(0, Math.floor((z?.aiCooldownMin ?? 1) + minEk));
  const max = Math.max(min, Math.floor((z?.aiCooldownMax ?? 3) + maxEk));
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

function aiSavunmaProfili(hedef) {
  const savunanBirimler = oyun.birimler.filter(
    (x) => x.konumId === hedef.id && (x.owner === hedef.owner || isDostIttifak(x.owner, hedef.owner))
  );
  const birlikAdet = savunanBirimler.reduce((t, x) => t + (x.adet || 0), 0);
  const birlikEfektif = savunanBirimler.reduce(
    (t, x) => t + (x.adet || 0) * (BIRIM_TIPLERI[x.tip || "tetikci"]?.savunma || 1),
    0
  );
  return {
    adet: birlikAdet,
    efektif: Math.max(1, Math.round(birlikEfektif)),
  };
}

function aiTahminiTurGeliri(id, sahip) {
  const fr = oyun.fraksiyon[id];
  if (!fr) return 0;
  const gelirLider = 1 + liderBonus(id, "gelirCarpani");
  const kriz = krizCarpani(id);
  const ekonomiBonus = aiArastirmaEfekt(id, "gelirBonus");
  const pasifGelir = aiArastirmaEfekt(id, "pasifGelir");
  let toplam = pasifGelir;
  sahip.forEach((b) => {
    const gelX = 1 + (b.yGel || 0) * 0.5;
    const geceBonus =
      (b.ozellik === "kumarhane" || b.ozellik === "carsi") ? aiArastirmaEfekt(id, "geceEkonomiBonus") : 0;
    const bBonus = 1 + bolgeBonus(b, "gelirBonus") + binaBonus(b, "gelirBonus") + ekonomiBonus + geceBonus;
    toplam += (b.gelir || 0) * gelX * gelirLider * bBonus * kriz;
  });
  return toplam;
}

function aiOrtalamaBirimBoyutu(id) {
  const yiginlar = oyun.birimler.filter(
    (b) => b.owner === id && !b._sil && (b.adet || 0) > 0 && !b.hedefId && (!b.rota || b.rota.length === 0)
  );
  const toplamAdet = yiginlar.reduce((t, b) => t + (b.adet || 0), 0);
  const toplamGrup = yiginlar.length;
  if (toplamGrup <= 0) return 0;
  return toplamAdet / toplamGrup;
}

function aiHedefEkonomiDegeri(hedef) {
  const ozel =
    (hedef.ozellik === "universite" ? 4 : 0) +
    (hedef.ozellik === "kumarhane" ? 3 : 0) +
    (hedef.ozellik === "liman" ? 2 : 0);
  return (hedef.gelir || 0) * 1.2 + (hedef.yGel || 0) * 1.5 + (hedef.nufus || 0) * 0.03 + ozel;
}

function aiCepheDegeri(id, hedefId) {
  const komsular = oyun.komsu[hedefId] || [];
  const bizDestek = komsular.filter((kid) => bolgeById(kid)?.owner === id).length;
  const dusmanBaski = komsular.filter((kid) => {
    const kb = bolgeById(kid);
    return kb && kb.owner !== id && kb.owner !== "tarafsiz";
  }).length;
  return bizDestek * 0.9 + dusmanBaski * 0.25;
}

function aiStratejiDurumu(id, sahip, fr) {
  const gelirTahmin = aiTahminiTurGeliri(id, sahip);
  const bakim = ownerBakimToplami(id);
  const netGelir = gelirTahmin - bakim;
  const ortalamaBirimBoyutu = aiOrtalamaBirimBoyutu(id);
  const bizBolge = oyun.bolgeler.filter((b) => b.owner === "biz").length;
  const toparlanma = fr.para < bakim * 2 || netGelir < -5 || (gelirTahmin > 0 && (bakim / gelirTahmin) > 0.95);
  const baski = !toparlanma && bizBolge > (sahip.length + 1) && fr.para > Math.max(120, bakim * 3);
  const mod = toparlanma ? "toparlanma" : (baski ? "baski" : "denge");
  if (mod === "toparlanma") {
    return {
      mod,
      saldiriCarpani: 0.58,
      tarafsizCarpani: 1.2,
      ekonomiAgirlik: 0.9,
      cepheAgirlik: 0.45,
      oyuncuOdak: -0.2,
      minPDelta: 0.07,
      butceKatsayi: 1.7,
      netGelir,
      ortalamaBirimBoyutu,
    };
  }
  if (mod === "baski") {
    return {
      mod,
      saldiriCarpani: 1.18,
      tarafsizCarpani: 0.85,
      ekonomiAgirlik: 0.7,
      cepheAgirlik: 1.12,
      oyuncuOdak: 0.25,
      minPDelta: -0.05,
      butceKatsayi: 1.05,
      netGelir,
      ortalamaBirimBoyutu,
    };
  }
  return {
    mod,
    saldiriCarpani: 1.0,
    tarafsizCarpani: 1.0,
    ekonomiAgirlik: 0.78,
    cepheAgirlik: 0.82,
    oyuncuOdak: 0,
    minPDelta: 0,
    butceKatsayi: 1.2,
    netGelir,
    ortalamaBirimBoyutu,
  };
}

function aiBribeMaliyetCarpani(stratejiMod) {
  const baz = oyun.zorluk === "zor" ? 1.12 : (oyun.zorluk === "kolay" ? 1.28 : 1.2);
  if (stratejiMod === "toparlanma") return baz * 1.12;
  if (stratejiMod === "baski") return baz * 1.04;
  return baz;
}

function ownerBolgeSayisi(owner) {
  return oyun.bolgeler.filter((b) => b.owner === owner).length;
}

function aiGenislemeDengeCarpani(id) {
  const aiBolge = ownerBolgeSayisi(id);
  const bizBolge = ownerBolgeSayisi("biz");
  const fark = aiBolge - bizBolge;
  if (fark >= 5) return 0.34;
  if (fark >= 3) return 0.5;
  if (fark >= 1) return 0.72;
  if (fark <= -3) return 1.16;
  if (fark <= -1) return 1.08;
  return 1.0;
}

function aiSaldiriSkoru(id, birim, hedef, strateji = null) {
  const savunma = aiSavunmaProfili(hedef);
  const savunan = savunma.efektif;
  const guv = (hedef.guv || 0) + (hedef.yGuv || 0);
  const tipCarpani = BIRIM_TIPLERI[birim.tip || "tetikci"]?.saldiri || 1;
  const arastirma = aiArastirmaEfekt(id, "saldiriBonus");
  const gonder = Math.max(1, Math.floor(birim.adet * (birim.tip === "genc" ? 0.72 : 0.85)));
  const efektif = Math.round(gonder * tipCarpani * (1 + arastirma));
  const diploCarpan = ittifakSaldiriCarpani(id, hedef.owner);
  const iliskiCarpan = savasIliskiModifiyeri(id, hedef.owner).saldiriCarpani;
  const p = savasKazanmaIhtimali(Math.round(efektif * diploCarpan * iliskiCarpan), savunan, guv);
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
  const ekonomiSkoru = aiHedefEkonomiDegeri(hedef) * (strateji?.ekonomiAgirlik ?? 0.75) * 0.22;
  const cepheSkoru = aiCepheDegeri(id, hedef.id) * (strateji?.cepheAgirlik ?? 0.8);
  const skor =
    p * (gelirGain + denyBonus + ozelDeger) +
    dusukSadakatFirsati +
    sinirBaskisi -
    maliyet * 0.02 -
    guv * 0.04 +
    kesifSkoru +
    ekonomiSkoru +
    cepheSkoru;
  return { p, skor, gonder, guv, kesifAktif, savunanAdet: savunma.adet };
}

function aiOperasyonTasitAyir(id, gerekKapasite) {
  const plan = ownerTasitAyir(id, gerekKapasite);
  if (!plan) return null;
  return { owner: id, plan };
}

function aiOperasyonTasitIade(kullanim) {
  if (!kullanim) return;
  ownerTasitIade(kullanim.owner, kullanim.plan?.araba || 0, kullanim.plan?.motor || 0);
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
        fr._ofke = 0;
        diplomasiSuikastSonucu(id, "biz", true);
        logYaz(`🗡️ ${fr.ad} bizim lidere suikast düzenledi. Lider bir süre devre dışı.`);
      } else {
        fr._ofke = (fr._ofke || 0) + 10;
        diplomasiSuikastSonucu(id, "biz", false);
      }
      aiOperasyonTasitIade(suikastTasit);
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

export function aiIttifakMudahalesiBaslat(mudahaleEden, savunulan, saldiran) {
  if (!oyun.fraksiyon?.[mudahaleEden]) return false;
  if (!oyun.fraksiyon?.[saldiran]) return false;
  if (mudahaleEden === saldiran) return false;
  if (!diplomasiSaldiriMumkunMu(mudahaleEden, saldiran)) return false;

  const dusmanBolgeler = oyun.bolgeler.filter((b) => b.owner === saldiran);
  if (!dusmanBolgeler.length) return false;

  const sinirHedefleri = dusmanBolgeler
    .filter((b) => (oyun.komsu[b.id] || []).some((kid) => bolgeById(kid)?.owner === savunulan))
    .sort((a, b) => (b.gelir || 0) - (a.gelir || 0));
  const hedefBolge = sinirHedefleri[0] || dusmanBolgeler.sort((a, b) => (b.gelir || 0) - (a.gelir || 0))[0];
  if (!hedefBolge) return false;

  const kaynakAdaylar = oyun.birimler
    .filter((u) => u.owner === mudahaleEden && !u._sil && (u.adet || 0) > 0)
    .filter((u) => !u.hedefId && (!u.rota || u.rota.length === 0))
    .map((u) => {
      const rota = kisaRota(u.konumId, hedefBolge.id);
      const mesafe = Array.isArray(rota) ? Math.max(0, rota.length - 1) : 999;
      return { birim: u, rota, mesafe };
    })
    .filter((x) => Array.isArray(x.rota) && x.rota.length >= 2)
    .sort((a, b) => a.mesafe - b.mesafe || (b.birim.adet || 0) - (a.birim.adet || 0));
  const secim = kaynakAdaylar[0];
  if (!secim?.birim) return false;

  const kaynakBolge = bolgeById(secim.birim.konumId);
  if (!kaynakBolge || kaynakBolge.owner !== mudahaleEden) return false;

  const gonderilecek = Math.max(1, Math.min(secim.birim.adet || 0, Math.round((secim.birim.adet || 0) * 0.5)));
  const tasitPlan = ownerTasitAyir(mudahaleEden, gonderilecek);
  if (!tasitPlan) return false;

  secim.birim.adet -= gonderilecek;
  if (secim.birim.adet <= 0) secim.birim._sil = true;

  const ilkAdim = secim.rota[1];
  const kalanRota = secim.rota.slice(2);
  oyun.birimler.push({
    id: `k${++oyun.birimSayac}`,
    owner: mudahaleEden,
    adet: gonderilecek,
    tip: secim.birim.tip || "tetikci",
    konumId: kaynakBolge.id,
    hedefId: ilkAdim,
    _hazir: false,
    rota: kalanRota,
    durum: "hareket",
    tasitAraba: tasitPlan.araba || 0,
    tasitMotor: tasitPlan.motor || 0,
    gecisHakki: false,
    operasyonId: null,
    bekliyor: false,
  });

  diplomasiSaldiriBaslat(mudahaleEden, saldiran, "İttifak müdahalesi", { ittifakMudahalesi: true });
  konvoyBaslaAnimasyonu(kaynakBolge.id);
  logYaz(
    `🛡️ ${oyun.fraksiyon[mudahaleEden]?.ad || mudahaleEden}, ${oyun.fraksiyon[savunulan]?.ad || savunulan} için ${oyun.fraksiyon[saldiran]?.ad || saldiran} tarafına müdahale başlattı.`
  );
  return true;
}

export function aiSaldiriHareket(id) {
  const fr = oyun.fraksiyon[id];
  if (!fr) return;
  const z = aiZorlukAyari();

  const sahip = oyun.bolgeler.filter((b) => b.owner === id);
  const aiBolgeSay = sahip.length;
  const bizBolgeSay = ownerBolgeSayisi("biz");
  const ondeFark = aiBolgeSay - bizBolgeSay;
  const dengeCarpani = aiGenislemeDengeCarpani(id);
  const strateji = aiStratejiDurumu(id, sahip, fr);
  fr._sonStrateji = strateji.mod;
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
        tarafsizAdaylar.push({ hedef: h, kaynak, cost, skor });
      });
  }
  const tarafsizHamleSans = Math.min(
    0.9,
    Math.max(0.06, (z.aiBribePref ?? 0.5) * strateji.tarafsizCarpani * dengeCarpani)
  );
  const tarafsizCooldown = Math.max(3, (z.aiCooldownMin ?? 1) + 3);
  const sonTarafsizTur = Number(fr._aiTarafsizSonTur || -999);
  const tarafsizHazir = (oyun.tur - sonTarafsizTur) >= tarafsizCooldown;
  const aiMaliyetCarpani = aiBribeMaliyetCarpani(strateji.mod);
  if (tarafsizHazir && tarafsizAdaylar.length && Math.random() < tarafsizHamleSans) {
    const rezerv = Math.max(120, Math.round(ownerBakimToplami(id) * 2.2));
    let secim = [...tarafsizAdaylar]
      .map((a) => ({ ...a, aiCost: Math.ceil(a.cost * aiMaliyetCarpani) }))
      .sort((a, b) => (b.skor - a.skor) || (a.aiCost - b.aiCost))
      .find((a) => fr.para >= (a.aiCost + rezerv));
    let maliyet = secim ? secim.aiCost : 0;
    let sans = 1;
    let mod = "satinalma";
    if (!secim) {
      const nufuzAday = [...tarafsizAdaylar]
        .sort((a, b) => (b.skor - a.skor) || (a.cost - b.cost))
        .find((a) => fr.para >= 180);
      if (nufuzAday) {
        secim = nufuzAday;
        const odemeOrani = Math.max(0.18, Math.min(0.7, fr.para / Math.max(1, nufuzAday.cost)));
        maliyet = Math.max(150, Math.round(nufuzAday.cost * Math.min(0.45, odemeOrani)));
        const kaynakDestek = oyun.birimler
          .filter((u) => u.owner === id && u.konumId === nufuzAday.kaynak.id && !u.hedefId && !u._sil)
          .reduce((t, u) => t + (u.adet || 0), 0);
        const guvenlik = (nufuzAday.hedef.guv || 0) + (nufuzAday.hedef.yGuv || 0);
        sans = Math.max(
          0.14,
          Math.min(0.76, 0.24 + odemeOrani * 0.45 + Math.min(0.18, kaynakDestek / 90) - guvenlik * 0.035)
        );
        mod = "nufuz";
      }
    }
    if (secim) {
      if (fr.para >= maliyet) {
        fr.para -= maliyet;
        fr._aiTarafsizSonTur = oyun.tur;
        if (Math.random() < sans) {
          secim.hedef.owner = id;
          const minGar = mod === "satinalma" ? (MEKANIK.bribeMinGarrison || 4) : 4;
          const takviye = Math.max(minGar, Math.max(2, Math.round((secim.hedef.nufus || 60) / 30)));
          yiginaEkle(secim.hedef.id, id, takviye);
          DIPLO_OWNERLER
            .filter((oid) => oid !== id && oyun.fraksiyon?.[oid])
            .forEach((oid) => iliskiDegistir(id, oid, -5, "Tarafsız bölge rüşvetle alındı"));
          logYaz(`${fr.ad} ${mod === "satinalma" ? "satın alarak" : "nüfuz kurarak"} ${secim.hedef.ad} bölgesini aldı.`);
          fr._aiGenislemeSonTur = oyun.tur;
        } else if (mod === "nufuz") {
          logYaz(`${fr.ad} ${secim.hedef.ad} üzerinde nüfuz kurmaya çalıştı ama başarısız oldu.`);
        }
      }
    }
  }

  const yiginlar = oyun.birimler.filter(
    (b) => b.owner === id && !b.hedefId && (!b.rota || b.rota.length === 0) && b.adet > 0
  );
  if (!yiginlar.length) return;
  const saldiriCooldown = Math.max(1, (z.aiCooldownMin ?? 1));
  const sonSaldiriTur = Number(fr._aiSaldiriSonTur || -999);
  if ((oyun.tur - sonSaldiriTur) < saldiriCooldown) return;
  let maxSaldiri = strateji.mod === "baski" ? 2 : 1;
  if (ondeFark >= 2) maxSaldiri = Math.min(maxSaldiri, 1);
  if (ondeFark >= 4) maxSaldiri = 0;
  if (maxSaldiri <= 0) return;
  let yapilanSaldiri = 0;

  for (const y of yiginlar) {
    if (yapilanSaldiri >= maxSaldiri) break;
    if (y._aiCd && y._aiCd > oyun.tur) continue;
    const saldiriSans = Math.min(
      0.9,
      Math.max(0.05, (z.aiAttackChance ?? 0.55) * strateji.saldiriCarpani * dengeCarpani)
    );
    if (Math.random() > saldiriSans) {
      y._aiCd = oyun.tur + aiBeklemeTuru(z);
      continue;
    }
    const kaynak = bolgeById(y.konumId);
    if (!kaynak || kaynak.owner !== id) continue;

    const hedefler = (oyun.komsu[kaynak.id] || [])
      .map((idH) => bolgeById(idH))
      .filter((h) => h && h.owner !== id && h.owner !== "tarafsiz")
      .filter((h) => diplomasiSaldiriMumkunMu(id, h.owner))
      .filter((h) => !(h.korumaTur && oyun.tur < h.korumaTur));
    if (!hedefler.length) continue;

    let enIyi = null;
    let enSkor = -Infinity;
    for (const hedef of hedefler) {
      const aday = aiSaldiriSkoru(id, y, hedef, strateji);
      const sadakatBaskisi = hedef.owner === "biz" && (hedef.sadakat || 55) < 35 ? 0.12 : 0;
      const oyuncuCeza = hedef.owner === "biz"
        ? Math.max(0, ((z.aiPenaltyVsPlayer || 0) * 2.4) - (strateji.oyuncuOdak || 0))
        : 0;
      const ondeCeza = hedef.owner === "biz" ? Math.max(0, ondeFark) * 0.22 : 0;
      const finalSkor = aday.skor + sadakatBaskisi - oyuncuCeza - ondeCeza;
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
    const turBaskisi = Math.min(0.16, (oyun.tur || 0) * 0.0025);
    const genislemeBaskisi = sahip.length <= 2 ? 0.08 : (sahip.length <= 4 ? 0.04 : 0);
    const bazP = enIyi.kesifAktif ? Math.max(0.22, minP - 0.05) : minP;
    const hedefP = Math.max(0.18, bazP - turBaskisi - genislemeBaskisi + (strateji.minPDelta || 0));
    if (enIyi.p < hedefP) {
      y._aiCd = oyun.tur + aiBeklemeTuru(z, 1, 2);
      continue;
    }
    if (strateji.mod === "toparlanma" && strateji.ortalamaBirimBoyutu < 6 && enIyi.p < 0.65) {
      y._aiCd = oyun.tur + aiBeklemeTuru(z, 1, 2);
      continue;
    }
    const maliyet = saldiriMaliyeti(AYAR, enIyi.guv, enIyi.gonder);
    const gerekenButce = Math.ceil(maliyet * (strateji.butceKatsayi || 1));
    if (fr.para < gerekenButce) {
      y._aiCd = oyun.tur + aiBeklemeTuru(z, 1, 2);
      continue;
    }
    if (y.adet < enIyi.gonder) {
      y._aiCd = oyun.tur + aiBeklemeTuru(z, 0, 1);
      continue;
    }
    const tasitPlan = ownerTasitAyir(id, enIyi.gonder);
    if (!tasitPlan) {
      y._aiCd = oyun.tur + aiBeklemeTuru(z, 0, 1);
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
      gecisHakki: false,
      operasyonId: null,
      bekliyor: false,
    });
    diplomasiSaldiriBaslat(id, enIyi.hedef.owner, "AI saldırısı");
    konvoyBaslaAnimasyonu(kaynak.id);
    logYaz(`${fr.ad} ${kaynak.ad} → ${enIyi.hedef.ad} (${enIyi.gonder} ${BIRIM_TIPLERI[y.tip || "tetikci"].ad}) saldırısı başlattı.`);
    fr._aiSaldiriSonTur = oyun.tur;
    yapilanSaldiri += 1;
    y._aiCd = oyun.tur + aiBeklemeTuru(z, 0, 1);
  }
}

function aiOperasyonId() {
  return `op_${oyun.tur}_${Math.random().toString(36).slice(2, 8)}`;
}

function ownerKomsuHazirBirim(owner, hedefId) {
  return oyun.birimler
    .filter((k) => k.owner === owner && !k._sil && (k.adet || 0) > 0)
    .filter((k) => !k.hedefId && (!k.rota || k.rota.length === 0))
    .filter((k) => komsuMu(k.konumId, hedefId))
    .sort((a, b) => (b.adet || 0) - (a.adet || 0))[0] || null;
}

export function aiKoordineliSaldiriDegerlendirYap(aiOwner) {
  if (!oyun.fraksiyon?.[aiOwner]) return;
  if (!Array.isArray(oyun.operasyonlar)) oyun.operasyonlar = [];
  if (oyun.tur % 6 !== 0) return;
  if (Math.random() > 0.45) return;

  const partnerAdaylari = DIPLO_OWNERLER
    .filter((o) => o !== aiOwner && o !== "biz")
    .filter((o) => oyun.fraksiyon?.[o])
    .filter((o) => isDostIttifak(aiOwner, o))
    .sort((a, b) => (oyun.fraksiyon[b]._ofke || 0) - (oyun.fraksiyon[a]._ofke || 0));
  if (!partnerAdaylari.length) return;

  let secilen = null;
  for (const partner of partnerAdaylari) {
    const ortakHedefler = oyun.bolgeler
      .filter((b) => b.owner !== aiOwner && b.owner !== partner && b.owner !== "tarafsiz")
      .filter((b) => (oyun.komsu[b.id] || []).some((id) => bolgeById(id)?.owner === aiOwner))
      .filter((b) => (oyun.komsu[b.id] || []).some((id) => bolgeById(id)?.owner === partner))
      .sort((a, b) => (b.gelir || 0) - (a.gelir || 0));
    if (!ortakHedefler.length) continue;

    const hedef = ortakHedefler[0];
    const aiBirim = ownerKomsuHazirBirim(aiOwner, hedef.id);
    const partnerBirim = ownerKomsuHazirBirim(partner, hedef.id);
    if (!aiBirim || !partnerBirim) continue;
    secilen = { partner, hedef, aiBirim, partnerBirim };
    break;
  }
  if (!secilen) return;

  const aiAdet = Math.max(1, Math.min(secilen.aiBirim.adet, Math.round(secilen.aiBirim.adet * 0.65)));
  const partnerAdet = Math.max(1, Math.min(secilen.partnerBirim.adet, Math.round(secilen.partnerBirim.adet * 0.55)));
  if (aiAdet <= 0 || partnerAdet <= 0) return;

  const aiBolge = bolgeById(secilen.aiBirim.konumId);
  const partnerBolge = bolgeById(secilen.partnerBirim.konumId);
  if (!aiBolge || !partnerBolge) return;

  const aiTasit = ownerTasitAyir(aiOwner, aiAdet);
  if (!aiTasit) return;
  const partnerTasit = ownerTasitAyir(secilen.partner, partnerAdet);
  if (!partnerTasit) {
    ownerTasitIade(aiOwner, aiTasit.araba || 0, aiTasit.motor || 0);
    return;
  }

  secilen.aiBirim.adet -= aiAdet;
  if (secilen.aiBirim.adet <= 0) secilen.aiBirim._sil = true;
  secilen.partnerBirim.adet -= partnerAdet;
  if (secilen.partnerBirim.adet <= 0) secilen.partnerBirim._sil = true;

  const opId = aiOperasyonId();
  const aiKonvoyId = `k${++oyun.birimSayac}`;
  const partnerKonvoyId = `k${++oyun.birimSayac}`;

  oyun.birimler.push({
    id: aiKonvoyId,
    owner: aiOwner,
    adet: aiAdet,
    tip: secilen.aiBirim.tip || "tetikci",
    konumId: aiBolge.id,
    hedefId: secilen.hedef.id,
    _hazir: false,
    rota: [],
    durum: "bekliyor-op",
    tasitAraba: aiTasit.araba || 0,
    tasitMotor: aiTasit.motor || 0,
    gecisHakki: false,
    operasyonId: opId,
    bekliyor: true,
  });

  oyun.birimler.push({
    id: partnerKonvoyId,
    owner: secilen.partner,
    adet: partnerAdet,
    tip: secilen.partnerBirim.tip || "tetikci",
    konumId: partnerBolge.id,
    hedefId: secilen.hedef.id,
    _hazir: false,
    rota: [],
    durum: "bekliyor-op",
    tasitAraba: partnerTasit.araba || 0,
    tasitMotor: partnerTasit.motor || 0,
    gecisHakki: false,
    operasyonId: opId,
    bekliyor: true,
  });

  oyun.operasyonlar.push({
    id: opId,
    tip: "koordineli_saldiri",
    hedefId: secilen.hedef.id,
    baslatanOwner: aiOwner,
    katilimcilar: [
      { owner: aiOwner, hazir: false, konvoyIdler: [aiKonvoyId] },
      { owner: secilen.partner, hazir: false, konvoyIdler: [partnerKonvoyId] },
    ],
    durum: "hazirlik",
    yaratildisTur: oyun.tur,
    zaman_asimi: 8,
  });

  diplomasiSaldiriBaslat(aiOwner, secilen.hedef.owner, "AI koordineli saldırı");
  diplomasiSaldiriBaslat(secilen.partner, secilen.hedef.owner, "AI koordineli saldırı");
  logYaz(`⚔ ${oyun.fraksiyon[aiOwner]?.ad || aiOwner} + ${oyun.fraksiyon[secilen.partner]?.ad || secilen.partner} koordineli saldırı hazırlığına geçti.`);
}
