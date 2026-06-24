import { Outlet, Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

const footerCols = [
  ["Browse", [["/", "Home"], ["/new", "New & Popular"], ["/search?type=MOVIE", "Movies"], ["/search?type=SERIES", "Series"]]],
  ["Account", [["/plans", "Plans & Pricing"], ["/account", "My Account"], ["/my-list", "My List"]]],
  ["Company", [["/contact", "Contact Us"], ["/about", "About"], ["/careers", "Careers"]]],
  ["Legal", [["/terms", "Terms of Use"], ["/privacy", "Privacy"], ["/help", "Help Center"]]],
];

const Social = ({ label, d, viewBox = "0 0 24 24" }) => (
  <a href="#" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/15 hover:text-white">
    <svg viewBox={viewBox} className="h-4 w-4" fill="currentColor"><path d={d} /></svg>
  </a>
);

export default function CustomerLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-ink">
      <Navbar />
      {/* pt-20 clears the fixed navbar; full-bleed sections (Hero) cancel it with -mt-20 */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-20 sm:px-6">
        {/* keyed by route → a subtle fade-in on every page navigation */}
        <div key={location.pathname} className="animate-fadeIn">
          <Outlet />
        </div>
      </main>

      <footer className="relative mt-10 border-t border-white/10 bg-gradient-to-b from-surface/40 to-ink">
        {/* thin gradient accent line at the very top of the footer */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="mx-auto max-w-[1400px] px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
            {/* Brand */}
            <div>
              <div className="text-2xl font-black tracking-tight text-white">BINGELY<span className="gradient-text">+</span></div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-400">Premium streaming, reimagined. Thousands of movies & series across every language — anytime, on any device.</p>
              <div className="mt-5 flex gap-2.5">
                <Social label="X" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                <Social label="Instagram" d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5.01-4.74.07-.9.04-1.38.19-1.7.32-.43.16-.74.36-1.06.68-.32.32-.52.63-.68 1.06-.13.32-.28.8-.32 1.7C3.21 8.5 3.2 8.85 3.2 12s.01 3.5.07 4.74c.04.9.19 1.38.32 1.7.16.43.36.74.68 1.06.32.32.63.52 1.06.68.32.13.8.28 1.7.32 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.38-.19 1.7-.32.43-.16.74-.36 1.06-.68.32-.32.52-.63.68-1.06.13-.32.28-.8.32-1.7.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.04-.9-.19-1.38-.32-1.7a2.85 2.85 0 0 0-.68-1.06 2.85 2.85 0 0 0-1.06-.68c-.32-.13-.8-.28-1.7-.32C15.5 4.01 15.15 4 12 4Zm0 3.06A4.94 4.94 0 1 1 12 16.94 4.94 4.94 0 0 1 12 7.06Zm0 8.15A3.21 3.21 0 1 0 12 8.79a3.21 3.21 0 0 0 0 6.42Zm6.3-8.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0Z" />
                <Social label="YouTube" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
                <Social label="Facebook" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.96h-1.52c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z" />
              </div>
            </div>

            {/* Link columns */}
            {footerCols.map(([heading, links]) => (
              <div key={heading}>
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-300">{heading}</h4>
                <ul className="space-y-2.5">
                  {links.map(([to, label]) => (
                    <li key={label}>
                      <Link to={to} className="text-sm text-gray-400 transition hover:text-primary">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row">
            <p>© {new Date().getFullYear()} Bingely+ — All rights reserved.</p>
            <p className="flex items-center gap-1.5">Made for binge-watchers <span className="text-primary">●</span> Streaming in HD &amp; 4K</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
