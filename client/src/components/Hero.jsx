import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SmartImage from "./SmartImage";
import HlsPlayer from "./HlsPlayer";
import { mediaApi } from "../services/api";
import { PlayIcon, PauseIcon, InfoIcon, VolumeOnIcon, VolumeOffIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icon";

async function resolveSrc(ref) {
  if (!ref) return "";
  if (ref.startsWith("media:")) {
    const { url } = await mediaApi.playUrl(ref.slice("media:".length));
    return url;
  }
  return ref;
}

const Arrow = ({ dir, onClick }) => (
  <button onClick={onClick} aria-label={dir < 0 ? "Previous" : "Next"} className="icon-btn h-12 w-12">
    {dir < 0 ? <ChevronLeftIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
  </button>
);

// Cinematic billboard. Image first; "Play" plays the trailer in the background
// while the title text stays overlaid. Prev/next arrows cycle banners.
export default function Hero({ heroes }) {
  const list = Array.isArray(heroes) ? heroes : heroes ? [heroes] : [];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState("");
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const go = (d) => setI((p) => (p + d + list.length) % list.length);

  useEffect(() => {
    if (list.length <= 1 || playing) return;
    timer.current = setInterval(() => setI((p) => (p + 1) % list.length), 8000);
    return () => clearInterval(timer.current);
  }, [list.length, playing]);

  useEffect(() => { setPlaying(false); setSrc(""); }, [i]);

  if (!list.length) return null;
  const hero = list[i];
  const multi = list.length > 1;

  const play = async () => {
    if (playing) return setPaused((p) => !p);
    const url = await resolveSrc(hero.videoUrl);
    if (url) { setSrc(url); setMuted(true); setPaused(false); setPlaying(true); }
  };

  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-20 mb-12 w-screen">
      <div className="relative h-[76vh] min-h-[500px] w-full overflow-hidden bg-black">
        {playing && src ? (
          <div className="absolute inset-0">
            <HlsPlayer src={src} poster={hero.imageUrl} autoPlay loop muted={muted} paused={paused} controls={false} className="h-full w-full bg-black object-cover" />
          </div>
        ) : (
          // Always fill the full width/height of the banner (object-cover).
          // Top/bottom may be cropped for tall images — upload wide (16:9)
          // artwork for the least cropping.
          <SmartImage key={hero.id} src={hero.imageUrl} alt={hero.title} label={hero.title} className="absolute inset-0 h-full w-full animate-kenburns object-cover object-center" />
        )}

        {/* Cinematic dark shade — solid on the LEFT where the text sits, fading
            smoothly to a clear image on the right (no blurry "spot"). */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink from-[2%] via-ink/75 via-40% to-transparent to-[72%]" />
        {/* Top + bottom vignette so the image melts into the page */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/30" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto flex w-full max-w-[1400px] px-4 sm:px-10">
            <div key={`c-${hero.id}`} className="max-w-2xl animate-riseIn">
              {hero.badge && (
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {hero.badge}
                </span>
              )}
              <h1 className="font-display text-5xl font-black leading-[0.98] tracking-tight drop-shadow-2xl sm:text-7xl">{hero.title}</h1>
              <p className="mt-5 max-w-xl text-base text-gray-200/90 drop-shadow sm:text-lg">{hero.tagline}</p>
              {hero.meta?.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm text-gray-300">
                  {hero.meta.map((m, k) => <span key={k} className="pill">{m}</span>)}
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {hero.videoUrl && (
                  <button onClick={play} className="btn-light px-8 text-base">
                    {!playing || paused ? <PlayIcon className="h-5 w-5" /> : <PauseIcon className="h-5 w-5" />}
                    {!playing || paused ? "Play" : "Pause"}
                  </button>
                )}
                {playing && (
                  <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="icon-btn h-12 w-12">
                    {muted ? <VolumeOffIcon className="h-5 w-5" /> : <VolumeOnIcon className="h-5 w-5" />}
                  </button>
                )}
                {hero.ctaUrl && <Link to={hero.ctaUrl} className="btn-ghost px-7 text-base"><InfoIcon className="h-5 w-5" /> {hero.ctaLabel || "More Info"}</Link>}
              </div>
            </div>
          </div>
        </div>

        {/* Prev / next arrows — always visible when multiple banners */}
        {multi && (
          <>
            <div className="absolute left-4 top-1/2 z-20 -translate-y-1/2 sm:left-8"><Arrow dir={-1} onClick={() => go(-1)} /></div>
            <div className="absolute right-4 top-1/2 z-20 -translate-y-1/2 sm:right-8"><Arrow dir={1} onClick={() => go(1)} /></div>
            <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {list.map((_, k) => (
                <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-primary" : "w-2.5 bg-white/40 hover:bg-white/70"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
