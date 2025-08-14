import { test, expect } from "./fixtures";

test("courses create and list", async ({ page }) => {
  const code = `E2E-C${Date.now()}`;
  const name = `Course ${Date.now()}`;

  await page.goto("/courses");
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");

  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: /^Create$/ }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(`${code} — ${name}`) }),
  ).toBeVisible();
});
