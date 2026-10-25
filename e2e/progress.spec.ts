import { expect, test } from "@playwright/test";
import { KEY, reloadUntil, seed, solutions, solve, target, trayPieces } from "./helpers";

test("three correct answers in a row unlock level 2 and survive a reload", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 3; i++) {
    await solve(page);
    await page.click("#done"); // next round
  }
  await expect(page.locator("#level")).toHaveText("Nivå 2");
  await page.reload();
  await expect(page.locator("#level")).toHaveText("Nivå 2");
});

test("two correct answers are not enough to unlock level 2", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 2; i++) {
    await solve(page);
    await page.click("#done");
  }
  await expect(page.locator("#level")).toHaveText("Nivå 1");
});

test("level 1 starts gently: a few pieces, one of which matches the target", async ({ page }) => {
  await page.goto("/");
  const pieces = await trayPieces(page);
  expect(pieces.length).toBeLessThanOrEqual(4);
  const t = await target(page);
  expect(pieces.some((p) => p.num * t.den === t.num * p.den)).toBe(true);
});

test("a miss resets the streak", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 2; i++) {
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
  await seed(page, { levelIndex: 6, streak: 0, stars: 0, muted: true, maxDen: 10 });
  await page.goto("/");
  const pieces = await trayPieces(page);
  expect(pieces.length).toBeGreaterThanOrEqual(5);
  expect(new Set(pieces.map((p) => p.den)).size).toBeGreaterThanOrEqual(3);
  expect(solutions(await target(page), pieces)).toHaveLength(1);
});

test("level 8 can hand out pieces like 3/4 and they still solve", async ({ page }) => {
  await seed(page, { levelIndex: 7, streak: 0, stars: 0, muted: true, maxDen: 10 });
  await page.goto("/");
  await reloadUntil(page, async () => (await trayPieces(page)).some((p) => p.num > 1));
  await solve(page);
  await expect(page.locator("#message")).toContainText("Rätt");
});

test("nothing smaller than tenths ever shows up, on any level", async ({ page }) => {
  for (const levelIndex of [0, 3, 5, 7]) {
    await seed(page, { levelIndex, streak: 0, stars: 0, muted: true, maxDen: 10 });
    await page.goto("/");
    for (let i = 0; i < 8; i++) {
      expect((await target(page)).den).toBeLessThanOrEqual(10);
      for (const p of await trayPieces(page)) expect(p.den).toBeLessThanOrEqual(10);
      await page.reload();
    }
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
  }
});

test("corrupt saved progress falls back to a fresh start", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{not json"), KEY);
  await page.goto("/");
  await expect(page.locator("#level")).toHaveText("Nivå 1");
});
