import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";

export default function Titles() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    adminApi
      .list("titles")
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((e) => setError(apiError(e)));

  useEffect(() => {
    load();
  }, []);

  const del = async (id) => {
    if (!confirm("Delete this title?")) return;
    await adminApi.remove("titles", id);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Titles {meta && <span className="text-base text-gray-500">({meta.total})</span>}</h1>
        <Link to="/admin/titles/new" className="btn-primary">+ New title</Link>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-edge">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-gray-400">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Type</th>
              <th className="p-3">Year</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t border-edge/60">
                <td className="p-3 font-medium">{t.title}</td>
                <td className="p-3 text-gray-400">{t.type}</td>
                <td className="p-3 text-gray-400">{t.year}</td>
                <td className="p-3 text-gray-400">{t.rating}</td>
                <td className="p-3">{t.active ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Hidden</span>}</td>
                <td className="p-3 text-right">
                  <Link to={`/admin/titles/${t.id}`} className="text-primary hover:underline">Edit</Link>
                  <button onClick={() => del(t.id)} className="ml-3 text-red-400 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-gray-500">No titles yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
