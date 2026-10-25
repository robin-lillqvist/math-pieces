import { describe, expect, it } from "vitest";
import { LEVELS, check, effectiveLevel, generateTarget, nextLevelIndex } from "./fractions";

describe("generateTarget", () => {
  it("only uses denominators from the level and proper fractions", () => {
    for (let i = 0; i < 200; i++) {
      const f = generateTarget(LEVELS[4]);
      expect(LEVELS[4].dens).toContain(f.den);
      expect(f.num).toBeGreaterThanOrEqual(1);
      expect(f.num).toBeLessThan(f.den);
    }
  });

  it("never repeats the previous target", () => {
    const prev = { num: 3, den: 4 };
    for (let i = 0; i < 200; i++) {
      expect(generateTarget(LEVELS[0], prev)).not.toEqual(prev);
    }
  });
});

describe("effectiveLevel", () => {
  it("caps denominators in free play only", () => {
    const free = LEVELS[LEVELS.length - 1];
    expect(effectiveLevel(free, 5).dens).toEqual([2, 3, 4, 5]);
    expect(effectiveLevel(LEVELS[0], 3)).toBe(LEVELS[0]);
  });
});

describe("check", () => {
  it("judges 5/9 by the number of 1/9 pieces", () => {
    const t = { num: 5, den: 9 };
    expect(check(t, 5)).toBe("correct");
    expect(check(t, 4)).toBe("too-few");
    expect(check(t, 6)).toBe("too-many");
  });
});

describe("nextLevelIndex", () => {
  it("advances after a streak and stops at the last level", () => {
    expect(nextLevelIndex(0, 4)).toBe(0);
    expect(nextLevelIndex(0, 5)).toBe(1);
    expect(nextLevelIndex(LEVELS.length - 1, 9)).toBe(LEVELS.length - 1);
  });
});
