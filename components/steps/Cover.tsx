"use client";
import { ArrowRight, Presentation, RadioTower } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { OriginBadge } from "@/components/ui";
import { startPresentation } from "@/components/shell/Shell";
import { useCoverage, Zone3D } from "./Coverage";
import { useDriveTest } from "./FieldTest";

export const team = ["Fahima Samsudin", "Muhammad Shahin", "Saudah Salim"];

export default function Cover() {
  const { setStep, params: p, stations, dim, setPresenting } = useProject();
  const cov = useCoverage(50);
  const drive = useDriveTest();
  return (
    <main className="cover">
      <div className="cover-card">
        <div className="cover-brand">
          <RadioTower size={26} aria-hidden /> NexaCell
        </div>
        <p className="kicker">Comunicações Móveis · 6. Projecto de um sistema de CM</p>
        <h1>
          Rede 4G LTE em <span>Marracuene</span>
        </h1>
        <p className="cover-sub">
          Dimensionamento para reforçar a cobertura e a capacidade na zona de
          expansão de Michafutene (corredor da N1), com dados reais do INE, do
          INCM e do OpenStreetMap.
        </p>
        <p className="cover-team">
          <span>Grupo:</span> {team.join(" · ")}
        </p>
        <div className="button-row">
          <button className="btn primary big" onClick={() => setStep(1)} autoFocus>
            Começar <ArrowRight size={18} />
          </button>
          <button
            className="btn big"
            onClick={() => {
              setStep(1);
              startPresentation(setPresenting);
            }}
          >
            <Presentation size={18} aria-hidden /> Apresentar
          </button>
        </div>
        <div className="cover-how">
          <h2>Como usar</h2>
          <ol>
            <li>
              <strong>Siga os passos pela ordem.</strong> O menu segue os pontos
              da docente, de 6.1.1 a 6.2.1.
            </li>
            <li>
              <strong>Escolha o nível de detalhe.</strong> Básico mostra o
              essencial; Avançado mostra todos os parâmetros e as fórmulas.
            </li>
            <li>
              <strong>Veja de onde vem cada número.</strong>{" "}
              <OriginBadge origin="REAL" /> tem fonte,{" "}
              <OriginBadge origin="PRESSUPOSTO" /> é uma escolha nossa,{" "}
              <OriginBadge origin="CALCULADO" /> sai das fórmulas.
            </li>
            <li>
              <strong>Apresentar</strong> abre o ecrã inteiro; as setas do
              teclado mudam de passo.
            </li>
          </ol>
        </div>
      </div>
      <Zone3D
        className="cover-stage"
        cells={cov.cells}
        stations={stations}
        sectors={p.sectors}
        hBeam={p.hBeam}
        radiusKm={dim.link.radius}
        samples={drive.samples}
        intro
        showExport={false}
        label="Vista 3D da zona de Michafutene com as BTS e o sinal previsto"
      />
    </main>
  );
}
