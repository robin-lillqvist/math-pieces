import { expect, test } from "@playwright/test";
import { KEY, reloadUntil, seed, solutions, solve, target, trayPieces } from "./helpers";

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

test("later levels hand out bigger trays with more different sizes", async ({ page }) => {
  await seed(page, { levelIndex: 4, streak: 0, stars: 0, muted: true, maxDen: 10 });
  await page.goto("/");
  const pieces = await trayPieces(page);
  expect(pieces.length).toBeGreaterThanOrEqual(7);
  expect(new Set(pieces.map((p) => p.den)).size).toBeGreaterThanOrEqual(3);
  expect(solutions(await target(page), pieces)).toHaveLength(1);
});

test("level 6 can hand out pieces like 3/4 and they still solve", async ({ page }) => {
  await seed(page, { levelIndex: 5, streak: 0, stars: 0, muted: true, maxDen: 10 });
  await page.goto("/");
  await reloadUntil(page, async () => (await trayPieces(page)).some((p) => p.num > 1));
  await solve(page);
  await expect(page.locator("#message")).toContainText("Rätt");
});

test("corrupt saved progress falls back to a fresh start", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{not json"), KEY);
  await page.goto("/");
  await expect(page.locator("#level")).toHaveText("Nivå 1");
});
