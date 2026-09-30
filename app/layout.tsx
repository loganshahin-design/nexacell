import type { Metadata, Viewport } from "next";
// Fontes instaladas no projecto (Fontsource): funcionam sem Internet.
// Títulos: Archivo expandida (eixo wdth); texto: Source Sans 3; dados: IBM Plex Mono.
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/source-sans-3/index.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexaCell · Dimensionamento LTE em Marracuene",
  description:
    "Dimensionamento de uma rede móvel 4G LTE na zona de expansão de Michafutene (Marracuene), com dados reais do INE, INCM e OpenStreetMap.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1418" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
