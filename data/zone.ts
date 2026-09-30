// Geometria real obtida do OpenStreetMap (Overpass API, 30/09/2026).
// Zona = rectângulo 25,772–25,812 °S × 32,568–32,605 °E recortado pela
// fronteira do distrito de Marracuene (relação OSM 11319964), para que
// nenhuma parte da zona fique na cidade de Maputo.
export type LatLng = [number, number];

export const zone = {
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
  ] as LatLng[],
  // Localidade de Michafutene (nó OSM 561322954).
  landmark: [-25.78434, 32.5852] as LatLng,
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
  ] as LatLng[],
  routeName: "Estrada Nacional N1",
};
