import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi } from "../services/api";
import SmartImage from "./SmartImage";

// Instant search: as you type, a dropdown shows matching titles. Enter opens the
// full results page; clicking a result jumps straight to that title.
export default function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // Debounced live search.
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      catalogApi
        .search({ q: q.trim(), pageSize: 6 })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (slug) => {
    setOpen(false);
    setQ("");
    navigate(`/title/${slug}`);
  };

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      setOpen(false);
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 backdrop-blur transition focus-within:border-primary focus-within:bg-white/10">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          placeholder="Search…"
          className="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-gray-500 transition-all focus:w-56"
        />
        {q && <button type="button" onClick={() => setQ("")} className="text-gray-400 hover:text-white">✕</button>}
      </form>

      {open && q.trim() && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-edge bg-surface/95 shadow-2xl backdrop-blur">
          {loading && results.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">No matches for “{q}”.</p>}
          {results.map((t) => (
            <button key={t.id} onClick={() => go(t.slug)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-elevated">
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded ring-1 ring-edge">
                <SmartImage src={t.backdropUrl || t.posterUrl} alt={t.title} label={t.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-gray-500">{t.year} · {t.type}{t.rating ? ` · ★ ${Number(t.rating).toFixed(1)}` : ""}</p>
              </div>
            </button>
          ))}
          {results.length > 0 && (
            <button onClick={submit} className="block w-full border-t border-edge px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-elevated">
              See all results for “{q}” →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
