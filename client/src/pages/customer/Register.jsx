import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { register as registerThunk, selectAuth } from "../../features/auth/authSlice";

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
    <div className="mx-auto max-w-md py-10">
      <div className="card">
        <h1 className="mb-4 text-2xl font-bold">Create your account</h1>
        {error && <p className="mb-3 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" {...register("name", { required: "Name required" })} />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" {...register("email", { required: "Email required" })} />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password (min 8 chars)</label>
            <input type="password" className="input" {...register("password", { required: "Password required", minLength: { value: 8, message: "At least 8 characters" } })} />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Creating…" : "Create account"}</button>
        </form>
        <p className="mt-4 text-sm text-gray-400">Already have an account? <Link to="/login" className="text-primary">Sign in</Link></p>
      </div>
    </div>
  );
}
