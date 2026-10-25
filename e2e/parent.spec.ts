import { expect, test } from "@playwright/test";
import { KEY, seed, target } from "./helpers";

async function openParentCorner(page: import("@playwright/test").Page) {
  const b = (await page.locator("#level").boundingBox())!;
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.mouse.down();
  await page.waitForTimeout(2200);
  await page.mouse.up();
  await expect(page.locator("dialog[open]")).toBeVisible();
}

test("a short press does not open the parent corner", async ({ page }) => {
  await page.goto("/");
  const b = (await page.locator("#level").boundingBox())!;
  await page.mouse.move(b.x + 5, b.y + 5);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(2000);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("mute is saved", async ({ page }) => {
  await page.goto("/");
  await openParentCorner(page);
  await page.check("#mute");
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).muted, KEY);
  expect(saved).toBe(true);
});

test("the level picker jumps to another level", async ({ page }) => {
  await page.goto("/");
  await openParentCorner(page);
  await page.selectOption("#level-select", { value: "2" });
  await page.click("#close-parent");
  await expect(page.locator("#level")).toHaveText("Nivå 3");
  expect((await target(page)).den).toBe(8);
});

test("reset clears level and stars", async ({ page }) => {
  await seed(page, { levelIndex: 3, streak: 2, stars: 9, muted: false, maxDen: 10 });
  await page.goto("/");
  await expect(page.locator("#level")).toHaveText("Nivå 4");
  await openParentCorner(page);
  await page.click("#reset");
  await page.click("#close-parent");
  await expect(page.locator("#level")).toHaveText("Nivå 1");
  await expect(page.locator("#stars")).toHaveText("");
});

test("free play respects the largest denominator", async ({ page }) => {
  await seed(page, { levelIndex: 6, streak: 0, stars: 0, muted: true, maxDen: 4 });
  await page.goto("/");
  await expect(page.locator("#level")).toHaveText("Fri lek");
  for (let i = 0; i < 20; i++) {
    expect((await target(page)).den).toBeLessThanOrEqual(4);
    await page.reload();
  }
});
