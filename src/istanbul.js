// istanbul.js — İstanbul ilçe harita verileri
// SVG viewBox: 0 0 870 580

import { ISTANBUL_GEOMETRI } from "./istanbul-geometry.js";

// =============================================
// İLÇE TANIMLARI (gerçek coğrafi konumlar, basitleştirilmiş polygon)
// =============================================

const ISTANBUL_ILCE_KAYNAK = {
  // === AVRUPA YAKASI (Sol) ===
  fatih: {
    ad: "Fatih",
    svgPath: "M 320,310 L 355,295 L 385,305 L 390,330 L 370,350 L 340,345 L 315,335 Z",
    center: { x: 353, y: 324 },
    yaka: "avrupa",
    labelOffset: { x: -2, y: 2 },
    gelir: 14, guv: 5, nufus: 130, nufusMax: 130,
    ozellik: "kale",
    aciklama: "Tarihi yarımada, surlarla çevrili"
  },
  beyoglu: {
    ad: "Beyoğlu",
    svgPath: "M 340,270 L 370,255 L 395,265 L 390,290 L 355,295 L 340,285 Z",
    center: { x: 365, y: 276 },
    yaka: "avrupa",
    labelOffset: { x: 0, y: 0 },
    gelir: 15, guv: 4, nufus: 100, nufusMax: 100,
    ozellik: "liman",
    aciklama: "İstiklal Caddesi, eğlence merkezi"
  },
  besiktas: {
    ad: "Beşiktaş",
    svgPath: "M 370,240 L 400,225 L 430,235 L 425,265 L 395,265 L 370,255 Z",
    center: { x: 398, y: 248 },
    yaka: "avrupa",
    labelOffset: { x: 2, y: -2 },
    gelir: 13, guv: 5, nufus: 90, nufusMax: 90,
    ozellik: "liman",
    aciklama: "Boğaz kıyısı, liman bölgesi"
  },
  sisli: {
    ad: "Şişli",
    svgPath: "M 330,235 L 370,220 L 370,240 L 340,270 L 315,260 L 320,240 Z",
    center: { x: 341, y: 244 },
    yaka: "avrupa",
    labelOffset: { x: 1, y: -3 },
    gelir: 12, guv: 4, nufus: 110, nufusMax: 110,
    ozellik: null,
    aciklama: "İş merkezi, alışveriş"
  },
  kagithane: {
    ad: "Kağıthane",
    svgPath: "M 310,210 L 345,195 L 370,220 L 330,235 L 310,225 Z",
    center: { x: 333, y: 217 },
    yaka: "avrupa",
    gelir: 8, guv: 3, nufus: 120, nufusMax: 120,
    ozellik: "fabrika",
    aciklama: "Sanayi bölgesi"
  },
  eyupsultan: {
    ad: "Eyüpsultan",
    svgPath: "M 265,225 L 310,210 L 310,225 L 320,240 L 315,260 L 290,270 L 260,260 Z",
    center: { x: 290, y: 241 },
    yaka: "avrupa",
    gelir: 9, guv: 3, nufus: 130, nufusMax: 130,
    ozellik: null,
    aciklama: "Tarihi ve kültürel bölge"
  },
  sariyer: {
    ad: "Sarıyer",
    svgPath: "M 380,155 L 420,140 L 445,170 L 430,200 L 400,225 L 370,220 L 345,195 L 355,170 Z",
    center: { x: 393, y: 182 },
    yaka: "avrupa",
    gelir: 10, guv: 6, nufus: 80, nufusMax: 80,
    ozellik: "kale",
    aciklama: "Boğaz'ın kuzey kapısı, stratejik nokta"
  },
  bayrampasa: {
    ad: "Bayrampaşa",
    svgPath: "M 260,260 L 290,270 L 315,285 L 320,310 L 295,315 L 270,300 L 255,280 Z",
    center: { x: 286, y: 289 },
    yaka: "avrupa",
    gelir: 7, guv: 3, nufus: 100, nufusMax: 100,
    ozellik: null,
    aciklama: "Cezaevi bölgesi"
  },
  zeytinburnu: {
    ad: "Zeytinburnu",
    svgPath: "M 270,300 L 295,315 L 320,310 L 315,335 L 300,350 L 275,340 L 260,320 Z",
    center: { x: 291, y: 324 },
    yaka: "avrupa",
    gelir: 8, guv: 3, nufus: 95, nufusMax: 95,
    ozellik: null,
    aciklama: "Tekstil ve ticaret"
  },
  bakirkoy: {
    ad: "Bakırköy",
    svgPath: "M 215,330 L 260,320 L 275,340 L 300,350 L 290,375 L 250,380 L 215,365 Z",
    center: { x: 258, y: 354 },
    yaka: "avrupa",
    gelir: 11, guv: 4, nufus: 85, nufusMax: 85,
    ozellik: "hastane",
    aciklama: "Sağlık ve adliye merkezi"
  },
  bahcelievler: {
    ad: "Bahçelievler",
    svgPath: "M 185,290 L 220,280 L 255,280 L 260,320 L 215,330 L 185,315 Z",
    center: { x: 220, y: 303 },
    yaka: "avrupa",
    gelir: 8, guv: 3, nufus: 115, nufusMax: 115,
    ozellik: null,
    aciklama: "Konut bölgesi"
  },
  bagcilar: {
    ad: "Bağcılar",
    svgPath: "M 175,250 L 220,235 L 255,250 L 255,280 L 220,280 L 185,290 L 170,270 Z",
    center: { x: 211, y: 264 },
    yaka: "avrupa",
    gelir: 7, guv: 2, nufus: 140, nufusMax: 140,
    ozellik: "fabrika",
    aciklama: "Yoğun nüfus, sanayi"
  },
  kucukcekmece: {
    ad: "Küçükçekmece",
    svgPath: "M 120,280 L 170,270 L 185,290 L 185,315 L 160,340 L 125,330 L 110,305 Z",
    center: { x: 147, y: 304 },
    yaka: "avrupa",
    gelir: 7, guv: 2, nufus: 130, nufusMax: 130,
    ozellik: null,
    aciklama: "Göl kenarı, geniş alan"
  },
  avcilar: {
    ad: "Avcılar",
    svgPath: "M 80,320 L 110,305 L 125,330 L 160,340 L 155,370 L 120,380 L 80,365 Z",
    center: { x: 118, y: 347 },
    yaka: "avrupa",
    gelir: 6, guv: 2, nufus: 110, nufusMax: 110,
    ozellik: null,
    aciklama: "Üniversite bölgesi"
  },
  esenyurt: {
    ad: "Esenyurt",
    svgPath: "M 55,245 L 110,230 L 120,280 L 80,320 L 50,300 L 40,270 Z",
    center: { x: 76, y: 274 },
    yaka: "avrupa",
    gelir: 5, guv: 2, nufus: 140, nufusMax: 140,
    ozellik: null,
    aciklama: "En kalabalık ilçe"
  },
  basaksehir: {
    ad: "Başakşehir",
    svgPath: "M 120,200 L 175,190 L 175,250 L 120,280 L 90,255 L 100,220 Z",
    center: { x: 130, y: 237 },
    yaka: "avrupa",
    gelir: 9, guv: 4, nufus: 100, nufusMax: 100,
    ozellik: "hastane",
    aciklama: "Yeni şehir merkezi, hastane"
  },
  arnavutkoy: {
    ad: "Arnavutköy",
    yaka: "avrupa",
    gelir: 6, guv: 2, nufus: 95, nufusMax: 95,
    ozellik: null,
    aciklama: "Havalimanı çevresi, geniş kırsal alan"
  },
  beylikduzu: {
    ad: "Beylikdüzü",
    yaka: "avrupa",
    gelir: 8, guv: 3, nufus: 115, nufusMax: 115,
    ozellik: "carsi",
    aciklama: "Planlı yerleşim ve sahil hattı"
  },
  buyukcekmece: {
    ad: "Büyükçekmece",
    yaka: "avrupa",
    gelir: 7, guv: 3, nufus: 100, nufusMax: 100,
    ozellik: "liman",
    aciklama: "Göl ve sahil koridoru"
  },
  catalca: {
    ad: "Çatalca",
    yaka: "avrupa",
    gelir: 5, guv: 2, nufus: 70, nufusMax: 70,
    ozellik: null,
    aciklama: "Geniş kırsal geçiş bölgesi"
  },
  esenler: {
    ad: "Esenler",
    yaka: "avrupa",
    gelir: 7, guv: 3, nufus: 120, nufusMax: 120,
    ozellik: "fabrika",
    aciklama: "Otogar ve lojistik aksı"
  },
  gaziosmanpasa: {
    ad: "Gaziosmanpaşa",
    yaka: "avrupa",
    gelir: 7, guv: 3, nufus: 120, nufusMax: 120,
    ozellik: null,
    aciklama: "Yoğun yerleşim, merkez geçiş hattı"
  },
  gungoren: {
    ad: "Güngören",
    yaka: "avrupa",
    gelir: 7, guv: 3, nufus: 95, nufusMax: 95,
    ozellik: "carsi",
    aciklama: "Tekstil ve çarşı odaklı bölge"
  },
  silivri: {
    ad: "Silivri",
    yaka: "avrupa",
    gelir: 6, guv: 2, nufus: 85, nufusMax: 85,
    ozellik: null,
    aciklama: "Batı kapısı, uzun sahil şeridi"
  },
  sultangazi: {
    ad: "Sultangazi",
    yaka: "avrupa",
    gelir: 6, guv: 2, nufus: 125, nufusMax: 125,
    ozellik: "gecekondu",
    aciklama: "Yüksek nüfuslu kuzey yerleşimi"
  },

  // === ASYA YAKASI (Sağ) ===
  uskudar: {
    ad: "Üsküdar",
    svgPath: "M 480,280 L 515,265 L 540,275 L 545,305 L 525,325 L 495,320 L 475,305 Z",
    center: { x: 511, y: 296 },
    yaka: "asya",
    labelOffset: { x: -5, y: 2 },
    gelir: 11, guv: 4, nufus: 110, nufusMax: 110,
    ozellik: null,
    aciklama: "Boğaz kıyısı, tarihi"
  },
  kadikoy: {
    ad: "Kadıköy",
    svgPath: "M 495,320 L 525,325 L 555,335 L 560,365 L 535,380 L 500,370 L 485,345 Z",
    center: { x: 522, y: 349 },
    yaka: "asya",
    labelOffset: { x: 2, y: 2 },
    gelir: 14, guv: 4, nufus: 105, nufusMax: 105,
    ozellik: "liman",
    aciklama: "Ticaret ve kültür merkezi"
  },
  atasehir: {
    ad: "Ataşehir",
    svgPath: "M 555,335 L 590,320 L 620,335 L 625,360 L 600,375 L 560,365 Z",
    center: { x: 591, y: 348 },
    yaka: "asya",
    gelir: 12, guv: 4, nufus: 100, nufusMax: 100,
    ozellik: null,
    aciklama: "Finans merkezi"
  },
  umraniye: {
    ad: "Ümraniye",
    svgPath: "M 545,270 L 590,255 L 620,275 L 620,300 L 590,320 L 555,310 L 540,285 Z",
    center: { x: 580, y: 287 },
    yaka: "asya",
    gelir: 9, guv: 3, nufus: 130, nufusMax: 130,
    ozellik: "fabrika",
    aciklama: "Sanayi ve ticaret"
  },
  beykoz: {
    ad: "Beykoz",
    svgPath: "M 510,185 L 555,170 L 590,195 L 590,230 L 570,255 L 540,265 L 515,250 L 500,220 Z",
    center: { x: 546, y: 221 },
    yaka: "asya",
    gelir: 8, guv: 5, nufus: 75, nufusMax: 75,
    ozellik: "kale",
    aciklama: "Boğaz'ın kuzey kapısı, orman"
  },
  cekmekoy: {
    ad: "Çekmeköy",
    svgPath: "M 620,240 L 670,230 L 690,260 L 680,290 L 650,300 L 620,275 Z",
    center: { x: 655, y: 266 },
    yaka: "asya",
    gelir: 6, guv: 3, nufus: 90, nufusMax: 90,
    ozellik: null,
    aciklama: "Yeşil alan, yeni yerleşim"
  },
  sile: {
    ad: "Şile",
    yaka: "asya",
    gelir: 5, guv: 3, nufus: 60, nufusMax: 60,
    ozellik: "kale",
    aciklama: "Karadeniz kıyısı, stratejik kuzey hattı"
  },
  maltepe: {
    ad: "Maltepe",
    svgPath: "M 600,375 L 625,360 L 660,370 L 665,400 L 640,415 L 605,405 Z",
    center: { x: 632, y: 388 },
    yaka: "asya",
    gelir: 9, guv: 3, nufus: 105, nufusMax: 105,
    ozellik: null,
    aciklama: "Sahil şeridi"
  },
  kartal: {
    ad: "Kartal",
    svgPath: "M 640,415 L 665,400 L 700,410 L 710,440 L 685,455 L 650,445 Z",
    center: { x: 675, y: 428 },
    yaka: "asya",
    gelir: 8, guv: 3, nufus: 110, nufusMax: 110,
    ozellik: null,
    aciklama: "Sanayi dönüşüm bölgesi"
  },
  pendik: {
    ad: "Pendik",
    svgPath: "M 685,455 L 710,440 L 750,450 L 760,480 L 735,495 L 700,485 Z",
    center: { x: 723, y: 468 },
    yaka: "asya",
    gelir: 8, guv: 3, nufus: 120, nufusMax: 120,
    ozellik: null,
    aciklama: "Lojistik merkez"
  },
  tuzla: {
    ad: "Tuzla",
    svgPath: "M 735,495 L 760,480 L 800,490 L 810,520 L 785,535 L 750,525 Z",
    center: { x: 773, y: 508 },
    yaka: "asya",
    gelir: 7, guv: 3, nufus: 90, nufusMax: 90,
    ozellik: "fabrika",
    aciklama: "Tersane ve organize sanayi"
  },
  sultanbeyli: {
    ad: "Sultanbeyli",
    yaka: "asya",
    gelir: 6, guv: 2, nufus: 110, nufusMax: 110,
    ozellik: null,
    aciklama: "İç Anadolu geçiş bağlantısı"
  },
  sancaktepe: {
    ad: "Sancaktepe",
    svgPath: "M 650,300 L 680,290 L 710,305 L 710,335 L 685,350 L 660,340 L 650,315 Z",
    center: { x: 678, y: 319 },
    yaka: "asya",
    gelir: 6, guv: 2, nufus: 115, nufusMax: 115,
    ozellik: null,
    aciklama: "Yeni yerleşim alanı"
  },
};

