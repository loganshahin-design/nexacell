"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";
import { Download, RotateCcw } from "lucide-react";
import { zone, LatLng } from "@/data/zone";
import { BTS } from "@/types";
import { classes, classify, ClassKey } from "@/calculations/coverage";
import { bbox, centroid } from "@/calculations/geo";
import { downloadCanvas, webglAvailable } from "@/utils/exportImage";
import { useProject } from "@/hooks/useProject";
import { fmt } from "@/utils/format";

export type Cell3D = { p: LatLng; dLat: number; dLng: number; rsrp: number; cls: ClassKey };
export type Sample3D = { p: LatLng; km: number; rsrp: number };

// Coordenadas de cena: origem no centro da zona, 1 km = 10 unidades, norte = −z.
const S = 10;
const origin = centroid(zone.polygon);
const KX = 111.32 * Math.cos((origin[0] * Math.PI) / 180);
const KZ = 110.574;
const toXZ = (p: LatLng): [number, number] => [
  (p[1] - origin[1]) * KX * S,
  -(p[0] - origin[0]) * KZ * S,
];
const MAST = 7.5;
const FLAT = 0.12;
const heightOf = (rsrp: number) =>
  0.3 + ((Math.min(Math.max(rsrp, -105), -55) + 105) / 50) * 5.2;
const classColor = Object.fromEntries(classes.map((c) => [c.key, c.color])) as Record<ClassKey, string>;
// Índice da célula da grelha (a mesma de gridInside) que contém o ponto.
const [SW] = bbox(zone.polygon);
const cellKey = (p: LatLng, dLat: number, dLng: number) =>
  `${Math.floor((p[0] - SW[0]) / dLat)}:${Math.floor((p[1] - SW[1]) / dLng)}`;

function useTokens() {
  const { theme } = useProject();
  const [t, setT] = useState({ ground: "#e4eae8", ink: "#0f1d26", accent: "#0b5fc4", laterite: "#b4441c", muted: "#4b5b64" });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
      setT({
        ground: v("--surface-2", "#e4eae8"),
        ink: v("--text", "#0f1d26"),
        accent: v("--accent", "#0b5fc4"),
        laterite: v("--laterite", "#b4441c"),
        muted: v("--muted", "#4b5b64"),
      });
    };
    read();
    const id = requestAnimationFrame(read);
    return () => cancelAnimationFrame(id);
  }, [theme]);
  return t;
}

type Layers = { relief: boolean; sectors: boolean; waves: boolean; drive: boolean; spin: boolean };

