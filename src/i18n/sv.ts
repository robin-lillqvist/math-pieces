import type { Fraction } from "../fractions";

export const sv = {
  level: (n: number, free = false) => (free ? "Fri lek" : `Nivå ${n}`),
  done: "Klar!",
  next: "Nästa",
  correct: "Rätt! Bra jobbat!",
  tooFew: "Nästan! Det är lite för lite. Lägg till en bit till.",
  tooMany: "Nästan! Det är för mycket. Tryck på en bit för att ta bort den.",
  noRoom: "Det får inte plats!",
  levelUp: "Du klarade nivån! Nu kommer en ny.",
  /** What the child is asked to do, in words: what is missing and how to fill it. */
  instruction: (target: Fraction, singlePiece: boolean) => ({
    title: `Det fattas ${fractionWords(target)}.`,
    body: singlePiece
      ? "Hitta biten som är exakt lika stor som den streckade luckan."
      : "Fyll luckan med bitarna du har. Tillsammans ska de bli exakt lika stora som luckan. Några bitar är för stora och några passar inte.",
  }),
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
