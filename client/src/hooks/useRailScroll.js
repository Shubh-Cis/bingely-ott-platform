import { useCallback, useEffect, useRef, useState } from "react";

// Shared horizontal-scroll logic for all rails (title rails + tile rails).
// Returns a ref for the scroll track plus start/end/overflow flags and a
// scroll() helper. Centralised so the arrows behave identically everywhere.
export default function useRailScroll(deps) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    setOverflows(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    const t = setTimeout(update, 300); // re-measure once images/layout settle
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps, update]);

  const scroll = useCallback((dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  }, []);

  return { ref, atStart, atEnd, overflows, scroll, update };
}
