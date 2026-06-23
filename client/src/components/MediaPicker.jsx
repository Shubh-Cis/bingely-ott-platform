import { useEffect, useState } from "react";
import { mediaApi } from "../services/api";
import { apiError } from "../lib/axios";

// Modal that lists media already uploaded to S3 so you can REUSE it instead of
// re-uploading. Picking returns the right value for the field:
//   IMAGE → its URL
//   VIDEO → "media:<videoId>" (only when transcoding is READY)
export default function MediaPicker({ kind = "IMAGE", onPick, onClose }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // Search by filename, debounced. This queries the DB (not S3), so it's free.
  useEffect(() => {
    setItems(null);
    const id = setTimeout(() => {
      mediaApi.list({ kind, q: q.trim() || undefined }).then(setItems).catch((e) => setError(apiError(e)));
    }, 250);
    return () => clearTimeout(id);
  }, [kind, q]);

  const choose = (m) => {
    if (kind === "VIDEO") {
      if (m.status !== "READY" || !m.videoId) return; // not playable yet
      onPick(`media:${m.videoId}`);
    } else {
      onPick(m.url);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-edge bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Select existing {kind === "VIDEO" ? "video" : "image"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Search by filename */}
        <div className="mb-4 flex items-center rounded-lg border border-edge bg-elevated px-3 focus-within:border-primary">
          <span className="text-gray-400">⌕</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${kind.toLowerCase()}s by filename…`}
            className="w-full bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-gray-500"
          />
          {q && <button onClick={() => setQ("")} className="text-gray-400 hover:text-white">✕</button>}
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {!items && <p className="text-gray-400">Loading…</p>}
        {items && items.length === 0 && (
          <p className="text-gray-500">{q ? `No ${kind.toLowerCase()}s match “${q}”.` : `No ${kind.toLowerCase()} media uploaded yet.`}</p>
        )}

        <div className={kind === "IMAGE" ? "grid grid-cols-3 gap-3 sm:grid-cols-4" : "space-y-2"}>
          {items?.map((m) =>
            kind === "IMAGE" ? (
              <button key={m.id} onClick={() => choose(m)} className="group relative overflow-hidden rounded-lg ring-1 ring-edge hover:ring-primary">
                <img src={m.url} alt={m.filename} className="aspect-[2/3] w-full object-cover" onError={(e) => (e.currentTarget.style.opacity = 0.2)} />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[10px]">{m.filename}</span>
              </button>
            ) : (
              <button
                key={m.id}
                onClick={() => choose(m)}
                disabled={m.status !== "READY" || !m.videoId}
                className="flex w-full items-center justify-between rounded-lg border border-edge bg-elevated px-3 py-2 text-left text-sm hover:border-primary disabled:opacity-50"
              >
                <span className="truncate">🎬 {m.filename}</span>
                <span className={`ml-3 shrink-0 text-xs ${m.status === "READY" ? "text-green-400" : m.status === "FAILED" ? "text-red-400" : "text-amber-400"}`}>
                  {m.status}{m.status === "READY" ? " ✓" : ""}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
