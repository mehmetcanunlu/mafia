import { rastgeleIsim } from "./utils.js";
import { LIDER_HAVUZU, rastgeleLiderSecimi } from "./liderHavuzu.js";

export {
  LIDER_HAVUZU,
  LIDER_KOKEN_AVATAR,
  LIDER_KOKEN_MATRISI,
  liderAvatarUrl,
  liderlerArasiBaslangicIliski,
} from "./liderHavuzu.js";
// Zorluk ayarları + AI davranışı
export const ZORLUK = {
  kolay: {
    aiAttackChance: 0.45,
    aiPenaltyVsPlayer: 0.2,
    aiStartPara: -100,
    aiStartHavuz: -4,
    aiGuvBonus: 0,
    recruitRate: 1.0,
    aiCooldownMin: 2,
    aiCooldownMax: 4,
    aiBribePref: 0.55,
    aiDiploEsneklik: 0.12,
  },
  orta: {
    aiAttackChance: 0.55,
    aiPenaltyVsPlayer: 0.12,
    aiStartPara: 0,
    aiStartHavuz: 0,
    aiGuvBonus: 0,
    recruitRate: 1.0,
    aiCooldownMin: 1,
    aiCooldownMax: 3,
    aiBribePref: 0.5,
    aiDiploEsneklik: 0,
  },
  zor: {
    aiAttackChance: 0.65,
    aiPenaltyVsPlayer: 0.05,
    aiStartPara: +150,
    aiStartHavuz: +4,
    aiGuvBonus: +1,
    recruitRate: 1.1,
    aiCooldownMin: 0,
    aiCooldownMax: 2,
    aiBribePref: 0.45,
    aiDiploEsneklik: -0.12,
  },
};

// Genel ayarlar
export const AYAR = {
  turSuresiMs: 1000,
  saldiriTaban: 40,
  saldiriGuvenlikCarpani: 8,
  saldiriAdamCarpani: 2,
  birimBakimMaliyeti: 0.1, // Geriye dönük varsayılan; tip bazlı bakım units.js üzerinden hesaplanır
};

export const DIPLOMASI = {
  ATESKES_SURESI: 5,
  BARIS_SURESI: 15,
  ITTIFAK_SURESI: 10,
  ITTIFAK_MALIYETI: 300,
  ITTIFAK_TUR_MALIYETI: 50,
  TICARET_SURESI: 8,
  TICARET_GELIR_BONUS: 0.08,
  TICARET_MIN_SERMAYE: 250,
  TICARET_BATMA_SANSI: 0.06,
  TICARET_BATMA_PARA_ORANI: 0.2,
  TICARET_BATMA_MIN_KAYIP: 70,
  TICARET_BATMA_MAX_KAYIP: 320,
  TICARET_BATMA_ILISKI_CEZASI: -10,
  SABOTAJ_MALIYETI: 200,
  IHANET_ITIBAR_KAYBI: 20,
  GUC_ESIGI_KOALISYON: 0.5,
  KOALISYON_SALDIRI_BONUS: 0.1,
  ITTIFAK_SALDIRI_BONUS: 0.15,
  TEHDIT_BEKLEME: 12,
  ILISKI_HAFIZA_SOLMASI: 0.5,
  GERILIM_CURUMESI: 1,
  SAVAS_CURUMESI: 2,
  SAVAS_SALDIRI_BONUS: 0.05,
  IHANET_SALDIRI_CEZA: 0.10,
};

export const MEKANIK = {
  // Tarafsız (çok zor)
  bribeNeutralBase: 400, // 400
  bribeNeutralPerGuv: 150, // +150 * güvenlik
  bribeNeutralPerNufus: 6, // +6 * nüfus (60-140 ⇒ +360~840)
  // Düşman (garnizon ve güvenlik ağır etkiler)
  bribeEnemyBase: 300, // 300
  bribeEnemyPerGuv: 120, // +120 * güvenlik
  bribeEnemyPerGarnizon: 80, // +80 * garnizon
  bribeEnemyAdjBonus: -40, // her komşu kendi bölgem için -40 indirim
  bribeMinGarrison: 8, // teslim sonrası min garnizon
  neutralMilitiaDiv: 25, // tarafsız savunma: nüfus / 25
  neutralMilitiaGuv: 2, // tarafsız savunma: güvenlik * 2 ek
};

