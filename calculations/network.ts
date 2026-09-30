import { Params } from "@/types";
import {
  hata,
  hataIntercept,
  hataRadius,
  hataSlope,
  environmentCorrection,
  normalInverse,
  powerPerRe,
  resourceBlocks,
  fspl,
} from "./propagation";

export const erlang = (users: number, callsPerHour: number, seconds: number) =>
  (users * callsPerHour * seconds) / 3600;

// Probabilidade de bloqueio de Erlang B (forma recursiva estável).
export function erlangB(traffic: number, channels: number) {
  let b = 1;
  for (let n = 1; n <= channels; n++) b = (traffic * b) / (n + traffic * b);
  return b;
}

// Menor número de canais que garante o grau de serviço.
export function channelsFor(traffic: number, gos: number) {
  if (traffic <= 0) return 0;
  let n = 1;
  while (erlangB(traffic, n) > gos && n < 10000) n++;
  return n;
}

// Área servida por um site com R de raio: 2,6·R² (omni), 1,3·R² (2 sectores),
// 1,95·R² (3 sectores) – Holma & Toskala, cap. 9.
export function siteAreaFactor(sectors: number) {
  if (sectors === 2) return 1.3;
  if (sectors === 3) return 1.95;
  return 2.6;
}
// Distância entre sites de uma rede regular com o factor anterior.
export const siteSpacing = (radius: number, sectors: number) =>
  sectors === 3 ? 1.5 * radius : Math.sqrt(3) * radius;

export function traffic(p: Params, years = p.horizon) {
  const population = p.population * (1 + p.growth / 100) ** years;
  const subscribers = (population * p.penetration) / 100;
  const operatorUsers = (subscribers * p.marketShare) / 100;
  const lteUsers = (operatorUsers * p.lteShare) / 100;
  const monthlyGB = p.monthlyGB * (1 + p.usageGrowth / 100) ** years;
  // GB/mês → Mbit por dia → Mbit na hora de pico → Mbit/s.
  const perUserMbps =
    ((monthlyGB * 8000) / 30) * (p.busyHourShare / 100) / 3600;
  const dataMbps = lteUsers * perUserMbps;
  const voiceErlangs = lteUsers * p.voiceErlang;
  const voiceChannels = channelsFor(voiceErlangs, p.gos / 100);
  const voiceMbps = (voiceChannels * p.volteRate) / 1000;
  return {
    year: p.baseYear + years,
    population,
    subscribers,
    operatorUsers,
    lteUsers,
    monthlyGB,
    perUserMbps,
    dataMbps,
    voiceErlangs,
    voiceChannels,
    voiceMbps,
    demand: dataMbps + voiceMbps,
  };
}

export function capacity(p: Params) {
  const perSector = (p.bandwidth * p.efficiency) / p.reuse;
  const perSite = perSector * p.sectors;
  const usable = (perSite * p.maxLoad) / 100;
  return { perSector, perSite, usable };
}

export function linkBudget(p: Params) {
  const nRb = resourceBlocks(p.bandwidth);
  const rePower = powerPerRe(p.power, nRb);
  const reEirp = rePower + p.gain - p.cable;
  const shadowMargin = p.shadowStd * normalInverse(p.edgeProbability / 100);
  const margins =
    shadowMargin + p.indoorLoss + p.interferenceMargin + p.bodyLoss;
  const dl = reEirp + p.ueGain - p.rsrpMin - margins;
  const noise = -174 + 10 * Math.log10(p.ulRb * 180e3) + p.noiseFigure;
  const sensitivity = noise + p.ulSinr;
  const ulEirp = p.uePower + p.ueGain - p.bodyLoss;
  const ul =
    ulEirp +
    p.gain -
    p.cable -
    sensitivity -
    (shadowMargin + p.indoorLoss + p.interferenceMargin);
  const mapl = Math.min(dl, ul);
  const radius = hataRadius(
    mapl,
    p.frequency,
    p.height,
    p.mobileHeight,
    p.environment,
  );
  return {
    nRb,
    rePower,
    reEirp,
    shadowMargin,
    margins,
    dl,
    noise,
    sensitivity,
    ulEirp,
    ul,
    mapl,
    limiting: dl <= ul ? ("DL" as const) : ("UL" as const),
    intercept:
      hataIntercept(p.frequency, p.height, p.mobileHeight) +
      environmentCorrection(p.frequency, p.environment),
    slope: hataSlope(p.height),
    radius,
    // RSRP de projecto: o valor mediano no exterior que garante o limiar
    // depois de descontadas as margens.
    designRsrp: p.rsrpMin + margins,
    fsplAtRadius: fspl(radius, p.frequency),
    hataAtRadius: hata(p.frequency, p.height, p.mobileHeight, radius, p.environment),
  };
}

export function dimension(p: Params, zoneArea: number) {
  const t = traffic(p);
  const now = traffic(p, 0);
  const c = capacity(p);
  const l = linkBudget(p);
  const siteArea = siteAreaFactor(p.sectors) * l.radius ** 2;
  const byCoverage = Math.ceil(zoneArea / siteArea);
  const byCapacity = Math.max(1, Math.ceil(t.demand / c.usable));
  const nowByCapacity = Math.max(1, Math.ceil(now.demand / c.usable));
  const required = Math.max(byCoverage, byCapacity);
  return {
    traffic: t,
    now,
    capacity: c,
    link: l,
    zoneArea,
    siteArea,
    spacing: siteSpacing(l.radius, p.sectors),
    byCoverage,
    byCapacity,
    nowByCapacity,
    required,
    limiting:
      byCapacity > byCoverage
        ? ("capacidade" as const)
        : byCoverage > byCapacity
          ? ("cobertura" as const)
          : ("ambos" as const),
    load: (t.demand / (required * c.perSite)) * 100,
  };
}

export type Dimension = ReturnType<typeof dimension>;

// Projecção ano a ano para o gráfico do passo 6.1.1.
export function projection(p: Params) {
  const c = capacity(p);
  return Array.from({ length: p.horizon + 1 }, (_, i) => {
    const t = traffic(p, i);
    return {
      year: t.year,
      demand: Math.round(t.demand),
      users: Math.round(t.lteUsers),
      sites: Math.max(1, Math.ceil(t.demand / c.usable)),
    };
  });
}
