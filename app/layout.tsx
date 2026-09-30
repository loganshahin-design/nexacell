import type { Metadata } from "next";
import { scenario } from "@/data/scenario";
import "./globals.css";
import "./community.css";
import "./identity.css";
import "leaflet/dist/leaflet.css";
import "katex/dist/katex.min.css";
export const metadata: Metadata = {
  title: `NexaCell · ${scenario.shortName}`,
  description: scenario.title,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
