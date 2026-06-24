import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { register as registerThunk, selectAuth } from "../../features/auth/authSlice";
import AuthShell from "../../components/AuthShell";

export default function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error } = useSelector(selectAuth);

  const onSubmit = async (values) => {
    const res = await dispatch(registerThunk(values));
    if (registerThunk.fulfilled.match(res)) navigate("/");
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start streaming in minutes — it's free to sign up"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
    >
      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" placeholder="Your name" {...register("name", { required: "Name required" })} />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" placeholder="you@example.com" {...register("email", { required: "Email required" })} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Password (min 8 chars)</label>
          <input type="password" className="input" placeholder="••••••••" {...register("password", { required: "Password required", minLength: { value: 8, message: "At least 8 characters" } })} />
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create account"}</button>
      </form>
    </AuthShell>
  );
}
