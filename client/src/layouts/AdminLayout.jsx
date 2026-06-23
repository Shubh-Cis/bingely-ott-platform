import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, selectAuth } from "../features/auth/authSlice";

const links = [
  ["/admin", "Dashboard", "📊", true],
  ["/admin/titles", "Titles", "🎬"],
  ["/admin/rails", "Rails", "🎞️"],
  ["/admin/heroes", "Banners", "🖼️"],
  ["/admin/categories", "Categories", "🏷️"],
  ["/admin/languages", "Languages", "🌐"],
  ["/admin/media", "Media", "📤"],
  ["/admin/users", "Users", "👥"],
];

export default function AdminLayout() {
  const { profile } = useSelector(selectAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-ink text-gray-100">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-surface/60 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-black shadow-lg shadow-primary/30">B</span>
          <div>
            <div className="text-lg font-black tracking-tight font-display">Bingely<span className="text-primary">+</span></div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500">Admin Console</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {links.map(([to, label, icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-primary/15 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r bg-primary" style={{ width: 3 }} />}
                  <span className="text-base">{icon}</span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-edge p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold">
              {(profile?.name || "A").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{profile?.name}</div>
              <div className="truncate text-xs text-gray-500">{profile?.role}</div>
            </div>
          </div>
          <button
            className="btn-ghost mt-2 w-full py-2 text-sm"
            onClick={() => dispatch(logout()).then(() => navigate("/admin/login"))}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ink/60 px-8 py-4 backdrop-blur-xl">
          <div className="text-sm text-gray-400">Manage your platform — content, media, users &amp; analytics</div>
          <a href="/" target="_blank" rel="noreferrer" className="btn-ghost py-1.5 text-sm">View site ↗</a>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
