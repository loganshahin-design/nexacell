import type { Params } from "@/types";
import type { LatLng } from "@/data/zone";
import { dimension } from "./network";
import { coverageMap } from "./coverage";
import { autoPlace } from "./placement";

// Critério do mapa: o menor nº de BTS (colocadas automaticamente) com que o
// mapa de cobertura atinge a meta, contando os pontos com RSRP ≥ RSRP de
// projecto. Começa no nº dado pela fórmula da área (que é optimista) e sobe.
export function btsForTarget(p: Params, polygon: LatLng[], from: number, target = p.coverageTarget) {
  const start = Math.max(1, from);
  const max = Math.max(40, start * 3);
  for (let n = start; n <= max; n++) {
    const coverage = coverageMap(p, autoPlace(polygon, n), polygon, 60).designCoverage;
    if (coverage >= target - 1e-9) return { n, coverage, reached: true };
  }
  return { n: max, coverage: NaN, reached: false };
}

// Dimensionamento completo: capacidade, cobertura pela fórmula da área e
// cobertura verificada no mapa. São precisas as BTS do critério mais exigente.
export function dimensionWithMap(p: Params, polygon: LatLng[], area: number) {
  const d = dimension(p, area);
  const map = btsForTarget(p, polygon, d.byCoverage);
  const byCover = Math.max(d.byCoverage, map.n);
  const required = Math.max(d.byCapacity, byCover);
  return {
    ...d,
    byMap: map.n,
    mapReached: map.reached,
    required,
    limiting:
      d.byCapacity > byCover
        ? ("capacidade" as const)
        : byCover > d.byCapacity
          ? ("cobertura" as const)
          : ("ambos" as const),
    load: (d.traffic.demand / (required * d.capacity.perSite)) * 100,
  };
}

export type FullDimension = ReturnType<typeof dimensionWithMap>;
