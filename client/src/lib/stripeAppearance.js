// client/src/lib/stripeAppearance.js
//
// Skins Stripe's PaymentElement iframe to match your existing dark theme
// (bg-surface dark cards, primary accent, border-edge hairlines — visible
// in your Plans.jsx classes). Stripe can't be styled with regular CSS
// since the inputs live inside a cross-origin iframe for PCI reasons —
// this `appearance` object is the official way to theme it.
//
// Pull these hex values from your actual Tailwind config (tailwind.config.js
// → theme.colors) so it's pixel-matched. Placeholders below assume a dark
// near-black surface with a violet/indigo primary, matching Plans.jsx.

export const stripeAppearance = {
    theme: "night", // base theme closest to a dark UI — we override specifics below
    variables: {
      colorPrimary: "#6962dd",        // your primary accent — matches "text-primary" usage
      colorBackground: "#13131a",     // matches your bg-surface dark card background
      colorText: "#e5e5e5",
      colorDanger: "#f87171",
      fontFamily: "Inter, system-ui, sans-serif", // swap for your actual body font
      borderRadius: "12px",           // matches your rounded-2xl card style
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid #2a2a35", // matches your border-edge token
        boxShadow: "none",
        padding: "12px",
      },
      ".Input:focus": {
        border: "1px solid #6962dd",
        boxShadow: "0 0 0 1px #6962dd",
      },
      ".Label": {
        color: "#9ca3af", // text-gray-400, matches your existing muted text
        fontSize: "13px",
      },
      ".Tab": {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid #2a2a35",
      },
      ".Tab--selected": {
        backgroundColor: "rgba(105, 98, 221, 0.1)", // primary/10, matches featured plan card
        border: "1px solid #6962dd",
      },
    },
  };
  