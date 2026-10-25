import { describe, expect, it } from "vitest";
import {
  LEVELS,
  TARGET_DEN_CAP,
  add,
  check,
  compare,
  countSolutions,
  effectiveLevel,
  fits,
  generatePuzzle,
  nextLevelIndex,
  reduce,
  sum,
  value,
} from "./fractions";

/** Small seeded generator so failures are reproducible. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("fraction arithmetic", () => {
  it("adds and reduces", () => {
    expect(add({ num: 1, den: 3 }, { num: 1, den: 6 })).toEqual({ num: 1, den: 2 });
    expect(reduce({ num: 6, den: 8 })).toEqual({ num: 3, den: 4 });
    expect(sum([])).toEqual({ num: 0, den: 1 });
  });

  it("compares without floating point error", () => {
    expect(compare({ num: 1, den: 3 }, { num: 2, den: 6 })).toBe(0);
    expect(compare({ num: 5, den: 9 }, { num: 1, den: 2 })).toBe(1);
    expect(compare({ num: 1, den: 7 }, { num: 1, den: 6 })).toBe(-1);
  });

  it("knows when a piece no longer fits in the ring", () => {
    const half = { num: 1, den: 2 };
    expect(fits([half], half)).toBe(true);
    expect(fits([half, half], { num: 1, den: 12 })).toBe(false);
  });
});

describe("countSolutions", () => {
  it("counts combinations of sizes, not of identical pieces", () => {
    const quarter = { num: 1, den: 4 };
    // two identical quarters are interchangeable: still one way to make 1/4
    expect(countSolutions({ num: 1, den: 4 }, [quarter, quarter, { num: 1, den: 2 }])).toBe(1);
  });

  it("finds several different ways", () => {
    const pieces = [
      { num: 1, den: 2 },
      { num: 1, den: 4 },
      { num: 1, den: 4 },
      { num: 1, den: 3 },
      { num: 1, den: 6 },
    ];
    // 1/2 itself, 1/4+1/4 and 1/3+1/6 all make 1/2
    expect(countSolutions({ num: 1, den: 2 }, pieces)).toBe(3);
  });

  it("returns 0 when the target can't be made", () => {
    expect(countSolutions({ num: 1, den: 5 }, [{ num: 1, den: 2 }])).toBe(0);
  });
});

describe("generatePuzzle", () => {
  for (const level of LEVELS) {
    it(`level ${level.id}: exactly one solution, valid pieces, never a repeated target`, () => {
      const rand = mulberry32(level.id * 1000);
      let previous = undefined as ReturnType<typeof generatePuzzle>["target"] | undefined;
      let withTooLarge = 0;
      const rounds = 60;
      for (let i = 0; i < rounds; i++) {
        const p = generatePuzzle(level, previous, rand);
        expect(countSolutions(p.target, p.pieces)).toBe(1);
        expect(value(p.target)).toBeGreaterThan(0);
        expect(value(p.target)).toBeLessThan(1);
        expect(p.target.den).toBeLessThanOrEqual(TARGET_DEN_CAP);
        expect(p.pieces.length).toBeLessThanOrEqual(level.trayCount);
        expect(p.pieces.length).toBeGreaterThan(level.solutionMin);
        for (const piece of p.pieces) expect(level.dens).toContain(piece.den);
        expect(new Set(p.pieces.map((x) => x.id)).size).toBe(p.pieces.length);
        if (previous) expect(compare(p.target, previous)).not.toBe(0);
        if (p.pieces.some((x) => compare(x, p.target) > 0)) withTooLarge++;
        previous = p.target;
      }
      // most trays should hold pieces that are simply too big
      expect(withTooLarge / rounds).toBeGreaterThan(0.6);
    });
  }

  it("mixes it up: different targets and different trays", () => {
    const rand = mulberry32(42);
    const targets = new Set<string>();
    const trays = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const p = generatePuzzle(LEVELS[3], undefined, rand);
      targets.add(`${p.target.num}/${p.target.den}`);
      trays.add(p.pieces.map((x) => `${x.num}/${x.den}`).sort().join(","));
    }
    expect(targets.size).toBeGreaterThan(8);
    expect(trays.size).toBeGreaterThan(30);
  });

  it("level 6 offers non-unit pieces", () => {
    const rand = mulberry32(7);
    const seen = Array.from({ length: 40 }, () => generatePuzzle(LEVELS[5], undefined, rand)).some((p) =>
      p.pieces.some((x) => x.num > 1),
    );
    expect(seen).toBe(true);
  });

  it("free play respects the largest denominator and still finds puzzles", () => {
    const free = effectiveLevel(LEVELS[LEVELS.length - 1], 4);
    expect(free.dens).toEqual([2, 3, 4]);
    const rand = mulberry32(3);
    for (let i = 0; i < 40; i++) {
      const p = generatePuzzle(free, undefined, rand);
      expect(countSolutions(p.target, p.pieces)).toBe(1);
      for (const piece of p.pieces) expect(piece.den).toBeLessThanOrEqual(4);
    }
  });
});

describe("effectiveLevel", () => {
  it("caps denominators in free play only", () => {
    expect(effectiveLevel(LEVELS[LEVELS.length - 1], 5).dens).toEqual([2, 3, 4, 5]);
    expect(effectiveLevel(LEVELS[0], 3)).toBe(LEVELS[0]);
  });
});

describe("check", () => {
  const target = { num: 5, den: 12 };
  it("compares the total of the placed pieces with the target", () => {
    expect(check(target, [{ num: 1, den: 3 }, { num: 1, den: 12 }])).toBe("correct");
    expect(check(target, [{ num: 1, den: 3 }])).toBe("too-few");
    expect(check(target, [{ num: 1, den: 2 }])).toBe("too-many");
    expect(check(target, [])).toBe("too-few");
  });
});

describe("nextLevelIndex", () => {
  it("advances after a streak and stops at the last level", () => {
    expect(nextLevelIndex(0, 4)).toBe(0);
    expect(nextLevelIndex(0, 5)).toBe(1);
    expect(nextLevelIndex(LEVELS.length - 1, 9)).toBe(LEVELS.length - 1);
  });
});
