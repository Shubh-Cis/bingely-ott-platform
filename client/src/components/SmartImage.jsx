import { useState } from "react";

// Deterministic hue from a string so each title gets its own consistent colour.
function hueFor(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

// An <img> that gracefully degrades. If the source is missing or fails to load
// (e.g. the legacy localhost:4000 host is offline), it renders a branded
// gradient tile with the title — so it looks intentional, never broken.
export default function SmartImage({ src, alt = "", className = "", label = "" }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    const text = label || alt || "";
    const hue = hueFor(text || "bingely");
    const bg = `linear-gradient(135deg, hsl(${hue} 55% 28%), hsl(${(hue + 45) % 360} 60% 14%))`;
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: bg }}>
        {/* soft sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0" />
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <span className="relative px-3 text-center text-base font-extrabold leading-tight tracking-tight text-white/90 line-clamp-3 drop-shadow">
          {text || "Bingely+"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
