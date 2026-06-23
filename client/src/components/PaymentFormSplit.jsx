// client/src/components/PaymentFormSplit.jsx
//
// ⚠️ READ THIS FIRST: every <div> below that has an `id` and a Stripe
// "Element" component mounted into it IS an iframe, even though it's
// styled to look exactly like a plain text input with a label above it.
// You cannot replace these with real <input> tags and still send the value
// to your own server — doing so moves you out of PCI SAQ-A (simple) into
// SAQ A-EP / SAQ-D (a full annual security audit with network scans).
//
// This file exists to give you the LAYOUT freedom you're asking for —
// separate boxes for card number / expiry / CVC, your own labels, your own
// grid — while every actual keystroke still goes straight into Stripe's
// iframe, never into your React state, never into a fetch() call.

import { useState } from "react";
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";

// Each `style` object below targets ONE specific Stripe iframe. This is the
// older (but still fully supported) styling API — same visual result as
// the `appearance` object used with PaymentElement, just per-field instead
// of global. Pull these values from your Tailwind config to pixel-match.
const elementStyle = {
  base: {
    fontSize: "15px",
    color: "#e5e5e5",
    fontFamily: "Inter, system-ui, sans-serif",
    "::placeholder": { color: "#6b7280" },
  },
  invalid: { color: "#f87171" },
};

// A reusable wrapper so each field gets the same label + box treatment —
// this is plain HTML/CSS you fully control, wrapped around the one Stripe
// iframe sitting inside it.
function FieldShell({ label, children, error }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">{label}</label>
      <div
        className={`rounded-xl border bg-ink/40 px-4 py-3 transition ${
          error ? "border-red-500" : "border-edge focus-within:border-primary"
        }`}
      >
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function PaymentFormSplit({ plan, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  // Each Stripe Element fires its own onChange with field-specific errors —
  // e.g. CardNumberElement tells you "card number is invalid" without you
  // ever seeing the actual digits.
  const handleFieldChange = (field) => (event) => {
    setFieldErrors((prev) => ({ ...prev, [field]: event.error?.message || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setFormError("");

    // You only ever pass the CardNumberElement INSTANCE to Stripe's SDK —
    // never a value, never a string, never anything that touches your code.
    const cardNumberElement = elements.getElement(CardNumberElement);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardNumberElement,
      billing_details: { name: plan.billingName },
    });

    if (error) {
      setFormError(error.message);
      setSubmitting(false);
      onError?.(error.message);
      return;
    }

    // paymentMethod.id is just an opaque token like "pm_1Nx..." — completely
    // safe to send to your server, contains no card data whatsoever.
    onSuccess(paymentMethod.id);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldShell label="Card number" error={fieldErrors.number}>
        <CardNumberElement
          options={{ style: elementStyle, placeholder: "1234 1234 1234 1234" }}
          onChange={handleFieldChange("number")}
        />
      </FieldShell>

      <div className="grid grid-cols-2 gap-4">
        <FieldShell label="Expiry date" error={fieldErrors.expiry}>
          <CardExpiryElement
            options={{ style: elementStyle, placeholder: "MM / YY" }}
            onChange={handleFieldChange("expiry")}
          />
        </FieldShell>

        <FieldShell label="CVC" error={fieldErrors.cvc}>
          <CardCvcElement
            options={{ style: elementStyle, placeholder: "CVC" }}
            onChange={handleFieldChange("cvc")}
          />
        </FieldShell>
      </div>

      {formError && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</p>
      )}

      <button type="submit" disabled={!stripe || submitting} className="btn-primary w-full">
        {submitting ? "Confirming…" : `Subscribe — $${(plan.priceMonthly / 100).toFixed(2)}/mo`}
      </button>

      <p className="text-center text-xs text-gray-500">
        Payments are processed securely by Stripe. We never see or store your card details.
      </p>
    </form>
  );
}
