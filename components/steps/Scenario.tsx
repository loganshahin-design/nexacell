"use client";
import dynamic from "next/dynamic";
import { useProject, zoneArea } from "@/hooks/useProject";
import { zone } from "@/data/zone";
import { sources } from "@/data/sources";
import { zonePopulation2020, zonePopulation2025 } from "@/data/defaults";
import { routeLength } from "@/calculations/geo";
import { Calc, Callout, OriginBadge, Panel, Stat } from "@/components/ui";
import Equation, { mathNumber as n } from "@/components/Equation";
import { fmt } from "@/utils/format";

export const ZoneMap = dynamic(() => import("@/components/ZoneMap"), {
  ssr: false,
  loading: () => <div className="map skeleton">A carregar o mapa…</div>,
});

// INE: 305 216 hab. (2025) em 734 km².
const districtDensity = 305216 / 734;

const realKeys = [
  "ineDistrict",
  "ineProjection",
  "worldpopZone",
  "incmPenetration",
  "incmShare",
  "incmThresholds",
  "incmMarracuene",
  "incm2024",
  "tmcel4g",
  "ericsson",
  "osmDistrict",
  "osmMichafutene",
  "osmN1",
];

export default function Scenario() {
  const { params } = useProject();
  const density = params.population / zoneArea;
  return (
    <>
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
              <li>
                <strong>Cresce muito depressa.</strong> O distrito passou de 254 139
                habitantes em 2020 para 305 216 em 2025 (+3,7 % ao ano, INE).
              </li>
              <li>
                <strong>É a parte mais densa do distrito.</strong> Encostada à
                cidade de Maputo e atravessada pela N1, tem cerca de{" "}
                {fmt(density)} hab./km², cerca de {fmt(density / districtDensity)}{" "}
                vezes a média do distrito ({fmt(districtDensity)} hab./km² em 2025).
              </li>
              <li>
                <strong>O 4G já existe, mas a procura vai duplicar.</strong> O
                desafio não é levar rede a quem não tem: é garantir capacidade e
                cobertura para a população e o consumo de dados de{" "}
                {params.baseYear + params.horizon}.
              </li>
            </ul>
          </Panel>
        </div>
        <Panel title="Mapa da zona" aside={<OriginBadge origin="REAL" source="osmDistrict" />}>
          <ZoneMap showRoute showLandmark tall label="Mapa da zona de estudo em Michafutene" />
          <p className="caption">
            Tracejado azul: zona de estudo (recortada pela fronteira real do
            distrito). Linha escura: N1. Fonte: OpenStreetMap.
          </p>
        </Panel>
      </div>

      <Callout title="Uma rede preparada para crescer">
        Marracuene já dispõe de cobertura móvel. O 4G chegou ao distrito
        em 2019 (1.ª fase da Tmcel), e as medições do INCM em Junho de 2023
        mostram RSRP ≥ −105 dBm em 98,9 % (Tmcel) a 100 % (Vodacom e Movitel)
        das estradas principais. Este projecto é de <strong>reforço</strong>:
        acompanhar o crescimento da procura e cobrir também os bairros fora das
        estradas.
      </Callout>

      <Panel title="Objectivo do projecto">
        <p className="objective">
          Dimensionar a rede 4G LTE de um operador para servir a procura prevista
          em <strong>{params.baseYear + params.horizon}</strong> na zona de
          Michafutene, cumprindo a meta do INCM:{" "}
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
          substitution={String.raw`P_{2025} = 38\,632 \times \frac{254\,139}{286\,324} \times \frac{305\,216}{254\,139} = ${n(zonePopulation2020, 0)} \times ${n(305216 / 254139, 3)}`}
          result={`${fmt(zonePopulation2025)} habitantes`}
          note="Estimativa calculada a partir de dados do WorldPop e de projecções do INE; não corresponde a uma contagem directa."
        />
      </Calc>
    </>
  );
}
