import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";

export default function Rails() {
  const [rails, setRails] = useState([]);
  const [titles, setTitles] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = () => adminApi.list("rails").then((r) => setRails(r.data || r)).catch((e) => setError(apiError(e)));
  useEffect(() => {
    load();
    adminApi.list("titles").then((r) => setTitles(r.data)).catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await adminApi.create("rails", { name: name.trim(), active: true });
      setName("");
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
  };

  const addTitle = async (railId, titleId) => {
    if (!titleId) return;
    try {
      await adminApi.railAddTitle(railId, titleId);
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
  };

  const del = async (id) => {
    if (!confirm("Delete rail?")) return;
    try { await adminApi.remove("rails", id); load(); } catch (err) { setError(apiError(err)); }
  };

  const removeTitle = async (railId, titleId) => {
    try {
      await adminApi.railRemoveTitle(railId, titleId);
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Rails</h1>
      {error && <p className="mb-3 text-red-400">{error}</p>}
      <form onSubmit={create} className="mb-6 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New rail (e.g. Trending Now)" className="input" />
        <button className="btn-primary">Create</button>
      </form>

      <div className="space-y-4">
        {rails.map((rail) => (
          <div key={rail.id} className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{rail.name} <span className="text-xs text-gray-500">({rail.titles?.length || 0})</span></h2>
              <button onClick={() => del(rail.id)} className="text-sm text-red-400 hover:underline">Delete</button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-sm text-gray-300">
              {rail.titles?.length ? rail.titles.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 rounded bg-edge px-2 py-1">
                  {t.title}
                  <button
                    onClick={() => removeTitle(rail.id, t.id)}
                    title="Remove from rail"
                    className="grid h-4 w-4 place-items-center rounded-full bg-black/30 text-xs leading-none text-gray-300 hover:bg-primary hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )) : <span className="text-gray-500">No titles yet.</span>}
            </div>
            <select onChange={(e) => { addTitle(rail.id, e.target.value); e.target.value = ""; }} className="input w-auto" defaultValue="">
              <option value="" disabled>+ Add a title…</option>
              {titles.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
