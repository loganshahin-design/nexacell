import type { LatLng } from "@/data/zone";
import type { BTS } from "@/types";
import type { Zone } from "@/data/zones";

// orbit: a Terra roda (ecrã de entrada) · zoom: descida até Michafutene ·
// arrive: chegada, mostra a zona · out: a sair para a aplicação.
export type Phase = "orbit" | "zoom" | "arrive" | "out";

export type Telemetry = { altitudeKm: number; center: LatLng };

// Interface comum ao globo online (MapLibre) e ao globo offline (three.js).
export type EngineProps = {
  phase: Phase;
  reduce: boolean;
  // login: a Terra fica ao lado do cartão de entrada; center: ao centro.
  layout: "login" | "center";
  stations: BTS[];
  zone: Zone; // zona de destino (fixa durante a vida do globo)
  onTelemetry: (t: Telemetry) => void;
  onReady: () => void;
  onArrive: () => void;
  onFail: () => void;
};

// Duração da viagem (ms) e da primeira fase, em que a Terra roda até
// Moçambique antes de começar a descer.
export const ZOOM_MS = 9500;
export const TURN_MS = 2300;
