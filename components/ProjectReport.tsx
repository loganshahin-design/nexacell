import { Params, BTS, FieldPoint } from "@/types";
import { CommunityPlan } from "@/types/community";
import { scenario } from "@/data/scenario";
import { calculate, bounds } from "@/calculations/network";
import { fmt } from "@/utils/format";
import { CommunityReport } from "./community/PeoplePlanning";
import Equation, { mathNumber as mn } from "./Equation";
import { networkEquations } from "@/data/equations";
export default function ProjectReport({
  p,
  stations,
  points,
  community,
}: {
  p: Params;
  stations: BTS[];
  points: FieldPoint[];
  community: CommunityPlan;
}) {
  const r = calculate(p, stations),
    bb = bounds(p.area),
    real = points.filter((x) => x.real);
  return (
    <article className="report">
      <div className="report-top">
        <b>NexaCell</b>
        <span>{scenario.shortName}</span>
      </div>
      <h2>{scenario.reportTitle}</h2>
      <p className="report-subtitle">{scenario.location}</p>
      <div className="notice">REDE ACADÉMICA HIPOTÉTICA · SIMULAÇÃO</div>
      <h3>01 · Introdução</h3>
      <p>
        Este projecto estuda o planeamento de uma rede 4G LTE numa área de
        expansão urbana/periurbana de Marracuene, conciliando cobertura,
        capacidade e crescimento da procura.
      </p>
      <h3>02 · Problema</h3>
      <p>
        Como dimensionar cobertura e capacidade adequadas ao cenário
        considerado, distribuindo estações base e recursos de rádio? O estudo
        não pressupõe ausência de rede móvel ou de 4G em Marracuene e não avalia
        a rede de nenhuma operadora.
      </p>
      <h3>03 · Justificação da área</h3>
      <p>{scenario.justification}</p>
      <h3>04 · Objectivos</h3>
      <p>{scenario.objective}</p>
      <h3>05 · Caracterização da área de serviço</h3>
      <p>
        Área quadrada configurável de {fmt(p.area, 2)} km², centrada em{" "}
        {scenario.center[0]}, {scenario.center[1]}. A referência é o ponto de
        Marracuene no OpenStreetMap; a delimitação do estudo é conceptual, não
        um limite oficial. Ambiente urbano/periurbano de projecto, sem
        levantamento de relevo ou edifícios.
      </p>
      <p>
        Referência geográfica:{" "}
        <a href={scenario.mapSource}>{scenario.mapSource}</a>, confirmada em{" "}
        {scenario.verifiedOn}.
      </p>
      <h3>06 · Parâmetros considerados</h3>
      <p>{scenario.provenance}</p>
      <table>
        <thead>
          <tr>
            <th>Parâmetro</th>
            <th>Valor de simulação</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Área", `${p.area} km²`],
            ["População considerada", fmt(p.population)],
            ["Penetração móvel", `${p.penetration}%`],
            ["Utilizadores potenciais (calculado)", fmt(r.users)],
            ["Crescimento anual", `${p.growth}%`],
            ["Utilizadores activos no pico (calculado)", fmt(r.active)],
            [
              "Frequência / largura de banda",
              `${p.frequency} MHz / ${p.bandwidth} MHz`,
            ],
            [
              "Sensibilidade / desvanecimento",
              `${p.sensitivity} dBm / ${p.fade} dB`,
            ],
          ].map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>07 · Volume de tráfego</h3>
      <Equation
        formula={String.raw`A_{\mathrm{voz}}=\frac{U\,n_c\,t_c}{3600}`}
        substitution={String.raw`A_{\mathrm{voz}}=\frac{${mn(r.users)}\times ${mn(p.calls)}\times ${mn(p.duration)}}{3600}`}
        result={`${fmt(r.traffic, 2)} Erl`}
        note="U: utilizadores; nc: chamadas por utilizador na hora de pico; tc: duração média (s)."
      />
      <Equation
        formula={String.raw`T_d=U_{\mathrm{act}}\,q`}
        substitution={String.raw`T_d=${mn(r.active)}\times ${mn(p.demand)}`}
        result={`${fmt(r.demand, 2)} Mbps`}
        note="Uact: utilizadores activos; q: débito por utilizador (Mbps)."
      />
      <h3>08 · Dimensionamento das BTS</h3>
      <Equation
        formula={String.raw`A_{\mathrm{util}}=A_{\mathrm{hex}}(1-\rho)`}
        result={`${fmt(r.useful, 3)} km²`}
        note="ρ: reserva de sobreposição em fracção."
      />
      <Equation
        formula={String.raw`n_{\mathrm{BTS}}=\max(n_{\mathrm{cob}},n_{\mathrm{cap}})`}
        result={`${r.required} BTS`}
      />
      <p>
        Número recomendado: {r.required} BTS, máximo entre cobertura e
        capacidade (três sectores por nova estação). Configuração actual:{" "}
        {stations.length} BTS planeadas,{" "}
        {stations.filter((b) => b.enabled).length} activas na simulação.
      </p>
      <h3>09 · Localização das BTS</h3>
      <p>
        Posições propostas e editáveis. Nenhuma estação representa uma BTS real
        identificada de uma operadora.
      </p>
      <table>
        <thead>
          <tr>
            <th>BTS planeada</th>
            <th>Latitude / longitude</th>
            <th>Altura</th>
            <th>Potência / ganho</th>
            <th>Sectores / raio</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((b) => (
            <tr key={b.id}>
              <td>
                {b.id}
                {b.enabled ? "" : " (inactiva)"}
              </td>
              <td>
                {b.lat.toFixed(6)}, {b.lng.toFixed(6)}
              </td>
              <td>{b.height} m</td>
              <td>
                {b.power} dBm / {b.gain} dBi
              </td>
              <td>
                {b.sectors} / {b.radius} km
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>10 · Padrão de reuso</h3>
      <Equation
        formula={String.raw`N=i^2+ij+j^2`}
        note="i e j: deslocamentos inteiros na grelha hexagonal."
      />
      <Equation
        formula={String.raw`D=R\sqrt{3N}`}
        substitution={String.raw`D=${mn(p.radius)}\sqrt{3\times ${p.reuse}}`}
        result={`${fmt(r.reuseDistance, 2)} km`}
        note="R: raio (km); N: factor de reuso seleccionado."
      />
      <p>
        A sobreposição geométrica não é uma medição de interferência; SINR e
        interferência RF não são calculados.
      </p>
      <h3>11 · Antenas</h3>
      <p>
        Antenas sectoriais, polarização de projecto ±45°. Referência: ganho{" "}
        {p.gain} dBi, altura {p.height} m, tilt {p.tilt}°, abertura horizontal{" "}
        {p.horizontal}° e vertical {p.vertical}°. Azimutes individuais seguem a
        configuração de cada BTS. Altura, tilt e abertura documentam o projecto
        e não alteram os círculos.
      </p>
      <h3>12 · Cálculos</h3>
      {networkEquations(p, r).map(({ title, ...equation }) => (
        <section key={title}>
          <h4>{title}</h4>
          <Equation {...equation} />
        </section>
      ))}
      <Equation
        formula={String.raw`M_{\mathrm{disp}}=M-M_{\mathrm{desv}}`}
        substitution={String.raw`M_{\mathrm{disp}}=${mn(r.margin)}-${mn(p.fade)}`}
        result={`${fmt(r.margin - p.fade, 2)} dB`}
        note="Mdesv: reserva de desvanecimento (dB)."
      />
      <h3>13 · Diagrama de cobertura</h3>
      <svg
        className="report-coverage"
        viewBox="0 0 440 340"
        role="img"
        aria-label="Diagrama geométrico da área de estudo"
      >
        <defs>
          <clipPath id="reportBounds">
            <rect x="70" y="10" width="300" height="300" />
          </clipPath>
        </defs>
        <rect
          x="70"
          y="10"
          width="300"
          height="300"
          fill="none"
          stroke="currentColor"
          strokeDasharray="5 5"
        />
        {stations
          .filter((b) => b.enabled)
          .map((b, i) => {
            const x = 70 + ((b.lng - bb[0][1]) / (bb[1][1] - bb[0][1])) * 300,
              y = 310 - ((b.lat - bb[0][0]) / (bb[1][0] - bb[0][0])) * 300;
            return (
              <g key={b.id} clipPath="url(#reportBounds)">
                <circle
                  cx={x}
                  cy={y}
                  r={(b.radius / Math.sqrt(p.area)) * 300}
                  fill={["#22d3ee", "#8b5cf6", "#10b981"][i % 3]}
                  fillOpacity=".15"
                  stroke={["#0891b2", "#7c3aed", "#059669"][i % 3]}
                />
                <circle cx={x} cy={y} r="4" fill="currentColor" />
                <text x={x + 7} y={y - 6} fill="currentColor" fontSize="10">
                  {b.id}
                </text>
              </g>
            );
          })}
        <text x="70" y="330" fill="currentColor" fontSize="10">
          Estimativa/Simplificação de cobertura · Norte para cima
        </text>
      </svg>
      <p>
        União dos círculos amostrada numa grelha de 60 × 60 pontos. Cobertura:{" "}
        {fmt(r.coverage, 1)}%; área atendida: {fmt(r.servedArea, 2)} km²;
        sobreposição: {fmt(r.overlap, 1)}%. Não é uma previsão RF exacta.
      </p>
      <h3>14 · Simulação</h3>
      <Equation
        formula={String.raw`C_{\mathrm{rede}}=\sum_{b\in\mathcal{B}}\frac{B\,\eta\,s_b}{N}`}
        result={`${fmt(r.capacity)} Mbps`}
        note="ℬ: BTS activas; B: banda (MHz); η: eficiência (bit/s/Hz); sb: sectores da BTS; N: factor de reuso."
      />
      <p>
        Eficiência assumida de {p.efficiency} bit/s/Hz. A distribuição
        populacional global é uniforme; o módulo comunitário utiliza pesos por
        zona.
      </p>
      <h3>15 · Teste de campo</h3>
      <p>
        {real.length
          ? `${real.length} medições inseridas e declaradas reais pelos estudantes; não verificadas externamente.`
          : "Sem medições reais inseridas."}{" "}
        {points.filter((x) => !x.real).length} registo(s) marcado(s) como DADOS
        DE DEMONSTRAÇÃO.
      </p>
      <table>
        <thead>
          <tr>
            <th>Ponto / origem</th>
            <th>RSRP</th>
            <th>RSRQ / SINR</th>
            <th>Download / upload</th>
            <th>Latência</th>
          </tr>
        </thead>
        <tbody>
          {points.map((x) => (
            <tr key={x.id}>
              <td>
                {x.id} · {x.real ? "Dados reais inseridos" : "Demonstração"}
              </td>
              <td>{x.rsrp} dBm</td>
              <td>
                {x.rsrq} / {x.sinr} dB
              </td>
              <td>
                {x.download} / {x.upload} Mbps
              </td>
              <td>{x.latency} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        PREVISTO vs. MEDIDO: RSRP previsto indisponível neste modelo. A potência
        total simplificada não permite comparação directa com RSRP medido.
      </p>
      <h3>16 · Resultados</h3>
      <p>
        RESULTADOS CALCULADOS: {fmt(r.coveredUsers)} utilizadores potencialmente
        cobertos na hipótese uniforme; {fmt(p.area - r.servedArea, 2)} km² fora
        dos círculos;{" "}
        {r.capacity
          ? `${fmt(r.load, 1)}% de ocupação agregada`
          : "sem capacidade disponível"}
        .
      </p>
      <CommunityReport params={p} stations={stations} plan={community} />
      <h3>17 · Conclusão</h3>
      <p>
        O cenário permite estudar como distribuir cobertura e capacidade numa
        área de expansão urbana de Marracuene.{" "}
        {r.demand > r.capacity
          ? "A procura assumida excede a capacidade agregada estimada."
          : "A capacidade agregada estimada comporta a procura assumida."}{" "}
        A cobertura calculada não prova viabilidade RF nem descreve a rede
        existente. São necessários levantamentos de terreno, dados de propagação
        e medições reais para validação. Modelo simplificado para fins
        académicos.
      </p>
      <p>
        Referência técnica:{" "}
        <a href="https://www.itu.int/rec/R-REC-P.525-5-202411-I/en">
          ITU-R P.525 — Calculation of free-space attenuation
        </a>
        .
      </p>
    </article>
  );
}