// === LİDERLER ===
export const LIDERLER = LIDER_HAVUZU;

// === BÖLGE ÖZELLİKLERİ ===
// gelirBonus: para geliri çarpanı  | uretimBonus: adam üretim çarpanı
// regenBonus: iyileşme bonus       | savunmaBonus: savunma puanı eklemesi
// gencUretir: Genç birim otomatik üretir (gecekondu)
// riskli: polis baskını şansı 2x   | arastirmaBonus: araştırma puanı/tur
export const BOLGE_OZELLIKLERI = {
  // --- Orijinal ---
  liman:     { ad: "Liman",        ikon: "⚓", gelirBonus: 0.40, uretimBonus: 0,    regenBonus: 0,   savunmaBonus: 0 },
  fabrika:   { ad: "Fabrika",      ikon: "🏭", gelirBonus: 0,    uretimBonus: 0.30, regenBonus: 0,   savunmaBonus: 0 },
  hastane:   { ad: "Hastane",      ikon: "🏥", gelirBonus: 0,    uretimBonus: 0,    regenBonus: 1.0, savunmaBonus: 0 },
  kale:      { ad: "Kale",         ikon: "🏰", gelirBonus: 0,    uretimBonus: 0,    regenBonus: 0,   savunmaBonus: 2 },
  // --- Faz 5: Türk Mafya Bağlamı ---
  gecekondu: { ad: "Gecekondu",    ikon: "🏘️", gelirBonus: 0,    uretimBonus: 0.50, regenBonus: 0.3, savunmaBonus: 0, gencUretir: true },
  kumarhane: { ad: "Kumarhane",    ikon: "🎰", gelirBonus: 0.70, uretimBonus: 0,    regenBonus: 0,   savunmaBonus: 0, riskli: true },
  depo:      { ad: "Silah Deposu", ikon: "📦", gelirBonus: 0,    uretimBonus: 0,    regenBonus: 0,   savunmaBonus: 1.5 },
  carsi:     { ad: "Çarşı",        ikon: "🛒", gelirBonus: 0.25, uretimBonus: 0,    regenBonus: 0,   savunmaBonus: 0 },
  universite:{ ad: "Üniversite",   ikon: "🎓", gelirBonus: 0,    uretimBonus: 0.10, regenBonus: 0,   savunmaBonus: 0, arastirmaBonus: 2 },
};

// === OLAY AYARLARI ===
export const OLAY_AYAR = {
  minAra: 4,   // olaylar arası min tur
  maxAra: 7,   // olaylar arası max tur
};

// === FAZ 6: BİNA ŞABLONLARI ===
export const BINA_TIPLERI = {
  karargah: {
    ad: "Karargah",
    ikon: "🏢",
    maliyet: 220,
    seviyeMaliyetCarpani: 1.55,
    aciklama: "Gelir ve mahalle kontrolünü artırır.",
    etkiler: { gelirBonus: 0.12, savunmaBonus: 0.35 },
  },
  atolye: {
    ad: "Atölye",
    ikon: "🔧",
    maliyet: 180,
    seviyeMaliyetCarpani: 1.5,
    aciklama: "Birim ve adam üretimini hızlandırır.",
    etkiler: { uretimBonus: 0.18 },
  },
  depo: {
    ad: "Depo",
    ikon: "📦",
    maliyet: 200,
    seviyeMaliyetCarpani: 1.6,
    aciklama: "Savunma ve sevkiyat hazırlığını güçlendirir.",
    etkiler: { savunmaBonus: 0.6 },
  },
  klinik: {
    ad: "Klinik",
    ikon: "🩺",
    maliyet: 190,
    seviyeMaliyetCarpani: 1.45,
    aciklama: "Yaralıların dönüş süresini azaltır.",
    etkiler: { iyilesmeBonus: 1 },
  },
  laboratuvar: {
    ad: "Laboratuvar",
    ikon: "🧪",
    maliyet: 260,
    seviyeMaliyetCarpani: 1.7,
    aciklama: "Araştırma gelişimini hızlandırır.",
    etkiler: { arastirmaBonus: 1 },
  },
};