const ISTANBUL_ILCE_META = Object.fromEntries(
  Object.entries(ISTANBUL_ILCE_KAYNAK).map(([id, ilce]) => {
    const {
      svgPath: _eskiPath,
      center: _eskiCenter,
      labelPoint: _eskiLabelPoint,
      bbox: _eskiBbox,
      ...meta
    } = ilce;
    return [id, meta];
  })
);

function istanbulIlceVerisiniHazirla() {
  const ilceIds = Object.keys(ISTANBUL_ILCE_META);
  const eksikler = ilceIds.filter((id) => !ISTANBUL_GEOMETRI[id]);
  if (eksikler.length) {
    throw new Error(`[istanbul] Geometri eksik: ${eksikler.join(", ")}`);
  }

  return Object.fromEntries(
    ilceIds.map((id) => {
      const meta = ISTANBUL_ILCE_META[id];
      const geometri = ISTANBUL_GEOMETRI[id];
      return [
        id,
        {
          ...meta,
          svgPath: geometri.svgPath,
          center: { ...geometri.center },
          labelPoint: { ...(geometri.labelPoint || geometri.center) },
          bbox: { ...geometri.bbox },
        },
      ];
    })
  );
}

export const ISTANBUL_ILCELER = istanbulIlceVerisiniHazirla();

