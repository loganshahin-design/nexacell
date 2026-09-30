import { test, expect, Page } from "@playwright/test";

const titles = [
  "Cenário e dados reais",
  "Volume de tráfego",
  "Área de serviço",
  "Padrão de reuso",
  "Localização das BTS",
  "Diagrama de cobertura",
  "Teste de campo",
  "Antenas para sistemas sem fio",
  "Resumo e relatório",
];

async function fresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("percorre todos os passos pela ordem da docente, sem erros", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fresh(page);
  await page.getByRole("button", { name: "Começar" }).click();
  for (const [i, title] of titles.entries()) {
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    if (i < titles.length - 1)
      await page.getByRole("button", { name: /^Próximo/ }).click();
  }
  await expect(page.getByRole("article", { name: "Relatório do projecto" })).toBeVisible();
  for (const code of ["6.1.1", "6.1.2", "6.1.3", "6.1.4", "6.1.5", "6.1.6", "6.2.1"])
    await expect(
      page.getByRole("article", { name: "Relatório do projecto" }).getByRole("heading", { name: new RegExp(`^${code.replace(/\./g, "\\.")}`) }).first(),
    ).toBeVisible();
  expect(errors).toEqual([]);
});

test("a decisão é coerente entre passos e reage às entradas", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Começar" }).click();
  const sidebar = page.locator(".decision strong");
  const before = Number(await sidebar.textContent().then((t) => t!.replace(/\D/g, "")));
  await page.getByRole("button", { name: /Tráfego/ }).first().click();
  await page.getByLabel("Consumo por utilizador").fill("15");
  await expect(sidebar).not.toHaveText(`${before} BTS`);
  const after = Number(await sidebar.textContent().then((t) => t!.replace(/\D/g, "")));
  expect(after).toBeGreaterThan(before);
  // O nº de BTS colocadas no mapa segue o dimensionamento.
  await page.getByRole("button", { name: /Localização/ }).first().click();
  await expect(page.locator(".bts-table tbody tr")).toHaveCount(after);
  // Persiste após recarregar.
  await page.reload();
  await expect(sidebar).toHaveText(`${after} BTS`);
});

test("modo avançado mostra mais parâmetros e as fórmulas", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Começar" }).click();
  await page.getByRole("button", { name: /Área de serviço/ }).first().click();
  await expect(page.getByLabel("Figura de ruído da BTS")).toHaveCount(0);
  await page.getByRole("radio", { name: "Avançado" }).click();
  await expect(page.getByLabel("Figura de ruído da BTS")).toBeVisible();
  await expect(page.locator("details.calc")).toHaveAttribute("open", "");
});

test("desactivar BTS baixa a cobertura prevista", async ({ page }) => {
  await fresh(page);
  await page.getByRole("button", { name: "Começar" }).click();
  await page.getByRole("button", { name: /Localização/ }).first().click();
  const stat = page.locator(".stat", { hasText: "Cobertura prevista" }).locator(".stat-value");
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  const before = await stat.textContent();
  // Desactivar três BTS tem de baixar a cobertura prevista.
  for (const id of ["BTS-01", "BTS-02", "BTS-03"])
    await page.getByLabel(`${id} activa`).uncheck();
  await expect(stat).not.toHaveText(before!);
  await expect(page.getByRole("button", { name: /Redistribuir/ })).toBeEnabled();
});

test("funciona num ecrã de telemóvel sem deslocamento horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fresh(page);
  await page.getByRole("button", { name: "Começar" }).click();
  await page.getByRole("button", { name: "Abrir menu dos passos" }).click();
  await page.getByRole("button", { name: /Cobertura/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Diagrama de cobertura" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
