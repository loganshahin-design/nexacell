"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, MapPin, RadioTower, BarChart3, Earth } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { Callout, Panel, Stat } from "@/components/ui";
import { useCoverage, Zone3D } from "./Coverage";
import { useDriveTest } from "./FieldTest";
import { fmt } from "@/utils/format";

export const team = ["Fahima Samsudin", "Muhammad Shahin", "Saudah Salim"];

export default function Cover() {
  const { setStep, params: p, stations, dim, spaceTour, setSpaceTour } = useProject();
  const cov = useCoverage();
  const drive = useDriveTest();
  const reduce = useReducedMotion();
  // Depois do voo do espaço, a cena 3D recomeça o seu voo de abertura.
  const [sceneKey, setSceneKey] = useState(0);
  const wasTouring = useRef(false);
  useEffect(() => {
    if (wasTouring.current && !spaceTour) setSceneKey((k) => k + 1);
    wasTouring.current = spaceTour;
  }, [spaceTour]);
  const active = stations.filter((s) => s.enabled).length;
  const covered = cov.designCoverage >= p.coverageTarget;
  const enough = active >= dim.required;
  return (
    <>
      <div className="overview-intro">
        <div>
          <p className="kicker">Michafutene · Marracuene</p>
          <h2>Planeie hoje a rede de {dim.traffic.year}.</h2>
          <p className="lead">Explore a procura, ajuste as estações e veja como o sinal chega à zona. Os resultados acompanham as suas alterações.</p>
        </div>
        <button className="btn primary" onClick={() => setStep(1)}>Conhecer a zona <ArrowRight size={17} /></button>
      </div>
      <div className="stats overview-stats">
        <Stat label="Estações necessárias" value={dim.required} note="BTS: estações que fornecem sinal à zona" />
        <Stat label="Estações activas" value={active} note={`${stations.length} colocadas no mapa`} />
        <Stat label="Cobertura prevista" value={cov.designCoverage} digits={1} unit="%" note={`Meta: ${fmt(p.coverageTarget)} % da área`} />
        <Stat label="Procura na hora de pico" value={dim.traffic.demand} digits={0} unit="Mbit/s" note={`Tráfego previsto para ${dim.traffic.year}`} />
      </div>
      <div className="grid-2 overview-grid">
        <div className="stack">
          <Callout tone={covered && enough ? "ok" : "warn"} title={covered && enough ? "Cobertura e número de estações dentro das metas" : "Há ajustes a fazer na rede"}>
            <p>{covered ? "A cobertura prevista atinge a meta definida." : "Existem zonas onde o sinal previsto fica abaixo da meta."} {enough ? "O número de estações activas atinge o dimensionamento calculado." : `São necessárias mais ${dim.required - active} estações activas para atingir o dimensionamento calculado.`}</p>
            <button className="btn ghost" onClick={() => setStep(covered && enough ? 6 : 5)}>{covered && enough ? "Explorar cobertura" : "Ajustar estações"} <ArrowRight size={16} /></button>
          </Callout>
          <Panel title="Por onde começar">
            <p className="muted">Siga este percurso ou abra qualquer secção no menu.</p>
            <div className="overview-actions">
              {[
                { step: 2, icon: BarChart3, title: "Definir a procura", text: "Ajuste a população, o consumo e o horizonte do projecto." },
                { step: 5, icon: RadioTower, title: "Planear as estações", text: "Veja onde colocar as BTS e ajuste a sua distribuição." },
                { step: 6, icon: MapPin, title: "Verificar a cobertura", text: "Explore o mapa e descubra onde melhorar o sinal." },
              ].map(({ step, icon: Icon, title, text }) => (
                <button className="overview-action" key={step} onClick={() => setStep(step)}>
                  <Icon size={21} aria-hidden /><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={17} aria-hidden />
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <Panel
          title="A rede em perspectiva"
          aside={
            <div className="panel-aside">
              {!reduce && (
                <button className="btn ghost small" onClick={() => setSpaceTour(true)} disabled={spaceTour}>
                  <Earth size={15} aria-hidden /> Repetir voo do espaço
                </button>
              )}
              <span className="badge calculado">Simulação</span>
            </div>
          }
        >
          <Zone3D key={sceneKey} className="overview-stage" cells={cov.cells} stations={stations} sectors={p.sectors} hBeam={p.hBeam} radiusKm={dim.link.radius} samples={drive.samples} intro showExport={false} label="Vista 3D da zona de Michafutene com as BTS e o sinal previsto" />
          <p className="caption">Arraste para explorar a cena. As cores representam o sinal previsto; as torres representam as estações do projecto.</p>
        </Panel>
      </div>
      <Panel title="Como interpretar os resultados">
        <p>Os dados de referência têm fontes consultáveis. Os pressupostos são parâmetros que pode ajustar e os resultados são estimativas do modelo. Use <strong>Essencial</strong> para começar e <strong>Detalhado</strong> para consultar mais parâmetros e fórmulas.</p>
        <button className="btn ghost" onClick={() => setStep(9)}>Comparar cenários e abrir relatórios <ArrowRight size={16} /></button>
      </Panel>
    </>
  );
}