// === GÖREV AYARLARI ===
export const GOREV_AYAR = {
  yeniGorevAra: 20,  // her 20 turda yeni görev
  maxAktif: 2,
};

// Grid komşuluk üretimi (4x4/5x5)
export function uretKomsulukGrid(n) {
  const komsu = {};
  const id = (r, c) => `r${r}c${c}`;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const me = id(r, c);
      komsu[me] = [];
      if (r > 0) komsu[me].push(id(r - 1, c));
      if (r < n - 1) komsu[me].push(id(r + 1, c));
      if (c > 0) komsu[me].push(id(r, c - 1));
      if (c < n - 1) komsu[me].push(id(r, c + 1));
    }
  }
  return komsu;
}

// Bölge isimleri
const ISIMLER = [
  "Okul",
  "Sanayi",
  "Fındıklı",
  "Gecekondu",
  "Zengin Semt",
  "Merkez",
  "Eski Şehir",
  "Başıbüyük",
  "Zümrütevler",
  "Yenipazar",
  "Çarşı",
  "Tersane",
  "Sahil",
  "Stadyum",
  "Yıldırım",
  "Gülsuyu",
  "Hastane",
  "Bankacılar",
  "Çağlayan",
  "Parklar",
  "Otogar",
  "Sarıgazi",
  "Gazi",
  "Depo",
  "Fikirtepe",
];

// Başlangıç fraksiyonları (zorluk etkili)
export function BASLANGIC_FRAKSIYONLAR(zorluk) {
  const z = ZORLUK[zorluk];
  // Her oyun için 100 kişilik havuzdan benzersiz lider seç
  const secilen = rastgeleLiderSecimi(4);
  const [bizLider, ai1Lider, ai2Lider, ai3Lider] = secilen;
  return {
    biz: { id: "biz", ad: "Biz", havuz: 20, para: 600, lider: bizLider || LIDERLER[0], tasit: { araba: 6, motor: 10 } },
    ai1: {
      id: "ai1",
      ad: rastgeleIsim(),
      havuz: 28 + (z.aiStartHavuz || 0),
      para: 650 + (z.aiStartPara || 0),
      lider: ai1Lider || LIDERLER[1],
      tasit: { araba: 4, motor: 8 },
    },
    ai2: {
      id: "ai2",
      ad: rastgeleIsim(),
      havuz: 26 + (z.aiStartHavuz || 0),
      para: 650 + (z.aiStartPara || 0),
      lider: ai2Lider || LIDERLER[2],
      tasit: { araba: 4, motor: 8 },
    },
    ai3: {
      id: "ai3",
      ad: rastgeleIsim(),
      havuz: 24 + (z.aiStartHavuz || 0),
      para: 650 + (z.aiStartPara || 0),
      lider: ai3Lider || LIDERLER[3],
      tasit: { araba: 4, motor: 8 },
    },
  };
}

