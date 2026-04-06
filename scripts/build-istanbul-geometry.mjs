#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const VIEWBOX = Object.freeze({ width: 870, height: 580, padding: 24 });
const SIMPLIFY_TOLERANCE = 1.2;
const ROUND_DIGITS = 1;

const NAME_TO_ID = Object.freeze({
  "Arnavutköy": "arnavutkoy",
  "Beylikdüzü": "beylikduzu",
  "Büyükçekmece": "buyukcekmece",
  "Çatalca": "catalca",
  "Esenler": "esenler",
  "Gaziosmanpaşa": "gaziosmanpasa",
  "Güngören": "gungoren",
  "Silivri": "silivri",
  "Sultanbeyli": "sultanbeyli",
  "Sultangazi": "sultangazi",
  "Şile": "sile",
  "Fatih": "fatih",
  "Beyoğlu": "beyoglu",
  "Beşiktaş": "besiktas",
  "Şişli": "sisli",
  "Kağıthane": "kagithane",
  "Eyüpsultan": "eyupsultan",
  "Sarıyer": "sariyer",
  "Bayrampaşa": "bayrampasa",
  "Zeytinburnu": "zeytinburnu",
  "Bakırköy": "bakirkoy",
  "Bahçelievler": "bahcelievler",
  "Bağcılar": "bagcilar",
  "Küçükçekmece": "kucukcekmece",
  "Avcılar": "avcilar",
  "Esenyurt": "esenyurt",
  "Başakşehir": "basaksehir",
  "Üsküdar": "uskudar",
  "Kadıköy": "kadikoy",
  "Ataşehir": "atasehir",
  "Ümraniye": "umraniye",
  "Beykoz": "beykoz",
  "Çekmeköy": "cekmekoy",
  "Maltepe": "maltepe",
  "Kartal": "kartal",
  "Pendik": "pendik",
  "Tuzla": "tuzla",
  "Sancaktepe": "sancaktepe",
});

const TARGET_IDS = Object.freeze(Object.values(NAME_TO_ID));
const TARGET_NAMES = new Set(Object.keys(NAME_TO_ID));

function parseArgs(argv) {
  const args = {
    input: "data/istanbul-ilceler.geojson",
    output: "src/istanbul-geometry.js",
    check: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--check") {
      args.check = true;
      continue;
    }
    if (token === "--input" && argv[i + 1]) {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--output" && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Bilinmeyen arguman: ${token}`);
  }

  return args;
}

function roundN(value, digits = ROUND_DIGITS) {
  return Number(value.toFixed(digits));
}

function samePoint(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

function normalizeRing(points) {
  if (!Array.isArray(points) || points.length < 3) return [];
  const out = [];
  for (const p of points) {
    if (!p || Number.isNaN(p.x) || Number.isNaN(p.y)) continue;
    if (!samePoint(out[out.length - 1], p)) out.push(p);
  }
  if (out.length > 1 && samePoint(out[0], out[out.length - 1])) out.pop();
  if (out.length < 3) return [];
  return out;
}

function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(p.x - x, p.y - y);
}

function simplifyOpen(points, tolerance) {
  if (points.length <= 2) return points.slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDistance = 0;
    let pivot = -1;

    for (let i = start + 1; i < end; i += 1) {
      const distance = pointSegmentDistance(points[i], points[start], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        pivot = i;
      }
    }

    if (pivot !== -1 && maxDistance > tolerance) {
      keep[pivot] = true;
      stack.push([start, pivot], [pivot, end]);
    }
  }

  const simplified = [];
  for (let i = 0; i < points.length; i += 1) {
    if (keep[i]) simplified.push(points[i]);
  }
  return simplified;
}

function simplifyRing(points, tolerance) {
  const open = normalizeRing(points);
  if (open.length < 3) return [];
  const simplified = simplifyOpen(open, tolerance);
  const finalized = simplified.length >= 3 ? simplified : open;
  return finalized.concat(finalized[0]);
}

function ringCentroid(ring) {
  let area2 = 0;
  let cx2 = 0;
  let cy2 = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const p1 = ring[i];
    const p2 = ring[i + 1];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area2 += cross;
    cx2 += (p1.x + p2.x) * cross;
    cy2 += (p1.y + p2.y) * cross;
  }

  const area = area2 / 2;
  if (Math.abs(area) < 1e-9) {
    const sum = ring.slice(0, -1).reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    const n = Math.max(1, ring.length - 1);
    return { x: sum.x / n, y: sum.y / n, area: 0 };
  }

  return { x: cx2 / (6 * area), y: cy2 / (6 * area), area: Math.abs(area) };
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const intersect = yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(point, rings) {
  if (!rings.length) return false;
  if (!pointInRing(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i += 1) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

function pointInDistrict(point, districtPolygons) {
  for (const polygon of districtPolygons) {
    if (pointInPolygonRings(point, polygon)) return true;
  }
  return false;
}

function pointSegmentDistanceSquared(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    const px = point.x - a.x;
    const py = point.y - a.y;
    return px * px + py * py;
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy))
  );
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  const px = point.x - x;
  const py = point.y - y;
  return px * px + py * py;
}

