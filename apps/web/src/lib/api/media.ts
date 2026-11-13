import { z } from "zod";
import { apiRequest } from "./client";

const uploadAuthorizationSchema = z.object({
  uploadIntentId: z.string().uuid(),
  publicId: z.string(),
  resourceType: z.enum(["image", "video"]),
  expiresAt: z.string().datetime(),
  cloudName: z.string(),
  apiKey: z.string(),
  timestamp: z.number().int(),
  signature: z.string(),
  uploadUrl: z.url(),
  params: z.object({
    asset_folder: z.string(),
    allowed_formats: z.string(),
    context: z.string(),
    overwrite: z.boolean(),
    public_id: z.string(),
    upload_preset: z.string(),
    timestamp: z.number().int(),
  }),
});

export const mediaPurposeSchema = z.enum([
  "PROFILE_AVATAR",
  "PROFILE_COVER",
  "ARTISAN_PORTFOLIO",
  "POST",
]);
export type MediaPurpose = z.infer<typeof mediaPurposeSchema>;

export const mediaRecordSchema = z.object({
  id: z.string().uuid(),
  provider: z.literal("cloudinary"),
  publicId: z.string(),
  secureUrl: z.url(),
  deliveryUrl: z.url(),
  resourceType: z.enum(["image", "video"]),
  format: z.string(),
  bytes: z.number().int().positive(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  purpose: mediaPurposeSchema,
  status: z.enum(["ACTIVE", "DELETING"]),
});
export type MediaRecord = z.infer<typeof mediaRecordSchema>;

const cloudinaryUploadResponseSchema = z.object({
  asset_id: z.string().min(1),
  public_id: z.string().min(1),
});

export async function uploadMedia(file: File, purpose: MediaPurpose) {
  const contentType = file.type;
  const authorization = await apiRequest(
    "/api/v1/media/uploads/sign",
    uploadAuthorizationSchema,
    {
      method: "POST",
      body: JSON.stringify({ purpose, contentType }),
    },
  );

  const form = new FormData();
  for (const [key, value] of Object.entries(authorization.params)) {
    form.append(key, String(value));
  }
  form.append("api_key", authorization.apiKey);
  form.append("signature", authorization.signature);
  form.append("file", file);

  let cloudinaryResponse: Response;
  try {
    cloudinaryResponse = await fetch(authorization.uploadUrl, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error("The media provider could not be reached. Please try again.");
  }
  if (!cloudinaryResponse.ok) {
    throw new Error("The media provider rejected this upload.");
  }

  let uploaded: unknown;
  try {
    uploaded = await cloudinaryResponse.json();
  } catch {
    throw new Error("The media provider returned an unreadable upload response.");
  }
  const parsedUpload = cloudinaryUploadResponseSchema.safeParse(uploaded);
  if (!parsedUpload.success) {
    throw new Error("The media provider returned incomplete upload information.");
  }

  return apiRequest(
    `/api/v1/media/uploads/${authorization.uploadIntentId}/complete`,
    mediaRecordSchema,
    {
      method: "POST",
      body: JSON.stringify({
        publicId: parsedUpload.data.public_id,
        assetId: parsedUpload.data.asset_id,
      }),
    },
  );
}

export async function attachProfileMedia(input: {
  profilePhotoMediaId?: string | null;
  coverPhotoMediaId?: string | null;
}) {
  return apiRequest(
    "/api/v1/media/me/profile",
    z.object({ message: z.string() }),
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function getProfileMedia() {
  return apiRequest(
    "/api/v1/media/me/profile",
    z.object({
      bio: z.string(),
      profilePhotoUrl: z.url().nullable(),
      coverPhotoUrl: z.url().nullable(),
    }),
  );
}

export async function addPortfolioMedia(mediaIds: string[]) {
  return apiRequest(
    "/api/v1/media/me/portfolio",
    z.array(z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int(),
      media: mediaRecordSchema,
    })),
    { method: "POST", body: JSON.stringify({ mediaIds }) },
  );
}

export async function getPortfolioMedia() {
  return apiRequest(
    "/api/v1/media/me/portfolio",
    z.array(z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int(),
      media: mediaRecordSchema,
    })),
  );
}

export async function deleteMedia(mediaId: string) {
  return apiRequest(
    `/api/v1/media/${encodeURIComponent(mediaId)}`,
    z.object({ deleted: z.literal(true) }),
    { method: "DELETE" },
  );
}
