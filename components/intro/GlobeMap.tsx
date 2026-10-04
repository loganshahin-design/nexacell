"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker, GeoJSONSource, RasterTileSource, StyleSpecification } from "maplibre-gl";
import { zone } from "@/data/zone";
import { satellite, target } from "@/data/intro";
import { bbox } from "@/calculations/geo";
import { TURN_MS, ZOOM_MS, type EngineProps } from "./engine";

const [LAT, LNG] = target;
const ring = zone.polygon.map(([la, ln]) => [ln, la]);
const closedRing = [...ring, ring[0]];
const route = zone.route.map(([la, ln]) => [ln, la]);

// Estilo próprio: só imagens de satélite. Usa o Esri (mais rápido e nítido);
// se der erros, os mesmos mosaicos passam a vir do EOX (Sentinel-2).
function style(): StyleSpecification {
  return {
    version: 8,
    projection: { type: ["interpolate", ["linear"], ["zoom"], 10, "vertical-perspective", 12, "mercator"] },
    sky: {
      "sky-color": "#000000",
      "horizon-color": "#0b1d33",
      "fog-color": "#0b1d33",
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0.85, 10, 0],
    },
    sources: {
      sat: { type: "raster", tiles: satellite.esri.tiles, tileSize: 256, maxzoom: satellite.esri.maxzoom, attribution: satellite.esri.attribution },
    },
    layers: [
      // Cor de terra por baixo: um mosaico ainda por carregar não deixa ver o espaço.
      { id: "ground", type: "background", paint: { "background-color": ["interpolate", ["linear"], ["zoom"], 4, "#0d2440", 8, "#23301f", 11, "#2a2a20"] } },
      { id: "sat", type: "raster", source: "sat", paint: { "raster-fade-duration": 250 } },
    ],
  };
}

// Zoom que mostra a Terra inteira com folga, conforme o tamanho do ecrã.
function globeZoom(el: HTMLElement, layout: EngineProps["layout"]) {
  const w = el.clientWidth,
    h = el.clientHeight;
  const wide = w >= 900;
  const size = layout === "login" ? (wide ? Math.min(w * 0.5, h) : Math.min(w * 0.85, h * 0.42)) : Math.min(w, h);
  return Math.log2((size * 0.42 * 2 * Math.PI) / 512);
}

function loginPadding(el: HTMLElement) {
  const w = el.clientWidth,
    h = el.clientHeight;
  return w >= 900 ? { left: w * 0.42, right: 0, top: 0, bottom: 0 } : { left: 0, right: 0, top: 0, bottom: h * 0.58 };
}

const noPadding = { left: 0, right: 0, top: 0, bottom: 0 };

// Endereços dos mosaicos à volta de Michafutene em cada nível de zoom.
function descentTiles() {
  const tile = (z: number) => {
    const n = 2 ** z;
    const x = Math.floor(((LNG + 180) / 360) * n);
    const lat = (LAT * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n);
    return { x, y };
  };
  const around = (z: number, r: number, url: (z: number, y: number, x: number) => string) => {
    const { x, y } = tile(z);
    const out: string[] = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) out.push(url(z, y + dy, x + dx));
    return out;
  };
  // O MapLibre escolhe o servidor pela regra (x + y) % n: usa-se a mesma para
  // o pedido coincidir com o que fica em cache.
  const esri = (z: number, y: number, x: number) => {
    const urls = satellite.esri.tiles;
    return urls[(x + y) % urls.length].replace("{z}", String(z)).replace("{y}", String(y)).replace("{x}", String(x));
  };
  // Primeiro a vista final (é onde a câmara pára), depois o caminho.
  return [14, 13, 12, 5, 6, 7, 8, 9, 10, 11, 15].flatMap((z) => around(z, z >= 12 ? 2 : 1, esri));
}

// Altitude aproximada da câmara (km) a partir do zoom, latitude e inclinação.
function altitudeKm(m: MLMap) {
  const z = m.getZoom(),
    lat = m.getCenter().lat;
  const metresPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** z);
  const fov = (m.getVerticalFieldOfView() * Math.PI) / 180;
  const dist = (metresPerPx * m.getCanvas().clientHeight) / 2 / Math.tan(fov / 2);
  return (dist * Math.cos((m.getPitch() * Math.PI) / 180)) / 1000;
}

