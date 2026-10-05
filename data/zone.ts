// A zona do projecto (Michafutene) e o tipo LatLng. As zonas disponíveis estão
// em data/zones.ts; a zona activa vem de useProject().zone.
import { zones } from "./zones";

export type { LatLng } from "./zones";
export const zone = zones.michafutene;
