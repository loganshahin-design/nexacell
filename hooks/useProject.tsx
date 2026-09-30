"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaults, fields } from "@/data/defaults";
import { zone } from "@/data/zone";
import { BTS, Mode, Params } from "@/types";
import { dimension } from "@/calculations/network";
import { polygonArea } from "@/calculations/geo";
import { autoPlace, nextId } from "@/calculations/placement";

const STORAGE_KEY = "nexacell-v2";
export const zoneArea = polygonArea(zone.polygon);

type Stored = {
  params: Params;
  // null = colocação automática com o nº de BTS dimensionado.
  stations: BTS[] | null;
  mode: Mode;
  step: number;
  theme: "light" | "dark";
};

const initial: Stored = {
  params: defaults,
  stations: null,
  mode: "basico",
  step: 0,
  theme: "light",
};

function restore(raw: string | null): Stored {
  if (!raw) return initial;
  const data = JSON.parse(raw);
  const params = { ...defaults };
  for (const key of Object.keys(fields) as (keyof typeof fields)[])
    if (Number.isFinite(data?.params?.[key])) params[key] = data.params[key];
  if (["urbano", "suburbano", "rural"].includes(data?.params?.environment))
    params.environment = data.params.environment;
  const valid = (b: BTS) =>
    typeof b?.id === "string" &&
    Number.isFinite(b.lat) &&
    Number.isFinite(b.lng) &&
    Number.isFinite(b.azimuth) &&
    typeof b.enabled === "boolean";
  return {
    params,
    stations:
      Array.isArray(data?.stations) && data.stations.every(valid)
        ? data.stations
        : null,
    mode: data?.mode === "avancado" ? "avancado" : "basico",
    step: Number.isInteger(data?.step) ? Math.min(Math.max(data.step, 0), 9) : 0,
    theme: data?.theme === "dark" ? "dark" : "light",
  };
}

function useProjectState() {
  const [state, setState] = useState<Stored>(initial);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      setState(restore(localStorage.getItem(STORAGE_KEY)));
    } catch {
      setStorageError(true);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.theme = state.theme;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageError(true);
    }
  }, [state, loaded]);

  const { params } = state;
  const dim = useMemo(() => dimension(params, zoneArea), [params]);
  const automatic = useMemo(
    () => autoPlace(zone.polygon, dim.required),
    [dim.required],
  );
  const stations = state.stations ?? automatic;

  const setParam = useCallback(
    <K extends keyof Params>(key: K, value: Params[K]) =>
      setState((s) => ({ ...s, params: { ...s.params, [key]: value } })),
    [],
  );
  const editStations = useCallback(
    (fn: (list: BTS[]) => BTS[]) =>
      setState((s) => ({ ...s, stations: fn(s.stations ?? automatic) })),
    [automatic],
  );

  return {
    ...state,
    loaded,
    storageError,
    dim,
    stations,
    isAutomatic: state.stations === null,
    setParam,
    setParams: (patch: Partial<Params>) =>
      setState((s) => ({ ...s, params: { ...s.params, ...patch } })),
    setStep: (step: number) =>
      setState((s) => ({ ...s, step: Math.min(Math.max(step, 0), 9) })),
    setMode: (mode: Mode) => setState((s) => ({ ...s, mode })),
    setTheme: (theme: "light" | "dark") => setState((s) => ({ ...s, theme })),
    moveStation: (id: string, lat: number, lng: number) =>
      editStations((l) =>
        l.map((b) =>
          b.id === id ? { ...b, lat: +lat.toFixed(5), lng: +lng.toFixed(5) } : b,
        ),
      ),
    updateStation: (id: string, patch: Partial<BTS>) =>
      editStations((l) => l.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    addStation: (lat: number, lng: number) =>
      editStations((l) => [
        ...l,
        {
          id: nextId(l),
          lat: +lat.toFixed(5),
          lng: +lng.toFixed(5),
          enabled: true,
          azimuth: 0,
        },
      ]),
    removeStation: (id: string) =>
      editStations((l) => l.filter((b) => b.id !== id)),
    resetStations: () => setState((s) => ({ ...s, stations: null })),
    resetAll: () => setState((s) => ({ ...initial, theme: s.theme, step: 1 })),
  };
}

export type Project = ReturnType<typeof useProjectState>;
const Context = createContext<Project | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const project = useProjectState();
  return <Context.Provider value={project}>{children}</Context.Provider>;
}

export function useProject() {
  const value = useContext(Context);
  if (!value) throw new Error("useProject fora do ProjectProvider");
  return value;
}
