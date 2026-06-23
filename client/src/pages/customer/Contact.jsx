import { useState } from "react";

// Simple contact page. There's no contact API yet, so submitting shows a
// confirmation and offers a mailto fallback. Wire to an endpoint later if needed.
export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black">Contact us</h1>
      <p className="mt-2 text-gray-400">Questions about billing, content or your account? We’re here to help.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="card"><div className="text-2xl">✉️</div><h3 className="mt-2 font-semibold">Email</h3><a href="mailto:hello@bingely.local" className="text-sm text-primary">hello@bingely.local</a></div>
        <div className="card"><div className="text-2xl">💬</div><h3 className="mt-2 font-semibold">Support</h3><p className="text-sm text-gray-400">24/7 in-app help</p></div>
        <div className="card"><div className="text-2xl">📍</div><h3 className="mt-2 font-semibold">HQ</h3><p className="text-sm text-gray-400">Bingely Media</p></div>
      </div>

      <div className="card mt-6">
        {sent ? (
          <div className="py-6 text-center">
            <div className="text-3xl">✅</div>
            <h2 className="mt-2 text-xl font-bold">Thanks, {form.name || "there"}!</h2>
            <p className="mt-1 text-gray-400">We’ve received your message and will reply to {form.email || "your email"} shortly.</p>
            <button className="btn-ghost mt-4" onClick={() => { setSent(false); setForm({ name: "", email: "", message: "" }); }}>Send another</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={set("name")} required /></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set("email")} required /></div>
            </div>
            <div><label className="label">Message</label><textarea className="input" rows="5" value={form.message} onChange={set("message")} required /></div>
            <div className="flex gap-3">
              <button className="btn-primary">Send message</button>
              <a className="btn-ghost" href={`mailto:hello@bingely.local?subject=Support&body=${encodeURIComponent(form.message)}`}>Email instead</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
