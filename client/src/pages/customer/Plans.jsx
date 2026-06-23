// client/src/pages/Plans.jsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { subscriptionApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth } from "../../features/auth/authSlice";

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
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-center text-4xl font-black">Choose your plan</h1>
      <p className="mb-8 text-center text-gray-400">Cancel anytime. Stream on all your devices.</p>
      {msg && <p className="mx-auto mb-6 max-w-xl rounded-lg bg-primary/10 px-4 py-3 text-center text-sm text-primary">{msg}</p>}

      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map((p, idx) => {
          const isCurrent = active && mine.plan === p.plan;
          const featured = idx === 1;
          return (
            <div
              key={p.plan}
              className={`relative flex flex-col rounded-2xl border p-6 transition ${
                featured ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-glow" : "border-edge bg-surface"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold">{p.label}</h2>
              <p className="my-3 text-4xl font-black">
                ${(p.priceMonthly / 100).toFixed(2)}
                <span className="text-base font-normal text-gray-400">/mo</span>
              </p>
              <ul className="mb-6 space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Up to {p.maxStreams} screen{p.maxStreams > 1 ? "s" : ""} at once</li>
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Up to {p.maxHeight >= 2160 ? "4K Ultra HD" : `${p.maxHeight}p`}</li>
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Ad-free, cancel anytime</li>
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Download on mobile</li>
              </ul>
              <button
                onClick={() => subscribe(p.plan)}
                disabled={isCurrent}
                className={`mt-auto ${featured ? "btn-primary" : "btn-ghost"}`}
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
