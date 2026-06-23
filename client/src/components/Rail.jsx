import TitleCard from "./TitleCard";
import useRailScroll from "../hooks/useRailScroll";

// Horizontal, scrollable row of title cards (Netflix-style).
// `items` may be titles or { title, progress } pairs. `ranked` shows 1..N numerals.
export default function Rail({ name, items, ranked = false }) {
  const { ref, atStart, atEnd, overflows, scroll } = useRailScroll(items);
  if (!items?.length) return null;

  // Plain button (no pointer-events wrapper), card-height hit area with the
  // circle centred inside, lifted above everything so clicks always land.
  const NavBtn = ({ dir, show }) =>
    !show ? null : (
      <button
        type="button"
        onClick={() => scroll(dir)}
        aria-label={dir < 0 ? "Scroll left" : "Scroll right"}
        className={`absolute top-5 z-50 hidden h-[149px] w-14 items-center sm:flex sm:h-[171px] ${dir < 0 ? "left-0 justify-start" : "right-0 justify-end"}`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/70 text-2xl text-white opacity-0 shadow-lg shadow-black/50 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-white hover:bg-black group-hover/rail:opacity-100">
          {dir < 0 ? "‹" : "›"}
        </span>
      </button>
    );

  return (
    // Full-bleed so the rail spans the whole viewport width, edge to edge.
    <section className="group/rail relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-2 w-screen">
      <div className="px-4 sm:px-8 lg:px-12">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{name}</h2>
        </div>

        <div className="relative">
          <NavBtn dir={-1} show={overflows && !atStart} />
          <NavBtn dir={1} show={overflows && !atEnd} />

          {/* pt-5 + pb-48/-mb-44 give the hover drop-down panel room so it isn't
              clipped by the horizontal scroll container. */}
          <div ref={ref} className="no-scrollbar -mx-4 -mb-44 flex items-start gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pb-48 pt-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
            {items.map((it, i) => {
              const title = it.progress ? it.title : it;
              return <TitleCard key={title.id || i} title={title} progress={it.progress} rank={ranked ? i + 1 : null} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
