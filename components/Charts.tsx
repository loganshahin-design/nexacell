"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
export function TrafficChart({ peak }: { peak: number }) {
  const profile = [
    0.18, 0.12, 0.1, 0.16, 0.4, 0.65, 0.58, 0.62, 0.78, 1, 0.72, 0.35,
  ];
  const data = profile.map((v, i) => ({
    hour: `${String(i * 2).padStart(2, "0")}h`,
    value: Math.round(peak * v),
  }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 12, left: -25, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-cyan)"
                stopOpacity={0.28}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-cyan)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--line)"
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="hour"
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
            fontSize={10}
          />
          <YAxis
            stroke="var(--muted)"
            tickLine={false}
            axisLine={false}
            fontSize={10}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
            formatter={(v) => [`${v} Erl`, "Tráfego simulado"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-cyan)"
            strokeWidth={2.5}
            fill="url(#trafficGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Bars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" fontSize={11} stroke="var(--muted)" />
          <YAxis fontSize={10} stroke="var(--muted)" />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
            }}
          />
          <Bar
            dataKey="value"
            name="Estimativa"
            fill="var(--chart-violet)"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
