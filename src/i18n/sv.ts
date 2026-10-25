import type { Fraction } from "../fractions";

export const sv = {
  level: (n: number, free = false) => (free ? "Fri lek" : `Nivå ${n}`),
  done: "Klar!",
  next: "Nästa",
  correct: "Rätt! Bra jobbat!",
  tooFew: "Nästan! Det fattas en bit.",
  tooMany: "Nästan! Det är en bit för mycket.",
  tooFewMany: (n: number) => `Nästan! Det fattas ${n} bitar.`,
  tooManyMany: (n: number) => `Nästan! Det är ${n} bitar för mycket.`,
  levelUp: "Du klarade nivån! Nu kommer en ny.",
  hint: "Fyll de orangea bitarna.",
};

const NUMBERS = ["noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio"];
const PARTS: Record<number, string> = {
  3: "tredjedel",
  4: "fjärdedel",
  5: "femtedel",
  6: "sjättedel",
  7: "sjundedel",
  8: "åttondel",
  9: "niondel",
  10: "tiondel",
};

/** "tre fjärdedelar", "en halv" */
export function fractionWords({ num, den }: Fraction): string {
  if (den === 2) return "en halv";
  const part = PARTS[den];
  return `${NUMBERS[num]} ${num === 1 ? part : part + "ar"}`;
}
