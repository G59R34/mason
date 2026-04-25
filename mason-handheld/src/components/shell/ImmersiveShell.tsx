import type { ReactNode } from "react";

type Props = {
  /** Web layer + overlays live here */
  children: ReactNode;
  dock: ReactNode;
  /** Reserve space so iframe content isn’t hidden behind dock */
  padBottomForDock?: boolean;
};

export function ImmersiveShell({ children, dock, padBottomForDock = true }: Props) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#030304]" data-mason-shell>
      <div
        className="absolute inset-0 z-0 min-h-0"
        style={{
          paddingBottom: padBottomForDock ? "calc(var(--hh-dock-h) + var(--hh-safe-b))" : undefined,
        }}
      >
        <div className="relative h-full min-h-0 w-full">{children}</div>
      </div>
      {dock}
    </div>
  );
}
