import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { catalogApi, accountApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth } from "../../features/auth/authSlice";
import Hero from "../../components/Hero";
import Rail from "../../components/Rail";
import { HeroSkeleton, RailSkeleton } from "../../components/Skeleton";

// Turn a Title into a Hero slide so the banner stays full even with few/no
// admin-made banners (and so the prev/next arrows always have something to cycle).
const titleToHero = (t) => ({
  id: t.id,
  imageUrl: t.backdropUrl || t.posterUrl,
  title: t.title,
  tagline: t.synopsis,
  badge: t.featured ? "Featured" : t.type,
  meta: [String(t.year), t.type, t.rating ? `★ ${Number(t.rating).toFixed(1)}` : null].filter(Boolean),
  videoUrl: t.trailerUrl || t.videoUrl,
  ctaUrl: `/title/${t.slug}`,
  ctaLabel: "More Info",
});

export default function Home() {
  const { kind } = useSelector(selectAuth);
  const [home, setHome] = useState(null);
  const [continueItems, setContinue] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    catalogApi.home().then(setHome).catch((e) => setError(apiError(e)));
    if (kind === "viewer") accountApi.continueWatching().then(setContinue).catch(() => {});
  }, [kind]);

  // Banner slides = the admin's hero banners EXACTLY. Only when there are no
  // banners at all do we fall back to top titles so the banner isn't empty.
  const heroSlides = useMemo(() => {
    if (!home) return [];
    if (home.heroes?.length) return home.heroes;
    const titles = [];
    const seen = new Set();
    for (const rail of home.rails || []) {
      for (const t of rail.titles || []) {
        if (!seen.has(t.id)) { seen.add(t.id); titles.push(t); }
      }
    }
    return titles.slice(0, 5).map(titleToHero);
  }, [home]);

  if (error) return <p className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</p>;
  if (!home) return (<div><HeroSkeleton /><RailSkeleton title /><RailSkeleton title /></div>);

  return (
    <div className="animate-fadeIn">
      <Hero heroes={heroSlides} />

      <div className="space-y-2">
        {continueItems.length > 0 && <Rail name="Continue Watching" items={continueItems} />}
        {home.rails.map((rail, idx) => (
          <Rail key={rail.id} name={rail.name} items={rail.titles} ranked={idx === 0 && rail.titles?.length > 2} />
        ))}
      </div>

      {home.collections?.length > 0 && (
        <section className="mb-10 mt-2">
          <h2 className="section-title">Featured Collections</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.collections.map((c) => (
              <Link key={c.id} to={`/search?collection=${c.slug}`} className={`group relative flex h-40 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient || "from-accent to-primary"} p-5 ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-white/30`}>
                <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/10" />
                <h3 className="relative text-2xl font-extrabold drop-shadow">{c.title}</h3>
                <p className="relative line-clamp-1 text-sm text-white/85">{c.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {home.categories?.length > 0 && (
        <section className="mb-8 mt-2">
          <h2 className="section-title">Browse by Genre</h2>
          <div className="flex flex-wrap gap-2.5">
            {home.categories.map((cat) => (
              <Link key={cat.id} to={`/search?category=${cat.slug}`} className="chip border border-white/10 bg-white/5 text-gray-300 hover:border-primary hover:bg-primary hover:text-white">
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
