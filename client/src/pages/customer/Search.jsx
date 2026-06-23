import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catalogApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import TitleCard from "../../components/TitleCard";

const TYPES = [
  ["", "All"],
  ["MOVIE", "Movies"],
  ["SERIES", "Series"],
  ["DOCUMENTARY", "Documentaries"],
];
const SORTS = [
  ["rating", "Top rated"],
  ["newest", "Newly added"],
  ["year", "Release year"],
  ["az", "A–Z"],
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = useState(null);
  const [meta, setMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [term, setTerm] = useState(params.get("q") || "");
  const [error, setError] = useState("");

  const q = params.get("q") || "";
  const type = params.get("type") || "";
  const category = params.get("category") || "";
  const language = params.get("language") || "";
  const sort = params.get("sort") || "rating";

  useEffect(() => {
    catalogApi.categories().then(setCategories).catch(() => {});
  }, []);

  // Debounce the free-text term into the URL.
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      term ? next.set("q", term) : next.delete("q");
      setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(id);
  }, [term]); // eslint-disable-line

  useEffect(() => {
    setResults(null);
    const query = { sort };
    if (q) query.q = q;
    if (type) query.type = type;
    if (category) query.category = category;
    if (language) query.language = language;
    catalogApi
      .search(query)
      .then((res) => {
        setResults(res.data);
        setMeta(res.meta);
      })
      .catch((e) => setError(apiError(e)));
  }, [q, type, category, language, sort]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };

  return (
    <div>
      {/* Search header */}
      <div className="mb-6">
        <div className="flex items-center rounded-xl border border-edge bg-elevated/70 px-4 focus-within:border-primary">
          <span className="text-xl text-gray-400">⌕</span>
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search movies, series, documentaries…"
            className="w-full bg-transparent px-3 py-3.5 text-lg outline-none placeholder:text-gray-500"
          />
          {term && <button onClick={() => setTerm("")} className="text-gray-400 hover:text-white">✕</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(([val, label]) => (
            <button
              key={label}
              onClick={() => setFilter("type", val)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${type === val ? "bg-primary text-white" : "bg-elevated text-gray-300 hover:bg-edge"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <select value={category} onChange={(e) => setFilter("category", e.target.value)} className="rounded-lg border border-edge bg-elevated px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="">All genres</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={(e) => setFilter("sort", e.target.value)} className="rounded-lg border border-edge bg-elevated px-3 py-2 text-sm outline-none focus:border-primary">
            {SORTS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</p>}

      <h1 className="mb-1 text-xl font-bold">
        {q ? <>Results for “{q}”</> : "Browse all titles"}
      </h1>
      {meta && <p className="mb-5 text-sm text-gray-500">{meta.total} title{meta.total === 1 ? "" : "s"}</p>}

      {/* Results grid */}
      {results === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton aspect-[3/2] rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-surface/60 py-20 text-center">
          <p className="text-lg font-semibold">No titles found</p>
          <p className="mt-1 text-gray-500">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((t) => <TitleCard key={t.id} title={t} full />)}
        </div>
      )}
    </div>
  );
}
