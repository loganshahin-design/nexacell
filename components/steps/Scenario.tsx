"use client";
import dynamic from "next/dynamic";
import { useProject } from "@/hooks/useProject";
import { sources } from "@/data/sources";
import { POP_FACTOR_2020, POP_GROWTH_2025, calibrate, zoneList } from "@/data/zones";
import { polygonArea, routeLength } from "@/calculations/geo";
import { Calc, Callout, OriginBadge, Panel, Stat } from "@/components/ui";
import Equation, { mathNumber as n } from "@/components/Equation";
import { fmt } from "@/utils/format";

export const ZoneMap = dynamic(() => import("@/components/ZoneMap"), {
  ssr: false,
  loading: () => <div className="map skeleton">A carregar o mapa…</div>,
});

// INE: 305 216 hab. (2025) em 734 km².
const districtDensity = 305216 / 734;

const commonKeys = [
  "ineDistrict",
  "ineProjection",
  "incmPenetration",
  "incmShare",
  "incmThresholds",
  "incmMarracuene",
  "incm2024",
  "tmcel4g",
  "ericsson",
  "osmDistrict",
];

// Escolha da zona de estudo: Michafutene (o projecto) ou uma zona de comparação.
function ZoneChooser() {
  const { zone, setZone } = useProject();
  return (
    <Panel title="Zona de estudo">
      <div className="choice-row" role="radiogroup" aria-label="Zona de estudo">
        {zoneList.map((z) => {
          const area = polygonArea(z.polygon);
          return (
            <button
              key={z.id}
              role="radio"
              aria-checked={zone.id === z.id}
              className={`choice ${zone.id === z.id ? "on" : ""}`}
              onClick={() => zone.id !== z.id && setZone(z.id)}
            >
              <strong>{z.short}</strong>
              <small>
                {z.kind} · {fmt(area, 1)} km² · {fmt(calibrate(z.worldpop2020))} hab.
              </small>
            </button>
          );
        })}
      </div>
      <p className="field-help">
        Ao mudar de zona, a população e o ambiente (Hata) passam a ser os da nova
        zona e as BTS são recolocadas automaticamente. Os outros parâmetros não
        mudam. "Repor valores de origem" (Relatórios) volta a Michafutene.
      </p>
    </Panel>
  );
}

export default function Scenario() {
  const { params, zone, zoneArea } = useProject();
  const density = params.population / zoneArea;
  const ctx = { density, districtDensity, year: params.baseYear + params.horizon };
  const realKeys = [...commonKeys.slice(0, 2), zone.sources.worldpop, ...commonKeys.slice(2), zone.sources.landmark, zone.sources.route];
  const pop2020 = zone.worldpop2020 * POP_FACTOR_2020;
  return (
    <>
      <ZoneChooser />
      <div className="grid-2">
        <div className="stack">
          <Panel title="A zona escolhida">
            <p className="zone-name">{zone.name}</p>
            <p className="muted">{zone.district}</p>
            <div className="stats">
              <Stat label="Área" value={fmt(zoneArea, 2)} unit="km²" />
              <Stat label="População 2025" value={fmt(params.population)} unit="hab." />
              <Stat label="Densidade" value={fmt(density)} unit="hab./km²" note={`média do distrito: ${fmt(districtDensity)}`} />
              <Stat label="N1 dentro da zona" value={fmt(routeLength(zone.route), 1)} unit="km" />
            </div>
          </Panel>
          <Panel title="Porquê esta zona">
            <ul className="reasons">
              {zone.reasons.map((r) => (
                <li key={r.title}>
                  <strong>{r.title}</strong> {r.text(ctx)}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Mapa da zona" aside={<OriginBadge origin="REAL" source="osmDistrict" />}>
          <ZoneMap showRoute showLandmark tall label={`Mapa da zona de estudo em ${zone.short}`} />
          <p className="caption">
            Tracejado azul: zona de estudo (dentro da fronteira real do distrito).
            Linha escura: N1. Fonte: OpenStreetMap.
          </p>
        </Panel>
      </div>

      <Callout title={zone.context.title}>{zone.context.text}</Callout>

      <Panel title="Objectivo do projecto">
        <p className="objective">
          Dimensionar a rede 4G LTE de um operador para servir a procura prevista
          em <strong>{params.baseYear + params.horizon}</strong> na zona de{" "}
          {zone.short}, cumprindo a meta do INCM:{" "}
          <strong>RSRP ≥ −105 dBm em {params.coverageTarget} % da área</strong>.
        </p>
      </Panel>

      <Panel title="Dados e fontes de referência">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Dado</th>
                <th>Valor</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {realKeys.map((k) => {
                const s = sources[k];
                return (
                  <tr key={k}>
                    <td>{s.label}</td>
                    <td>{s.value}</td>
                    <td>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.source}
                      </a>
                      <small> · {s.date}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Calc title="Como foi estimada a população da zona">
        <p>
          O INE não publica população por localidade. Usámos a grelha do WorldPop
          (100 m) somada dentro do polígono. A soma para o distrito inteiro dá
          286 324 habitantes em 2020, mas o INE projecta 254 139, por isso
          corrigimos pelo factor 0,888. Depois aplicámos o crescimento do INE até
          2025.
        </p>
        <Equation
          formula={String.raw`P_{2025} = P_{\mathrm{WorldPop}} \times \frac{P_{\mathrm{INE},2020}}{P_{\mathrm{WorldPop,distrito}}} \times \frac{P_{\mathrm{INE},2025}}{P_{\mathrm{INE},2020}}`}
          substitution={String.raw`P_{2025} = ${n(zone.worldpop2020, 0)} \times \frac{254\,139}{286\,324} \times \frac{305\,216}{254\,139} = ${n(pop2020, 0)} \times ${n(POP_GROWTH_2025, 3)}`}
          result={`${fmt(calibrate(zone.worldpop2020))} habitantes`}
          note="Estimativa calculada a partir de dados do WorldPop e de projecções do INE; não corresponde a uma contagem directa."
        />
      </Calc>
    </>
  );
}
