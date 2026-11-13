import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";

export interface CloudinaryAsset {
  assetId: string;
  publicId: string;
  secureUrl: string;
  resourceType: "image" | "video";
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  context: Record<string, string>;
}

function credentials() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new HttpError(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Public media uploads are not configured.");
  }
  return { cloudName, apiKey, apiSecret };
}

function configureCloudinary() {
  const config = credentials();
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return config;
}

function resourceName(resourceType: "IMAGE" | "VIDEO") {
  return resourceType === "IMAGE" ? "image" : "video";
}

function readAsset(value: unknown): CloudinaryAsset | null {
  if (typeof value !== "object" || value === null) return null;
  const asset = value as Record<string, unknown>;
  const context = asset.context;
  const custom = typeof context === "object" && context !== null
    ? (context as Record<string, unknown>).custom
    : undefined;
  const customValues = typeof custom === "object" && custom !== null
    ? Object.fromEntries(
      Object.entries(custom as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    )
    : {};

  if (
    typeof asset.asset_id !== "string" ||
    typeof asset.public_id !== "string" ||
    typeof asset.secure_url !== "string" ||
    (asset.resource_type !== "image" && asset.resource_type !== "video") ||
    typeof asset.format !== "string" ||
    typeof asset.bytes !== "number" ||
    !Number.isInteger(asset.bytes) ||
    asset.bytes < 1 ||
    (asset.width !== undefined && typeof asset.width !== "number") ||
    (asset.height !== undefined && typeof asset.height !== "number")
  ) {
    return null;
  }

  return {
    assetId: asset.asset_id,
    publicId: asset.public_id,
    secureUrl: asset.secure_url,
    resourceType: asset.resource_type,
    format: asset.format.toLowerCase(),
    bytes: asset.bytes,
    width: typeof asset.width === "number" ? asset.width : null,
    height: typeof asset.height === "number" ? asset.height : null,
    context: customValues,
  };
}

export function createUploadSignature(input: {
  uploadIntentId: string;
  ownerId: string;
  purpose: string;
  publicId: string;
  folder: string;
  resourceType: "IMAGE" | "VIDEO";
}) {
  const { cloudName, apiKey, apiSecret } = credentials();
  const uploadPreset = input.resourceType === "IMAGE"
    ? env.CLOUDINARY_IMAGE_UPLOAD_PRESET
    : env.CLOUDINARY_VIDEO_UPLOAD_PRESET;
  if (!uploadPreset) {
    throw new HttpError(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Public media upload presets are not configured.");
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const context = `owner_id=${input.ownerId}|upload_intent_id=${input.uploadIntentId}|purpose=${input.purpose}`;
  const params = {
    asset_folder: input.folder,
    allowed_formats: input.resourceType === "IMAGE" ? "jpg,jpeg,png,webp" : "mp4,webm",
    context,
    overwrite: false,
    public_id: input.publicId,
    upload_preset: uploadPreset,
    timestamp,
  };

  return {
    cloudName,
    apiKey,
    timestamp,
    signature: cloudinary.utils.api_sign_request(params, apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceName(input.resourceType)}/upload`,
    params,
  };
}

export async function fetchCloudinaryAsset(
  publicId: string,
  resourceType: "IMAGE" | "VIDEO",
): Promise<CloudinaryAsset> {
  configureCloudinary();
  try {
    const raw: unknown = await cloudinary.api.resource(publicId, {
      resource_type: resourceName(resourceType),
      type: "upload",
      context: true,
    });
    const asset = readAsset(raw);
    if (!asset) {
      throw new HttpError(422, "INVALID_CLOUDINARY_ASSET", "Cloudinary returned incomplete media information.");
    }
    return asset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const statusCode = typeof error === "object" && error !== null && "http_code" in error
      ? (error as { http_code?: unknown }).http_code
      : undefined;
    if (statusCode === 404) {
      throw new HttpError(422, "MEDIA_UPLOAD_NOT_FOUND", "The uploaded asset could not be verified.");
    }
    console.error("Cloudinary asset verification failed.", {
      statusCode,
      message: error instanceof Error ? error.message : "Unknown provider error.",
    });
    throw new HttpError(502, "MEDIA_PROVIDER_UNAVAILABLE", "Media storage could not verify the upload.");
  }
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: "IMAGE" | "VIDEO") {
  configureCloudinary();
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceName(resourceType),
      type: "upload",
      invalidate: true,
    });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Unexpected Cloudinary deletion result: ${String(result.result)}`);
    }
  } catch (error) {
    console.error("Cloudinary asset deletion failed.", {
      message: error instanceof Error ? error.message : "Unknown provider error.",
    });
    throw new HttpError(502, "MEDIA_DELETE_FAILED", "Media storage could not delete the asset.");
  }
}

export function optimizedMediaUrl(
  publicId: string,
  resourceType: "IMAGE" | "VIDEO",
  width: number,
  height: number,
  crop: "fill" | "limit" = "limit",
  gravity?: "face" | "auto",
) {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    throw new HttpError(503, "MEDIA_STORAGE_NOT_CONFIGURED", "Public media delivery is not configured.");
  }
  return cloudinary.url(publicId, {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    secure: true,
    resource_type: resourceName(resourceType),
    transformation: [{
      width,
      height,
      crop,
      ...(gravity ? { gravity } : {}),
      quality: "auto",
      fetch_format: "auto",
    }],
  });
}
