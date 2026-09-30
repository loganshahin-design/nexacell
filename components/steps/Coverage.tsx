"use client";
import { useMemo, useState } from "react";
import { useProject, zoneArea } from "@/hooks/useProject";
import { zone } from "@/data/zone";
import { classes, coverageMap } from "@/calculations/coverage";
import { traffic } from "@/calculations/network";
import { Calc, Callout, Fields, Hero, Legend, Panel, Rows, Segmented } from "@/components/ui";
import { ShareBar } from "@/components/Charts";
import Equation, { mathNumber as n } from "@/components/Equation";
import { ZoneMap } from "./Scenario";
import type { MapCell } from "@/components/ZoneMap";
import { fmt } from "@/utils/format";

export function useCoverage(resolution = 60) {
  const { params, stations } = useProject();
  return useMemo(
    () => coverageMap(params, stations, zone.polygon, resolution),
    [params, stations, resolution],
  );
}

export default function Coverage() {
  const { params: p, dim, setStep, stations } = useProject();
  const cov = useCoverage();
  const [view, setView] = useState<"classes" | "design">("classes");
  const cells: MapCell[] = useMemo(
    () =>
      cov.cells.map((c) => ({
        p: c.p,
        dLat: c.dLat,
        dLng: c.dLng,
        color:
          view === "classes"
            ? classes.find((k) => k.key === c.cls)!.color
            : c.rsrp >= cov.designRsrp
              ? "#15803d"
              : "#dc2626",
        title: `${fmt(c.rsrp, 1)} dBm · ${c.server ?? "sem BTS"}`,
      })),
    [cov, view],
  );
  const ok = cov.designCoverage >= p.coverageTarget;
  const now = traffic(p, 0);
  return (
    <>
      <div className="grid-2 wide-right">
        <div className="stack">
          <Hero
            label="Área coberta (critério de projecto)"
            value={fmt(cov.designCoverage, 1)}
            unit="%"
            tone={ok ? "ok" : "bad"}
          >
            {ok
              ? `Cumpre a meta de ${fmt(p.coverageTarget)} %.`
              : `Abaixo da meta de ${fmt(p.coverageTarget)} %.`}{" "}
            Conta os pontos com RSRP mediano ≥ {fmt(cov.designRsrp, 1)} dBm, ou
            seja o limiar de {fmt(p.rsrpMin)} dBm mais as margens do passo 6.1.2.
          </Hero>
          {!ok && (
            <Callout tone="warn" title="Como melhorar">
              Veja as zonas vermelhas no mapa e, em 6.1.4, aproxime ou acrescente
              BTS nesses sítios. Também pode subir a altura das antenas ou ajustar
              o tilt (6.2).
              <div className="button-row">
                <button className="btn" onClick={() => setStep(5)}>
                  Ir para 6.1.4
                </button>
              </div>
            </Callout>
          )}
          <Panel title="Distribuição pelas classes do INCM">
            <ShareBar label="Zona de estudo (RSRP mediano)" share={cov.share} />
            <Rows
              rows={[
                [`RSRP ≥ ${fmt(p.rsrpMin)} dBm (mediano)`, `${fmt(cov.meetsThreshold, 1)} % da área`],
                ["Área coberta (projecto)", `${fmt((zoneArea * cov.designCoverage) / 100, 2)} km² de ${fmt(zoneArea, 2)}`],
                ["População coberta hoje", `${fmt((now.population * cov.designCoverage) / 100)} hab.`],
                ["BTS activas", `${stations.filter((s) => s.enabled).length} (dimensionadas: ${dim.required})`],
              ]}
            />
          </Panel>
          <Panel title="Meta">
            <Fields names={["coverageTarget"]} />
          </Panel>
        </div>
        <Panel
          title="Diagrama de cobertura"
          aside={
            <Segmented
              label="Vista do mapa"
              value={view}
              options={[
                ["classes", "Classes INCM"],
                ["design", "Projecto"],
              ]}
              onChange={(v) => setView(v as typeof view)}
            />
          }
        >
          <ZoneMap
            stations={stations}
            sectors={p.sectors}
            sectorLength={dim.link.radius * 0.35}
            cells={cells}
            tall
            label="Mapa de cobertura prevista"
          />
          {view === "classes" ? (
            <Legend
              items={classes.map((c) => ({
                color: c.color,
                label: `${c.label} ${c.min === -Infinity ? `< ${fmt(-105)}` : `≥ ${fmt(c.min)}`} dBm`,
              }))}
            />
          ) : (
            <Legend
              items={[
                { color: "#15803d", label: `≥ ${fmt(cov.designRsrp, 1)} dBm (coberto)` },
                { color: "#dc2626", label: "abaixo (não coberto)" },
              ]}
            />
          )}
          <p className="caption">
            RSRP previsto no exterior a 1,5 m, com o modelo Hata e o diagrama das
            antenas sectoriais. Passe o rato por cima de uma célula para ver o
            valor e a BTS que a serve.
          </p>
        </Panel>
      </div>
      <Calc>
        <Equation
          formula={String.raw`\mathrm{RSRP}(x) = \max_{\mathrm{sector}}\left[P_{\mathrm{RE}} + G_{\mathrm{BTS}} - A(\varphi,\theta) - L_{\mathrm{cabo}} + G_{\mathrm{UE}} - L_{\mathrm{Hata}}(d)\right]`}
          note="Em cada ponto da grelha fica a BTS e o sector com o sinal mais forte (melhor servidor)."
        />
        <Equation
          formula={String.raw`A(\varphi,\theta) = \min\!\left[12\left(\tfrac{\varphi}{\varphi_{3dB}}\right)^2 + 12\left(\tfrac{\theta - \theta_{\mathrm{tilt}}}{\theta_{3dB}}\right)^2,\ 25\right]`}
          substitution={String.raw`\varphi_{3dB} = ${n(p.hBeam)}^\circ,\quad \theta_{3dB} = ${n(p.vBeam)}^\circ,\quad \theta_{\mathrm{tilt}} = ${n(p.tilt)}^\circ`}
          note="Diagrama sectorial do 3GPP TR 36.814: perda em relação ao máximo do feixe."
        />
        <Equation
          formula={String.raw`\mathrm{RSRP}_{\mathrm{proj}} = \mathrm{RSRP}_{\min} + M_{\mathrm{somb}} + L_{\mathrm{pen}} + M_{\mathrm{int}} + L_{\mathrm{corpo}}`}
          substitution={String.raw`\mathrm{RSRP}_{\mathrm{proj}} = ${n(p.rsrpMin)} + ${n(dim.link.shadowMargin)} + ${n(p.indoorLoss)} + ${n(p.interferenceMargin)} + ${n(p.bodyLoss)}`}
          result={`${fmt(cov.designRsrp, 2)} dBm`}
          note="Um ponto conta como coberto se o valor mediano previsto ultrapassar este valor: assim o sinal real fica acima do limiar com a probabilidade escolhida."
        />
      </Calc>
    </>
  );
}
