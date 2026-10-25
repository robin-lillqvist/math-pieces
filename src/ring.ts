const OUTER = 100;
const INNER = 58;
const NS = "http://www.w3.org/2000/svg";

/** Angle 0 is 12 o'clock, increasing clockwise. Returns SVG x,y. */
function point(r: number, angle: number): [number, number] {
  return [r * Math.sin(angle), -r * Math.cos(angle)];
}

export function slotAngles(den: number, index: number): [number, number] {
  const step = (Math.PI * 2) / den;
  return [index * step, (index + 1) * step];
}

export function slotPath(den: number, index: number): string {
  const [a0, a1] = slotAngles(den, index);
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

/** Centre of a slot in SVG coordinates. */
export function slotCentre(den: number, index: number): [number, number] {
  const [a0, a1] = slotAngles(den, index);
  return point((OUTER + INNER) / 2, (a0 + a1) / 2);
}

export const SLOT_COLOURS = { target: "#ff9f43", placed: "#54a0ff" };

export interface RingView {
  svg: SVGSVGElement;
  slots: SVGPathElement[];
}

/** Draws the ring: every slot outlined, the first `num` slots shaded as the target. */
export function drawRing(svg: SVGSVGElement, den: number, num: number): RingView {
  svg.replaceChildren();
  const slots: SVGPathElement[] = [];
  for (let i = 0; i < den; i++) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", slotPath(den, i));
    p.setAttribute("class", i < num ? "slot target" : "slot");
    p.dataset.index = String(i);
    svg.appendChild(p);
    slots.push(p);

    const [cx, cy] = slotCentre(den, i);
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", String(cx));
    t.setAttribute("y", String(cy));
    t.setAttribute("class", "slot-label");
    t.textContent = String(i + 1);
    svg.appendChild(t);
  }
  return { svg, slots };
}
