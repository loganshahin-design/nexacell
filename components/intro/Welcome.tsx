"use client";
import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowRight, MapPin, RadioTower } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { formatLatLng, targetOf } from "@/data/intro";
import { team } from "@/components/steps/Cover";
import { fmt } from "@/utils/format";
import SpaceIntro from "./SpaceIntro";

// Número que conta a partir de zero quando o cartão aparece.
function CountUp({ value, digits = 0, delay = 0 }: { value: number; digits?: number; delay?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => fmt(v, digits));
  useEffect(() => {
    if (reduce) return mv.set(value);
    const c = animate(mv, value, { duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, delay, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}

// Texto que se escreve letra a letra.
function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    let i = 0;
    let timer: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      timer = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(timer);
      }, 32);
    }, delay * 1000);
    return () => {
      clearTimeout(t);
      clearInterval(timer);
    };
  }, [text, delay, reduce]);
  return (
    <span className="typewriter" aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      {n < text.length && <i aria-hidden />}
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

function LoginCard({ onEnter }: { onEnter: () => void }) {
  const { dim, zone } = useProject();
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const } };
  return (
    <motion.section
      className="login-card"
      aria-labelledby="login-title"
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="login-sweep" aria-hidden />
      <motion.div className="login-logo" aria-hidden {...rise(0.2)}>
        <span className="arc a1" />
        <span className="arc a2" />
        <span className="arc a3" />
        <RadioTower size={30} />
      </motion.div>
      <motion.p className="login-kicker" {...rise(0.35)}>
        Comunicações Móveis · Projecto de CM
      </motion.p>
      <h1 id="login-title" className="login-title" aria-label="NexaCell">
        {"NexaCell".split("").map((c, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={reduce ? false : { opacity: 0, y: 40, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.7, delay: 0.45 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            {c}
          </motion.span>
        ))}
      </h1>
      <motion.p className="login-sub" {...rise(0.9)}>
        Dimensionamento de uma rede móvel 4G LTE
      </motion.p>
      <motion.p className="login-place" {...rise(1.05)}>
        <MapPin size={15} aria-hidden />
        <Typewriter text={`${zone.short}, Marracuene · ${formatLatLng(targetOf(zone))}`} delay={1.2} />
      </motion.p>
      <motion.dl className="login-stats" {...rise(1.25)}>
        <div>
          <dt>BTS em {dim.traffic.year}</dt>
          <dd>
            <CountUp value={dim.required} delay={1.4} />
          </dd>
        </div>
        <div>
          <dt>Mbit/s na hora de pico</dt>
          <dd>
            <CountUp value={dim.traffic.demand} delay={1.5} />
          </dd>
        </div>
        <div>
          <dt>km de raio por célula</dt>
          <dd>
            <CountUp value={dim.link.radius} digits={2} delay={1.6} />
          </dd>
        </div>
      </motion.dl>
      <ul className="login-team" aria-label="Equipa">
        {team.map((name, i) => (
          <motion.li key={name} {...rise(1.5 + i * 0.12)}>
            <span className="avatar" aria-hidden>
              {initials(name)}
            </span>
            {name}
          </motion.li>
        ))}
      </ul>
      <motion.button className="login-enter" onClick={onEnter} autoFocus {...rise(1.9)}>
        <span>Entrar</span>
        <ArrowRight size={18} aria-hidden />
      </motion.button>
      <motion.p className="login-hint" {...rise(2.1)}>
        Prima <kbd>Enter</kbd> · a viagem começa no espaço
      </motion.p>
    </motion.section>
  );
}

// Ecrã de entrada: a Terra a rodar no espaço e o cartão do projecto.
export default function Welcome() {
  const { setEntered, setStep } = useProject();
  return (
    <SpaceIntro
      mode="login"
      onDone={() => {
        setStep(0);
        setEntered(true);
      }}
      renderCard={(start) => <LoginCard onEnter={start} />}
    />
  );
}
