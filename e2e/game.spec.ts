import { expect, test } from "@playwright/test";
import {
  dragPiece,
  placedPieces,
  reloadUntil,
  solutions,
  solve,
  target,
  total,
  trayPieces,
  value,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("shows a dashed target arc and a tray of mixed pieces", async ({ page }) => {
  await expect(page.locator("#ring .target-arc")).toHaveCount(1);
  const pieces = await trayPieces(page);
  expect(pieces.length).toBeGreaterThanOrEqual(4);
  expect(new Set(pieces.map((p) => `${p.num}/${p.den}`)).size).toBeGreaterThanOrEqual(3);
});

test("explains the task in words: what is missing and how to fill it", async ({ page }) => {
  await expect(page.locator("#instr-title")).toHaveText(/^Det fattas .+\.$/);
  // level 1 has a single matching piece, so the wording is the simple one
  await expect(page.locator("#instr-body")).toContainText("exakt lika stor");
});

test("the instruction names the target fraction in words and changes with each round", async ({ page }) => {
  const words: Record<string, string> = {
    "1/2": "en halv",
    "1/3": "en tredjedel",
    "2/3": "två tredjedelar",
    "1/4": "en fjärdedel",
    "3/4": "tre fjärdedelar",
    "1/6": "en sjättedel",
  };
  const titles = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const t = await target(page);
    const expected = words[`${t.num}/${t.den}`];
    if (expected) await expect(page.locator("#instr-title")).toHaveText(`Det fattas ${expected}.`);
    titles.add((await page.locator("#instr-title").textContent())!);
    await page.reload();
  }
  expect(titles.size).toBeGreaterThanOrEqual(2);
});

test("later levels explain that pieces must add up together", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ levelIndex: 3, streak: 0, stars: 0, muted: true, maxDen: 10 })), "brakpajen.progress.v1");
  await page.reload();
  await expect(page.locator("#instr-body")).toContainText("Fyll luckan med bitarna du har");
  await expect(page.locator("#instr-body")).toContainText("Tillsammans");
});

test("the hints say what to do next", async ({ page }) => {
  await reloadUntil(page, async () => {
    const t = await target(page);
    return (await trayPieces(page)).some((p) => value(p) > value(t));
  });
  const t = await target(page);
  const big = (await trayPieces(page)).find((p) => value(p) > value(t))!;
  await dragPiece(page, `${big.num}/${big.den}`);
  await page.click("#done");
  await expect(page.locator("#message")).toContainText("Tryck på en bit för att ta bort den");
});

test("exactly one combination of the tray makes the target", async ({ page }) => {
  for (let i = 0; i < 8; i++) {
    expect(solutions(await target(page), await trayPieces(page))).toHaveLength(1);
    await page.reload();
  }
});

test("the tray has pieces that are too big to ever be used", async ({ page }) => {
  await reloadUntil(page, async () => {
    const t = await target(page);
    return (await trayPieces(page)).some((p) => value(p) > value(t));
  });
  const t = await target(page);
  const [answer] = solutions(t, await trayPieces(page));
  const tooBig = (await trayPieces(page)).filter((p) => value(p) > value(t));
  expect(tooBig.length).toBeGreaterThan(0);
  for (const p of tooBig) expect(answer).not.toContain(`${p.num}/${p.den}`);
});

test("placing the one correct combination wins the round", async ({ page }) => {
  await solve(page);
  await expect(page.locator("#message")).toContainText("Rätt");
  await expect(page.locator("#board")).toHaveClass(/win/);
  await expect(page.locator("#done")).toHaveText("Nästa");
});

test("placed pieces stack up to the target total", async ({ page }) => {
  const t = await target(page);
  const [answer] = solutions(t, await trayPieces(page));
  for (const key of answer) await dragPiece(page, key);
  expect(total(await placedPieces(page))).toBeCloseTo(value(t), 9);
});

test("a piece that is too big gives the 'too much' hint", async ({ page }) => {
  await reloadUntil(page, async () => {
    const t = await target(page);
    return (await trayPieces(page)).some((p) => value(p) > value(t));
  });
  const t = await target(page);
  const big = (await trayPieces(page)).find((p) => value(p) > value(t))!;
  await dragPiece(page, `${big.num}/${big.den}`);
  await page.click("#done");
  await expect(page.locator("#message")).toContainText("för mycket");
  await expect(page.locator("#board")).not.toHaveClass(/win/);
});

test("a piece that is too small gives the 'too little' hint", async ({ page }) => {
  await reloadUntil(page, async () => {
    const t = await target(page);
    return (await trayPieces(page)).some((p) => value(p) < value(t));
  });
  const t = await target(page);
  const small = (await trayPieces(page)).find((p) => value(p) < value(t))!;
  await dragPiece(page, `${small.num}/${small.den}`);
  await page.click("#done");
  await expect(page.locator("#message")).toContainText("lite för lite");
});

test("pieces beyond one whole ring are refused", async ({ page }) => {
  // keep dragging every piece in; the ring must never hold more than one whole
  const count = (await trayPieces(page)).length;
  for (let i = 0; i < count; i++) {
    const left = await trayPieces(page);
    await dragPiece(page, `${left[0].num}/${left[0].den}`);
  }
  expect(total(await placedPieces(page))).toBeLessThanOrEqual(1 + 1e-9);
  expect((await placedPieces(page)).length + (await trayPieces(page)).length).toBe(count);
});

test("tapping a placed piece returns it to the tray", async ({ page }) => {
  const [answer] = solutions(await target(page), await trayPieces(page));
  await dragPiece(page, answer[0]);
  const inTray = (await trayPieces(page)).length;
  await page.locator("#ring .placed").first().dispatchEvent("click");
  expect(await trayPieces(page)).toHaveLength(inTray + 1);
  expect(await placedPieces(page)).toHaveLength(0);
});

test("dropping a piece outside the ring puts it back", async ({ page }) => {
  const before = (await trayPieces(page)).length;
  const b = (await page.locator("#tray .piece").first().boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 5 });
  await page.mouse.up();
  expect(await trayPieces(page)).toHaveLength(before);
  expect(await placedPieces(page)).toHaveLength(0);
});

test("every round is a different puzzle", async ({ page }) => {
  const seen = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const t = await target(page);
    const tray = (await trayPieces(page)).map((p) => `${p.num}/${p.den}`).sort().join(",");
    seen.add(`${t.num}/${t.den}|${tray}`);
    await solve(page);
    await page.click("#done");
  }
  expect(seen.size).toBeGreaterThanOrEqual(4);
});
