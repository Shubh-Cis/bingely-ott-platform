// client/src/pages/Plans.jsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { subscriptionApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth } from "../../features/auth/authSlice";
import { CheckIcon } from "../../components/Icon";

export default function Plans() {
  const { kind } = useSelector(selectAuth);
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState(null);
  const [msg, setMsg] = useState("");

  const loadMine = () => {
    if (kind === "viewer") subscriptionApi.mine().then(setMine).catch(() => {});
  };
  useEffect(() => {
    subscriptionApi.plans().then(setPlans).catch((e) => setMsg(apiError(e)));
    loadMine();
  }, [kind]);

  // ── CHANGED: route to the custom checkout page instead of redirecting ────
  // to a Stripe-hosted URL. No more `busy` state needed here either, since
  // navigation is instant — the loading state now lives on Checkout.jsx.
  const subscribe = (plan) => {
    if (kind !== "viewer") return navigate("/login", { state: { from: { pathname: "/plans" } } });
    navigate(`/checkout/${plan}`);
  };

  const active = mine && ["ACTIVE", "TRIALING"].includes(mine.status);

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-2 text-center text-4xl font-black tracking-tight sm:text-5xl">Choose your plan</h1>
      <p className="mb-10 text-center text-gray-400">Cancel anytime · Stream on all your devices · HD &amp; 4K</p>
      {msg && <p className="mx-auto mb-6 max-w-xl rounded-lg bg-primary/10 px-4 py-3 text-center text-sm text-primary">{msg}</p>}

      <div className="grid items-center gap-6 sm:grid-cols-3">
        {plans.map((p, idx) => {
          const isCurrent = active && mine.plan === p.plan;
          const featured = idx === 1;
          const feats = [
            `Up to ${p.maxStreams} screen${p.maxStreams > 1 ? "s" : ""} at once`,
            `Up to ${p.maxHeight >= 2160 ? "4K Ultra HD" : `${p.maxHeight}p`}`,
            "Ad-free streaming",
            "Download on mobile",
            "Cancel anytime",
          ];
          return (
            <div
              key={p.plan}
              className={`group relative flex flex-col overflow-hidden rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 ${
                featured
                  ? "border-primary/60 bg-gradient-to-b from-primary/15 via-surface to-surface shadow-glow sm:-my-3 sm:py-10"
                  : "border-white/10 bg-surface/80 hover:border-white/25"
              }`}
            >
              {featured && (
                <>
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg bg-gradient-to-r from-primary to-accent px-4 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/40">
                    Most popular
                  </span>
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
                </>
              )}
              <h2 className="text-lg font-bold uppercase tracking-wide text-gray-200">{p.label}</h2>
              <p className="my-3 flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tight">${(p.priceMonthly / 100).toFixed(2)}</span>
                <span className="text-sm font-medium text-gray-400">/mo</span>
              </p>
              <ul className="mb-7 mt-2 space-y-2.5 text-sm text-gray-300">
                {feats.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/20 text-primary"><CheckIcon className="h-3 w-3" /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(p.plan)}
                disabled={isCurrent}
                className={`mt-auto w-full ${featured || isCurrent ? "btn-primary" : "btn-ghost"}`}
              >
                {isCurrent ? "✓ Current plan" : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>

      {!plans.some((p) => p.configured) && (
        <p className="mt-6 text-center text-xs text-gray-500">
          Stripe isn't configured, so subscriptions activate instantly in demo mode. Add Stripe keys for real billing.
        </p>
      )}
    </div>
  );
}
