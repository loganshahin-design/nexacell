import { test, expect } from "@playwright/test";
import { scenario } from "../data/scenario";
test("novo cenário não reatribui medições antigas e mantém o relatório completo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("legacy-seeded")) {
      localStorage.setItem(
        "nexacell-v1",
        JSON.stringify({
          params: { population: 123 },
          stations: [{ id: "legacy", lat: 0, lng: 0 }],
          points: [{ id: "real-legacy", real: true, lat: 1, lng: 1 }],
          theme: "dark",
        }),
      );
      localStorage.setItem("legacy-seeded", "yes");
    }
  });
  await page.goto("/");
  await page.getByLabel("Nome do utilizador").fill("Fahima Samsudin");
  await page.getByLabel("Código de acesso", { exact: true }).fill("20220144");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator('.project-switch')).toContainText(scenario.shortName);
  await expect(
    page.getByRole("heading", { name: "Justificação da Área de Estudo" }),
  ).toBeVisible();
  await expect(page.locator(".tower-marker")).toHaveCount(3);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    scenario.projectKey,
  );
  expect(saved.params.population).toBe(18000);
  expect(saved.points.every((p: { real: boolean }) => !p.real)).toBeTruthy();
  expect(saved.stations[0].lat).toBeGreaterThan(-25.76);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("nexacell-v1")!).points[0].id,
    ),
  ).toBe("real-legacy");
  await page
    .locator("nav")
    .getByRole("button", { name: "Área de Serviço", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Parâmetros do Cenário" }),
  ).toBeVisible();
  await page
    .getByLabel("Utilizadores potenciais", { exact: true })
    .fill("9000");
  await expect(page.locator(".metric-number").nth(1)).toHaveText(/9\s?000/);
  await page
    .locator("nav")
    .getByRole("button", { name: "Relatório", exact: true })
    .click();
  await expect(page.locator(".report h3")).toHaveCount(17);
  await expect(page.locator(".report")).toContainText(
    "Sem medições reais inseridas.",
  );
  await expect(page.locator(".report h2")).toHaveText(scenario.reportTitle);
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "tests/marracuene-relatorio.pdf",
    format: "A4",
    printBackground: true,
  });
});
