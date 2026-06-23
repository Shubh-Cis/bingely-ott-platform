import { useRef, useState } from "react";
import { mediaApi } from "../services/api";
import { apiError } from "../lib/axios";
import MediaPicker from "./MediaPicker";

// Upload a video straight to S3 via the presigned-URL flow, queue transcoding,
// and poll until it's ready. On success it stores a stable `media:<videoId>`
// reference (the player resolves it to a fresh HLS URL at watch time).
//
// Props: label, value (current stored ref/url), onChange(value)
export default function VideoUpload({ label = "Video", value = "", onChange }) {
  const [phase, setPhase] = useState("idle"); // idle | uploading | transcoding | ready | failed
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const pollRef = useRef(null);

  const isUploaded = typeof value === "string" && value.startsWith("media:");

  const upload = async (file) => {
    if (!file) return;
    setError("");
    setPhase("uploading");
    setProgress(0);
    try {
      const { media, uploadUrl, videoId } = await mediaApi.uploadUrl({
        filename: file.name,
        kind: "VIDEO",
        mimeType: file.type || "video/mp4",
        size: file.size,
      });

      // Direct-to-S3 PUT with progress.
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 upload failed (${xhr.status}) — check the bucket CORS`)));
        xhr.onerror = () => reject(new Error("Network error during S3 upload"));
        xhr.send(file);
      });

      await mediaApi.complete(media.id); // queue transcode
      setPhase("transcoding");

      // Poll until the worker finishes.
      await new Promise((resolve) => {
        pollRef.current = setInterval(async () => {
          try {
            const s = await mediaApi.status(media.id);
            if (s.status === "READY") {
              clearInterval(pollRef.current);
              onChange(`media:${videoId}`);
              setPhase("ready");
              resolve();
            } else if (s.status === "FAILED") {
              clearInterval(pollRef.current);
              setError(s.error || "Transcoding failed");
              setPhase("failed");
              resolve();
            }
          } catch {
            /* keep polling */
          }
        }, 4000);
      });
    } catch (e) {
      setError(apiError(e));
      setPhase("failed");
    }
  };

  return (
    <div>
      <label className="label">{label}</label>

      {/* Manual URL (still supported) */}
      <input
        className="input mb-2"
        placeholder="Paste an HLS/MP4 URL, or upload below"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <label className="btn-ghost cursor-pointer py-1.5 text-sm">
          ⬆ Upload video
          <input type="file" accept="video/mp4" className="hidden" disabled={phase === "uploading" || phase === "transcoding"} onChange={(e) => upload(e.target.files[0])} />
        </label>
        <button type="button" onClick={() => setPicking(true)} className="btn-ghost py-1.5 text-sm">📁 Select from library</button>
        {isUploaded && phase === "idle" && <span className="text-xs text-green-400">✓ uploaded video attached</span>}
        {phase === "ready" && <span className="text-xs text-green-400">✓ transcoded &amp; ready</span>}
        {phase === "transcoding" && <span className="text-xs text-amber-400">⏳ transcoding… (you can keep editing)</span>}
        {phase === "failed" && <span className="text-xs text-red-400">✗ {error}</span>}
      </div>

      {phase === "uploading" && (
        <div className="mt-2 h-2 overflow-hidden rounded bg-edge">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {picking && (
        <MediaPicker
          kind="VIDEO"
          onClose={() => setPicking(false)}
          onPick={(v) => { onChange(v); setPhase("idle"); }}
        />
      )}
    </div>
  );
}
