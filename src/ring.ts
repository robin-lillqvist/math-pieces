import { value, type Fraction, type Piece } from "./fractions";

const OUTER = 100;
const INNER = 58;
const NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;

/** One colour per denominator, so same-sized pieces always look alike. */
const COLOURS: Record<number, string> = {
  2: "#ff6b6b",
  3: "#ffa502",
  4: "#1dd1a1",
  5: "#54a0ff",
  6: "#a29bfe",
  7: "#fd79a8",
  8: "#00cec9",
  9: "#e17055",
  10: "#6c5ce7",
  12: "#8395a7",
};

export function denColour(den: number): string {
  return COLOURS[den] ?? "#8395a7";
}

/** Angle 0 is 12 o'clock, increasing clockwise. Returns SVG x,y. */
function point(r: number, angle: number): [number, number] {
  return [r * Math.sin(angle), -r * Math.cos(angle)];
}

export function arcPath(a0: number, a1: number): string {
  const [ox0, oy0] = point(OUTER, a0);
  const [ox1, oy1] = point(OUTER, a1);
  const [ix1, iy1] = point(INNER, a1);
  const [ix0, iy0] = point(INNER, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return (
    `M${ox0} ${oy0} A${OUTER} ${OUTER} 0 ${large} 1 ${ox1} ${oy1} ` +
    `L${ix1} ${iy1} A${INNER} ${INNER} 0 ${large} 0 ${ix0} ${iy0} Z`
  );
}

/** A tray piece: the wedge it will fill, centred on 12 o'clock so its true size is visible. */
export function pieceWedgePath(f: Fraction): string {
  const half = (value(f) * TAU) / 2;
  return arcPath(-half, half);
}

const FULL_RING =
  `M0 ${-OUTER} A${OUTER} ${OUTER} 0 1 1 0 ${OUTER} A${OUTER} ${OUTER} 0 1 1 0 ${-OUTER} Z ` +
  `M0 ${-INNER} A${INNER} ${INNER} 0 1 0 0 ${INNER} A${INNER} ${INNER} 0 1 0 0 ${-INNER} Z`;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/**
 * Draws the empty ring, the dashed target arc from 12 o'clock, and the placed pieces
 * stacked clockwise behind it. Returns the wedge for each placed piece, in order.
 */
export function drawRing(svg: SVGSVGElement, target: Fraction, placed: Piece[]): SVGPathElement[] {
  svg.replaceChildren();
  svg.appendChild(el("path", { d: FULL_RING, "fill-rule": "evenodd", class: "ring-base" }));
  svg.appendChild(el("path", { d: arcPath(0, value(target) * TAU), class: "target-arc" }));

  const wedges: SVGPathElement[] = [];
  let from = 0;
  for (const piece of placed) {
    const to = from + value(piece) * TAU;
    const wedge = el("path", { d: arcPath(from, to), class: "placed" });
    wedge.style.fill = denColour(piece.den);
    wedge.dataset.id = String(piece.id);
    wedge.dataset.num = String(piece.num);
    wedge.dataset.den = String(piece.den);
    svg.appendChild(wedge);
    wedges.push(wedge);

    if (to - from > 0.45) {
      const [x, y] = point((OUTER + INNER) / 2, (from + to) / 2);
      const label = el("text", { x: String(x), y: String(y), class: "wedge-label" });
      label.textContent = `${piece.num}/${piece.den}`;
      svg.appendChild(label);
    }
    from = to;
  }

  // The outline sits on top so the end of the target stays visible once pieces cover it.
  svg.appendChild(el("path", { d: arcPath(0, value(target) * TAU), class: "target-outline" }));
  svg.appendChild(el("line", { x1: "0", y1: String(-OUTER - 8), x2: "0", y2: String(-INNER + 4), class: "start-tick" }));
  return wedges;
}
