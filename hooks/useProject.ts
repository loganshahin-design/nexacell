"use client";
import { useEffect, useState } from "react";
import { defaults, initialBTS, initialPoints } from "@/data/defaults";
import { Params, BTS, FieldPoint } from "@/types";
import { scenario } from "@/data/scenario";
export function useProject() {
  const [params, setParams] = useState<Params>(defaults);
  const [stations, setStations] = useState<BTS[]>(initialBTS);
  const [points, setPoints] = useState<FieldPoint[]>(initialPoints);
  const [theme, setTheme] = useState("dark");
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(scenario.projectKey);
      if (!raw) {
        const previous = localStorage.getItem("nexacell-v1");
        if (previous) {
          const old = JSON.parse(previous);
          setTheme(old.theme === "light" ? "light" : "dark");
        }
      }
      if (raw) {
        const data = JSON.parse(raw);
        if (
          data.params &&
          Array.isArray(data.stations) &&
          Array.isArray(data.points)
        ) {
          setParams({ ...defaults, ...data.params });
          setStations(data.stations);
          setPoints(data.points);
          setTheme(data.theme === "light" ? "light" : "dark");
        }
      }
    } catch {
      setStorageError(true);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(
        scenario.projectKey,
        JSON.stringify({
          scenario: scenario.id,
          params,
          stations,
          points,
          theme,
        }),
      );
    } catch {
      setStorageError(true);
    }
  }, [params, stations, points, theme, loaded]);
  return {
    params,
    setParams,
    stations,
    setStations,
    points,
    setPoints,
    theme,
    setTheme,
    loaded,
    storageError,
  };
}
