"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard, MapPin, BarChart3, SlidersHorizontal, Waves, MapPinned, Map, Route, Antenna, FileText,
  Menu,
  Moon,
  Presentation,
  RadioTower,
  Sun,
  X,
} from "lucide-react";
import { steps } from "@/data/steps";
import { useProject } from "@/hooks/useProject";
import { Segmented } from "@/components/ui";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { StepTransition } from "@/components/motion/StepTransition";
import { fmt } from "@/utils/format";

const navIcons = [LayoutDashboard, MapPin, BarChart3, SlidersHorizontal, Waves, MapPinned, Map, Route, Antenna, FileText];

function Decision() {
  const { dim } = useProject();
  return (
    <div className="decision" aria-live="polite">
      <span className="decision-label">Estações necessárias</span>
      <strong>
        <AnimatedNumber value={dim.required} /> BTS
      </strong>
      <span>
        capacidade {dim.byCapacity} · cobertura {dim.byCoverage}
      </span>
      <span className="decision-limit">
        Limita:{" "}
        {dim.limiting === "ambos" ? "os dois critérios" : `a ${dim.limiting}`}
      </span>
      <span>
        Raio {fmt(dim.link.radius, 2)} km · {dim.traffic.year}
      </span>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { step, setStep } = useProject();
  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Navegação do projecto">
      <div className="brand">
        <RadioTower size={22} aria-hidden />
        <div>
          <strong>NexaCell</strong>
          <span>Dimensionamento LTE · Marracuene</span>
        </div>
        <button className="icon-btn only-mobile" onClick={onClose} aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>
      <nav>
        <ol className="steps">
          {steps.map((s, i) => {
            const Icon = navIcons[i];
            return (
              <li key={s.title}>
                {(i === 0 || s.group !== steps[i - 1].group) && <p className="nav-group">{s.group}</p>}
                <button
                  className={`step-link ${i === step ? "active" : ""}`}
                  aria-current={i === step ? "page" : undefined}
                  onClick={() => {
                    setStep(i);
                    onClose();
                  }}
                >
                  <span className="step-num" aria-hidden>
                    <Icon size={17} />
                  </span>
                  <span className="step-text">
                    
                    {s.short}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <Decision />
    </aside>
  );
}

export function startPresentation(setPresenting: (v: boolean) => void) {
  setPresenting(true);
  document.documentElement.requestFullscreen?.().catch(() => {});
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { step, mode, setMode, theme, setTheme, setPresenting } = useProject();
  const s = steps[step];
  return (
    <header className="topbar">
      <button className="icon-btn only-mobile" onClick={onMenu} aria-label="Abrir navegação">
        <Menu size={20} />
      </button>
      <div className="topbar-step">
        <span>{s.group}</span>
        <strong>{s.short}</strong>
      </div>
      <div className="topbar-tools">
        <Segmented
          label="Nível de detalhe"
          value={mode}
          options={[
            ["basico", "Essencial"],
            ["avancado", "Detalhado"],
          ]}
          onChange={(v) => setMode(v as typeof mode)}
        />
        <button
          className="btn ghost present-btn"
          onClick={() => startPresentation(setPresenting)}
          title="Modo apresentação: ecrã inteiro, setas do teclado para mudar de passo"
        >
          <Presentation size={17} aria-hidden />
          <span className="hide-small">Apresentar</span>
        </button>
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Modo escuro" : "Modo claro"}
          title={theme === "light" ? "Modo escuro" : "Modo claro"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}

// Conteúdo de um passo: ao montar, volta ao topo e põe o foco no título.
function StepContent({ children }: { children: React.ReactNode }) {
  const { step, setStep } = useProject();
  const s = steps[step];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, []);
  const prev = steps[step - 1],
    next = steps[step + 1];
  return (
    <article className="step">
      <header className="step-head">
        <span className="kicker">{s.group}</span>
        <h1 tabIndex={-1} ref={heading}>
          {s.title}
        </h1>
        <p className="lead">{s.lead}</p>
      </header>
      <div className="step-body">{children}</div>
      <footer className="step-nav">
        {prev && step > 0 ? (
          <button className="btn ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> 
            {prev.short}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="btn primary" onClick={() => setStep(step + 1)}>
            Próximo:{" "}
            {next.short} <ArrowRight size={16} />
          </button>
        )}
      </footer>
    </article>
  );
}

export function StepLayout({ children }: { children: React.ReactNode }) {
  const { step } = useProject();
  return (
    <StepTransition step={step}>
      <StepContent>{children}</StepContent>
    </StepTransition>
  );
}

export function useMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  return { open, setOpen };
}
