import type { Page } from "@playwright/test";

export const KEY = "brakpajen.progress.v1";

export interface Frac {
  num: number;
  den: number;
}

export async function seed(page: Page, progress: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key as string)) localStorage.setItem(key as string, JSON.stringify(value));
    },
    [KEY, progress] as const,
  );
}

export async function target(page: Page): Promise<Frac> {
  const [num, den] = (await page.locator("#fraction").textContent())!.split("/").map(Number);
  return { num, den };
}

const readAttrs = (page: Page, selector: string): Promise<Frac[]> =>
  page.$$eval(selector, (els) =>
    els.map((e) => ({ num: Number((e as HTMLElement).dataset.num), den: Number((e as HTMLElement).dataset.den) })),
  );

export const trayPieces = (page: Page) => readAttrs(page, "#tray .piece");
export const placedPieces = (page: Page) => readAttrs(page, "#ring .placed");

export const value = (f: Frac) => f.num / f.den;
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
export const total = (fs: Frac[]) => fs.reduce((s, f) => s + value(f), 0);

/** Every distinct combination of sizes (as sorted "n/d" keys) that adds up to `goal`. */
export function solutions(goal: Frac, pieces: Frac[]): string[][] {
  const seen = new Map<string, string[]>();
  for (let mask = 1; mask < 1 << pieces.length; mask++) {
    const parts = pieces.filter((_, i) => mask & (1 << i));
    if (same(total(parts), value(goal))) {
      const keys = parts.map((p) => `${p.num}/${p.den}`).sort();
      seen.set(keys.join(","), keys);
    }
  }
  return [...seen.values()];
}

const pieceLocator = (page: Page, key: string) => {
  const [num, den] = key.split("/");
  return page.locator(`#tray .piece[data-num="${num}"][data-den="${den}"]`).first();
};

/** Drag the tray piece of this size ("1/4") onto the ring using real mouse events. */
export async function dragPiece(page: Page, key: string): Promise<void> {
  const ring = (await page.locator("#ring").boundingBox())!;
  const b = (await pieceLocator(page, key).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(ring.x + ring.width / 2, ring.y + ring.height * 0.1, { steps: 8 });
  await page.mouse.up();
}

/** Place the one correct combination (found by brute force) and press the button once. */
export async function solve(page: Page): Promise<void> {
  const [answer] = solutions(await target(page), await trayPieces(page));
  for (const key of answer) await dragPiece(page, key);
  await page.click("#done");
}

/** Reload (a new random puzzle) until `ok` holds, up to `tries` times. */
export async function reloadUntil(page: Page, ok: () => Promise<boolean>, tries = 60): Promise<void> {
  for (let i = 0; i < tries; i++) {
    if (await ok()) return;
    await page.reload();
  }
  throw new Error("no matching puzzle after reloads");
}
