import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { selectAuth } from "../features/auth/authSlice";

// Wait for the initial loadMe() to finish before deciding.
function useReady() {
  const { status } = useSelector(selectAuth);
  return status === "ready";
}

export function RequireViewer({ children }) {
  const { kind } = useSelector(selectAuth);
  const ready = useReady();
  const location = useLocation();
  if (!ready) return <div className="p-10 text-gray-400">Loading…</div>;
  if (kind !== "viewer") return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { kind } = useSelector(selectAuth);
  const ready = useReady();
  if (!ready) return <div className="p-10 text-gray-400">Loading…</div>;
  if (kind !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}
