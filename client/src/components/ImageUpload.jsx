import { useState } from "react";
import { mediaApi } from "../services/api";
import { apiError } from "../lib/axios";
import MediaPicker from "./MediaPicker";

// Upload an image (poster/backdrop/hero) straight to S3 and store its URL.
// Images need no transcoding, so they're ready immediately. A manual URL is
// still supported. Props: label, value, onChange(url).
export default function ImageUpload({ label = "Image", value = "", onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      // Send the file to our API, which uploads it to S3 server-side. This
      // avoids needing browser→S3 (bucket) CORS for images.
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await mediaApi.uploadImage(fd);
      onChange(url);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-start gap-3">
        {value ? (
          <img src={value} alt="" className="h-16 w-12 shrink-0 rounded object-cover ring-1 ring-edge" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="grid h-16 w-12 shrink-0 place-items-center rounded bg-elevated text-xs text-gray-600 ring-1 ring-edge">none</div>
        )}
        <div className="flex-1">
          <input className="input mb-2" placeholder="Paste an image URL, or upload" value={value || ""} onChange={(e) => onChange(e.target.value)} />
          <label className="btn-ghost cursor-pointer py-1.5 text-sm">
            {busy ? "Uploading…" : "⬆ Upload image"}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => setPicking(true)} className="btn-ghost ml-2 py-1.5 text-sm">📁 Select from library</button>
          {error && <span className="ml-2 text-xs text-red-400">{error}</span>}
        </div>
      </div>

      {picking && (
        <MediaPicker kind="IMAGE" onClose={() => setPicking(false)} onPick={(url) => onChange(url)} />
      )}
    </div>
  );
}
