import { useEffect, useState } from "react";

/** True below `maxPx` width — for dock label density */
export function useMediaCompact(maxPx = 520) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxPx}px)`);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxPx]);

  return compact;
}
