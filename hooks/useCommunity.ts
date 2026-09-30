"use client";
import { useEffect, useState } from "react";
import { CommunityPlan, communityDefaults } from "@/types/community";
import { scenario } from "@/data/scenario";
export function useCommunity() {
  const [plan, setPlan] = useState<CommunityPlan>(communityDefaults),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(scenario.communityKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (
          data.zones?.length === 4 &&
          data.zones.every(
            (z: { weight: number; priority: number }) =>
              Number.isFinite(z.weight) &&
              z.weight > 0 &&
              z.priority >= 1 &&
              z.priority <= 5,
          )
        )
          setPlan({ ...communityDefaults, ...data });
      }
    } catch {
      setError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(scenario.communityKey, JSON.stringify(plan));
    } catch {
      setError(true);
    }
  }, [plan, ready]);
  return { plan, setPlan, error };
}
