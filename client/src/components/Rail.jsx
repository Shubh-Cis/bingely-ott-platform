import { useEffect, useRef, useState } from "react";
import TitleCard from "./TitleCard";

// Horizontal, scrollable row with hover scroll-arrows (Netflix-style).
// `items` may be titles or { title, progress } pairs. `ranked` shows 1..N numerals.
export default function Rail({ name, items, ranked = false }) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  if (!items?.length) return null;

  const scroll = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="group/rail relative mb-1">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{name}</h2>
      </div>

      <div className="relative">
        {/* Left arrow — only when there's content to the left (won't cover the first card at the start) */}
        {!atStart && (
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="absolute left-0 top-0 bottom-0 z-20 hidden w-12 items-center justify-center rounded-l-xl bg-gradient-to-r from-ink/95 via-ink/70 to-transparent text-3xl text-white transition hover:from-ink hover:text-primary sm:flex"
          >
            ‹
          </button>
        )}

        {/* pb gives the hover drop-down panel room so it isn't clipped by the
            horizontal scroll container; -mb pulls the next row back up. */}
        <div ref={ref} className="no-scrollbar -mx-8 -mb-52 flex items-start gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-8 pb-56 pt-5">
          {items.map((it, i) => {
            const title = it.progress ? it.title : it;
            return <TitleCard key={title.id || i} title={title} progress={it.progress} rank={ranked ? i + 1 : null} />;
          })}
        </div>

        {/* Right arrow — only when there's more to the right */}
        {!atEnd && (
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="absolute right-0 top-0 bottom-0 z-20 hidden w-12 items-center justify-center rounded-r-xl bg-gradient-to-l from-ink/95 via-ink/70 to-transparent text-3xl text-white transition hover:from-ink hover:text-primary sm:flex"
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}
