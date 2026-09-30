"use client";
import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { zone, LatLng } from "@/data/zone";
import { BTS } from "@/types";
import { offset } from "@/calculations/geo";

export type MapCell = {
  p: LatLng;
  dLat: number;
  dLng: number;
  color: string;
  title: string;
};
export type MapSample = { p: LatLng; color: string; title: string };

type Props = {
  stations?: BTS[];
  sectors?: number;
  sectorLength?: number; // km
  circleKm?: number;
  editable?: boolean;
  selected?: string | null;
  cells?: MapCell[];
  cellOpacity?: number;
  samples?: MapSample[];
  showRoute?: boolean;
  showLandmark?: boolean;
  onSelect?: (id: string) => void;
  onMove?: (id: string, lat: number, lng: number) => void;
  onAdd?: (lat: number, lng: number) => void;
  tall?: boolean;
  label?: string;
};

export default function ZoneMap(props: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ base: L.LayerGroup; cells: L.LayerGroup; top: L.LayerGroup } | null>(null);
  const lib = useRef<typeof L | null>(null);
  const [ready, setReady] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    let alive = true;
    let observer: ResizeObserver | null = null;
    import("leaflet").then(({ default: Leaf }) => {
      if (!alive || !element.current) return;
      lib.current = Leaf;
      const m = Leaf.map(element.current, {
        zoomControl: false,
        preferCanvas: true,
        doubleClickZoom: false,
        scrollWheelZoom: false,
      });
      m.fitBounds(Leaf.polygon(zone.polygon).getBounds(), { padding: [16, 16] });
      Leaf.control.zoom({ position: "bottomright" }).addTo(m);
      Leaf.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
      Leaf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      })
        .on("tileerror", () => setTilesFailed(true))
        .addTo(m);
      m.on("click", () => m.scrollWheelZoom.enable());
      m.on("dblclick", (e: L.LeafletMouseEvent) =>
        callbacks.current.onAdd?.(e.latlng.lat, e.latlng.lng),
      );
      layers.current = {
        cells: Leaf.layerGroup().addTo(m),
        base: Leaf.layerGroup().addTo(m),
        top: Leaf.layerGroup().addTo(m),
      };
      map.current = m;
      observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(element.current);
      setReady(true);
    });
    return () => {
      alive = false;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Camada de células (mapa de calor).
  useEffect(() => {
    const Leaf = lib.current,
      g = layers.current?.cells;
    if (!ready || !Leaf || !g) return;
    g.clearLayers();
    props.cells?.forEach((c) =>
      Leaf.rectangle(
        [
          [c.p[0] - c.dLat / 2, c.p[1] - c.dLng / 2],
          [c.p[0] + c.dLat / 2, c.p[1] + c.dLng / 2],
        ],
        {
          stroke: false,
          fillColor: c.color,
          fillOpacity: props.cellOpacity ?? 0.55,
        },
      )
        .bindTooltip(c.title, { sticky: true })
        .addTo(g),
    );
  }, [ready, props.cells, props.cellOpacity]);

  // Zona, rota, BTS e amostras.
  useEffect(() => {
    const Leaf = lib.current,
      base = layers.current?.base,
      top = layers.current?.top;
    if (!ready || !Leaf || !base || !top) return;
    base.clearLayers();
    top.clearLayers();
    Leaf.polygon(zone.polygon, {
      color: "#1d4ed8",
      weight: 2,
      dashArray: "6 5",
      fillOpacity: props.cells?.length ? 0 : 0.06,
      interactive: false,
    }).addTo(base);
    if (props.showRoute)
      Leaf.polyline(zone.route, { color: "#0f172a", weight: 5, opacity: 0.55 })
        .bindTooltip(zone.routeName)
        .addTo(base);
    if (props.showLandmark)
      Leaf.circleMarker(zone.landmark, {
        radius: 6,
        color: "#fff",
        weight: 2,
        fillColor: "#1d4ed8",
        fillOpacity: 1,
      })
        .bindTooltip("Michafutene", { permanent: true, direction: "right" })
        .addTo(base);
    props.samples?.forEach((s) =>
      Leaf.circleMarker(s.p, {
        radius: 5,
        weight: 1,
        color: "#0f172a",
        fillColor: s.color,
        fillOpacity: 1,
      })
        .bindTooltip(s.title)
        .addTo(top),
    );
    const sectors = props.sectors ?? 3;
    props.stations?.forEach((b) => {
      const site: LatLng = [b.lat, b.lng];
      const off = !b.enabled;
      if (props.circleKm && b.enabled)
        Leaf.circle(site, {
          radius: props.circleKm * 1000,
          color: "#1d4ed8",
          weight: 1,
          fillOpacity: 0.06,
          interactive: false,
        }).addTo(base);
      if (props.sectorLength && b.enabled && sectors > 1)
        for (let s = 0; s < sectors; s++) {
          const a = ((b.azimuth + (s * 360) / sectors) * Math.PI) / 180;
          const len = props.sectorLength;
          Leaf.polyline([site, offset(site, Math.cos(a) * len, Math.sin(a) * len)], {
            color: "#b45309",
            weight: 3,
            interactive: false,
          }).addTo(top);
        }
      const icon = Leaf.divIcon({
        className: "",
        html: `<div class="bts-pin${off ? " off" : ""}${props.selected === b.id ? " selected" : ""}"><span></span><b>${b.id.replace("BTS-", "")}</b></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      Leaf.marker(site, {
        icon,
        draggable: !!props.editable,
        title: b.id,
        keyboard: true,
      })
        .on("click", () => callbacks.current.onSelect?.(b.id))
        .on("dragend", (e) => {
          const ll = (e.target as L.Marker).getLatLng();
          callbacks.current.onMove?.(b.id, ll.lat, ll.lng);
        })
        .addTo(top);
    });
  }, [
    ready,
    props.stations,
    props.sectors,
    props.sectorLength,
    props.circleKm,
    props.selected,
    props.samples,
    props.showRoute,
    props.showLandmark,
    props.editable,
    props.cells,
  ]);

  return (
    <div className={`map ${props.tall ? "tall" : ""}`}>
      <div ref={element} className="map-canvas" aria-label={props.label ?? "Mapa da zona de estudo"} role="application" />
      {tilesFailed && (
        <div className="map-warning">
          Mapa de fundo indisponível (sem Internet). Os cálculos continuam válidos.
        </div>
      )}
    </div>
  );
}
