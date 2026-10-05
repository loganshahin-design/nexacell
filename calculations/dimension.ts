import type { Params } from "@/types";
import type { LatLng } from "@/data/zone";
import { dimension } from "./network";
import { coverageMap } from "./coverage";
import { autoPlace } from "./placement";

// A verificação no mapa testa vários nºs de BTS; acima deste limite o cálculo
// fica pesado (segundos) e vale só a fórmula da área.
export const MAP_LIMIT = 24;

// Critério do mapa: o menor nº de BTS (colocadas automaticamente) com que o
// mapa de cobertura atinge a meta, contando os pontos com RSRP ≥ RSRP de
// projecto. Começa no nº dado pela fórmula da área (que é optimista) e sobe.
// Devolve n = null quando não verifica: começa acima do limite ou não atinge
// a meta até ao limite.
export function btsForTarget(p: Params, polygon: LatLng[], from: number, target = p.coverageTarget, limit = MAP_LIMIT) {
  const start = Math.max(1, from);
  if (start > limit) return { n: null, coverage: NaN, reason: "limite" as const };
  for (let n = start; n <= limit; n++) {
    const coverage = coverageMap(p, autoPlace(polygon, n), polygon, 60).designCoverage;
    if (coverage >= target - 1e-9) return { n, coverage, reason: null };
  }
  return { n: null, coverage: NaN, reason: "meta" as const };
}

// Dimensionamento completo: capacidade, cobertura pela fórmula da área e
// cobertura verificada no mapa. São precisas as BTS do critério mais exigente.
export function dimensionWithMap(p: Params, polygon: LatLng[], area: number) {
  const d = dimension(p, area);
  const map = btsForTarget(p, polygon, d.byCoverage);
  // Sem verificação no mapa, vale a fórmula (como antes).
  const byCover = Math.max(d.byCoverage, map.n ?? 0);
  const required = Math.max(d.byCapacity, byCover);
  return {
    ...d,
    byMap: map.n, // null = não verificado
    mapReason: map.reason, // "limite" (> MAP_LIMIT BTS) ou "meta" (não se atinge até ao limite)
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

const pct = (v: number) => new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(v);

// Texto curto do critério do mapa: "9 BTS" ou porque não foi verificado.
export function mapLabel(d: FullDimension) {
  if (d.byMap !== null) return `${d.byMap} BTS`;
  return d.mapReason === "limite" ? `não verificado (mais de ${MAP_LIMIT} BTS)` : `meta não atingida até ${MAP_LIMIT} BTS`;
}

// Explicação quando o mapa não é verificado (vale a fórmula da área).
export function mapNote(d: FullDimension, target: number) {
  if (d.byMap !== null) return "";
  return d.mapReason === "limite"
    ? `A verificação no mapa só é feita até ${MAP_LIMIT} BTS (cálculo pesado); aqui vale a fórmula da área.`
    : `A meta de ${pct(target)} % não se atinge no mapa com até ${MAP_LIMIT} BTS colocadas automaticamente: vale a fórmula da área; reveja a meta ou os parâmetros.`;
}
