import { calculate, hexArea } from "@/calculations/network";
import { Params } from "@/types";
import { fmt } from "@/utils/format";
import { mathNumber as n } from "@/components/Equation";

export function networkEquations(p: Params, r: ReturnType<typeof calculate>) {
  return [
    {
      title: "Comprimento de onda",
      formula: String.raw`\lambda = \frac{c}{f}`,
      substitution: String.raw`\lambda = \frac{299\,792\,458}{${n(p.frequency)} \times 10^6}`,
      result: `${fmt(r.lambda, 4)} m`,
      note: "c: velocidade da luz (m/s); f: frequência (Hz).",
    },
    {
      title: "Perda em espaço livre",
      formula: String.raw`\begin{aligned}L_{\mathrm{FS}} ={}& 32{,}44 + 20\log_{10}(d)\\ &+20\log_{10}(f)\end{aligned}`,
      substitution: String.raw`\begin{aligned}L_{\mathrm{FS}} ={}& 32{,}44 + 20\log_{10}(${n(p.distance)})\\ &+20\log_{10}(${n(p.frequency)})\end{aligned}`,
      result: `${fmt(r.loss, 2)} dB`,
      note: "d: distância (km); f: frequência (MHz). Perda sem obstáculos.",
    },
    {
      title: "Potência recebida",
      formula: String.raw`\begin{aligned}P_r ={}& P_t + G_t + G_r\\ &-L_{\mathrm{FS}}-L_{\mathrm{cabo}}-L_{\mathrm{outras}}\end{aligned}`,
      substitution: String.raw`\begin{aligned}P_r ={}& ${n(p.power)}+${n(p.gain)}+${n(p.receiveGain)}\\ &-${n(r.loss)}-${n(p.cable)}-${n(p.other)}\end{aligned}`,
      result: `${fmt(r.received, 2)} dBm`,
      note: "P: potência (dBm); G: ganho (dBi); L: perda (dB). Potência total do enlace, distinta de RSRP.",
    },
    {
      title: "Margem do enlace",
      formula: String.raw`M = P_r - S_{\mathrm{rx}}`,
      substitution: String.raw`M = ${n(r.received)} - (${n(p.sensitivity)})`,
      result: `${fmt(r.margin, 2)} dB`,
      note: "Srx: sensibilidade do receptor (dBm). Margem antes da reserva de desvanecimento.",
    },
    {
      title: "Área da célula hexagonal",
      formula: String.raw`A_{\mathrm{hex}} = \frac{3\sqrt{3}}{2}R^2`,
      substitution: String.raw`A_{\mathrm{hex}} = \frac{3\sqrt{3}}{2}\times ${n(p.radius)}^2`,
      result: `${fmt(hexArea(p.radius), 3)} km²`,
      note: "R: raio da célula (km). Geometria hexagonal regular.",
    },
    {
      title: "Dimensionamento por cobertura",
      formula: String.raw`n_{\mathrm{cob}} = \left\lceil\frac{A_s}{A_{\mathrm{hex}}(1-\rho)}\right\rceil`,
      substitution: String.raw`n_{\mathrm{cob}} = \left\lceil\frac{${n(p.area)}}{${n(hexArea(p.radius), 3)}\times ${n(1 - p.overlap / 100, 4)}}\right\rceil`,
      result: `${Math.ceil(p.area / r.useful)} células`,
      note: "As: área de serviço (km²); ρ: reserva de sobreposição em fracção. Arredondamento ao inteiro superior.",
    },
    {
      title: "Dimensionamento por capacidade",
      formula: String.raw`n_{\mathrm{cap}} = \left\lceil\frac{T_d}{B\,\eta\,s/N}\right\rceil`,
      substitution: String.raw`n_{\mathrm{cap}} = \left\lceil\frac{${n(r.demand)}}{${n(p.bandwidth)}\times ${n(p.efficiency)}\times 3/${p.reuse}}\right\rceil`,
      result: `${Math.ceil(r.demand / ((p.bandwidth * p.efficiency * 3) / p.reuse))} BTS`,
      note: "Td: procura (Mbps); B: banda (MHz); η: eficiência (bit/s/Hz); s: 3 sectores por nova BTS; N: factor de reuso.",
    },
  ];
}
