import { BTS, Params } from "@/types";
import { CommunityPlan } from "@/types/community";
import { bounds, distance } from "./network";
export function zoneBounds(
  area: number,
  plan: CommunityPlan,
  index: number,
): [[number, number], [number, number]] {
  const [sw, ne] = bounds(area),
    lat = sw[0] + ((ne[0] - sw[0]) * plan.splitY) / 100,
    lng = sw[1] + ((ne[1] - sw[1]) * plan.splitX) / 100;
  return index === 0
    ? [
        [lat, sw[1]],
        [ne[0], lng],
      ]
    : index === 1
      ? [[lat, lng], ne]
      : index === 2
        ? [sw, [lat, lng]]
        : [
            [sw[0], lng],
            [lat, ne[1]],
          ];
}
export function communityResults(
  p: Params,
  stations: BTS[],
  plan: CommunityPlan,
) {
  const enabled = stations.filter((b) => b.enabled),
    weightSum = plan.zones.reduce((sum, z) => sum + z.weight, 0),
    totalUsers = (p.population * p.penetration) / 100;
  const zones = plan.zones.map((zone, index) => {
    const bb = zoneBounds(p.area, plan, index);
    let covered = 0;
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) {
        const lat = bb[0][0] + ((y + 0.5) / 20) * (bb[1][0] - bb[0][0]),
          lng = bb[0][1] + ((x + 0.5) / 20) * (bb[1][1] - bb[0][1]);
        if (enabled.some((b) => distance(lat, lng, b.lat, b.lng) <= b.radius))
          covered++;
      }
    const coverage = (covered / 400) * 100,
      users = (totalUsers * zone.weight) / weightSum,
      served = (users * coverage) / 100;
    return {
      ...zone,
      bounds: bb,
      coverage,
      users,
      served,
      unserved: users - served,
      need: (users - served) * zone.priority,
      demand: ((users * p.active) / 100) * p.demand,
    };
  });
  const served = zones.reduce((s, z) => s + z.served, 0),
    capex =
      stations.length * plan.siteCost +
      stations.reduce((s, b) => s + b.sectors, 0) * plan.sectorCost,
    annual = stations.length * plan.annualCost,
    firstYear = capex + annual;
  return {
    zones,
    totalUsers,
    served,
    unserved: totalUsers - served,
    weightedCoverage: totalUsers ? (served / totalUsers) * 100 : 0,
    gap:
      Math.max(...zones.map((z) => z.coverage)) -
      Math.min(...zones.map((z) => z.coverage)),
    capex,
    annual,
    firstYear,
    remaining: plan.budget - firstYear,
    priority: [...zones].sort((a, b) => b.need - a.need)[0],
  };
}
export function suggestSite(p: Params, stations: BTS[], plan: CommunityPlan) {
  const current = communityResults(p, stations, plan);
  const price = plan.siteCost + 3 * plan.sectorCost + plan.annualCost;
  if (price > current.remaining)
    return {
      reason:
        "O orçamento disponível não permite mais uma BTS com três sectores.",
      station: null,
      gain: 0,
    };
  let best: BTS | null = null,
    bestScore = 0,
    bestGain = 0;
  for (const zone of current.zones)
    for (let x = 0; x < 3; x++)
      for (let y = 0; y < 3; y++) {
        const b: BTS = {
          id: "candidate",
          lat:
            zone.bounds[0][0] +
            ((y + 0.5) / 3) * (zone.bounds[1][0] - zone.bounds[0][0]),
          lng:
            zone.bounds[0][1] +
            ((x + 0.5) / 3) * (zone.bounds[1][1] - zone.bounds[0][1]),
          height: p.height,
          power: p.power,
          frequency: p.frequency,
          gain: p.gain,
          sectors: 3,
          azimuth: 0,
          tilt: p.tilt,
          radius: p.radius,
          enabled: true,
        };
        const next = communityResults(p, [...stations, b], plan),
          score = next.zones.reduce(
            (sum, z, index) =>
              sum + (z.served - current.zones[index].served) * z.priority,
            0,
          );
        if (score > bestScore) {
          best = b;
          bestScore = score;
          bestGain = next.served - current.served;
        }
      }
  return {
    reason: best
      ? "Melhor ganho ponderado entre 36 posições candidatas."
      : "Não foi encontrado ganho geométrico nas posições candidatas.",
    station: best,
    gain: bestGain,
  };
}
