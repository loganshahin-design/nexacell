"use client";
import { useMemo } from "react";
import { useProject, zoneArea } from "@/hooks/useProject";
import { zone } from "@/data/zone";
import { incmMarracuene4G, references, sources } from "@/data/sources";
import { environments } from "@/data/defaults";
import { dimension, projection, siteAreaFactor } from "@/calculations/network";
import { reuseTable } from "@/calculations/reuse";
import { antennaParameters } from "@/calculations/antenna";
import { classes } from "@/calculations/coverage";
import { routeLength } from "@/calculations/geo";
import { useCoverage } from "./steps/Coverage";
import { useDriveTest } from "./steps/FieldTest";
import { team } from "./steps/Cover";
import { ShareBar } from "./Charts";
import ZoneSketch from "./ZoneSketch";
import { fmt } from "@/utils/format";

export function useConclusions() {
  const { params: p, dim, stations } = useProject();
  const cov = useCoverage();
  const dt = useDriveTest();
  const indoor = useMemo(
    () => (p.indoorLoss < 8 ? dimension({ ...p, indoorLoss: 12 }, zoneArea) : null),
    [p],
  );
  const active = stations.filter((s) => s.enabled).length;
  const list = [
    `Na zona de Michafutene (${fmt(zoneArea, 2)} km², ≈ ${fmt(p.population)} habitantes em ${p.baseYear}), a procura LTE de um operador na hora de pico passa de ${fmt(dim.now.demand)} Mbit/s (${dim.now.year}) para ${fmt(dim.traffic.demand)} Mbit/s (${dim.traffic.year}).`,
    `São precisas ${dim.required} BTS de ${p.sectors} sectores. ${dim.limiting === "capacidade" ? `A capacidade é o critério que limita: a cobertura sozinha pediria ${dim.byCoverage}.` : dim.limiting === "cobertura" ? `A cobertura é o critério que limita: a capacidade sozinha pediria ${dim.byCapacity}.` : "Os dois critérios pedem o mesmo número."}`,
    `Com ${active} BTS activas, ${fmt(cov.designCoverage, 1)} % da área cumpre o critério de projecto (meta de ${fmt(p.coverageTarget)} %) e o teste de campo previsto na N1 dá ${fmt(dt.meets, 1)} % de amostras com RSRP ≥ ${fmt(p.rsrpMin)} dBm, na mesma ordem das medições do INCM em Marracuene (98,9 % a 100 %).`,
    indoor
      ? `Para garantir o mesmo sinal dentro das casas (12 dB de paredes), seriam precisas ${indoor.byCoverage} BTS a ${fmt(p.frequency)} MHz. Recomenda-se uma camada em banda baixa (800/900 MHz) para a cobertura interior.`
      : `O projecto já inclui ${fmt(p.indoorLoss)} dB de perda de penetração (utilizadores dentro de casa).`,
    `O LTE funciona com reuso N = ${p.reuse}; um cluster N = 7 dividiria a banda por 7 e multiplicaria o número de BTS pela capacidade.`,
    `Antenas: painéis sectoriais MIMO de ${fmt(p.hBeam)}° e ${fmt(p.gain)} dBi, a ${fmt(p.height)} m, com tilt de ${fmt(p.tilt, 1)}° (óptimo calculado: ${fmt(antennaParameters(p, dim.link.radius).optimalTilt, 1)}°).`,
  ];
  return { list, cov, dt };
}

const limitations = [
  "O modelo Hata é empírico: não usa o relevo nem os edifícios reais, e abaixo de 1 km é uma extrapolação.",
  "A população é distribuída uniformemente dentro da zona.",
  "A rede é de um operador hipotético; as BTS existentes não entram no modelo porque as suas posições não são públicas.",
  "O teste de campo é uma previsão do modelo, não uma medição.",
  "A capacidade usa uma eficiência espectral média, sem simular o escalonador LTE.",
];

