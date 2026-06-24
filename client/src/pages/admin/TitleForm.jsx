import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import VideoUpload from "../../components/VideoUpload";
import ImageUpload from "../../components/ImageUpload";
import SeasonsEditor from "../../components/SeasonsEditor";

// Create or edit a title. Movies/documentaries carry a single video (uploaded
// here); SERIES titles instead get a Seasons → Episodes editor (each episode
// has its own video). Trailers can be uploaded for any type.
export default function TitleForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { type: "MOVIE", active: true, rating: 0, videoUrl: "", trailerUrl: "" },
  });
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [error, setError] = useState("");

  const type = watch("type");
  const videoUrl = watch("videoUrl");
  const trailerUrl = watch("trailerUrl");
  const posterUrl = watch("posterUrl");
  const backdropUrl = watch("backdropUrl");

  // Register the fields the upload widgets control programmatically.
  useEffect(() => {
    register("videoUrl");
    register("trailerUrl");
    register("posterUrl");
    register("backdropUrl");
  }, [register]);

  useEffect(() => {
    adminApi.list("categories").then((res) => setCategories(res.data || res)).catch(() => {});
    if (!isNew) {
      adminApi.get("titles", id).then((t) => {
        reset({ title: t.title, synopsis: t.synopsis, year: t.year, rating: t.rating, duration: t.duration, type: t.type, language: t.language || "", country: t.country || "", posterUrl: t.posterUrl, backdropUrl: t.backdropUrl, videoUrl: t.videoUrl || "", trailerUrl: t.trailerUrl || "", badge: t.badge, featured: t.featured, active: t.active });
        setSelectedCats(t.categories.map((c) => c.id));
      }).catch((e) => setError(apiError(e)));
    }
  }, [id]);

  const toggleCat = (cid) => setSelectedCats((p) => (p.includes(cid) ? p.filter((x) => x !== cid) : [...p, cid]));

  const onSubmit = async (v) => {
    const body = {
      ...v,
      year: Number(v.year),
      rating: Number(v.rating),
      categoryIds: selectedCats,
      backdropUrl: v.backdropUrl || null,
      videoUrl: v.type === "SERIES" ? null : v.videoUrl || null, // series videos live on episodes
      trailerUrl: v.trailerUrl || null,
      badge: v.badge || null,
      // leave blank → don't send (keeps the DB default/existing value)
      language: v.language?.trim() || undefined,
      country: v.country?.trim() || undefined,
    };
    try {
      if (isNew) {
        const created = await adminApi.create("titles", body);
        // For a new SERIES, jump to edit mode so seasons/episodes can be added.
        navigate(body.type === "SERIES" ? `/admin/titles/${created.id}` : "/admin/titles");
      } else {
        await adminApi.update("titles", id, body);
        if (body.type !== "SERIES") navigate("/admin/titles");
        else setError(""); // stay on the page to manage episodes
      }
    } catch (e) {
      setError(apiError(e));
    }
  };

  const field = (name, label, opts = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...register(name, opts)} />
      {errors[name] && <p className="mt-1 text-xs text-red-400">{errors[name].message}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">{isNew ? "New title" : "Edit title"}</h1>
      {error && <p className="mb-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("title", "Title", { required: "Required" })}
          <div>
            <label className="label">Type</label>
            <select className="input" {...register("type")}>
              <option value="MOVIE">Movie</option>
              <option value="SERIES">Series</option>
              <option value="DOCUMENTARY">Documentary</option>
            </select>
          </div>
          {field("year", "Year", { required: "Required" })}
          {field("rating", "Rating (0–10)")}
          {field("duration", "Duration (e.g. 1h 52m)")}
          {field("badge", "Badge (optional)")}
          {field("language", "Language (e.g. Hindi — drives the language rail)")}
          {field("country", "Country of origin (e.g. India)")}
        </div>
        <div>
          <label className="label">Synopsis</label>
          <textarea className="input" rows="3" {...register("synopsis")} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUpload label="Poster (2:3)" value={posterUrl} onChange={(v) => setValue("posterUrl", v, { shouldDirty: true })} />
          <ImageUpload label="Backdrop (wide)" value={backdropUrl} onChange={(v) => setValue("backdropUrl", v, { shouldDirty: true })} />
        </div>

        {/* Movie/doc video upload (series videos are on episodes instead) */}
        {type !== "SERIES" && (
          <VideoUpload label="Movie video" value={videoUrl} onChange={(v) => setValue("videoUrl", v, { shouldDirty: true })} />
        )}
        <VideoUpload label="Trailer (free to watch without login)" value={trailerUrl} onChange={(v) => setValue("trailerUrl", v, { shouldDirty: true })} />

        <div>
          <label className="label">Categories</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button type="button" key={c.id} onClick={() => toggleCat(c.id)} className={`rounded-full px-3 py-1 text-sm ${selectedCats.includes(c.id) ? "bg-primary" : "bg-edge"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("featured")} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("active")} /> Active</label>
        </div>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save title"}</button>
      </form>

      {/* Series episode management — only once the title exists */}
      {type === "SERIES" && !isNew && <SeasonsEditor titleId={id} />}
      {type === "SERIES" && isNew && (
        <p className="mt-6 rounded-lg border border-edge bg-elevated/50 p-4 text-sm text-gray-400">
          Save the series first — then you’ll be able to add seasons &amp; episodes here.
        </p>
      )}
    </div>
  );
}
