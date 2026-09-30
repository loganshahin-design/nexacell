"use client";
import { useState } from "react";
import { Download, Printer, RotateCcw } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { zone } from "@/data/zone";
import Report, { useConclusions } from "@/components/Report";
import { Callout, Hero, Panel, Stat } from "@/components/ui";
import { DecisionCard } from "./ServiceArea";
import { fmt } from "@/utils/format";

export default function Summary() {
  const { params: p, dim, stations, resetAll } = useProject();
  const { list, cov, dt } = useConclusions();
  const [confirm, setConfirm] = useState(false);
  const ok = cov.designCoverage >= p.coverageTarget;
  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ zone, params: p, stations, result: { required: dim.required, radius: dim.link.radius, demand: dim.traffic.demand, coverage: cov.designCoverage } }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexacell-marracuene.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="no-print stack">
        <div className="grid-2">
          <div className="stack">
            <DecisionCard />
            <div className="stats">
              <Stat label="Procura em pico" value={fmt(dim.traffic.demand)} unit="Mbit/s" note={String(dim.traffic.year)} />
              <Stat label="Raio da célula" value={fmt(dim.link.radius, 2)} unit="km" />
              <Stat label="Cobertura (projecto)" value={fmt(cov.designCoverage, 1)} unit="%" note={`meta ${fmt(p.coverageTarget)} %`} />
              <Stat label="Teste na N1" value={fmt(dt.meets, 1)} unit="%" note="≥ −105 dBm (previsto)" />
            </div>
            {!ok && (
              <Callout tone="warn">
                A cobertura ainda não cumpre a meta. Ajuste as BTS em 6.1.4 antes de
                imprimir o relatório.
              </Callout>
            )}
          </div>
          <div className="stack">
            <Hero label="Conclusões" value={`${dim.required} BTS`} unit={`em ${dim.traffic.year}`} tone={ok ? "ok" : "warn"} />
            <Panel>
              <ol className="conclusions">
                {list.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
        <Panel title="Relatório e ficheiros">
          <p>
            O relatório abaixo segue a numeração da docente (6 → 6.2.1) e usa
            sempre os valores actuais. Use “Imprimir” e escolha “Guardar como PDF”.
          </p>
          <div className="button-row">
            <button className="btn primary" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir / guardar PDF
            </button>
            <button className="btn" onClick={exportJson}>
              <Download size={16} /> Exportar dados (JSON)
            </button>
            {confirm ? (
              <>
                <button className="btn danger" onClick={() => { resetAll(); setConfirm(false); }}>
                  Confirmar: repor tudo
                </button>
                <button className="btn ghost" onClick={() => setConfirm(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button className="btn ghost" onClick={() => setConfirm(true)}>
                <RotateCcw size={16} /> Repor valores de origem
              </button>
            )}
          </div>
        </Panel>
        <h2 className="section-title">Pré-visualização do relatório</h2>
      </div>
      <Report />
    </>
  );
}
