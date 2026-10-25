import type { Fraction } from "../fractions";

export const sv = {
  level: (n: number, free = false) => (free ? "Fri lek" : `Nivå ${n}`),
  done: "Klar!",
  next: "Nästa",
  correct: "Rätt! Bra jobbat!",
  tooFew: "Nästan! Det är lite för lite.",
  tooMany: "Nästan! Det är för mycket.",
  noRoom: "Det får inte plats!",
  levelUp: "Du klarade nivån! Nu kommer en ny.",
  hint: "Fyll den streckade bågen.",
};

const NUMBERS = ["noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"];
const PARTS: Record<number, string> = {
  3: "tredjedel",
  4: "fjärdedel",
  5: "femtedel",
  6: "sjättedel",
  7: "sjundedel",
  8: "åttondel",
  9: "niondel",
  10: "tiondel",
  12: "tolftedel",
  14: "fjortondel",
  15: "femtondel",
  16: "sextondel",
  18: "artondel",
  20: "tjugondel",
  24: "tjugofjärdedel",
};

/** "tre fjärdedelar", "en halv"; falls back to "7 av 21" for sizes without a word. */
export function fractionWords({ num, den }: Fraction): string {
  if (den === 2) return "en halv";
  const part = PARTS[den];
  if (!part || num >= NUMBERS.length) return `${num} av ${den}`;
  return `${NUMBERS[num]} ${num === 1 ? part : part + "ar"}`;
}
