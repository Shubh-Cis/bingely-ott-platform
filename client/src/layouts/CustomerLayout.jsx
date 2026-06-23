import { Outlet, Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const footerLinks = [
  ["/", "Home"],
  ["/new", "New & Popular"],
  ["/search?type=MOVIE", "Movies"],
  ["/search?type=SERIES", "Series"],
  ["/plans", "Plans"],
  ["/contact", "Contact"],
];

export default function CustomerLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink">
      <Navbar />
      {/* pt-20 clears the fixed navbar; full-bleed sections (Hero) cancel it with -mt-20 */}
      <main className="mx-auto max-w-[1400px] px-4 pb-20 pt-20 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-edge/60 py-10">
        <div className="mx-auto max-w-7xl px-4 text-sm text-gray-500">
          <div className="text-xl font-black text-gray-300">BINGELY<span className="text-primary">+</span></div>
          <p className="mt-2">Premium Streaming, Reimagined.</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map(([to, label]) => (
              <Link key={label} to={to} className="text-gray-400 transition hover:text-white">{label}</Link>
            ))}
          </div>
          <p className="mt-5 text-xs text-gray-600">© {new Date().getFullYear()} Bingely+ — All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
