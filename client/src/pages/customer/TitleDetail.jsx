import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { catalogApi, accountApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth } from "../../features/auth/authSlice";
import Rail from "../../components/Rail";
import SmartImage from "../../components/SmartImage";
import { PlayIcon, PlusIcon, CheckIcon, ChevronDownIcon } from "../../components/Icon";

export default function TitleDetail() {
  const { slug } = useParams();
  const { kind } = useSelector(selectAuth);
  const [title, setTitle] = useState(null);
  const [related, setRelated] = useState([]);
  const [moreType, setMoreType] = useState([]);
  const [moreGenre, setMoreGenre] = useState(null);
  const [fav, setFav] = useState(false);
  const [seasonIdx, setSeasonIdx] = useState(0);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(null);
    setSeasonIdx(0);
    setRelated([]); setMoreType([]); setMoreGenre(null);
    catalogApi
      .title(slug)
      .then((t) => {
        setTitle(t);
        const not = (arr) => (arr || []).filter((x) => x.id !== t.id);
        catalogApi.related(t.id).then((r) => setRelated(not(r))).catch(() => {});
        catalogApi.search({ type: t.type, sort: "rating", pageSize: 18 }).then((r) => setMoreType(not(r.data))).catch(() => {});
        const g = t.categories?.[0];
        if (g) catalogApi.byCategory(g.slug, { pageSize: 18 }).then((r) => setMoreGenre({ name: g.name, items: not(r.data) })).catch(() => {});
      })
      .catch((e) => setError(apiError(e)));
  }, [slug]);

  const typeLabel = { MOVIE: "Movies", SERIES: "Series", DOCUMENTARY: "Documentaries" };

  const toggleFav = async () => {
    if (kind !== "viewer" || !title) return;
    if (fav) await accountApi.removeFavourite(title.id);
    else await accountApi.addFavourite(title.id);
    setFav(!fav);
  };

  if (error) return <p className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</p>;
  if (!title) return <div className="skeleton -mx-4 -mt-20 h-[88vh]" />;

  const isSeries = title.type === "SERIES";
  const firstEpisode = title.seasons?.flatMap((s) => s.episodes)?.find((e) => e.videoUrl);
  const playTarget = isSeries
    ? (firstEpisode ? `/watch/${title.slug}?ep=${firstEpisode.id}` : null)
    : (title.videoUrl ? `/watch/${title.slug}` : null);
  const season = title.seasons?.[seasonIdx];

  const facts = [
    ["Type", title.type],
    ["Year", title.year],
    title.duration ? ["Duration", title.duration] : null,
    isSeries && title.seasons?.length ? ["Seasons", title.seasons.length] : null,
    title.rating ? ["Rating", `★ ${Number(title.rating).toFixed(1)} / 10`] : null,
    title.language ? ["Language", title.language] : null,
    title.country ? ["Country", title.country] : null,
    ["Quality", "HD · 4K"],
  ].filter(Boolean);

  return (
    <div className="animate-fadeIn">
      {/* ── Cinematic hero ─────────────────────────────────────────────── */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-20 mb-12 min-h-[90vh] w-screen overflow-hidden">
        <SmartImage src={title.backdropUrl || title.posterUrl} alt={title.title} label={title.title} className="absolute inset-0 h-full w-full animate-kenburns object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-44 sm:flex-row sm:items-end sm:px-6 lg:gap-14">
          {/* Bigger poster */}
          <div className="group w-52 shrink-0 overflow-hidden rounded-3xl ring-1 ring-white/15 shadow-2xl shadow-black/80 transition duration-300 hover:-translate-y-1 hover:ring-white/30 sm:w-72 lg:w-[22rem]">
            <SmartImage src={title.posterUrl || title.backdropUrl} alt={title.title} label={title.title} className="aspect-[2/3] h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          </div>

          {/* Info */}
          <div className="max-w-2xl animate-riseIn pb-2">
            {title.badge && (
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {title.badge}
              </span>
            )}
            <h1 className="text-4xl font-black leading-[0.98] tracking-tight drop-shadow-2xl sm:text-6xl lg:text-7xl">{title.title}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {title.rating ? <span className="font-bold text-green-400">{Math.round(title.rating * 10)}% Match</span> : null}
              <span className="text-gray-300">{title.year}</span>
              <span className="rounded border border-white/25 px-1.5 py-0.5 text-xs font-medium text-gray-200">{title.type}</span>
              {title.rating ? <span className="text-amber-300">★ {Number(title.rating).toFixed(1)}</span> : null}
              {title.duration && <span className="text-gray-300">{title.duration}</span>}
              {isSeries && title.seasons?.length > 0 && <span className="text-gray-400">{title.seasons.length} Season{title.seasons.length > 1 ? "s" : ""}</span>}
            </div>

            {title.categories?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {title.categories.map((c) => (
                  <Link key={c.id} to={`/search?category=${c.slug}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 transition hover:border-primary hover:text-white">
                    {c.name}
                  </Link>
                ))}
              </div>
            )}

            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-200/90">{title.synopsis}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {playTarget ? (
                <Link to={playTarget} className="btn-light px-9 text-base"><PlayIcon className="h-5 w-5" /> Play</Link>
              ) : (
                <span className="btn-ghost cursor-default px-9 text-base">Coming soon</span>
              )}
              {title.trailerUrl && (
                <Link to={`/watch/${title.slug}?kind=trailer`} className="btn-ghost px-7 text-base"><PlayIcon className="h-4 w-4" /> Trailer</Link>
              )}
              {kind === "viewer" && (
                <button onClick={toggleFav} className={`icon-btn h-12 w-12 ${fav ? "border-primary bg-primary text-white" : ""}`} title={fav ? "Remove from My List" : "Add to My List"}>
                  {fav ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500">Trailers are free to watch. Full {isSeries ? "episodes" : "titles"} require a subscription.</p>
          </div>
        </div>
      </div>

      {/* ── Quick facts ────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-surface/40 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500">{k}</p>
              <p className="mt-1 font-semibold text-gray-100">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Series: season tabs + episodes ─────────────────────────────── */}
      {isSeries && title.seasons?.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Episodes</h2>
            {/* Season dropdown */}
            <div className="relative">
              <button
                onClick={() => setSeasonOpen((o) => !o)}
                className="inline-flex min-w-[12rem] items-center justify-between gap-3 rounded-xl border border-white/15 bg-elevated px-4 py-2.5 text-sm font-semibold text-white transition hover:border-primary"
              >
                <span>Season {season?.number}{season?.name ? ` · ${season.name}` : ""}</span>
                <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${seasonOpen ? "rotate-180" : ""}`} />
              </button>
              {seasonOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSeasonOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 max-h-80 w-60 overflow-auto rounded-xl border border-white/15 bg-surface p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
                    {title.seasons.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => { setSeasonIdx(idx); setSeasonOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${idx === seasonIdx ? "bg-gradient-to-r from-primary to-accent text-white" : "text-gray-300 hover:bg-white/10"}`}
                      >
                        <span>Season {s.number}{s.name ? ` · ${s.name}` : ""}</span>
                        <span className="ml-2 shrink-0 text-xs opacity-70">{s.episodes?.length || 0} ep</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {season?.episodes?.length ? season.episodes.map((ep) => {
              const playable = !!ep.videoUrl;
              const Wrapper = playable ? Link : "div";
              return (
                <Wrapper
                  key={ep.id}
                  {...(playable ? { to: `/watch/${title.slug}?ep=${ep.id}` } : {})}
                  className={`group flex items-center gap-4 rounded-2xl border border-white/10 bg-surface/50 p-3 transition ${playable ? "hover:border-primary/40 hover:bg-elevated" : "opacity-60"}`}
                >
                  <span className="w-7 shrink-0 text-center text-xl font-black text-gray-600">{ep.number}</span>
                  <div className="relative aspect-video w-44 shrink-0 overflow-hidden rounded-xl">
                    <SmartImage src={ep.thumbnailUrl || title.backdropUrl} alt={ep.title} label={ep.title} className="h-full w-full object-cover" />
                    {playable && <span className="absolute inset-0 grid place-items-center bg-black/40 text-3xl text-white opacity-0 transition group-hover:opacity-100">▶</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{ep.title}</p>
                      {ep.durationSec ? <span className="shrink-0 text-xs text-gray-500">{Math.round(ep.durationSec / 60)}m</span> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{ep.synopsis}</p>
                    {!playable && <p className="mt-1 text-xs text-amber-400/80">No video uploaded yet</p>}
                  </div>
                </Wrapper>
              );
            }) : <p className="rounded-2xl border border-white/10 bg-surface/50 p-6 text-center text-gray-500">No episodes in this season yet.</p>}
          </div>
        </section>
      )}

      {/* Series with no seasons added yet */}
      {isSeries && !title.seasons?.length && (
        <section className="mb-12">
          <h2 className="mb-3 text-2xl font-bold tracking-tight">Episodes</h2>
          <p className="rounded-2xl border border-white/10 bg-surface/50 p-6 text-center text-gray-500">Seasons &amp; episodes coming soon.</p>
        </section>
      )}

      {/* Recommendations — like Prime's "more of this kind" below the title */}
      <Rail name="More Like This" items={related} />
      {moreGenre?.items?.length > 0 && <Rail name={`More ${moreGenre.name}`} items={moreGenre.items} />}
      <Rail name={`More ${typeLabel[title.type] || "Titles"}`} items={moreType} />
    </div>
  );
}
