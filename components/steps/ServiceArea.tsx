"use client";
import { useMemo } from "react";
import { useProject, zoneArea } from "@/hooks/useProject";
import { dimension, siteAreaFactor } from "@/calculations/network";
import {
  environmentCorrection,
  hataIntercept,
  hataSlope,
  mobileCorrection,
} from "@/calculations/propagation";
import {
  Calc,
  Callout,
  EnvironmentField,
  Fields,
  Hero,
  OriginBadge,
  Panel,
  Rows,
  Segmented,
} from "@/components/ui";
import { PathLossChart } from "@/components/Charts";
import Equation, { mathNumber as n } from "@/components/Equation";
import { fmt, signed } from "@/utils/format";

const indoorPresets: [string, string][] = [
  ["0", "Exterior (INCM)"],
  ["8", "Interior ligeiro"],
  ["12", "Dentro de casa"],
];

export function DecisionCard() {
  const { dim } = useProject();
  const max = Math.max(dim.byCapacity, dim.byCoverage);
  const bar = (label: string, value: number, on: boolean) => (
    <div className={`crit ${on ? "on" : ""}`}>
      <span>{label}</span>
      <div className="crit-track">
        <i style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
  return (
    <div className="decision-card">
      <span className="hero-label">Decisão: número de BTS</span>
      {bar("Capacidade (6.1.1)", dim.byCapacity, dim.byCapacity >= dim.byCoverage)}
      {bar("Cobertura (6.1.2)", dim.byCoverage, dim.byCoverage >= dim.byCapacity)}
      <p>
        São precisas <strong>{dim.required} BTS</strong>.{" "}
        {dim.limiting === "capacidade" &&
          `Quem manda é a capacidade: ${dim.byCoverage} BTS cobririam a zona, mas não teriam débito para o tráfego de ${dim.traffic.year}.`}
        {dim.limiting === "cobertura" &&
          `Quem manda é a cobertura: ${dim.byCapacity} BTS teriam capacidade suficiente, mas não chegariam a toda a zona.`}
        {dim.limiting === "ambos" && "Os dois critérios pedem o mesmo número."}
      </p>
    </div>
  );
}

export default function ServiceArea() {
  const { params: p, dim, setParam, mode } = useProject();
  const l = dim.link;
  const fsplRadius = 10 ** ((l.mapl - 32.44 - 20 * Math.log10(p.frequency)) / 20);
  const indoor = useMemo(
    () => (p.indoorLoss >= 8 ? null : dimension({ ...p, indoorLoss: 12 }, zoneArea)),
    [p],
  );
  const K = siteAreaFactor(p.sectors);
  const hataBase =
    hataIntercept(p.frequency, p.height, p.mobileHeight) +
    13.82 * Math.log10(p.height) +
    mobileCorrection(p.frequency, p.mobileHeight);
  const envC = environmentCorrection(p.frequency, p.environment);
  return (
    <>
      <div className="grid-2">
        <div className="stack">
          <Panel title="Rádio e antena">
            <Fields names={["frequency", "power", "gain", "cable", "height", "mobileHeight"]} />
            <EnvironmentField />
          </Panel>
          <Panel title="Critério de cobertura">
            <Fields names={["rsrpMin"]} />
            <div className="field">
              <div className="field-top">
                <span className="field-label">Onde está o utilizador</span>
                <OriginBadge origin="PRESSUPOSTO" />
              </div>
              <Segmented
                label="Onde está o utilizador"
                value={String(p.indoorLoss)}
                options={indoorPresets}
                onChange={(v) => setParam("indoorLoss", Number(v))}
              />
              <p className="field-help">
                O INCM mede na rua. Dentro de casa, as paredes tiram 8 a 12 dB.
              </p>
            </div>
            {mode === "avancado" && (
              <Fields
                names={[
                  "indoorLoss",
                  "shadowStd",
                  "edgeProbability",
                  "interferenceMargin",
                  "bodyLoss",
                  "ueGain",
                ]}
              />
            )}
          </Panel>
          {mode === "avancado" && (
            <Panel title="Ligação ascendente (uplink)">
              <Fields names={["uePower", "noiseFigure", "ulSinr", "ulRb"]} />
            </Panel>
          )}
        </div>
        <div className="stack">
          <Hero label="Raio de cada célula" value={fmt(l.radius, 2)} unit="km">
            A perda máxima admissível é {fmt(l.mapl, 1)} dB (limita o{" "}
            {l.limiting === "DL" ? "downlink" : "uplink"}). Com o modelo Hata é
            atingida a {fmt(l.radius, 2)} km. Em espaço livre seria{" "}
            {fmt(fsplRadius, 1)} km, um valor irrealista.
          </Hero>
          <Panel title="Orçamento de enlace (downlink)">
            <Rows
              rows={[
                [`Potência por sector`, `${fmt(p.power)} dBm (${fmt(10 ** ((p.power - 30) / 10))} W)`],
                [`Por subportadora (÷ ${12 * l.nRb})`, `${fmt(l.rePower, 1)} dBm`],
                [`+ ganho − cabos`, `${signed(p.gain - p.cable)} dB`],
                [`= PIRE por subportadora`, `${fmt(l.reEirp, 1)} dBm`, "total"],
                [`− RSRP mínimo`, `${signed(-p.rsrpMin)} dB`],
                [`− sombreamento (${fmt(p.edgeProbability)} % na orla)`, `${signed(-l.shadowMargin)} dB`],
                [`− paredes`, `${signed(-p.indoorLoss)} dB`],
                [`− interferência e corpo`, `${signed(-(p.interferenceMargin + p.bodyLoss))} dB`],
                [`+ ganho do terminal`, `${signed(p.ueGain)} dB`],
                [`= Perda máxima (MAPL) DL`, `${fmt(l.dl, 1)} dB`, "total"],
                [`MAPL uplink (verificação)`, `${fmt(l.ul, 1)} dB`],
              ]}
            />
          </Panel>
          <Panel title="Quantas BTS para cobrir a zona">
            <Rows
              rows={[
                ["Área servida por BTS", `${fmt(K, 2)} × R² = ${fmt(dim.siteArea, 2)} km²`],
                ["Área da zona", `${fmt(zoneArea, 2)} km²`],
                ["BTS por cobertura", `${dim.byCoverage}`, "total"],
                ["Distância entre BTS", `≈ ${fmt(dim.spacing, 2)} km`],
              ]}
            />
          </Panel>
          <DecisionCard />
          {indoor && (
            <Callout tone="info" title="E dentro das casas?">
              Se exigirmos o mesmo sinal dentro de casa (12 dB de paredes), o raio
              cai para {fmt(indoor.link.radius, 2)} km e seriam precisas{" "}
              <strong>{indoor.byCoverage} BTS</strong> a 1800 MHz. É por isso que
              os operadores usam bandas baixas (800/900 MHz) para a cobertura
              interior.
            </Callout>
          )}
          <Panel title="Perda de percurso com a distância">
            <PathLossChart p={p} mapl={l.mapl} radius={l.radius} />
          </Panel>
        </div>
      </div>

      <Calc>
        <Equation
          formula={String.raw`P_{\mathrm{RE}} = P_{\mathrm{tx}} - 10\log_{10}(12\,N_{\mathrm{RB}})`}
          substitution={String.raw`P_{\mathrm{RE}} = ${n(p.power)} - 10\log_{10}(12 \times ${l.nRb})`}
          result={`${fmt(l.rePower, 2)} dBm`}
          note="O RSRP mede a potência de uma só subportadora (15 kHz); 20 MHz têm 100 blocos de 12 subportadoras."
        />
        <Equation
          formula={String.raw`M_{\mathrm{somb}} = \sigma\,\Phi^{-1}(p_{\mathrm{orla}})`}
          substitution={String.raw`M_{\mathrm{somb}} = ${n(p.shadowStd)} \times \Phi^{-1}(${n(p.edgeProbability / 100)})`}
          result={`${fmt(l.shadowMargin, 2)} dB`}
          note="Margem para o sinal ultrapassar o limiar com a probabilidade pedida na orla da célula."
        />
        <Equation
          formula={String.raw`\begin{aligned}\mathrm{MAPL}_{\mathrm{DL}} ={}& P_{\mathrm{RE}} + G_{\mathrm{BTS}} - L_{\mathrm{cabo}} + G_{\mathrm{UE}} - \mathrm{RSRP}_{\min}\\ &- M_{\mathrm{somb}} - L_{\mathrm{pen}} - M_{\mathrm{int}} - L_{\mathrm{corpo}}\end{aligned}`}
          substitution={String.raw`\begin{aligned}\mathrm{MAPL}_{\mathrm{DL}} ={}& ${n(l.rePower)} + ${n(p.gain)} - ${n(p.cable)} + ${n(p.ueGain)} - (${n(p.rsrpMin)})\\ &- ${n(l.shadowMargin)} - ${n(p.indoorLoss)} - ${n(p.interferenceMargin)} - ${n(p.bodyLoss)}\end{aligned}`}
          result={`${fmt(l.dl, 2)} dB`}
        />
        <Equation
          formula={String.raw`S_{\mathrm{BTS}} = -174 + 10\log_{10}(N_{\mathrm{RB}}^{\mathrm{UL}} \times 180\,\mathrm{kHz}) + NF + \mathrm{SINR}`}
          substitution={String.raw`S_{\mathrm{BTS}} = -174 + 10\log_{10}(${p.ulRb} \times 180\,000) + ${n(p.noiseFigure)} + (${n(p.ulSinr)})`}
          result={`${fmt(l.sensitivity, 2)} dBm → MAPL UL = ${fmt(l.ul, 1)} dB`}
          note="MAPL UL = P_UE + G_UE − L_corpo + G_BTS − L_cabo − S_BTS − margens."
        />
        <Equation
          formula={String.raw`\begin{aligned}L ={}& ${p.frequency <= 1500 ? "69{,}55 + 26{,}16" : "46{,}3 + 33{,}9"}\log_{10} f - 13{,}82\log_{10} h_b - a(h_m)\\ &+ (44{,}9 - 6{,}55\log_{10} h_b)\log_{10} d + C\end{aligned}`}
          substitution={String.raw`\begin{aligned}L ={}& ${n(hataBase)} - ${n(13.82 * Math.log10(p.height))} - ${n(mobileCorrection(p.frequency, p.mobileHeight), 3)}\\ &+ ${n(hataSlope(p.height))}\log_{10} d ${envC < 0 ? "-" : "+"} ${n(Math.abs(envC))}\end{aligned}`}
          result={`L = ${fmt(l.intercept, 2)} + ${fmt(l.slope, 2)}·log₁₀(d) dB`}
          note={`${p.frequency <= 1500 ? "Okumura-Hata" : "COST-231 Hata"}; f em MHz, alturas em m, d em km; C: correcção do ambiente (${p.environment}). Válido para d ≥ 1 km: abaixo disso é extrapolação.`}
        />
        <Equation
          formula={String.raw`R = 10^{\,(\mathrm{MAPL} - L_1)/\beta}`}
          substitution={String.raw`R = 10^{\,(${n(l.mapl)} - ${n(l.intercept)})/${n(l.slope)}}`}
          result={`${fmt(l.radius, 3)} km`}
          note="L1: perda a 1 km; β: declive em dB por década de distância."
        />
        <Equation
          formula={String.raw`n_{\mathrm{cob}} = \left\lceil \frac{A_{\mathrm{zona}}}{K\,R^2} \right\rceil`}
          substitution={String.raw`n_{\mathrm{cob}} = \left\lceil \frac{${n(zoneArea)}}{${n(K)} \times ${n(l.radius, 3)}^2} \right\rceil`}
          result={`${dim.byCoverage} BTS`}
          note="K = 1,95 para 3 sectores, 2,6 omnidireccional (Holma & Toskala)."
        />
        <Equation
          formula={String.raw`n = \max(n_{\mathrm{cap}},\ n_{\mathrm{cob}})`}
          substitution={String.raw`n = \max(${dim.byCapacity},\ ${dim.byCoverage})`}
          result={`${dim.required} BTS`}
        />
      </Calc>
    </>
  );
}
