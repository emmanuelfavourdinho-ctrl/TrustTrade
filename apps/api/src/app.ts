import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { prisma } from "./database/client.js";
import { requireSameOrigin } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error-handler.js";
import { adminVerificationRouter, verificationRouter } from "./modules/verification/routes.js";
import { artisanRouter } from "./modules/artisans/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { mediaRouter } from "./modules/media/routes.js";
import { postRouter } from "./modules/posts/routes.js";
import { HttpError } from "./utils/http-error.js";
import { apiSuccess } from "./utils/response.js";

const apiBase = "/api/v1";
const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "TrustTrade API",
    version: "1.0.0",
    description: "Versioned API for TrustTrade professional discovery and marketplace workflows.",
  },
  servers: [{ url: env.TRUSTTRADE_API_URL }],
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: env.SESSION_COOKIE_NAME },
    },
  },
  paths: {
    "/health/live": { get: { summary: "Liveness check", responses: { "200": { description: "API process is available." } } } },
    "/health/ready": { get: { summary: "Database readiness check", responses: { "200": { description: "Database is available." }, "503": { description: "Database is unavailable." } } } },
    [`${apiBase}/auth/register`]: { post: { summary: "Register a customer or artisan account", responses: { "201": { description: "Account created." }, "409": { description: "Email already exists." } } } },
    [`${apiBase}/auth/login`]: { post: { summary: "Create a secure cookie session", responses: { "200": { description: "Session created." }, "401": { description: "Invalid credentials." } } } },
    [`${apiBase}/auth/logout`]: { post: { summary: "Revoke the current session", security: [{ sessionCookie: [] }], responses: { "200": { description: "Session revoked." }, "401": { description: "Authentication required." } } } },
    [`${apiBase}/artisans`]: { get: { summary: "Search active artisan profiles", responses: { "200": { description: "Professional discovery results." } } } },
    [`${apiBase}/artisans/{username}`]: { get: { summary: "Read a public artisan profile", responses: { "200": { description: "Profile returned without private verification documents." }, "404": { description: "Profile not found." } } } },
    [`${apiBase}/verification/applications`]: { post: { summary: "Submit identity documents for review", security: [{ sessionCookie: [] }], responses: { "201": { description: "Pending review." }, "403": { description: "Artisan role required." } } } },
    [`${apiBase}/media/uploads/sign`]: { post: { summary: "Create a short-lived signed public-media upload authorization", security: [{ sessionCookie: [] }], responses: { "201": { description: "Signed Cloudinary upload parameters." }, "401": { description: "Authentication required." } } } },
    [`${apiBase}/media/uploads/{uploadIntentId}/complete`]: { post: { summary: "Verify and persist a Cloudinary upload", security: [{ sessionCookie: [] }], responses: { "201": { description: "Verified media metadata." }, "422": { description: "Uploaded asset did not pass server verification." } } } },
    [`${apiBase}/media/me/profile`]: {
      get: { summary: "Read the current user's media profile", security: [{ sessionCookie: [] }], responses: { "200": { description: "Profile media URLs." } } },
      patch: { summary: "Attach owned avatar and cover media to the user's profile", security: [{ sessionCookie: [] }], responses: { "200": { description: "Profile media updated." } } },
    },
    [`${apiBase}/media/me/portfolio`]: {
      get: { summary: "Read the current artisan's portfolio", security: [{ sessionCookie: [] }], responses: { "200": { description: "Portfolio media." } } },
      post: { summary: "Attach owned images to an artisan portfolio", security: [{ sessionCookie: [] }], responses: { "201": { description: "Portfolio entries created." } } },
    },
    [`${apiBase}/media/me/portfolio/{entryId}`]: { delete: { summary: "Remove an artisan portfolio attachment", security: [{ sessionCookie: [] }], responses: { "200": { description: "Portfolio entry removed." } } } },
    [`${apiBase}/media/{mediaId}`]: { delete: { summary: "Delete an unattached media asset", security: [{ sessionCookie: [] }], responses: { "200": { description: "Cloudinary asset and metadata deleted." }, "409": { description: "Media is attached to content." } } } },
    [`${apiBase}/admin/verifications`]: { get: { summary: "List pending applications (admin)", security: [{ sessionCookie: [] }], responses: { "200": { description: "Pending applications without storage keys." }, "403": { description: "Administrator role required." } } } },
    [`${apiBase}/posts`]: { post: { summary: "Publish a professional service post with owned media; requires active, verified artisan", security: [{ sessionCookie: [] }], responses: { "201": { description: "Post published." }, "403": { description: "Account or verification requirement not met." } } },
      get: { summary: "Read the paginated authenticated feed", security: [{ sessionCookie: [] }], responses: { "200": { description: "Feed page." } } } },
    [`${apiBase}/posts/{postId}/media/{mediaId}`]: { delete: { summary: "Detach owned media from the artisan's post", security: [{ sessionCookie: [] }], responses: { "200": { description: "Post media detached." }, "404": { description: "Attachment not found." } } } },
  },
};

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        mediaSrc: ["'self'", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.cloudinary.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  app.use(cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: "64kb" }));
  app.use(requireSameOrigin);

  app.get("/health/live", (_request, response) => {
    apiSuccess(response, { status: "ok" });
  });
  app.get("/health/ready", async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      apiSuccess(response, { status: "ready", database: "connected" });
    } catch (error) {
      console.error("API readiness check failed.", error);
      response.status(503).json({
        success: false,
        error: { code: "DATABASE_UNAVAILABLE", message: "The database is temporarily unavailable." },
      });
    }
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." },
      });
    },
  });
  app.use(apiBase, apiLimiter);
  app.use(`${apiBase}/auth`, authRouter);
  app.use(`${apiBase}/artisans`, artisanRouter);
  app.use(`${apiBase}/verification`, verificationRouter);
  app.use(`${apiBase}/media`, mediaRouter);
  app.use(`${apiBase}/admin`, adminVerificationRouter);
  app.use(`${apiBase}/posts`, postRouter);

  app.use((_request, _response, next) => {
    next(new HttpError(404, "ROUTE_NOT_FOUND", "This API route does not exist."));
  });
  app.use(errorHandler);
  return app;
}
