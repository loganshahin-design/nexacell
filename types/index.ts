export type Environment = "urbano" | "suburbano" | "rural";

export type Params = {
  // 6.1.1 Volume de tráfego
  population: number; // habitantes na zona no ano base
  baseYear: number;
  horizon: number; // anos até ao ano de projecto
  growth: number; // %/ano
  penetration: number; // % subscritores/habitantes
  marketShare: number; // % do operador dimensionado
  lteShare: number; // % dos subscritores do operador com 4G activo
  monthlyGB: number; // GB/mês por utilizador LTE no ano base
  usageGrowth: number; // %/ano do consumo por utilizador
  busyHourShare: number; // % do tráfego diário na hora de pico
  voiceErlang: number; // Erl por utilizador na hora de pico
  gos: number; // % de bloqueio admitido (Erlang B)
  volteRate: number; // kbps por chamada VoLTE
  // Capacidade
  frequency: number; // MHz
  bandwidth: number; // MHz
  efficiency: number; // bit/s/Hz por sector
  sectors: number;
  reuse: number; // factor N
  maxLoad: number; // % de ocupação máxima admitida
  // 6.1.2 Orçamento de enlace
  power: number; // dBm por sector
  gain: number; // dBi
  cable: number; // dB
  height: number; // m
  mobileHeight: number; // m
  environment: Environment;
  rsrpMin: number; // dBm
  shadowStd: number; // dB (desvio-padrão do desvanecimento lento)
  edgeProbability: number; // % na orla da célula
  indoorLoss: number; // dB
  interferenceMargin: number; // dB
  bodyLoss: number; // dB
  ueGain: number; // dBi
  uePower: number; // dBm
  noiseFigure: number; // dB (eNodeB)
  ulSinr: number; // dB
  ulRb: number; // blocos de recursos no UL na orla
  // 6.2 Antenas
  tilt: number; // graus
  hBeam: number; // graus
  vBeam: number; // graus
  coverageTarget: number; // %
};

export type BTS = {
  id: string;
  lat: number;
  lng: number;
  enabled: boolean;
  azimuth: number; // azimute do sector 1; os outros a +120° e +240°
  // Valores próprios (modo avançado). Sem valor usa o parâmetro global.
  height?: number;
  tilt?: number;
  power?: number;
};

export type Mode = "basico" | "avancado";
