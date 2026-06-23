import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { accountApi, subscriptionApi } from "../../services/api";
import { apiError } from "../../lib/axios";
import { selectAuth, loadMe } from "../../features/auth/authSlice";

const TABS = [
  ["profile", "Profile", "👤"],
  ["security", "Security", "🔒"],
  ["membership", "Membership", "💳"],
];

function Banner({ msg }) {
  if (!msg) return null;
  const ok = msg.type === "ok";
  return (
    <p className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {msg.text}
    </p>
  );
}

export default function Account() {
  const { profile } = useSelector(selectAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");

  const [sub, setSub] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    subscriptionApi.mine().then(setSub).catch(() => {});
    subscriptionApi.payments().then(setPayments).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-black">
          {(profile?.name || "U").slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-black">{profile?.name}</h1>
          <p className="text-sm text-gray-400">{profile?.email}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${sub && ["ACTIVE", "TRIALING"].includes(sub.status) ? "bg-primary/20 text-primary" : "bg-edge text-gray-400"}`}>
          {sub?.plan ? `${sub.plan} · ${sub.status}` : "No plan"}
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-edge">
        {TABS.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === id ? "border-primary text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab profile={profile} onSaved={() => dispatch(loadMe())} />}
      {tab === "security" && <SecurityTab />}
      {tab === "membership" && <MembershipTab sub={sub} setSub={setSub} payments={payments} navigate={navigate} />}
    </div>
  );
}

function ProfileTab({ profile, onSaved }) {
  const [name, setName] = useState(profile?.name || "");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await accountApi.updateProfile({ name });
      onSaved?.();
      setMsg({ type: "ok", text: "Profile updated." });
    } catch (e) {
      setMsg({ type: "err", text: apiError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-bold">Profile details</h2>
      <Banner msg={msg} />
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Display name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input opacity-60" value={profile?.email || ""} disabled />
          <p className="mt-1 text-xs text-gray-500">Email can’t be changed.</p>
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </div>
  );
}

function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (form.newPassword !== form.confirm) return setMsg({ type: "err", text: "New passwords don’t match." });
    if (form.newPassword.length < 8) return setMsg({ type: "err", text: "New password must be at least 8 characters." });
    setBusy(true);
    try {
      await accountApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setMsg({ type: "ok", text: "Password changed." });
    } catch (e) {
      setMsg({ type: "err", text: apiError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-bold">Change password</h2>
      <Banner msg={msg} />
      <form onSubmit={save} className="max-w-md space-y-4">
        <div><label className="label">Current password</label><input type="password" className="input" value={form.currentPassword} onChange={set("currentPassword")} required /></div>
        <div><label className="label">New password</label><input type="password" className="input" value={form.newPassword} onChange={set("newPassword")} required /></div>
        <div><label className="label">Confirm new password</label><input type="password" className="input" value={form.confirm} onChange={set("confirm")} required /></div>
        <button className="btn-primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  );
}

function MembershipTab({ sub, setSub, payments, navigate }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const active = sub && ["ACTIVE", "TRIALING"].includes(sub.status);
  const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

  const cancel = async () => {
    if (!confirm("Cancel your membership at the end of the billing period?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await subscriptionApi.cancel();
      setSub(updated);
      setMsg({ type: "ok", text: "Your membership will cancel at the end of the period." });
    } catch (e) {
      setMsg({ type: "err", text: apiError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-4 text-lg font-bold">Membership &amp; billing</h2>
        <Banner msg={msg} />

        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <div><p className="text-xs text-gray-500">Plan</p><p className="text-lg font-bold">{sub.plan}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p className="font-semibold text-green-400">{sub.status}</p></div>
              <div><p className="text-xs text-gray-500">Quality</p><p className="font-semibold">{sub.maxHeight >= 2160 ? "4K Ultra HD" : `${sub.maxHeight}p`}</p></div>
              <div><p className="text-xs text-gray-500">Screens</p><p className="font-semibold">{sub.maxStreams}</p></div>
              <div><p className="text-xs text-gray-500">{sub.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}</p><p className="font-semibold">{fmt(sub.currentPeriodEnd)}</p></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => navigate("/plans")} className="btn-primary">Change / Upgrade plan</button>
              {!sub.cancelAtPeriodEnd && <button onClick={cancel} disabled={busy} className="btn-ghost">Cancel membership</button>}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-gray-400">You don’t have an active plan. Subscribe to start streaming full titles.</p>
            <button onClick={() => navigate("/plans")} className="btn-primary">Choose a plan</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-bold">Payment history</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500"><tr><th className="pb-2">Date</th><th className="pb-2">Description</th><th className="pb-2 text-right">Amount</th><th className="pb-2 text-right">Status</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-edge/60">
                  <td className="py-2 text-gray-400">{fmt(p.createdAt)}</td>
                  <td className="py-2">{p.description || "Subscription"}</td>
                  <td className="py-2 text-right">${(p.amountCents / 100).toFixed(2)}</td>
                  <td className="py-2 text-right"><span className={p.status === "SUCCEEDED" ? "text-green-400" : "text-amber-400"}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
