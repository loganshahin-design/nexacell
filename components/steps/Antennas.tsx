"use client";
import { useProject } from "@/hooks/useProject";
import { antennaParameters, horizontalLoss } from "@/calculations/antenna";
import { Calc, Callout, Fields, Hero, Panel, Rows } from "@/components/ui";
import Equation, { mathNumber as n } from "@/components/Equation";
import { fmt } from "@/utils/format";

const types = [
  ["Dipolo λ/2 / monopolo", "Omni em azimute", "2,15 dBi", "Simples e barata; é a referência de ganho (dBd).", "Telemóveis, rádios portáteis."],
  ["Omnidireccional colinear", "360°", "6–11 dBi", "Uma só antena cobre toda a volta.", "Sites rurais de pouca procura, small cells."],
  ["Painel sectorial (65°)", "Sector de 120°", "15–18 dBi", "Mais ganho e mais alcance; 3 sectores triplicam a capacidade; o tilt controla a interferência.", "Macro-células LTE — a escolha deste projecto."],
  ["MIMO de polarização cruzada (±45°)", "Igual ao painel", "15–18 dBi", "Dois ou quatro fluxos em paralelo: mais débito e mais robustez ao desvanecimento.", "LTE 2×2 / 4×4, 5G."],
  ["Yagi-Uda", "Directiva", "10–15 dBi", "Directiva, leve e barata.", "Repetidores, clientes fixos em zonas remotas."],
  ["Parabólica (micro-ondas)", "Feixe muito estreito", "30–45 dBi", "Ligações ponto-a-ponto de muitos km.", "Transmissão (backhaul) entre as BTS e a rede."],
  ["Antena activa / beamforming", "Feixes adaptáveis", "20–25 dBi", "Aponta feixes a cada utilizador; muita capacidade em zonas densas.", "5G massive MIMO."],
];

function HorizontalDiagram({ beam, sectors, azimuth }: { beam: number; sectors: number; azimuth: number }) {
  const R = 90;
  const colors = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];
  const path = (center: number) =>
    Array.from({ length: 361 }, (_, k) => {
      const a = k - 180;
      const g = -horizontalLoss(Math.abs(a), beam);
      const r = ((25 + g) / 25) * R;
      const t = ((center + a - 90) * Math.PI) / 180;
      return `${k ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)},${(r * Math.sin(t)).toFixed(1)}`;
    }).join(" ");
  return (
    <svg viewBox="-110 -110 220 220" className="diagram" role="img" aria-label={`Diagrama horizontal: ${sectors} sectores com abertura de ${beam}°`}>
      {[1, 0.6, 0.2].map((f) => (
        <circle key={f} r={R * f} fill="none" stroke="var(--line)" />
      ))}
      <text x="0" y={-R - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">N</text>
      {Array.from({ length: sectors }, (_, s) => (
        <path key={s} d={path(azimuth + (s * 360) / sectors)} fill={colors[s % 6]} fillOpacity={0.18} stroke={colors[s % 6]} strokeWidth={2} />
      ))}
      <text x="0" y={R + 16} textAnchor="middle" fontSize="9" fill="var(--muted)">anéis: 0, −10, −20 dB</text>
    </svg>
  );
}

