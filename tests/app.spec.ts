import { test, expect, Page } from "@playwright/test";

const titles = [
  "Zona e dados",
  "Procura e tráfego",
  "Dimensionamento da rede",
  "Reutilização de frequências",
  "Localização das estações",
  "Cobertura da rede",
  "Simulação de percurso",
  "Configuração das antenas",
  "Resumo e relatórios",
];

// Passa o ecrã de entrada. Os testes correm com movimento reduzido, por isso
// não há voo do espaço: Entrar abre logo a Visão geral.
async function enter(page: Page) {
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
}

async function fresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await enter(page);
}

test("percorre todos os passos pelo percurso de planeamento, sem erros", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  for (const [i, title] of titles.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    if (i < titles.length - 1)
      await page.getByRole("button", { name: /^Próximo/ }).click();
  }
  await expect(page.getByRole("article", { name: "Relatório do projecto" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Relatório do projecto" })).not.toContainText(/6\.1\.[1-6]/);
  expect(errors).toEqual([]);
});

test("a decisão é coerente entre passos e reage às entradas", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  const sidebar = page.locator(".decision strong");
  const before = Number(await sidebar.textContent().then((t) => t!.replace(/\D/g, "")));
  await page.getByRole("button", { name: /Tráfego/ }).first().click();
  await page.getByLabel("Consumo por utilizador").fill("15");
  await expect(sidebar).not.toHaveText(`${before} BTS`);
  const after = Number(await sidebar.textContent().then((t) => t!.replace(/\D/g, "")));
  expect(after).toBeGreaterThan(before);
  // O nº de BTS colocadas no mapa segue o dimensionamento.
  await page.getByRole("button", { name: /Estações/ }).first().click();
  await expect(page.locator(".bts-table tbody tr")).toHaveCount(after);
  // Persiste após recarregar (cada visita começa no ecrã de entrada).
  await page.reload();
  await enter(page);
  await expect(sidebar).toHaveText(`${after} BTS`);
});

test("ecrã de entrada: Entrar abre a aplicação e Sair volta", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const login = page.getByRole("region", { name: "Entrada do NexaCell" });
  await expect(login.getByRole("heading", { level: 1, name: "NexaCell" })).toBeVisible();
  for (const name of ["Fahima Samsudin", "Muhammad Shahin", "Saudah Salim"])
    await expect(login.getByText(name)).toBeVisible();
  await enter(page);
  await expect(login).toHaveCount(0);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  // O logótipo do menu também volta ao ecrã de entrada.
  await enter(page);
  await page.getByRole("button", { name: "Voltar ao ecrã de entrada" }).click();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("modo avançado mostra mais parâmetros e as fórmulas", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  await page.getByRole("button", { name: /Dimensionamento/ }).first().click();
  await expect(page.getByLabel("Figura de ruído da BTS")).toHaveCount(0);
  await page.getByRole("radio", { name: "Detalhado" }).click();
  await expect(page.getByLabel("Figura de ruído da BTS")).toBeVisible();
  await expect(page.locator("details.calc")).toHaveAttribute("open", "");
});

test("desactivar BTS baixa a cobertura prevista", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  await page.getByRole("button", { name: /Estações/ }).first().click();
  const stat = page.locator(".stat", { hasText: "Cobertura prevista" }).locator(".stat-value");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  const before = await stat.textContent();
  // Desactivar três BTS tem de baixar a cobertura prevista.
  for (const id of ["BTS-01", "BTS-02", "BTS-03"])
    await page.getByLabel(`${id} activa`).uncheck();
  await expect(stat).not.toHaveText(before!);
  await expect(page.getByRole("button", { name: /Redistribuir/ })).toBeEnabled();
});

test("modo apresentação: setas mudam de passo e Esc sai", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  await page.getByRole("button", { name: /Apresentar/ }).click();
  await expect(page.getByRole("toolbar", { name: "Controlo da apresentação" })).toBeVisible();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { level: 1, name: "Procura e tráfego" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { level: 1, name: "Zona e dados" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar")).toBeVisible();
});

test("comparar cenários e vistas 3D sem erros", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  await page.getByRole("button", { name: /Cobertura/ }).first().click();
  await page.getByRole("radio", { name: "Sinal em 3D" }).click();
  await expect(page.getByRole("region", { name: "Sinal em 3D do sinal previsto" })).toBeVisible();
  await page.getByRole("radio", { name: "Mapa 2D" }).click();
  await expect(page.getByRole("application", { name: "Mapa de cobertura prevista" })).toBeVisible();
  await page.getByRole("button", { name: /Relatórios/ }).first().click();
  await page.getByRole("radio", { name: "1800 MHz e 800 MHz" }).click();
  await expect(page.getByRole("columnheader", { name: "800 MHz · 10 MHz" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("funciona num ecrã de telemóvel sem deslocamento horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fresh(page);
  await page.getByRole("button", { name: "Conhecer a zona" }).click();
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page.getByRole("button", { name: /Cobertura/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Cobertura da rede" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("visão geral permite navegar sem indicar secções concluídas", async ({ page }) => {
  await fresh(page);
  await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
  await expect(page.getByText("Estações activas", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Planear as estações" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Localização das estações" })).toBeVisible();
  await expect(page.locator(".step-link.done")).toHaveCount(0);
  await expect(page.locator(".sidebar")).not.toContainText(/6\.1/);
  await page.locator(".sidebar").getByRole("button", { name: "Visão geral" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Visão geral" })).toBeVisible();
});
