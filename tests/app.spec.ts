import { initialBTS } from "../data/defaults";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nome do utilizador").fill("Fahima Samsudin");
  await page.getByLabel("Código de acesso", { exact: true }).fill("20220144");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral da rede" }),
  ).toBeVisible();
});
test("navegação, cálculos, mapa, persistência e responsividade", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Visão geral da rede" }),
  ).toBeVisible();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator(".tower-marker")).toHaveCount(3);
  await page.screenshot({
    path: "tests/dashboard-desktop.png",
    fullPage: true,
  });
  for (const name of [
    "Área de Serviço",
    "Volume de Tráfego",
    "Planeamento BTS",
    "Cobertura",
    "Padrão de Reuso",
    "Antenas",
    "Cálculos",
    "Teste de Campo",
    "Simulação",
    "Relatório",
  ]) {
    await page
      .locator("nav")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();
  }
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  const pop = page
    .locator("label")
    .filter({ hasText: "População considerada" })
    .locator("input");
  await pop.fill("20000");
  await page
    .locator("nav")
    .getByRole("button", { name: "Área de Serviço", exact: true })
    .click();
  await expect(page.locator(".metric-number").nth(1)).toHaveText("15 000");
  await page.reload();
  await expect(page.locator(".metric-number").nth(1)).toHaveText("15 000");
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: "tests/dashboard-light.png", fullPage: true });
  await page.getByRole("button", { name: "Modo escuro", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Planeamento BTS", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar BTS", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Concluir edição" }).click();
  await expect(page.locator(".station-card")).toHaveCount(4);
  await page.locator(".station-card").last().click();
  await page.getByRole("button", { name: "Remover BTS", exact: true }).click();
  await expect(page.locator(".station-card")).toHaveCount(3);
  await page
    .locator("nav")
    .getByRole("button", { name: "Teste de Campo", exact: true })
    .click();
  await page.getByRole("button", { name: "Novo ponto de teste" }).click();
  await page.getByRole("button", { name: "Guardar ponto" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .locator("nav")
    .getByRole("button", { name: "Simulação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Executar Simulação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Simulação concluída");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await page.screenshot({ path: "tests/dashboard-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("camadas, reposicionamento e relatório de impressão", async ({ page }) => {
  await page.goto("/#Cobertura");
  await expect(page.locator(".tower-marker")).toHaveCount(3);
  const marker = page.locator(".tower-marker").first();
  const position = await marker.boundingBox();
  if (!position) throw new Error("BTS sem posição no mapa");
  await page.mouse.move(position.x + 22, position.y + 15);
  await page.mouse.down();
  await page.mouse.move(position.x + 62, position.y + 45, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("nexacell-marracuene-v1")!)
            .stations[0].lat,
      ),
    )
    .not.toBe(initialBTS[0].lat);
  await page.locator(".map-layers summary").click();
  for (const name of [
    "Sectores",
    "Sobreposição",
    "Sem cobertura",
    "Pontos de teste",
  ])
    await page.getByLabel(name, { exact: true }).check();
  await page.getByLabel("BTS", { exact: true }).uncheck();
  await expect(page.locator(".tower-marker")).toHaveCount(0);
  await page.getByLabel("BTS", { exact: true }).check();
  await expect(page.locator(".tower-marker")).toHaveCount(3);
  await page
    .locator("nav")
    .getByRole("button", { name: "Relatório", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".report")).toBeVisible();
  await page.pdf({
    path: "tests/relatorio-exemplo.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of [
    "Área de Serviço",
    "Volume de Tráfego",
    "Planeamento BTS",
    "Cobertura",
    "Padrão de Reuso",
    "Antenas",
    "Cálculos",
    "Teste de Campo",
    "Simulação",
    "Relatório",
  ]) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .locator("nav")
      .getByRole("button", { name, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      name,
    ).toBeTruthy();
  }
});
