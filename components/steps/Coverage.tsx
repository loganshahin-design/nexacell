"use client";
import { useMemo, useState } from "react";
import { useProject } from "@/hooks/useProject";
import { classes, coverageMap } from "@/calculations/coverage";
import { traffic } from "@/calculations/network";
import { Calc, Callout, Fields, Hero, Legend, Panel, Rows, Segmented } from "@/components/ui";
import { ShareBar } from "@/components/Charts";
import Equation, { mathNumber as n } from "@/components/Equation";
import { ZoneMap } from "./Scenario";
import type { MapCell } from "@/components/ZoneMap";
import { fmt } from "@/utils/format";
import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { downloadCanvas } from "@/utils/exportImage";
import { coverageImage } from "@/utils/coverageImage";
import { useDriveTest } from "./FieldTest";

export const Zone3D = dynamic(() => import("@/components/three/Zone3D"), {
  ssr: false,
  loading: () => (
    <div className="stage3d">
      <div className="stage-fallback">A preparar a vista 3D…</div>
    </div>
  ),
});
const RealMap3D = dynamic(() => import("@/components/map/RealMap3D"), {
  ssr: false,
  loading: () => (
    <div className="realmap">
      <div className="stage-fallback">A carregar o mapa…</div>
    </div>
  ),
});

export function useCoverage(resolution = 60) {
  const { params, stations, zone } = useProject();
  return useMemo(
    () => coverageMap(params, stations, zone.polygon, resolution),
    [params, stations, zone, resolution],
  );
}

export default function Coverage() {
  const { params: p, dim, setStep, stations, zone, zoneArea } = useProject();
  const cov = useCoverage();
  const [view, setView] = useState<"classes" | "design">("classes");
  const [space, setSpace] = useState<"2d" | "3d" | "real">("2d");
  const drive = useDriveTest();
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
              ? "#17803a"
              : "#cc3a29",
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
            value={cov.designCoverage}
            digits={1}
            unit="%"
            tone={ok ? "ok" : "bad"}
          >
            {ok
              ? `Cumpre a meta de ${fmt(p.coverageTarget)} %.`
              : `Abaixo da meta de ${fmt(p.coverageTarget)} %.`}{" "}
            Conta os pontos com RSRP mediano ≥ {fmt(cov.designRsrp, 1)} dBm, ou
            seja o limiar de {fmt(p.rsrpMin)} dBm mais as margens do dimensionamento.
          </Hero>
          {!ok && (
            <Callout tone="warn" title="Como melhorar">
              Veja as zonas vermelhas no mapa e, na localização das estações, aproxime ou acrescente
              BTS nesses sítios. Também pode subir a altura das antenas ou ajustar
              o tilt (antenas).
              <div className="button-row">
                <button className="btn" onClick={() => setStep(5)}>
                  Ajustar estações
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
              label="Tipo de vista"
              value={space}
              options={[
                ["2d", "Mapa 2D"],
                ["3d", "Sinal em 3D"],
                ["real", "Mapa real 3D"],
              ]}
              onChange={(v) => setSpace(v as typeof space)}
            />
          }
        >
          {space === "3d" && (
            <>
              <Zone3D
                key={zone.id}
                cells={cov.cells}
                stations={stations}
                sectors={p.sectors}
                hBeam={p.hBeam}
                radiusKm={dim.link.radius}
                samples={drive.samples}
                label="Sinal em 3D do sinal previsto"
              />
              <p className="caption">
                A altura de cada coluna é o RSRP previsto; a cor é a classe do
                INCM. Arraste para rodar, use a roda do rato ou dois dedos para
                aproximar.
              </p>
            </>
          )}
          {space === "real" && (
            <>
              <RealMap3D key={zone.id} cells={cov.cells} stations={stations} />
              <p className="caption">
                Mapa OpenFreeMap com os edifícios do OpenStreetMap em 3D (cerca de
                2 900 mapeados na área). Alturas exageradas para se verem: sinal 5 m
                por dB, BTS com 320 m. Precisa de Internet.
              </p>
            </>
          )}
          {space === "2d" && (
          <>
          <div className="view-switch">
            <Segmented
              label="Vista do mapa"
              value={view}
              options={[
                ["classes", "Classes INCM"],
                ["design", "Projecto"],
              ]}
              onChange={(v) => setView(v as typeof view)}
            />
            <button
              className="btn ghost"
              onClick={() =>
                downloadCanvas(
                  coverageImage(cov.cells, stations, `Diagrama de cobertura LTE · ${zone.short} (N1)`),
                  "nexacell-cobertura.png",
                )
              }
            >
              <Download size={16} aria-hidden /> Guardar imagem
            </button>
          </div>
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
                { color: "#17803a", label: `≥ ${fmt(cov.designRsrp, 1)} dBm (coberto)` },
                { color: "#cc3a29", label: "abaixo (não coberto)" },
              ]}
            />
          )}
          <p className="caption">
            RSRP previsto no exterior a 1,5 m, com o modelo Hata e o diagrama das
            antenas sectoriais. Passe o rato por cima de uma célula para ver o
            valor e a BTS que a serve.
          </p>
          </>
          )}
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