function signedDistanceToDistrict(point, districtPolygons) {
  let minDistanceSq = Infinity;
  for (const polygon of districtPolygons) {
    for (const ring of polygon) {
      for (let i = 0; i < ring.length - 1; i += 1) {
        const d2 = pointSegmentDistanceSquared(point, ring[i], ring[i + 1]);
        if (d2 < minDistanceSq) minDistanceSq = d2;
      }
    }
  }
  const minDistance = Math.sqrt(Math.max(0, minDistanceSq));
  return pointInDistrict(point, districtPolygons) ? minDistance : -minDistance;
}

function findLabelPoint(districtPolygons, bbox, fallbackCenter, centroids) {
  const width = Math.max(1, bbox.maxX - bbox.minX);
  const height = Math.max(1, bbox.maxY - bbox.minY);
  const minSpan = Math.max(1, Math.min(width, height));
  const coarseStep = Math.max(4, Math.min(14, minSpan / 6));
  const clampX = (x) => Math.max(bbox.minX, Math.min(bbox.maxX, x));
  const clampY = (y) => Math.max(bbox.minY, Math.min(bbox.maxY, y));

  let best = null;
  const consider = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const px = clampX(x);
    const py = clampY(y);
    const score = signedDistanceToDistrict({ x: px, y: py }, districtPolygons);
    if (!best || score > best.score) {
      best = { x: px, y: py, score };
    }
  };

  consider(fallbackCenter.x, fallbackCenter.y);
  consider((bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2);
  centroids.forEach((c) => consider(c.x, c.y));

  for (let y = bbox.minY; y <= bbox.maxY; y += coarseStep) {
    for (let x = bbox.minX; x <= bbox.maxX; x += coarseStep) {
      consider(x, y);
    }
  }

  if (!best || best.score <= 0) {
    const fallback = pointInDistrict(fallbackCenter, districtPolygons)
      ? fallbackCenter
      : { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
    return { x: roundN(fallback.x), y: roundN(fallback.y) };
  }

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  let step = coarseStep;
  while (step > 0.35) {
    let improved = false;
    for (const [dx, dy] of directions) {
      const candidateX = best.x + dx * step;
      const candidateY = best.y + dy * step;
      const candidateScore = signedDistanceToDistrict(
        { x: clampX(candidateX), y: clampY(candidateY) },
        districtPolygons
      );
      if (candidateScore > best.score + 1e-4) {
        best = {
          x: clampX(candidateX),
          y: clampY(candidateY),
          score: candidateScore,
        };
        improved = true;
      }
    }
    if (!improved) step /= 2;
  }

  return { x: roundN(best.x), y: roundN(best.y) };
}

function findDistrictName(feature) {
  const addr = feature?.properties?.address || {};
  const direct =
    addr.county ||
    addr.town ||
    addr.city_district ||
    addr.suburb ||
    addr.archipelago ||
    null;
  if (direct && TARGET_NAMES.has(direct)) return direct;

  const displayName = String(feature?.properties?.display_name || "").trim();
  if (displayName) {
    const candidate = displayName.split(",")[0].trim();
    if (TARGET_NAMES.has(candidate)) return candidate;
  }

  return null;
}

function geometryPolygons(feature) {
  const geometry = feature?.geometry;
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function collectBounds(records) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const record of records) {
    for (const polygon of record.polygons) {
      for (const ring of polygon) {
        for (const coord of ring) {
          const lon = Number(coord[0]);
          const lat = Number(coord[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    throw new Error("GeoJSON koordinatları okunamadi.");
  }
  return { minLon, maxLon, minLat, maxLat };
}

function buildProjector(bounds) {
  const lonSpan = Math.max(1e-9, bounds.maxLon - bounds.minLon);
  const latSpan = Math.max(1e-9, bounds.maxLat - bounds.minLat);
  const innerW = VIEWBOX.width - VIEWBOX.padding * 2;
  const innerH = VIEWBOX.height - VIEWBOX.padding * 2;
  const scale = Math.min(innerW / lonSpan, innerH / latSpan);
  const usedW = lonSpan * scale;
  const usedH = latSpan * scale;
  const offsetX = VIEWBOX.padding + (innerW - usedW) / 2;
  const offsetY = VIEWBOX.padding + (innerH - usedH) / 2;

  return (coord) => {
    const lon = Number(coord[0]);
    const lat = Number(coord[1]);
    return {
      x: roundN(offsetX + (lon - bounds.minLon) * scale),
      y: roundN(offsetY + (bounds.maxLat - lat) * scale),
    };
  };
}

function ringToPath(ring) {
  const open = ring.slice(0, -1);
  if (!open.length) return "";
  let out = `M ${open[0].x},${open[0].y}`;
  for (let i = 1; i < open.length; i += 1) out += ` L ${open[i].x},${open[i].y}`;
  out += " Z";
  return out;
}

function buildDistrictGeometry(records, projector) {
  const output = {};

  for (const record of records) {
    const allProjected = [];
    const pathParts = [];
    const centroids = [];
    const districtPolygons = [];

    for (const polygon of record.polygons) {
      const polygonRings = [];
      for (let ringIndex = 0; ringIndex < polygon.length; ringIndex += 1) {
        const rawRing = polygon[ringIndex];
        const projected = rawRing.map(projector);
        const simplified = simplifyRing(projected, SIMPLIFY_TOLERANCE);
        if (simplified.length < 4) continue;

        pathParts.push(ringToPath(simplified));
        allProjected.push(...simplified.slice(0, -1));
        polygonRings.push(simplified);
        if (ringIndex === 0) {
          const centroid = ringCentroid(simplified);
          centroids.push(centroid);
        }
      }
      if (polygonRings.length) districtPolygons.push(polygonRings);
    }

    if (!allProjected.length || !pathParts.length || !districtPolygons.length) {
      throw new Error(`${record.id} için path üretilemedi.`);
    }

    const bbox = allProjected.reduce(
      (acc, p) => ({
        minX: Math.min(acc.minX, p.x),
        minY: Math.min(acc.minY, p.y),
        maxX: Math.max(acc.maxX, p.x),
        maxY: Math.max(acc.maxY, p.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    let center;
    const totalArea = centroids.reduce((sum, c) => sum + c.area, 0);
    if (totalArea > 0) {
      const weighted = centroids.reduce(
        (acc, c) => ({ x: acc.x + c.x * c.area, y: acc.y + c.y * c.area }),
        { x: 0, y: 0 }
      );
      center = { x: roundN(weighted.x / totalArea), y: roundN(weighted.y / totalArea) };
    } else {
      center = {
        x: roundN((bbox.minX + bbox.maxX) / 2),
        y: roundN((bbox.minY + bbox.maxY) / 2),
      };
    }
    const labelPoint = findLabelPoint(districtPolygons, bbox, center, centroids);

    output[record.id] = {
      svgPath: pathParts.join(" "),
      center,
      labelPoint,
      bbox: {
        minX: roundN(bbox.minX),
        minY: roundN(bbox.minY),
        maxX: roundN(bbox.maxX),
        maxY: roundN(bbox.maxY),
      },
    };
  }

  return output;
}

function toModuleSource(geometryById) {
  const lines = [];
  lines.push("// Generated by scripts/build-istanbul-geometry.mjs");
  lines.push("// Source: data/istanbul-ilceler.geojson (OSM contributors, ODbL 1.0)");
  lines.push("");
  lines.push("export const ISTANBUL_GEOMETRI = {");
  for (const id of TARGET_IDS) {
    const g = geometryById[id];
    if (!g) throw new Error(`Eksik geometri: ${id}`);
    lines.push(`  ${id}: {`);
    lines.push(`    svgPath: ${JSON.stringify(g.svgPath)},`);
    lines.push(`    center: { x: ${g.center.x}, y: ${g.center.y} },`);
    lines.push(`    labelPoint: { x: ${g.labelPoint.x}, y: ${g.labelPoint.y} },`);
    lines.push(
      `    bbox: { minX: ${g.bbox.minX}, minY: ${g.bbox.minY}, maxX: ${g.bbox.maxX}, maxY: ${g.bbox.maxY} },`
    );
    lines.push("  },");
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, args.input);
  const outputPath = path.resolve(cwd, args.output);

  const raw = fs.readFileSync(inputPath, "utf8");
  const geojson = JSON.parse(raw);
  const features = Array.isArray(geojson.features) ? geojson.features : [];

  const pickedById = new Map();
  const unknownNames = new Set();
  for (const feature of features) {
    const name = findDistrictName(feature);
    if (!name) continue;
    const id = NAME_TO_ID[name];
    if (!id) {
      unknownNames.add(name);
      continue;
    }
    if (!pickedById.has(id)) {
      pickedById.set(id, {
        id,
        name,
        polygons: geometryPolygons(feature),
      });
    }
  }

  const missingIds = TARGET_IDS.filter((id) => !pickedById.has(id));
  if (missingIds.length) {
    throw new Error(`GeoJSON'da bulunamayan ilceler: ${missingIds.join(", ")}`);
  }

  const records = TARGET_IDS.map((id) => pickedById.get(id));
  const bounds = collectBounds(records);
  const projector = buildProjector(bounds);
  const geometries = buildDistrictGeometry(records, projector);
  const moduleSource = toModuleSource(geometries);

  if (args.check) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Check başarısız: ${args.output} bulunamadı.`);
    }
    const existing = fs.readFileSync(outputPath, "utf8");
    if (existing !== moduleSource) {
      throw new Error(`Check başarısız: ${args.output} güncel değil. Script'i tekrar çalıştırın.`);
    }
    console.log(`OK: ${args.output} güncel.`);
    return;
  }

  fs.writeFileSync(outputPath, moduleSource, "utf8");
  const extraCount = features.length - records.length;
  const unknownNote = unknownNames.size ? ` (eşlenmeyen isim: ${[...unknownNames].join(", ")})` : "";
  console.log(`Yazıldı: ${args.output} | ilce: ${records.length} | kaynak feature: ${features.length} | fazlalık: ${extraCount}${unknownNote}`);
}

main();
