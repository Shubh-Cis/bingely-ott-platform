import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { analyticsApi } from "../../services/api";
import { apiError } from "../../lib/axios";

const RANGES = [[7, "7 days"], [14, "14 days"], [30, "30 days"], [90, "90 days"]];

function Stat({ label, value, accent }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [watch, setWatch] = useState([]);
  const [mostWatched, setMostWatched] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    analyticsApi.dashboard(days).then(setD).catch((e) => setError(apiError(e)));
    analyticsApi.userGrowth(days).then((rows) => setGrowth(rows.map((r) => ({ day: String(r.day).slice(5, 10), signups: r.signups })))).catch(() => {});
    analyticsApi.watchTime(days).then((rows) => setWatch(rows.map((r) => ({ day: String(r.day).slice(5, 10), hours: Math.round(r.seconds / 360) / 10 })))).catch(() => {});
    analyticsApi.mostWatched().then(setMostWatched).catch(() => {});
  }, [days]);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!d) return <p className="text-gray-400">Loading…</p>;

  const chart = (data, key, color, label) => (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262633" />
        <XAxis dataKey="day" stroke="#888" fontSize={12} />
        <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#15151f", border: "1px solid #2c2c3c", borderRadius: 12 }} />
        <Line type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1.5">
          {RANGES.map(([v, label]) => (
            <button key={v} onClick={() => setDays(v)} className={`chip ${days === v ? "bg-primary text-white" : "bg-elevated text-gray-300 hover:bg-edge"}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Today */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Today</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Active customers" value={d.today.activeCustomers} accent />
          <Stat label="New signups" value={d.today.newViewers} />
          <Stat label="Views" value={d.today.views} />
          <Stat label="Watch hours" value={d.today.watchHours} />
        </div>
      </div>

      {/* Last N days + overall */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">Last {days} days · Overall</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={`New viewers (${days}d)`} value={d.window.newViewers} />
          <Stat label={`Views (${days}d)`} value={d.window.views} />
          <Stat label={`Revenue (${days}d)`} value={`$${(d.window.revenueCents / 100).toFixed(2)}`} />
          <Stat label="Active subscriptions" value={d.activeSubscriptions} />
          <Stat label="Total viewers" value={d.totalViewers} />
          <Stat label="Total views" value={d.totalViews} />
          <Stat label="Titles" value={d.titles.total} />
          <Stat label="Episodes" value={d.totalEpisodes} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card"><h2 className="mb-3 font-semibold">New Viewers</h2>{chart(growth, "signups", "#8b5cf6", "Signups")}</div>
        <div className="card"><h2 className="mb-3 font-semibold">Watch Hours</h2>{chart(watch, "hours", "#22c55e", "Hours")}</div>
      </div>

      {/* Most watched leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">🔥 Most Watched</h2>
          {mostWatched.length === 0 ? <p className="text-sm text-gray-500">No views yet.</p> : (
            <ol className="space-y-2">
              {mostWatched.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-white/5">
                  <span className={`w-6 text-center text-lg font-black ${i === 0 ? "text-primary" : "text-gray-600"}`}>{i + 1}</span>
                  <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-elevated">
                    {m.posterUrl && <img src={m.posterUrl} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.type}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-gray-200">{m.views} <span className="text-xs font-normal text-gray-500">views</span></span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Views by Title</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mostWatched.map((m) => ({ name: m.title, views: m.views }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262633" />
              <XAxis dataKey="name" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#15151f", border: "1px solid #2c2c3c", borderRadius: 12 }} />
              <Bar dataKey="views" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Recent Activity</h2>
        <ul className="space-y-1 text-sm text-gray-300">
          {d.recentActivity.map((a) => (
            <li key={a.id} className="flex justify-between border-b border-edge/50 py-1.5">
              <span><span className="text-primary">{a.action}</span> {a.entity} {a.entityId && <span className="text-gray-500">#{a.entityId.slice(0, 6)}</span>}</span>
              <span className="text-gray-500">{a.user?.name || "system"} · {new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {d.recentActivity.length === 0 && <li className="text-gray-500">No activity yet.</li>}
        </ul>
      </div>
    </div>
  );
}
