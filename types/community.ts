import { BTS } from "./index";
export type Zone = {
  id: string;
  name: string;
  kind: string;
  weight: number;
  priority: number;
  color: string;
};
export type CommunityPlan = {
  zones: Zone[];
  splitX: number;
  splitY: number;
  budget: number;
  siteCost: number;
  sectorCost: number;
  annualCost: number;
  baseline: BTS[] | null;
};
export const communityDefaults: CommunityPlan = {
  zones: [
    {
      id: "north-west",
      name: "Comunidade residencial",
      kind: "Residencial",
      weight: 45,
      priority: 3,
      color: "#22d3ee",
    },
    {
      id: "north-east",
      name: "Educação e serviços",
      kind: "Educação",
      weight: 20,
      priority: 5,
      color: "#a78bfa",
    },
    {
      id: "south-west",
      name: "Comércio e encontro",
      kind: "Comércio",
      weight: 25,
      priority: 4,
      color: "#34d399",
    },
    {
      id: "south-east",
      name: "Mobilidade e expansão",
      kind: "Mobilidade",
      weight: 10,
      priority: 2,
      color: "#fbbf24",
    },
  ],
  splitX: 50,
  splitY: 50,
  budget: 15000000,
  siteCost: 2500000,
  sectorCost: 350000,
  annualCost: 200000,
  baseline: null,
};
