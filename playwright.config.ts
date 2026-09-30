import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  use: {
    channel: "chromium",
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1050 },
  },
  timeout: 60000,
  workers: 1,
  reporter: "list",
});
