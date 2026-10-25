import {
  LEVELS,
  check,
  effectiveLevel,
  fits,
  generatePuzzle,
  nextLevelIndex,
  type Piece,
  type Puzzle,
} from "./fractions";
import { denColour, drawRing, pieceWedgePath } from "./ring";
import { makeDraggable } from "./drag";
import { loadProgress, saveProgress } from "./storage";
import { fractionWords, sv } from "./i18n/sv";
import { sounds } from "./sound";

const $ = <T extends Element>(id: string) => document.getElementById(id) as unknown as T;
const svg = $<SVGSVGElement>("ring");
const tray = $<HTMLElement>("tray");
const message = $<HTMLElement>("message");
const doneBtn = $<HTMLButtonElement>("done");
const board = $<HTMLElement>("board");

const NS = "http://www.w3.org/2000/svg";
/** Screen pixels per ring unit for tray pieces; keeps their relative sizes true. */
const PIECE_SCALE = 0.65;

const progress = loadProgress();
let puzzle: Puzzle;
let placed: Piece[] = [];
let solved = false;

function renderHeader(): void {
  const level = LEVELS[progress.levelIndex];
  $("level").textContent = sv.level(level.id, level.free);
  const { num, den } = puzzle.target;
  $("fraction").innerHTML = `<span class="n">${num}</span>/<span class="d">${den}</span>`;
  $("stars").textContent = "⭐".repeat(Math.min(progress.stars, 10)) + (progress.stars > 10 ? "+" : "");
}

function setMessage(text: string): void {
  message.textContent = text;
}

function makePieceEl(piece: Piece): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "piece";
  wrap.dataset.id = String(piece.id);
  wrap.dataset.num = String(piece.num);
  wrap.dataset.den = String(piece.den);

  const s = document.createElementNS(NS, "svg");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", pieceWedgePath(piece));
  path.style.fill = denColour(piece.den);
  s.appendChild(path);
  wrap.appendChild(s);

  const cap = document.createElement("span");
  cap.className = "cap";
  cap.textContent = `${piece.num}/${piece.den}`;
  wrap.appendChild(cap);

  tray.appendChild(wrap);
  // Size the svg to the wedge so bigger fractions look bigger.
  const b = path.getBBox();
  s.setAttribute("viewBox", `${b.x} ${b.y} ${b.width} ${b.height}`);
  s.style.width = `${b.width * PIECE_SCALE}px`;
  s.style.height = `${b.height * PIECE_SCALE}px`;
  return wrap;
}

function renderRing(): void {
  const wedges = drawRing(svg, puzzle.target, placed);
  wedges.forEach((w, i) => w.addEventListener("click", () => removePiece(placed[i])));
}

function renderTray(): void {
  tray.replaceChildren();
  for (const piece of puzzle.pieces) {
    if (placed.includes(piece)) continue;
    makeDraggable(makePieceEl(piece), { onDrop: (x, y) => drop(piece, x, y) });
  }
}

function overRing(clientX: number, clientY: number): boolean {
  const r = svg.getBoundingClientRect();
  const scale = r.width / 220;
  const dx = (clientX - (r.left + r.width / 2)) / scale;
  const dy = (clientY - (r.top + r.height / 2)) / scale;
  return Math.hypot(dx, dy) <= 130;
}

function drop(piece: Piece, x: number, y: number): boolean {
  if (solved || !overRing(x, y)) return false;
  if (!fits(placed, piece)) {
    setMessage(sv.noRoom);
    sounds.miss(progress.muted);
    return false;
  }
  placed.push(piece);
  setMessage("");
  sounds.place(progress.muted);
  renderRing();
  renderTray();
  return true;
}

function removePiece(piece: Piece): void {
  if (solved || !placed.includes(piece)) return;
  placed = placed.filter((p) => p !== piece);
  setMessage("");
  renderRing();
  renderTray();
}

function confetti(): void {
  for (let i = 0; i < 24; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.textContent = ["🎉", "⭐", "✨", "🥧"][i % 4];
    c.style.left = `${Math.random() * 100}vw`;
    c.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("sv"));
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function startRound(): void {
  const level = effectiveLevel(LEVELS[progress.levelIndex], progress.maxDen);
  puzzle = generatePuzzle(level, puzzle?.target);
  placed = [];
  solved = false;
  board.classList.remove("win");
  doneBtn.textContent = sv.done;
  const text = sv.instruction(puzzle.target, level.solutionMax === 1);
  $("instr-title").textContent = text.title;
  $("instr-body").textContent = text.body;
  setMessage("");
  renderHeader();
  renderRing();
  renderTray();
}

function onDone(): void {
  if (solved) {
    startRound();
    return;
  }
  const verdict = check(puzzle.target, placed);
  if (verdict === "correct") {
    solved = true;
    board.classList.add("win");
    progress.streak++;
    progress.stars++;
    const next = nextLevelIndex(progress.levelIndex, progress.streak);
    const leveledUp = next !== progress.levelIndex;
    if (leveledUp) {
      progress.levelIndex = next;
      progress.streak = 0;
    }
    saveProgress(progress);
    setMessage(leveledUp ? sv.levelUp : sv.correct);
    doneBtn.textContent = sv.next;
    renderHeader();
    confetti();
    sounds.win(progress.muted);
    if (!progress.muted) speak(fractionWords(puzzle.target));
    return;
  }
  progress.streak = 0;
  saveProgress(progress);
  sounds.miss(progress.muted);
  setMessage(verdict === "too-few" ? sv.tooFew : sv.tooMany);
}

function setupParentCorner(): void {
  const dialog = $<HTMLDialogElement>("parent");
  const mute = $<HTMLInputElement>("mute");
  const levelSelect = $<HTMLSelectElement>("level-select");
  LEVELS.forEach((l, i) => levelSelect.add(new Option(l.free ? "Fri lek" : String(l.id), String(i))));
  const maxDen = $<HTMLSelectElement>("max-den");
  for (let d = 4; d <= 10; d++) maxDen.add(new Option(String(d), String(d)));
  maxDen.value = String(progress.maxDen);
  maxDen.addEventListener("change", () => {
    progress.maxDen = Number(maxDen.value);
    saveProgress(progress);
    if (LEVELS[progress.levelIndex].free) startRound();
  });

  // Long-press the level label for two seconds to open it.
  let timer: number | undefined;
  const label = $<HTMLElement>("level");
  label.addEventListener("pointerdown", () => {
    timer = window.setTimeout(() => {
      mute.checked = progress.muted;
      levelSelect.value = String(progress.levelIndex);
      dialog.showModal();
    }, 2000);
  });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) {
    label.addEventListener(ev, () => clearTimeout(timer));
  }

  mute.addEventListener("change", () => {
    progress.muted = mute.checked;
    saveProgress(progress);
  });
  levelSelect.addEventListener("change", () => {
    progress.levelIndex = Number(levelSelect.value);
    progress.streak = 0;
    saveProgress(progress);
    startRound();
  });
  $("reset").addEventListener("click", () => {
    Object.assign(progress, { levelIndex: 0, streak: 0, stars: 0 });
    saveProgress(progress);
    levelSelect.value = "0";
    startRound();
  });
  $("close-parent").addEventListener("click", () => dialog.close());
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

doneBtn.addEventListener("click", onDone);
setupParentCorner();
startRound();
