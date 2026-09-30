"use client";
import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  AudioLines,
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  FlaskConical,
  Globe,
  Layers,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Plus,
  Radio,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Sun,
  Users,
  Wifi,
  X,
  Zap,
  Trash2,
  Play,
  Calculator,
} from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { calculate, distance } from "@/calculations/network";
import { defaults, center } from "@/data/defaults";
import { BTS, Params, FieldPoint } from "@/types";
import { fmt } from "@/utils/format";
import { TrafficChart, Bars } from "./Charts";
import Twin from "./Twin";
import { scenario } from "@/data/scenario";
import ProjectReport from "./ProjectReport";
import Equation, { mathNumber as mn } from "./Equation";
import { networkEquations } from "@/data/equations";
import { AccountMenu } from "./auth/Access";
import PeoplePlanning, { CommunityReport } from "./community/PeoplePlanning";
import { useCommunity } from "@/hooks/useCommunity";
const NetworkMap = dynamic(() => import("./NetworkMap"), {
  ssr: false,
  loading: () => <div className="map-shell skeleton">A carregar o mapa…</div>,
});
const navigation = [
  ["Dashboard", LayoutDashboard],
  ["Rede para as pessoas", Users],
  ["Área de Serviço", MapPin],
  ["Volume de Tráfego", Activity],
  ["Planeamento BTS", RadioTower],
  ["Cobertura", Wifi],
  ["Padrão de Reuso", Layers],
  ["Antenas", Radio],
  ["Cálculos", Calculator],
  ["Teste de Campo", Compass],
  ["Simulação", FlaskConical],
  ["Relatório", FileText],
] as const;
const meta: Record<string, [string, string]> = {
  "Rede para as pessoas": [
    "Rede para as pessoas",
    "Cada comunidade conta. Cada decisão tem impacto.",
  ],
  Dashboard: ["Visão geral da rede", "Marracuene · Planeamento LTE"],
  "Área de Serviço": [
    "Área de serviço",
    "Território, população e procura estimada.",
  ],
  "Volume de Tráfego": [
    "Volume de tráfego",
    "Da procura dos utilizadores à capacidade da rede.",
  ],
  "Planeamento BTS": [
    "Planeamento das BTS",
    "Posicione, configure e explore as suas estações.",
  ],
  Cobertura: ["Análise de cobertura", "Cobertura geométrica e sobreposição."],
  "Padrão de Reuso": [
    "Padrão de reuso",
    "Explore a organização dos recursos de frequência.",
  ],
  Antenas: ["Antenas e sectorização", "Parâmetros e sectorização."],
  Cálculos: ["Central de cálculos", "Dimensionamento e parâmetros de rádio."],
  "Teste de Campo": [
    "Teste de campo",
    "Medições de campo e resultados do cenário.",
  ],
  Simulação: ["Simulação da rede", "Parâmetros e resultados."],
  Relatório: ["Relatório do projecto", "Todo o planeamento, num documento."],
  Configurações: [
    "Configurações do projecto",
    "Parâmetros partilhados por todos os módulos.",
  ],
  Início: ["NexaCell", "Planeamento de redes móveis."],
};
const fields: Record<keyof Params, [string, string, number, number, number]> = {
  area: ["Área de estudo", "km²", 0.1, 1000, 0.1],
  population: ["População considerada", "hab.", 1, 10000000, 100],
  penetration: ["Penetração móvel", "%", 0, 100, 1],
  active: ["Utilização simultânea", "%", 0, 100, 1],
  growth: ["Crescimento anual", "%", 0, 100, 1],
  frequency: ["Frequência", "MHz", 100, 100000, 100],
  bandwidth: ["Largura de banda", "MHz", 1.4, 100, 0.1],
  height: ["Altura da BTS", "m", 1, 300, 1],
  mobileHeight: ["Altura do terminal", "m", 0.1, 50, 0.1],
  gain: ["Ganho da antena", "dBi", 0, 40, 0.5],
  power: ["Potência de transmissão", "dBm", 0, 60, 1],
  cable: ["Perdas de cabo/conectores", "dB", 0, 30, 0.5],
  sensitivity: ["Sensibilidade", "dBm", -140, -30, 1],
  fade: ["Margem de desvanecimento", "dB", 0, 40, 1],
  other: ["Outras perdas / obstáculos", "dB", 0, 100, 1],
  receiveGain: ["Ganho do receptor", "dBi", -10, 30, 1],
  distance: ["Distância do enlace", "km", 0.01, 100, 0.1],
  radius: ["Raio geométrico de referência", "km", 0.1, 20, 0.05],
  overlap: ["Reserva de sobreposição", "%", 0, 90, 1],
  efficiency: ["Eficiência espectral assumida", "bit/s/Hz", 0.1, 10, 0.1],
  demand: ["Débito por utilizador activo", "Mbps", 0.01, 100, 0.01],
  calls: ["Chamadas na hora de pico", "cham./util.", 0, 30, 0.1],
  duration: ["Duração média da chamada", "s", 1, 3600, 10],
  reuse: ["Factor de reuso N", "", 1, 7, 1],
  tilt: ["Tilt eléctrico", "°", 0, 30, 1],
  horizontal: ["Abertura horizontal", "°", 1, 360, 1],
  vertical: ["Abertura vertical", "°", 1, 90, 1],
};
function Panel({
  title,
  tag,
  children,
  className = "",
}: {
  title: string;
  tag?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h3>{title}</h3>
        {tag && <span className="subtle-tag">{tag}</span>}
      </div>
      {children}
    </section>
  );
}
function Metric({
  label,
  value,
  unit,
  icon: Icon,
  note,
  color = "cyan",
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof Activity;
  note: string;
  color?: string;
}) {
  return (
    <div className={`metric ${color}`}>
      <div className="metric-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <div className="metric-number">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-note">
        <span className="tiny-dot" />
        {note}
      </div>
      <svg className="sparkline" viewBox="0 0 100 25">
        <path
          d="M0 23 L12 18 L22 20 L33 11 L43 15 L56 7 L67 10 L80 4 L90 7 L100 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
export default function Workspace() {
  const {
    plan: community,
    setPlan: setCommunity,
    error: communityError,
  } = useCommunity();
  const {
    params: p,
    setParams,
    stations,
    setStations,
    points,
    setPoints,
    theme,
    setTheme,
    loaded,
    storageError,
  } = useProject();
  const [page, setPage] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState("Ainda não executada");
  const [snapshot, setSnapshot] = useState<ReturnType<typeof calculate> | null>(
    null,
  );
  const [pointModal, setPointModal] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("Todos");
  const [i, setI] = useState(1);
  const [j, setJ] = useState(0);
  const r = useMemo(() => calculate(p, stations), [p, stations]);
  const selectedBTS = stations.find((b) => b.id === selected);
  useEffect(() => {
    if (!selected && !pointModal) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = document.querySelector<HTMLElement>(".drawer");
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
        setPointModal(false);
      }
      if (event.key === "Tab") {
        const elements = focusables(),
          first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [selected, pointModal]);
  useEffect(() => {
    const read = () => {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (meta[hash]) setPage(hash);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  function go(name: string) {
    setPage(name);
    location.hash = encodeURIComponent(name);
    setMobile(false);
    setSearch("");
  }
  function change(key: keyof Params, value: number) {
    if (Number.isFinite(value))
      setParams((prev) => ({
        ...prev,
        [key]: Math.max(fields[key][2], Math.min(fields[key][3], value)),
      }));
  }
  function inputs(keys: (keyof Params)[]) {
    return (
      <div className="form-grid">
        {keys.map((key) => (
          <label className="field" key={key} title={scenario.tooltip}>
            <span>
              {fields[key][0]} <small>{fields[key][1]}</small>
            </span>
            <input
              type="number"
              min={fields[key][2]}
              max={fields[key][3]}
              step={fields[key][4]}
              value={p[key]}
              onChange={(e) => change(key, +e.target.value)}
            />
          </label>
        ))}
      </div>
    );
  }
  function addBTS(lat = center[0], lng = center[1]) {
    const id = `BTS-${String(Math.max(0, ...stations.map((b) => Number(b.id.split("-")[1]) || 0)) + 1).padStart(2, "0")}`;
    setStations([
      ...stations,
      {
        id,
        lat,
        lng,
        height: p.height,
        power: p.power,
        frequency: p.frequency,
        gain: p.gain,
        sectors: 3,
        azimuth: 0,
        tilt: p.tilt,
        radius: p.radius,
        enabled: true,
      },
    ]);
    setSelected(id);
    setToast("BTS adicionada ao cenário");
  }
  function updateBTS(id: string, patch: Partial<BTS>) {
    setStations((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  }
  function optimise() {
    const side = Math.sqrt(p.area),
      cols = Math.ceil(Math.sqrt(stations.length));
    setStations(
      stations.map((b, index) => ({
        ...b,
        lat:
          center[0] +
          (((Math.floor(index / cols) + 0.5) /
            Math.ceil(stations.length / cols) -
            0.5) *
            side) /
            111.32,
        lng:
          center[1] +
          ((((index % cols) + 0.5) / cols - 0.5) * side) /
            (111.32 * Math.cos((center[0] * Math.PI) / 180)),
      })),
    );
    setToast("Distribuição em grelha aplicada.");
  }
  function run() {
    setRunning(true);
    setTimeout(() => {
      setSnapshot(calculate(p, stations));
      setRunning(false);
      setLastRun(new Date().toLocaleTimeString("pt-PT"));
      setToast("Simulação concluída com os parâmetros actuais");
    }, 850);
  }
  const map = (large = false) => (
    <NetworkMap
      stations={stations}
      points={points}
      area={p.area}
      onSelect={setSelected}
      onMove={(id, lat, lng) => updateBTS(id, { lat, lng })}
      onAdd={addBTS}
      large={large}
    />
  );
  const stats = (
    <div className="metrics">
      <Metric
        label="ÁREA DE SERVIÇO"
        value={fmt(p.area, 1)}
        unit="km²"
        icon={MapPin}
        note="Marracuene · Simulação"
      />
      <Metric
        label="UTILIZADORES ESTIMADOS"
        value={fmt(r.users)}
        icon={Users}
        note={`${p.penetration}% de penetração móvel`}
        color="violet"
      />
      <Metric
        label="BTS PLANEADAS"
        value={fmt(stations.length).padStart(2, "0")}
        icon={RadioTower}
        note={`${r.required} recomendadas · ${stations.filter((b) => b.enabled).length} activas`}
        color="blue"
      />
      <Metric
        label="COBERTURA ESTIMADA"
        value={fmt(r.coverage, 1)}
        unit="%"
        icon={Wifi}
        note="Estimativa geométrica"
        color="green"
      />
    </div>
  );
  const networkState = (
    <Panel title="Estado da rede" tag="SIMULAÇÃO">
      <div className="network-status">
        <span className="status-orbit">
          <ShieldCheck size={25} />
        </span>
        <div>
          <b>Cenário de planeamento</b>
          <small>
            {stations.filter((b) => b.enabled).length} estações activas na
            simulação
          </small>
        </div>
      </div>
      {[
        ["Cobertura geométrica", r.coverage, `${fmt(r.coverage, 1)}%`],
        ["Ocupação da capacidade", Math.min(r.load, 100), `${fmt(r.load, 1)}%`],
        ["Sobreposição geométrica", r.overlap, `${fmt(r.overlap, 1)}%`],
      ].map(([label, v, text]) => (
        <div className="progress-row" key={label}>
          <div>
            <span>{label}</span>
            <b>{text}</b>
          </div>
          <div className="progress-track">
            <span style={{ width: `${v}%` }} />
          </div>
        </div>
      ))}
      <div className="status-foot">
        <span>Interferência / disponibilidade</span>
        <b>Não modeladas</b>
      </div>
    </Panel>
  );
  return (
    <div
      className={`app ${collapsed ? "collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
    >
      <aside className="sidebar">
        <button className="brand" onClick={() => go("Início")}>
          <span className="brand-icon">
            <AudioLines />
          </span>
          <span>
            Nexa<span className="brand-light">Cell</span>
            <small>NETWORK PLANNING</small>
          </span>
        </button>
        <div className="project-switch">
          <span className="project-icon">
            <Globe size={18} />
          </span>
          <div>
            {scenario.shortName}
            <small>Província de Maputo</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <div className="nav-caption">ESPAÇO DE TRABALHO</div>
        <nav>
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              title={name}
              aria-label={name}
              className={page === name ? "active" : ""}
              onClick={() => go(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Simulação" && <span className="new-tag">LAB</span>}
              {page === name && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            title="Utilizadores"
            aria-label="Utilizadores"
            onClick={() => {
              setAccountOpen(true);
              setMobile(false);
            }}
          >
            <Users size={18} />
            <span>Utilizadores</span>
          </button>
          <button onClick={() => go("Configurações")}>
            <Settings size={18} />
            <span>Configurações</span>
          </button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
            <span className="theme-switch" />
          </button>
          <div className="sidebar-footer">
            <span className="live-dot" /> NexaCell v1.0{" "}
            <button
              aria-label="Recolher menu"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight size={15} />
              ) : (
                <ChevronLeft size={15} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-toggle"
              aria-label="Abrir menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Espaço de trabalho</span>
            <ChevronRight size={13} />
            <b>{page}</b>
          </div>
          <div className="top-actions">
            <span className="technology">
              <span className="live-dot" />
              4G LTE
            </span>
            <span className="simulation-badge">
              <FlaskConical size={12} /> Simulação
            </span>
            <button
              aria-label="Notificações"
              onClick={() => setNotifications(!notifications)}
              className="notification-btn"
            >
              <Bell size={18} />
              <i />
            </button>
            <AccountMenu open={accountOpen} onOpenChange={setAccountOpen} />
          </div>
          {notifications && (
            <div className="notification-popover">
              <b>Centro de notificações</b>
              <p>Todos os resultados são de projecto ou simulação.</p>
              <p>Última simulação: {lastRun}</p>
              <p>
                {storageError
                  ? "Não foi possível guardar localmente."
                  : "Alterações guardadas neste navegador."}
              </p>
            </div>
          )}
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> MOBILE NETWORK PLANNING SYSTEM
              </div>
              <h1>{meta[page][0]}</h1>
              <p>{meta[page][1]}</p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                onClick={() => go("Relatório")}
              >
                <ArrowDownToLine size={15} />
                Exportar relatório
              </button>
              <button
                className="button primary"
                onClick={() => {
                  go("Simulação");
                  run();
                }}
              >
                <Play size={14} fill="currentColor" />
                Nova simulação
              </button>
            </div>
          </div>
          {communityError && (
            <div className="notice">
              Não foi possível guardar o planeamento comunitário neste
              navegador.
            </div>
          )}
          {page === "Rede para as pessoas" && (
            <PeoplePlanning
              params={p}
              stations={stations}
              points={points}
              plan={community}
              setPlan={setCommunity}
              setStations={setStations}
              onSelect={setSelected}
              onAdd={addBTS}
            />
          )}
          {page === "Dashboard" && (
            <>
              <section className="hero">
                <div className="hero-content">
                  <span className="hero-pill">
                    <span className="live-dot" /> CONECTAR PESSOAS. PLANEAR O
                    FUTURO.
                  </span>
                  <h2>
                    Rede móvel 4G LTE
                    <br />
                    <span>Marracuene</span>
                  </h2>
                  <p>
                    Planeamento de Rede · 4G LTE
                    <br />
                    Marracuene, Província de Maputo
                  </p>
                  <div className="hero-bottom">
                    <button
                      className="button hero-button"
                      onClick={() => go("Rede para as pessoas")}
                    >
                      Explorar projecto <ArrowRight size={15} />
                    </button>
                    <span>
                      <MapPin size={13} />
                      {Math.abs(center[0]).toFixed(5)}° S ·{" "}
                      {center[1].toFixed(5)}° E
                    </span>
                  </div>
                </div>
                <div className="hero-visual">
                  <Twin
                    stations={stations.slice(0, 3)}
                    onSelect={setSelected}
                  />
                  <span className="floating-chip chip-one">
                    <Signal size={16} />
                    4G LTE <i />
                  </span>
                  <span className="floating-chip chip-two">
                    <Radio size={15} />
                    {p.frequency} MHz
                  </span>
                </div>
              </section>
              {stats}
              <div className="dashboard-grid">
                <Panel
                  title="Mapa de planeamento"
                  tag="MARRACUENE"
                  className="map-panel"
                >
                  <div className="panel-subtitle">
                    Estações base e área de estudo.
                    <button onClick={() => go("Planeamento BTS")}>
                      Expandir mapa ↗
                    </button>
                  </div>
                  {map()}
                  <div className="map-footer">
                    <span>
                      <span className="live-dot" />
                      {stations.length} BTS planeadas
                    </span>
                    <span>Cobertura geométrica</span>
                  </div>
                </Panel>
                {networkState}
              </div>
              <div className="dashboard-lower">
                <Panel title="Tráfego na hora de pico" tag="PERFIL SIMULADO">
                  <div className="chart-total">
                    {fmt(r.traffic, 1)} <small>Erlangs</small>
                    <span>Tráfego de voz</span>
                  </div>
                  <TrafficChart peak={r.traffic} />
                </Panel>
                <Panel title="Capacidade da rede" tag="LTE">
                  <div className="capacity-content">
                    <div
                      className="donut"
                      style={{
                        background: `conic-gradient(#22d3ee 0 ${Math.min(r.load, 100)}%,var(--line) ${Math.min(r.load, 100)}% 100%)`,
                      }}
                    >
                      <div>
                        <strong>
                          {fmt(r.load)}
                          <small>%</small>
                        </strong>
                        <span>OCUPAÇÃO</span>
                      </div>
                    </div>
                    <div className="capacity-details">
                      <span>
                        <i />
                        Capacidade estimada<b>{fmt(r.capacity)} Mbps</b>
                      </span>
                      <span>
                        <i />
                        Procura simultânea<b>{fmt(r.demand, 1)} Mbps</b>
                      </span>
                      <span>
                        <i />
                        Utilizadores activos<b>{fmt(r.active)}</b>
                      </span>
                    </div>
                  </div>
                  <div className="info-strip">
                    Eficiência assumida: {p.efficiency} bit/s/Hz por sector
                  </div>
                </Panel>
                <Panel title="Parâmetros actuais" tag="PROJECTO">
                  <div className="parameter-list">
                    {[
                      ["Frequência", `${p.frequency} MHz`],
                      ["Largura de banda", `${p.bandwidth} MHz`],
                      ["Potência de transmissão", `${p.power} dBm`],
                      ["Margem do enlace", `${fmt(r.margin, 1)} dB`],
                      ["Última simulação", lastRun],
                    ].map(([a, b]) => (
                      <div key={a}>
                        <span>{a}</span>
                        <b>{b}</b>
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-link"
                    onClick={() => go("Configurações")}
                  >
                    Configurar parâmetros <ArrowRight size={13} />
                  </button>
                </Panel>
              </div>
            </>
          )}
          {page === "Início" && (
            <>
              <section className="landing">
                <span className="hero-pill">
                  O FUTURO COMEÇA COM UMA LIGAÇÃO
                </span>
                <h2>
                  Nexa<span>Cell</span>
                </h2>
                <h3>Planeamento de redes móveis.</h3>
                <p>
                  Dimensionamento, cobertura, tráfego, BTS e análise de
                  desempenho numa única plataforma.
                </p>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => go("Dashboard")}
                  >
                    Explorar Projecto <ArrowRight size={16} />
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => go("Simulação")}
                  >
                    Ver Simulação
                  </button>
                </div>
                <Twin stations={stations} onSelect={setSelected} />
              </section>
              {stats}
            </>
          )}
          {page === "Área de Serviço" && (
            <>
              <div className="two-columns">
                <Panel title="Parâmetros do Cenário" tag="SIMULAÇÃO">
                  {inputs([
                    "area",
                    "population",
                    "penetration",
                    "active",
                    "growth",
                  ])}
                  <div className="form-grid" style={{ marginTop: 16 }}>
                    <label className="field" title={scenario.tooltip}>
                      Utilizadores potenciais
                      <input
                        type="number"
                        min={0}
                        max={p.population}
                        value={Math.round(r.users)}
                        onChange={(e) =>
                          change(
                            "penetration",
                            (Math.max(
                              0,
                              Math.min(p.population, +e.target.value),
                            ) /
                              p.population) *
                              100,
                          )
                        }
                      />
                    </label>
                    <label className="field" title={scenario.tooltip}>
                      Utilizadores activos na hora de pico
                      <input
                        type="number"
                        min={0}
                        max={Math.round(r.users)}
                        value={Math.round(r.active)}
                        onChange={(e) =>
                          change(
                            "active",
                            r.users
                              ? (Math.max(
                                  0,
                                  Math.min(r.users, +e.target.value),
                                ) /
                                  r.users) *
                                  100
                              : 0,
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="info-strip">
                    Densidade: {fmt(p.population / p.area)} hab./km² · Cenário
                    urbano/periurbano.
                  </div>
                </Panel>
                <Panel title="Crescimento estimado" tag="5 ANOS">
                  <Bars
                    data={Array.from({ length: 6 }, (_, n) => ({
                      name: `Ano ${n}`,
                      value: Math.round(r.users * (1 + p.growth / 100) ** n),
                    }))}
                  />
                  <Equation
                    formula={String.raw`U(t)=U_0\left(1+\frac{g}{100}\right)^t`}
                    note="U₀: utilizadores no ano inicial; g: crescimento anual (%); t: anos. Distribuição populacional uniforme."
                  />
                </Panel>
              </div>
            </>
          )}
          {page === "Volume de Tráfego" && (
            <div className="two-columns">
              <Panel title="Calculadora de tráfego" tag="VOZ / ERLANG">
                {inputs([
                  "population",
                  "penetration",
                  "calls",
                  "duration",
                  "active",
                  "demand",
                ])}
                <Equation
                  formula={String.raw`A_{\mathrm{voz}}=\frac{U\,n_c\,t_c}{3600}`}
                  substitution={String.raw`A_{\mathrm{voz}}=\frac{${mn(r.users)}\times ${mn(p.calls)}\times ${mn(p.duration)}}{3600}`}
                  result={`${fmt(r.traffic, 2)} Erl`}
                  note="U: utilizadores; nc: chamadas por utilizador na hora de pico; tc: duração média da chamada (s)."
                />
                <p className="muted">
                  Tráfego por utilizador:{" "}
                  {fmt((p.calls * p.duration) / 3600, 3)} Erl. O tráfego de voz
                  é distinto da procura de dados: {fmt(r.demand, 1)} Mbps para{" "}
                  {fmt(r.active)} utilizadores simultâneos.
                </p>
              </Panel>
              <Panel title="Tráfego ao longo do dia" tag="SIMULAÇÃO">
                <TrafficChart peak={r.traffic} />
                <p className="muted">
                  Perfil simulado a partir do tráfego na hora de pico.
                </p>
                <Bars
                  data={stations
                    .filter((b) => b.enabled)
                    .flatMap((b) =>
                      Array.from({ length: b.sectors }, (_, s) => ({
                        name: `${b.id}/${s + 1}`,
                        value: Math.round(
                          r.users /
                            Math.max(
                              1,
                              stations
                                .filter((x) => x.enabled)
                                .reduce((a, x) => a + x.sectors, 0),
                            ),
                        ),
                      })),
                    )}
                />
                <p className="muted">
                  Utilizadores por sector: distribuição uniforme assumida.
                </p>
              </Panel>
            </div>
          )}
          {page === "Planeamento BTS" && (
            <>
              <div className="toolbar">
                <span>
                  {stations.length} estações no projecto · recomendação:{" "}
                  {r.required}
                </span>
                <div className="button-row">
                  <button className="button secondary" onClick={optimise}>
                    <Zap size={15} />
                    Optimizar distribuição
                  </button>
                  <button className="button primary" onClick={() => addBTS()}>
                    <Plus size={16} />
                    Adicionar BTS
                  </button>
                </div>
              </div>
              {map(true)}
              <div className="station-grid">
                {stations.map((b, index) => (
                  <button
                    className="station-card panel"
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                  >
                    <div>
                      <span className={`station-icon c${index % 3}`}>
                        <RadioTower size={22} />
                      </span>
                      <b>{b.id}</b>
                      <span className="subtle-tag">
                        {b.enabled ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p>
                      {b.lat.toFixed(5)}, {b.lng.toFixed(5)}
                    </p>
                    <div className="station-values">
                      <span>{b.sectors} sectores</span>
                      <span>{b.height} m</span>
                      <span>{b.power} dBm</span>
                      <span>{b.gain} dBi</span>
                      <span>{b.frequency} MHz</span>
                      <span>{b.radius} km</span>
                    </div>
                    <small>
                      Editar estação <ArrowRight size={12} />
                    </small>
                  </button>
                ))}
              </div>
              {!stations.length && (
                <div className="empty-state">
                  Sem BTS. Adicione uma estação para começar o planeamento.
                </div>
              )}
              <p className="muted">
                Distribuição em grelha, sem modelação de relevo, edifícios ou
                interferência.
              </p>
            </>
          )}
          {page === "Cobertura" && (
            <>
              <div className="two-columns coverage-overview">
                <Panel title="Mapa de cobertura" tag="GEOMÉTRICA">
                  {map()}
                </Panel>
                <Panel title="Indicadores de cobertura" tag="ESTIMATIVA">
                  <div className="parameter-list">
                    <div>
                      <span>Área coberta</span>
                      <strong>{fmt(r.servedArea, 2)} km²</strong>
                    </div>
                    <div>
                      <span>Cobertura</span>
                      <strong>{fmt(r.coverage, 1)}%</strong>
                    </div>
                    <div>
                      <span>Sobreposição</span>
                      <strong>{fmt(r.overlap, 1)}%</strong>
                    </div>
                    <div>
                      <span>Área sem cobertura</span>
                      <strong>{fmt(p.area - r.servedArea, 2)} km²</strong>
                    </div>
                  </div>
                  <p className="muted">
                    Amostragem geométrica de 60 × 60 pontos, sem modelação de
                    propagação RF.
                  </p>
                </Panel>
              </div>
              <div className="two-columns">
                <Panel
                  title="Área coberta por BTS"
                  tag="SEM DESCONTAR SOBREPOSIÇÃO"
                >
                  <Bars
                    data={stations.map((b) => ({
                      name: b.id,
                      value: +Math.min(p.area, Math.PI * b.radius ** 2).toFixed(
                        2,
                      ),
                    }))}
                  />
                  <p className="muted">
                    Limite superior geométrico em km²; círculos podem
                    estender-se para fora da área.
                  </p>
                </Panel>
                <Panel
                  title="Qualidade prevista do sinal"
                  tag="ENLACE DE REFERÊNCIA"
                >
                  <div className="signal-scale">
                    {[
                      "Excelente",
                      "Boa",
                      "Aceitável",
                      "Fraca",
                      "Sem cobertura",
                    ].map((v, k) => (
                      <span
                        key={v}
                        style={{
                          borderTopColor: [
                            "#10b981",
                            "#22d3ee",
                            "#3b82f6",
                            "#fbbf24",
                            "#f87171",
                          ][k],
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                  <p>
                    Potência recebida simplificada:{" "}
                    <b>{fmt(r.received, 1)} dBm</b>
                  </p>
                  <p className="muted">
                    Potência do enlace de referência, distinta de RSRP.
                    Classificação sem atribuição geográfica; RSRP, RSRQ e SINR
                    não calculados.
                  </p>
                  <Equation
                    formula={String.raw`M_{\mathrm{disp}}=M-M_{\mathrm{desv}}`}
                    substitution={String.raw`M_{\mathrm{disp}}=${mn(r.margin)}-${mn(p.fade)}`}
                    result={`${fmt(r.margin - p.fade, 1)} dB`}
                    note="M: margem do enlace; Mdesv: reserva de desvanecimento (dB)."
                  />
                </Panel>
              </div>
            </>
          )}
          {page === "Padrão de Reuso" && (
            <div className="two-columns">
              <Panel title="Clusters celulares" tag={`N = ${p.reuse}`}>
                <div className="segmented">
                  {[1, 3, 4, 7].map((n) => (
                    <button
                      key={n}
                      className={p.reuse === n ? "chosen" : ""}
                      onClick={() => change("reuse", n)}
                    >
                      N = {n}
                    </button>
                  ))}
                </div>
                <div className="hex-grid">
                  {Array.from({ length: 35 }, (_, index) => {
                    const q = index % 7,
                      row = Math.floor(index / 7);
                    const colorIndex =
                      p.reuse === 1
                        ? 0
                        : p.reuse === 3
                          ? (q + 2 * row) % 3
                          : p.reuse === 4
                            ? (q % 2) + 2 * (row % 2)
                            : (q + 3 * row) % 7;
                    return (
                      <div
                        className="hex"
                        style={{
                          background: [
                            "#155e75",
                            "#5b36a0",
                            "#17644f",
                            "#254e98",
                            "#854f20",
                            "#89415d",
                            "#486d80",
                          ][colorIndex],
                          transform: `translateX(${row % 2 ? 22 : 0}px)`,
                        }}
                        key={index}
                      >
                        F{colorIndex + 1}
                      </div>
                    );
                  })}
                </div>
                <p className="muted">
                  Esquema conceptual de grupos de frequências. LTE utiliza
                  habitualmente reuso 1; outros padrões ilustram o modelo
                  celular clássico.
                </p>
              </Panel>
              <Panel title="Calculadora de reuso">
                <div className="form-grid">
                  <label className="field">
                    i
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={i}
                      onChange={(e) =>
                        setI(
                          Math.max(
                            0,
                            Math.min(20, Math.floor(+e.target.value)),
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    j
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={j}
                      onChange={(e) =>
                        setJ(
                          Math.max(
                            0,
                            Math.min(20, Math.floor(+e.target.value)),
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <Equation
                  formula={String.raw`N=i^2+ij+j^2`}
                  substitution={String.raw`N=${i}^2+${i}\times ${j}+${j}^2`}
                  result={
                    i || j ? String(i * i + i * j + j * j) : "Índices inválidos"
                  }
                  note="i e j: deslocamentos inteiros na grelha hexagonal; pelo menos um deve ser positivo."
                />
                <Equation
                  formula={String.raw`D=R\sqrt{3N}`}
                  substitution={
                    i || j
                      ? String.raw`D=${mn(p.radius)}\sqrt{3\times ${i * i + i * j + j * j}}`
                      : undefined
                  }
                  result={
                    i || j
                      ? `${fmt(p.radius * Math.sqrt(3 * (i * i + i * j + j * j)), 2)} km`
                      : "Indisponível"
                  }
                  note="R: raio da célula (km); N: dimensão do cluster calculado."
                />
                <p className="muted">
                  Reuso de frequência permite utilizar os mesmos recursos de
                  frequência em células suficientemente afastadas. O resultado
                  da calculadora é independente da selecção do cenário acima.
                </p>
              </Panel>
            </div>
          )}
          {page === "Antenas" && (
            <>
              <div className="two-columns">
                <Panel title="Antena sectorial" tag="POLARIZAÇÃO ±45°">
                  <Twin
                    stations={stations.slice(0, 1)}
                    onSelect={setSelected}
                  />
                  <div className="sector-labels">
                    {[0, 120, 240].map((a, n) => (
                      <span key={a}>
                        Sector {["A", "B", "C"][n]}
                        <b>{a}°</b>
                      </span>
                    ))}
                  </div>
                  <p className="muted">
                    Configuração de referência com três sectores. Altere os
                    sectores e azimutes de cada BTS no planeamento.
                  </p>
                </Panel>
                <Panel title="Parâmetros da antena">
                  {inputs([
                    "frequency",
                    "gain",
                    "power",
                    "tilt",
                    "height",
                    "horizontal",
                    "vertical",
                  ])}
                  <p className="muted">
                    Tipo: sectorial · Polarização de projecto: dupla ±45°. Tilt
                    e abertura são parâmetros documentais; não alteram os
                    círculos de cobertura.
                  </p>
                </Panel>
              </div>
              <div className="two-columns">
                <Panel title="Vantagens das antenas sectoriais">
                  <ul className="benefits">
                    {[
                      "Maior controlo da cobertura",
                      "Melhor utilização dos recursos",
                      "Possibilidade de sectorização",
                      "Redução de interferência através de planeamento adequado",
                      "Maior capacidade por estação, com recursos por sector",
                    ].map((v) => (
                      <li key={v}>
                        <Check size={16} />
                        {v}
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Aplicações">
                  <div className="application-tags">
                    {[
                      "Redes celulares",
                      "4G LTE",
                      "Redes metropolitanas",
                      "Cobertura urbana",
                      "Expansão de capacidade",
                    ].map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  <div className="radiation">
                    <span />
                    <span />
                    <span />
                    <RadioTower />
                  </div>
                  <p className="muted">
                    Padrão de radiação estilizado; não é um diagrama de
                    fabricante.
                  </p>
                </Panel>
              </div>
            </>
          )}
          {page === "Cálculos" && (
            <>
              <Panel title="Entradas do enlace e dimensionamento">
                {inputs([
                  "frequency",
                  "distance",
                  "power",
                  "gain",
                  "receiveGain",
                  "cable",
                  "other",
                  "sensitivity",
                  "fade",
                  "radius",
                  "overlap",
                  "bandwidth",
                  "efficiency",
                  "demand",
                ])}
              </Panel>
              <div className="calculator-grid">
                {networkEquations(p, r).map(({ title, ...equation }) => (
                  <Panel key={title} title={title}>
                    <Equation {...equation} />
                  </Panel>
                ))}
              </div>
              <Panel title="Balanço de potência do enlace">
                <div className="parameter-list">
                  {[
                    ["Potência transmitida", `${p.power} dBm`],
                    ["Ganho de transmissão", `+ ${p.gain} dBi`],
                    ["Perdas de cabo", `− ${p.cable} dB`],
                    ["EIRP", `${fmt(p.power + p.gain - p.cable, 2)} dBm`],
                    ["Perdas de propagação", `− ${fmt(r.loss, 2)} dB`],
                    ["Outras perdas", `− ${p.other} dB`],
                    ["Ganho do receptor", `+ ${p.receiveGain} dBi`],
                    ["Potência recebida", `${fmt(r.received, 2)} dBm`],
                    [
                      "Margem após desvanecimento",
                      `${fmt(r.margin - p.fade, 2)} dB`,
                    ],
                  ].map(([a, b]) => (
                    <div key={a}>
                      <span>{a}</span>
                      <b>{b}</b>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  Propagação em espaço livre. Referência:{" "}
                  <a
                    href="https://www.itu.int/rec/R-REC-P.525-5-202411-I/en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ITU-R P.525
                  </a>
                  .
                </p>
              </Panel>
            </>
          )}
          {page === "Teste de Campo" && (
            <>
              <div className="notice">
                <Compass size={18} />
                <span>
                  <b>
                    {points.some((x) => x.real)
                      ? "DADOS REAIS INSERIDOS / DEMONSTRAÇÃO"
                      : "DADOS DE DEMONSTRAÇÃO"}
                  </b>{" "}
                  ·{" "}
                  {points.some((x) => x.real)
                    ? "As medições manuais são identificadas individualmente."
                    : "Sem medições reais inseridas."}
                </span>
              </div>
              <div className="toolbar">
                <select
                  aria-label="Filtrar pontos"
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                >
                  <option>Todos</option>
                  <option>Demonstração</option>
                  <option>Medição manual</option>
                </select>
                <button
                  className="button primary"
                  onClick={() => setPointModal(true)}
                >
                  <Plus size={16} />
                  Novo ponto de teste
                </button>
              </div>
              <Panel title="Registos de campo" tag={`${points.length} PONTOS`}>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Ponto",
                          "Latitude",
                          "Longitude",
                          "Distância BTS",
                          "RSRP",
                          "RSRQ",
                          "SINR",
                          "Download",
                          "Upload",
                          "Latência",
                          "Origem / observação",
                          "",
                        ].map((v, k) => (
                          <th key={k}>{v}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {points
                        .filter(
                          (x) =>
                            fieldFilter === "Todos" ||
                            x.real === (fieldFilter === "Medição manual"),
                        )
                        .map((x) => (
                          <tr key={x.id}>
                            <td>{x.id}</td>
                            <td>{x.lat.toFixed(5)}</td>
                            <td>{x.lng.toFixed(5)}</td>
                            <td>
                              {stations.length
                                ? `${fmt(Math.min(...stations.map((b) => distance(x.lat, x.lng, b.lat, b.lng))), 2)} km`
                                : "Sem BTS"}
                            </td>
                            <td>
                              <span
                                className={
                                  x.rsrp >= -90 ? "green-text" : "amber-text"
                                }
                              >
                                {x.rsrp} dBm
                              </span>
                            </td>
                            <td>{x.rsrq} dB</td>
                            <td>{x.sinr} dB</td>
                            <td>{x.download} Mbps</td>
                            <td>{x.upload} Mbps</td>
                            <td>{x.latency} ms</td>
                            <td>
                              {x.real
                                ? "Dados reais inseridos"
                                : "Demonstração"}
                              <small>{x.note}</small>
                            </td>
                            <td>
                              <button
                                aria-label={`Remover ${x.id}`}
                                onClick={() =>
                                  setPoints(points.filter((v) => v.id !== x.id))
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!points.length && (
                    <div className="empty-state">
                      Ainda não existem pontos de teste.
                    </div>
                  )}
                </div>
              </Panel>
              {map(true)}
              <div className="two-columns">
                <Panel title="Classificação RSRP" tag="LIMIARES ILUSTRATIVOS">
                  <p>
                    Excelente ≥ −80 dBm · Bom ≥ −90 dBm · Aceitável ≥ −100 dBm ·
                    Fraco &lt; −100 dBm.
                  </p>
                  <p className="muted">
                    Critérios académicos configurados nesta apresentação, não
                    requisitos de uma operadora.
                  </p>
                </Panel>
                <Panel title="PREVISTO vs. MEDIDO">
                  <p>
                    {points.some((x) => x.real)
                      ? `${points.filter((x) => x.real).length} ponto(s) introduzido(s) como medição manual.`
                      : "Sem medições reais inseridas."}
                  </p>
                  <p className="muted">
                    RSRP previsto indisponível: o modelo de potência recebida
                    total não é comparável directamente ao RSRP medido.
                    Comparação RF não calculada.
                  </p>
                </Panel>
              </div>
            </>
          )}
          {page === "Simulação" && (
            <>
              <div className="simulation-layout">
                <Panel title="Parâmetros do cenário" tag="ENTRADAS">
                  {inputs([
                    "frequency",
                    "power",
                    "height",
                    "gain",
                    "tilt",
                    "sensitivity",
                    "fade",
                    "radius",
                  ])}
                  <label className="field">
                    <span>Número de BTS</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={stations.length}
                      onChange={(e) => {
                        const n = Math.max(
                          0,
                          Math.min(30, Math.floor(+e.target.value)),
                        );
                        if (n < stations.length)
                          setStations(stations.slice(0, n));
                        else {
                          const next = [...stations];
                          for (let k = stations.length; k < n; k++)
                            next.push({
                              id: `BTS-${Date.now()}-${k}`,
                              lat: center[0] + ((k % 3) - 1) * 0.01,
                              lng: center[1] + (Math.floor(k / 3) - 1) * 0.01,
                              height: p.height,
                              power: p.power,
                              frequency: p.frequency,
                              gain: p.gain,
                              sectors: 3,
                              azimuth: 0,
                              tilt: p.tilt,
                              radius: p.radius,
                              enabled: true,
                            });
                          setStations(next);
                        }
                      }}
                    />
                  </label>
                  <button
                    className="button secondary full"
                    onClick={() => {
                      setStations(
                        stations.map((b) => ({
                          ...b,
                          frequency: p.frequency,
                          power: p.power,
                          height: p.height,
                          gain: p.gain,
                          tilt: p.tilt,
                          radius: p.radius,
                        })),
                      );
                      setToast("Parâmetros aplicados a todas as BTS");
                    }}
                  >
                    Aplicar parâmetros às BTS
                  </button>
                  <button
                    disabled={running}
                    className="button primary full"
                    onClick={run}
                  >
                    <Play size={15} />
                    {running ? "A processar…" : "Executar Simulação"}
                  </button>
                </Panel>
                <div>
                  {map(true)}
                  <div className="notice">
                    Cobertura baseada no raio geométrico de cada BTS. Potência,
                    frequência e ganho afectam o enlace de referência, não o
                    raio. Altura e tilt são documentais.
                  </div>
                </div>
                <Panel
                  title="Resultados"
                  tag={snapshot ? "ÚLTIMA EXECUÇÃO" : "PRÉ-VISUALIZAÇÃO"}
                >
                  <div className="result-stack">
                    {[
                      [
                        "Cobertura estimada",
                        `${fmt((snapshot || r).coverage, 1)}%`,
                      ],
                      [
                        "Área atendida",
                        `${fmt((snapshot || r).servedArea, 2)} km²`,
                      ],
                      [
                        "Utilizadores cobertos",
                        fmt((snapshot || r).coveredUsers),
                      ],
                      ["Sobreposição", `${fmt((snapshot || r).overlap, 1)}%`],
                      [
                        "Área sem cobertura",
                        `${fmt((snapshot || r).area - (snapshot || r).servedArea, 2)} km²`,
                      ],
                      [
                        "Margem do enlace",
                        `${fmt((snapshot || r).margin, 1)} dB`,
                      ],
                    ].map(([a, b]) => (
                      <div key={a}>
                        <span>{a}</span>
                        <strong>{b}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="muted">
                    Última execução: {lastRun}. Execute novamente após alterar
                    entradas. Zonas críticas: pontos fora dos círculos.
                  </p>
                </Panel>
              </div>
              <Panel
                title="Digital Twin da Rede"
                tag="REPRESENTAÇÃO 3D CONCEPTUAL"
              >
                <Twin stations={stations} onSelect={setSelected} />
              </Panel>
            </>
          )}
          {page === "Configurações" && (
            <>
              <Panel title="Parâmetros globais" tag="GUARDADOS LOCALMENTE">
                {inputs(Object.keys(fields) as (keyof Params)[])}
                <div className="notice">
                  Os valores globais são usados nos cálculos e em novas BTS.
                  Para actualizar BTS existentes, use “Aplicar parâmetros às
                  BTS” na simulação.
                </div>
              </Panel>
              <Panel title="Dados do projecto">
                <p>
                  Este projecto é guardado apenas neste navegador. Exporte uma
                  cópia para conservar os seus parâmetros.
                </p>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob(
                          [
                            JSON.stringify(
                              {
                                scenario,
                                params: p,
                                stations,
                                points,
                                community,
                              },
                              null,
                              2,
                            ),
                          ],
                          { type: "application/json" },
                        ),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "nexacell-projecto.json";
                      a.click();
                      URL.revokeObjectURL(url);
                      setToast("Cópia do projecto exportada");
                    }}
                  >
                    <ArrowDownToLine size={16} />
                    Exportar projecto JSON
                  </button>
                </div>
              </Panel>
            </>
          )}
          {page === "Relatório" && (
            <>
              <div className="toolbar">
                <span>Relatório técnico · parâmetros actuais do projecto</span>
                <button
                  className="button primary"
                  onClick={() => window.print()}
                >
                  <FileText size={16} />
                  Imprimir / Guardar como PDF
                </button>
              </div>
              <ProjectReport
                p={p}
                stations={stations}
                points={points}
                community={community}
              />
            </>
          )}
          <footer className="main-footer">
            <span>
              <span className="live-dot" /> Planeamento LTE
            </span>
            <span>
              Comunicações Móveis <i>·</i> Marracuene, Província de Maputo{" "}
              <i>·</i> NexaCell
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {storageError && (
        <div className="storage-warning">
          Armazenamento local indisponível. Exporte o projecto nas
          configurações.
        </div>
      )}
      {selectedBTS && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Editar ${selectedBTS.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-title">
              <div>
                <span className="eyebrow">ESTAÇÃO BASE · SIMULAÇÃO</span>
                <h2>{selectedBTS.id}</h2>
              </div>
              <button
                aria-label="Fechar editor"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              {(
                [
                  "lat",
                  "lng",
                  "height",
                  "power",
                  "frequency",
                  "gain",
                  "sectors",
                  "azimuth",
                  "tilt",
                  "radius",
                ] as const
              ).map((key) => {
                const labels = {
                  lat: "Latitude",
                  lng: "Longitude",
                  height: "Altura (m)",
                  power: "Potência (dBm)",
                  frequency: "Frequência (MHz)",
                  gain: "Ganho (dBi)",
                  sectors: "Sectores",
                  azimuth: "Azimute inicial (°)",
                  tilt: "Tilt (°)",
                  radius: "Raio geométrico (km)",
                };
                const limits: Record<string, [number, number]> = {
                  lat: [-90, 90],
                  lng: [-180, 180],
                  height: [1, 300],
                  power: [0, 60],
                  frequency: [100, 100000],
                  gain: [0, 40],
                  sectors: [1, 6],
                  azimuth: [0, 359],
                  tilt: [0, 30],
                  radius: [0.1, 20],
                };
                return (
                  <label className="field" key={key}>
                    <span>{labels[key]}</span>
                    <input
                      type="number"
                      step={
                        key === "lat" || key === "lng"
                          ? 0.00001
                          : key === "radius"
                            ? 0.05
                            : 1
                      }
                      min={limits[key][0]}
                      max={limits[key][1]}
                      value={selectedBTS[key]}
                      onChange={(e) =>
                        updateBTS(selectedBTS.id, {
                          [key]: Math.max(
                            limits[key][0],
                            Math.min(
                              limits[key][1],
                              key === "sectors"
                                ? Math.floor(+e.target.value)
                                : +e.target.value,
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedBTS.enabled}
                onChange={(e) =>
                  updateBTS(selectedBTS.id, { enabled: e.target.checked })
                }
              />
              Activa na simulação
            </label>
            <div className="info-strip">
              Azimutes:{" "}
              {Array.from(
                { length: selectedBTS.sectors },
                (_, n) =>
                  `${fmt((selectedBTS.azimuth + (n * 360) / selectedBTS.sectors) % 360, 1)}°`,
              ).join(" · ")}
              <br />
              Utilizadores atribuídos (uniforme):{" "}
              {selectedBTS.enabled
                ? fmt(
                    r.users /
                      Math.max(1, stations.filter((b) => b.enabled).length),
                  )
                : 0}
            </div>
            <button
              className="button primary full"
              onClick={() => {
                setSelected(null);
                setToast("Parâmetros da BTS guardados");
              }}
            >
              <Check size={16} />
              Concluir edição
            </button>
            <button
              className="button danger full"
              onClick={() => {
                setStations(stations.filter((b) => b.id !== selected));
                setSelected(null);
                setToast("BTS removida do cenário");
              }}
            >
              <Trash2 size={16} />
              Remover BTS
            </button>
          </section>
        </div>
      )}
      {pointModal && (
        <div className="modal-backdrop">
          <form
            className="drawer"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const point: FieldPoint = {
                id: `PT-${Date.now().toString().slice(-6)}`,
                lat: Number(data.get("lat")),
                lng: Number(data.get("lng")),
                rsrp: Number(data.get("rsrp")),
                rsrq: Number(data.get("rsrq")),
                sinr: Number(data.get("sinr")),
                download: Number(data.get("download")),
                upload: Number(data.get("upload")),
                latency: Number(data.get("latency")),
                note: String(data.get("note")),
                real: data.get("real") === "on",
              };
              setPoints([...points, point]);
              setPointModal(false);
              setToast("Ponto de teste guardado");
            }}
          >
            <div className="drawer-title">
              <h2>Novo ponto de teste</h2>
              <button
                type="button"
                aria-label="Fechar formulário"
                onClick={() => setPointModal(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              {[
                ["lat", "Latitude", center[0], -90, 90],
                ["lng", "Longitude", center[1], -180, 180],
                ["rsrp", "RSRP (dBm)", -90, -160, -30],
                ["rsrq", "RSRQ (dB)", -12, -40, 0],
                ["sinr", "SINR (dB)", 15, -30, 60],
                ["download", "Download (Mbps)", 20, 0, 10000],
                ["upload", "Upload (Mbps)", 8, 0, 10000],
                ["latency", "Latência (ms)", 35, 0, 100000],
              ].map(([key, label, value, min, max]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    required
                    type="number"
                    name={String(key)}
                    defaultValue={value}
                    min={min}
                    max={max}
                    step="any"
                  />
                </label>
              ))}
            </div>
            <label className="field">
              Observação
              <textarea name="note" maxLength={300} />
            </label>
            <label className="checkbox-row">
              <input name="real" type="checkbox" />
              Estes valores provêm de uma medição real que realizei.
            </label>
            <p className="muted">
              Sem esta confirmação, o registo será marcado como demonstração.
            </p>
            <button className="button primary full" type="submit">
              Guardar ponto
            </button>
          </form>
        </div>
      )}
      <div className="quick-search">
        <Search size={14} />
        <input
          aria-label="Procurar módulo"
          placeholder="Procurar módulo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <div className="search-results">
            {navigation
              .filter(([n]) => n.toLowerCase().includes(search.toLowerCase()))
              .map(([n, Icon]) => (
                <button key={n} onClick={() => go(n)}>
                  <Icon size={15} />
                  {n}
                </button>
              ))}
            {!navigation.some(([n]) =>
              n.toLowerCase().includes(search.toLowerCase()),
            ) && <span>Nenhum módulo encontrado.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
