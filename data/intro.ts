import { centroid } from "@/calculations/geo";
import { zone, type LatLng } from "./zone";
import type { Zone } from "./zones";

// Centro da zona de estudo: o ponto onde termina o voo do espaço.
export const targetOf = (z: Zone): LatLng => centroid(z.polygon);
export const target: LatLng = targetOf(zone);

// Etapas mostradas durante a descida, da mais alta para a mais baixa.
// `above`: altitude aproximada (km) a partir da qual a etapa é mostrada.
export const waypoints = [
  { above: 9000, name: "Terra", note: "Planeta inteiro, visto do espaço" },
  { above: 2800, name: "África Austral", note: "Sudeste do continente, no Índico" },
  { above: 700, name: "Moçambique", note: "O país do projecto" },
  { above: 110, name: "Província de Maputo", note: "Sul de Moçambique" },
  { above: 18, name: "Distrito de Marracuene", note: "734 km² · 305 216 hab. (INE 2025)" },
  { above: 0, name: "Michafutene", note: "Corredor da N1 · a nossa zona" },
] as const;

export function waypointIndex(altitudeKm: number, list: readonly { above: number }[] = waypoints) {
  const i = list.findIndex((w) => altitudeKm >= w.above);
  return i === -1 ? list.length - 1 : i;
}

// Coordenadas no formato usado no projecto: "25,79° S · 32,59° E".
export function formatLatLng([lat, lng]: LatLng) {
  const f = (v: number) => Math.abs(v).toFixed(2).replace(".", ",");
  return `${f(lat)}° ${lat < 0 ? "S" : "N"} · ${f(lng)}° ${lng < 0 ? "O" : "E"}`;
}

export function formatAltitude(km: number) {
  if (km >= 100) return `${Math.round(km).toLocaleString("pt-PT")} km`;
  if (km >= 10) return `${km.toFixed(0)} km`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

// Imagens de satélite usadas no globo (precisam de Internet).
export const satellite = {
  eox: {
    tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
    maxzoom: 14,
    attribution:
      '<a href="https://s2maps.eu" target="_blank" rel="noreferrer">Sentinel-2 cloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2020)',
  },
  // Dois servidores: o navegador abre no máximo 6 ligações por servidor.
  esri: {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    maxzoom: 18,
    attribution: "Imagens © Esri, Maxar, Earthstar Geographics",
  },
};
