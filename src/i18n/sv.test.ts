import { describe, expect, it } from "vitest";
import { fractionWords, sv } from "./sv";

describe("fractionWords", () => {
  it("says fractions the Swedish way", () => {
    expect(fractionWords({ num: 1, den: 2 })).toBe("en halv");
    expect(fractionWords({ num: 1, den: 3 })).toBe("en tredjedel");
    expect(fractionWords({ num: 3, den: 4 })).toBe("tre fjärdedelar");
    expect(fractionWords({ num: 5, den: 12 })).toBe("fem tolftedelar");
  });

  it("falls back to numbers for sizes without a word", () => {
    expect(fractionWords({ num: 4, den: 21 })).toBe("4 av 21");
  });
});

describe("instruction", () => {
  it("says what is missing and how to fill it", () => {
    const i = sv.instruction({ num: 1, den: 3 }, false);
    expect(i.title).toBe("Det fattas en tredjedel.");
    expect(i.body).toContain("Fyll luckan med bitarna du har");
  });

  it("is simpler when one piece matches exactly", () => {
    const i = sv.instruction({ num: 1, den: 4 }, true);
    expect(i.title).toBe("Det fattas en fjärdedel.");
    expect(i.body).toContain("exakt lika stor");
    expect(i.body).not.toContain("Tillsammans");
  });
});