// =============================================
// KOMŞULUK HARİTASI (gerçek coğrafi komşuluklar)
// =============================================
export const ISTANBUL_KOMSU = {
  // Avrupa
  fatih: ["beyoglu", "bayrampasa", "zeytinburnu", "uskudar"],
  beyoglu: ["fatih", "besiktas", "sisli", "eyupsultan", "kagithane"],
  besiktas: ["beyoglu", "sisli", "sariyer", "uskudar"],
  sisli: ["beyoglu", "besiktas", "kagithane", "eyupsultan"],
  kagithane: ["beyoglu", "sisli", "sariyer", "eyupsultan"],
  eyupsultan: ["beyoglu", "sisli", "kagithane", "bagcilar", "basaksehir", "gaziosmanpasa", "sultangazi", "arnavutkoy"],
  sariyer: ["besiktas", "kagithane", "beykoz"],
  bayrampasa: ["fatih", "zeytinburnu", "bagcilar", "gaziosmanpasa", "esenler", "gungoren"],
  zeytinburnu: ["fatih", "bayrampasa", "bakirkoy", "gungoren"],
  bakirkoy: ["zeytinburnu", "bahcelievler", "kucukcekmece"],
  bahcelievler: ["bakirkoy", "bagcilar", "kucukcekmece", "gungoren"],
  bagcilar: ["eyupsultan", "bayrampasa", "bahcelievler", "kucukcekmece", "basaksehir", "esenler", "gungoren", "gaziosmanpasa"],
  kucukcekmece: ["bahcelievler", "bagcilar", "avcilar", "bakirkoy", "basaksehir"],
  avcilar: ["kucukcekmece", "esenyurt", "beylikduzu", "buyukcekmece"],
  esenyurt: ["avcilar", "basaksehir", "beylikduzu", "buyukcekmece", "arnavutkoy"],
  basaksehir: ["eyupsultan", "bagcilar", "esenyurt", "sultangazi", "arnavutkoy", "kucukcekmece"],
  arnavutkoy: ["basaksehir", "esenyurt", "sultangazi", "catalca", "buyukcekmece", "eyupsultan"],
  beylikduzu: ["avcilar", "esenyurt", "buyukcekmece"],
  buyukcekmece: ["beylikduzu", "esenyurt", "avcilar", "arnavutkoy", "catalca", "silivri"],
  catalca: ["arnavutkoy", "buyukcekmece", "silivri"],
  silivri: ["buyukcekmece", "catalca"],
  sultangazi: ["eyupsultan", "basaksehir", "arnavutkoy", "esenler", "gaziosmanpasa"],
  esenler: ["bayrampasa", "bagcilar", "gungoren", "gaziosmanpasa", "sultangazi"],
  gaziosmanpasa: ["eyupsultan", "bayrampasa", "bagcilar", "esenler", "gungoren", "sultangazi"],
  gungoren: ["zeytinburnu", "bayrampasa", "bahcelievler", "bagcilar", "esenler", "gaziosmanpasa"],

  // Asya
  uskudar: ["fatih", "besiktas", "kadikoy", "umraniye", "beykoz"],
  kadikoy: ["uskudar", "atasehir", "maltepe"],
  atasehir: ["kadikoy", "umraniye", "maltepe", "sancaktepe"],
  umraniye: ["uskudar", "atasehir", "beykoz", "cekmekoy", "sancaktepe"],
  beykoz: ["sariyer", "uskudar", "umraniye", "cekmekoy", "sile"],
  cekmekoy: ["umraniye", "beykoz", "sancaktepe", "sultanbeyli", "sile"],
  sile: ["beykoz", "cekmekoy"],
  maltepe: ["kadikoy", "atasehir", "kartal", "sancaktepe"],
  kartal: ["maltepe", "sancaktepe", "pendik", "sultanbeyli"],
  pendik: ["kartal", "tuzla", "sancaktepe", "sultanbeyli"],
  tuzla: ["pendik"],
  sultanbeyli: ["cekmekoy", "sancaktepe", "kartal", "pendik"],
  sancaktepe: ["atasehir", "umraniye", "cekmekoy", "kartal", "pendik", "sultanbeyli", "maltepe"],
};