// Başlangıç bölgeleri (n=4/5)
export function BASLANGIC_BOLGELER(n, zorluk) {
  const z = ZORLUK[zorluk];
  const bolgeler = [];
  const total = n * n;
  const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Özel bölge indexleri rastgele seç (toplam 4-5 tanesi)
  const ozellikler = ["liman", "fabrika", "hastane", "kale", "gecekondu", "kumarhane", "depo", "carsi", "universite"];
  const ozellikIdx = new Set();
  while (ozellikIdx.size < Math.min(ozellikler.length, total)) {
    ozellikIdx.add(rnd(0, total - 1));
  }
  const ozellikList = [...ozellikIdx];

  for (let i = 0; i < total; i++) {
    const ad = ISIMLER[i] || `Bölge ${i + 1}`;
    const gelir = rnd(5, 15);
    const guv = Math.max(1, rnd(2, 6) + (z.aiGuvBonus || 0));
    const nufus = rnd(60, 140);
    // Özel bölge mi?
    const ozIdx = ozellikList.indexOf(i);
    const ozellik = ozIdx >= 0 ? ozellikler[ozIdx] : null;
    bolgeler.push({
      id: `r${Math.floor(i / n)}c${i % n}`,
      ad,
      gelir,
      guv,
      nufus,
      nufusMax: nufus,
      owner: "tarafsiz",
      garnizon: Math.max(3, Math.round(nufus / 25)),
      yGel: 0,
      yGuv: 0,
      yAdam: 0,
      ozellik, // null | "liman" | "fabrika" | "hastane" | "kale"
      baslangicBirimTipi: "tetikci",
    });
  }

  const center = `r${Math.floor(n / 2)}c${Math.floor(n / 2)}`;
  const ai1 = "r0c0";
  const ai2 = `r${n - 1}c${n - 1}`;

  bolgeler.find((b) => b.id === center).owner = "biz";
  bolgeler.find((b) => b.id === center).garnizon = 4;

  const b1 = bolgeler.find((b) => b.id === ai1);
  if (b1) { b1.owner = "ai1"; b1.garnizon = Math.max(8, Math.round(b1.nufus / 20)); }

  const b2 = bolgeler.find((b) => b.id === ai2);
  if (b2) { b2.owner = "ai2"; b2.garnizon = Math.max(8, Math.round(b2.nufus / 20)); }

  // AI3: Sağ üst köşe (r0, c_max) veya sol alt (r_max, c0)
  const ai3 = `r0c${n - 1}`;
  const b3 = bolgeler.find((b) => b.id === ai3);
  if (b3) { b3.owner = "ai3"; b3.garnizon = Math.max(8, Math.round(b3.nufus / 20)); }

  return bolgeler;
}

// En alta ekle (veya uygun bir yere):
export const SOHRET = {
  // 1 puan şöhret, adam gelişimine +%1 verir (100 puanda +2x toplam çarpan olmaz; aşağıda formüle bak).
  recruitPerPoint: 0.01, // 0.01 => %1
  buy5Base: 600, // +5 şöhret taban maliyeti
  buy10Base: 1100, // +10 şöhret taban maliyeti
  buyInflationPerPoint: 0.015, // mevcut şöhret başına +%1.5 ek
  gainOnAttackWin: 4, // saldırı kazanırsan +4
  gainOnAttackLose: 1, // saldırı başarısızsa teselli +1
};

export const EKONOMI_DENGE = {
  // Haraç seviyesi: gelir ↔ sadakat/asayiş dengesi
  haracSeviyeleri: {
    dusuk: {
      ad: "Düşük",
      gelirCarpani: 0.72,
      sadakatDelta: 0.35,
      suclulukDelta: -0.8,
      polisDelta: -0.35,
    },
    orta: {
      ad: "Orta",
      gelirCarpani: 1.0,
      sadakatDelta: 0,
      suclulukDelta: 0.4,
      polisDelta: 0.18,
    },
    yuksek: {
      ad: "Yüksek",
      gelirCarpani: 1.42,
      sadakatDelta: -0.55,
      suclulukDelta: 2.1,
      polisDelta: 0.95,
    },
  },
  haracGelirOrani: 0.18,
  haracNufusCarpani: 0.018,
  haracYatirimBonus: 0.08,
  haracKrizSadakatEsigi: 38,
  haracKrizPolisEtkisi: 1.2,
  haracKrizSadakatDarbe: -0.7,

  // Adam alımı limitleme
  alimiTurBazKota: 4,
  alimiTurBolgeKota: 1,
  alimiTurSadakatBoleni: 25,
  alimiTurPolisCezaEsik: 55,
  alimiTurPolisCeza: 1,
  alimiTurParaDestekEsik: 1200,
  alimiTurParaDestekBonus: 1,
  alimiTurParaCezaEsik: 220,
  alimiTurParaCeza: 1,
  toplamBirimTabanKapasite: 20,
  toplamBirimBolgeCarpani: 8,
  toplamBirimNufusCarpani: 0.07,
  toplamBirimSadakatCarpani: 0.2,
  toplamBirimMaksKapasite: 220,
  alimiEkMaliyetKisiBasi: 8,
  alimiEkMaliyetHaracCarpani: 0.35,
  alimiSadakatEsik: 4,
  alimiSadakatCezaKisiBasi: 0.22,
  alimiSadakatYuksekHaracCarpani: 1.2,
  alimiSadakatTaban: 20,
};
