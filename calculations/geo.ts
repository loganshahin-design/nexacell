import type { LatLng } from "@/data/zone";

const R_EARTH = 6371;
const rad = Math.PI / 180;

export function distance(a: LatLng, b: LatLng) {
  const h =
    Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 +
    Math.cos(a[0] * rad) *
      Math.cos(b[0] * rad) *
      Math.sin(((b[1] - a[1]) * rad) / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

// Azimute de a para b, em graus a partir do norte, sentido horário.
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad);
  const x =
    Math.cos(a[0] * rad) * Math.sin(b[0] * rad) -
    Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

export function offset(p: LatLng, northKm: number, eastKm: number): LatLng {
  return [
    p[0] + northKm / 110.574,
    p[1] + eastKm / (111.32 * Math.cos(p[0] * rad)),
  ];
}

export function pointInPolygon(p: LatLng, poly: LatLng[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i],
      [yj, xj] = poly[j];
    if (yi > p[0] !== yj > p[0] && p[1] < xi + ((p[0] - yi) * (xj - xi)) / (yj - yi))
      inside = !inside;
  }
  return inside;
}

export function bbox(poly: LatLng[]): [LatLng, LatLng] {
  const lats = poly.map((p) => p[0]),
    lngs = poly.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

// Área em km² por projecção local (erro desprezável a esta escala).
export function polygonArea(poly: LatLng[]) {
  const lat0 = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const kx = 111.32 * Math.cos(lat0 * rad),
    ky = 110.574;
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    s += a[1] * kx * (b[0] * ky) - b[1] * kx * (a[0] * ky);
  }
  return Math.abs(s) / 2;
}

export function centroid(poly: LatLng[]): LatLng {
  const n = poly.length;
  return [
    poly.reduce((s, p) => s + p[0], 0) / n,
    poly.reduce((s, p) => s + p[1], 0) / n,
  ];
}

// Pontos de uma grelha regular dentro do polígono (centros das células).
export function gridInside(poly: LatLng[], n: number) {
  const [sw, ne] = bbox(poly);
  const dLat = (ne[0] - sw[0]) / n,
    dLng = (ne[1] - sw[1]) / n;
  const cells: { p: LatLng; dLat: number; dLng: number }[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const p: LatLng = [sw[0] + (y + 0.5) * dLat, sw[1] + (x + 0.5) * dLng];
      if (pointInPolygon(p, poly)) cells.push({ p, dLat, dLng });
    }
  return cells;
}

export function routeLength(route: LatLng[]) {
  let s = 0;
  for (let i = 1; i < route.length; i++) s += distance(route[i - 1], route[i]);
  return s;
}

// Amostras ao longo da rota, a cada `step` km.
export function sampleRoute(route: LatLng[], step: number) {
  const out: { p: LatLng; km: number }[] = [{ p: route[0], km: 0 }];
  let travelled = 0,
    next = step;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i],
      seg = distance(a, b);
    while (next <= travelled + seg) {
      const t = (next - travelled) / seg;
      out.push({ p: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], km: next });
      next += step;
    }
    travelled += seg;
  }
  return out;
}
