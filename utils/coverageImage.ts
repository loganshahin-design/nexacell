import { zone, LatLng } from "@/data/zone";
import { bbox } from "@/calculations/geo";
import { classes, ClassKey } from "@/calculations/coverage";
import { BTS } from "@/types";

type Cell = { p: LatLng; dLat: number; dLng: number; cls: ClassKey };

// Desenha o diagrama de cobertura num canvas (fundo branco, pronto a imprimir).
export function coverageImage(cells: Cell[], stations: BTS[], title: string) {
  const [sw, ne] = bbox(zone.polygon);
  const k = Math.cos((sw[0] * Math.PI) / 180);
  const W = 1200,
    pad = 40,
    top = 70,
    legendH = 60;
  const mapW = W - pad * 2;
  const mapH = ((ne[0] - sw[0]) / ((ne[1] - sw[1]) * k)) * mapW;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.round(top + mapH + legendH + pad);
  const g = canvas.getContext("2d")!;
  const x = (p: LatLng) => pad + ((p[1] - sw[1]) / (ne[1] - sw[1])) * mapW;
  const y = (p: LatLng) => top + ((ne[0] - p[0]) / (ne[0] - sw[0])) * mapH;
  const color = Object.fromEntries(classes.map((c) => [c.key, c.color])) as Record<ClassKey, string>;

  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#0f1d26";
  g.font = "700 26px Arial, sans-serif";
  g.fillText(title, pad, 44);

  cells.forEach((c) => {
    g.fillStyle = color[c.cls];
    const x0 = x([c.p[0] + c.dLat / 2, c.p[1] - c.dLng / 2]);
    const y0 = y([c.p[0] + c.dLat / 2, c.p[1] - c.dLng / 2]);
    const x1 = x([c.p[0] - c.dLat / 2, c.p[1] + c.dLng / 2]);
    const y1 = y([c.p[0] - c.dLat / 2, c.p[1] + c.dLng / 2]);
    g.fillRect(x0, y0, x1 - x0 + 0.6, y1 - y0 + 0.6);
  });

  g.setLineDash([10, 7]);
  g.strokeStyle = "#0b5fc4";
  g.lineWidth = 3;
  g.beginPath();
  zone.polygon.forEach((p, i) => (i ? g.lineTo(x(p), y(p)) : g.moveTo(x(p), y(p))));
  g.closePath();
  g.stroke();
  g.setLineDash([]);

  g.strokeStyle = "rgba(15,29,38,0.75)";
  g.lineWidth = 6;
  g.beginPath();
  zone.route.forEach((p, i) => (i ? g.lineTo(x(p), y(p)) : g.moveTo(x(p), y(p))));
  g.stroke();

  stations.forEach((b) => {
    const px = x([b.lat, b.lng]),
      py = y([b.lat, b.lng]);
    g.fillStyle = b.enabled ? "#b4441c" : "#8a8f98";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(px, py, 11, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = "#ffffff";
    g.font = "700 12px Arial, sans-serif";
    g.textAlign = "center";
    g.fillText(b.id.replace("BTS-", ""), px, py + 4);
    g.textAlign = "left";
  });

  let lx = pad;
  const ly = top + mapH + 34;
  g.font = "600 17px Arial, sans-serif";
  classes.forEach((c) => {
    g.fillStyle = c.color;
    g.fillRect(lx, ly - 15, 20, 20);
    g.fillStyle = "#0f1d26";
    const text = `${c.label} ${c.min === -Infinity ? "< −105" : `≥ ${c.min}`} dBm`;
    g.fillText(text, lx + 28, ly);
    lx += g.measureText(text).width + 60;
  });
  return canvas;
}
