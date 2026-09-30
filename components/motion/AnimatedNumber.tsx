"use client";
import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { fmt } from "@/utils/format";

// Número que conta até ao novo valor quando uma entrada muda.
export function AnimatedNumber({
  value,
  digits = 0,
}: {
  value: number;
  digits?: number;
}) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => fmt(v, digits));
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !Number.isFinite(value)) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease: "easeOut" });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}
