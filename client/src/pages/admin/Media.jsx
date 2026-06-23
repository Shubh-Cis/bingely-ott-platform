import { useEffect, useRef, useState } from "react";
import { mediaApi } from "../../services/api";
import { apiError } from "../../lib/axios";

// Upload (direct-to-S3 presigned) + transcode + manage/DELETE media (removes the
// S3 objects too: transcoded HLS files, raw mp4, or the uploaded image).
export default function Media() {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState("");
  const [deleting, setDeleting] = useState(null);
  const pollRef = useRef(null);

  const addLog = (m) => setLog((l) => [...l, `${new Date().toLocaleTimeString()} ${m}`]);
  const load = () => mediaApi.list(filter ? { kind: filter } : {}).then(setItems).catch(() => {});
  useEffect(() => { load(); return () => clearInterval(pollRef.current); }, [filter]);

  const upload = async (file) => {
    if (!file) return;
    const kind = file.type.startsWith("video") ? "VIDEO" : "IMAGE";
    setBusy(true); setProgress(0);
    try {
      addLog(`Requesting upload URL for ${file.name} (${kind})`);
      const { media, uploadUrl } = await mediaApi.uploadUrl({ filename: file.name, kind, mimeType: file.type, size: file.size });
      addLog("Uploading directly to S3…");
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.send(file);
      });
      addLog("Upload finished — notifying API");
      await mediaApi.complete(media.id);
      if (kind === "VIDEO") {
        addLog("Transcode queued — polling status…");
        pollRef.current = setInterval(async () => {
          const s = await mediaApi.status(media.id);
          addLog(`status: ${s.status}`);
          if (s.status === "READY" || s.status === "FAILED") { clearInterval(pollRef.current); load(); }
        }, 4000);
      }
      load();
    } catch (e) {
      addLog(`error: ${apiError(e)}`);
    } finally { setBusy(false); }
  };

  const del = async (m) => {
    if (!confirm(`Delete "${m.filename}"?\nThis permanently removes the file(s) from S3 and cannot be undone.`)) return;
    setDeleting(m.id); setMsg(null);
    try {
      const res = await mediaApi.remove(m.id);
      setMsg({ type: "ok", text: res?.note ? `Deleted — ${res.note}` : `Deleted "${m.filename}" (${res?.deletedKeys ?? 0} S3 object(s) removed).` });
      load();
    } catch (e) {
      setMsg({ type: "err", text: apiError(e) });
    } finally { setDeleting(null); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <div className="flex gap-1.5">
          {[["", "All"], ["VIDEO", "Videos"], ["IMAGE", "Images"]].map(([v, l]) => (
            <button key={l} onClick={() => setFilter(v)} className={`chip ${filter === v ? "bg-primary text-white" : "bg-elevated text-gray-300 hover:bg-edge"}`}>{l}</button>
          ))}
        </div>
      </div>

      {msg && <p className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${msg.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{msg.text}</p>}

      <div className="card mb-6">
        <label className="label">Upload video (.mp4) or image</label>
        <input type="file" accept="video/mp4,image/*" disabled={busy} onChange={(e) => upload(e.target.files[0])} />
        {busy && (
          <div className="mt-3 h-5 overflow-hidden rounded bg-edge">
            <div className="h-full bg-primary text-center text-xs font-bold leading-5" style={{ width: `${progress}%` }}>{progress}%</div>
          </div>
        )}
        {log.length > 0 && <pre className="mt-3 max-h-40 overflow-y-auto rounded bg-ink p-3 text-xs text-gray-400">{log.join("\n")}</pre>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-surface/60">
            <div className="aspect-video bg-elevated">
              {m.kind === "IMAGE" && m.url ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl text-gray-600">🎬</div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium" title={m.filename}>{m.filename}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">{m.kind}</span>
                <span className={`text-xs ${m.status === "READY" ? "text-green-400" : m.status === "FAILED" ? "text-red-400" : "text-amber-400"}`}>{m.status}{m.transcoding ? " · transcoding" : ""}</span>
              </div>
            </div>
            <button
              onClick={() => del(m)}
              disabled={deleting === m.id}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-sm text-white opacity-0 backdrop-blur transition hover:bg-red-600 group-hover:opacity-100 disabled:opacity-100"
              title="Delete from S3"
            >
              {deleting === m.id ? "…" : "🗑"}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="col-span-full py-8 text-center text-gray-500">No media yet.</p>}
      </div>
    </div>
  );
}
