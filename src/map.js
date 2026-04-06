import { oyun } from "./state.js";

export function komsuMu(aId, bId) {
  return oyun.komsu[aId]?.includes(bId);
}

export function kisaRota(basId, hedefId) {
  if (basId === hedefId) return [basId];
  const q = [basId],
    came = {},
    vis = new Set([basId]);
  while (q.length) {
    const u = q.shift();
    for (const v of oyun.komsu[u] || []) {
      if (vis.has(v)) continue;
      vis.add(v);
      came[v] = u;
      if (v === hedefId) {
        const path = [v];
        let cur = v;
        while (cur !== basId) {
          cur = came[cur];
          path.push(cur);
        }
        return path.reverse();
      }
      q.push(v);
    }
  }
  return null;
}

/* --- YENİ: owner’a ait en yakın güvenli bölgeyi bul --- */
export function enYakinGuvenli(basId, owner) {
  if (!owner) return null;
  const vis = new Set([basId]);
  const q = [basId];
  while (q.length) {
    const u = q.shift();
    for (const v of oyun.komsu[u] || []) {
      if (vis.has(v)) continue;
      vis.add(v);
      const b = oyun.bolgeler.find((x) => x.id === v);
      if (b && b.owner === owner) return v; // ilk bulunan en yakındır
      q.push(v);
    }
  }
  return null; // hiç bölge yok ise
}
