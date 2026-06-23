import { useEffect, useState } from "react";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";

export default function Categories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = () => adminApi.list("categories").then((r) => setItems(r.data || r)).catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await adminApi.create("categories", { name: name.trim() });
      setName("");
      load();
    } catch (err) { setError(apiError(err)); }
  };

  const del = async (id) => { if (confirm("Delete category?")) { await adminApi.remove("categories", id); load(); } };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Categories</h1>
      {error && <p className="mb-3 text-red-400">{error}</p>}
      <form onSubmit={add} className="mb-5 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="input" />
        <button className="btn-primary">Add</button>
      </form>
      <ul className="divide-y divide-edge rounded-xl border border-edge">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <span>{c.name} <span className="text-xs text-gray-500">/{c.slug}</span></span>
            <button onClick={() => del(c.id)} className="text-red-400 hover:underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
