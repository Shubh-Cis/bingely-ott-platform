import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import ImageUpload from "../../components/ImageUpload";

const empty = { name: "", image: "", order: 0, active: true };

// Manage genres shown in the "Popular Genres" rail. Each can have its own
// artwork (else the home page falls back to the top title's image).
export default function Categories() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => adminApi.list("categories").then((r) => setItems(r.data || r)).catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(empty); setEditId(null); };
  const startEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name || "", image: c.image || "", order: c.order ?? 0, active: !!c.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    const body = { name: form.name.trim(), image: form.image || null, order: Number(form.order) || 0, active: !!form.active };
    try {
      if (editId) await adminApi.update("categories", editId, body);
      else await adminApi.create("categories", body);
      resetForm();
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete category?")) return;
    try { await adminApi.remove("categories", id); if (editId === id) resetForm(); load(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Categories (Genres)</h1>
      <p className="mb-4 text-sm text-gray-500">These power the “Popular Genres” rail on the home page. Set an image to control the tile artwork — otherwise it uses the top title’s backdrop.</p>
      {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <form onSubmit={submit} className={`card mb-6 space-y-4 ${editId ? "ring-1 ring-primary" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editId ? "Edit genre" : "Add genre"}</h2>
          {editId && <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-white">Cancel edit</button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Action" /></div>
          <div><label className="label">Order</label><input className="input" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></div>
        </div>
        <ImageUpload label="Tile image (optional — wide artwork looks best)" value={form.image} onChange={(v) => set("image", v)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
        <button className="btn-primary" disabled={!form.name.trim() || busy}>{busy ? "Saving…" : editId ? "Save changes" : "Add genre"}</button>
      </form>

      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className={`card flex items-center gap-4 ${editId === c.id ? "ring-1 ring-primary" : ""}`}>
            {c.image
              ? <img src={c.image} alt="" className="h-14 w-24 shrink-0 rounded object-cover ring-1 ring-edge" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              : <div className="grid h-14 w-24 shrink-0 place-items-center rounded bg-edge text-xs text-gray-500">auto</div>}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{c.name} {!c.active && <span className="text-xs text-gray-500">· hidden</span>}</div>
              <div className="truncate text-sm text-gray-400">/{c.slug}</div>
            </div>
            <button onClick={() => startEdit(c)} className="text-sm text-primary hover:underline">Edit</button>
            <button onClick={() => del(c.id)} className="text-sm text-red-400 hover:underline">Delete</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No categories yet.</p>}
      </div>
    </div>
  );
}
