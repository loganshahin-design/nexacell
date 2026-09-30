"use client";
import { ArrowRight, RadioTower } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { OriginBadge } from "@/components/ui";

export const team = ["Fahima Samsudin", "Muhammad Shahin", "Saudah Salim"];

export default function Cover() {
  const { setStep } = useProject();
  return (
    <main className="cover">
      <div className="cover-card">
        <div className="cover-brand">
          <RadioTower size={26} aria-hidden /> NexaCell
        </div>
        <p className="kicker">Comunicações Móveis · 6. Projecto de um sistema de CM</p>
        <h1>Dimensionamento de uma rede móvel 4G LTE em Marracuene</h1>
        <p className="cover-sub">
          Reforço da cobertura e da capacidade na zona de expansão de
          Michafutene (corredor da N1), com dados reais do INE, do INCM e do
          OpenStreetMap.
        </p>
        <p className="cover-team">
          <span>Grupo:</span> {team.join(" · ")}
        </p>
        <button className="btn primary big" onClick={() => setStep(1)} autoFocus>
          Começar <ArrowRight size={18} />
        </button>
        <div className="cover-how">
          <h2>Como usar</h2>
          <ol>
            <li>
              <strong>Siga os passos pela ordem.</strong> O menu segue os pontos
              da docente, de 6.1.1 a 6.2.1. Cada passo tem entradas, um resultado
              e uma frase a explicar o que ele significa.
            </li>
            <li>
              <strong>Escolha o nível de detalhe.</strong> O modo Básico mostra o
              essencial. O Avançado mostra todos os parâmetros e as fórmulas com
              os valores substituídos.
            </li>
            <li>
              <strong>Veja de onde vem cada número.</strong>{" "}
              <OriginBadge origin="REAL" /> tem fonte (clique para abrir),{" "}
              <OriginBadge origin="PRESSUPOSTO" /> é uma escolha nossa
              justificada, <OriginBadge origin="CALCULADO" /> sai das fórmulas.
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
