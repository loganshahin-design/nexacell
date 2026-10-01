"use client";
import { useProject } from "@/hooks/useProject";
import { reuseTable, clusterShapes, reuseFor } from "@/calculations/reuse";
import { Calc, Callout, Hero, Panel } from "@/components/ui";
import Equation, { mathNumber as n } from "@/components/Equation";
import { fmt } from "@/utils/format";

const palette = ["#0b5fc4", "#b4441c", "#17803a", "#e0ac0c", "#7c4dcc", "#0e9aa7", "#d0457b", "#6b8e23", "#c2410c", "#0f766e", "#4f46e5", "#8a8f98"];

// Grelha hexagonal com a cor de cada grupo de frequências do cluster N.
function ClusterDiagram({ n: N }: { n: number }) {
  const [i, j] = clusterShapes[N];
  const size = 18,
    rings = 4;
  const cells: { q: number; r: number; key: string }[] = [];
  for (let q = -rings; q <= rings; q++)
    for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
      // Coordenadas no reticulado dos co-canais (vectores (i,j) e (−j,i+j)).
      const mod = (x: number) => ((x % N) + N) % N;
      cells.push({ q, r, key: `${mod((i + j) * q + j * r)}:${mod(-j * q + i * r)}` });
    }
  const keys = [...new Set(cells.map((c) => c.key))].sort();
  const centerKey = cells.find((c) => c.q === 0 && c.r === 0)!.key;
  const hex = (x: number, y: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return `${x + size * Math.cos(a)},${y + size * Math.sin(a)}`;
    }).join(" ");
  const w = size * Math.sqrt(3) * (2 * rings + 1) + 8,
    h = size * 1.5 * (2 * rings) + size * 2 + 8;
  return (
    <svg
      className="cluster"
      viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`}
      role="img"
      aria-label={`Padrão de reuso com N = ${N}: ${N} grupos de frequências; as células contornadas usam as mesmas frequências que a célula central.`}
    >
      {cells.map((c) => {
        const x = size * Math.sqrt(3) * (c.q + c.r / 2),
          y = size * 1.5 * c.r;
        const same = c.key === centerKey;
        // Distância em anéis ao centro: as células pintam-se de dentro para fora.
        const ring = (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
        const delay = `${ring * 0.07}s`;
        return (
          <g key={`${c.q},${c.r}`}>
            <polygon
              points={hex(x, y)}
              style={{
                fill: palette[keys.indexOf(c.key) % palette.length],
                fillOpacity: same ? 0.95 : 0.32,
                stroke: same && N > 1 ? "var(--text)" : "var(--surface)",
                strokeWidth: same && N > 1 ? 2.5 : 1,
                transition: `fill .35s ${delay}, fill-opacity .35s ${delay}, stroke .35s ${delay}`,
              }}
            />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="var(--text)">
              {keys.indexOf(c.key) + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Reuse() {
  const { params: p, dim, setParam } = useProject();
  const rows = reuseTable(p);
  const current = reuseFor(p, p.reuse);
  const sitesFor = (perSector: number) =>
    Math.max(1, Math.ceil(dim.traffic.demand / ((perSector * p.sectors * p.maxLoad) / 100)));
  return (
    <>
      <div className="grid-2">
        <div className="stack">
          <Panel title="Escolha o factor de reuso N">
            <div className="choice-row" role="radiogroup" aria-label="Factor de reuso">
              {[1, 3, 4, 7].map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={p.reuse === k}
                  className={`choice ${p.reuse === k ? "on" : ""}`}
                  onClick={() => setParam("reuse", k)}
                >
                  <strong>N = {k}</strong>
                  <small>{k === 1 ? "LTE" : k === 7 ? "GSM clássico" : `i=${clusterShapes[k][0]}, j=${clusterShapes[k][1]}`}</small>
                </button>
              ))}
            </div>
            <ClusterDiagram n={p.reuse} />
            <p className="caption">
              Cada número é um grupo de frequências. As células contornadas usam
              as mesmas frequências da célula central (co-canal).
            </p>
          </Panel>
        </div>
        <div className="stack">
          <Hero label={`Com N = ${p.reuse}`} value={current.perSector} digits={1} unit="Mbit/s por sector">
            Cada célula usa {fmt(p.bandwidth / p.reuse, 1)} MHz dos {fmt(p.bandwidth)} MHz.
            Os co-canais ficam a D = {fmt(current.q, 2)} × R ={" "}
            {fmt(current.q * dim.link.radius, 2)} km, com C/I ≈ {fmt(current.ci, 1)} dB.
            São precisas {sitesFor(current.perSector)} BTS pela capacidade.
          </Hero>
          <Panel title="Comparação">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>N</th>
                    <th>D/R</th>
                    <th>C/I</th>
                    <th>Débito/sector</th>
                    <th>BTS (capacidade)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.n} className={r.n === p.reuse ? "current" : ""}>
                      <td>{r.n}</td>
                      <td>{fmt(r.q, 2)}</td>
                      <td>{fmt(r.ci, 1)} dB</td>
                      <td>{fmt(r.perSector, 1)} Mbit/s</td>
                      <td>{sitesFor(r.perSector)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Callout tone="info" title="Porque o LTE usa N = 1">
            Um N maior afasta os co-canais e melhora o C/I, mas divide a banda por
            N: com N = 7 cada sector teria só {fmt(rows[3].perSector, 1)} Mbit/s. O
            LTE aceita um C/I baixo porque adapta a modulação ao sinal (de QPSK a
            64-QAM), usa 3 sectores e coordena a interferência entre células
            (ICIC). A margem de interferência de {fmt(p.interferenceMargin)} dB no
            dimensionamento cobre esse custo.
          </Callout>
        </div>
      </div>
      <Calc>
        <Equation
          formula={String.raw`N = i^2 + i\,j + j^2`}
          substitution={String.raw`N = ${current.shape[0]}^2 + ${current.shape[0]} \times ${current.shape[1]} + ${current.shape[1]}^2`}
          result={`N = ${p.reuse}`}
          note="i, j: número de células a percorrer em duas direcções a 60° até ao co-canal."
        />
        <Equation
          formula={String.raw`\frac{D}{R} = \sqrt{3N}`}
          substitution={String.raw`\frac{D}{R} = \sqrt{3 \times ${p.reuse}}`}
          result={`${fmt(current.q, 3)} → D = ${fmt(current.q * dim.link.radius, 2)} km`}
        />
        <Equation
          formula={String.raw`\frac{C}{I} = \frac{(D/R)^{\gamma}}{i_0}`}
          substitution={String.raw`\frac{C}{I} = \frac{${n(current.q, 3)}^{${n(current.gamma)}}}{${current.interferers}}`}
          result={`${fmt(current.ci, 2)} dB`}
          note={`γ: expoente de perda (declive de Hata ÷ 10); i0: interferentes da 1.ª coroa (${current.interferers} com ${p.sectors} sectores). O modelo mantém η constante: na prática um N maior subiria um pouco a eficiência, mas não compensa dividir a banda.`}
        />
        <Equation
          formula={String.raw`C_{\mathrm{sector}} = \frac{B}{N}\,\eta`}
          substitution={String.raw`C_{\mathrm{sector}} = \frac{${n(p.bandwidth)}}{${p.reuse}} \times ${n(p.efficiency)}`}
          result={`${fmt(current.perSector, 2)} Mbit/s`}
        />
      </Calc>
    </>
  );
}
