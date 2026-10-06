"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { elevation, verticalLoss } from "@/calculations/antenna";
import { classify, coverageMap } from "@/calculations/coverage";
import { hata, powerPerRe, resourceBlocks } from "@/calculations/propagation";
import { Panel } from "@/components/ui";
import { fmt } from "@/utils/format";

// Explicação animada da antena vista de lado: o feixe, o tilt e porque usamos 4°.
// Tem o seu próprio tilt (não muda os parâmetros do projecto).

const W = 720,
  H = 330,
  GROUND = 250,
  X0 = 70,
  KM = 250, // px por km
  M = 4.6, // px por metro (escala vertical exagerada)
  MAX_KM = (W - X0 - 10) / KM;

type Step = { title: string; tilt: number | null; text: string };

// Tween simples do tilt, para o feixe rodar devagar entre passos.
function useTween(target: number, ms = 900) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    const start = performance.now(),
      a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - (1 - k) ** 3;
      const v = a + (target - a) * e;
      from.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return value;
}

export default function AntennaExplainer() {
  const { params: p, stations, zone, dim } = useProject();
  const R = dim.link.radius;
  const h = p.height,
    hm = p.mobileHeight,
    v = p.vBeam;

  const steps: Step[] = [
    {
      title: "A orla",
      tilt: null,
      text: `Cada torre serve uma zona à volta dela: a célula. A orla é a fronteira dessa zona, o ponto mais longe que a torre tem de servir: ${fmt(R, 2)} km. Depois da orla começa a zona da torre vizinha. A antena está a ${fmt(h)} m de altura (no desenho a altura está exagerada, para se ver).`,
    },
    {
      title: "Sem inclinação (0°)",
      tilt: 0,
      text: "A antena manda o sinal num feixe, como uma lanterna. Se ficar direita, o feixe vai longe demais: passa a orla e chega forte à zona da torre vizinha. Como as duas usam a mesma frequência, atrapalham-se: é a interferência. E perto da torre o feixe passa por cima das casas.",
    },
    {
      title: "Inclinação a mais (10°)",
      tilt: 10,
      text: "Se a inclinarmos demais, o feixe bate no chão perto da torre. A vizinha fica protegida, mas a orla da nossa célula fica sem sinal suficiente (vermelho) e grande parte da zona deixa de cumprir.",
    },
    {
      title: `Os nossos ${fmt(p.tilt)}°`,
      tilt: p.tilt,
      text: `O certo está no meio: o feixe deve chegar até à orla e parar aí. Testámos no mapa vários ângulos, com as 10 torres (gráfico ao lado). Com ${fmt(p.tilt)}° a zona fica bem coberta, acima da meta de ${fmt(p.coverageTarget)} %, e pouco sinal passa para a vizinha. Por isso usamos ${fmt(p.tilt)}°.`,
    },
  ];

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const s = steps[step];
  const last = step === steps.length - 1;
  const tilt = useTween(s.tilt ?? 0);

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((k) => k + 1), 9000);
    return () => clearTimeout(t);
  }, [playing, step, steps.length]);

  // RSRP no eixo do feixe, à distância d (km), com o tilt t.
  const re = powerPerRe(p.power, resourceBlocks(p.bandwidth)) + p.gain - p.cable + p.ueGain;
  const rsrp = (d: number, t: number) =>
    re - hata(p.frequency, h, hm, d, p.environment) - verticalLoss(elevation(h, hm, d), t, v);

  // Cobertura da zona (mapa) para cada tilt: calculada aos poucos, guardada.
  const cache = useMemo(() => new Map<number, number>(), [p, stations, zone]);
  const coverageAt = (t: number) => {
    const k = Math.round(t * 2) / 2;
    if (!cache.has(k)) cache.set(k, coverageMap({ ...p, tilt: k }, stations, zone.polygon, 60).designCoverage);
    return cache.get(k)!;
  };
  const curveTilts = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []);
  const [curve, setCurve] = useState<number[]>([]);
  useEffect(() => {
    let i = 0,
      t = 0;
    const out: number[] = [];
    const next = () => {
      out.push(coverageAt(curveTilts[i]));
      setCurve([...out]);
      if (++i < curveTilts.length) t = window.setTimeout(next, 30);
    };
    t = window.setTimeout(next, 300);
    return () => clearTimeout(t);
  }, [cache]);
  const shownTilt = s.tilt ?? p.tilt;
  const coverage = coverageAt(shownTilt);

  // Geometria do desenho.
  const ax = X0,
    ay = GROUND - h * M;
  const sx = (km: number) => X0 + km * KM;
  const rayEnd = (deg: number): [number, number] => {
    const d = MAX_KM + 0.4;
    return [sx(d), GROUND - (h - Math.tan((deg * Math.PI) / 180) * d * 1000) * M];
  };
  const beam = (t: number) => {
    const [x1, y1] = rayEnd(t - v / 2),
      [x2, y2] = rayEnd(t + v / 2);
    return `M${ax},${ay} L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} Z`;
  };
  const centre = rayEnd(tilt);
  const ground = useMemo(() => {
    const out: { x: number; w: number; color: string }[] = [];
    const step = 0.025;
    for (let d = 0.025; d < MAX_KM; d += step) {
      out.push({ x: sx(d), w: step * KM + 0.5, color: classify(rsrp(d, tilt)).color });
    }
    return out;
  }, [tilt, p]);

  const showBeam = s.tilt !== null;
  const atEdge = rsrp(R, shownTilt),
    atNeighbour = rsrp(2 * R, shownTilt);
  const houses = [0.25, 0.42, 0.6, 0.78, 0.95, 1.2, 1.38, 1.62, 1.85, 2.25];

  // Mini-gráfico: cobertura da zona contra o tilt.
  const CW = 300,
    CH = 170,
    cx = (t: number) => 36 + (t / 10) * (CW - 50),
    cy = (c: number) => 14 + ((100 - c) / 60) * (CH - 44);

  return (
    <Panel title={`Porque é que a antena está inclinada ${fmt(p.tilt)}°?`} className="explainer">
      <ol className="explainer-steps" aria-label="Passos da explicação">
        {steps.map((x, i) => (
          <li key={x.title}>
            <button
              type="button"
              className={i === step ? "on" : i < step ? "done" : ""}
              aria-current={i === step ? "step" : undefined}
              onClick={() => {
                setPlaying(false);
                setStep(i);
              }}
            >
              <span>{i + 1}</span> {x.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="explainer-scene">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Antena vista de lado com tilt de ${fmt(tilt, 1)} graus`}>
          <defs>
            <linearGradient id="beam-fill" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0.06" />
            </linearGradient>
            <clipPath id="above-ground">
              <rect x="0" y="0" width={W} height={GROUND} />
            </clipPath>
          </defs>
          <rect x={sx(R)} y={8} width={W - sx(R)} height={GROUND - 8} fill="var(--surface-2, var(--line))" opacity={0.45} />
          <text x={sx(R) + 10} y={28} className="ex-label muted">célula vizinha</text>
          <text x={sx(0) + 14} y={28} className="ex-label muted">a nossa célula</text>

          {houses.map((d) => (
            <g key={d} transform={`translate(${sx(d)},${GROUND})`} className="ex-house">
              <rect x={-9} y={-24} width={18} height={24} />
              <path d="M-12,-23 L0,-34 L12,-23 Z" />
            </g>
          ))}

          {showBeam && (
            <g clipPath="url(#above-ground)">
              <path d={beam(tilt)} fill="url(#beam-fill)" stroke="var(--accent)" strokeOpacity={0.5} strokeDasharray="5 4" />
              <line x1={ax} y1={ay} x2={centre[0]} y2={centre[1]} stroke="var(--accent)" strokeWidth={2.5} />
            </g>
          )}


          {/* Torre, antena, BTS vizinha */}
          <g className="ex-tower">
            <path d={`M${ax - 9},${GROUND} L${ax},${ay} L${ax + 9},${GROUND}`} />
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={ax - 9 * (1 - f)} x2={ax + 9 * (1 - f)} y1={GROUND - h * M * f} y2={GROUND - h * M * f} />
            ))}
          </g>
          <rect x={ax - 3} y={ay - 14} width={7} height={28} rx={2} className="ex-panel" transform={`rotate(${tilt * 3},${ax},${ay})`} />
          <text x={ax - 12} y={ay - 20} textAnchor="end" className="ex-label">{fmt(h)} m</text>
          <g className="ex-tower small" transform={`translate(${sx(2 * R)},0)`}>
            <path d={`M-7,${GROUND} L0,${ay + 20} L7,${GROUND}`} />
          </g>
          <text x={sx(2 * R)} y={ay + 8} textAnchor="middle" className="ex-label muted">BTS vizinha</text>

          {/* Orla e solo */}
          <line x1={sx(R)} x2={sx(R)} y1={40} y2={GROUND + 32} stroke="var(--bad)" strokeWidth={2} strokeDasharray="6 4" />
          <text x={sx(R)} y={GROUND + 50} textAnchor="middle" className="ex-label bad">orla · {fmt(R, 2)} km</text>
          <line x1={0} x2={W} y1={GROUND} y2={GROUND} stroke="var(--muted)" strokeWidth={1.5} />
          {ground.map((g, i) => (
            <rect key={i} x={g.x} y={GROUND + 6} width={g.w} height={14} fill={g.color} opacity={showBeam ? 1 : 0.15} />
          ))}
          <text x={X0 - 8} y={GROUND + 18} textAnchor="end" className="ex-label muted">sinal</text>
          <text x={W - 8} y={GROUND + 50} textAnchor="end" className="ex-label muted">{fmt(MAX_KM, 1)} km</text>
          {showBeam && (
            <text x={W - 10} y={ay - 6} textAnchor="end" className="ex-tilt">
              tilt {fmt(tilt, 1)}°
            </text>
          )}
        </svg>

      </div>

      <div className="explainer-body">
        <div className="explainer-text" aria-live="polite">
          <h3>
            {step + 1}. {s.title}
          </h3>
          <p>{s.text}</p>
          <div className="explainer-nav">
            <button type="button" className="btn" disabled={step === 0} onClick={() => { setPlaying(false); setStep(step - 1); }}>
              ◀ Anterior
            </button>
            <button type="button" className="btn primary" disabled={last} onClick={() => { setPlaying(false); setStep(step + 1); }}>
              Seguinte ▶
            </button>
            <button type="button" className="btn ghost" onClick={() => { if (last) setStep(0); setPlaying(!playing); }}>
              {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {playing ? "Pausa" : "Reproduzir"}
            </button>
          </div>
        </div>

        {showBeam && (
          <div className="explainer-side">
            <dl className="explainer-read">
              <div><dt>Na orla ({fmt(R, 2)} km)</dt><dd>{fmt(atEdge, 1)} dBm</dd></div>
              <div><dt>Na BTS vizinha</dt><dd>{fmt(atNeighbour, 1)} dBm <small>(menos é melhor)</small></dd></div>
              <div><dt>Cobertura da zona (mapa)</dt><dd className={coverage >= p.coverageTarget ? "ok" : "bad"}>{fmt(coverage, 1)} %</dd></div>
            </dl>
            {last && (
              <svg className="explainer-curve" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Cobertura da zona para cada tilt">
                {[100, 80, 60, 40].map((c) => (
                  <g key={c}>
                    <line x1={36} x2={CW - 14} y1={cy(c)} y2={cy(c)} stroke="var(--line)" />
                    <text x={30} y={cy(c) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{c}%</text>
                  </g>
                ))}
                <line x1={36} x2={CW - 14} y1={cy(p.coverageTarget)} y2={cy(p.coverageTarget)} stroke="var(--bad)" strokeDasharray="4 3" />
                <text x={CW - 14} y={cy(p.coverageTarget) - 4} textAnchor="end" fontSize="10" fill="var(--bad)">meta {fmt(p.coverageTarget)} %</text>
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  points={curve.map((c, i) => `${cx(curveTilts[i])},${cy(Math.max(c, 40))}`).join(" ")}
                />
                {curve.map((c, i) => (
                  <circle key={i} cx={cx(curveTilts[i])} cy={cy(Math.max(c, 40))} r={2.5} fill="var(--accent)" />
                ))}
                <circle cx={cx(Math.min(shownTilt, 10))} cy={cy(Math.max(coverage, 40))} r={6} fill="none" stroke="var(--text)" strokeWidth={2} />
                {[0, 2, 4, 6, 8, 10].map((t) => (
                  <text key={t} x={cx(t)} y={CH - 12} textAnchor="middle" fontSize="10" fill="var(--muted)">{t}°</text>
                ))}
              </svg>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
