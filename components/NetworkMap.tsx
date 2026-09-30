"use client";
import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { BTS, FieldPoint } from "@/types";
import { center } from "@/data/defaults";
import { bounds, distance } from "@/calculations/network";
type Props = {
  stations: BTS[];
  points: FieldPoint[];
  area: number;
  onSelect: (id: string) => void;
  onMove: (id: string, lat: number, lng: number) => void;
  onAdd: (lat: number, lng: number) => void;
  large?: boolean;
  zones?: {
    name: string;
    color: string;
    bounds: [[number, number], [number, number]];
  }[];
};
export default function NetworkMap({
  stations,
  points,
  area,
  onSelect,
  onMove,
  onAdd,
  large,
  zones,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opacity, setOpacity] = useState(0.18);
  const [visible, setVisible] = useState({
    BTS: true,
    Sectores: false,
    Cobertura: true,
    Sobreposição: false,
    "Sem cobertura": false,
    "Pontos de teste": false,
    "Área de serviço": true,
  });
  const callbacks = useRef({ onSelect, onMove, onAdd });
  callbacks.current = { onSelect, onMove, onAdd };
  useEffect(() => {
    let alive = true;
    import("leaflet").then(({ default: L }) => {
      if (!alive || !element.current) return;
      const m = L.map(element.current, {
        zoomControl: false,
        preferCanvas: true,
      }).setView(center, 13);
      map.current = m;
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      })
        .on("tileerror", () => setFailed(true))
        .addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on("dblclick", (e: L.LeafletMouseEvent) =>
        callbacks.current.onAdd(e.latlng.lat, e.latlng.lng),
      );
      m.doubleClickZoom.disable();
      setReady(true);
      const observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(element.current);
      (m as L.Map & { observer?: ResizeObserver }).observer = observer;
    });
    return () => {
      alive = false;
      (
        map.current as (L.Map & { observer?: ResizeObserver }) | null
      )?.observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    import("leaflet").then(({ default: L }) => {
      const group = layer.current;
      if (!group) return;
      group.clearLayers();
      zones?.forEach((zone) => {
        const label = document.createElement("span");
        label.textContent = zone.name;
        L.rectangle(zone.bounds, {
          color: zone.color,
          weight: 2,
          dashArray: "5 5",
          fillOpacity: 0.07,
        })
          .bindTooltip(label, { sticky: true })
          .addTo(group);
      });
      const bb = bounds(area);
      if (visible.Sobreposição || visible["Sem cobertura"]) {
        const dy = (bb[1][0] - bb[0][0]) / 30,
          dx = (bb[1][1] - bb[0][1]) / 30;
        for (let y = 0; y < 30; y++)
          for (let x = 0; x < 30; x++) {
            const lat = bb[0][0] + y * dy,
              lng = bb[0][1] + x * dx;
            const count = stations.filter(
              (b) =>
                b.enabled &&
                distance(lat + dy / 2, lng + dx / 2, b.lat, b.lng) <= b.radius,
            ).length;
            if (
              (count > 1 && visible.Sobreposição) ||
              (count === 0 && visible["Sem cobertura"])
            )
              L.rectangle(
                [
                  [lat, lng],
                  [lat + dy, lng + dx],
                ],
                {
                  stroke: false,
                  fillColor: count ? "#fbbf24" : "#f87171",
                  fillOpacity: opacity,
                  interactive: false,
                },
              ).addTo(group);
          }
      }
      const colors = ["#22d3ee", "#8b5cf6", "#10b981"];
      if (visible["Área de serviço"])
        L.rectangle(bounds(area), {
          color: "#7e9ab9",
          weight: 1,
          dashArray: "6 6",
          fillOpacity: 0.02,
        }).addTo(group);
      stations
        .filter((b) => b.enabled)
        .forEach((b, i) => {
          const color = colors[i % 3];
          if (visible.Cobertura) {
            L.circle([b.lat, b.lng], {
              radius: b.radius * 1000,
              color,
              weight: 1,
              fillOpacity: opacity,
            }).addTo(group);
          }
          if (visible.Sectores)
            for (let s = 0; s < b.sectors; s++) {
              const angle =
                ((b.azimuth + (s * 360) / b.sectors) * Math.PI) / 180;
              L.polyline(
                [
                  [b.lat, b.lng],
                  [
                    b.lat + (Math.cos(angle) * b.radius) / 111.32,
                    b.lng +
                      (Math.sin(angle) * b.radius) /
                        (111.32 * Math.cos((b.lat * Math.PI) / 180)),
                  ],
                ],
                { color, weight: 2 },
              ).addTo(group);
            }
          if (visible.BTS) {
            const icon = L.divIcon({
              className: "tower-marker",
              html: `<span style="--marker:${color}"><svg width="21" height="25" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5 5 26M12 5l7 21M7 20h10M9 14h6M8 25l9-5M16 25l-9-5M8 9a6 6 0 0 1 0-8M16 1a6 6 0 0 1 0 8"/><circle cx="12" cy="5" r="2"/></svg></span><b>${b.id}</b>`,
              iconSize: [46, 50],
              iconAnchor: [23, 23],
            });
            L.marker([b.lat, b.lng], { icon, draggable: true })
              .on("click", () => callbacks.current.onSelect(b.id))
              .on("dragend", (e) => {
                const ll = e.target.getLatLng();
                callbacks.current.onMove(b.id, ll.lat, ll.lng);
              })
              .addTo(group);
          }
        });
      if (visible["Pontos de teste"])
        points.forEach((p) =>
          L.circleMarker([p.lat, p.lng], {
            radius: 6,
            color: p.real ? "#fbbf24" : "#fff",
            fillOpacity: 0.8,
          })
            .bindTooltip(
              `${p.id} · ${p.real ? "Medição manual" : "Demonstração"}`,
            )
            .addTo(group),
        );
    });
  }, [ready, stations, points, area, visible, opacity, zones]);
  return (
    <div className={`map-shell ${large ? "large" : ""}`}>
      <div ref={element} className="map-canvas" />
      <div className="map-label">
        <span className="live-dot" /> MARRACUENE{" "}
        <small>PROVÍNCIA DE MAPUTO, MOÇAMBIQUE</small>
      </div>
      <details className="map-layers">
        <summary>◈ Camadas</summary>
        {Object.entries(visible).map(([k, v]) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={v}
              onChange={() => setVisible({ ...visible, [k]: !v })}
            />
            {k}
          </label>
        ))}
        <label>
          Opacidade
          <input
            aria-label="Opacidade"
            type="range"
            min="0.05"
            max="0.6"
            step=".05"
            value={opacity}
            onChange={(e) => setOpacity(+e.target.value)}
          />
        </label>
      </details>
      <div className="map-legend">
        <span>
          <i style={{ background: "#22d3ee" }} />
          Cobertura geométrica
        </span>
        <span>
          <i style={{ background: "#fbbf24" }} />
          Sobreposição geométrica
        </span>
      </div>
      {failed && (
        <div className="tile-warning">
          Mapa base indisponível. Verifique a ligação à Internet; as BTS
          continuam editáveis.
        </div>
      )}
    </div>
  );
}
