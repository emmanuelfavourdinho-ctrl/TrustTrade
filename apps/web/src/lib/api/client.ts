import { ZodError, type ZodType } from "zod";
import { z } from "zod";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageForStatus(status: number) {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That information could not be found.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "TrustTrade is having trouble right now. Please try again later.";
  return "We could not complete that request. Check your details and try again.";
}

export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "The TrustTrade API is not connected. Set NEXT_PUBLIC_API_BASE_URL to enable this feature.",
    );
  }

  let response: Response;
  try {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "We could not reach TrustTrade. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    let message = messageForStatus(response.status);
    try {
      const payload: unknown = await response.json();
      const parsed = z.object({
        error: z.object({ message: z.string() }).optional(),
      }).safeParse(payload);
      if (parsed.success && parsed.data.error?.message) {
        message = parsed.data.error.message;
      }
    } catch {
      message = messageForStatus(response.status);
    }
    throw new ApiError(message, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("TrustTrade returned an unreadable response.", response.status);
  }

  try {
    const envelope = z.object({
      success: z.literal(true),
      data: schema,
    }).parse(payload);
    return envelope.data;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        "TrustTrade returned information in an unexpected format.",
        response.status,
      );
    }
    throw error;
  }
}
