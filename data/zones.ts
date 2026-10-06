import type { Environment } from "@/types";
import { fmt } from "@/utils/format";

export type LatLng = [number, number];
export type ZoneId = "michafutene";

// Contexto para os textos que dependem dos números da zona.
export type ZoneContext = { density: number; districtDensity: number; year: number };

export type Zone = {
  id: ZoneId;
  short: string; // nome curto: "Michafutene"
  name: string;
  district: string;
  polygon: LatLng[];
  landmark: LatLng;
  route: LatLng[]; // troço da N1, de sul para norte
  routeName: string;
  environment: Environment; // correcção de ambiente do modelo de Hata
  worldpop2020: number; // soma bruta do WorldPop dentro do polígono
  sources: { landmark: string; route: string; worldpop: string }; // chaves em data/sources.ts
  reasons: { title: string; text: (c: ZoneContext) => string }[];
  context: { title: string; text: string };
};

// População 2025: WorldPop calibrado ao INE (254 139 / 286 324) e projectado
// com o crescimento do INE 2020→2025 (305 216 / 254 139).
export const calibrate = (raw: number) => Math.round(raw * (254139 / 286324) * (305216 / 254139));
export const POP_FACTOR_2020 = 254139 / 286324;
export const POP_GROWTH_2025 = 305216 / 254139;

const fmt0 = (v: number) => fmt(v);

export const zones: Record<ZoneId, Zone> = {
  // Geometria real obtida do OpenStreetMap (Overpass API, 30/09/2026).
  // Zona = rectângulo 25,772–25,812 °S × 32,568–32,605 °E recortado pela
  // fronteira do distrito de Marracuene (relação OSM 11319964), para que
  // nenhuma parte da zona fique na cidade de Maputo.
  michafutene: {
    id: "michafutene",
    short: "Michafutene",
    name: "Michafutene – corredor da N1",
    district: "Distrito de Marracuene, Província de Maputo, Moçambique",
    polygon: [
      [-25.772, 32.605],
      [-25.772, 32.58464],
      [-25.77375, 32.58432],
      [-25.77738, 32.58365],
      [-25.77865, 32.58341],
      [-25.78459, 32.5786],
      [-25.78865, 32.5753],
      [-25.79298, 32.57349],
      [-25.81067, 32.56859],
      [-25.81113, 32.568],
      [-25.81177, 32.568],
      [-25.812, 32.57048],
      [-25.812, 32.605],
    ],
    // Localidade de Michafutene (nó OSM 561322954).
    landmark: [-25.78434, 32.5852],
    // Troço da N1 dentro da zona, de sul (limite com Maputo) para nordeste.
    route: [
      [-25.81153, 32.57299],
      [-25.80431, 32.57411],
      [-25.80237, 32.57477],
      [-25.79892, 32.57743],
      [-25.79664, 32.57894],
      [-25.79134, 32.58294],
      [-25.78567, 32.58505],
      [-25.785, 32.58573],
      [-25.78439, 32.58753],
      [-25.78435, 32.59485],
      [-25.78363, 32.59866],
      [-25.78286, 32.59976],
      [-25.77727, 32.60483],
    ],
    routeName: "Estrada Nacional N1",
    environment: "suburbano",
    worldpop2020: 38632,
    sources: { landmark: "osmMichafutene", route: "osmN1", worldpop: "worldpopZone" },
    reasons: [
      { title: "Cresce muito depressa.", text: () => "O distrito passou de 254 139 habitantes em 2020 para 305 216 em 2025 (+3,7 % ao ano, INE)." },
      {
        title: "É a parte mais densa do distrito.",
        text: (c) => `Encostada à cidade de Maputo e atravessada pela N1, tem cerca de ${fmt0(c.density)} hab./km², cerca de ${fmt0(c.density / c.districtDensity)} vezes a média do distrito (${fmt0(c.districtDensity)} hab./km² em 2025).`,
      },
      { title: "O 4G já existe, mas a procura vai duplicar.", text: (c) => `O desafio não é levar rede a quem não tem: é garantir capacidade e cobertura para a população e o consumo de dados de ${c.year}.` },
    ],
    context: {
      title: "Uma rede preparada para crescer",
      text: "Marracuene já dispõe de cobertura móvel. O 4G chegou ao distrito em 2019 (1.ª fase da Tmcel), e as medições do INCM em Junho de 2023 mostram RSRP ≥ −105 dBm em 98,9 % (Tmcel) a 100 % (Vodacom e Movitel) das estradas principais. Este projecto é de reforço: acompanhar o crescimento da procura e cobrir também os bairros fora das estradas.",
    },
  },
};

export const DEFAULT_ZONE: ZoneId = "michafutene";
