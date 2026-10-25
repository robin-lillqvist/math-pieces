export interface Progress {
  levelIndex: number;
  streak: number;
  stars: number;
  muted: boolean;
  maxDen: number;
}

const KEY = "brakpajen.progress.v1";
const DEFAULT: Progress = { levelIndex: 0, streak: 0, stars: 0, muted: false, maxDen: 10 };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return { ...DEFAULT };
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked: progress just won't persist
  }
}
