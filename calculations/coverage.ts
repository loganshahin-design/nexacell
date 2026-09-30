import { BTS, Params } from "@/types";
import type { LatLng } from "@/data/zone";
import { angleDiff, elevation, patternLoss } from "./antenna";
import { bearing, distance, gridInside, sampleRoute } from "./geo";
import { hata, powerPerRe, resourceBlocks } from "./propagation";
import { linkBudget } from "./network";

// Classes do INCM para LTE (dBm).
export const classes = [
  { key: "good", label: "Boa", min: -85, color: "#15803d" },
  { key: "fair", label: "Aceitável", min: -95, color: "#65c466" },
  { key: "poor", label: "Má", min: -105, color: "#facc15" },
  { key: "none", label: "Não existe", min: -Infinity, color: "#dc2626" },
] as const;

export type ClassKey = (typeof classes)[number]["key"];

export const classify = (rsrp: number) =>
  classes.find((c) => rsrp >= c.min) ?? classes[3];

// RSRP mediano no exterior e a BTS servidora (a de sinal mais forte).
export function rsrpAt(p: Params, stations: BTS[], point: LatLng) {
  const nRb = resourceBlocks(p.bandwidth);
  let best = -Infinity,
    server: string | null = null;
  for (const b of stations) {
    if (!b.enabled) continue;
    const site: LatLng = [b.lat, b.lng];
    const d = distance(site, point);
    const h = b.height ?? p.height,
      tilt = b.tilt ?? p.tilt,
      power = b.power ?? p.power;
    const az = bearing(site, point);
    const el = elevation(h, p.mobileHeight, d);
    const loss = hata(p.frequency, h, p.mobileHeight, d, p.environment);
    const re = powerPerRe(power, nRb) + p.gain - p.cable + p.ueGain - loss;
    for (let s = 0; s < p.sectors; s++) {
      const sectorAz = b.azimuth + (s * 360) / p.sectors;
      const off =
        p.sectors === 1 ? 0 : angleDiff(az, sectorAz);
      const rsrp = re - patternLoss(off, el, p, tilt);
      if (rsrp > best) {
        best = rsrp;
        server = `${b.id}/S${s + 1}`;
      }
    }
  }
  return { rsrp: best, server };
}

export function coverageMap(
  p: Params,
  stations: BTS[],
  polygon: LatLng[],
  resolution = 60,
) {
  const design = linkBudget(p).designRsrp;
  const cells = gridInside(polygon, resolution).map((c) => {
    const r = rsrpAt(p, stations, c.p);
    return { ...c, ...r, cls: classify(r.rsrp).key as ClassKey };
  });
  const n = cells.length || 1;
  const count = (k: ClassKey) => cells.filter((c) => c.cls === k).length;
  const share = Object.fromEntries(
    classes.map((c) => [c.key, (count(c.key) / n) * 100]),
  ) as Record<ClassKey, number>;
  return {
    cells,
    share,
    // % da área com RSRP ≥ limiar (critério do INCM, valor mediano).
    meetsThreshold: (cells.filter((c) => c.rsrp >= p.rsrpMin).length / n) * 100,
    // % da área com RSRP ≥ RSRP de projecto (limiar + margens).
    designCoverage: (cells.filter((c) => c.rsrp >= design).length / n) * 100,
    designRsrp: design,
  };
}

export function driveTest(
  p: Params,
  stations: BTS[],
  route: LatLng[],
  step = 0.05,
) {
  const samples = sampleRoute(route, step).map((s) => {
    const r = rsrpAt(p, stations, s.p);
    return { ...s, ...r, cls: classify(r.rsrp).key as ClassKey };
  });
  const n = samples.length || 1;
  const share = Object.fromEntries(
    classes.map((c) => [
      c.key,
      (samples.filter((s) => s.cls === c.key).length / n) * 100,
    ]),
  ) as Record<ClassKey, number>;
  return {
    samples,
    share,
    meets: (samples.filter((s) => s.rsrp >= p.rsrpMin).length / n) * 100,
    min: Math.min(...samples.map((s) => s.rsrp)),
    max: Math.max(...samples.map((s) => s.rsrp)),
    mean: samples.reduce((a, s) => a + s.rsrp, 0) / n,
  };
}
