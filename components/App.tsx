"use client";
import { ProjectProvider, useProject } from "@/hooks/useProject";
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

const pages = [null, Scenario, Traffic, ServiceArea, Reuse, Sites, Coverage, FieldTest, Antennas, Summary];

function Workspace() {
  const { loaded, step, storageError } = useProject();
  const menu = useMenu();
  if (!loaded) return <div className="loading">A carregar o projecto…</div>;
  if (step === 0) return <Cover />;
  const Page = pages[step]!;
  return (
    <div className="app">
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
