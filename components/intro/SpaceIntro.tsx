"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SkipForward } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { formatAltitude, formatLatLng, targetOf, waypointIndex, waypointsFor } from "@/data/intro";
import { routeLength } from "@/calculations/geo";
import { fmt } from "@/utils/format";
import Starfield from "./Starfield";
import type { EngineProps, Phase, Telemetry } from "./engine";

const GlobeMap = dynamic(() => import("./GlobeMap"), { ssr: false });
const OfflineGlobe = dynamic(() => import("./OfflineGlobe"), { ssr: false });

type Engine = "online" | "offline" | "none";

// Tempo na chegada antes de entrar na aplicação (ms).
const HOLD = { online: 3800, offline: 2800, none: 0 };

export default function SpaceIntro({
  mode,
  onDone,
  renderCard,
}: {
  mode: "login" | "replay";
  onDone: () => void;
  // Cartão do ecrã de entrada; recebe a função que inicia a viagem.
  renderCard?: (start: () => void) => React.ReactNode;
}) {
  const { stations, params, dim, zone, zoneArea } = useProject();
  const target = targetOf(zone);
  const waypoints = waypointsFor(zone);
  const reduce = !!useReducedMotion();
  const [engine, setEngine] = useState<Engine | null>(null);
  const [phase, setPhase] = useState<Phase>("orbit");
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [tel, setTel] = useState<Telemetry>({ altitudeKm: 20000, center: target });
  const done = useRef(false);

  // Sem Internet vai directo para o globo offline.
  useEffect(() => setEngine(navigator.onLine ? "online" : "offline"), []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    if (reduce) return onDone();
    setLeaving(true);
    setTimeout(onDone, 900);
  }, [onDone, reduce]);

  const start = useCallback(() => {
    if (reduce || engine === "none") return finish();
    setPhase((p) => (p === "orbit" ? "zoom" : p));
  }, [reduce, engine, finish]);

  // Repetição: um instante a ver a Terra e depois desce.
  useEffect(() => {
    if (mode !== "replay") return;
    if (reduce || engine === "none") return finish();
    if (!ready) return;
    const t = setTimeout(() => setPhase((p) => (p === "orbit" ? "zoom" : p)), 1300);
    return () => clearTimeout(t);
  }, [mode, ready, reduce, engine, finish]);

  // Chegada: mostra a zona e entra na aplicação.
  useEffect(() => {
    if (phase !== "arrive" || !engine) return;
    const t = setTimeout(finish, HOLD[engine]);
    return () => clearTimeout(t);
  }, [phase, engine, finish]);

  // Esc salta a viagem; Enter no ecrã de entrada começa-a.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (phase !== "orbit" || mode === "replay")) finish();
      if (e.key === "Enter" && mode === "login" && phase === "orbit" && (e.target as HTMLElement)?.tagName !== "BUTTON") start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, mode, finish, start]);

  const engineProps: EngineProps = {
    phase,
    reduce,
    layout: mode === "login" ? "login" : "center",
    stations,
    zone,
    onTelemetry: setTel,
    onReady: () => setReady(true),
    onArrive: () => setPhase("arrive"),
    onFail: () => {
      setReady(false);
      setEngine((e) => (e === "online" ? "offline" : "none"));
    },
  };

  const travelling = phase === "zoom" || phase === "arrive";
  const wp = waypointIndex(tel.altitudeKm, waypoints);
  // Globo offline: um clarão esconde a textura desfocada nos últimos quilómetros.
  const flash = engine === "offline" ? Math.min(1, Math.max(0, (260 - tel.altitudeKm) / 240)) : 0;

  return (
    <motion.div
      className={`intro ${mode}`}
      role="region"
      aria-label={mode === "login" ? "Entrada do NexaCell" : `Voo do espaço até ${zone.short}`}
      initial={{ opacity: mode === "replay" ? 0 : 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? 0.9 : 0.5 }}
    >
      {engine !== "offline" && <Starfield reduce={reduce} />}
      {engine === "online" && <GlobeMap key={`online-${zone.id}`} {...engineProps} />}
      {engine === "offline" && <OfflineGlobe key={`offline-${zone.id}`} {...engineProps} />}
      <div className="intro-vignette" aria-hidden />
      {flash > 0 && <div className="intro-flash" style={{ opacity: flash }} aria-hidden />}

      <AnimatePresence>
        {mode === "login" && phase === "orbit" && renderCard && (
          <motion.div
            key="card"
            className="login-wrap"
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, filter: "blur(10px)", x: -40 }}
            transition={{ duration: 0.6, ease: "easeIn" }}
          >
            {renderCard(start)}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {travelling && (
          <motion.aside
            key="hud"
            className="intro-hud"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="hud-kicker">A descer para</span>
            <div className="hud-place" aria-live="polite">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={waypoints[wp].name}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
                  transition={{ duration: 0.45 }}
                >
                  <strong>{waypoints[wp].name}</strong>
                  <small>{waypoints[wp].note}</small>
                </motion.div>
              </AnimatePresence>
            </div>
            <dl className="hud-data">
              <div>
                <dt>Altitude</dt>
                <dd>≈ {formatAltitude(tel.altitudeKm)}</dd>
              </div>
              <div>
                <dt>Centro</dt>
                <dd>{formatLatLng(tel.center)}</dd>
              </div>
            </dl>
            <ol className="hud-rail">
              {waypoints.map((w, i) => (
                <li key={w.name} className={i < wp ? "past" : i === wp ? "now" : ""}>
                  {w.name}
                </li>
              ))}
            </ol>
          </motion.aside>
        )}
      </AnimatePresence>

      {(travelling || mode === "replay") && !leaving && (
        <button className="intro-skip" onClick={finish}>
          Saltar <SkipForward size={15} aria-hidden /> <kbd>Esc</kbd>
        </button>
      )}

      <AnimatePresence>
        {phase === "arrive" && engine !== "none" && (
          <motion.div
            key="arrival"
            className="arrival"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: engine === "online" ? 0.6 : 0.1 }}
          >
            <span className="hud-kicker">Zona de estudo</span>
            <strong>{zone.name}</strong>
            <ul>
              {[
                [fmt(zoneArea, 2), "km²"],
                [fmt(params.population), "habitantes"],
                [String(dim.required), `BTS em ${dim.traffic.year}`],
                [fmt(routeLength(zone.route), 1), "km da N1"],
              ].map(([v, l], i) => (
                <motion.li key={l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.12 }}>
                  <b>{v}</b>
                  <span>{l}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
