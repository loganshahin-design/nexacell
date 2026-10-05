"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { Download } from "lucide-react";
import type { LatLng } from "@/data/zone";
import { useProject } from "@/hooks/useProject";
import { BTS } from "@/types";
import { classes, ClassKey } from "@/calculations/coverage";
import { centroid, offset } from "@/calculations/geo";
import { downloadCanvas } from "@/utils/exportImage";

type Cell = { p: LatLng; dLat: number; dLng: number; rsrp: number; cls: ClassKey };
const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const colorOf = Object.fromEntries(classes.map((c) => [c.key, c.color])) as Record<ClassKey, string>;
const ring = (pts: LatLng[]) => [...pts.map(([la, ln]) => [ln, la]), [pts[0][1], pts[0][0]]];

function cellsGeoJSON(cells: Cell[]) {
  return {
    type: "FeatureCollection" as const,
    features: cells.map((c) => {
      const la = c.dLat / 2,
        ln = c.dLng / 2;
      return {
        type: "Feature" as const,
        properties: {
          color: colorOf[c.cls],
          // Altura exagerada: 5 m por dB acima de −105 dBm (até 250 m).
          height: (Math.min(Math.max(c.rsrp, -105), -55) + 105) * 5 + 4,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring([[c.p[0] - la, c.p[1] - ln], [c.p[0] - la, c.p[1] + ln], [c.p[0] + la, c.p[1] + ln], [c.p[0] + la, c.p[1] - ln]])],
        },
      };
    }),
  };
}

function stationsGeoJSON(stations: BTS[]) {
  return {
    type: "FeatureCollection" as const,
    features: stations.map((b) => {
      const s: LatLng = [b.lat, b.lng];
      const d = 0.018; // 18 m de lado
      return {
        type: "Feature" as const,
        properties: { id: b.id, enabled: b.enabled },
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring([offset(s, -d, -d), offset(s, -d, d), offset(s, d, d), offset(s, d, -d)])],
        },
      };
    }),
  };
}

function labelsGeoJSON(stations: BTS[]) {
  return {
    type: "FeatureCollection" as const,
    features: stations.map((b) => ({
      type: "Feature" as const,
      properties: { id: b.id },
      geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] },
    })),
  };
}

// A zona é lida na criação do mapa; quem usa o componente dá-lhe key={zone.id}.
export default function RealMap3D({ cells, stations }: { cells: Cell[]; stations: BTS[] }) {
  const { zone } = useProject();
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [signal, setSignal] = useState(true);
  const [buildings, setBuildings] = useState(true);
  const cellData = useMemo(() => cellsGeoJSON(cells), [cells]);
  const btsData = useMemo(() => stationsGeoJSON(stations), [stations]);
  const labelData = useMemo(() => labelsGeoJSON(stations), [stations]);
  const initial = useRef({ cellData, btsData, labelData });
  initial.current = { cellData, btsData, labelData };

  useEffect(() => {
    let alive = true;
    let m: MLMap | null = null;
    import("maplibre-gl").then((maplibregl) => {
      if (!alive || !element.current) return;
      // Worker servido de public/ (copiado no postinstall).
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const c = centroid(zone.polygon);
      const inst = new maplibregl.Map({
        container: element.current,
        style: STYLE,
        center: [c[1], c[0]],
        zoom: 13.6,
        pitch: 58,
        bearing: -24,
        canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
      });
      m = inst;
      map.current = inst;
      inst.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      const timeout = setTimeout(() => alive && !inst.loaded() && setFailed(true), 15000);
      inst.on("load", () => {
        clearTimeout(timeout);
        const m = inst;
        const { cellData, btsData, labelData } = initial.current;
        if (m.getLayer("building-3d")) m.setLayerZoomRange("building-3d", 13, 24);
        m.addSource("zone", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring(zone.polygon)] } } });
        m.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: zone.route.map(([la, ln]) => [ln, la]) } } });
        m.addSource("rsrp", { type: "geojson", data: cellData });
        m.addSource("bts", { type: "geojson", data: btsData });
        m.addSource("bts-labels", { type: "geojson", data: labelData });
        m.addLayer({ id: "zone-line", type: "line", source: "zone", paint: { "line-color": "#0b5fc4", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
        m.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#0f1d26", "line-width": 4, "line-opacity": 0.7 } });
        m.addLayer({ id: "rsrp-3d", type: "fill-extrusion", source: "rsrp", paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "height"], "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.62 } });
        m.addLayer({ id: "bts-3d", type: "fill-extrusion", source: "bts", paint: { "fill-extrusion-color": ["case", ["get", "enabled"], "#b4441c", "#8a8f98"], "fill-extrusion-height": 320, "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.95 } });
        m.addLayer({
          id: "bts-label",
          type: "symbol",
          source: "bts-labels",
          layout: { "text-field": ["get", "id"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, -1.4], "text-allow-overlap": true },
          paint: { "text-color": "#ffffff", "text-halo-color": "#0f1d26", "text-halo-width": 2 },
        });
        setReady(true);
      });
    }).catch(() => setFailed(true));
    return () => {
      alive = false;
      m?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    (m.getSource("rsrp") as GeoJSONSource | undefined)?.setData(cellData);
    (m.getSource("bts") as GeoJSONSource | undefined)?.setData(btsData);
    (m.getSource("bts-labels") as GeoJSONSource | undefined)?.setData(labelData);
  }, [ready, cellData, btsData, labelData]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setLayoutProperty("rsrp-3d", "visibility", signal ? "visible" : "none");
    if (m.getLayer("building-3d")) m.setLayoutProperty("building-3d", "visibility", buildings ? "visible" : "none");
  }, [ready, signal, buildings]);

  return (
    <div className="realmap" role="region" aria-label="Mapa real em 3D com edifícios do OpenStreetMap e o sinal previsto">
      <div ref={element} style={{ position: "absolute", inset: 0 }} />
      <div className="stage-hud">
        <div className="chips" role="group" aria-label="Camadas do mapa 3D">
          <button className="chip" aria-pressed={signal} onClick={() => setSignal((v) => !v)}>
            Sinal previsto
          </button>
          <button className="chip" aria-pressed={buildings} onClick={() => setBuildings((v) => !v)}>
            Edifícios (OSM)
          </button>
          <button className="chip" onClick={() => downloadCanvas(map.current?.getCanvas() ?? null, "nexacell-mapa-3d.png")} disabled={!ready}>
            <Download size={13} aria-hidden /> Guardar imagem
          </button>
        </div>
      </div>
      {failed && (
        <div className="stage-fallback">
          Não foi possível carregar o mapa (precisa de Internet e de WebGL). Use a
          vista 2D ou o relevo 3D.
        </div>
      )}
    </div>
  );
}
