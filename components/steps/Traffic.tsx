"use client";
import { useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { projection } from "@/calculations/network";
import { Calc, Fields, Hero, Panel, Rows } from "@/components/ui";
import { ProjectionChart } from "@/components/Charts";
import { Funnel } from "@/components/motion/Funnel";
import Equation, { mathNumber as n } from "@/components/Equation";
import { fmt } from "@/utils/format";

export default function Traffic() {
  const { params: p, dim } = useProject();
  const t = dim.traffic,
    t0 = dim.now,
    c = dim.capacity;
  const data = useMemo(() => projection(p), [p]);
  const growth = t.demand / t0.demand;
  return (
    <>
      <div className="grid-2">
        <div className="stack">
          <Panel title="Quem usa a rede">
            <Fields
              names={[
                "horizon",
                "growth",
                "penetration",
                "marketShare",
                "lteShare",
                "baseYear",
              ]}
            />
          </Panel>
          <Panel title="Quanto usa cada pessoa">
            <Fields
              names={[
                "monthlyGB",
                "usageGrowth",
                "busyHourShare",
                "voiceErlang",
                "gos",
                "volteRate",
              ]}
            />
          </Panel>
          <Panel title="Capacidade de uma BTS">
            <Fields names={["bandwidth", "efficiency", "sectors", "maxLoad"]} />
          </Panel>
        </div>
        <div className="stack">
          <Hero
            label={`Procura na hora de pico em ${t.year}`}
            value={t.demand}
            unit="Mbit/s"
          >
            Dados {fmt(t.dataMbps)} Mbit/s + voz {fmt(t.voiceMbps, 1)} Mbit/s.
            Hoje ({t0.year}) são {fmt(t0.demand)} Mbit/s: a procura multiplica
            por {fmt(growth, 1)} em {p.horizon} anos.
          </Hero>
          <Panel title={`Dos habitantes aos utilizadores 4G (${t.year})`}>
            <Funnel
              stages={[
                { label: "População", note: `${t.year}`, value: t.population },
                { label: "Subscritores", note: `× ${fmt(p.penetration)} %`, value: t.subscribers },
                { label: "Do operador", note: `× ${fmt(p.marketShare)} %`, value: t.operatorUsers },
                { label: "Com 4G", note: `× ${fmt(p.lteShare)} %`, value: t.lteUsers },
              ]}
            />
            <Rows
              rows={[
                [
                  "Consumo por utilizador",
                  `${fmt(t.monthlyGB, 1)} GB/mês → ${fmt(t.perUserMbps * 1000, 1)} kbit/s na hora de pico`,
                ],
                [
                  "Voz (VoLTE)",
                  `${fmt(t.voiceErlangs, 1)} Erl → ${fmt(t.voiceChannels)} canais (bloqueio ${fmt(p.gos, 1)} %)`,
                ],
              ]}
            />
          </Panel>
          <Hero
            label="BTS necessárias pela capacidade"
            value={dim.byCapacity}
            tone="warn"
          >
            Cada BTS oferece {fmt(c.perSite)} Mbit/s ({p.sectors} sectores ×{" "}
            {fmt(c.perSector, 1)} Mbit/s) e planeamos usar só {fmt(p.maxLoad)} %:{" "}
            {fmt(c.usable, 1)} Mbit/s úteis. Em {t0.year} bastariam{" "}
            {dim.nowByCapacity}.
          </Hero>
          <Panel title="Evolução ano a ano">
            <ProjectionChart data={data} />
            <p className="caption">
              Barras: procura na hora de pico. Linha: BTS necessárias só pela
              capacidade. O próximo passo verifica a cobertura.
            </p>
          </Panel>
        </div>
      </div>

      <Calc>
        <Equation
          formula={String.raw`P_{${t.year}} = P_{${p.baseYear}}\,(1+g)^{\,h}`}
          substitution={String.raw`P_{${t.year}} = ${n(p.population, 0)} \times (1 + ${n(p.growth / 100, 3)})^{${p.horizon}}`}
          result={`${fmt(t.population)} habitantes`}
          note="g: crescimento anual (INE); h: horizonte de projecto em anos."
        />
        <Equation
          formula={String.raw`U_{\mathrm{LTE}} = P \times \pi \times q \times s_{4G}`}
          substitution={String.raw`U_{\mathrm{LTE}} = ${n(t.population, 0)} \times ${n(p.penetration / 100)} \times ${n(p.marketShare / 100)} \times ${n(p.lteShare / 100)}`}
          result={`${fmt(t.lteUsers)} utilizadores`}
          note="π: penetração móvel (INCM); q: quota do operador; s: parte com 4G."
        />
        <Equation
          formula={String.raw`r_u = \frac{V \times 8000}{30} \times \frac{k_{\mathrm{HP}}}{3600}`}
          substitution={String.raw`r_u = \frac{${n(t.monthlyGB)} \times 8000}{30} \times \frac{${n(p.busyHourShare / 100)}}{3600}`}
          result={`${fmt(t.perUserMbps * 1000, 1)} kbit/s por utilizador`}
          note="V: GB/mês no ano de projecto (8000 Mbit por GB); k: fracção do tráfego diário na hora de pico."
        />
        <Equation
          formula={String.raw`A = U_{\mathrm{LTE}} \times a_u \qquad B(A,N) = \frac{A^N/N!}{\sum_{k=0}^{N} A^k/k!} \le \mathrm{GoS}`}
          substitution={String.raw`A = ${n(t.lteUsers, 0)} \times ${n(p.voiceErlang, 3)} = ${n(t.voiceErlangs, 1)}\ \mathrm{Erl} \Rightarrow N = ${t.voiceChannels}`}
          result={`${t.voiceChannels} canais VoLTE = ${fmt(t.voiceMbps, 1)} Mbit/s`}
          note="Erlang B: menor N com probabilidade de bloqueio abaixo do grau de serviço."
        />
        <Equation
          formula={String.raw`T = U_{\mathrm{LTE}}\, r_u + N\, r_{\mathrm{VoLTE}}`}
          substitution={String.raw`T = ${n(t.lteUsers, 0)} \times ${n(t.perUserMbps, 4)} + ${t.voiceChannels} \times ${n(p.volteRate / 1000, 3)}`}
          result={`${fmt(t.demand, 1)} Mbit/s`}
        />
        <Equation
          formula={String.raw`n_{\mathrm{cap}} = \left\lceil \frac{T}{B\,\eta\,s\,\rho / N_r} \right\rceil`}
          substitution={String.raw`n_{\mathrm{cap}} = \left\lceil \frac{${n(t.demand, 1)}}{${n(p.bandwidth)} \times ${n(p.efficiency)} \times ${p.sectors} \times ${n(p.maxLoad / 100)} / ${p.reuse}} \right\rceil`}
          result={`${dim.byCapacity} BTS`}
          note="B: largura de banda (MHz); η: eficiência (bit/s/Hz); s: sectores; ρ: ocupação máxima; Nr: factor de reuso."
        />
      </Calc>
    </>
  );
}
