#!/usr/bin/env node

import { yeniOyun, oyun, yiginaEkle, sohretCarpani } from "../src/state.js";
import { ZORLUK } from "../src/config.js";
import { ownerBakimToplami } from "../src/units.js";

const OWNERLER = Object.freeze(["biz", "ai1", "ai2", "ai3"]);
const KPI_TURLARI = Object.freeze([20, 40, 60]);

function sayi(v, varsayilan = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : varsayilan;
}

function intArg(args, ad, varsayilan) {
  const giris = args[`--${ad}`];
  if (giris === undefined) return varsayilan;
  const parsed = parseInt(giris, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Geçersiz --${ad}: ${giris}`);
  }
  return parsed;
}

function strArg(args, ad, varsayilan) {
  const giris = String(args[`--${ad}`] || varsayilan).trim();
  if (!giris) return varsayilan;
  return giris;
}

function argParse(argv) {
  const res = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token;
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      res[key] = "true";
    } else {
      res[key] = next;
      i += 1;
    }
  }
  return res;
}

function ownerBolgeListesi(owner) {
  return oyun.bolgeler.filter((b) => b.owner === owner);
}

function ownerToplamBirim(owner) {
  return oyun.birimler
    .filter((b) => b.owner === owner && !b._sil)
    .reduce((toplam, b) => toplam + (b.adet || 0), 0);
}

function ownerGelir(owner) {
  return ownerBolgeListesi(owner).reduce(
    (toplam, b) => toplam + (sayi(b.gelir) * (1 + sayi(b.yGel) * 0.5)),
    0
  );
}

function ownerUretim(owner, zorlukAyari) {
  if (oyun.tur % 5 !== 0) return 0;
  let toplam = 0;
  const recruitRate = owner === "biz" ? 1 : sayi(zorlukAyari.recruitRate, 1);
  ownerBolgeListesi(owner).forEach((b) => {
    const carp = (1 + sayi(b.yAdam) * 0.7) * recruitRate * sohretCarpani(owner);
    const aday = Math.max(0, Math.round((sayi(b.nufus) / 35) * carp));
    const alinacak = Math.max(0, Math.min(aday, Math.floor(sayi(b.nufus))));
    if (alinacak <= 0) return;
    b.nufus -= alinacak;
    yiginaEkle(b.id, owner, alinacak, "tetikci");
    toplam += alinacak;
  });
  return toplam;
}

function ownerNufusYenile(owner) {
  if (oyun.tur % 10 !== 0) return;
  ownerBolgeListesi(owner).forEach((b) => {
    b.nufusMax = Math.ceil(Math.max(1, sayi(b.nufusMax)) * 1.01);
    const regen = Math.max(1, Math.floor(sayi(b.nufusMax) * 0.03));
    b.nufus = Math.min(sayi(b.nufusMax), sayi(b.nufus) + regen);
  });
}

function runSimulasyon({ turSayisi, zorluk }) {
  yeniOyun({ zorluk, mapSize: "istanbul-buyuk" });
  const zorlukAyari = ZORLUK[zorluk] || ZORLUK.orta;
  const kpi = [];
  let netToplam = 0;

  for (let tur = 1; tur <= turSayisi; tur += 1) {
    oyun.tur = tur;
    OWNERLER.forEach((owner) => {
      const fr = oyun.fraksiyon?.[owner];
      if (!fr) return;

      const gelir = ownerGelir(owner);
      fr.para += gelir;
      ownerUretim(owner, zorlukAyari);
      ownerNufusYenile(owner);
      const bakim = ownerBakimToplami(owner);
      fr.para -= bakim;

      if (owner === "biz") {
        const net = gelir - bakim;
        netToplam += net;
        if (KPI_TURLARI.includes(tur)) {
          kpi.push({
            tur,
            netGelir: net,
            para: sayi(fr.para),
            toplamBirim: ownerToplamBirim("biz"),
            bolge: ownerBolgeListesi("biz").length,
          });
        }
      }
    });

    oyun.birimler = oyun.birimler.filter((b) => !b._sil && sayi(b.adet) > 0);
  }

  return {
    turSayisi,
    ortalamaNet: netToplam / Math.max(1, turSayisi),
    bizPara: sayi(oyun.fraksiyon?.biz?.para),
    bizBirim: ownerToplamBirim("biz"),
    bizBolge: ownerBolgeListesi("biz").length,
    kpi,
  };
}

function ortalamaKpi(kosular) {
  const map = new Map();
  KPI_TURLARI.forEach((tur) => map.set(tur, { tur, sayac: 0, net: 0, para: 0, birim: 0 }));
  kosular.forEach((k) => {
    k.kpi.forEach((satir) => {
      const birikim = map.get(satir.tur);
      if (!birikim) return;
      birikim.sayac += 1;
      birikim.net += satir.netGelir;
      birikim.para += satir.para;
      birikim.birim += satir.toplamBirim;
    });
  });
  return [...map.values()]
    .filter((x) => x.sayac > 0)
    .map((x) => ({
      tur: x.tur,
      netGelir: x.net / x.sayac,
      para: x.para / x.sayac,
      birim: x.birim / x.sayac,
    }));
}

function satirYuvarla(v) {
  return Math.round(v * 10) / 10;
}

function main() {
  const args = argParse(process.argv.slice(2));
  if (args["--help"]) {
    console.log("Kullanım: node scripts/sim-test.mjs --turns 80 --runs 20 --difficulty orta");
    return;
  }

  const turSayisi = intArg(args, "turns", 80);
  const runSayisi = intArg(args, "runs", 20);
  const zorluk = strArg(args, "difficulty", "orta");

  if (!ZORLUK[zorluk]) {
    throw new Error(`Geçersiz zorluk: ${zorluk}. Seçenekler: ${Object.keys(ZORLUK).join(", ")}`);
  }

  const kosular = [];
  for (let i = 0; i < runSayisi; i += 1) {
    kosular.push(runSimulasyon({ turSayisi, zorluk }));
  }

  const ortNet = kosular.reduce((t, k) => t + k.ortalamaNet, 0) / runSayisi;
  const ortPara = kosular.reduce((t, k) => t + k.bizPara, 0) / runSayisi;
  const ortBirim = kosular.reduce((t, k) => t + k.bizBirim, 0) / runSayisi;
  const ortKpi = ortalamaKpi(kosular);

  console.log("=== Headless Ekonomi Simülasyonu ===");
  console.log(`Tur: ${turSayisi} | Koşu: ${runSayisi} | Zorluk: ${zorluk}`);
  console.log(`Ortalama Net Gelir/tur (biz): ${satirYuvarla(ortNet)} ₺`);
  console.log(`Koşu Sonu Ortalama Para (biz): ${satirYuvarla(ortPara)} ₺`);
  console.log(`Koşu Sonu Ortalama Birim (biz): ${satirYuvarla(ortBirim)}`);
  console.log("");
  console.log("KPI Turları (ortalama):");
  ortKpi.forEach((k) => {
    console.log(
      `T${k.tur}: Net ${satirYuvarla(k.netGelir)} ₺ | Para ${satirYuvarla(k.para)} ₺ | Birim ${satirYuvarla(k.birim)}`
    );
  });
}

main();