export default function GlobeMap(props: EngineProps) {
  const { phase, reduce, layout } = props;
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef<Marker[]>([]);
  const [usingEox, setUsingEox] = useState(false);
  const cb = useRef(props);
  cb.current = props;
  const [loaded, setLoaded] = useState(false);

  // Criação do mapa (uma só vez).
  useEffect(() => {
    let alive = true;
    let inst: MLMap | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    import("maplibre-gl")
      .then((ml) => {
        if (!alive || !element.current) return;
        lib.current = ml;
        ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const el = element.current;
        inst = new ml.Map({
          container: el,
          style: style(),
          center: [LNG - 28, LAT + 8],
          zoom: globeZoom(el, cb.current.layout),
          interactive: false,
          attributionControl: { compact: true },
          maxPitch: 70,
          canvasContextAttributes: { antialias: true },
        });
        map.current = inst;
        if (cb.current.layout === "login") inst.setPadding(loginPadding(el));
        // Pronto quando chega o primeiro mosaico de satélite (as camadas GeoJSON
        // da zona também têm mosaicos, mas carregam sem Internet); sem mosaicos
        // de satélite em 6 s, falha e passa para o globo offline.
        let ready = false;
        inst.on("sourcedata", (e) => {
          if (ready || e.sourceId !== "sat" || !e.tile || e.tile.state !== "loaded") return;
          ready = true;
          clearTimeout(timer);
          cb.current.onReady();
        });
        timer = setTimeout(() => alive && !ready && cb.current.onFail(), 6000);
        // Esri com erros repetidos: troca para o EOX.
        let errors = 0;
        inst.on("error", (e) => {
          if ((e as { sourceId?: string }).sourceId !== "sat" || ++errors !== 4) return;
          const src = inst!.getSource("sat") as RasterTileSource | undefined;
          src?.setTiles(satellite.eox.tiles);
          setUsingEox(true);
        });
        let last = 0;
        inst.on("move", () => {
          const now = performance.now();
          if (now - last < 70) return;
          last = now;
          const c = inst!.getCenter();
          cb.current.onTelemetry({ altitudeKm: altitudeKm(inst!), center: [c.lat, c.lng] });
        });
        // "style.load" e não "load": com a Terra a rodar há sempre mosaicos a
        // carregar e o "load" (que espera por todos) podia nunca chegar.
        inst.once("style.load", () => {
          const m = inst!;
          m.addSource("zone-fill", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [closedRing] } } });
          m.addSource("zone-draw", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
          m.addSource("route-draw", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
          m.addLayer({ id: "zone-fill", type: "fill", source: "zone-fill", paint: { "fill-color": "#4da3ff", "fill-opacity": 0, "fill-opacity-transition": { duration: 900 } } });
          m.addLayer({ id: "zone-glow", type: "line", source: "zone-draw", paint: { "line-color": "#4da3ff", "line-width": 10, "line-blur": 8, "line-opacity": 0.55 } });
          m.addLayer({ id: "zone-line", type: "line", source: "zone-draw", paint: { "line-color": "#bfe1ff", "line-width": 2.5, "line-dasharray": [2, 1.2] } });
          m.addLayer({ id: "route-glow", type: "line", source: "route-draw", paint: { "line-color": "#ffb238", "line-width": 9, "line-blur": 7, "line-opacity": 0.5 } });
          m.addLayer({ id: "route-line", type: "line", source: "route-draw", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffd27a", "line-width": 3.5 } });
          setLoaded(true);
        });
        // Farol sobre Michafutene; desaparece quando fica atrás da Terra.
        const beacon = document.createElement("div");
        beacon.className = "beacon";
        beacon.innerHTML = "<i></i><i></i><i></i><b></b>";
        markers.current.push(new ml.Marker({ element: beacon, opacityWhenCovered: 0 }).setLngLat([LNG, LAT]).addTo(inst));
      })
      .catch(() => cb.current.onFail());
    return () => {
      alive = false;
      clearTimeout(timer);
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
      inst?.remove();
      map.current = null;
    };
  }, []);

  // A Terra roda devagar enquanto o ecrã de entrada está aberto.
  useEffect(() => {
    const m = map.current;
    if (!m || phase !== "orbit" || reduce) return;
    let frame = 0,
      prev = performance.now();
    const spin = (now: number) => {
      const c = m.getCenter();
      m.setCenter([c.lng + ((now - prev) / 1000) * 6, c.lat]);
      prev = now;
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(frame);
  }, [phase, reduce, loaded]);

  // Pré-carrega as imagens do caminho enquanto o ecrã de entrada está aberto,
  // para a descida não mostrar mosaicos vazios.
  useEffect(() => {
    if (!loaded) return;
    const abort = new AbortController();
    const urls = descentTiles();
    let i = 0;
    const next = (): Promise<void> | undefined => {
      const url = urls[i++];
      if (!url || abort.signal.aborted) return;
      return fetch(url, { mode: "cors", signal: abort.signal })
        .then((r) => r.blob())
        .catch(() => undefined)
        .then(() => next());
    };
    // Começa quando a Terra do ecrã de entrada já está desenhada, com 4 pedidos
    // de cada vez (2 por servidor): sobram 4 ligações por servidor para o mapa.
    const m = map.current;
    let started = false;
    const begin = () => {
      if (started || abort.signal.aborted) return;
      started = true;
      for (let k = 0; k < 4; k++) next();
    };
    const t = setTimeout(begin, 4000);
    m?.once("idle", begin);
    return () => {
      clearTimeout(t);
      m?.off("idle", begin);
      abort.abort();
    };
  }, [loaded]);

  // Descida em duas fases: a Terra roda até Moçambique, depois desce a ritmo
  // constante (o zoom é logarítmico, por isso cada etapa do HUD dura o mesmo).
  useEffect(() => {
    const m = map.current;
    if (!m || phase !== "zoom") return;
    let cancelled = false;
    const smooth = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
    const arrive = () => {
      if (cancelled) return;
      // Espera pelos mosaicos da vista final (no máximo 1,5 s).
      if (m.areTilesLoaded()) return cb.current.onArrive();
      const t = setTimeout(() => !cancelled && cb.current.onArrive(), 1500);
      m.once("idle", () => {
        clearTimeout(t);
        if (!cancelled) cb.current.onArrive();
      });
    };
    const descend = () => {
      if (cancelled) return;
      const [sw, ne] = bbox(zone.polygon);
      // A zona fica na área livre: à direita do HUD e acima do cartão de chegada.
      const w = m.getCanvas().clientWidth,
        h = m.getCanvas().clientHeight;
      const wide = w >= 900;
      const cam = m.cameraForBounds(
        [
          [sw[1], sw[0]],
          [ne[1], ne[0]],
        ],
        {
          padding: { top: h * 0.1, bottom: h * 0.26, left: wide ? 420 : 24, right: wide ? w * 0.06 : 24 },
          pitch: 45,
          bearing: -22,
        },
      );
      m.once("moveend", arrive);
      m.easeTo({
        center: cam?.center ?? [LNG, LAT],
        zoom: Math.min(cam?.zoom ?? 13.2, 14),
        pitch: 45,
        bearing: -22,
        duration: reduce ? 0 : ZOOM_MS - TURN_MS,
        // Quase linear: o mesmo tempo para cada etapa, com um fim suave.
        easing: (t) => 0.3 * smooth(t) + 0.7 * t,
        essential: true,
      });
    };
    m.once("moveend", descend);
    m.easeTo({
      center: [LNG, LAT],
      zoom: m.getZoom() + 0.3,
      padding: noPadding,
      duration: reduce ? 0 : TURN_MS,
      easing: smooth,
      essential: true,
    });
    return () => {
      cancelled = true;
    };
  }, [phase, reduce]);

  // Chegada: desenha o contorno da zona, depois a N1, depois as BTS.
  useEffect(() => {
    const m = map.current,
      ml = lib.current;
    if (!m || !ml || !loaded || phase !== "arrive") return;
    markers.current.forEach((mk) => mk.getElement().classList.contains("beacon") && mk.remove());
    let frame = 0;
    const t0 = performance.now();
    const slice = (pts: number[][], f: number) => {
      if (f <= 0) return [];
      const n = (pts.length - 1) * f;
      const i = Math.floor(n);
      const a = pts[i],
        b = pts[Math.min(i + 1, pts.length - 1)],
        t = n - i;
      return [...pts.slice(0, i + 1), [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]];
    };
    const draw = (now: number) => {
      const fz = Math.min(1, (now - t0) / 1300);
      const fr = Math.min(1, Math.max(0, (now - t0 - 900) / 1100));
      (m.getSource("zone-draw") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: slice(closedRing, fz) } });
      (m.getSource("route-draw") as GeoJSONSource | undefined)?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: slice(route, fr) } });
      if (fz >= 1 && m.getPaintProperty("zone-fill", "fill-opacity") === 0) m.setPaintProperty("zone-fill", "fill-opacity", 0.16);
      if (fz < 1 || fr < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    cb.current.stations
      .filter((s) => s.enabled)
      .forEach((s, i) => {
        // O MapLibre posiciona o elemento exterior com transform: a animação
        // fica no elemento interior para não lhe tirar o lugar.
        const pin = document.createElement("div");
        pin.className = "globe-bts";
        pin.innerHTML = `<div class="globe-bts-body" style="animation-delay:${(1.2 + i * 0.09).toFixed(2)}s"><i></i><span>${s.id.replace("BTS-", "")}</span></div>`;
        markers.current.push(new ml.Marker({ element: pin }).setLngLat([s.lng, s.lat]).addTo(m));
      });
    return () => cancelAnimationFrame(frame);
  }, [phase, loaded]);

  // Ao mudar o tamanho da janela, mantém a Terra inteira à vista.
  useEffect(() => {
    const onResize = () => {
      const m = map.current,
        el = element.current;
      if (!m || !el || phase !== "orbit") return;
      m.setZoom(globeZoom(el, layout));
      m.setPadding(layout === "login" ? loginPadding(el) : noPadding);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, layout]);

  return (
    <>
      <div ref={element} className="globe-map" />
      {usingEox && <span className="globe-credit" dangerouslySetInnerHTML={{ __html: satellite.eox.attribution }} />}
    </>
  );
}
