import { expect, test } from "@playwright/test";

test("home page is usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "To get started",
  );
});
