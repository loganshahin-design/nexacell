import { Params } from "@/types";
import { hataSlope } from "./propagation";

// Pares (i, j) que geram cada tamanho de cluster: N = i² + ij + j².
export const clusterShapes: Record<number, [number, number]> = {
  1: [1, 0],
  3: [1, 1],
  4: [2, 0],
  7: [2, 1],
  9: [3, 0],
  12: [2, 2],
};

export const validClusters = Object.keys(clusterShapes).map(Number);

// Expoente de perda de percurso derivado do declive de Hata (dB/década ÷ 10).
export const pathLossExponent = (p: Params) => hataSlope(p.height) / 10;

export function reuseFor(p: Params, n: number) {
  const q = Math.sqrt(3 * n); // D/R
  const gamma = pathLossExponent(p);
  // Interferentes da 1.ª coroa: 6 com antenas omni, 2 com 3 sectores.
  const interferers = p.sectors >= 3 ? 2 : 6;
  const ci = 10 * Math.log10(q ** gamma / interferers);
  const perSector = (p.bandwidth / n) * p.efficiency;
  return { n, shape: clusterShapes[n], q, ci, perSector, interferers, gamma };
}

export function reuseTable(p: Params) {
  return [1, 3, 4, 7].map((n) => reuseFor(p, n));
}
