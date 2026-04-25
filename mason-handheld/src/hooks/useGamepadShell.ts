import { useEffect, useRef } from "react";

const DEADZONE = 0.45;
const REPEAT_MS = 380;

type Opts = {
  /** Called when user presses "confirm" (A / Enter on focused shell control) */
  onConfirm?: () => void;
  /** Called when user presses "back" (B / Escape) */
  onBack?: () => void;
  /** Move focus: -1 prev, +1 next */
  onFocusStep?: (delta: number) => void;
  enabled?: boolean;
};

/**
 * Lightweight gamepad handling for the shell chrome only (not the embedded site).
 * Standard mapping: button 0 = A (confirm), 1 = B (back). D-pad / left stick navigates focus.
 */
export function useGamepadShell({ onConfirm, onBack, onFocusStep, enabled = true }: Opts) {
  const prev = useRef<boolean[]>([]);
  const lastNav = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let frame: number;

    const tick = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const gp = pads[0];
      if (!gp) {
        prev.current = [];
        frame = requestAnimationFrame(tick);
        return;
      }

      const buttons = gp.buttons.map((b) => b.pressed);
      const was = prev.current;

      const edge = (i: number) => buttons[i] && !was[i];

      if (edge(0)) onConfirm?.();
      if (edge(1)) onBack?.();

      // D-pad (many pads: 12-15) or left stick
      let dx = 0;
      let dy = 0;
      if (edge(14)) dx -= 1;
      if (edge(15)) dx += 1;
      if (edge(12)) dy -= 1;
      if (edge(13)) dy += 1;
      const ax = gp.axes[0] ?? 0;
      const ay = gp.axes[1] ?? 0;
      if (Math.abs(ax) > DEADZONE) dx += ax > 0 ? 1 : -1;
      if (Math.abs(ay) > DEADZONE) dy += ay < 0 ? -1 : ay > 0 ? 1 : 0;

      const now = performance.now();
      if ((dx !== 0 || dy !== 0) && now - lastNav.current > REPEAT_MS) {
        lastNav.current = now;
        if (dx !== 0) onFocusStep?.(dx > 0 ? 1 : -1);
        else if (dy !== 0) onFocusStep?.(dy > 0 ? 1 : -1);
      }

      prev.current = buttons;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, onConfirm, onBack, onFocusStep]);
}
