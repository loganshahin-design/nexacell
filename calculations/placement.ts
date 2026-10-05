import { BTS } from "@/types";
import type { LatLng } from "@/data/zone";
import { centroid, distance, gridInside } from "./geo";

// Distribui `count` BTS uniformemente dentro do polígono:
// 1) escolha inicial pelo ponto mais afastado (determinística);
// 2) iterações de Lloyd: cada BTS vai para o centro da área que serve.
// A colocação só depende do polígono e do nº de BTS: guarda-se o resultado,
// porque o critério do mapa (calculations/dimension.ts) testa vários números.
const cache = new WeakMap<LatLng[], Map<number, BTS[]>>();

export function autoPlace(polygon: LatLng[], count: number): BTS[] {
  let byCount = cache.get(polygon);
  if (!byCount) cache.set(polygon, (byCount = new Map()));
  let list = byCount.get(count);
  if (!list) byCount.set(count, (list = placeSites(polygon, count)));
  return list.map((b) => ({ ...b }));
}

function placeSites(polygon: LatLng[], count: number): BTS[] {
  const pts = gridInside(polygon, 50).map((c) => c.p);
  if (!pts.length || count < 1) return [];
  const c = centroid(polygon);
  const sites: LatLng[] = [
    pts.reduce((a, b) => (distance(a, c) <= distance(b, c) ? a : b)),
  ];
  while (sites.length < Math.min(count, pts.length)) {
    let far = pts[0],
      farD = -1;
    for (const p of pts) {
      const d = Math.min(...sites.map((s) => distance(s, p)));
      if (d > farD) {
        farD = d;
        far = p;
      }
    }
    sites.push(far);
  }
  for (let it = 0; it < 40; it++) {
    const sum = sites.map(() => [0, 0, 0]);
    for (const p of pts) {
      let k = 0,
        kd = Infinity;
      sites.forEach((s, i) => {
        const d = distance(s, p);
        if (d < kd) {
          kd = d;
          k = i;
        }
      });
      sum[k][0] += p[0];
      sum[k][1] += p[1];
      sum[k][2]++;
    }
    sites.forEach((s, i) => {
      if (sum[i][2]) sites[i] = [sum[i][0] / sum[i][2], sum[i][1] / sum[i][2]];
    });
  }
  return sites
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .map((s, i) => ({
      id: `BTS-${String(i + 1).padStart(2, "0")}`,
      lat: +s[0].toFixed(5),
      lng: +s[1].toFixed(5),
      enabled: true,
      azimuth: 0,
    }));
}

export function nextId(stations: BTS[]) {
  const used = new Set(stations.map((s) => s.id));
  let i = stations.length + 1;
  while (used.has(`BTS-${String(i).padStart(2, "0")}`)) i++;
  return `BTS-${String(i).padStart(2, "0")}`;
}
