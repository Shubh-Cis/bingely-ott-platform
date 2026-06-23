import { Link } from "react-router-dom";
import SmartImage from "./SmartImage";

// Prime-style rail card: smaller thumbnail by default. On hover the WHOLE card
// pops up (scales) and a solid detail panel is attached below the enlarged
// image — so it reads as one bigger floating card, not just a panel appearing.
export default function TitleCard({ title, progress, rank, full = false }) {
  const pct = progress?.durationSec > 0 ? Math.min(100, (progress.positionSec / progress.durationSec) * 100) : 0;
  const image = title.backdropUrl || title.posterUrl;

  return (
    <Link to={`/title/${title.slug}`} className={`group relative block ${full ? "w-full" : "w-56 shrink-0 sm:w-64"}`}>
      {rank != null && (
        <span className="pointer-events-none absolute -left-3 -top-6 z-10 select-none text-[5rem] font-black leading-none text-ink [-webkit-text-stroke:2px_#3a3a4d]">
          {rank}
        </span>
      )}

      {/* This wrapper scales as a whole on hover, so the image + panel grow together */}
      <div className={`relative origin-center transition-all duration-300 ease-out group-hover:z-50 group-hover:scale-[1.22] ${rank != null ? "ml-9" : ""}`}>
        {/* Thumbnail */}
        <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-elevated shadow-md shadow-black/40 transition-[border-radius] duration-200 group-hover:rounded-b-none group-hover:shadow-2xl group-hover:shadow-black/80">
          <SmartImage src={image} alt={title.title} label={title.title} className="h-full w-full object-cover" />
          <div className="absolute left-2 top-2 flex gap-1">
            {title.badge && <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow">{title.badge}</span>}
            <span className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 backdrop-blur">{title.type}</span>
          </div>
          {pct > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* Detail panel — attached under the image; revealed on hover */}
        <div className="pointer-events-none absolute inset-x-0 top-full overflow-hidden rounded-b-lg bg-[#0b0b12] px-4 pb-3.5 pt-3 opacity-0 shadow-2xl shadow-black/80 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
          <p className="line-clamp-1 text-[0.82rem] font-bold tracking-tight text-white">{title.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6rem] font-medium text-gray-300">
            {title.rating ? <span className="font-bold text-green-400">{Math.round(title.rating * 10)}% Match</span> : null}
            <span>{title.year}</span>
            {title.rating ? <span className="text-amber-300">★ {Number(title.rating).toFixed(1)}</span> : null}
            {title.duration && <span className="text-gray-400">{title.duration}</span>}
          </div>
          {title.synopsis && <p className="mt-1.5 line-clamp-2 text-[0.62rem] leading-relaxed text-gray-300/85">{title.synopsis}</p>}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[0.6rem] font-bold text-black">▶ Play</span>
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/50 text-xs text-white">+</span>
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/50 text-[0.6rem] text-white">ⓘ</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
