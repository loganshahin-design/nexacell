import { Params } from "@/types";
import { wavelength } from "./propagation";

const deg = Math.PI / 180;

// Diagrama sectorial 3GPP TR 36.814 (Tabela A.2.1.1-2).
export const horizontalLoss = (angle: number, beam: number) =>
  Math.min(12 * (angle / beam) ** 2, 25);
export const verticalLoss = (elevation: number, tilt: number, beam: number) =>
  Math.min(12 * ((elevation - tilt) / beam) ** 2, 20);
export const patternLoss = (
  angle: number,
  elevation: number,
  p: Pick<Params, "hBeam" | "vBeam">,
  tilt: number,
) =>
  Math.min(
    horizontalLoss(angle, p.hBeam) + verticalLoss(elevation, tilt, p.vBeam),
    25,
  );

// Menor diferença angular, entre 0 e 180 graus.
export const angleDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// Ângulo de depressão do terminal visto pela antena, em graus.
export const elevation = (hb: number, hm: number, dKm: number) =>
  Math.atan((hb - hm) / (Math.max(dKm, 0.001) * 1000)) / deg;

// Ganho aproximado a partir das aberturas: G ≈ 41 253 / (θH·θV).
export const gainFromBeams = (h: number, v: number) =>
  10 * Math.log10(41253 / (h * v));

export function antennaParameters(p: Params, radiusKm: number) {
  const lambda = wavelength(p.frequency);
  const eirp = p.power + p.gain - p.cable;
  const optimalTilt = elevation(p.height, p.mobileHeight, radiusKm) + p.vBeam / 2;
  const reach = (angle: number) =>
    angle <= 0 ? Infinity : (p.height - p.mobileHeight) / Math.tan(angle * deg) / 1000;
  return {
    lambda,
    dipole: lambda / 2,
    eirp,
    eirpW: 10 ** ((eirp - 30) / 10),
    powerW: 10 ** ((p.power - 30) / 10),
    beamGain: gainFromBeams(p.hBeam, p.vBeam),
    optimalTilt,
    edgeAngle: elevation(p.height, p.mobileHeight, radiusKm),
    // Onde o feixe principal toca o solo (limites a −3 dB).
    innerReach: reach(p.tilt + p.vBeam / 2),
    mainReach: reach(p.tilt),
    outerReach: reach(p.tilt - p.vBeam / 2),
  };
}
