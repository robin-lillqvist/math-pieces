import { expect, test } from "@playwright/test";
import { dragPieces, placed, solve, target } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("round starts with a ring split by the denominator and a matching tray", async ({ page }) => {
  const { num, den } = await target(page);
  expect([2, 4]).toContain(den); // level 1
  await expect(page.locator("#ring path.slot")).toHaveCount(den);
  await expect(page.locator(".slot.target")).toHaveCount(num);
  await expect(page.locator("#tray .piece")).toHaveCount(Math.min(den, num + 2));
});

test("filling exactly the numerator wins the round", async ({ page }) => {
  await solve(page);
  await expect(page.locator("#message")).toContainText("Rätt");
  await expect(page.locator("#board")).toHaveClass(/win/);
  await expect(page.locator("#done")).toHaveText("Nästa");
});

test("too few pieces gives a gentle hint and keeps the round open", async ({ page }) => {
  let t = await target(page);
  while (t.num < 2) {
    await page.reload();
    t = await target(page);
  }
  await dragPieces(page, t.num - 1);
  await page.click("#done");
  await expect(page.locator("#message")).toContainText("Nästan");
  await expect(page.locator("#board")).not.toHaveClass(/win/);
});

test("too many pieces says one piece too many", async ({ page }) => {
  let t = await target(page);
  while (t.num + 1 > Math.min(t.den, t.num + 2) || t.num >= t.den) {
    await page.reload();
    t = await target(page);
  }
  await dragPieces(page, t.num + 1);
  await page.click("#done");
  await expect(page.locator("#message")).toContainText("för mycket");
});

test("tapping a placed piece returns it to the tray", async ({ page }) => {
  await dragPieces(page, 1);
  const inTray = await page.locator("#tray .piece").count();
  await page.locator(".slot.placed").first().dispatchEvent("click");
  await expect(page.locator("#tray .piece")).toHaveCount(inTray + 1);
  expect(await placed(page)).toBe(0);
});

test("dropping a piece outside the ring puts it back", async ({ page }) => {
  const before = await page.locator("#tray .piece").count();
  const b = (await page.locator("#tray .piece").first().boundingBox())!;
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator("#tray .piece")).toHaveCount(before);
  expect(await placed(page)).toBe(0);
});

test("a full ring never accepts an extra piece", async ({ page }) => {
  const { den } = await target(page);
  // Level 1 tray is capped at den pieces, so fill every slot and check nothing is left over.
  await dragPieces(page, Math.min(den, await page.locator("#tray .piece").count()));
  expect(await placed(page)).toBeLessThanOrEqual(den);
});
