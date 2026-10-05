import { test } from "node:test";
import assert from "node:assert/strict";
import {
  channelsFor,
  dimension,
  erlang,
  erlangB,
  linkBudget,
  projection,
  traffic,
} from "./network";
import {
  fspl,
  hata,
  hataRadius,
  normalInverse,
  powerPerRe,
  resourceBlocks,
  wavelength,
} from "./propagation";
import { reuseFor } from "./reuse";
import { antennaParameters, gainFromBeams, patternLoss } from "./antenna";
import { polygonArea, pointInPolygon, routeLength } from "./geo";
import { autoPlace } from "./placement";
import { coverageMap, classify, driveTest } from "./coverage";
import { dimensionWithMap } from "./dimension";
import { zones, calibrate } from "../data/zones";
import { defaults } from "../data/defaults";
import { zone } from "../data/zone";

const close = (a: number, b: number, tol: number) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test("fórmulas de referência", () => {
  close(fspl(1, 1800), 97.545, 0.001);
  close(wavelength(1800), 0.166551, 1e-6);
  assert.equal(erlang(100, 1, 90), 2.5);
  // COST-231 Hata urbano, 1800 MHz, hb 30 m, hm 1,5 m, 1 km ≈ 136,2 dB.
  close(hata(1800, 30, 1.5, 1, "urbano"), 136.2, 0.05);
  // Correcção suburbana a 1800 MHz ≈ −11,9 dB.
  close(
    hata(1800, 30, 1.5, 1, "suburbano") - hata(1800, 30, 1.5, 1, "urbano"),
    -11.94,
    0.02,
  );
  // Okumura-Hata abaixo de 1500 MHz (900 MHz, 1 km) ≈ 126,4 dB.
  close(hata(900, 30, 1.5, 1, "urbano"), 126.4, 0.1);
});

test("a inversa de Hata devolve a distância", () => {
  for (const d of [0.5, 1, 2.5, 7])
    close(
      hataRadius(hata(1800, 30, 1.5, d, "suburbano"), 1800, 30, 1.5, "suburbano"),
      d,
      1e-9,
    );
});

test("recursos LTE e margens estatísticas", () => {
  assert.equal(resourceBlocks(20), 100);
  assert.equal(resourceBlocks(5), 25);
  close(powerPerRe(43, 100), 12.21, 0.01);
  close(normalInverse(0.85), 1.0364, 0.001);
  close(normalInverse(0.5), 0, 1e-9);
});

test("Erlang B coincide com a tabela", () => {
  close(erlangB(10, 10), 0.2146, 0.0001);
  assert.equal(channelsFor(10, 0.02), 17);
  assert.equal(channelsFor(0, 0.02), 0);
});

test("tráfego cresce com o horizonte e conserva a cadeia de utilizadores", () => {
  const t0 = traffic(defaults, 0),
    t5 = traffic(defaults, 5);
  close(t0.population, defaults.population, 1e-9);
  close(
    t0.lteUsers,
    (((defaults.population * defaults.penetration) / 100) *
      defaults.marketShare *
      defaults.lteShare) /
      10000,
    1e-6,
  );
  assert.ok(t5.demand > t0.demand);
  const years = projection(defaults);
  assert.equal(years.length, defaults.horizon + 1);
  assert.ok(years.every((y, i) => i === 0 || y.demand >= years[i - 1].demand));
});

test("orçamento de enlace responde às entradas", () => {
  const a = linkBudget(defaults);
  const b = linkBudget({ ...defaults, power: defaults.power + 3 });
  close(b.dl - a.dl, 3, 1e-9);
  const indoor = linkBudget({ ...defaults, indoorLoss: 10 });
  assert.ok(indoor.radius < a.radius);
  close(indoor.mapl, a.mapl - 10, 1e-9);
  assert.equal(a.mapl, Math.min(a.dl, a.ul));
});

