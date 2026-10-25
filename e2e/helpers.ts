import type { Page } from "@playwright/test";

export const KEY = "brakpajen.progress.v1";

export async function seed(page: Page, progress: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key as string)) localStorage.setItem(key as string, JSON.stringify(value));
    },
    [KEY, progress] as const,
  );
}

export async function target(page: Page): Promise<{ num: number; den: number }> {
  const [num, den] = (await page.locator("#fraction").textContent())!.split("/").map(Number);
  return { num, den };
}

export const placed = (page: Page) => page.locator(".slot.placed").count();

/** Drag `n` tray pieces onto the ring, aiming at the middle of each next slot. */
export async function dragPieces(page: Page, n: number): Promise<void> {
  const ring = (await page.locator("#ring").boundingBox())!;
  const cx = ring.x + ring.width / 2;
  const cy = ring.y + ring.height / 2;
  const { den } = await target(page);
  const start = await placed(page);
  for (let k = 0; k < n; k++) {
    const b = (await page.locator("#tray .piece").first().boundingBox())!;
    const ang = ((start + k + 0.5) / den) * Math.PI * 2;
    const r = (ring.width / 2) * 0.79;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(cx + r * Math.sin(ang), cy - r * Math.cos(ang), { steps: 8 });
    await page.mouse.up();
  }
}

/** Fill the ring correctly and press the button once (the answer check). */
export async function solve(page: Page): Promise<void> {
  const { num } = await target(page);
  await dragPieces(page, num - (await placed(page)));
  await page.click("#done");
}
