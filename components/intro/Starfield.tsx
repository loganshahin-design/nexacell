"use client";
import { useEffect, useRef } from "react";

// Céu estrelado em canvas: estrelas a cintilar com uma ligeira paralaxe do rato.
export default function Starfield({ reduce }: { reduce: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let w = 0,
      h = 0,
      frame = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Posições em [0, 1]; profundidade controla tamanho, brilho e paralaxe.
    const stars = Array.from({ length: 520 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() ** 2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.8,
      tint: Math.random() < 0.12 ? "180,205,255" : Math.random() < 0.08 ? "255,214,170" : "255,255,255",
    }));
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const move = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    };
    const draw = (t: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(s.phase + (t / 1000) * s.speed);
        const px = s.x * w - pointer.x * 30 * (0.2 + s.z);
        const py = s.y * h - pointer.y * 30 * (0.2 + s.z);
        const r = 0.35 + s.z * 1.35;
        ctx.fillStyle = `rgba(${s.tint},${(0.25 + 0.75 * s.z) * twinkle})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
    };
  }, [reduce]);
  return <canvas ref={canvas} className="starfield" aria-hidden />;
}
