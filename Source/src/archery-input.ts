/** An aiming drag survives leaving the canvas or losing pointer capture. Only a genuine
 * pointer cancellation, Escape, or a blurred window cancels it. */
export function bindDrawInput(
  canvas: HTMLCanvasElement,
  actions: {
    start: (event: PointerEvent) => boolean;
    move: (event: PointerEvent) => void;
    release: (event: PointerEvent) => void;
    cancel: () => void;
  },
) {
  const controller = new AbortController();
  const signal = controller.signal;
  let active: number | null = null;
  function releaseCapture(id: number) {
    try {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch {
      /* Window listeners also handle release. */
    }
  }
  function finish(event: PointerEvent) {
    if (active !== event.pointerId) return;
    const id = active;
    active = null;
    actions.release(event);
    releaseCapture(id);
  }
  function cancel() {
    if (active === null) return;
    const id = active;
    active = null;
    actions.cancel();
    releaseCapture(id);
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (
        active !== null ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      if (!actions.start(event)) return;
      active = event.pointerId;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* Global release still works. */
      }
    },
    { signal },
  );
  window.addEventListener(
    "pointermove",
    (event) => {
      if (active !== event.pointerId) return;
      if (event.pointerType === "mouse" && event.buttons === 0) {
        finish(event);
        return;
      }
      actions.move(event);
    },
    { signal, capture: true },
  );
  window.addEventListener("pointerup", finish, { signal, capture: true });
  window.addEventListener(
    "pointercancel",
    (event) => {
      if (active === event.pointerId) cancel();
    },
    { signal, capture: true },
  );
  canvas.addEventListener(
    "lostpointercapture",
    (event) => {
      if (active === event.pointerId && event.buttons === 0) finish(event);
    },
    { signal },
  );
  window.addEventListener("blur", cancel, { signal });
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") cancel();
    },
    { signal },
  );
  return () => {
    controller.abort();
    active = null;
  };
}
