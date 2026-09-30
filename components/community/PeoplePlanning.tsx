"use client";
import Equation from "../Equation";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  HeartHandshake,
  Users,
  MapPin,
  ArrowRight,
  Save,
  Plus,
  Scale,
  Wallet,
  School,
  Store,
  Route,
  House,
} from "lucide-react";
import { BTS, Params, FieldPoint } from "@/types";
import { CommunityPlan } from "@/types/community";
import { communityResults, suggestSite } from "@/calculations/community";
import { fmt } from "@/utils/format";
const NetworkMap = dynamic(() => import("../NetworkMap"), {
  ssr: false,
  loading: () => (
    <div className="map-shell large skeleton">
      A carregar o mapa da comunidade…
    </div>
  ),
});
type Props = {
  params: Params;
  stations: BTS[];
  points: FieldPoint[];
  plan: CommunityPlan;
  setPlan: React.Dispatch<React.SetStateAction<CommunityPlan>>;
  setStations: React.Dispatch<React.SetStateAction<BTS[]>>;
  onSelect: (id: string) => void;
  onAdd: (lat: number, lng: number) => void;
};
export default function PeoplePlanning({
  params,
  stations,
  points,
  plan,
  setPlan,
  setStations,
  onSelect,
  onAdd,
}: Props) {
  const result = useMemo(
    () => communityResults(params, stations, plan),
    [params, stations, plan],
  );
  const baseline = useMemo(
    () =>
      plan.baseline ? communityResults(params, plan.baseline, plan) : null,
    [params, plan],
  );
  const [message, setMessage] = useState("");
  const [proposal, setProposal] = useState<
    (ReturnType<typeof suggestSite> & { signature: string }) | null
  >(null);
  const signature = JSON.stringify({ params, stations, plan });
  const fresh = proposal?.signature === signature;
  const icons = [House, School, Store, Route];
  const money = (value: number) => `${fmt(value)} MZN`;
  const patch = (
    key:
      "splitX" | "splitY" | "budget" | "siteCost" | "sectorCost" | "annualCost",
    value: number,
  ) =>
    setPlan((previous) => ({
      ...previous,
      [key]: Math.max(
        key.startsWith("split") ? 15 : 0,
        Math.min(key.startsWith("split") ? 85 : 1e10, value),
      ),
    }));
  return (
    <>
      <section className="people-hero">
        <div>
          <span className="hero-pill">
            <HeartHandshake size={14} /> PLANEAMENTO COMUNITÁRIO
          </span>
          <h2>
            Cobertura e prioridades
            <br />
            <em>por zona de estudo.</em>
          </h2>
          <p>Distribuição de utilizadores, orçamento e localização das BTS.</p>
        </div>
        <div className="people-hero-stat">
          <Users size={28} />
          <strong>{fmt(result.served)}</strong>
          <span>utilizadores potencialmente cobertos</span>
          <small>Estimativa ponderada por zona</small>
        </div>
      </section>
      <div className="people-metrics">
        {[
          [
            Users,
            "Pessoas por ligar",
            fmt(result.unserved),
            "Utilizadores fora dos círculos",
          ],
          [
            Scale,
            "Diferença entre zonas",
            `${fmt(result.gap, 1)} p.p.`,
            "Maior cobertura − menor cobertura",
          ],
          [
            Wallet,
            "Saldo do primeiro ano",
            money(result.remaining),
            result.remaining < 0
              ? "Orçamento ultrapassado"
              : "Custos académicos assumidos",
          ],
        ].map(([Icon, label, value, note]) => {
          const I = Icon as typeof Users;
          return (
            <div className="panel" key={String(label)}>
              <I size={18} />
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
              <small>{String(note)}</small>
            </div>
          );
        })}
      </div>
      <div className="notice">
        Simulação · Zonas conceptuais · Cobertura geométrica
      </div>
      <div className="people-map-layout">
        <section className="panel">
          <div className="panel-heading">
            <h3>O território e as pessoas</h3>
            <span className="subtle-tag">ZONAS EDITÁVEIS</span>
          </div>
          <NetworkMap
            stations={stations}
            points={points}
            area={params.area}
            zones={result.zones}
            onSelect={onSelect}
            onAdd={onAdd}
            onMove={(id, lat, lng) =>
              setStations((prev) =>
                prev.map((b) => (b.id === id ? { ...b, lat, lng } : b)),
              )
            }
            large
          />
          <div className="zone-legend">
            {result.zones.map((z) => (
              <span key={z.id}>
                <i style={{ background: z.color }} />
                {z.name}
              </span>
            ))}
          </div>
          <div className="form-grid people-splits">
            <label className="field">
              Divisão oeste / este · {plan.splitX}%
              <input
                aria-label="Divisão oeste este"
                type="range"
                min={15}
                max={85}
                value={plan.splitX}
                onChange={(e) => patch("splitX", +e.target.value)}
              />
            </label>
            <label className="field">
              Divisão sul / norte · {plan.splitY}%
              <input
                aria-label="Divisão sul norte"
                type="range"
                min={15}
                max={85}
                value={plan.splitY}
                onChange={(e) => patch("splitY", +e.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="panel priority-panel">
          <span className="eyebrow">ONDE COMEÇAR?</span>
          <HeartHandshake size={32} />
          <h3>
            {result.priority.need > 0
              ? result.priority.name
              : "Todas as zonas cobertas"}
          </h3>
          <p>
            {result.priority.need > 0
              ? `${fmt(result.priority.unserved)} utilizadores fora da cobertura geométrica, com prioridade ${result.priority.priority}/5.`
              : "Não existem utilizadores fora dos círculos nesta amostragem."}
          </p>
          <Equation
            formula={String.raw`I_z=U_{z,\mathrm{nc}}\,p_z`}
            result={fmt(result.priority.need)}
            note="Iz: índice de prioridade; Uz,nc: utilizadores não cobertos; pz: prioridade da zona."
          />
          <button
            className="button primary full"
            onClick={() => {
              const suggestion = suggestSite(params, stations, plan);
              setProposal({ ...suggestion, signature });
              setMessage(suggestion.reason);
            }}
          >
            <MapPin size={15} />
            Sugerir nova BTS
          </button>
          {message && (
            <p role="status" className="muted">
              {message}
            </p>
          )}
          {proposal?.station && fresh && (
            <div className="proposal">
              <b>+{fmt(proposal.gain)} utilizadores cobertos</b>
              <small>
                {proposal.station.lat.toFixed(5)},{" "}
                {proposal.station.lng.toFixed(5)}
              </small>
              <button
                className="button secondary full"
                onClick={() => {
                  if (!fresh || !proposal.station) return;
                  setStations((prev) => [
                    ...prev,
                    {
                      ...proposal.station!,
                      id: `BTS-${String(Math.max(0, ...prev.map((b) => Number(b.id.split("-")[1]) || 0)) + 1).padStart(2, "0")}`,
                    },
                  ]);
                  setMessage(
                    "BTS adicionada. Os resultados e o orçamento foram recalculados.",
                  );
                  setProposal(null);
                }}
              >
                <Plus size={15} />
                Aplicar proposta
              </button>
            </div>
          )}
          {proposal && !fresh && (
            <p className="muted">
              As entradas mudaram. Gere uma nova proposta.
            </p>
          )}
        </section>
      </div>
      <div className="panel-heading">
        <h3>Quatro zonas. Necessidades diferentes.</h3>
        <span className="subtle-tag">HIPÓTESES DO PROJECTO</span>
      </div>
      <div className="zone-cards">
        {result.zones.map((z, index) => {
          const Icon = icons[index];
          return (
            <section
              className="panel zone-card"
              key={z.id}
              style={{ borderTopColor: z.color }}
            >
              <div className="zone-card-heading">
                <span style={{ color: z.color }}>
                  <Icon size={23} />
                </span>
                <span className="subtle-tag">ZONA {index + 1}</span>
                <strong style={{ color: z.color }}>
                  {fmt(z.coverage, 1)}%
                </strong>
              </div>
              <label className="field">
                Nome da zona
                <input
                  aria-label={`Nome da zona ${index + 1}`}
                  maxLength={55}
                  value={z.name}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      zones: plan.zones.map((v, k) =>
                        k === index ? { ...v, name: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  Uso principal
                  <select
                    value={z.kind}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        zones: plan.zones.map((v, k) =>
                          k === index ? { ...v, kind: e.target.value } : v,
                        ),
                      })
                    }
                  >
                    {[
                      "Residencial",
                      "Educação",
                      "Comércio",
                      "Mobilidade",
                      "Saúde",
                    ].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Peso populacional
                  <input
                    aria-label={`Peso populacional zona ${index + 1}`}
                    type="number"
                    min={1}
                    max={1000}
                    value={z.weight}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        zones: plan.zones.map((v, k) =>
                          k === index
                            ? {
                                ...v,
                                weight: Math.max(
                                  1,
                                  Math.min(1000, +e.target.value),
                                ),
                              }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <label className="field">
                Prioridade social · {z.priority}/5
                <input
                  aria-label={`Prioridade zona ${index + 1}`}
                  type="range"
                  min={1}
                  max={5}
                  value={z.priority}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      zones: plan.zones.map((v, k) =>
                        k === index ? { ...v, priority: +e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <div className="zone-stat">
                <span>Utilizadores atribuídos</span>
                <b>{fmt(z.users)}</b>
              </div>
              <div className="zone-stat">
                <span>Por cobrir</span>
                <b>{fmt(z.unserved)}</b>
              </div>
              <div className="zone-stat">
                <span>Procura assumida</span>
                <b>{fmt(z.demand, 1)} Mbps</b>
              </div>
              <div className="progress-track">
                <span
                  style={{ width: `${z.coverage}%`, background: z.color }}
                />
              </div>
            </section>
          );
        })}
      </div>
      <Equation
        formula={String.raw`U_z=U\frac{w_z}{\sum_k w_k}`}
        note="U: total de utilizadores; wz: peso da zona; soma dos pesos de todas as zonas no denominador."
      />
      <div className="two-columns community-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h3>Um orçamento, escolhas conscientes</h3>
            <Wallet size={17} />
          </div>
          <div className="form-grid">
            {(
              [
                ["budget", "Orçamento total"],
                ["siteCost", "Instalação por BTS"],
                ["sectorCost", "Custo por sector"],
                ["annualCost", "Operação anual por BTS"],
              ] as const
            ).map(([key, label]) => (
              <label className="field" key={key}>
                {label} (MZN)
                <input
                  aria-label={label}
                  type="number"
                  min={0}
                  max={1e10}
                  step={10000}
                  value={plan[key]}
                  onChange={(e) => patch(key, +e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="parameter-list">
            <div>
              <span>Investimento inicial</span>
              <b>{money(result.capex)}</b>
            </div>
            <div>
              <span>Operação de um ano</span>
              <b>{money(result.annual)}</b>
            </div>
            <div>
              <span>Total do primeiro ano</span>
              <b>{money(result.firstYear)}</b>
            </div>
          </div>
          <div className="budget-meter">
            <span
              style={{
                width: `${plan.budget ? Math.min(100, (result.firstYear / plan.budget) * 100) : 100}%`,
                background: result.remaining < 0 ? "#fb7185" : "#22d3ee",
              }}
            />
          </div>
          <p className="muted">
            Valores fictícios e editáveis, sem cotações de fornecedores. Inclui
            todas as BTS instaladas, mesmo inactivas. Sem impostos, terrenos ou
            financiamento.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>Antes e depois da sua decisão</h3>
            <Scale size={17} />
          </div>
          <button
            className="button secondary"
            onClick={() => {
              setPlan({ ...plan, baseline: stations.map((b) => ({ ...b })) });
              setMessage("Referência guardada para comparação.");
            }}
          >
            <Save size={15} />
            {baseline
              ? "Substituir referência"
              : "Guardar cenário de referência"}
          </button>
          {baseline ? (
            <>
              <div className="comparison-table">
                <div>
                  <span>Indicador</span>
                  <b>Referência</b>
                  <b>Actual</b>
                </div>
                {[
                  [
                    "Cobertura de utilizadores",
                    `${fmt(baseline.weightedCoverage, 1)}%`,
                    `${fmt(result.weightedCoverage, 1)}%`,
                  ],
                  [
                    "Pessoas por ligar",
                    fmt(baseline.unserved),
                    fmt(result.unserved),
                  ],
                  [
                    "Diferença entre zonas",
                    `${fmt(baseline.gap, 1)} p.p.`,
                    `${fmt(result.gap, 1)} p.p.`,
                  ],
                  [
                    "Custo no primeiro ano",
                    money(baseline.firstYear),
                    money(result.firstYear),
                  ],
                ].map(([label, a, b]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <b>{a}</b>
                    <b>{b}</b>
                  </div>
                ))}
              </div>
              <p className="muted">
                Comparação das configurações BTS sob a mesma população, zonas e
                preços actuais. A referência guarda posições e parâmetros das
                BTS, não um histórico de custos.
              </p>
            </>
          ) : (
            <div className="empty-state">
              <Scale size={28} />
              <p>
                Guarde a rede actual, faça uma alteração e veja quem beneficia.
              </p>
            </div>
          )}
        </section>
      </div>
      <details className="panel methodology">
        <summary>Como são calculados os resultados?</summary>
        <p>
          São amostrados 400 pontos em cada zona. A fracção dentro do raio de
          pelo menos uma BTS activa estima a cobertura. Os pesos redistribuem a
          população global. A diferença entre zonas é a amplitude das coberturas
          em pontos percentuais, não um índice social validado.
        </p>
        <p>
          A sugestão testa 36 posições e escolhe o maior ganho de utilizadores
          cobertos ponderado pela prioridade. Só permite a proposta se houver
          orçamento para instalação, três sectores e um ano de operação. Não
          considera capacidade por sector, interferência, acesso ao terreno ou
          viabilidade RF; é uma heurística académica.
        </p>
      </details>
    </>
  );
}
export function CommunityReport({
  params,
  stations,
  plan,
}: {
  params: Params;
  stations: BTS[];
  plan: CommunityPlan;
}) {
  const r = communityResults(params, stations, plan);
  return (
    <>
      <h4>Rede para as pessoas</h4>
      <p>
        Distribuição populacional por pesos de zona: {fmt(r.served)}{" "}
        utilizadores potencialmente cobertos e {fmt(r.unserved)} por cobrir.
        Cobertura ponderada: {fmt(r.weightedCoverage, 1)}%. Diferença entre a
        maior e menor cobertura: {fmt(r.gap, 1)} pontos percentuais. Estes
        resultados usam população não uniforme entre zonas, ao contrário do
        modelo global anterior.
      </p>
      <table>
        <thead>
          <tr>
            <th>Zona conceptual</th>
            <th>Utilizadores</th>
            <th>Cobertura</th>
            <th>Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {r.zones.map((z) => (
            <tr key={z.id}>
              <td>{z.name}</td>
              <td>{fmt(z.users)}</td>
              <td>{fmt(z.coverage, 1)}%</td>
              <td>{z.priority}/5</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Orçamento fictício: {fmt(plan.budget)} MZN. Custo estimado do primeiro
        ano: {fmt(r.firstYear)} MZN. Saldo: {fmt(r.remaining)} MZN. Geometria
        amostrada em 400 pontos por zona; limites conceptuais sem levantamento
        geográfico. Custos são hipóteses académicas, não cotações reais.
      </p>
    </>
  );
}
