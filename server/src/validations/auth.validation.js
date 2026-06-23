const { z } = require("zod");

const email = z.string().email("A valid email is required");
const password = z.string().min(8, "Password must be at least 8 characters");

const register = {
  body: z.object({
    email,
    password,
    name: z.string().min(1).max(80).optional(),
  }),
};

const login = {
  body: z.object({ email, password: z.string().min(1, "Password is required") }),
};

const refresh = {
  // refresh token may come from cookie or body
  body: z.object({ refreshToken: z.string().optional() }).optional(),
};

const verifyEmail = {
  body: z.object({ token: z.string().min(10) }),
};

const forgotPassword = {
  body: z.object({ email }),
};

const resetPassword = {
  body: z.object({ token: z.string().min(10), password }),
};

module.exports = { register, login, refresh, verifyEmail, forgotPassword, resetPassword };
