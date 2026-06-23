import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { adminLogin, selectAuth } from "../../features/auth/authSlice";

export default function AdminLogin() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error } = useSelector(selectAuth);

  const onSubmit = async (values) => {
    const res = await dispatch(adminLogin(values));
    if (adminLogin.fulfilled.match(res)) navigate("/admin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-extrabold">Bingely<span className="text-primary">+</span></h1>
        <p className="mb-4 text-sm text-gray-400">Admin portal</p>
        {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" {...register("email", { required: true })} />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" {...register("password", { required: true })} />
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
