"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { ProjectProvider, useProject } from "@/hooks/useProject";
import { steps } from "@/data/steps";
import { Sidebar, StepLayout, TopBar, useMenu } from "./shell/Shell";
import { Callout } from "./ui";
import Cover from "./steps/Cover";
import Scenario from "./steps/Scenario";
import Traffic from "./steps/Traffic";
import ServiceArea from "./steps/ServiceArea";
import Reuse from "./steps/Reuse";
import Sites from "./steps/Sites";
import Coverage from "./steps/Coverage";
import FieldTest from "./steps/FieldTest";
import Antennas from "./steps/Antennas";
import Summary from "./steps/Summary";
import Welcome from "./intro/Welcome";
import SpaceIntro from "./intro/SpaceIntro";

const pages = [Cover, Scenario, Traffic, ServiceArea, Reuse, Sites, Coverage, FieldTest, Antennas, Summary];
const last = steps.length - 1;

// Aviso discreto depois de cada gravação automática.
function SavedToast() {
  const { savedAt, presenting } = useProject();
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!savedAt) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(t);
  }, [savedAt]);
  return (
    <AnimatePresence>
      {visible && !presenting && (
        <motion.div
          className="saved-toast"
          role="status"
          initial={{ y: reduce ? 0 : 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduce ? 0 : 30, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Check size={16} aria-hidden /> Guardado neste navegador
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Modo apresentação: setas do teclado mudam de passo, Esc sai.
function usePresentationKeys() {
  const { presenting, setPresenting, step, setStep } = useProject();
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        setStep(Math.min(last, step + 1));
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setStep(Math.max(0, step - 1));
      } else if (e.key === "Escape") setPresenting(false);
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [presenting, setPresenting, step, setStep]);
}

function PresentBar() {
  const { step, setStep, setPresenting } = useProject();
  const exit = () => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  return (
    <div className="present-bar" role="toolbar" aria-label="Controlo da apresentação">
      <button onClick={() => setStep(Math.max(0, step - 1))} aria-label="Passo anterior" disabled={step <= 0}>
        <ArrowLeft size={16} />
      </button>
      <span>
        {steps[step].short} · {step}/{last}
      </span>
      <button onClick={() => setStep(Math.min(last, step + 1))} aria-label="Passo seguinte" disabled={step >= last}>
        <ArrowRight size={16} />
      </button>
      <button onClick={exit} aria-label="Sair da apresentação">
        <X size={16} />
      </button>
    </div>
  );
}

function Workspace() {
  const { loaded, step, storageError, presenting, entered, spaceTour, setSpaceTour } = useProject();
  const menu = useMenu();
  usePresentationKeys();
  if (!loaded) return <div className="loading">A carregar o projecto…</div>;
  if (!entered) return <Welcome />;
  const Page = pages[step]!;
  return (
    <div className={`app ${presenting ? "presenting" : ""}`}>
      <a className="skip" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <Sidebar open={menu.open} onClose={() => menu.setOpen(false)} />
      {menu.open && <div className="scrim" onClick={() => menu.setOpen(false)} aria-hidden />}
      <div className="main">
        <TopBar onMenu={() => menu.setOpen(true)} />
        <main id="conteudo" className="content">
          {storageError && (
            <Callout tone="warn">
              Não foi possível guardar neste navegador. As alterações perdem-se ao
              fechar a página.
            </Callout>
          )}
          <StepLayout>
            <Page />
          </StepLayout>
        </main>
      </div>
      {presenting && <PresentBar />}
      <SavedToast />
      {spaceTour && <SpaceIntro mode="replay" onDone={() => setSpaceTour(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <Workspace />
    </ProjectProvider>
  );
}
