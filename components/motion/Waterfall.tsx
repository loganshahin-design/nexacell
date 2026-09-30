"use client";
import { motion, useReducedMotion } from "motion/react";
import { fmt } from "@/utils/format";

export type WaterStep = { label: string; delta: number; total?: boolean };

// Cascata: cada ganho sobe, cada perda desce, e a última barra é o total.
export function Waterfall({ steps, unit = "dB" }: { steps: WaterStep[]; unit?: string }) {
  const reduce = useReducedMotion();
  const W = 640,
    H = 250,
    left = 40,
    bottom = 210,
    top = 22;
  let run = 0;
  const bars = steps.map((s) => {
    const from = s.total ? 0 : run;
    const to = s.total ? s.delta : run + s.delta;
    if (!s.total) run = to;
    return { ...s, from, to };
  });
  const max = Math.max(...bars.map((b) => Math.max(b.from, b.to))) * 1.08 || 1;
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  const slot = (W - left - 10) / bars.length;
  const bw = Math.min(64, slot * 0.66);
  const ticks = [0, 50, 100, 150].filter((t) => t < max);
  return (
    <svg
      className="waterfall"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={bars
        .map((b) => `${b.label} ${b.total ? "" : b.delta >= 0 ? "+" : "−"}${fmt(Math.abs(b.delta), 1)} ${unit}`)
        .join(", ")}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W - 6} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = left + i * slot + (slot - bw) / 2;
        const up = b.to >= b.from;
        const yTop = y(Math.max(b.from, b.to));
        const h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
        const color = b.total ? "var(--text)" : up ? "var(--accent)" : "var(--laterite)";
        return (
          <g key={b.label}>
            {i > 0 && !b.total && (
              <line
                x1={x - (slot - bw)}
                x2={x}
                y1={y(b.from)}
                y2={y(b.from)}
                stroke="var(--muted)"
                strokeDasharray="3 3"
              />
            )}
            <motion.rect
              x={x}
              width={bw}
              rx={3}
              fill={color}
              initial={{ scaleY: reduce ? 1 : 0, y: yTop, height: h }}
              animate={{ scaleY: 1, y: yTop, height: h }}
              style={{ transformBox: "fill-box", originY: up ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : i * 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            />
            <text x={x + bw / 2} y={yTop - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text)">
              {b.total ? fmt(b.delta, 1) : `${up ? "+" : "−"}${fmt(Math.abs(b.delta), 1)}`}
            </text>
            <text x={x + bw / 2} y={bottom + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
              {b.label}
            </text>
          </g>
        );
      })}
      <text x={W - 6} y={14} textAnchor="end" fontSize="11" fill="var(--muted)">
        {unit}
      </text>
    </svg>
  );
}
