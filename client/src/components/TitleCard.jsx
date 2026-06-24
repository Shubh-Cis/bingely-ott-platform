import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SmartImage from "./SmartImage";
import { accountApi } from "../services/api";
import { PlayIcon, PlusIcon, CheckIcon, InfoIcon } from "./Icon";

// Prime-style rail card: smaller thumbnail by default. On hover the WHOLE card
// pops up (scales) and a solid detail panel is attached below the enlarged
// image — so it reads as one bigger floating card, not just a panel appearing.
const fmtTime = (s = 0) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default function TitleCard({ title, progress, rank, full = false }) {
  const navigate = useNavigate();
  const [inList, setInList] = useState(false);
  const pct = progress?.durationSec > 0 ? Math.min(100, (progress.positionSec / progress.durationSec) * 100) : 0;
  const image = title.backdropUrl || title.posterUrl;

  // Watchlist toggle — stop the card's Link from firing, then add/remove.
  const toggleList = (e) => {
    e.preventDefault(); e.stopPropagation();
    const next = !inList;
    setInList(next);
    const call = next ? accountApi.addFavourite(title.id) : accountApi.removeFavourite(title.id);
    call.catch(() => { setInList(!next); navigate("/login"); }); // not logged in → sign in
  };
  const goInfo = (e) => { e.preventDefault(); e.stopPropagation(); navigate(`/title/${title.slug}`); };
  // Continue-watching cards (have progress) jump straight into the player, which
  // then asks "Resume / Start over". Everything else opens the title page.
  const to = progress
    ? `/watch/${title.slug}${progress.episodeId ? `?ep=${progress.episodeId}` : ""}`
    : `/title/${title.slug}`;

  return (
    <Link to={to} className={`group relative block ${full ? "w-full" : "w-56 shrink-0 sm:w-64"}`}>
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
          {progress?.positionSec > 0
            ? <p className="mt-1.5 text-[0.62rem] font-semibold text-primary">Continue from {fmtTime(progress.positionSec)}</p>
            : (title.synopsis && <p className="mt-1.5 line-clamp-2 text-[0.62rem] leading-relaxed text-gray-300/85">{title.synopsis}</p>)}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[0.62rem] font-bold text-black">
              <PlayIcon className="h-3 w-3" /> {progress ? "Resume" : "Play"}
            </span>
            <button onClick={toggleList} title={inList ? "Remove from My List" : "Add to My List"} className={`grid h-7 w-7 place-items-center rounded-full border transition ${inList ? "border-primary bg-primary text-white" : "border-white/50 text-white hover:border-white hover:bg-white/15"}`}>
              {inList ? <CheckIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
            </button>
            <button onClick={goInfo} title="More info" className="grid h-7 w-7 place-items-center rounded-full border border-white/50 text-white transition hover:border-white hover:bg-white/15">
              <InfoIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
