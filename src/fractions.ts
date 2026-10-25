export interface Fraction {
  num: number;
  den: number;
}

export interface Piece extends Fraction {
  id: number;
}

export interface Puzzle {
  target: Fraction;
  pieces: Piece[];
}

export interface Level {
  id: number;
  /** Denominators the tray pieces may use. */
  dens: number[];
  trayCount: number;
  /** How many pieces the one correct combination uses. */
  solutionMin: number;
  solutionMax: number;
  /** Allow pieces like 3/4 and 2/3, not only 1/n. */
  nonUnit?: boolean;
  /** Correct answers in a row needed to unlock the next level (default STREAK_TO_UNLOCK). */
  streakToUnlock?: number;
  /** Free play: a parent caps the largest denominator. */
  free?: boolean;
}

/** Nothing smaller than tenths, for pieces and for targets: smaller parts are too abstract for a child. */
export const MAX_DEN = 10;

const ALL_DENS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const LEVELS: Level[] = [
  // Gentle start: one piece matches the target, then two pieces from halves, thirds and quarters.
  { id: 1, dens: [2, 3, 4, 6], trayCount: 4, solutionMin: 1, solutionMax: 1, streakToUnlock: 3 },
  { id: 2, dens: [2, 3, 4], trayCount: 4, solutionMin: 2, solutionMax: 2, streakToUnlock: 3 },
  { id: 3, dens: [2, 3, 4, 6], trayCount: 5, solutionMin: 2, solutionMax: 2, streakToUnlock: 3 },
  { id: 4, dens: [2, 3, 4, 6, 8], trayCount: 6, solutionMin: 2, solutionMax: 3 },
  { id: 5, dens: [2, 3, 4, 5, 6, 8, 10], trayCount: 7, solutionMin: 2, solutionMax: 3 },
  { id: 6, dens: ALL_DENS, trayCount: 8, solutionMin: 2, solutionMax: 3 },
  { id: 7, dens: ALL_DENS, trayCount: 8, solutionMin: 2, solutionMax: 4 },
  { id: 8, dens: ALL_DENS, trayCount: 9, solutionMin: 2, solutionMax: 4, nonUnit: true },
  { id: 9, dens: ALL_DENS, trayCount: 8, solutionMin: 2, solutionMax: 3, free: true },
];

export const STREAK_TO_UNLOCK = 5;

const ZERO: Fraction = { num: 0, den: 1 };
const ONE: Fraction = { num: 1, den: 1 };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function reduce(f: Fraction): Fraction {
  const g = gcd(f.num, f.den) || 1;
  return { num: f.num / g, den: f.den / g };
}

export function add(a: Fraction, b: Fraction): Fraction {
  return reduce({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
}

/** -1, 0 or 1 as `a` is smaller than, equal to or larger than `b`. */
export function compare(a: Fraction, b: Fraction): number {
  return Math.sign(a.num * b.den - b.num * a.den);
}

export const value = (f: Fraction): number => f.num / f.den;
export const sameFraction = (a: Fraction, b: Fraction): boolean => compare(a, b) === 0;
export const sum = (fs: Fraction[]): Fraction => fs.reduce(add, ZERO);

/** Would adding `piece` to `placed` still fit inside one whole ring? */
export function fits(placed: Fraction[], piece: Fraction): boolean {
  return compare(add(sum(placed), piece), ONE) <= 0;
}

/** The effective level: free play only uses denominators up to `maxDen`. */
export function effectiveLevel(level: Level, maxDen: number): Level {
  return level.free ? { ...level, dens: level.dens.filter((d) => d <= maxDen) } : level;
}

/** Number of different combinations of sizes (not of physical pieces) that add up to `target`. */
export function countSolutions(target: Fraction, pieces: Fraction[]): number {
  const seen = new Set<string>();
  for (let mask = 1; mask < 1 << pieces.length; mask++) {
    let total = ZERO;
    const parts: string[] = [];
    for (let i = 0; i < pieces.length; i++) {
      if (mask & (1 << i)) {
        total = add(total, pieces[i]);
        parts.push(`${pieces[i].num}/${pieces[i].den}`);
      }
    }
    if (sameFraction(total, target)) seen.add(parts.sort().join(","));
  }
  return seen.size;
}

function sizePool(level: Level): Fraction[] {
  const pool: Fraction[] = [];
  for (const den of level.dens) {
    const maxNum = level.nonUnit ? Math.min(3, den - 1) : 1;
    for (let num = 1; num <= maxNum; num++) {
      if (gcd(num, den) === 1) pool.push({ num, den });
    }
  }
  return pool;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FALLBACK: Puzzle = {
  target: { num: 3, den: 4 },
  pieces: [
    { id: 0, num: 1, den: 4 },
    { id: 1, num: 1, den: 3 },
    { id: 2, num: 1, den: 2 },
    { id: 3, num: 1, den: 8 },
  ],
};

const sizeKey = (f: Fraction): string => `${f.num}/${f.den}`;

/**
 * A tray of mixed pieces and a target that exactly one combination of them makes.
 *
 * It picks the winning pieces first (so targets are spread evenly over what the level
 * can make), then adds decoys one at a time, keeping only decoys that don't create a
 * second way to reach the target. Decoys larger than the target come first, since they
 * can never be used, and the tray gets at least three different sizes.
 */
export function generatePuzzle(
  level: Level,
  previous?: Fraction,
  rand: () => number = Math.random,
): Puzzle {
  const pool = sizePool(level);
  const pick = () => pool[Math.floor(rand() * pool.length)];

  for (let attempt = 0; attempt < 400; attempt++) {
    const strict = attempt < 250;
    const k = level.solutionMin + Math.floor(rand() * (level.solutionMax - level.solutionMin + 1));
    const winners = Array.from({ length: k }, pick);
    const target = sum(winners);
    if (compare(target, ONE) >= 0 || target.den > MAX_DEN) continue;
    if (previous && sameFraction(target, previous)) continue;

    const tray: Fraction[] = [...winners];
    while (tray.length < level.trayCount) {
      const candidates = shuffle(pool, rand);
      // too-large decoys first until the tray has one
      if (strict && !tray.some((p) => compare(p, target) > 0)) {
        candidates.sort((a, b) => Number(compare(b, target) > 0) - Number(compare(a, target) > 0));
      }
      const next = candidates.find((c) => countSolutions(target, [...tray, c]) === 1);
      if (!next) break;
      tray.push(next);
    }

    // a tray one or two short is fine: some targets simply have no more safe decoys
    if (tray.length < (strict ? Math.max(k + 1, level.trayCount - 2) : k + 1)) continue;
    if (new Set(tray.map(sizeKey)).size < Math.min(3, pool.length)) continue;
    // a piece bigger than the target can never be used: have one whenever the level has such a piece
    const tooLargeExists = pool.some((p) => compare(p, target) > 0);
    if (strict && tooLargeExists && !tray.some((p) => compare(p, target) > 0)) continue;

    return { target, pieces: shuffle(tray, rand).map((s, id) => ({ ...s, id })) };
  }
  return FALLBACK;
}

export type Verdict = "correct" | "too-few" | "too-many";

export function check(target: Fraction, placed: Fraction[]): Verdict {
  const c = compare(sum(placed), target);
  if (c === 0) return "correct";
  return c < 0 ? "too-few" : "too-many";
}

export function nextLevelIndex(current: number, streak: number): number {
  const needed = LEVELS[current].streakToUnlock ?? STREAK_TO_UNLOCK;
  if (streak >= needed && current < LEVELS.length - 1) return current + 1;
  return current;
}
