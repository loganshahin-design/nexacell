"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { targetOf } from "@/data/intro";
import { TURN_MS, ZOOM_MS, type EngineProps } from "./engine";

const EARTH_KM = 6371;
const START = 3.4; // distância inicial da câmara (raios terrestres)
const END = 1.0025; // ≈ 16 km de altitude

// Ponto (lat, lng) na esfera do three.js, com a textura equirectangular.
function toVec(lat: number, lng: number, r = 1) {
  const phi = ((lng + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const atmosphere = {
  vertexShader: `varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vNormal; void main(){ float i = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.32, 0.62, 1.0, 1.0) * i; }`,
};

function Earth({ texture, ...props }: EngineProps & { texture: THREE.Texture }) {
  const { phase, reduce, layout } = props;
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const { camera, size } = useThree();
  const cb = useRef(props);
  cb.current = props;
  const point = useMemo(() => { const [LAT, LNG] = targetOf(props.zone); return toVec(LAT, LNG); }, [props.zone]);
  // Rotação que põe Michafutene virada para a câmara.
  const aim = useMemo(() => ({ y: -Math.atan2(point.x, point.z), x: Math.atan2(point.y, Math.hypot(point.x, point.z)) }), [point]);
  // No ecrã de entrada a Terra fica mais longe e ao lado do cartão (como no globo online).
  const start = layout === "login" ? START + 0.8 : START;
  const half = start * Math.tan((20 * Math.PI) / 180);
  const wide = size.width >= 900;
  const offsetX = layout === "login" && wide ? half * (size.width / size.height) * 0.42 : 0;
  const offsetY = layout === "login" && !wide ? half * 0.58 : 0;
  const zoom = useRef<{ t0: number | null; y0: number; x0: number; done: boolean }>({ t0: null, y0: 0, x0: 0, done: false });
  const lastTel = useRef(0);

  // Começa com África quase de frente; a rotação traz Moçambique para o centro.
  useEffect(() => {
    group.current.rotation.set(aim.x * 0.6, aim.y - 0.5, 0);
  }, [aim]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    const t = clock.elapsedTime;
    ring.current.scale.setScalar(1 + ((t * 0.8) % 1) * 2.5);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - ((t * 0.8) % 1));
    let dist = start;
    if (phase === "orbit") {
      if (!reduce) g.rotation.y += dt * 0.05;
      g.position.set(offsetX, offsetY, 0);
    } else {
      const z = zoom.current;
      if (z.t0 === null) {
        // Escolhe o caminho angular mais curto até ao alvo.
        const d = ((aim.y - g.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        z.t0 = t;
        z.y0 = aim.y - d;
        z.x0 = g.rotation.x;
      }
      // Duas fases, como no globo online: primeiro roda e centra Moçambique,
      // depois desce.
      const elapsed = (t - z.t0) * 1000;
      const fr = reduce ? 1 : ease(Math.min(1, elapsed / TURN_MS));
      const f = reduce ? 1 : Math.min(1, Math.max(0, (elapsed - TURN_MS) / (ZOOM_MS - TURN_MS)));
      g.rotation.y = z.y0 + (aim.y - z.y0) * fr;
      g.rotation.x = z.x0 + (aim.x - z.x0) * fr;
      g.position.set(offsetX * (1 - fr), offsetY * (1 - fr), 0);
      // Altitude em escala logarítmica e a ritmo quase constante: cada etapa
      // do HUD dura mais ou menos o mesmo.
      dist = 1 + (start - 1) * ((END - 1) / (start - 1)) ** (0.3 * ease(f) + 0.7 * f);
      if (f >= 1 && !z.done) {
        z.done = true;
        cb.current.onArrive();
      }
    }
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.near = Math.max(0.0005, (dist - 1) * 0.5);
    camera.updateProjectionMatrix();
    if (t - lastTel.current > 0.07) {
      lastTel.current = t;
      const v = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion.clone().invert()).normalize();
      const lat = (Math.asin(v.y) * 180) / Math.PI;
      const lng = ((Math.atan2(v.z, -v.x) / (Math.PI * 2)) * 360 - 180 + 540) % 360 - 180;
      cb.current.onTelemetry({ altitudeKm: (dist - 1) * EARTH_KM, center: [lat, lng] });
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      <mesh scale={1.07}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial args={[atmosphere]} side={THREE.BackSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </mesh>
      <group position={point.clone().multiplyScalar(1.002)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), point.clone().normalize())}>
        <mesh>
          <circleGeometry args={[0.008, 24]} />
          <meshBasicMaterial color="#ffb238" />
        </mesh>
        <mesh ref={ring}>
          <ringGeometry args={[0.012, 0.016, 48]} />
          <meshBasicMaterial color="#ffd27a" transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export default function OfflineGlobe(props: EngineProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const cb = useRef(props);
  cb.current = props;
  useEffect(() => {
    new THREE.TextureLoader().load(
      "/intro/earth.jpg",
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        setTexture(t);
        cb.current.onReady();
      },
      undefined,
      () => cb.current.onFail(),
    );
  }, []);
  return (
    <div className="globe-offline">
      <Canvas dpr={[1, 2]} camera={{ fov: 40, position: [0, 0, START], near: 0.01, far: 200 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[-3, 2, 4]} intensity={2.2} />
        <Stars radius={70} depth={40} count={4500} factor={3.2} fade speed={props.reduce ? 0 : 0.6} />
        {texture && <Earth {...props} texture={texture} />}
      </Canvas>
      <span className="globe-credit">Imagem da Terra: NASA Visible Earth (Blue Marble)</span>
    </div>
  );
}
