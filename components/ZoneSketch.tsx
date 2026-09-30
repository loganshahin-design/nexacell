import { zone, LatLng } from "@/data/zone";
import { bbox } from "@/calculations/geo";
import { BTS } from "@/types";

// Esboço estático da zona em SVG (usado no relatório impresso).
export default function ZoneSketch({
  stations,
  cells,
  samples,
  label,
}: {
  stations?: BTS[];
  cells?: { p: LatLng; dLat: number; dLng: number; color: string }[];
  samples?: { p: LatLng; color: string }[];
  label: string;
}) {
  const [sw, ne] = bbox(zone.polygon);
  const k = Math.cos((sw[0] * Math.PI) / 180);
  const W = 400;
  const H = ((ne[0] - sw[0]) / ((ne[1] - sw[1]) * k)) * W;
  const x = (p: LatLng) => ((p[1] - sw[1]) / (ne[1] - sw[1])) * W;
  const y = (p: LatLng) => ((ne[0] - p[0]) / (ne[0] - sw[0])) * H;
  const pts = (list: LatLng[]) => list.map((p) => `${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} className="sketch" role="img" aria-label={label}>
      {cells?.map((c, i) => (
        <rect
          key={i}
          x={x([c.p[0], c.p[1] - c.dLng / 2])}
          y={y([c.p[0] + c.dLat / 2, c.p[1]])}
          width={(c.dLng / (ne[1] - sw[1])) * W + 0.4}
          height={(c.dLat / (ne[0] - sw[0])) * H + 0.4}
          fill={c.color}
          opacity={0.75}
        />
      ))}
      <polygon points={pts(zone.polygon)} fill={cells ? "none" : "#1d4ed810"} stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="5 4" />
      <polyline points={pts(zone.route)} fill="none" stroke="#0f172a" strokeWidth={2.5} opacity={0.6} />
      {samples?.map((s, i) => (
        <circle key={i} cx={x(s.p)} cy={y(s.p)} r={3} fill={s.color} stroke="#0f172a" strokeWidth={0.5} />
      ))}
      {stations?.map((b) => (
        <g key={b.id} opacity={b.enabled ? 1 : 0.4}>
          <circle cx={x([b.lat, b.lng])} cy={y([b.lat, b.lng])} r={6} fill="#1d4ed8" stroke="#fff" strokeWidth={1.5} />
          <text x={x([b.lat, b.lng]) + 8} y={y([b.lat, b.lng]) + 4} fontSize="11" fontWeight="700" fill="#0f172a">
            {b.id.replace("BTS-", "")}
          </text>
        </g>
      ))}
      <g transform={`translate(${W - 20}, 14)`}>
        <path d="M0,-10 L5,4 L0,1 L-5,4 Z" fill="#0f172a" />
        <text y={16} textAnchor="middle" fontSize="10" fill="#0f172a">N</text>
      </g>
    </svg>
  );
}
