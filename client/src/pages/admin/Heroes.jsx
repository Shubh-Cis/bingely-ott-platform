import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import ImageUpload from "../../components/ImageUpload";
import VideoUpload from "../../components/VideoUpload";

const empty = { title: "", tagline: "", badge: "", imageUrl: "", videoUrl: "", ctaLabel: "Play", ctaUrl: "", meta: "", order: 0, active: true };

// Manage home-page banners. Each hero has an image (shown first) and an optional
// trailer video that plays inline on the customer banner.
export default function Heroes() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => adminApi.list("heroes").then((r) => setItems(r.data || r)).catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await adminApi.create("heroes", {
        title: form.title,
        tagline: form.tagline,
        badge: form.badge || null,
        imageUrl: form.imageUrl,
        videoUrl: form.videoUrl || null,
        ctaLabel: form.ctaLabel || "Play",
        ctaUrl: form.ctaUrl || null,
        meta: form.meta ? form.meta.split(",").map((s) => s.trim()).filter(Boolean) : [],
        order: Number(form.order) || 0,
        active: !!form.active,
      });
      setForm(empty);
      setError("");
      load();
    } catch (err) { setError(apiError(err)); }
  };

  const del = async (id) => { if (confirm("Delete hero banner?")) { try { await adminApi.remove("heroes", id); load(); } catch (e) { setError(apiError(e)); } } };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Hero Banners</h1>
      <p className="mb-4 text-sm text-gray-500">The big rotating banner at the top of the home page. The image shows first; a trailer (if set) plays inline when the visitor clicks “Watch Trailer”.</p>
      {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <form onSubmit={create} className="card mb-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} required /></div>
          <div><label className="label">Badge (optional)</label><input className="input" value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. NEW" /></div>
        </div>
        <div><label className="label">Tagline</label><input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} required /></div>
        <ImageUpload label="Banner image (wide)" value={form.imageUrl} onChange={(v) => set("imageUrl", v)} />
        <VideoUpload label="Trailer video (optional — plays inline on the banner)" value={form.videoUrl} onChange={(v) => set("videoUrl", v)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">CTA label</label><input className="input" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></div>
          <div><label className="label">CTA link</label><input className="input" value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/title/slug" /></div>
          <div><label className="label">Order</label><input className="input" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></div>
        </div>
        <div><label className="label">Meta (comma-separated)</label><input className="input" value={form.meta} onChange={(e) => set("meta", e.target.value)} placeholder="2024, Action, ★ 8.4" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
        <button className="btn-primary" disabled={!form.imageUrl}>Add banner</button>
      </form>

      <div className="space-y-3">
        {items.map((h) => (
          <div key={h.id} className="card flex items-center gap-4">
            <img src={h.imageUrl} alt="" className="h-16 w-28 shrink-0 rounded object-cover ring-1 ring-edge" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{h.title} {h.videoUrl && <span className="text-xs text-green-400">▶ trailer</span>}</div>
              <div className="truncate text-sm text-gray-400">{h.tagline}</div>
            </div>
            <button onClick={() => del(h.id)} className="text-sm text-red-400 hover:underline">Delete</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500">No banners yet.</p>}
      </div>
    </div>
  );
}
