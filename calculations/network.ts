import { Params, BTS } from "@/types";
import { center } from "@/data/defaults";
export const fspl = (d: number, f: number) =>
  32.44 + 20 * Math.log10(d) + 20 * Math.log10(f);
export const wavelength = (f: number) => 299792458 / (f * 1e6);
export const erlang = (n: number, c: number, t: number) => (n * c * t) / 3600;
export const hexArea = (r: number) => ((3 * Math.sqrt(3)) / 2) * r * r;
export function distance(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((c - a) * rad) / 2) ** 2 +
    Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
export function bounds(area: number): [[number, number], [number, number]] {
  const side = Math.sqrt(area);
  return [
    [
      center[0] - side / 222.64,
      center[1] - side / (222.64 * Math.cos((center[0] * Math.PI) / 180)),
    ],
    [
      center[0] + side / 222.64,
      center[1] + side / (222.64 * Math.cos((center[0] * Math.PI) / 180)),
    ],
  ];
}
export function calculate(p: Params, stations: BTS[]) {
  const users = (p.population * p.penetration) / 100;
  const active = (users * p.active) / 100;
  const traffic = erlang(users, p.calls, p.duration);
  const loss = fspl(p.distance, p.frequency);
  const received = p.power + p.gain + p.receiveGain - loss - p.cable - p.other;
  const margin = received - p.sensitivity;
  const useful = hexArea(p.radius) * (1 - p.overlap / 100);
  const capacityPerSite = (p.bandwidth * p.efficiency * 3) / p.reuse;
  const demand = active * p.demand;
  const required = Math.max(
    Math.ceil(p.area / useful),
    Math.ceil(demand / capacityPerSite),
  );
  const enabled = stations.filter((b) => b.enabled);
  const bb = bounds(p.area);
  let covered = 0,
    overlapping = 0;
  const total = 3600;
  for (let x = 0; x < 60; x++)
    for (let y = 0; y < 60; y++) {
      const lat = bb[0][0] + ((x + 0.5) / 60) * (bb[1][0] - bb[0][0]);
      const lng = bb[0][1] + ((y + 0.5) / 60) * (bb[1][1] - bb[0][1]);
      const count = enabled.filter(
        (b) => distance(lat, lng, b.lat, b.lng) <= b.radius,
      ).length;
      if (count) covered++;
      if (count > 1) overlapping++;
    }
  const coverage = (covered / total) * 100;
  const capacity = enabled.reduce(
    (sum, b) => sum + (p.bandwidth * p.efficiency * b.sectors) / p.reuse,
    0,
  );
  return {
    area: p.area,
    users,
    active,
    traffic,
    loss,
    received,
    margin,
    useful,
    required,
    coverage,
    overlap: (overlapping / total) * 100,
    servedArea: (p.area * coverage) / 100,
    coveredUsers: (users * coverage) / 100,
    capacity,
    demand,
    load: capacity ? (demand / capacity) * 100 : 0,
    lambda: wavelength(p.frequency),
    reuseDistance: p.radius * Math.sqrt(3 * p.reuse),
  };
}
