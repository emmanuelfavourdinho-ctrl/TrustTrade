import { z } from "zod";
import { API_BASE_URL, ApiError, apiRequest } from "./client";

const verificationQueueItemSchema = z.object({
  id: z.string().uuid(),
  documentType: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
  applicant: z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    username: z.string(),
  }),
  artisan: z.object({
    professionalTitle: z.string(),
  }),
});

export type VerificationQueueItem = z.infer<typeof verificationQueueItemSchema>;

export function getVerificationQueue() {
  return apiRequest(
    "/api/v1/admin/verifications?limit=50",
    z.array(verificationQueueItemSchema),
  );
}

export function decideVerification(
  applicationId: string,
  decision: "approve" | "reject" | "request-resubmission",
  input: { reason: string; notes?: string },
) {
  return apiRequest(
    `/api/v1/admin/verifications/${encodeURIComponent(applicationId)}/${decision}`,
    z.object({
      id: z.string().uuid(),
      artisanId: z.string().uuid(),
      status: z.string(),
    }),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function downloadVerificationDocument(
  applicationId: string,
  kind: "document" | "selfie",
) {
  if (!API_BASE_URL) {
    throw new ApiError("The TrustTrade API is not connected.");
  }
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/admin/verifications/${encodeURIComponent(applicationId)}/documents/${kind}`,
      { credentials: "include" },
    );
  } catch {
    throw new ApiError("The verification document could not be reached.");
  }
  if (!response.ok) {
    let message = `The verification document could not be loaded (HTTP ${response.status}).`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === "object" && payload && "error" in payload) {
        const error = payload.error;
        if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
          message = error.message;
        }
      }
    } catch {
      // The endpoint may return a non-JSON error body.
    }
    throw new ApiError(message, response.status);
  }
  return response.blob();
}
