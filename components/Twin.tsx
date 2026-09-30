"use client";
import { useState } from "react";
import { BTS } from "@/types";
export default function Twin({
  stations,
  onSelect,
}: {
  stations: BTS[];
  onSelect: (id: string) => void;
}) {
  const [rotation, setRotation] = useState(-28);
  const [zoom, setZoom] = useState(1);
  return (
    <div className="twin">
      <div
        className="city"
        style={{
          transform: `translate(-50%,-50%) scale(${zoom}) rotateX(57deg) rotateZ(${rotation}deg)`,
        }}
      >
        <div className="city-grid" />
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className={`building ${i % 4 === 0 ? "twin-shop" : i % 3 === 0 ? "twin-house" : ""}`}
            style={{
              left: `${12 + (i % 5) * 17}%`,
              top: `${12 + Math.floor(i / 5) * 22}%`,
              height: 18 + ((i * 17) % 45),
              width: 17 + (i % 3) * 9,
            }}
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={`tree-${i}`}
            className="twin-tree"
            style={{
              left: `${8 + (i % 4) * 26}%`,
              top: `${8 + Math.floor(i / 4) * 78}%`,
            }}
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={`person-${i}`}
            className="twin-person"
            style={{
              left: `${18 + (i % 3) * 31}%`,
              top: `${40 + Math.floor(i / 3) * 37}%`,
            }}
          />
        ))}
        <div className="twin-sectors" />
        {stations.map((b, i) => (
          <button
            key={b.id}
            title={`${b.id} · ${b.power} dBm`}
            onClick={() => onSelect(b.id)}
            className="twin-tower"
            style={{
              left: `${25 + (i % 3) * 25}%`,
              top: `${28 + Math.floor(i / 3) * 20}%`,
            }}
          >
            <span className="radio-ring" />
            <span className="radio-ring second" />
            <svg width="55" height="115" viewBox="0 0 55 115">
              <path
                d="M27 8 L8 110 M27 8 L48 110 M15 76 H40 M20 48 H35 M8 110 L40 76 L20 48 L30 20 M48 110 L15 76 L35 48"
                fill="none"
                stroke="#75eaff"
                strokeWidth="2"
              />
              <rect x="16" y="13" width="7" height="26" rx="2" fill="#d1fcff" />
              <rect x="31" y="13" width="7" height="26" rx="2" fill="#67d6f3" />
            </svg>
            <b>{b.id}</b>
          </button>
        ))}
      </div>
      <div className="twin-badge">
        ◈ Digital Twin{" "}
        <small>Representação 3D conceptual da área de estudo.</small>
      </div>
      <div className="twin-controls">
        <label>
          Rotação
          <input
            aria-label="Rotação da câmara"
            type="range"
            min="-180"
            max="180"
            value={rotation}
            onChange={(e) => setRotation(+e.target.value)}
          />
        </label>
        <label>
          Zoom
          <input
            aria-label="Zoom 3D"
            type="range"
            min=".6"
            max="1.5"
            step=".1"
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
