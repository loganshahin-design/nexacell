// Copia o worker do MapLibre para public/, de onde o navegador o carrega.
// O bundler do Next não resolve o worker ES module do MapLibre 6 sozinho.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "maplibre");
mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  copyFileSync(join(from, f), join(to, f));
console.log("MapLibre worker copiado para public/maplibre/");
