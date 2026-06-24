import { Link } from "react-router-dom";
import useRailScroll from "../hooks/useRailScroll";
import SmartImage from "./SmartImage";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icon";

// JioHotstar-style horizontal tile rail. `variant`:
//   "block"  → wide gradient cards with a big faded watermark (Languages/Genres)
//   "circle" → circular monogram avatars with a label underneath (Channels)
// block item:  { key, label, sublabel?, watermark, grad, to }
// circle item: { key, label, mono, grad, to }
export default function TileRail({ name, items, variant = "block" }) {
  const { ref, atStart, atEnd, overflows, scroll } = useRailScroll(items);
  if (!items?.length) return null;

  const NavBtn = ({ dir, show }) =>
    !show ? null : (
      <button
        type="button"
        onClick={() => scroll(dir)}
        aria-label={dir < 0 ? "Scroll left" : "Scroll right"}
        className={`absolute inset-y-0 z-[60] hidden w-16 items-center sm:flex ${dir < 0 ? "left-0 justify-start bg-gradient-to-r from-ink/80 to-transparent" : "right-0 justify-end bg-gradient-to-l from-ink/80 to-transparent"}`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/75 text-white opacity-0 shadow-lg shadow-black/50 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-white hover:bg-black group-hover/tilerow:opacity-100">
          {dir < 0 ? <ChevronLeftIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
        </span>
      </button>
    );

  const Tile = ({ it }) =>
    variant === "circle" ? (
      <Link to={it.to} className="group/tile flex w-24 shrink-0 flex-col items-center gap-2.5 sm:w-28">
        <div className={`relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br ${it.grad} shadow-lg shadow-black/40 ring-2 ring-white/15 transition-all duration-300 group-hover/tile:scale-105 group-hover/tile:ring-white/60 sm:h-24 sm:w-24`}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/15" />
          <span className="relative text-2xl font-black tracking-tight text-white drop-shadow sm:text-3xl">{it.mono}</span>
        </div>
        <span className="line-clamp-1 text-center text-xs font-semibold text-gray-300 transition group-hover/tile:text-white sm:text-sm">{it.label}</span>
      </Link>
    ) : (
      <Link
        to={it.to}
        className={`group/tile relative flex h-44 w-72 shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${it.grad} p-5 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 hover:ring-2 hover:ring-white/40 sm:h-52 sm:w-80`}
      >
        {it.image ? (
          <>
            {/* content artwork as the backdrop (JioHotstar-style) */}
            <SmartImage src={it.image} alt={it.label} label={it.label} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/tile:scale-105" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
            {/* grey veil — softens the image; lifts a bit on hover */}
            <div className="pointer-events-none absolute inset-0 bg-ink/50 transition-colors duration-300 group-hover/tile:bg-ink/25" />
          </>
        ) : (
          // no artwork → keep the gradient + big faded watermark of the name
          <span className="pointer-events-none absolute -right-2 -top-3 select-none text-7xl font-black leading-none tracking-tighter text-white/15 transition-transform duration-300 group-hover/tile:scale-110 sm:text-8xl">
            {it.watermark}
          </span>
        )}
        <div className="relative">
          <span className="block text-2xl font-black leading-none tracking-tight text-white drop-shadow-lg sm:text-3xl">{it.label}</span>
          {it.sublabel && <span className="mt-1.5 block text-[0.7rem] font-semibold uppercase tracking-wider text-white/85 drop-shadow">{it.sublabel}</span>}
        </div>
      </Link>
    );

  return (
    <section className="group/tilerow relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-7 w-screen">
      <div className="px-4 sm:px-8 lg:px-12">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{name}</h2>
        </div>

        <div className="relative">
          <NavBtn dir={-1} show={overflows && !atStart} />
          <NavBtn dir={1} show={overflows && !atEnd} />

          <div ref={ref} className="no-scrollbar -mx-4 flex items-start gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-4 py-2 sm:-mx-8 sm:gap-4 sm:px-8 lg:-mx-12 lg:px-12">
            {items.map((it) => (
              <Tile key={it.key} it={it} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
