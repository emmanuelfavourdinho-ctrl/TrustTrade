import { randomUUID } from "node:crypto";
import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { authenticate, requireActiveAccount, requireRole } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import { apiSuccess } from "../../utils/response.js";
import {
  completeUploadSchema,
  mediaIdSchema,
  portfolioEntryIdSchema,
  portfolioMediaSchema,
  profileMediaSchema,
  uploadAuthorizationSchema,
} from "./schemas.js";
import {
  createUploadSignature,
  deleteCloudinaryAsset,
  fetchCloudinaryAsset,
  optimizedMediaUrl,
} from "./cloudinary.js";

const router = Router();
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => request.auth?.user.id ?? ipKeyGenerator(request.ip ?? "unknown"),
  handler: (_request, response) => {
    response.status(429).json({
      success: false,
      error: { code: "UPLOAD_RATE_LIMITED", message: "Too many upload requests. Try again later." },
    });
  },
});

const imageLimits = {
  maxBytes: 10 * 1024 * 1024,
  formats: new Set(["jpg", "jpeg", "png", "webp"]),
};
const videoLimits = {
  maxBytes: 100 * 1024 * 1024,
  formats: new Set(["mp4", "webm"]),
};
const allowedMimeTypes: Record<string, { resourceType: "IMAGE" | "VIDEO"; maxBytes: number }> = {
  "image/jpeg": { resourceType: "IMAGE", maxBytes: imageLimits.maxBytes },
  "image/png": { resourceType: "IMAGE", maxBytes: imageLimits.maxBytes },
  "image/webp": { resourceType: "IMAGE", maxBytes: imageLimits.maxBytes },
  "video/mp4": { resourceType: "VIDEO", maxBytes: videoLimits.maxBytes },
  "video/webm": { resourceType: "VIDEO", maxBytes: videoLimits.maxBytes },
};

function mediaResponse(media: {
  id: string;
  publicId: string;
  secureUrl: string;
  resourceType: "IMAGE" | "VIDEO";
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  purpose: string;
  status: string;
}) {
  const dimensions = media.purpose === "PROFILE_AVATAR"
    ? [256, 256]
    : media.purpose === "PROFILE_COVER"
      ? [1600, 600]
      : media.purpose === "POST"
        ? [1200, 900]
        : [1600, 1200];
  const crop = media.purpose === "PROFILE_AVATAR" || media.purpose === "PROFILE_COVER" ? "fill" : "limit";
  const gravity = media.purpose === "PROFILE_AVATAR" ? "face" : media.purpose === "PROFILE_COVER" ? "auto" : undefined;
  return {
    id: media.id,
    provider: "cloudinary",
    publicId: media.publicId,
    secureUrl: media.secureUrl,
    deliveryUrl: optimizedMediaUrl(media.publicId, media.resourceType, dimensions[0]!, dimensions[1]!, crop, gravity),
    resourceType: media.resourceType.toLowerCase(),
    format: media.format,
    bytes: media.bytes,
    width: media.width,
    height: media.height,
    purpose: media.purpose,
    status: media.status,
  };
}

