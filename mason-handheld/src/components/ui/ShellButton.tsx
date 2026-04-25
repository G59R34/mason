import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
};

export function ShellButton({ className = "", variant = "default", ...rest }: Props) {
  const v =
    variant === "primary"
      ? "hh-btn hh-btn-pri"
      : variant === "ghost"
        ? "hh-btn border-transparent bg-transparent hover:bg-white/[0.06]"
        : "hh-btn";
  return (
    <button
      type="button"
      data-shell-focusable="true"
      tabIndex={0}
      className={`${v} ${className}`.trim()}
      {...rest}
    />
  );
}
