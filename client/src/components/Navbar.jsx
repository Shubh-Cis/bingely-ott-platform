import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectAuth } from "../features/auth/authSlice";
import SearchBox from "./SearchBox";

const nav = [
  ["/", "Home"],
  ["/search?type=MOVIE", "Movies"],
  ["/search?type=SERIES", "Series"],
  ["/new", "New & Popular"],
  ["/plans", "Plans"],
];

export default function Navbar() {
  const { kind, profile } = useSelector(selectAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${solid ? "border-b border-white/10 bg-ink/70 backdrop-blur-xl" : "bg-gradient-to-b from-black/80 via-black/30 to-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-black shadow-lg shadow-primary/30">B</span>
          <span className="hidden text-xl font-black tracking-tight sm:block font-display">Bingely<span className="text-primary">+</span></span>
        </Link>

        {/* Primary nav — Prime-style text links with an active underline */}
        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map(([to, label]) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `relative py-1 text-sm font-medium tracking-tight transition ${isActive ? "text-white" : "text-gray-300 hover:text-white"} after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-primary after:transition-transform ${isActive ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block"><SearchBox /></div>

          {kind === "viewer" ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} onBlur={() => setTimeout(() => setMenu(false), 150)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition hover:bg-white/10">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold">
                  {(profile?.name || "U").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-sm text-gray-200 lg:inline">{profile?.name?.split(" ")[0]}</span>
                <span className="text-xs text-gray-400">▾</span>
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-surface/95 py-1 shadow-2xl backdrop-blur-xl">
                  <Link to="/account" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5">Account</Link>
                  <Link to="/my-list" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5">My List</Link>
                  <Link to="/plans" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5">Membership</Link>
                  <button onMouseDown={() => dispatch(logout()).then(() => navigate("/"))} className="block w-full border-t border-white/10 px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-200 hover:text-white">Sign in</Link>
              <Link to="/register" className="btn-primary py-1.5 text-sm">Join Free</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
