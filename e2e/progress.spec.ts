import { expect, test } from "@playwright/test";
import { KEY, seed, solve, target } from "./helpers";

test("five correct answers in a row unlock the next level and survive a reload", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 5; i++) {
    await solve(page);
    await page.click("#done"); // next round
  }
  await expect(page.locator("#level")).toHaveText("Nivå 2");
  await page.reload();
  await expect(page.locator("#level")).toHaveText("Nivå 2");
});

test("a miss resets the streak", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 4; i++) {
    await solve(page);
    await page.click("#done");
  }
  await page.click("#done"); // nothing placed: a miss
  await solve(page);
  await expect(page.locator("#level")).toHaveText("Nivå 1");
});

test("stars are earned per correct answer", async ({ page }) => {
  await page.goto("/");
  await solve(page);
  await expect(page.locator("#stars")).toHaveText("⭐");
});

test("level 5 can ask for 5/9 and it is solved with five 1/9 pieces", async ({ page }) => {
  await seed(page, { levelIndex: 4, streak: 0, stars: 0, muted: true, maxDen: 10 });
  await page.goto("/");
  for (let i = 0; i < 100; i++) {
    const t = await target(page);
    if (t.num === 5 && t.den === 9) break;
    await page.reload();
  }
  expect(await target(page)).toEqual({ num: 5, den: 9 });
  await expect(page.locator("#ring path.slot")).toHaveCount(9);
  await solve(page);
  await expect(page.locator("#message")).toContainText("Rätt");
  await expect(page.locator(".slot.placed")).toHaveCount(5);
});

test("corrupt saved progress falls back to a fresh start", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{not json"), KEY);
  await page.goto("/");
  await expect(page.locator("#level")).toHaveText("Nivå 1");
});
