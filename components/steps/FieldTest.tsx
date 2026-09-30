"use client";
import { useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { zone } from "@/data/zone";
import { incmMarracuene4G, sources } from "@/data/sources";
import { classes, driveTest } from "@/calculations/coverage";
import { routeLength } from "@/calculations/geo";
import { Callout, Hero, Legend, OriginBadge, Panel, Rows } from "@/components/ui";
import { DriveChart, ShareBar } from "@/components/Charts";
import { ZoneMap } from "./Scenario";
import type { MapSample } from "@/components/ZoneMap";
import { fmt } from "@/utils/format";

export function useDriveTest() {
  const { params, stations } = useProject();
  return useMemo(() => driveTest(params, stations, zone.route), [params, stations]);
}

export default function FieldTest() {
  const { params: p, stations, mode } = useProject();
  const dt = useDriveTest();
  const samples: MapSample[] = useMemo(
    () =>
      dt.samples.map((s) => ({
        p: s.p,
        color: classes.find((c) => c.key === s.cls)!.color,
        title: `${fmt(s.km, 2)} km · ${fmt(s.rsrp, 1)} dBm · ${s.server ?? "—"}`,
      })),
    [dt],
  );
  const ok = dt.meets >= p.coverageTarget;
  const every500 = dt.samples.filter((s) => Math.abs(s.km / 0.5 - Math.round(s.km / 0.5)) < 1e-6);
  return (
    <>
      <Callout tone="warn" title="Previsão, não medição">
        O grupo não fez medições no terreno. Os valores abaixo são o que o modelo
        prevê para um carro a percorrer a N1. As barras do INCM, essas sim, são
        medições reais feitas em Marracuene em Junho de 2023.
      </Callout>
      <div className="grid-2 wide-right">
        <div className="stack">
          <Hero
            label="Amostras com RSRP ≥ −105 dBm (previsto)"
            value={fmt(dt.meets, 1)}
            unit="%"
            tone={ok ? "ok" : "bad"}
          >
            {dt.samples.length} amostras, uma a cada 50 m ao longo de{" "}
            {fmt(routeLength(zone.route), 1)} km da N1. Meta do INCM:{" "}
            {fmt(p.coverageTarget)} % das amostras.
          </Hero>
          <Panel title="Comparação com o INCM" aside={<OriginBadge origin="REAL" source="incmMarracuene" />}>
            <ShareBar label="Nossa rede (previsão, N1)" share={dt.share} note="PREVISTO" />
            {incmMarracuene4G.map((o) => (
              <ShareBar
                key={o.operator}
                label={`${o.operator} em Marracuene`}
                share={o}
                note={`REAL 2023 · ${fmt(o.meets, 1)} % ≥ −105`}
              />
            ))}
            <Legend items={classes.map((c) => ({ color: c.color, label: c.label }))} />
            <p className="caption">
              {sources.incmMarracuene.source}. As rotas do INCM cobrem as
              estradas principais de todo o distrito; a nossa só a N1 em
              Michafutene.
            </p>
          </Panel>
          <Panel title="Resumo das amostras">
            <Rows
              rows={[
                ["RSRP mínimo", `${fmt(dt.min, 1)} dBm`],
                ["RSRP médio", `${fmt(dt.mean, 1)} dBm`],
                ["RSRP máximo", `${fmt(dt.max, 1)} dBm`],
                ...classes.map(
                  (c) =>
                    [c.label, `${fmt(dt.share[c.key], 1)} %`] as [string, string],
                ),
              ]}
            />
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Rota do teste (N1)">
            <ZoneMap
              stations={stations}
              sectors={p.sectors}
              samples={samples}
              tall
              label="Rota do drive test previsto na N1"
            />
          </Panel>
          <Panel title="RSRP ao longo da rota">
            <DriveChart samples={dt.samples} />
            <p className="caption">
              Do limite com Maputo (0 km) até ao nordeste da zona. Faixas de cor:
              classes do INCM. Linha vermelha: −105 dBm.
            </p>
          </Panel>
        </div>
      </div>
      <Panel title="Como se faz um teste de campo real">
        <ol className="how">
          <li>
            <strong>Equipamento:</strong> telemóvel 4G com uma app de medição
            (Network Cell Info, G-NetTrack) ou um scanner profissional, com GPS.
          </li>
          <li>
            <strong>Rota:</strong> percorrer as vias principais (aqui a N1) a
            velocidade constante, registando uma amostra por segundo.
          </li>
          <li>
            <strong>Parâmetros:</strong> RSRP (nível do sinal), RSRQ (qualidade),
            SINR (sinal/interferência), débito de download e upload, latência e a
            célula servidora.
          </li>
          <li>
            <strong>Análise:</strong> classificar cada amostra pelas classes do
            INCM e calcular a % acima de −105 dBm, como fazemos acima.
          </li>
          <li>
            <strong>Calibração:</strong> comparar as medições com a previsão e
            ajustar o modelo (por exemplo, a correcção do ambiente em Hata).
          </li>
        </ol>
      </Panel>
      {mode === "avancado" && (
        <Panel title="Amostras a cada 500 m">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Distância</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>RSRP</th>
                  <th>Classe</th>
                  <th>Servidor</th>
                </tr>
              </thead>
              <tbody>
                {every500.map((s) => (
                  <tr key={s.km}>
                    <td>{fmt(s.km, 1)} km</td>
                    <td>{fmt(s.p[0], 5)}</td>
                    <td>{fmt(s.p[1], 5)}</td>
                    <td>{fmt(s.rsrp, 1)} dBm</td>
                    <td>{classes.find((c) => c.key === s.cls)!.label}</td>
                    <td>{s.server}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
