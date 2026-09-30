"use client";
import { motion, useReducedMotion } from "motion/react";
import { fmt } from "@/utils/format";

export type Stage = { label: string; note: string; value: number };

// Funil animado: cada barra enche por ordem, proporcional à primeira.
export function Funnel({ stages }: { stages: Stage[] }) {
  const reduce = useReducedMotion();
  const top = stages[0]?.value || 1;
  return (
    <div className="funnel" role="list">
      {stages.map((s, i) => (
        <div className="funnel-row" role="listitem" key={s.label}>
          <span>
            {s.label}
            <small>{s.note}</small>
          </span>
          <div className="funnel-track">
            <motion.div
              className="funnel-fill"
              initial={{ width: reduce ? `${(s.value / top) * 100}%` : "0%" }}
              animate={{ width: `${Math.max((s.value / top) * 100, 0)}%` }}
              transition={{
                duration: reduce ? 0 : 0.6,
                delay: reduce ? 0 : i * 0.22,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              {fmt(s.value)}
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}
