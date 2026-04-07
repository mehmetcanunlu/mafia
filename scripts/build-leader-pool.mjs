import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MD_PATH = path.join(ROOT, "DIPLOMASI_SISTEMI.md");
const OUT_PATH = path.join(ROOT, "src", "liderHavuzu.js");

const GROUPS = [
  { heading: "Grup 1", id: "sokak", style: "lorelei", bg: "ffd5dc" },
  { heading: "Grup 2", id: "asker", style: "notionists-neutral", bg: "b6e3f4" },
  { heading: "Grup 3", id: "tuccar", style: "personas", bg: "c0f4c4" },
  { heading: "Grup 4", id: "militan", style: "adventurer", bg: "f4c4b6" },
  { heading: "Grup 5", id: "yabanci", style: "big-smile", bg: "e4c0f4" },
];

const GROUP_BY_HEADING = new Map(GROUPS.map((g) => [g.heading, g.id]));
const AVATAR_BY_ORIGIN = Object.fromEntries(
  GROUPS.map((g) => [g.id, { style: g.style, bg: g.bg }])
);

const MATRIX = {
  sokak: { sokak: 10, asker: -15, tuccar: -5, militan: 8, yabanci: -5 },
  asker: { sokak: -15, asker: 15, tuccar: 10, militan: -30, yabanci: -8 },
  tuccar: { sokak: -5, asker: 10, tuccar: 5, militan: -18, yabanci: 8 },
  militan: { sokak: 8, asker: -30, tuccar: -18, militan: 20, yabanci: -5 },
  yabanci: { sokak: -5, asker: -8, tuccar: 8, militan: -5, yabanci: 5 },
};

const OZELLIK_SABLONLARI = {
  savasci: { ikon: "⚔️", bonus: { saldiriGucu: 0.15 } },
  ekonomist: { ikon: "💰", bonus: { gelirCarpani: 0.25 } },
  tedavici: { ikon: "🏥", bonus: { regenBonus: 0.05 } },
  yapici: { ikon: "🏗️", bonus: { binaMaliyetiIndirim: 0.15 } },
  gizlici: { ikon: "👻", bonus: { kayipAzaltma: 0.15 } },
  rekrutcu: { ikon: "👔", bonus: { adamCarpani: 0.2 } },
};

const ORIGIN_PERSONALITY_ROTATION = {
  sokak: ["gizlici", "savasci", "rekrutcu", "gizlici", "savasci", "yapici"],
  asker: ["savasci", "tedavici", "rekrutcu", "savasci", "gizlici", "tedavici"],
  tuccar: ["ekonomist", "yapici", "rekrutcu", "ekonomist", "gizlici", "ekonomist"],
  militan: ["savasci", "gizlici", "savasci", "rekrutcu", "gizlici", "tedavici"],
  yabanci: ["gizlici", "ekonomist", "rekrutcu", "savasci", "yapici", "tedavici"],
};

