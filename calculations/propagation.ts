import { Environment } from "@/types";

const log = Math.log10;

export const fspl = (dKm: number, fMHz: number) =>
  32.44 + 20 * log(dKm) + 20 * log(fMHz);

export const wavelength = (fMHz: number) => 299792458 / (fMHz * 1e6);

// Correcção da altura do terminal para cidade pequena/média (Hata).
export const mobileCorrection = (fMHz: number, hm: number) =>
  (1.1 * log(fMHz) - 0.7) * hm - (1.56 * log(fMHz) - 0.8);

// Correcção do ambiente em relação ao valor urbano.
export function environmentCorrection(fMHz: number, env: Environment) {
  if (env === "suburbano") return -(2 * log(fMHz / 28) ** 2 + 5.4);
  if (env === "rural")
    return -(4.78 * log(fMHz) ** 2 - 18.33 * log(fMHz) + 40.94);
  return 0;
}

// Perda urbana a 1 km: Okumura-Hata até 1500 MHz, COST-231 Hata acima.
export function hataIntercept(fMHz: number, hb: number, hm: number) {
  const base =
    fMHz <= 1500
      ? 69.55 + 26.16 * log(fMHz)
      : 46.3 + 33.9 * log(fMHz);
  return base - 13.82 * log(hb) - mobileCorrection(fMHz, hm);
}

// Declive em dB por década de distância.
export const hataSlope = (hb: number) => 44.9 - 6.55 * log(hb);

export function hata(
  fMHz: number,
  hb: number,
  hm: number,
  dKm: number,
  env: Environment,
) {
  const d = Math.max(dKm, 0.02);
  return (
    hataIntercept(fMHz, hb, hm) +
    hataSlope(hb) * log(d) +
    environmentCorrection(fMHz, env)
  );
}

// Inversa: distância a que a perda atinge `loss` dB.
export function hataRadius(
  loss: number,
  fMHz: number,
  hb: number,
  hm: number,
  env: Environment,
) {
  const l1 = hataIntercept(fMHz, hb, hm) + environmentCorrection(fMHz, env);
  return 10 ** ((loss - l1) / hataSlope(hb));
}

// Blocos de recursos por largura de banda (3GPP TS 36.101).
export function resourceBlocks(bandwidthMHz: number) {
  const table: [number, number][] = [
    [1.4, 6],
    [3, 15],
    [5, 25],
    [10, 50],
    [15, 75],
    [20, 100],
  ];
  const exact = table.find(([b]) => Math.abs(b - bandwidthMHz) < 1e-6);
  return exact ? exact[1] : Math.max(6, Math.round(bandwidthMHz * 5));
}

// Potência por elemento de recurso (uma subportadora de 15 kHz).
export const powerPerRe = (powerDbm: number, nRb: number) =>
  powerDbm - 10 * log(12 * nRb);

// Inversa da distribuição normal padrão (aproximação de Acklam).
export function normalInverse(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }
  if (q > 1 - 0.02425) return -normalInverse(1 - q);
  const r = q - 0.5,
    s = r * r;
  return ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
}
