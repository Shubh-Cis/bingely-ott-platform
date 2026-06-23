import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { adminApi } from "../../services/api";
import { apiError } from "../../lib/axios";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { role: "EDITOR" } });

  const load = () => adminApi.list("users").then((r) => setUsers(r.data || r)).catch((e) => setError(apiError(e)));
  useEffect(() => { load(); }, []);

  const create = async (v) => {
    try {
      await adminApi.create("users", v);
      reset({ role: "EDITOR" });
      load();
    } catch (e) { setError(apiError(e)); }
  };

  const toggle = async (u) => {
    if (u.active) await adminApi.suspendUser(u.id);
    else await adminApi.activateUser(u.id);
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Back-office Users</h1>
      {error && <p className="mb-3 text-red-400">{error}</p>}

      <form onSubmit={handleSubmit(create)} className="card mb-6 grid gap-3 sm:grid-cols-4">
        <input className="input" placeholder="Name" {...register("name", { required: true })} />
        <input className="input" placeholder="Email" {...register("email", { required: true })} />
        <input className="input" type="password" placeholder="Password" {...register("password", { required: true })} />
        <div className="flex gap-2">
          <select className="input" {...register("role")}><option value="EDITOR">Editor</option><option value="ADMIN">Admin</option></select>
          <button className="btn-primary" disabled={isSubmitting}>Add</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-edge">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-gray-400"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-edge/60">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-gray-400">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.active ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Suspended</span>}</td>
                <td className="p-3 text-right"><button onClick={() => toggle(u)} className="text-primary hover:underline">{u.active ? "Suspend" : "Activate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
