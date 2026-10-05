import type { Environment } from "@/types";
import { fmt } from "@/utils/format";

export type LatLng = [number, number];
export type ZoneId = "michafutene" | "bobole";

// Contexto para os textos que dependem dos números da zona.
export type ZoneContext = { density: number; districtDensity: number; year: number };

export type Zone = {
  id: ZoneId;
  short: string; // nome curto: "Michafutene"
  name: string;
  district: string;
  kind: string; // tipo de zona, em linguagem simples
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
    kind: "Suburbano denso",
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

  // Zona de comparação: rectângulo 25,600–25,660 °S × 32,638–32,708 °E, a sul
  // de Bobole, inteiramente dentro da fronteira do distrito (relação OSM
  // 11319964; a norte de ≈ 25,595 °S a N1 já sai do distrito). N1 das vias
  // ref=N1 do OpenStreetMap (Overpass, 05/10/2026). População: WorldPop 2020
  // (API stats, 05/10/2026) = 11 091 hab. dentro do rectângulo.
  bobole: {
    id: "bobole",
    short: "Bobole",
    name: "Bobole – N1 rural (norte de Marracuene)",
    district: "Distrito de Marracuene, Província de Maputo, Moçambique",
    kind: "Rural, pouco denso",
    polygon: [
      [-25.6, 32.708],
      [-25.6, 32.638],
      [-25.66, 32.638],
      [-25.66, 32.708],
    ],
    // Paragem "Bobole" na N1 (OSM, nó 6812544035).
    landmark: [-25.60607, 32.67071],
    route: [
      [-25.6598, 32.67133], [-25.65837, 32.67167], [-25.65485, 32.67248], [-25.65337, 32.67284], [-25.65083, 32.67343],
      [-25.64886, 32.6739], [-25.64574, 32.67464], [-25.64369, 32.67512], [-25.64171, 32.67559], [-25.63846, 32.67631],
      [-25.6366, 32.67673], [-25.6327, 32.67764], [-25.63078, 32.6777], [-25.62881, 32.67723], [-25.62645, 32.67679],
      [-25.62505, 32.67651], [-25.62358, 32.67621], [-25.62187, 32.67586], [-25.62011, 32.67533], [-25.6186, 32.67425],
      [-25.61686, 32.673], [-25.61543, 32.67225], [-25.61385, 32.67199], [-25.61202, 32.67169], [-25.6103, 32.67143],
      [-25.60765, 32.67103], [-25.6063, 32.67084], [-25.60452, 32.67056], [-25.60311, 32.67033], [-25.60119, 32.67005],
    ],
    routeName: "Estrada Nacional N1",
    environment: "rural",
    worldpop2020: 11091,
    sources: { landmark: "osmBobole", route: "osmN1Bobole", worldpop: "worldpopBobole" },
    reasons: [
      { title: "Zona de comparação.", text: () => "Serve para ver como o mesmo método decide numa zona muito diferente de Michafutene, no mesmo distrito e na mesma estrada (N1)." },
      {
        title: "É rural e pouco densa.",
        text: (c) => `Tem cerca de ${fmt0(c.density)} hab./km², menos do que a média do distrito (${fmt0(c.districtDensity)} hab./km²) e cerca de 12 vezes menos do que Michafutene.`,
      },
      { title: "O sinal vai mais longe, mas há menos gente.", text: () => "Com poucos obstáculos (ambiente rural no modelo de Hata) cada BTS cobre uma área muito maior; a pergunta passa a ser se a cobertura ou a capacidade decide." },
    ],
    context: {
      title: "Zona de comparação, não substitui o projecto",
      text: "Bobole fica no norte de Marracuene, ao longo da N1, perto da fronteira com Manhiça. O drive test do INCM de 2023 cobre as estradas principais do distrito, por isso a comparação continua a valer para a N1. Não temos medições próprias desta zona: os resultados são estimativas do modelo, tal como em Michafutene.",
    },
  },
};

export const zoneList = Object.values(zones);
export const DEFAULT_ZONE: ZoneId = "michafutene";
// O projecto é Michafutene: a escolha de zona (Bobole) fica escondida.
// Pôr a true para voltar a mostrar a escolha e o cenário "Michafutene e Bobole".
export const ZONE_CHOICE = false;