async function lockMedia(transaction: Prisma.TransactionClient, mediaIds: string[]) {
  if (mediaIds.length === 0) return;
  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM media WHERE id = ANY(${mediaIds}::uuid[]) ORDER BY id FOR UPDATE
  `;
}

function assertCloudinaryAsset(
  asset: Awaited<ReturnType<typeof fetchCloudinaryAsset>>,
  intent: {
    id: string;
    ownerId: string;
    publicId: string;
    purpose: string;
    resourceType: "IMAGE" | "VIDEO";
    maxBytes: number;
  },
) {
  const formats = intent.resourceType === "IMAGE" ? imageLimits.formats : videoLimits.formats;
  let url: URL | null = null;
  try {
    url = new URL(asset.secureUrl);
  } catch {
    url = null;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (
    asset.publicId !== intent.publicId ||
    asset.resourceType !== intent.resourceType.toLowerCase() ||
    !formats.has(asset.format) ||
    asset.bytes > intent.maxBytes ||
    (asset.width !== null && (!Number.isInteger(asset.width) || asset.width < 1 || asset.width > 20_000)) ||
    (asset.height !== null && (!Number.isInteger(asset.height) || asset.height < 1 || asset.height > 20_000)) ||
    (intent.resourceType === "IMAGE" && (!asset.width || !asset.height || asset.width * asset.height > 50_000_000)) ||
    !url ||
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    !cloudName ||
    !url.pathname.startsWith(`/${cloudName}/`) ||
    asset.context.owner_id !== intent.ownerId ||
    asset.context.upload_intent_id !== intent.id ||
    asset.context.purpose !== intent.purpose
  ) {
    throw new HttpError(422, "MEDIA_UPLOAD_VALIDATION_FAILED", "The uploaded asset did not pass server verification.");
  }
}

async function removeInvalidAsset(publicId: string, resourceType: "IMAGE" | "VIDEO") {
  try {
    await deleteCloudinaryAsset(publicId, resourceType);
  } catch (error) {
    console.error("Could not clean up an invalid Cloudinary upload.", error);
    throw new HttpError(502, "MEDIA_CLEANUP_FAILED", "The invalid upload could not be removed from media storage.");
  }
}

router.use(authenticate, requireActiveAccount);

router.get("/me/profile", async (request, response) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId: request.auth!.user.id },
    select: {
      bio: true,
      profilePhotoMedia: { select: { publicId: true, status: true } },
      coverPhotoMedia: { select: { publicId: true, status: true } },
    },
  });
  apiSuccess(response, {
    bio: profile?.bio ?? "",
    profilePhotoUrl: profile?.profilePhotoMedia?.status === "ACTIVE"
      ? optimizedMediaUrl(profile.profilePhotoMedia.publicId, "IMAGE", 256, 256, "fill", "face")
      : null,
    coverPhotoUrl: profile?.coverPhotoMedia?.status === "ACTIVE"
      ? optimizedMediaUrl(profile.coverPhotoMedia.publicId, "IMAGE", 1600, 600, "fill", "auto")
      : null,
  });
});

router.post("/uploads/sign", uploadRateLimit, async (request, response) => {
  const parsed = uploadAuthorizationSchema.safeParse(request.body);
  if (!parsed.success) throw new HttpError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "The upload request is invalid.");

  const { purpose, contentType } = parsed.data;
  const type = allowedMimeTypes[contentType];
  if (!type || (purpose !== "POST" && type.resourceType !== "IMAGE")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "This media type is not allowed for the selected feature.");
  }
  if ((purpose === "POST" || purpose === "ARTISAN_PORTFOLIO") && request.auth!.user.role !== "ARTISAN") {
    throw new HttpError(403, "ARTISAN_ACCOUNT_REQUIRED", "Only artisan accounts may upload professional media.");
  }

  const folder = `trusttrade/public/${purpose.toLowerCase()}/${request.auth!.user.id}`;
  const publicId = `${folder}/${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 65 * 60 * 1000);
  const intent = await prisma.mediaUploadIntent.create({
    data: {
      ownerId: request.auth!.user.id,
      publicId,
      folder,
      purpose,
      resourceType: type.resourceType,
      maxBytes: type.maxBytes,
      expiresAt,
    },
  });

  try {
    const signature = createUploadSignature({
      uploadIntentId: intent.id,
      ownerId: intent.ownerId,
      purpose: intent.purpose,
      publicId: intent.publicId,
      folder: intent.folder,
      resourceType: intent.resourceType,
    });
    apiSuccess(response, {
      uploadIntentId: intent.id,
      publicId: intent.publicId,
      resourceType: intent.resourceType.toLowerCase(),
      expiresAt: intent.expiresAt,
      ...signature,
    }, "Signed upload authorization created.", 201);
  } catch (error) {
    await prisma.mediaUploadIntent.delete({ where: { id: intent.id } });
    throw error;
  }
});

