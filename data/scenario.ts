export const scenario = {
  id: "marracuene-lte-v1",
  shortName: "Marracuene LTE Planning",
  title:
    "Dimensionamento e Análise de uma Rede Móvel 4G LTE numa Área de Expansão Urbana de Marracuene, Província de Maputo",
  reportTitle:
    "Dimensionamento e Análise de uma Rede Móvel 4G LTE numa Área de Expansão Urbana de Marracuene",
  location: "Distrito de Marracuene, Província de Maputo, Moçambique",
  center: [-25.739978, 32.676333] as [number, number],
  mapSource: "https://www.openstreetmap.org/node/561322955",
  verifiedOn: "2026-09-26",
  projectKey: "nexacell-marracuene-v1",
  communityKey: "nexacell-marracuene-community-v1",
  tooltip: "Parâmetro de dimensionamento.",
  justification:
    "O estudo considera uma área de expansão urbana de Marracuene para dimensionar a cobertura e a capacidade LTE, definir a distribuição das estações base e avaliar o crescimento da procura.",
  provenance:
    "Os parâmetros populacionais, de tráfego e de rede utilizados nesta plataforma são valores de projecto e simulação, excepto quando explicitamente identificados como provenientes de fontes oficiais.",
  objective:
    "Dimensionar uma rede móvel 4G LTE capaz de fornecer cobertura e capacidade adequadas para uma área de expansão urbana de Marracuene, através da análise da área de serviço, tráfego, estações base, antenas, propagação e parâmetros de rádio.",
};
// Offsets describe proposed sites, never surveyed infrastructure.
export function plannedPosition(
  northKm: number,
  eastKm: number,
): [number, number] {
  return [
    scenario.center[0] + northKm / 111.32,
    scenario.center[1] +
      eastKm / (111.32 * Math.cos((scenario.center[0] * Math.PI) / 180)),
  ];
}
