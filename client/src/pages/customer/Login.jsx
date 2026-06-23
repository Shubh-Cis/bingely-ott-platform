import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login, selectAuth } from "../../features/auth/authSlice";

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useSelector(selectAuth);

  const onSubmit = async (values) => {
    const res = await dispatch(login(values));
    if (login.fulfilled.match(res)) navigate(location.state?.from?.pathname || "/");
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="card">
        <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
        {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" {...register("email", { required: "Email required" })} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" {...register("password", { required: "Password required" })} />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-sm text-gray-400">New to Bingely? <Link to="/register" className="text-primary">Create an account</Link></p>
      </div>
    </div>
  );
}
