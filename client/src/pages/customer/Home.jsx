import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { catalogApi, accountApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth } from "../../features/auth/authSlice";
import Hero from "../../components/Hero";
import Rail from "../../components/Rail";
import TileRail from "../../components/TileRail";
import { HeroSkeleton, RailSkeleton } from "../../components/Skeleton";

// Per-genre look (vivid gradient + icon). Falls back to a purple block.
const GENRE_STYLE = {
  action:    { grad: "from-rose-600 to-red-700",       icon: "💥" },
  adventure: { grad: "from-amber-500 to-orange-600",   icon: "🧭" },
  "sci-fi":  { grad: "from-cyan-500 to-blue-700",      icon: "🚀" },
  anime:     { grad: "from-fuchsia-500 to-purple-700", icon: "🍥" },
  drama:     { grad: "from-indigo-500 to-violet-700",  icon: "🎭" },
  crime:     { grad: "from-slate-600 to-gray-800",     icon: "🕵️" },
  mythology: { grad: "from-yellow-500 to-amber-700",   icon: "🏛️" },
  bollywood: { grad: "from-pink-500 to-rose-700",      icon: "🎬" },
};
const genreStyle = (name = "", slug = "") =>
  GENRE_STYLE[slug] || GENRE_STYLE[name.toLowerCase()] || { grad: "from-primary to-accent", icon: "🎬" };

// Per-language look: gradient + the language name in its native script.
const LANG_STYLE = {
  english:   { grad: "from-sky-600 to-blue-800",      native: "English" },
  hindi:     { grad: "from-orange-500 to-rose-700",   native: "हिंदी" },
  japanese:  { grad: "from-rose-500 to-red-700",      native: "日本語" },
  tamil:     { grad: "from-emerald-500 to-teal-700",  native: "தமிழ்" },
  telugu:    { grad: "from-violet-500 to-purple-700", native: "తెలుగు" },
  malayalam: { grad: "from-lime-500 to-green-700",    native: "മലയാളം" },
  kannada:   { grad: "from-amber-500 to-yellow-700",  native: "ಕನ್ನಡ" },
  bengali:   { grad: "from-fuchsia-500 to-pink-700",  native: "বাংলা" },
};
const langStyle = (name = "") => LANG_STYLE[name.toLowerCase()] || { grad: "from-primary to-accent", native: name };

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

  // Build the JioHotstar-style tile rows from real data.
  const langTiles = (home.languages || []).map((l) => {
    const s = langStyle(l.name);
    const native = l.native || s.native;
    return { key: l.name, label: native, sublabel: `${l.name} · ${l.count} ${l.count === 1 ? "title" : "titles"}`, watermark: native, image: l.image, grad: l.gradient || s.grad, to: `/search?language=${encodeURIComponent(l.name)}` };
  });
  const genreTiles = (home.categories || []).map((c) => {
    const s = genreStyle(c.name, c.slug);
    return { key: c.id, label: c.name, watermark: c.name, image: c.image, grad: s.grad, to: `/search?category=${c.slug}` };
  });
  // Show the tile rails in the middle of the content rails.
  const midPoint = Math.ceil((home.rails?.length || 0) / 2);

  return (
    <div className="animate-fadeIn">
      <Hero heroes={heroSlides} />

      <div className="space-y-2">
        {continueItems.length > 0 && <Rail name="Continue Watching" items={continueItems} />}
        {home.rails.map((rail, idx) => (
          <div key={rail.id}>
            <Rail name={rail.name} items={rail.titles} ranked={idx === 0 && rail.titles?.length > 2} />
            {/* Drop the Languages + Genres tile rails into the MIDDLE of the
                content rails (after the ceil(n/2)-th rail). */}
            {idx + 1 === midPoint && (
              <div className="my-6 space-y-2">
                {langTiles.length > 0 && <TileRail name="Popular Languages" items={langTiles} variant="block" />}
                {genreTiles.length > 0 && <TileRail name="Popular Genres" items={genreTiles} variant="block" />}
              </div>
            )}
          </div>
        ))}
        {/* Fallback: if there are no content rails, still show the tile rails. */}
        {home.rails.length === 0 && (
          <div className="mt-6 space-y-2">
            {langTiles.length > 0 && <TileRail name="Popular Languages" items={langTiles} variant="block" />}
            {genreTiles.length > 0 && <TileRail name="Popular Genres" items={genreTiles} variant="block" />}
          </div>
        )}
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

    </div>
  );
}
