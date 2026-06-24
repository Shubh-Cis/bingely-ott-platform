import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { catalogApi, accountApi, analyticsApi, subscriptionApi, mediaApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth } from "../../features/auth/authSlice";
import HlsPlayer from "../../components/HlsPlayer";
import SmartImage from "../../components/SmartImage";
import { PlayIcon } from "../../components/Icon";

// Premium "locked" card used by the sign-in / subscribe gates — shows the
// title's artwork behind a frosted overlay with a badge + actions.
function GateCard({ title, slug, badge, heading, text, primary }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/60">
        <SmartImage src={title.backdropUrl || title.posterUrl} alt="" label={title.title} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/85 to-ink" />
        <div className="relative px-8 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-3xl shadow-lg shadow-primary/40">{badge}</div>
          <h2 className="mt-5 text-2xl font-black tracking-tight">{heading}</h2>
          <p className="mx-auto mt-2 max-w-sm text-gray-300/90">{text}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {primary}
            {title.trailerUrl && <Link to={`/watch/${slug}?kind=trailer`} className="btn-ghost"><PlayIcon className="h-4 w-4" /> Watch trailer</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

function sessionId() {
  let s = localStorage.getItem("bingely.sid");
  if (!s) { s = crypto.randomUUID(); localStorage.setItem("bingely.sid", s); }
  return s;
}

// Resolve a stored video reference into a playable URL. Uploaded videos are
// stored as "media:<videoId>" and resolved to a fresh HLS URL at watch time.
async function resolveSrc(ref) {
  if (!ref) return "";
  if (ref.startsWith("media:")) {
    const { url } = await mediaApi.playUrl(ref.slice("media:".length));
    return url;
  }
  return ref;
}

export default function Watch() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const epId = params.get("ep");
  const isTrailer = params.get("kind") === "trailer";
  const { kind: authKind } = useSelector(selectAuth);

  const [title, setTitle] = useState(null);
  const [src, setSrc] = useState("");
  const [gate, setGate] = useState(null); // null = allowed; otherwise "login" | "subscribe"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [startAt, setStartAt] = useState(0);
  const [resumeAsk, setResumeAsk] = useState(null); // saved seconds → show "Resume vs Start over"
  const startedRef = useRef(false);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  useEffect(() => {
    catalogApi.title(slug).then(setTitle).catch((e) => setError(apiError(e)));
  }, [slug]);

  const { ref, episode } = useMemo(() => {
    if (!title) return {};
    if (isTrailer) return { ref: title.trailerUrl };
    if (epId) {
      const ep = title.seasons?.flatMap((s) => s.episodes).find((e) => e.id === epId);
      return { ref: ep?.videoUrl, episode: ep };
    }
    return { ref: title.videoUrl };
  }, [title, epId, isTrailer]);

  // Access control + source resolution.
  useEffect(() => {
    if (!title) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setGate(null);
      // Trailers are free for everyone. Movies/episodes require login + active sub.
      if (!isTrailer) {
        if (authKind !== "viewer") {
          if (!cancelled) { setGate("login"); setLoading(false); }
          return;
        }
        try {
          const sub = await subscriptionApi.mine();
          const active = sub && ["ACTIVE", "TRIALING"].includes(sub.status);
          if (!active) { if (!cancelled) { setGate("subscribe"); setLoading(false); } return; }
        } catch {
          if (!cancelled) { setGate("subscribe"); setLoading(false); }
          return;
        }
      }
      try {
        const url = await resolveSrc(ref);
        // Resume point: ask the viewer if they want to continue where they left off.
        let resume = null;
        if (authKind === "viewer" && !isTrailer) {
          const p = await accountApi.getProgress({ titleId: title.id, episodeId: epId || undefined }).catch(() => null);
          if (p && p.positionSec > 10 && !p.completed) resume = Math.floor(p.positionSec);
        }
        if (!cancelled) { setSrc(url); setResumeAsk(resume); setStartAt(0); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(apiError(e)); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [title, ref, isTrailer, authKind]);

  useEffect(() => {
    if (title && src && !startedRef.current) {
      startedRef.current = true;
      analyticsApi.event({ titleId: title.id, episodeId: epId || null, type: "START", kind: isTrailer ? "trailer" : epId ? "episode" : "movie", sessionId: sessionId() }).catch(() => {});
    }
  }, [title, src, epId, isTrailer]);

  const onProgress = (position, duration) => {
    analyticsApi.event({ titleId: title.id, episodeId: epId || null, type: "PROGRESS", sessionId: sessionId(), seconds: 10, position }).catch(() => {});
    if (authKind === "viewer" && !isTrailer) {
      accountApi.saveProgress({ titleId: title.id, episodeId: epId || null, kind: epId ? "EPISODE" : "MOVIE", positionSec: position, durationSec: duration }).catch(() => {});
    }
  };

  if (error) return <p className="rounded-lg bg-red-500/10 p-4 text-red-400">{error}</p>;
  if (!title || loading) return <div className="skeleton h-[60vh] w-full rounded-xl" />;

  const back = (
    <Link to={`/title/${slug}`} className="mb-3 inline-block text-sm text-gray-400 hover:text-white">
      ← {title.title}{episode ? ` · ${episode.title}` : isTrailer ? " · Trailer" : ""}
    </Link>
  );

  // Gated states
  if (gate === "login") {
    return (
      <GateCard
        title={title} slug={slug} badge="👤"
        heading="Sign in to watch"
        text="Create a free account or sign in to start streaming. Trailers are free to watch without an account."
        primary={<Link to="/login" state={{ from: { pathname: `/watch/${slug}` } }} className="btn-primary">Sign in</Link>}
      />
    );
  }
  if (gate === "subscribe") {
    return (
      <GateCard
        title={title} slug={slug} badge="✦"
        heading="Subscribe to watch"
        text="This title is available to subscribers. Pick a plan to start streaming in HD & 4K — trailers stay free."
        primary={<Link to="/plans" className="btn-primary">See plans</Link>}
      />
    );
  }

  if (!src) {
    return (
      <div className="text-gray-300">
        {back}
        <p className="mt-4">This {isTrailer ? "trailer" : "title"} isn’t available to stream yet.</p>
      </div>
    );
  }

  // Resume vs Start over prompt
  if (resumeAsk != null) {
    return (
      <div>
        {back}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl">
          <img src={title.backdropUrl || title.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" onError={(e) => (e.currentTarget.style.display = "none")} />
          <div className="absolute inset-0 bg-ink/70" />
          <div className="relative text-center">
            <h2 className="text-2xl font-black">Resume watching?</h2>
            <p className="mt-2 text-gray-300">You left off at <span className="font-bold text-white">{fmt(resumeAsk)}</span></p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => { setStartAt(resumeAsk); setResumeAsk(null); }} className="btn-light px-7 text-base">▶ Resume from {fmt(resumeAsk)}</button>
              <button onClick={() => { setStartAt(0); setResumeAsk(null); }} className="btn-ghost px-7 text-base">↺ Start over</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {back}
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <HlsPlayer src={src} poster={title.backdropUrl || title.posterUrl} startAt={startAt} onProgress={onProgress} />
      </div>
    </div>
  );
}