function parseLeaders(mdText) {
  const lines = mdText.split(/\r?\n/);
  const leaders = [];
  let currentGroup = null;

  for (const line of lines) {
    if (line.startsWith("### Grup ")) {
      const heading = line.match(/^### (Grup \d+)/)?.[1];
      currentGroup = GROUP_BY_HEADING.get(heading) || null;
      continue;
    }

    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map((s) => s.trim());
    if (cols.length < 7) continue;

    const id = Number(cols[1]);
    if (!Number.isFinite(id) || id < 1 || id > 100) continue;

    const ad = cols[2];
    const lakap = cols[3];
    const tohum = cols[4].replace(/`/g, "");
    const sempati = Number(cols[5].replace(/−/g, "-").replace(/\+/g, "").trim());
    if (!Number.isFinite(sempati) || !currentGroup) continue;

    const ozelIliski = cols[6];
    const baglar = [];
    const bagRegex = /(Kan davası|kan davası|Eski dost|eski dost)\s*→\s*#(\d+)\s*:\s*([+\-−]\d+)/g;
    let match;
    while ((match = bagRegex.exec(ozelIliski))) {
      const tur = match[1].toLowerCase("tr-TR").includes("kan") ? "kan_davasi" : "eski_dost";
      baglar.push({
        hedef: Number(match[2]),
        deger: Number(match[3].replace(/−/g, "-")),
        tur,
      });
    }

    leaders.push({
      id,
      ad,
      lakap,
      tohum,
      koken: currentGroup,
      sempati,
      baglar,
    });
  }

  return leaders.sort((a, b) => a.id - b.id);
}

function avatarUrl(tohum, koken) {
  const avatar = AVATAR_BY_ORIGIN[koken] || AVATAR_BY_ORIGIN.sokak;
  return `https://api.dicebear.com/9.x/${avatar.style}/svg?seed=${encodeURIComponent(tohum)}&backgroundColor=${avatar.bg}`;
}

function enrich(leaders) {
  return leaders.map((l, idx) => {
    const rotation = ORIGIN_PERSONALITY_ROTATION[l.koken] || ORIGIN_PERSONALITY_ROTATION.sokak;
    const ozellik = rotation[idx % rotation.length];
    const sablon = OZELLIK_SABLONLARI[ozellik];
    const kanDavalari = l.baglar.filter((b) => b.deger < 0).map((b) => ({ hedef: b.hedef, deger: b.deger }));
    const eskiDostlar = l.baglar.filter((b) => b.deger > 0).map((b) => ({ hedef: b.hedef, deger: b.deger }));
    return {
      id: l.id,
      ad: l.ad,
      lakap: l.lakap,
      tohum: l.tohum,
      koken: l.koken,
      sempati: l.sempati,
      kanDavalari,
      eskiDostlar,
      ozelBaglar: l.baglar.map((b) => ({ hedef: b.hedef, deger: b.deger, tur: b.tur })),
      ozellik,
      bonus: sablon.bonus,
      ikon: sablon.ikon,
      avatarUrl: avatarUrl(l.tohum, l.koken),
    };
  });
}

function toJsModule(data) {
  const json = JSON.stringify(data, null, 2);
  const matrix = JSON.stringify(MATRIX, null, 2);
  const avatar = JSON.stringify(AVATAR_BY_ORIGIN, null, 2);
  return `// AUTO-GENERATED FILE. Source: DIPLOMASI_SISTEMI.md
// Re-generate with: node scripts/build-leader-pool.mjs

export const LIDER_KOKEN_MATRISI = Object.freeze(${matrix});

export const LIDER_KOKEN_AVATAR = Object.freeze(${avatar});

const LIDER_VERISI = ${json};

export const LIDER_HAVUZU = Object.freeze(
  LIDER_VERISI.map((lider) =>
    Object.freeze({
      ...lider,
      bonus: Object.freeze({ ...(lider.bonus || {}) }),
      kanDavalari: Object.freeze([...(lider.kanDavalari || [])]),
      eskiDostlar: Object.freeze([...(lider.eskiDostlar || [])]),
      ozelBaglar: Object.freeze([...(lider.ozelBaglar || [])]),
    })
  )
);

const LIDER_INDEX = new Map(LIDER_HAVUZU.map((lider) => [lider.id, lider]));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function liderById(id) {
  return LIDER_INDEX.get(Number(id)) || null;
}

export function liderKopyasi(lider) {
  if (!lider) return null;
  return {
    ...lider,
    bonus: { ...(lider.bonus || {}) },
    kanDavalari: [...(lider.kanDavalari || [])],
    eskiDostlar: [...(lider.eskiDostlar || [])],
    ozelBaglar: [...(lider.ozelBaglar || [])],
  };
}

export function rastgeleLiderSecimi(adet = 4, rng = Math.random) {
  const n = Math.max(1, Math.min(adet, LIDER_HAVUZU.length));
  const havuz = [...LIDER_HAVUZU];
  for (let i = havuz.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [havuz[i], havuz[j]] = [havuz[j], havuz[i]];
  }
  return havuz.slice(0, n).map((lider) => liderKopyasi(lider));
}

function bagDegeriTekYon(kaynak, hedefId) {
  if (!kaynak || !Array.isArray(kaynak.ozelBaglar)) return null;
  const bag = kaynak.ozelBaglar.find((b) => Number(b.hedef) === Number(hedefId));
  return Number.isFinite(bag?.deger) ? Number(bag.deger) : null;
}

export function liderOzelBagDegeri(liderA, liderB) {
  if (!liderA || !liderB) return 0;
  const ab = bagDegeriTekYon(liderA, liderB.id);
  const ba = bagDegeriTekYon(liderB, liderA.id);
  if (Number.isFinite(ab) && Number.isFinite(ba)) {
    if (Math.sign(ab) === Math.sign(ba)) {
      return Math.round((ab + ba) / 2);
    }
    return ab + ba;
  }
  if (Number.isFinite(ab)) return ab;
  if (Number.isFinite(ba)) return ba;
  return 0;
}

function matrixDegeri(kokenA, kokenB) {
  if (!kokenA || !kokenB) return 0;
  const satir = LIDER_KOKEN_MATRISI[kokenA];
  if (!satir) return 0;
  return Number(satir[kokenB]) || 0;
}

export function liderlerArasiBaslangicIliski(liderA, liderB) {
  if (!liderA || !liderB) return 0;
  const grup = matrixDegeri(liderA.koken, liderB.koken);
  const sempati = (Number(liderA.sempati) || 0) + (Number(liderB.sempati) || 0);
  const ozelBag = liderOzelBagDegeri(liderA, liderB);
  return clamp(Math.round(grup + sempati + ozelBag), -100, 100);
}

export function liderAvatarUrl(lider) {
  if (!lider?.tohum) return "";
  const avatar = LIDER_KOKEN_AVATAR[lider.koken] || LIDER_KOKEN_AVATAR.sokak;
  return \`https://api.dicebear.com/9.x/\${avatar.style}/svg?seed=\${encodeURIComponent(
    lider.tohum
  )}&backgroundColor=\${avatar.bg}\`;
}
`;
}

function main() {
  if (!fs.existsSync(MD_PATH)) {
    throw new Error(`Kaynak dosya bulunamadı: ${MD_PATH}`);
  }
  const md = fs.readFileSync(MD_PATH, "utf8");
  const parsed = parseLeaders(md);
  if (parsed.length !== 100) {
    throw new Error(`Beklenen lider sayısı 100, bulunan: ${parsed.length}`);
  }
  const data = enrich(parsed);
  const content = toJsModule(data);
  fs.writeFileSync(OUT_PATH, content, "utf8");
  console.log(`Lider havuzu üretildi: ${OUT_PATH} (${data.length} lider)`);
}

main();