router.post("/uploads/:uploadIntentId/complete", uploadRateLimit, async (request, response) => {
  const intentId = request.params.uploadIntentId;
  if (typeof intentId !== "string" || !/^[0-9a-f-]{36}$/i.test(intentId)) {
    throw new HttpError(400, "INVALID_UPLOAD_INTENT", "The upload intent ID is invalid.");
  }
  const parsed = completeUploadSchema.safeParse(request.body);
  if (!parsed.success) throw new HttpError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "The upload confirmation is invalid.");

  const intent = await prisma.mediaUploadIntent.findFirst({
    where: { id: intentId, ownerId: request.auth!.user.id },
    include: { media: true },
  });
  if (!intent) throw new HttpError(404, "UPLOAD_INTENT_NOT_FOUND", "This upload authorization could not be found.");
  if (intent.media) {
    if (parsed.data.publicId !== intent.media.publicId || parsed.data.assetId !== intent.media.assetId) {
      throw new HttpError(409, "UPLOAD_ALREADY_COMPLETED", "This upload authorization was already used.");
    }
    apiSuccess(response, mediaResponse(intent.media));
    return;
  }
  if (intent.expiresAt <= new Date()) {
    await removeInvalidAsset(intent.publicId, intent.resourceType);
    await prisma.mediaUploadIntent.delete({ where: { id: intent.id } });
    throw new HttpError(410, "UPLOAD_AUTHORIZATION_EXPIRED", "The upload authorization has expired.");
  }
  if (parsed.data.publicId !== intent.publicId) {
    throw new HttpError(422, "MEDIA_UPLOAD_MISMATCH", "The uploaded public ID does not match this authorization.");
  }

  const asset = await fetchCloudinaryAsset(intent.publicId, intent.resourceType);
  try {
    assertCloudinaryAsset(asset, intent);
    if (asset.assetId !== parsed.data.assetId) {
      throw new HttpError(422, "MEDIA_UPLOAD_MISMATCH", "The uploaded asset ID does not match Cloudinary.");
    }
  } catch (error) {
    await removeInvalidAsset(intent.publicId, intent.resourceType);
    throw error;
  }

  const media = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.mediaUploadIntent.updateMany({
      where: {
        id: intent.id,
        ownerId: request.auth!.user.id,
        completedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { completedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new HttpError(409, "UPLOAD_INTENT_ALREADY_USED", "This upload authorization is no longer available.");
    }
    return transaction.media.create({
      data: {
        ownerId: intent.ownerId,
        uploadIntentId: intent.id,
        assetId: asset.assetId,
        publicId: asset.publicId,
        secureUrl: asset.secureUrl,
        resourceType: intent.resourceType,
        purpose: intent.purpose,
        format: asset.format,
        bytes: asset.bytes,
        width: asset.width,
        height: asset.height,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  apiSuccess(response, mediaResponse(media), "Media upload verified and saved.", 201);
});

router.patch("/me/profile", async (request, response) => {
  const parsed = profileMediaSchema.safeParse(request.body);
  if (!parsed.success) throw new HttpError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "The profile media update is invalid.");
  const userId = request.auth!.user.id;
  const mediaIds = [parsed.data.profilePhotoMediaId, parsed.data.coverPhotoMediaId]
    .filter((id): id is string => id !== undefined && id !== null);

  await prisma.$transaction(async (transaction) => {
    await lockMedia(transaction, mediaIds);
    const media = await transaction.media.findMany({
      where: { id: { in: mediaIds }, ownerId: userId, status: "ACTIVE", resourceType: "IMAGE" },
      select: { id: true, purpose: true },
    });
    if (
      media.length !== mediaIds.length ||
      (parsed.data.profilePhotoMediaId && !media.some((item) => item.id === parsed.data.profilePhotoMediaId && item.purpose === "PROFILE_AVATAR")) ||
      (parsed.data.coverPhotoMediaId && !media.some((item) => item.id === parsed.data.coverPhotoMediaId && item.purpose === "PROFILE_COVER"))
    ) {
      throw new HttpError(422, "INVALID_PROFILE_MEDIA", "Choose active image uploads authorized for each profile field.");
    }

    await transaction.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        profilePhotoMediaId: parsed.data.profilePhotoMediaId ?? null,
        coverPhotoMediaId: parsed.data.coverPhotoMediaId ?? null,
      },
      update: {
        ...(parsed.data.profilePhotoMediaId !== undefined ? { profilePhotoMediaId: parsed.data.profilePhotoMediaId } : {}),
        ...(parsed.data.coverPhotoMediaId !== undefined ? { coverPhotoMediaId: parsed.data.coverPhotoMediaId } : {}),
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  apiSuccess(response, { message: "Profile media updated." });
});

router.post("/me/portfolio", requireRole("ARTISAN"), async (request, response) => {
  const parsed = portfolioMediaSchema.safeParse(request.body);
  if (!parsed.success) throw new HttpError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "The portfolio update is invalid.");
  const artisan = await prisma.artisanProfile.findUnique({
    where: { userId: request.auth!.user.id },
    select: { id: true },
  });
  if (!artisan) throw new HttpError(404, "ARTISAN_PROFILE_NOT_FOUND", "This artisan profile could not be found.");

  const entries = await prisma.$transaction(async (transaction) => {
    await lockMedia(transaction, parsed.data.mediaIds);
    const media = await transaction.media.findMany({
      where: {
        id: { in: parsed.data.mediaIds },
        ownerId: request.auth!.user.id,
        purpose: "ARTISAN_PORTFOLIO",
        resourceType: "IMAGE",
        status: "ACTIVE",
        portfolioMedia: null,
      },
      select: { id: true },
    });
    if (media.length !== parsed.data.mediaIds.length) {
      throw new HttpError(422, "INVALID_PORTFOLIO_MEDIA", "Each portfolio image must be an unused upload owned by this artisan.");
    }
    return Promise.all(parsed.data.mediaIds.map((mediaId, displayOrder) => transaction.artisanPortfolioMedia.create({
      data: { artisanId: artisan.id, mediaId, displayOrder },
      select: { id: true, media: true, displayOrder: true },
    })));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  apiSuccess(response, entries.map((entry) => ({
    id: entry.id,
    displayOrder: entry.displayOrder,
    media: mediaResponse(entry.media),
  })), "Portfolio images added.", 201);
});

router.get("/me/portfolio", requireRole("ARTISAN"), async (request, response) => {
  const entries = await prisma.artisanPortfolioMedia.findMany({
    where: { artisan: { userId: request.auth!.user.id } },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      displayOrder: true,
      media: true,
    },
  });
  apiSuccess(response, entries.map((entry) => ({
    id: entry.id,
    displayOrder: entry.displayOrder,
    media: mediaResponse(entry.media),
  })));
});

router.delete("/me/portfolio/:entryId", requireRole("ARTISAN"), async (request, response) => {
  const parsed = portfolioEntryIdSchema.safeParse(request.params);
  if (!parsed.success) throw new HttpError(400, "INVALID_PORTFOLIO_ENTRY", "The portfolio entry ID is invalid.");
  const deleted = await prisma.artisanPortfolioMedia.deleteMany({
    where: { id: parsed.data.entryId, artisan: { userId: request.auth!.user.id } },
  });
  if (!deleted.count) throw new HttpError(404, "PORTFOLIO_ENTRY_NOT_FOUND", "This portfolio entry could not be found.");
  apiSuccess(response, { removed: true });
});

router.delete("/:mediaId", async (request, response) => {
  const parsed = mediaIdSchema.safeParse(request.params);
  if (!parsed.success) throw new HttpError(400, "INVALID_MEDIA_ID", "The media ID is invalid.");
  const media = await prisma.$transaction(async (transaction) => {
    await lockMedia(transaction, [parsed.data.mediaId]);
    const current = await transaction.media.findFirst({
      where: { id: parsed.data.mediaId, ownerId: request.auth!.user.id },
      select: {
        id: true,
        publicId: true,
        resourceType: true,
        status: true,
        profilePhotoFor: { select: { id: true } },
        coverPhotoFor: { select: { id: true } },
        postMedia: { select: { id: true } },
        portfolioMedia: { select: { id: true } },
      },
    });
    if (!current) throw new HttpError(404, "MEDIA_NOT_FOUND", "This media could not be found.");
    if (current.profilePhotoFor || current.coverPhotoFor || current.postMedia || current.portfolioMedia) {
      throw new HttpError(409, "MEDIA_IN_USE", "Detach this media from its profile, portfolio or post before deleting it.");
    }
    if (current.status === "ACTIVE") {
      return transaction.media.update({
        where: { id: current.id },
        data: { status: "DELETING" },
        select: { id: true, publicId: true, resourceType: true },
      });
    }
    return { id: current.id, publicId: current.publicId, resourceType: current.resourceType };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await deleteCloudinaryAsset(media.publicId, media.resourceType);
  await prisma.media.delete({ where: { id: media.id } });
  apiSuccess(response, { deleted: true });
});

export const mediaRouter = router;
