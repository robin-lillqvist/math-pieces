export interface Fraction {
  num: number;
  den: number;
}

export interface Level {
  id: number;
  dens: number[];
  /** Free play: a parent caps the largest denominator. */
  free?: boolean;
}

export const LEVELS: Level[] = [
  { id: 1, dens: [2, 4] },
  { id: 2, dens: [3, 6] },
  { id: 3, dens: [8] },
  { id: 4, dens: [5, 10] },
  { id: 5, dens: [7, 9] },
  { id: 6, dens: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 7, dens: [2, 3, 4, 5, 6, 7, 8, 9, 10], free: true },
];

/** The level as played: free play only uses denominators up to `maxDen`. */
export function effectiveLevel(level: Level, maxDen: number): Level {
  return level.free ? { ...level, dens: level.dens.filter((d) => d <= maxDen) } : level;
}

export const STREAK_TO_UNLOCK = 5;

export function sameFraction(a: Fraction, b: Fraction): boolean {
  return a.num === b.num && a.den === b.den;
}

/** Random proper fraction for a level, never equal to `previous`. */
export function generateTarget(
  level: Level,
  previous?: Fraction,
  rand: () => number = Math.random,
): Fraction {
  const candidates: Fraction[] = [];
  for (const den of level.dens) {
    for (let num = 1; num < den; num++) candidates.push({ num, den });
  }
  const pool = candidates.filter((f) => !previous || !sameFraction(f, previous));
  return pool[Math.floor(rand() * pool.length)];
}

export type Verdict = "correct" | "too-few" | "too-many";

export function check(target: Fraction, placed: number): Verdict {
  if (placed === target.num) return "correct";
  return placed < target.num ? "too-few" : "too-many";
}

export function nextLevelIndex(current: number, streak: number): number {
  if (streak >= STREAK_TO_UNLOCK && current < LEVELS.length - 1) return current + 1;
  return current;
}
