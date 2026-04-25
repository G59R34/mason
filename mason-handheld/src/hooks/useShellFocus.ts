import { useCallback } from "react";

const SEL = '[data-shell-focusable="true"]';

export function useShellFocus() {
  const focusIndex = useCallback((delta: number) => {
    const list = Array.from(document.querySelectorAll<HTMLElement>(SEL)).filter(
      (el) => !el.hasAttribute("disabled"),
    );
    if (!list.length) return;
    const active = document.activeElement as HTMLElement | null;
    let i = list.findIndex((el) => el === active);
    if (i < 0) i = 0;
    else i = (i + delta + list.length) % list.length;
    list[i]?.focus();
  }, []);

  const confirmFocused = useCallback(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el && el.matches(SEL)) el.click();
  }, []);

  return { focusIndex, confirmFocused };
}
