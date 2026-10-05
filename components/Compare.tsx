"use client";
import { useMemo, useState } from "react";
import { useProject } from "@/hooks/useProject";
import { calibrate, zones, type Zone, type ZoneId } from "@/data/zones";
import { polygonArea } from "@/calculations/geo";
import { Params } from "@/types";
import { dimension } from "@/calculations/network";
import { autoPlace } from "@/calculations/placement";
import { coverageMap } from "@/calculations/coverage";
import { Panel, Segmented } from "@/components/ui";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { fmt } from "@/utils/format";

type Preset = {
  key: string;
  label: string;
  // [rótulo, parâmetros do cenário, zona (por omissão a zona activa)]
  a: [string, (p: Params) => Params, ZoneId?];
  b: [string, (p: Params) => Params, ZoneId?];
};

// Os parâmetros do projecto aplicados a outra zona: a sua população e ambiente.
const inZone =
  (id: ZoneId) =>
  (p: Params): Params => ({ ...p, population: calibrate(zones[id].worldpop2020), environment: zones[id].environment });

const presets: Preset[] = [
  {
    key: "ano",
    label: "Hoje e no ano de projecto",
    a: ["Hoje", (p) => ({ ...p, horizon: 0 })],
    b: ["Ano de projecto", (p) => p],
  },
  {
    key: "banda",
    label: "1800 MHz e 800 MHz",
    a: ["1800 MHz · 20 MHz", (p) => ({ ...p, frequency: 1800, bandwidth: 20 })],
    b: ["800 MHz · 10 MHz", (p) => ({ ...p, frequency: 800, bandwidth: 10 })],
  },
  {
    key: "interior",
    label: "Exterior e dentro de casa",
    a: ["Exterior (INCM)", (p) => ({ ...p, indoorLoss: 0 })],
    b: ["Dentro de casa (12 dB)", (p) => ({ ...p, indoorLoss: 12 })],
  },
  {
    key: "zonas",
    label: "Michafutene e Bobole",
    a: ["Michafutene (suburbano)", inZone("michafutene"), "michafutene"],
    b: ["Bobole (rural)", inZone("bobole"), "bobole"],
  },
];

function scenario(p: Params, zone: Zone) {
  const area = polygonArea(zone.polygon);
  const d = dimension(p, area);
  // Cobertura com as BTS dimensionadas, colocadas automaticamente (grelha mais leve).
  const cov = coverageMap(p, autoPlace(zone.polygon, d.required), zone.polygon, 36);
  return { d, cov, area };
}

export default function Compare() {
  const { params, zone } = useProject();
  const [key, setKey] = useState(presets[0].key);
  const preset = presets.find((x) => x.key === key)!;
  const [A, B] = useMemo(
    () => [
      scenario(preset.a[1](params), preset.a[2] ? zones[preset.a[2]] : zone),
      scenario(preset.b[1](params), preset.b[2] ? zones[preset.b[2]] : zone),
    ],
    [params, preset, zone],
  );
  const rows: [string, number, number, number, string, boolean][] = [
    ["Ano", A.d.traffic.year, B.d.traffic.year, 0, "", false],
    ...(key === "zonas"
      ? ([
          ["Área da zona", A.area, B.area, 1, "km²", false],
          ["População (ano base)", A.d.now.population, B.d.now.population, 0, "hab.", false],
        ] as [string, number, number, number, string, boolean][])
      : []),
    ["Procura na hora de pico", A.d.traffic.demand, B.d.traffic.demand, 0, "Mbit/s", true],
    ["Raio da célula", A.d.link.radius, B.d.link.radius, 2, "km", false],
    ["BTS pela capacidade", A.d.byCapacity, B.d.byCapacity, 0, "", true],
    ["BTS pela cobertura", A.d.byCoverage, B.d.byCoverage, 0, "", true],
    ["BTS necessárias", A.d.required, B.d.required, 0, "", true],
    ["Cobertura prevista (projecto)", A.cov.designCoverage, B.cov.designCoverage, 1, "%", false],
  ];
  const conclusion =
    key === "ano"
      ? `A procura passa de ${fmt(A.d.traffic.demand)} para ${fmt(B.d.traffic.demand)} Mbit/s: são precisas mais ${B.d.required - A.d.required} BTS até ${B.d.traffic.year}.`
      : key === "banda"
        ? `A 800 MHz o raio passa de ${fmt(A.d.link.radius, 2)} para ${fmt(B.d.link.radius, 2)} km, mas com 10 MHz a capacidade por BTS cai para metade (${B.d.byCapacity} BTS pela capacidade). Por isso é comum usar as duas: a banda baixa para cobrir, 1800 MHz para capacidade.`
        : key === "interior"
          ? `Exigir o sinal dentro de casa faz o raio cair de ${fmt(A.d.link.radius, 2)} para ${fmt(B.d.link.radius, 2)} km e as BTS pela cobertura subir de ${A.d.byCoverage} para ${B.d.byCoverage}.`
          : `Em Bobole (rural) cada célula chega a ${fmt(B.d.link.radius, 2)} km, contra ${fmt(A.d.link.radius, 2)} km em Michafutene, e bastam ${B.d.required} BTS para uma área ${fmt(B.area / A.area, 1)} vezes maior. Com as BTS colocadas automaticamente, a cobertura de projecto em Bobole fica em ${fmt(B.cov.designCoverage, 1)} %: a conta da área é optimista e o mapa mostra onde falta sinal.`;
  return (
    <Panel
      title="Comparar cenários"
      aside={
        <Segmented
          label="Cenário a comparar"
          value={key}
          options={presets.map((x) => [x.key, x.label])}
          onChange={setKey}
        />
      }
    >
      <div className="compare-grid" role="table" aria-label={`Comparação: ${preset.label}`}>
        <div className="head" role="columnheader">Indicador</div>
        <div className="head num" role="columnheader">{preset.a[0]}</div>
        <div className="head num" role="columnheader">{preset.b[0]}</div>
        <div className="head num" role="columnheader">Diferença</div>
        {rows.map(([label, a, b, digits, unit, upIsCost]) => {
          const diff = b - a;
          const tone = Math.abs(diff) < 1e-9 ? "" : (diff > 0) === upIsCost ? "up" : "down";
          return (
            <div key={label} role="row" style={{ display: "contents" }}>
              <div role="cell">{label}</div>
              <div className="num" role="cell">
                {label === "Ano" ? a : <AnimatedNumber value={a} digits={digits} />} {unit}
              </div>
              <div className="num" role="cell">
                {label === "Ano" ? b : <AnimatedNumber value={b} digits={digits} />} {unit}
              </div>
              <div className={`delta ${tone}`} role="cell">
                {label === "Ano" ? "" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${fmt(Math.abs(diff), digits)}`}
              </div>
            </div>
          );
        })}
      </div>
      <p className="caption" style={{ fontSize: 15, color: "var(--text)" }}>
        {conclusion}
      </p>
      <p className="caption">
        Cada cenário é recalculado com colocação automática das BTS. Os valores
        do projecto não mudam.
      </p>
    </Panel>
  );
}
