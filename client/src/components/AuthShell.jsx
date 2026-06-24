import { Link } from "react-router-dom";

// Premium, centered auth screen used by Sign in / Register — brand badge,
// ambient glow, and a crisp card. Keeps the auth pages consistent & sharp.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative mx-auto flex min-h-[72vh] max-w-md items-center py-10">
      {/* ambient brand glow behind the card */}
      <div className="pointer-events-none absolute left-1/2 top-6 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative w-full animate-riseIn">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-black shadow-lg shadow-primary/40">B</Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-gray-400">{subtitle}</p>}
        </div>
        <div className="card border-white/10 shadow-2xl shadow-black/50">{children}</div>
        {footer && <p className="mt-5 text-center text-sm text-gray-400">{footer}</p>}
      </div>
    </div>
  );
}