function Ground({ color, line }: { color: string; line: string }) {
  const shape = useMemo(
    () => new THREE.Shape(zone.polygon.map((p) => { const [x, z] = toXZ(p); return new THREE.Vector2(x, -z); })),
    [],
  );
  const outline = useMemo(() => {
    const pts = zone.polygon.map((p) => { const [x, z] = toXZ(p); return new THREE.Vector3(x, 0.05, z); });
    return [...pts, pts[0]];
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <Line points={outline} color={line} lineWidth={1.5} dashed dashSize={0.8} gapSize={0.5} />
      <gridHelper args={[140, 28, color, color]} position-y={-0.03} />
    </group>
  );
}

function SignalColumns({ cells, relief, reduce, mixRef }: { cells: Cell3D[]; relief: boolean; reduce: boolean; mixRef: React.MutableRefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const invalidate = useThree((s) => s.invalidate);
  const heights = useMemo(() => cells.map((c) => heightOf(c.rsrp)), [cells]);
  const dims = useMemo(
    () => cells.map((c) => [c.dLng * KX * S * 0.9, c.dLat * KZ * S * 0.9] as const),
    [cells],
  );
  const place = (mix: number) => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    cells.forEach((c, i) => {
      const h = FLAT + (heights[i] - FLAT) * mix;
      const [x, z] = toXZ(c.p);
      m.compose(v.set(x, h / 2, z), q, s.set(dims[i][0], h, dims[i][1]));
      mesh.current.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const col = new THREE.Color();
    cells.forEach((c, i) => mesh.current.setColorAt(i, col.set(classColor[c.cls])));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    place(mixRef.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells]);
  useFrame((_, dt) => {
    const target = relief ? 1 : 0;
    const mix = mixRef.current;
    if (Math.abs(mix - target) < 0.003) {
      if (mix !== target) { mixRef.current = target; place(target); }
      return;
    }
    mixRef.current = reduce ? target : mix + (target - mix) * Math.min(1, dt * 4);
    place(mixRef.current);
    invalidate();
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]} key={cells.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} />
    </instancedMesh>
  );
}

function Tower({ b, sectors, hBeam, radius, layers, colors, reduce, appear, index }: {
  b: BTS; sectors: number; hBeam: number; radius: number; layers: Layers;
  colors: ReturnType<typeof useTokens>; reduce: boolean; appear: React.MutableRefObject<number>; index: number;
}) {
  const [x, z] = toXZ([b.lat, b.lng]);
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const R = radius * S;
  useFrame(({ clock }) => {
    // Voo de abertura: as torres acendem uma a uma.
    const s = Math.min(1, Math.max(0, (appear.current - 0.25 - index * 0.07) / 0.2));
    group.current.scale.setScalar(s || 0.0001);
    if (ring.current) {
      const mat = ring.current.material as THREE.MeshBasicMaterial;
      if (layers.waves && !reduce && b.enabled) {
        const t = (clock.elapsedTime / 2.6 + index * 0.23) % 1;
        ring.current.scale.setScalar(0.5 + t * R);
        mat.opacity = 0.6 * (1 - t);
      } else {
        ring.current.scale.setScalar(R);
        mat.opacity = b.enabled ? 0.3 : 0;
      }
      ring.current.visible = layers.waves;
    }
  });
  const az = (b.azimuth * Math.PI) / 180;
  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh position-y={MAST / 2}>
        <cylinderGeometry args={[0.1, 0.22, MAST, 8]} />
        <meshStandardMaterial color={b.enabled ? colors.laterite : colors.muted} roughness={0.6} />
      </mesh>
      {Array.from({ length: sectors }, (_, s) => {
        const a = az + (s * 2 * Math.PI) / sectors;
        const start = Math.PI / 2 - a - (hBeam / 2) * (Math.PI / 180);
        return (
          <group key={s}>
            <mesh position={[Math.sin(a) * 0.32, MAST - 0.6, -Math.cos(a) * 0.32]} rotation-y={-a}>
              <boxGeometry args={[0.42, 1, 0.12]} />
              <meshStandardMaterial color="#f2f2f2" roughness={0.5} />
            </mesh>
            {layers.sectors && b.enabled && (
              <mesh rotation-x={-Math.PI / 2} position-y={MAST - 0.7}>
                <circleGeometry args={[R, 28, start, (hBeam * Math.PI) / 180]} />
                <meshBasicMaterial color={colors.accent} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={MAST - 0.7}>
        <ringGeometry args={[0.94, 1, 64]} />
        <meshBasicMaterial color={colors.accent} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Etiquetas das BTS: spans fora do canvas, colocados por projecção a cada frame.
function TowerLabels({ stations, labels, appear }: {
  stations: BTS[];
  labels: React.MutableRefObject<(HTMLSpanElement | null)[]>;
  appear: React.MutableRefObject<number>;
}) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    stations.forEach((b, i) => {
      const el = labels.current[i];
      if (!el) return;
      const [x, z] = toXZ([b.lat, b.lng]);
      v.set(x, MAST + 0.9, z).project(camera);
      const shown = v.z < 1 && appear.current - 0.25 - i * 0.07 > 0.15;
      el.style.display = shown ? "" : "none";
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    });
  });
  return null;
}

function Road({ samples, surface, color }: { samples: Sample3D[]; surface: (p: LatLng) => number; color: string }) {
  const geometry = useMemo(() => {
    if (samples.length < 2) return null;
    const pts = samples.map((s) => { const [x, z] = toXZ(s.p); return new THREE.Vector3(x, surface(s.p) + 0.12, z); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.2, 6, false);
  }, [samples, surface]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Car({ samples, surface, color, reduce, readout }: {
  samples: Sample3D[]; surface: (p: LatLng) => number; color: string; reduce: boolean;
  readout: React.RefObject<HTMLDivElement | null>;
}) {
  const car = useRef<THREE.Group>(null!);
  const km = useRef(samples.length ? samples[samples.length - 1].km * 0.42 : 0);
  const lastText = useRef(0);
  const total = samples.length ? samples[samples.length - 1].km : 0;
  useFrame((_, dt) => {
    if (samples.length < 2) return;
    if (!reduce) km.current = (km.current + dt * 0.32) % total;
    const i = Math.min(samples.length - 2, Math.floor(km.current / 0.05));
    const a = samples[i], b = samples[i + 1];
    const t = Math.min(1, Math.max(0, (km.current - a.km) / (b.km - a.km || 1)));
    const p: LatLng = [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
    const [x, z] = toXZ(p), [bx, bz] = toXZ(b.p);
    car.current.position.set(x, surface(p) + 0.1, z);
    car.current.rotation.y = Math.atan2(-(bz - z), bx - x);
    const now = performance.now();
    if (readout.current && now - lastText.current > 120) {
      lastText.current = now;
      const r = a.rsrp + (b.rsrp - a.rsrp) * t, c = classify(r);
      readout.current.innerHTML = `N1 · ${fmt(km.current, 2)} km<b>${fmt(r, 1)} dBm</b><span class="pill" style="background:${c.color}${c.key === "poor" ? ";color:#1c1600" : ""}">${c.label}</span>RSRP previsto`;
    }
  });
  return (
    <group ref={car}>
      <mesh position-y={0.3}>
        <boxGeometry args={[0.8, 0.38, 0.45]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position-y={1.4}>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position-y={2.55}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// Em ecrãs estreitos (retrato) abre o campo de visão para caber a zona toda.
function ResponsiveCamera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = size.width / size.height < 1 ? 52 : 34;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

// Voo de abertura: a câmara desce do alto até à vista final.
function IntroCamera({ active, appear, reduce, onDone }: { active: boolean; appear: React.MutableRefObject<number>; reduce: boolean; onDone: () => void }) {
  const { camera, controls, invalidate } = useThree();
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
    appear.current = active && !reduce ? 0 : 1.6;
    invalidate();
  }, [active, reduce, appear, invalidate]);
  useFrame(({ clock }) => {
    if (!active || reduce) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const f = Math.min(1, (clock.elapsedTime - t0.current) / 4);
    const e = 1 - (1 - f) ** 3;
    appear.current = f * 1.6;
    const r = 260 + (96 - 260) * e, phi = 0.12 + (0.95 - 0.12) * e, th = 0.9 + (-0.55 - 0.9) * e;
    camera.position.set(r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(th));
    camera.lookAt(0, 1.5, 0);
    const c = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
    c?.target?.set(0, 1.5, 0);
    c?.update?.();
    if (f >= 1) { appear.current = 1.6; onDone(); }
  });
  return null;
}

export default function Zone3D({
  cells,
  stations,
  sectors,
  hBeam,
  radiusKm,
  samples,
  intro = false,
  className = "",
  label = "Cena 3D da zona com o sinal previsto",
  showExport = true,
}: {
  cells: Cell3D[];
  stations: BTS[];
  sectors: number;
  hBeam: number;
  radiusKm: number;
  samples: Sample3D[];
  intro?: boolean;
  className?: string;
  label?: string;
  showExport?: boolean;
}) {
  const reduce = !!useReducedMotion();
  const colors = useTokens();
  const [gl, setGl] = useState<boolean | null>(null);
  const [layers, setLayers] = useState<Layers>({ relief: true, sectors: false, waves: !reduce, drive: true, spin: !reduce });
  const [introRun, setIntroRun] = useState(intro);
  const mixRef = useRef(1);
  const appear = useRef(intro && !reduce ? 0 : 1.6);
  const readout = useRef<HTMLDivElement>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => setGl(webglAvailable()), []);

  // Altura da superfície num ponto (para a estrada e o carro assentarem no relevo).
  const index = useMemo(() => {
    const map = new Map<string, number>();
    const d = cells[0];
    if (d) cells.forEach((c) => map.set(cellKey(c.p, d.dLat, d.dLng), heightOf(c.rsrp)));
    return map;
  }, [cells]);
  const surface = useMemo(() => {
    const d = cells[0];
    return (p: LatLng) => {
      if (!layers.relief || !d) return FLAT;
      return index.get(cellKey(p, d.dLat, d.dLng)) ?? FLAT;
    };
  }, [index, cells, layers.relief]);

  const animating = !reduce && (layers.waves || layers.drive || layers.spin || introRun);
  const toggle = (k: keyof Layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const chip = (k: keyof Layers, text: string) => (
    <button className="chip" aria-pressed={layers[k]} onClick={() => toggle(k)}>
      {text}
    </button>
  );

  if (gl === false)
    return (
      <div className={`stage3d ${className}`}>
        <div className="stage-fallback">
          Este navegador não tem WebGL, por isso a vista 3D não está disponível. Use
          o mapa 2D.
        </div>
      </div>
    );

  return (
    <div className={`stage3d ${className}`} role="region" aria-label={label}>
      {gl && (
        <Canvas
          dpr={[1, 2]}
          frameloop={animating ? "always" : "demand"}
          camera={{ fov: 34, position: [-41, 56, 67], near: 0.5, far: 800 }}
          gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
          onCreated={(s) => { canvasEl.current = s.gl.domElement; }}
          aria-hidden
        >
          <hemisphereLight args={["#ffffff", "#8899aa", 0.9]} />
          <directionalLight position={[-30, 60, 25]} intensity={0.8} />
          <Ground color={colors.ground} line={colors.accent} />
          <SignalColumns cells={cells} relief={layers.relief} reduce={reduce} mixRef={mixRef} />
          {stations.map((b, i) => (
            <Tower key={b.id} b={b} index={i} sectors={sectors} hBeam={hBeam} radius={radiusKm} layers={layers} colors={colors} reduce={reduce} appear={appear} />
          ))}
          <Road samples={samples} surface={surface} color={colors.ink} />
          {layers.drive && <Car samples={samples} surface={surface} color={colors.accent} reduce={reduce} readout={readout} />}
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            autoRotate={layers.spin && !reduce && !introRun}
            autoRotateSpeed={0.45}
            minDistance={28}
            maxDistance={200}
            maxPolarAngle={1.35}
            target={[0, 1.5, 0]}
            enabled={!introRun}
          />
          <IntroCamera active={introRun} appear={appear} reduce={reduce} onDone={() => setIntroRun(false)} />
          <ResponsiveCamera />
          <TowerLabels stations={stations} labels={labelRefs} appear={appear} />
        </Canvas>
      )}
      <div className="stage-labels" aria-hidden>
        {stations.map((b, i) => (
          <span
            key={b.id}
            className="tower-tag"
            style={{ left: 0, top: 0, display: "none" }}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
          >
            {b.id}
          </span>
        ))}
      </div>
      <div className="stage-hud">
        <div className="chips" role="group" aria-label="Camadas da vista 3D">
          {chip("relief", "Sinal em 3D")}
          {chip("sectors", "Sectores")}
          {!reduce && chip("waves", "Ondas")}
          {chip("drive", "Drive test N1")}
          {!reduce && chip("spin", "Rodar")}
        </div>
        {layers.drive && <div className="readout" ref={readout}>N1<b>—</b>RSRP previsto</div>}
      </div>
      <div className="stage-foot">
        <div className="stage-legend" aria-label="Classes do INCM">
          {classes.map((c) => (
            <span key={c.key}>
              <i style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
        <div className="chips">
          {intro && !reduce && (
            <button className="chip" onClick={() => setIntroRun(true)} disabled={introRun}>
              <RotateCcw size={13} aria-hidden /> Repetir voo
            </button>
          )}
          {showExport && (
            <button className="chip" onClick={() => downloadCanvas(canvasEl.current, "nexacell-3d.png")}>
              <Download size={13} aria-hidden /> Guardar imagem
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
