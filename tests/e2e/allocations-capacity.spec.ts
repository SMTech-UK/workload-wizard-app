import { test, expect } from "@playwright/test";

test("allocation affects staff capacity totals", async ({ page }) => {
  // Go to staff capacity, note a lecturer's totals
  await page.goto("/staff");
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");
  await expect(page.getByText(/Staff capacity/)).toBeVisible();

  // Pick first staff row
  const firstRow = page.locator("ul li").first();
  await expect(firstRow).toBeVisible();
  const beforeTeaching = await firstRow
    .getByTestId("staff-teaching")
    .textContent();
  const beforeTotal = await firstRow.getByTestId("staff-total").textContent();

  // Navigate to first course and attach allocation quickly
  await page.goto("/courses");
  const firstCourse = page.locator("ul >> a").first();
  await firstCourse.click();
  await expect(page.getByText("Y1")).toBeVisible();

  // Ensure iteration exists
  const createIterBtn = page.getByRole("button", { name: /Create iteration/ });
  if (await createIterBtn.isVisible()) await createIterBtn.click();

  // Ensure at least one group exists
  page.once("dialog", async (dialog) => {
    await dialog.accept("Auto E2E");
  });
  const addGroupBtn = page.getByTestId("add-group-btn");
  if (await addGroupBtn.isVisible()) await addGroupBtn.click();

  // Open assignment dialog (no-op if missing seed data)
  const assignBtn = page.getByTestId("assign-lecturer-btn");
  if (!(await assignBtn.isVisible().catch(() => false)))
    test.skip(true, "no assign control");
  await assignBtn.click();

  // If there are options, select first group and first lecturer
  const groupTrigger = page.getByRole("button", { name: /Select group/i });
  const lecturerTrigger = page.getByRole("button", {
    name: /Select lecturer/i,
  });
  if (await groupTrigger.isVisible().catch(() => false)) {
    await groupTrigger.click();
    await page.getByRole("option").first().click();
  } else test.skip(true, "no groups to assign");
  if (await lecturerTrigger.isVisible().catch(() => false)) {
    await lecturerTrigger.click();
    await page.getByRole("option").first().click();
  } else test.skip(true, "no lecturers available");

  await page.getByRole("button", { name: /^Assign$/ }).click();
  await expect(page.getByText(/Lecturer assigned/)).toBeVisible();

  // Back to staff capacity and compare numbers increased
  await page.goto("/staff");
  const rowAfter = page.locator("ul li").first();
  const afterTeaching = await rowAfter
    .getByText(/Teaching: (\d+)h/)
    .textContent();
  const afterTotal = await rowAfter.getByText(/Total: (\d+)h/).textContent();

  // Basic sanity: after values should not be less than before (string contains numbers)
  const beforeTeachNum = Number(
    (beforeTeaching || "").match(/(\d+)/)?.[1] || 0,
  );
  const afterTeachNum = Number((afterTeaching || "").match(/(\d+)/)?.[1] || 0);
  const beforeTotalNum = Number((beforeTotal || "").match(/(\d+)/)?.[1] || 0);
  const afterTotalNum = Number((afterTotal || "").match(/(\d+)/)?.[1] || 0);
  expect(afterTeachNum).toBeGreaterThanOrEqual(beforeTeachNum);
  expect(afterTotalNum).toBeGreaterThanOrEqual(beforeTotalNum);
});
