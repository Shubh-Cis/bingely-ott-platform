// client/src/pages/Checkout.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { subscriptionApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import PaymentFormSplit from "../../components/PaymentFormSplit";

// loadStripe() is called ONCE at module scope, outside the component — Stripe
// docs are explicit about this. Calling it inside the component would
// re-fetch Stripe.js on every render and break Elements' internal state.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout() {
  const { plan: planKey } = useParams();
  const navigate = useNavigate();

  const [planInfo, setPlanInfo] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ready | demo | success

  useEffect(() => {
    let cancelled = false;

    // We still call /checkout here — not to get a clientSecret for mounting
    // (CardNumberElement/CardExpiryElement/CardCvcElement don't need one),
    // but because /checkout is what finds-or-creates the Stripe Customer
    // for this user. /confirm needs that customerId to exist already.
    subscriptionApi
      .checkout(planKey)
      .then((res) => {
        if (cancelled) return;

        if (res.mode === "demo") {
          setStatus("demo");
          return;
        }

        setPlanInfo({ priceId: res.priceId, plan: res.plan, priceMonthly: res.priceMonthly ?? 999 });
        setStatus("ready");
      })
      .catch((e) => {
        if (!cancelled) setError(apiError(e));
      });

    return () => {
      cancelled = true;
    };
  }, [planKey]);

  const handlePaymentSuccess = async (paymentMethodId) => {
    try {
      await subscriptionApi.confirm(planKey, paymentMethodId);
      setStatus("success");
      setTimeout(() => navigate("/account"), 1500);
    } catch (e) {
      setError(apiError(e));
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        <button onClick={() => navigate("/plans")} className="btn-ghost mt-4">
          Back to plans
        </button>
      </div>
    );
  }

  if (status === "demo") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-lg font-bold">✓ You're now subscribed to {planKey}</p>
        <p className="mt-2 text-sm text-gray-400">
          Stripe isn't configured, so this activated instantly in demo mode.
        </p>
        <button onClick={() => navigate("/account")} className="btn-primary mt-6">
          Go to account
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-lg font-bold text-primary">✓ Subscription active</p>
        <p className="mt-2 text-sm text-gray-400">Redirecting to your account…</p>
      </div>
    );
  }

  if (status === "loading" || !planInfo) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-gray-400">
        Setting up secure checkout…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-2 text-center text-3xl font-black">
        Subscribe to {planKey}
      </h1>
      <p className="mb-8 text-center text-sm text-gray-400">
        Enter your card details to start streaming.
      </p>

      <div className="rounded-2xl border border-edge bg-surface p-6">
        {/* No clientSecret needed here — CardNumberElement/CardExpiryElement/
            CardCvcElement tokenize the card directly via
            stripe.createPaymentMethod(), unlike PaymentElement which needs
            a SetupIntent's clientSecret up front. Only the publishable key
            (already baked into stripePromise) is required to mount. */}
        <Elements stripe={stripePromise}>
          <PaymentFormSplit plan={planInfo} onSuccess={handlePaymentSuccess} onError={setError} />
        </Elements>
      </div>
    </div>
  );
}