function VerticalDiagram({
  h,
  hm,
  tilt,
  vBeam,
  radius,
}: {
  h: number;
  hm: number;
  tilt: number;
  vBeam: number;
  radius: number;
}) {
  const maxKm = Math.max(radius * 1.6, 1);
  const W = 320,
    H = 150,
    ground = 130,
    x0 = 20;
  const sx = (km: number) => x0 + (km / maxKm) * (W - x0 - 10);
  const sy = (m: number) => ground - (m / h) * 90;
  const ray = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    const km = deg > 0 ? Math.min((h - hm) / Math.tan(rad) / 1000, maxKm) : maxKm;
    const m = deg > 0 && km < maxKm ? hm : h - Math.tan(rad) * maxKm * 1000;
    return `M${sx(0)},${sy(h)} L${sx(km)},${sy(Math.max(m, 0))}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="diagram wide" role="img" aria-label={`Corte vertical: tilt de ${tilt}° e abertura de ${vBeam}°`}>
      <line x1={x0} x2={W - 10} y1={ground} y2={ground} stroke="var(--muted)" />
      <line x1={sx(0)} x2={sx(0)} y1={ground} y2={sy(h)} stroke="var(--text)" strokeWidth={3} />
      <path d={ray(tilt - vBeam / 2)} stroke="var(--accent)" strokeDasharray="4 3" fill="none" />
      <path d={ray(tilt)} stroke="var(--accent)" strokeWidth={2.5} fill="none" />
      <path d={ray(tilt + vBeam / 2)} stroke="var(--accent)" strokeDasharray="4 3" fill="none" />
      <line x1={sx(radius)} x2={sx(radius)} y1={ground - 6} y2={ground + 6} stroke="var(--bad)" strokeWidth={2} />
      <text x={sx(radius)} y={ground + 17} textAnchor="middle" fontSize="10" fill="var(--bad)">R = {fmt(radius, 2)} km</text>
      <text x={sx(0) + 5} y={sy(h) - 4} fontSize="10" fill="var(--text)">{h} m</text>
      <text x={W - 10} y={ground - 5} textAnchor="end" fontSize="10" fill="var(--muted)">{fmt(maxKm, 1)} km</text>
    </svg>
  );
}

export default function Antennas() {
  const { params: p, dim, setParam } = useProject();
  const a = antennaParameters(p, dim.link.radius);
  const optimal = Math.round(a.optimalTilt * 2) / 2;
  return (
    <>
      <Panel title="6.2.1 Vantagens e aplicações das antenas">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cobertura</th>
                <th>Ganho típico</th>
                <th>Vantagens</th>
                <th>Aplicações</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t[0]} className={t[0].startsWith("Painel") ? "current" : ""}>
                  {t.map((c, i) => (
                    <td key={i}>{i === 0 ? <strong>{c}</strong> : c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout tone="info" title="A nossa escolha: painel sectorial MIMO 2×2 de 65°">
          Três painéis por BTS, a 120° uns dos outros. O ganho de {fmt(p.gain)} dBi
          aumenta o raio (6.1.2), os três sectores triplicam a capacidade (6.1.1) e
          o tilt eléctrico limita a interferência entre células vizinhas (6.1.3).
        </Callout>
      </Panel>

      <h2 className="section-title">6.2.1 Cálculos de parâmetros das antenas</h2>
      <div className="grid-2">
        <div className="stack">
          <Panel title="Parâmetros">
            <Fields names={["gain", "hBeam", "vBeam", "tilt", "height", "power"]} />
          </Panel>
          <Hero label="Tilt óptimo" value={fmt(a.optimalTilt, 1)} unit="°">
            Aponta o limite superior do feixe (−3 dB) à orla da célula, a{" "}
            {fmt(dim.link.radius, 2)} km. Tilt actual: {fmt(p.tilt, 1)}°.
          </Hero>
          {Math.abs(p.tilt - optimal) >= 0.5 && (
            <button className="btn primary" onClick={() => setParam("tilt", optimal)}>
              Aplicar tilt de {fmt(optimal, 1)}°
            </button>
          )}
        </div>
        <div className="stack">
          <Panel title="Resultados">
            <Rows
              rows={[
                ["Comprimento de onda λ", `${fmt(a.lambda * 100, 2)} cm`],
                ["Dipolo de meia onda λ/2", `${fmt(a.dipole * 100, 2)} cm`],
                ["Potência por sector", `${fmt(p.power)} dBm = ${fmt(a.powerW, 1)} W`],
                ["PIRE (potência isotrópica radiada equivalente)", `${fmt(a.eirp, 1)} dBm = ${fmt(a.eirpW)} W`],
                ["Ganho estimado pelas aberturas", `${fmt(a.beamGain, 1)} dBi (declarado: ${fmt(p.gain)} dBi)`],
                ["Ângulo até à orla da célula", `${fmt(a.edgeAngle, 2)}°`],
                ["Feixe toca o solo (centro)", Number.isFinite(a.mainReach) ? `${fmt(a.mainReach, 2)} km` : "não toca (tilt 0°)"],
                ["Zona do feixe principal (−3 dB)", `${fmt(a.innerReach, 2)} a ${Number.isFinite(a.outerReach) ? `${fmt(a.outerReach, 2)} km` : "horizonte"}`],
              ]}
            />
          </Panel>
          <Panel title="Diagramas">
            <div className="diagrams">
              <figure>
                <HorizontalDiagram beam={p.hBeam} sectors={p.sectors} azimuth={0} />
                <figcaption>Horizontal (vista de cima)</figcaption>
              </figure>
              <figure>
                <VerticalDiagram h={p.height} hm={p.mobileHeight} tilt={p.tilt} vBeam={p.vBeam} radius={dim.link.radius} />
                <figcaption>Vertical (corte lateral): feixe e limites a −3 dB</figcaption>
              </figure>
            </div>
          </Panel>
        </div>
      </div>
      <Calc>
        <Equation
          formula={String.raw`\lambda = \frac{c}{f}`}
          substitution={String.raw`\lambda = \frac{3 \times 10^8}{${n(p.frequency)} \times 10^6}`}
          result={`${fmt(a.lambda, 4)} m`}
        />
        <Equation
          formula={String.raw`\mathrm{PIRE} = P_{\mathrm{tx}} + G - L_{\mathrm{cabo}}`}
          substitution={String.raw`\mathrm{PIRE} = ${n(p.power)} + ${n(p.gain)} - ${n(p.cable)}`}
          result={`${fmt(a.eirp, 1)} dBm = ${fmt(a.eirpW)} W`}
          note="W = 10^((dBm − 30)/10)."
        />
        <Equation
          formula={String.raw`G \approx 10\log_{10}\frac{41\,253}{\theta_H\,\theta_V}`}
          substitution={String.raw`G \approx 10\log_{10}\frac{41\,253}{${n(p.hBeam)} \times ${n(p.vBeam)}}`}
          result={`${fmt(a.beamGain, 2)} dBi`}
          note="41 253 = número de graus quadrados de uma esfera; a antena real perde 1–2 dB em eficiência."
        />
        <Equation
          formula={String.raw`\theta_{\mathrm{tilt}} = \arctan\frac{h_b - h_m}{R} + \frac{\theta_V}{2}`}
          substitution={String.raw`\theta_{\mathrm{tilt}} = \arctan\frac{${n(p.height)} - ${n(p.mobileHeight)}}{${n(dim.link.radius * 1000, 0)}} + \frac{${n(p.vBeam)}}{2}`}
          result={`${fmt(a.optimalTilt, 2)}°`}
        />
        <Equation
          formula={String.raw`d = \frac{h_b - h_m}{\tan\theta}`}
          substitution={String.raw`d_{\mathrm{centro}} = \frac{${n(p.height - p.mobileHeight)}}{\tan ${n(p.tilt)}^\circ}`}
          result={Number.isFinite(a.mainReach) ? `${fmt(a.mainReach, 3)} km` : "∞"}
          note="Distância a que uma direcção do feixe toca o solo (altura do terminal)."
        />
      </Calc>
    </>
  );
}