export default function Report() {
  const { params: p, dim, stations } = useProject();
  const { list, cov, dt } = useConclusions();
  const l = dim.link,
    t = dim.traffic;
  const years = projection(p);
  const a = antennaParameters(p, l.radius);
  const today = new Date().toLocaleDateString("pt-PT");
  return (
    <article className="report" aria-label="Relatório do projecto">
      <header className="report-cover">
        <p>Comunicações Móveis</p>
        <h1>Dimensionamento de uma rede móvel 4G LTE em Marracuene</h1>
        <p>Zona de expansão de Michafutene – corredor da N1, Província de Maputo</p>
        <p>Grupo: {team.join(", ")}</p>
        <p>{today}</p>
      </header>

      <section>
        <h2>6. Projecto de um sistema de CM</h2>
        <p>
          <strong>Objectivo.</strong> Dimensionar a rede 4G LTE de um operador para
          servir a procura prevista em {t.year} na zona de Michafutene, cumprindo a
          meta do INCM de RSRP ≥ {fmt(p.rsrpMin)} dBm em {fmt(p.coverageTarget)} % da
          área.
        </p>
        <p>
          <strong>Cenário.</strong> O 4G já existe em Marracuene desde 2019 e as
          estradas principais estão cobertas (INCM, 2023). A zona escolhida, com{" "}
          {fmt(zoneArea, 2)} km² recortados pela fronteira real do distrito, é a
          mais densa do distrito (≈ {fmt(p.population / zoneArea)} hab./km²) e
          cresce {fmt(p.growth, 1)} % ao ano. O projecto é de reforço: acompanhar a
          procura e cobrir também os bairros.
        </p>
        <ZoneSketch label="Zona de estudo e N1" />
        <table className="data compact">
          <thead>
            <tr>
              <th>Dado real</th>
              <th>Valor</th>
              <th>Fonte</th>
            </tr>
          </thead>
          <tbody>
            {["ineDistrict", "ineProjection", "worldpopZone", "incmPenetration", "incmShare", "incmThresholds", "incmMarracuene", "ericsson"].map((k) => (
              <tr key={k}>
                <td>{sources[k].label}</td>
                <td>{sources[k].value}</td>
                <td>
                  {sources[k].source}, {sources[k].date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>6.1 Elementos de dimensionamento</h2>
        <h3>6.1.1 Volume de tráfego</h3>
        <table className="data compact">
          <tbody>
            <tr><td>População {t.year}</td><td>{fmt(t.population)} hab. (crescimento {fmt(p.growth, 1)} %/ano)</td></tr>
            <tr><td>Subscritores (penetração {fmt(p.penetration)} %)</td><td>{fmt(t.subscribers)}</td></tr>
            <tr><td>Clientes do operador (quota {fmt(p.marketShare)} %)</td><td>{fmt(t.operatorUsers)}</td></tr>
            <tr><td>Utilizadores LTE ({fmt(p.lteShare)} %)</td><td>{fmt(t.lteUsers)}</td></tr>
            <tr><td>Consumo por utilizador</td><td>{fmt(t.monthlyGB, 1)} GB/mês → {fmt(t.perUserMbps * 1000, 1)} kbit/s na hora de pico ({fmt(p.busyHourShare)} % do dia)</td></tr>
            <tr><td>Voz VoLTE</td><td>{fmt(t.voiceErlangs, 1)} Erl → {t.voiceChannels} canais (Erlang B, {fmt(p.gos, 1)} %) → {fmt(t.voiceMbps, 1)} Mbit/s</td></tr>
            <tr><td><strong>Procura na hora de pico</strong></td><td><strong>{fmt(t.demand, 1)} Mbit/s</strong></td></tr>
            <tr><td>Capacidade útil por BTS</td><td>{fmt(p.bandwidth)} MHz × {fmt(p.efficiency, 1)} bit/s/Hz × {p.sectors} × {fmt(p.maxLoad)} % ÷ {p.reuse} = {fmt(dim.capacity.usable, 1)} Mbit/s</td></tr>
            <tr><td><strong>BTS por capacidade</strong></td><td><strong>{dim.byCapacity}</strong></td></tr>
          </tbody>
        </table>
        <table className="data compact">
          <thead>
            <tr><th>Ano</th>{years.map((y) => <th key={y.year}>{y.year}</th>)}</tr>
          </thead>
          <tbody>
            <tr><td>Procura (Mbit/s)</td>{years.map((y) => <td key={y.year}>{fmt(y.demand)}</td>)}</tr>
            <tr><td>BTS (capacidade)</td>{years.map((y) => <td key={y.year}>{y.sites}</td>)}</tr>
          </tbody>
        </table>

        <h3>6.1.2 Área de serviço</h3>
        <table className="data compact">
          <tbody>
            <tr><td>Frequência / largura de banda</td><td>{fmt(p.frequency)} MHz / {fmt(p.bandwidth)} MHz ({l.nRb} RB)</td></tr>
            <tr><td>PIRE por subportadora</td><td>{fmt(p.power)} dBm − 10·log(12·{l.nRb}) + {fmt(p.gain)} − {fmt(p.cable)} = {fmt(l.reEirp, 1)} dBm</td></tr>
            <tr><td>Margens</td><td>sombreamento {fmt(l.shadowMargin, 1)} dB ({fmt(p.shadowStd)} dB, {fmt(p.edgeProbability)} %) + paredes {fmt(p.indoorLoss)} + interferência {fmt(p.interferenceMargin, 1)} + corpo {fmt(p.bodyLoss, 1)} dB</td></tr>
            <tr><td>MAPL downlink / uplink</td><td>{fmt(l.dl, 1)} dB / {fmt(l.ul, 1)} dB → limita o {l.limiting}</td></tr>
            <tr><td>Modelo de propagação</td><td>{p.frequency <= 1500 ? "Okumura-Hata" : "COST-231 Hata"}, {environments[p.environment].label.toLowerCase()}, hb = {fmt(p.height)} m, hm = {fmt(p.mobileHeight, 1)} m: L = {fmt(l.intercept, 1)} + {fmt(l.slope, 2)}·log d</td></tr>
            <tr><td><strong>Raio da célula</strong></td><td><strong>{fmt(l.radius, 3)} km</strong></td></tr>
            <tr><td>Área por BTS</td><td>{fmt(siteAreaFactor(p.sectors), 2)} × R² = {fmt(dim.siteArea, 2)} km²</td></tr>
            <tr><td><strong>BTS por cobertura</strong></td><td><strong>{dim.byCoverage}</strong> ({fmt(zoneArea, 2)} ÷ {fmt(dim.siteArea, 2)})</td></tr>
            <tr><td><strong>Decisão</strong></td><td><strong>max({dim.byCapacity}, {dim.byCoverage}) = {dim.required} BTS</strong> (limita a {dim.limiting})</td></tr>
          </tbody>
        </table>

        <h3>6.1.3 Padrão de reuso</h3>
        <table className="data compact">
          <thead>
            <tr><th>N</th><th>D/R</th><th>C/I</th><th>Débito por sector</th></tr>
          </thead>
          <tbody>
            {reuseTable(p).map((r) => (
              <tr key={r.n} className={r.n === p.reuse ? "current" : ""}>
                <td>{r.n}</td><td>{fmt(r.q, 2)}</td><td>{fmt(r.ci, 1)} dB</td><td>{fmt(r.perSector, 1)} Mbit/s</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>O projecto usa N = {p.reuse}. O LTE aceita um C/I baixo graças à modulação adaptativa, à sectorização e à coordenação de interferência (ICIC).</p>

        <h3>6.1.4 Localização das BTS</h3>
        <ZoneSketch stations={stations} label="Localização das BTS" />
        <table className="data compact">
          <thead>
            <tr><th>BTS</th><th>Latitude</th><th>Longitude</th><th>Azimutes</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {stations.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td><td>{fmt(b.lat, 5)}</td><td>{fmt(b.lng, 5)}</td>
                <td>{Array.from({ length: p.sectors }, (_, s) => (b.azimuth + (s * 360) / p.sectors) % 360).join("° / ")}°</td>
                <td>{b.enabled ? "activa" : "inactiva"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>6.1.5 Diagrama de cobertura</h3>
        <ZoneSketch
          stations={stations}
          cells={cov.cells.map((c) => ({ ...c, color: classes.find((k) => k.key === c.cls)!.color }))}
          label="Diagrama de cobertura por classes do INCM"
        />
        <ShareBar label="Distribuição da área pelas classes do INCM" share={cov.share} />
        <p>
          Área que cumpre o critério de projecto (RSRP mediano ≥ {fmt(cov.designRsrp, 1)} dBm):{" "}
          <strong>{fmt(cov.designCoverage, 1)} %</strong> (meta {fmt(p.coverageTarget)} %). Área com RSRP mediano ≥ {fmt(p.rsrpMin)} dBm: {fmt(cov.meetsThreshold, 1)} %.
        </p>

        <h3>6.1.6 Teste de campo (previsto)</h3>
        <p>
          Previsão para {dt.samples.length} amostras (uma a cada 50 m) ao longo de {fmt(routeLength(zone.route), 1)} km da N1: {fmt(dt.meets, 1)} % com RSRP ≥ {fmt(p.rsrpMin)} dBm; RSRP entre {fmt(dt.min, 1)} e {fmt(dt.max, 1)} dBm. Não é uma medição.
        </p>
        <ShareBar label="Nossa rede (previsão, N1)" share={dt.share} note="PREVISTO" />
        {incmMarracuene4G.map((o) => (
          <ShareBar key={o.operator} label={`${o.operator} em Marracuene`} share={o} note="REAL, INCM 2023" />
        ))}
      </section>

      <section>
        <h2>6.2 Antenas para sistemas sem fio</h2>
        <h3>6.2.1 Vantagens e aplicações</h3>
        <p>
          Omnidireccionais cobrem 360° com uma só antena (sites rurais); painéis
          sectoriais dão mais ganho e triplicam a capacidade com 3 sectores (macro-células
          LTE, a escolha deste projecto); MIMO de polarização cruzada multiplica o débito;
          parabólicas fazem a transmissão (backhaul) entre sites; antenas activas
          com beamforming servem zonas muito densas (5G).
        </p>
        <h3>6.2.1 Cálculos de parâmetros das antenas</h3>
        <table className="data compact">
          <tbody>
            <tr><td>Comprimento de onda / dipolo λ/2</td><td>{fmt(a.lambda * 100, 2)} cm / {fmt(a.dipole * 100, 2)} cm</td></tr>
            <tr><td>PIRE</td><td>{fmt(a.eirp, 1)} dBm ({fmt(a.eirpW)} W)</td></tr>
            <tr><td>Ganho pelas aberturas {fmt(p.hBeam)}° × {fmt(p.vBeam, 1)}°</td><td>{fmt(a.beamGain, 1)} dBi (declarado {fmt(p.gain)} dBi)</td></tr>
            <tr><td>Tilt óptimo / usado</td><td>{fmt(a.optimalTilt, 1)}° / {fmt(p.tilt, 1)}°</td></tr>
            <tr><td>Feixe principal no solo</td><td>{fmt(a.innerReach, 2)} km a {Number.isFinite(a.outerReach) ? `${fmt(a.outerReach, 2)} km` : "horizonte"}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Conclusões</h2>
        <ol>{list.map((c) => <li key={c}>{c}</li>)}</ol>
        <h3>Limitações</h3>
        <ul>{limitations.map((c) => <li key={c}>{c}</li>)}</ul>
        <h3>Referências</h3>
        <ul className="refs">
          {Object.values(sources).map((s) => (
            <li key={s.id}>{s.source} ({s.date}). {s.label}. {s.url}</li>
          ))}
          {references.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>
    </article>
  );
}
