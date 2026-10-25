export interface DragHandlers {
  /** Called on drop with the pointer position; return true if the piece was accepted. */
  onDrop(clientX: number, clientY: number): boolean;
}

/** Makes a tray piece draggable with Pointer Events (touch, pen and mouse). */
export function makeDraggable(el: HTMLElement, handlers: DragHandlers): void {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    el.classList.add("dragging");
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;

    const move = (ev: PointerEvent) => {
      el.style.left = `${ev.clientX - dx}px`;
      el.style.top = `${ev.clientY - dy}px`;
    };
    move(e);

    const end = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      const accepted = ev.type === "pointerup" && handlers.onDrop(ev.clientX, ev.clientY);
      if (!accepted) {
        el.classList.remove("dragging");
        el.style.left = el.style.top = el.style.width = el.style.height = "";
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });
}
