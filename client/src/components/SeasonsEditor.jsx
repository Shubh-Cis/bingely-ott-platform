import { useEffect, useState } from "react";
import { adminApi } from "../services/api";
import { apiError } from "../lib/axios";
import VideoUpload from "./VideoUpload";

// Manage Seasons → Episodes for a SERIES title. Episodes carry their own video
// (uploaded via the same S3/transcode pipeline) and show up on the customer
// series page automatically.
export default function SeasonsEditor({ titleId }) {
  const [seasons, setSeasons] = useState([]);
  const [error, setError] = useState("");
  const [newSeason, setNewSeason] = useState({ number: "", name: "" });

  const load = () => adminApi.seasons(titleId).then(setSeasons).catch((e) => setError(apiError(e)));
  useEffect(() => { if (titleId) load(); }, [titleId]);

  const addSeason = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createSeason(titleId, { number: Number(newSeason.number), name: newSeason.name || "" });
      setNewSeason({ number: "", name: "" });
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
  };

  const delSeason = async (id) => {
    if (!confirm("Delete this season and its episodes?")) return;
    try { await adminApi.deleteSeason(id); load(); } catch (err) { setError(apiError(err)); }
  };

  return (
    <div className="mt-8 border-t border-edge pt-6">
      <h2 className="mb-1 text-lg font-bold">Seasons &amp; Episodes</h2>
      <p className="mb-4 text-sm text-gray-500">Add seasons, then episodes. Each episode can have its own uploaded video.</p>
      {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <form onSubmit={addSeason} className="mb-5 flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Season #</label>
          <input className="input w-24" type="number" value={newSeason.number} onChange={(e) => setNewSeason((s) => ({ ...s, number: e.target.value }))} required />
        </div>
        <div className="flex-1">
          <label className="label">Name (optional)</label>
          <input className="input" placeholder="e.g. Book One" value={newSeason.name} onChange={(e) => setNewSeason((s) => ({ ...s, name: e.target.value }))} />
        </div>
        <button className="btn-primary">+ Add season</button>
      </form>

      <div className="space-y-4">
        {seasons.map((s) => (
          <SeasonCard key={s.id} season={s} onChanged={load} onDelete={() => delSeason(s.id)} />
        ))}
        {seasons.length === 0 && <p className="text-sm text-gray-500">No seasons yet.</p>}
      </div>
    </div>
  );
}

const emptyEp = { number: "", title: "", synopsis: "", videoUrl: "", trailerUrl: "" };

function SeasonCard({ season, onChanged, onDelete }) {
  const [ep, setEp] = useState(emptyEp);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null); // episode being edited

  const startAdd = () => { setEp(emptyEp); setEditId(null); setAdding(true); };
  const startEdit = (e) => {
    setEditId(e.id);
    setEp({ number: e.number ?? "", title: e.title || "", synopsis: e.synopsis || "", videoUrl: e.videoUrl || "", trailerUrl: e.trailerUrl || "" });
    setAdding(true);
  };
  const cancel = () => { setAdding(false); setEditId(null); setEp(emptyEp); };

  const saveEpisode = async (e) => {
    e.preventDefault();
    const body = {
      number: Number(ep.number),
      title: ep.title,
      synopsis: ep.synopsis || "",
      videoUrl: ep.videoUrl || null,
      trailerUrl: ep.trailerUrl || null,
    };
    try {
      if (editId) await adminApi.updateEpisode(editId, body);
      else await adminApi.createEpisode(season.id, body);
      cancel();
      setError("");
      onChanged();
    } catch (err) { setError(apiError(err)); }
  };

  const delEpisode = async (id) => {
    if (!confirm("Delete episode?")) return;
    try { await adminApi.deleteEpisode(id); onChanged(); } catch (err) { setError(apiError(err)); }
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Season {season.number}{season.name && ` — ${season.name}`} <span className="text-xs text-gray-500">({season.episodes?.length || 0} episodes)</span></h3>
        <button onClick={onDelete} className="text-sm text-red-400 hover:underline">Delete season</button>
      </div>

      <div className="mb-3 space-y-2">
        {season.episodes?.map((e) => (
          <div key={e.id} className={`flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm ${editId === e.id ? "ring-1 ring-primary" : ""}`}>
            <span><span className="text-gray-400">E{e.number}</span> · {e.title} {e.videoUrl ? <span className="text-green-400">▶</span> : <span className="text-gray-600">(no video)</span>}</span>
            <div className="flex gap-3">
              <button onClick={() => startEdit(e)} className="text-primary hover:underline">Edit</button>
              <button onClick={() => delEpisode(e.id)} className="text-red-400 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      {adding ? (
        <form onSubmit={saveEpisode} className="space-y-3 rounded-lg border border-edge p-3">
          <p className="text-sm font-semibold text-gray-300">{editId ? "Edit episode" : "New episode"}</p>
          <div className="flex gap-2">
            <div><label className="label">Ep #</label><input className="input w-20" type="number" value={ep.number} onChange={(e) => setEp((x) => ({ ...x, number: e.target.value }))} required /></div>
            <div className="flex-1"><label className="label">Title</label><input className="input" value={ep.title} onChange={(e) => setEp((x) => ({ ...x, title: e.target.value }))} required /></div>
          </div>
          <div><label className="label">Synopsis</label><textarea className="input" rows="2" value={ep.synopsis} onChange={(e) => setEp((x) => ({ ...x, synopsis: e.target.value }))} /></div>
          <VideoUpload label="Episode video" value={ep.videoUrl} onChange={(v) => setEp((x) => ({ ...x, videoUrl: v }))} />
          <VideoUpload label="Episode trailer (optional)" value={ep.trailerUrl} onChange={(v) => setEp((x) => ({ ...x, trailerUrl: v }))} />
          <div className="flex gap-2">
            <button className="btn-primary">{editId ? "Save changes" : "Save episode"}</button>
            <button type="button" className="btn-ghost" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn-ghost py-1.5 text-sm" onClick={startAdd}>+ Add episode</button>
      )}
    </div>
  );
}
