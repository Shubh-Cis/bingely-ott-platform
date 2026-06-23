import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import ImageUpload from "../../components/ImageUpload";

const empty = { name: "", native: "", image: "", gradient: "from-primary to-accent", order: 0, active: true };

// Manage the "Popular Languages" rail. `name` must match the title's language
// (e.g. "Hindi"); `native` is shown big on the tile (e.g. "हिंदी").
export default function Languages() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => adminApi.list("languages").then((r) => setItems(r.data || r)).catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(empty); setEditId(null); };
  const startEdit = (l) => {
    setEditId(l.id);
    setForm({ name: l.name || "", native: l.native || "", image: l.image || "", gradient: l.gradient || "from-primary to-accent", order: l.order ?? 0, active: !!l.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    const body = {
      name: form.name.trim(),
      native: form.native.trim() || form.name.trim(),
      image: form.image || null,
      gradient: form.gradient || "from-primary to-accent",
      order: Number(form.order) || 0,
      active: !!form.active,
    };
    try {
      if (editId) await adminApi.update("languages", editId, body);
      else await adminApi.create("languages", body);
      resetForm();
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete language?")) return;
    try { await adminApi.remove("languages", id); if (editId === id) resetForm(); load(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Languages</h1>
      <p className="mb-4 text-sm text-gray-500">
        Power the “Popular Languages” rail. <b>Name</b> must exactly match the language set on titles (e.g. <code>Hindi</code>). Title counts are computed automatically. Set an image, or it falls back to the top title’s artwork.
      </p>
      {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <form onSubmit={submit} className={`card mb-6 space-y-4 ${editId ? "ring-1 ring-primary" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editId ? "Edit language" : "Add language"}</h2>
          {editId && <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-white">Cancel edit</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Name (matches titles)</label><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Hindi" /></div>
          <div><label className="label">Native label</label><input className="input" value={form.native} onChange={(e) => set("native", e.target.value)} placeholder="हिंदी" /></div>
          <div><label className="label">Order</label><input className="input" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></div>
        </div>
        <div><label className="label">Gradient (Tailwind, used if no image)</label><input className="input" value={form.gradient} onChange={(e) => set("gradient", e.target.value)} placeholder="from-orange-500 to-rose-700" /></div>
        <ImageUpload label="Tile image (optional — wide artwork looks best)" value={form.image} onChange={(v) => set("image", v)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
        <button className="btn-primary" disabled={!form.name.trim() || busy}>{busy ? "Saving…" : editId ? "Save changes" : "Add language"}</button>
      </form>

      <div className="space-y-3">
        {items.map((l) => (
          <div key={l.id} className={`card flex items-center gap-4 ${editId === l.id ? "ring-1 ring-primary" : ""}`}>
            {l.image
              ? <img src={l.image} alt="" className="h-14 w-24 shrink-0 rounded object-cover ring-1 ring-edge" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              : <div className={`grid h-14 w-24 shrink-0 place-items-center rounded bg-gradient-to-br ${l.gradient || "from-primary to-accent"} text-sm font-bold text-white`}>{l.native || l.name}</div>}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{l.name} {!l.active && <span className="text-xs text-gray-500">· hidden</span>}</div>
              <div className="truncate text-sm text-gray-400">{l.native}</div>
            </div>
            <button onClick={() => startEdit(l)} className="text-sm text-primary hover:underline">Edit</button>
            <button onClick={() => del(l.id)} className="text-sm text-red-400 hover:underline">Delete</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No languages yet.</p>}
      </div>
    </div>
  );
}
