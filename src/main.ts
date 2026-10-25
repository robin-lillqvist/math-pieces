import { LEVELS, check, effectiveLevel, generateTarget, nextLevelIndex, type Fraction } from "./fractions";
import { drawRing, slotPath } from "./ring";
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
const EXTRA_PIECES = 2;

const progress = loadProgress();
let target: Fraction;
let filled: boolean[] = [];
let totalPieces = 0;
let solved = false;
let slots: SVGPathElement[] = [];

function placedCount(): number {
  return filled.filter(Boolean).length;
}

function renderHeader(): void {
  const level = LEVELS[progress.levelIndex];
  $("level").textContent = sv.level(level.id, level.free);
  $("fraction").innerHTML = `<span class="n">${target.num}</span>/<span class="d">${target.den}</span>`;
  $("stars").textContent = "⭐".repeat(Math.min(progress.stars, 10)) + (progress.stars > 10 ? "+" : "");
}

function setMessage(text: string): void {
  message.textContent = text;
}

function makePieceEl(den: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "piece";
  const s = document.createElementNS(NS, "svg");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", slotPath(den, 0));
  const label = document.createElementNS(NS, "text");
  label.textContent = `1/${den}`;
  s.append(path, label);
  el.appendChild(s);
  tray.appendChild(el);
  // Fit the viewBox to the wedge and centre the label on it.
  const b = path.getBBox();
  s.setAttribute("viewBox", `${b.x} ${b.y} ${b.width} ${b.height}`);
  label.setAttribute("x", String(b.x + b.width / 2));
  label.setAttribute("y", String(b.y + b.height / 2));
  label.setAttribute("font-size", String(Math.max(14, Math.min(b.width, b.height) / 3)));
  return el;
}

function renderTray(): void {
  tray.replaceChildren();
  const remaining = totalPieces - placedCount();
  for (let i = 0; i < remaining; i++) {
    const el = makePieceEl(target.den);
    makeDraggable(el, { onDrop: (x, y) => drop(x, y) });
  }
}

/** Which empty slot does a drop at this screen position land in? -1 if none. */
function slotAt(clientX: number, clientY: number): number {
  const r = svg.getBoundingClientRect();
  const scale = r.width / 220;
  const dx = (clientX - (r.left + r.width / 2)) / scale;
  const dy = (clientY - (r.top + r.height / 2)) / scale;
  if (Math.hypot(dx, dy) > 130) return -1;
  const den = target.den;
  const step = (Math.PI * 2) / den;
  const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
  const hit = Math.floor(angle / step);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < den; i++) {
    if (filled[i]) continue;
    const d = Math.abs(i - hit);
    const circ = Math.min(d, den - d);
    if (circ < bestDist) {
      best = i;
      bestDist = circ;
    }
  }
  return best;
}

function drop(x: number, y: number): boolean {
  if (solved) return false;
  const i = slotAt(x, y);
  if (i < 0) return false;
  filled[i] = true;
  slots[i].classList.add("placed");
  setMessage("");
  sounds.place(progress.muted);
  renderTray();
  return true;
}

function removePiece(i: number): void {
  if (solved || !filled[i]) return;
  filled[i] = false;
  slots[i].classList.remove("placed");
  setMessage("");
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
  target = generateTarget(level, target);
  filled = new Array(target.den).fill(false);
  totalPieces = Math.min(target.den, target.num + EXTRA_PIECES);
  solved = false;
  board.classList.remove("win");
  doneBtn.textContent = sv.done;

  const view = drawRing(svg, target.den, target.num);
  slots = view.slots;
  slots.forEach((s, i) => s.addEventListener("click", () => removePiece(i)));

  setMessage(sv.hint);
  renderHeader();
  renderTray();
}

function onDone(): void {
  if (solved) {
    startRound();
    return;
  }
  const verdict = check(target, placedCount());
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
    if (!progress.muted) speak(fractionWords(target));
    return;
  }
  progress.streak = 0;
  saveProgress(progress);
  sounds.miss(progress.muted);
  const diff = Math.abs(placedCount() - target.num);
  if (verdict === "too-few") setMessage(diff === 1 ? sv.tooFew : sv.tooFewMany(diff));
  else setMessage(diff === 1 ? sv.tooMany : sv.tooManyMany(diff));
}

function setupParentCorner(): void {
  const dialog = $<HTMLDialogElement>("parent");
  const mute = $<HTMLInputElement>("mute");
  const levelSelect = $<HTMLSelectElement>("level-select");
  LEVELS.forEach((l, i) => levelSelect.add(new Option(l.free ? "Fri lek" : String(l.id), String(i))));
  const maxDen = $<HTMLSelectElement>("max-den");
  for (let d = 3; d <= 10; d++) maxDen.add(new Option(String(d), String(d)));
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
