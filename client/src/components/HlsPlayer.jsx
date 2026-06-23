import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

// Adaptive HLS player. Uses hls.js where MSE is available, falls back to native
// HLS (Safari). Shows a quality selector (Auto / 1080p / 720p / 480p / 360p)
// built from the stream's variant levels. Configurable for full playback
// (controls + sound + quality menu) or inline banner trailers (muted, no chrome).
export default function HlsPlayer({
  src,
  poster,
  onProgress,
  startAt = 0,
  autoPlay = true,
  muted = false,
  controls = true,
  loop = false,
  paused = null, // when set (true/false), imperatively pause/play (for the banner)
  className = "h-full w-full bg-black object-contain",
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [levels, setLevels] = useState([]); // [{ index, height }]
  const [current, setCurrent] = useState(-1); // -1 = Auto

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let hls;
    video.muted = muted; // must be set before play() for muted autoplay to be allowed
    setLevels([]);
    setCurrent(-1);

    if (src.endsWith(".m3u8") && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        // Expose the variant rungs (dedupe + sort high→low) for the quality menu.
        const ls = data.levels
          .map((l, index) => ({ index, height: l.height || Math.round((l.bitrate || 0) / 1000) }))
          .sort((a, b) => b.height - a.height);
        setLevels(ls);
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setCurrent(hls.autoLevelEnabled ? -1 : data.level));
    } else {
      video.src = src; // native HLS (Safari) / progressive mp4
    }

    const onLoaded = () => {
      if (startAt > 0) video.currentTime = startAt;
      if (autoPlay) video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", onLoaded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [src, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Controlled pause/play (used by the banner's "Pause trailer" button).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || paused === null) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;
    const id = setInterval(() => {
      if (!video.paused && video.duration) onProgress(Math.floor(video.currentTime), Math.floor(video.duration));
    }, 10000);
    return () => clearInterval(id);
  }, [onProgress]);

  const pick = (index) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index; // -1 = auto/ABR
    setCurrent(index);
  };

  return (
    <div className="relative h-full w-full">
      <video ref={videoRef} poster={poster} controls={controls} loop={loop} playsInline muted={muted} className={className} />

      {controls && levels.length > 1 && (
        <div className="group/q absolute right-3 top-3 z-10">
          <button className="rounded-md bg-black/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-black/90">
            ⚙ {current === -1 ? "Auto" : `${levels.find((l) => l.index === current)?.height}p`}
          </button>
          <div className="invisible absolute right-0 mt-1 w-28 overflow-hidden rounded-md border border-edge bg-ink/95 opacity-0 shadow-xl backdrop-blur transition group-hover/q:visible group-hover/q:opacity-100">
            <button onClick={() => pick(-1)} className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-primary ${current === -1 ? "text-primary" : "text-gray-200"}`}>
              Auto
            </button>
            {levels.map((l) => (
              <button
                key={l.index}
                onClick={() => pick(l.index)}
                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-primary ${current === l.index ? "text-primary" : "text-gray-200"}`}
              >
                {l.height}p
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