test("nº de BTS = máximo entre capacidade e cobertura", () => {
  const area = polygonArea(zone.polygon);
  const d = dimension(defaults, area);
  assert.equal(d.required, Math.max(d.byCapacity, d.byCoverage));
  const heavy = dimension({ ...defaults, monthlyGB: 60 }, area);
  assert.ok(heavy.byCapacity > d.byCapacity);
  const n3 = dimension({ ...defaults, reuse: 3 }, area);
  close(n3.capacity.perSector, d.capacity.perSector / 3, 1e-9);
});

test("padrão de reuso: D/R = √(3N)", () => {
  for (const n of [1, 3, 4, 7]) close(reuseFor(defaults, n).q, Math.sqrt(3 * n), 1e-12);
  assert.ok(reuseFor(defaults, 7).ci > reuseFor(defaults, 1).ci);
});

test("antena: diagrama e parâmetros", () => {
  assert.equal(patternLoss(0, defaults.tilt, defaults, defaults.tilt), 0);
  close(patternLoss(defaults.hBeam / 2, defaults.tilt, defaults, defaults.tilt), 3, 1e-9);
  assert.equal(patternLoss(180, 0, defaults, 10), 25);
  close(gainFromBeams(65, 7), 19.57, 0.01);
  const a = antennaParameters(defaults, 1);
  close(a.eirp, defaults.power + defaults.gain - defaults.cable, 1e-9);
  assert.ok(a.optimalTilt > defaults.vBeam / 2);
});

test("zona real e colocação automática", () => {
  const area = polygonArea(zone.polygon);
  close(area, 13.05, 0.05);
  assert.ok(pointInPolygon(zone.landmark, zone.polygon));
  close(routeLength(zone.route), 5.5, 0.2);
  const sites = autoPlace(zone.polygon, 8);
  assert.equal(sites.length, 8);
  assert.ok(sites.every((s) => pointInPolygon([s.lat, s.lng], zone.polygon)));
  assert.deepEqual(sites, autoPlace(zone.polygon, 8));
});

test("cobertura e drive test", () => {
  assert.equal(classify(-80).key, "good");
  assert.equal(classify(-90).key, "fair");
  assert.equal(classify(-100).key, "poor");
  assert.equal(classify(-106).key, "none");
  const empty = coverageMap(defaults, [], zone.polygon, 20);
  assert.equal(empty.share.none, 100);
  const d = dimension(defaults, polygonArea(zone.polygon));
  const sites = autoPlace(zone.polygon, d.required);
  const map = coverageMap(defaults, sites, zone.polygon, 30);
  assert.ok(map.meetsThreshold >= map.designCoverage);
  assert.ok(map.meetsThreshold > 90);
  const off = coverageMap(
    defaults,
    sites.map((s) => ({ ...s, enabled: false })),
    zone.polygon,
    20,
  );
  assert.equal(off.meetsThreshold, 0);
  const dt = driveTest(defaults, sites, zone.route);
  assert.ok(dt.samples.length > 100);
  close(Object.values(dt.share).reduce((a, b) => a + b, 0), 100, 1e-9);
});

test("verificação no mapa: a meta de cobertura entra no nº de BTS", () => {
  const area = polygonArea(zone.polygon);
  const base = dimensionWithMap(defaults, zone.polygon, area);
  // Michafutene: a fórmula pede 7, o mapa 9 para 95 %, mas a capacidade (10) decide.
  assert.equal(base.byCoverage, 7);
  assert.equal(base.byMap, 9);
  assert.equal(base.required, 10);
  assert.equal(base.limiting, "capacidade");
  // Meta de 100 %: são precisas 14 BTS e passa a decidir a cobertura.
  const full = dimensionWithMap({ ...defaults, coverageTarget: 100 }, zone.polygon, area);
  assert.equal(full.required, 14);
  assert.equal(full.limiting, "cobertura");
  // Bobole (rural): a fórmula pede 2, a capacidade 3, o mapa 4.
  const b = zones.bobole;
  const rural = dimensionWithMap({ ...defaults, population: calibrate(b.worldpop2020), environment: b.environment }, b.polygon, polygonArea(b.polygon));
  assert.equal(rural.byCapacity, 3);
  assert.equal(rural.byMap, 4);
  assert.equal(rural.required, 4);
  assert.equal(rural.limiting, "cobertura");
});
