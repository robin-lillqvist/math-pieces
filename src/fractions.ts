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
  /** Free play: a parent caps the largest denominator. */
  free?: boolean;
}

const ALL_DENS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];

export const LEVELS: Level[] = [
  { id: 1, dens: [2, 3, 4, 6], trayCount: 5, solutionMin: 2, solutionMax: 2 },
  { id: 2, dens: [2, 3, 4, 6, 8], trayCount: 6, solutionMin: 2, solutionMax: 3 },
  { id: 3, dens: [2, 3, 4, 6, 8, 12], trayCount: 7, solutionMin: 2, solutionMax: 3 },
  { id: 4, dens: [2, 3, 4, 5, 6, 8, 10], trayCount: 8, solutionMin: 2, solutionMax: 3 },
  { id: 5, dens: ALL_DENS, trayCount: 8, solutionMin: 2, solutionMax: 4 },
  { id: 6, dens: ALL_DENS, trayCount: 9, solutionMin: 2, solutionMax: 4, nonUnit: true },
  { id: 7, dens: ALL_DENS, trayCount: 8, solutionMin: 2, solutionMax: 3, free: true },
];

export const STREAK_TO_UNLOCK = 5;

/** Targets stay readable for a child: the denominator never grows past this. */
export const TARGET_DEN_CAP = 24;

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

/**
 * A tray of mixed pieces and a target that exactly one combination of them makes.
 * The tray normally holds pieces larger than the target (they can never be used),
 * and pieces of at least three different sizes.
 */
export function generatePuzzle(
  level: Level,
  previous?: Fraction,
  rand: () => number = Math.random,
): Puzzle {
  const pool = sizePool(level);
  for (let tray = level.trayCount; tray > level.solutionMin; tray--) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const wantTooLarge = attempt < 200;
      const sizes = Array.from({ length: tray }, () => pool[Math.floor(rand() * pool.length)]);
      if (new Set(sizes.map((s) => `${s.num}/${s.den}`)).size < Math.min(3, pool.length)) continue;

      const k = level.solutionMin + Math.floor(rand() * (Math.min(level.solutionMax, tray - 1) - level.solutionMin + 1));
      const chosen = shuffle(sizes, rand).slice(0, k);
      const target = sum(chosen);
      if (compare(target, ONE) >= 0 || target.den > TARGET_DEN_CAP) continue;
      if (previous && sameFraction(target, previous)) continue;
      if (wantTooLarge && !sizes.some((s) => compare(s, target) > 0)) continue;
      if (countSolutions(target, sizes) !== 1) continue;

      return { target, pieces: shuffle(sizes, rand).map((s, id) => ({ ...s, id })) };
    }
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
  if (streak >= STREAK_TO_UNLOCK && current < LEVELS.length - 1) return current + 1;
  return current;
}
