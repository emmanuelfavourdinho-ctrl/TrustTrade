import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  type ForgotPasswordRequest,
  type LoginRequest,
  type RegisterRequest,
} from "@trusttrade/shared";
import { z } from "zod";
import { apiRequest } from "./client";

const accountRoleSchema = z
  .enum(["CUSTOMER", "ARTISAN", "ADMIN", "customer", "artisan", "admin"])
  .transform((role) => {
    switch (role) {
      case "CUSTOMER":
      case "customer":
        return "customer";
      case "ARTISAN":
      case "artisan":
        return "artisan";
      default:
        return "admin";
    }
  });

export const currentUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  username: z.string(),
  email: z.email(),
  role: accountRoleSchema,
  accountStatus: z.string(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

const acceptedResponse = z.object({
  message: z.string().optional(),
});

export function login(input: LoginRequest) {
  const body = loginRequestSchema.parse(input);
  return apiRequest("/api/v1/auth/login", acceptedResponse, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getCurrentUser() {
  return apiRequest("/api/v1/auth/me", currentUserSchema);
}

export function logout() {
  return apiRequest("/api/v1/auth/logout", z.object({ message: z.string().optional() }), {
    method: "POST",
  });
}

export function register(input: RegisterRequest) {
  const body = registerRequestSchema.parse(input);
  return apiRequest("/api/v1/auth/register", acceptedResponse, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function requestPasswordReset(input: ForgotPasswordRequest) {
  const body = forgotPasswordRequestSchema.parse(input);
  return apiRequest("/api/v1/auth/forgot-password", acceptedResponse, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const verificationApplicationSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.string().optional(),
  documentType: z.string().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  submittedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  decisions: z.array(z.object({
    decision: z.string().optional(),
    reason: z.string().nullable().optional(),
    createdAt: z.string().datetime().optional(),
  }).passthrough()).optional(),
}).passthrough();

export const verificationOverviewSchema = z.object({
  verificationStatus: z.string(),
  verificationApps: z.array(verificationApplicationSchema),
}).passthrough();

export function getMyVerification() {
  return apiRequest("/api/v1/verification/me", verificationOverviewSchema);
}

export async function submitVerification(input: {
  documentType: string;
  document: File;
  selfie: File;
}) {
  const form = new FormData();
  form.append("documentType", input.documentType);
  form.append("document", input.document);
  form.append("selfie", input.selfie);
  return apiRequest(
    "/api/v1/verification/applications",
    z.object({
      id: z.string().uuid(),
      status: z.string(),
      createdAt: z.string().datetime(),
    }).passthrough(),
    { method: "POST", body: form },
  );
}