// =============================================
// KÖPRÜ BAĞLANTILARI (Boğaz geçişleri)
// =============================================
export const KOPRULER = [
  { ad: "15 Temmuz Köprüsü", avrupa: "besiktas", asya: "uskudar", minMesafe: 20, kaydir: -1.2 },
  { ad: "Fatih Sultan Mehmet Köprüsü", avrupa: "sariyer", asya: "beykoz", minMesafe: 30, kaydir: -2.5 },
  { ad: "Avrasya Tüneli", avrupa: "fatih", asya: "uskudar", denizalti: true, minMesafe: 22, kaydir: 1.2 },
];

// =============================================
// BOĞAZ ÇİZİMİ (su alanı)
// =============================================
export const BOGAZ_PATH = "M 445,130 C 450,160 460,180 455,210 C 450,240 440,260 445,290 C 450,310 460,330 455,360 C 450,390 440,410 445,440";

// =============================================
// BAŞLANGIÇ KONUMLARI
// =============================================
export const BASLANGIC_KONUMLARI = {
  kucuk: { // 38 ilçe (Adalar hariç)
    bolgeler: Object.keys(ISTANBUL_ILCELER) || [],
    biz: "fatih",
    ai1: "esenyurt",
    ai2: "tuzla",
    ai3: "beykoz",
  },
  buyuk: { // 38 ilçe (Adalar hariç)
    bolgeler: Object.keys(ISTANBUL_ILCELER) || [],
    biz: "fatih",
    ai1: "esenyurt",
    ai2: "tuzla",
    ai3: "beykoz",
  }
};


