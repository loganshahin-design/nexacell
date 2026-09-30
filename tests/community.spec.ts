import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page, code: string) {
  await page.goto("/");
  const names: Record<string, string> = {
    "20220144": "Fahima Samsudin",
    "20240568": "Muhammad Shahin",
    "20220057": "Saudah Salim",
    "20260001": "Colega de Teste",
  };
  await page.getByLabel("Nome do utilizador").fill(names[code]);
  await page.getByLabel("Código de acesso", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
}
test("três códigos correctos, rejeição de acesso, criação e persistência de utilizadores", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({ path: "tests/login-desktop.png", fullPage: true });
  await page.getByLabel("Nome do utilizador").fill("Fahima Samsudin");
  await page.getByLabel("Código de acesso", { exact: true }).fill("11111111");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator(".access-error")).toContainText("incorrecto");
  for (const [name, code] of [
    ["Fahima Samsudin", "20220144"],
    ["Muhammad Shahin", "20240568"],
    ["Saudah Salim", "20220057"],
  ]) {
    await login(page, code);
    await page.getByRole("button", { name: "Gerir utilizadores" }).click();
    await expect(page.getByRole("dialog")).toContainText(`Sessão de ${name}`);
    await page.getByRole("button", { name: "Terminar sessão" }).click();
    await expect(
      page.getByRole("heading", { name: "Bem-vindo ao NexaCell" }),
    ).toBeVisible();
  }
  await login(page, "20220144");
  await page.getByRole("button", { name: "Utilizadores", exact: true }).click();
  await page.getByLabel("Nome do utilizador").fill("Colega de Teste");
  await page.getByLabel("Código de acesso", { exact: true }).fill("20220144");
  await page.getByRole("button", { name: "Criar utilizador" }).click();
  await expect(page.locator(".access-error")).toContainText("já pertence");
  await page.getByLabel("Código de acesso", { exact: true }).fill("20260001");
  await page.getByRole("button", { name: "Criar utilizador" }).click();
  await expect(page.getByRole("status")).toContainText("Utilizador criado");
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await login(page, "20260001");
  await page.reload();
  await page.getByRole("button", { name: "Gerir utilizadores" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sessão de Colega de Teste",
  );
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.goto("/#Relatório");
  await expect(
    page.getByRole("heading", { name: "Bem-vindo ao NexaCell" }),
  ).toBeVisible();
});
test("planeamento comunitário, orçamento e comparação", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "20240568");
  await page
    .locator("nav")
    .getByRole("button", { name: "Rede para as pessoas", exact: true })
    .click();
  await expect(page.locator(".zone-card")).toHaveCount(4);
  await page
    .getByLabel("Nome da zona 1", { exact: true })
    .fill("Zona residencial prioritária");
  await page.getByLabel("Peso populacional zona 1").fill("60");
  await page
    .getByRole("button", { name: "Guardar cenário de referência" })
    .click();
  await expect(page.locator(".comparison-table")).toBeVisible();
  await page.getByLabel("Orçamento total", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Sugerir nova BTS" }).click();
  await expect(page.getByRole("status")).toContainText("não permite");
  await page.getByLabel("Orçamento total", { exact: true }).fill("30000000");
  await page.getByRole("button", { name: "Sugerir nova BTS" }).click();
  await page.getByRole("button", { name: "Aplicar proposta" }).click();
  await expect(page.locator(".tower-marker")).toHaveCount(4);
  await page.reload();
  await expect(page.getByLabel("Nome da zona 1", { exact: true })).toHaveValue(
    "Zona residencial prioritária",
  );
  await expect(page.locator(".comparison-table")).toBeVisible();
  await expect(page.locator(".tower-marker")).toHaveCount(4);
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await page.screenshot({ path: "tests/people-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "tests/people-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "tests/people-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Gerir utilizadores" }).click();
  await page.getByRole("button", { name: "Terminar sessão" }).click();
  await page.screenshot({ path: "tests/login-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
