import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexaCell · Dimensionamento LTE em Marracuene",
  description:
    "Dimensionamento de uma rede móvel 4G LTE na zona de expansão de Michafutene (Marracuene), com dados reais do INE, INCM e OpenStreetMap.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
