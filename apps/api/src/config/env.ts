import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().url().transform((value) => new URL(value).origin).default("http://localhost:3000"),
  SESSION_COOKIE_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default("trusttrade_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  PRIVATE_STORAGE_DIR: z.string().min(1).default("./private-uploads"),
  TRUSTTRADE_API_URL: z.string().url().default("http://localhost:4000"),
  CLOUDINARY_CLOUD_NAME: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().regex(/^[A-Za-z0-9_-]+$/).optional(),
  ),
  CLOUDINARY_API_KEY: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional(),
  ),
  CLOUDINARY_API_SECRET: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  CLOUDINARY_IMAGE_UPLOAD_PRESET: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional(),
  ),
  CLOUDINARY_VIDEO_UPLOAD_PRESET: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional(),
  ),
}).superRefine((values, context) => {
  const credentialsConfigured = [
    values.CLOUDINARY_CLOUD_NAME,
    values.CLOUDINARY_API_KEY,
    values.CLOUDINARY_API_SECRET,
  ].filter(Boolean).length;
  if (credentialsConfigured !== 0 && credentialsConfigured !== 3) {
    context.addIssue({
      code: "custom",
      message: "Configure all three Cloudinary credentials together.",
      path: ["CLOUDINARY_CLOUD_NAME"],
    });
  }
});

export const env = envSchema.parse(process.env);
