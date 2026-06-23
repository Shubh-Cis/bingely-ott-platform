import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../services/api";
import { tokenStore, apiError } from "../../lib/axios";

// Bootstrap from a still-valid token (page refresh): if we have an access token,
// fetch the current principal.
export const loadMe = createAsyncThunk("auth/loadMe", async () => {
  if (!tokenStore.access) return null;
  return authApi.me();
});

// Each auth thunk rejects with the API's human-readable message (via apiError)
// instead of axios's generic "Request failed with status code 401".
export const login = createAsyncThunk("auth/login", async (body, { rejectWithValue }) => {
  try {
    const res = await authApi.login(body);
    tokenStore.set(res);
    return { kind: "viewer", profile: res.viewer };
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const register = createAsyncThunk("auth/register", async (body, { rejectWithValue }) => {
  try {
    const res = await authApi.register(body);
    tokenStore.set(res);
    return { kind: "viewer", profile: res.viewer };
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const adminLogin = createAsyncThunk("auth/adminLogin", async (body, { rejectWithValue }) => {
  try {
    const res = await authApi.adminLogin(body);
    tokenStore.set(res);
    return { kind: "admin", profile: res.user };
  } catch (e) {
    return rejectWithValue(apiError(e));
  }
});

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await authApi.logout();
  } catch {
    /* ignore */
  }
  tokenStore.clear();
});

const slice = createSlice({
  name: "auth",
  initialState: { kind: null, profile: null, subscription: null, status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadMe.fulfilled, (s, a) => {
      if (a.payload) {
        s.kind = a.payload.kind;
        s.profile = a.payload.profile;
        s.subscription = a.payload.subscription || null;
      }
      s.status = "ready";
    });
    b.addCase(loadMe.rejected, (s) => {
      s.status = "ready";
      s.kind = null;
      s.profile = null;
    });
    for (const t of [login, register, adminLogin]) {
      b.addCase(t.pending, (s) => {
        s.status = "loading";
        s.error = null;
      });
      b.addCase(t.fulfilled, (s, a) => {
        s.status = "ready";
        s.kind = a.payload.kind;
        s.profile = a.payload.profile;
      });
      b.addCase(t.rejected, (s, a) => {
        s.status = "ready";
        // a.payload = the API message from rejectWithValue; fall back to the raw error.
        s.error = a.payload || a.error.message;
      });
    }
    b.addCase(logout.fulfilled, (s) => {
      s.kind = null;
      s.profile = null;
      s.subscription = null;
    });
  },
});

export default slice.reducer;
export const selectAuth = (state) => state.auth;
