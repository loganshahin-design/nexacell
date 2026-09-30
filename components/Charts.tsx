"use client";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Params } from "@/types";
import { fspl, hata } from "@/calculations/propagation";
import { classes } from "@/calculations/coverage";
import { fmt } from "@/utils/format";

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false };
const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 12,
  },
};

export function ProjectionChart({
  data,
}: {
  data: { year: number; demand: number; sites: number }[];
}) {
  return (
    <div className="chart" role="img" aria-label="Procura na hora de pico e BTS necessárias por ano">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="year" {...axis} />
          <YAxis yAxisId="d" {...axis} unit=" Mb/s" width={70} />
          <YAxis yAxisId="s" orientation="right" {...axis} allowDecimals={false} width={30} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v, name) =>
              name === "Procura" ? [`${fmt(Number(v))} Mbit/s`, name] : [String(v), name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="d" dataKey="demand" name="Procura" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="s"
            type="stepAfter"
            dataKey="sites"
            name="BTS por capacidade"
            stroke="var(--warn-strong)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PathLossChart({
  p,
  mapl,
  radius,
}: {
  p: Params;
  mapl: number;
  radius: number;
}) {
  const max = Math.max(3, Math.ceil(radius * 2));
  const data = Array.from({ length: 60 }, (_, i) => {
    const d = 0.1 + ((max - 0.1) * i) / 59;
    return {
      d: +d.toFixed(2),
      hata: +hata(p.frequency, p.height, p.mobileHeight, d, p.environment).toFixed(1),
      fspl: +fspl(d, p.frequency).toFixed(1),
    };
  });
  return (
    <div className="chart" role="img" aria-label="Perda de percurso em função da distância">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 12 }}>
          <CartesianGrid stroke="var(--line)" />
          <XAxis
            dataKey="d"
            type="number"
            domain={[0, max]}
            {...axis}
            unit=" km"
          />
          <YAxis {...axis} domain={["auto", "auto"]} unit=" dB" width={62} />
          <Tooltip {...tooltipStyle} labelFormatter={(d) => `${fmt(Number(d), 2)} km`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={mapl} stroke="var(--bad)" strokeDasharray="5 4" label={{ value: `MAPL ${fmt(mapl, 1)} dB`, fill: "var(--bad)", fontSize: 11, position: "insideTopLeft" }} />
          <ReferenceLine x={radius} stroke="var(--accent)" strokeDasharray="5 4" label={{ value: `R = ${fmt(radius, 2)} km`, fill: "var(--accent)", fontSize: 11, position: "insideBottomRight" }} />
          <Line type="monotone" dataKey="hata" name="Hata (usado)" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="fspl" name="Espaço livre (optimista)" stroke="var(--muted)" strokeDasharray="4 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DriveChart({
  samples,
}: {
  samples: { km: number; rsrp: number; server: string | null }[];
}) {
  const data = samples.map((s) => ({
    km: +s.km.toFixed(2),
    rsrp: +s.rsrp.toFixed(1),
    server: s.server,
  }));
  const lo = Math.min(-110, Math.floor(Math.min(...data.map((d) => d.rsrp)) / 5) * 5);
  const hi = Math.max(-70, Math.ceil(Math.max(...data.map((d) => d.rsrp)) / 5) * 5);
  return (
    <div className="chart" role="img" aria-label="RSRP previsto ao longo da N1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 12 }}>
          {classes.map((c, i) => (
            <ReferenceArea
              key={c.key}
              y1={Math.max(c.min, lo)}
              y2={i === 0 ? hi : classes[i - 1].min}
              fill={c.color}
              fillOpacity={0.14}
              ifOverflow="hidden"
            />
          ))}
          <CartesianGrid stroke="var(--line)" />
          <XAxis dataKey="km" type="number" domain={[0, "dataMax"]} {...axis} unit=" km" />
          <YAxis
            domain={[lo, hi]}
            ticks={Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => lo + i * 10)}
            {...axis}
            unit=" dBm"
            width={70}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(d) => `${fmt(Number(d), 2)} km da origem`}
            formatter={(v, _n, item) => [
              `${fmt(Number(v), 1)} dBm (${(item.payload as { server: string }).server ?? "—"})`,
              "RSRP",
            ]}
          />
          <ReferenceLine y={-105} stroke="var(--bad)" strokeDasharray="5 4" />
          <Line type="monotone" dataKey="rsrp" name="RSRP previsto" stroke="var(--text)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Barra empilhada com a distribuição pelas classes do INCM.
export function ShareBar({
  label,
  share,
  note,
}: {
  label: string;
  share: { good: number; fair: number; poor: number; none: number };
  note?: string;
}) {
  return (
    <div className="sharebar">
      <div className="sharebar-top">
        <span>{label}</span>
        {note && <small>{note}</small>}
      </div>
      <div className="sharebar-track" role="img" aria-label={`${label}: ${classes.map((c) => `${c.label} ${fmt(share[c.key], 0)} %`).join(", ")}`}>
        {classes.map((c) =>
          share[c.key] > 0 ? (
            <span
              key={c.key}
              style={{ width: `${share[c.key]}%`, background: c.color }}
              title={`${c.label}: ${fmt(share[c.key], 1)} %`}
            >
              {share[c.key] >= 9 ? `${fmt(share[c.key], 0)}%` : ""}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