// Başlangıç bölgeleri oluştur
export function istanbulBolgelerOlustur(boyut, zorluk, secenekler = null) {
  const ZORLUK_MAP = {
    kolay: { aiGuvBonus: 0 },
    orta: { aiGuvBonus: 0 },
    zor: { aiGuvBonus: 1 },
  };
  const z = ZORLUK_MAP[zorluk] || ZORLUK_MAP.orta;

  const varsayilanKonum = boyut === "buyuk" ? BASLANGIC_KONUMLARI.buyuk : BASLANGIC_KONUMLARI.kucuk;
  const override = (secenekler && typeof secenekler === "object" && secenekler.baslangicKonumlari)
    ? secenekler.baslangicKonumlari
    : null;
  const konum = {
    ...varsayilanKonum,
    ...(override && typeof override === "object" ? override : {}),
  };
  const ilceIds = konum.bolgeler.length > 0 ? konum.bolgeler : Object.keys(ISTANBUL_ILCELER);

  const bolgeler = [];
  for (const id of ilceIds) {
    const ilce = ISTANBUL_ILCELER[id];
    if (!ilce) continue;

    bolgeler.push({
      id,
      ad: ilce.ad,
      gelir: ilce.gelir,
      guv: Math.max(1, ilce.guv + (z.aiGuvBonus || 0)),
      nufus: ilce.nufus,
      nufusMax: ilce.nufusMax,
      owner: "tarafsiz",
      garnizon: Math.max(3, Math.round(ilce.nufus / 25)),
      yGel: 0, yGuv: 0, yAdam: 0,
      ozellik: ilce.ozellik,
    });
  }

  // Başlangıç sahiplikleri ata
  const tercihSira = Object.freeze(["biz", "ai1", "ai2", "ai3"]);
  const fallbackAdaylar = Object.freeze({
    biz: ["fatih", "besiktas", "uskudar", "kadikoy", "sisli"],
    ai1: ["esenyurt", "buyukcekmece", "basaksehir", "arnavutkoy"],
    ai2: ["tuzla", "pendik", "kartal", "sultanbeyli"],
    ai3: ["beykoz", "sariyer", "cekmekoy", "sancaktepe"],
  });

  const ata = (bolgeId, owner) => {
    let b = bolgeler.find((x) => x.id === bolgeId && x.owner === "tarafsiz");
    if (!b) {
      const adaylar = fallbackAdaylar[owner] || [];
      b = adaylar
        .map((id) => bolgeler.find((x) => x.id === id && x.owner === "tarafsiz"))
        .find(Boolean);
    }
    if (!b) b = bolgeler.find((x) => x.owner === "tarafsiz");
    if (b) {
      b.owner = owner;
      b.garnizon = owner === "biz" ? 4 : Math.max(8, Math.round(b.nufus / 20));
      b.baslangicBirimTipi = "tetikci";
    }
  };

  tercihSira.forEach((owner) => ata(konum[owner], owner));

  return bolgeler;
}

// Komşuluk haritasını filtrele (sadece aktif ilçeler)
export function istanbulKomsuOlustur(aktifIds) {
  const komsu = {};
  for (const id of aktifIds) {
    komsu[id] = (ISTANBUL_KOMSU[id] || []).filter(k => aktifIds.includes(k));
  }
  return komsu;
}
