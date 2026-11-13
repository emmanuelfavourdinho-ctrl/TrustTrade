import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { HttpError } from "../../utils/http-error.js";
import { apiSuccess } from "../../utils/response.js";
import { forgotPasswordSchema, loginSchema, registerSchema } from "./schemas.js";
import {
  authenticateAccount,
  registerAccount,
  revokeSession,
} from "./service.js";

const router = Router();
const sessionCookieSameSite = env.NODE_ENV === "production" ? "none" : "lax";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." },
  },
});

router.post("/register", authLimiter, validateBody(registerSchema), async (request, response) => {
  await registerAccount(request.body);
  apiSuccess(response, { message: "Account created. Sign in to continue." }, "Account created.", 201);
});

router.post("/login", authLimiter, validateBody(loginSchema), async (request, response) => {
  const session = await authenticateAccount(request.body);
  response.cookie(env.SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: sessionCookieSameSite,
    path: "/api/v1",
    expires: session.expiresAt,
  });
  apiSuccess(response, { message: "Signed in.", user: session.user }, "Signed in.");
});

router.post(
  "/logout",
  authenticate,
  async (request, response) => {
    const token = request.cookies?.[env.SESSION_COOKIE_NAME];
    if (typeof token === "string") await revokeSession(token);
    response.clearCookie(env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: sessionCookieSameSite,
      path: "/api/v1",
    });
    apiSuccess(response, { message: "Signed out." }, "Signed out.");
  },
);

router.get("/me", authenticate, (request, response) => {
  apiSuccess(response, request.auth?.user ?? null);
});

router.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), async () => {
  throw new HttpError(
    501,
    "PASSWORD_RESET_NOT_CONFIGURED",
    "Password reset is unavailable until an email delivery provider is configured.",
  );
});

export const authRouter = router;
