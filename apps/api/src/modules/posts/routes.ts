import { Buffer } from "node:buffer";
import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { authenticate, requireActiveAccount, requireRole } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { HttpError } from "../../utils/http-error.js";
import { apiSuccess } from "../../utils/response.js";
import { optimizedMediaUrl } from "../media/cloudinary.js";
import { mediaIdSchema } from "../media/schemas.js";
import { commentSchema, createPostSchema, feedQuerySchema, postIdSchema } from "./schemas.js";

const router = Router();

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const value = parsed as { createdAt?: unknown; id?: unknown };
    if (
      typeof value.createdAt !== "string" ||
      typeof value.id !== "string" ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      !/^[0-9a-f-]{36}$/i.test(value.id)
    ) {
      throw new Error("Invalid cursor");
    }
    return { createdAt: new Date(value.createdAt), id: value.id };
  } catch {
    throw new HttpError(400, "INVALID_CURSOR", "The feed cursor is invalid.");
  }
}

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString("base64url");
}

function accountStatusError(status: string) {
  switch (status) {
    case "RESTRICTED":
      return new HttpError(403, "ACCOUNT_RESTRICTED", "This account cannot publish posts.");
    case "SUSPENDED":
      return new HttpError(403, "ACCOUNT_SUSPENDED", "This account is suspended.");
    case "BANNED":
    case "DEACTIVATED":
      return new HttpError(403, "ACCOUNT_BANNED", "This account cannot publish posts.");
    default:
      return null;
  }
}

router.post(
  "/",
  authenticate,
  requireRole("ARTISAN"),
  validateBody(createPostSchema),
  async (request, response) => {
    const { content, locationId, mediaIds = [] } = request.body as {
      content: string;
      locationId: string;
      mediaIds?: string[];
    };
    const authorId = request.auth!.user.id;

    const post = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT u.id
        FROM users AS u
        JOIN artisan_profiles AS ap ON ap.user_id = u.id
        WHERE u.id = ${authorId}::uuid
        FOR UPDATE OF u, ap
      `;

      const artisan = await transaction.artisanProfile.findUnique({
        where: { userId: authorId },
        select: {
          id: true,
          verificationStatus: true,
          user: { select: { accountStatus: true, role: true } },
          verificationApps: {
            where: { status: "APPROVED", reviewedAt: { not: null }, reviewedBy: { not: null } },
            take: 1,
            select: { id: true },
          },
        },
      });

      if (!artisan || artisan.user.role !== "ARTISAN") {
        throw new HttpError(403, "ARTISAN_ACCOUNT_REQUIRED", "Only artisan accounts may publish professional service posts.");
      }
      const statusError = accountStatusError(artisan.user.accountStatus);
      if (statusError) throw statusError;
      if (artisan.verificationStatus !== "APPROVED" || artisan.verificationApps.length === 0) {
        const latest = await transaction.artisanProfile.findUnique({
          where: { id: artisan.id },
          select: { verificationStatus: true },
        });
        if (latest?.verificationStatus === "PENDING_REVIEW") {
          throw new HttpError(403, "VERIFICATION_PENDING", "Identity verification is still under review.");
        }
        if (latest?.verificationStatus === "REJECTED") {
          throw new HttpError(403, "VERIFICATION_REJECTED", "Identity verification was rejected.");
        }
        throw new HttpError(403, "ARTISAN_VERIFICATION_REQUIRED", "Identity verification is required before publishing.");
      }

      const serviceArea = await transaction.artisanServiceArea.findFirst({
        where: {
          artisanId: artisan.id,
          locationId,
          location: { isActive: true },
        },
        select: { locationId: true },
      });
      if (!serviceArea) {
        throw new HttpError(422, "INVALID_SERVICE_LOCATION", "Select an active locality in your service areas.");
      }

      let uploadedMedia: Array<{ id: string; resourceType: "IMAGE" | "VIDEO"; publicId: string }> = [];
      if (mediaIds.length) {
        await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM media WHERE id = ANY(${mediaIds}::uuid[]) ORDER BY id FOR UPDATE
        `;
        uploadedMedia = await transaction.media.findMany({
          where: {
            id: { in: mediaIds },
            ownerId: authorId,
            purpose: "POST",
            status: "ACTIVE",
            postMedia: null,
          },
          select: { id: true, resourceType: true, publicId: true },
        });
        if (uploadedMedia.length !== mediaIds.length) {
          throw new HttpError(422, "INVALID_POST_MEDIA", "Each post attachment must be an unused upload owned by this artisan.");
        }
      }

      const created = await transaction.post.create({
        data: {
          authorId,
          artisanId: artisan.id,
          content,
          locationId,
          postType: "PROFESSIONAL_SERVICE",
          status: "PUBLISHED",
        },
        select: {
          id: true,
          content: true,
          status: true,
          postType: true,
          createdAt: true,
          location: { select: { name: true, city: true } },
        },
      });
      if (mediaIds.length) {
        await transaction.postMedia.createMany({
          data: mediaIds.map((mediaId, displayOrder) => ({
            postId: created.id,
            mediaId,
            storageKey: null,
            mediaType: uploadedMedia.find((media) => media.id === mediaId)!.resourceType,
            displayOrder,
          })),
        });
      }
      return {
        ...created,
        media: mediaIds.map((mediaId, displayOrder) => {
          const media = uploadedMedia.find((item) => item.id === mediaId)!;
          return {
            id: media.id,
            mediaType: media.resourceType,
            displayOrder,
            url: optimizedMediaUrl(media.publicId, media.resourceType, 1200, 900),
          };
        }),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    apiSuccess(response, post, "Professional service post published.", 201);
  },
);

router.get("/", authenticate, async (request, response) => {
  const parsed = feedQuerySchema.safeParse(request.query);
  if (!parsed.success) throw new HttpError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid feed query.");
  const cursor = decodeCursor(parsed.data.cursor);

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      ...(parsed.data.locality ? { locationId: parsed.data.locality } : {}),
      ...(cursor ? {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      } : {}),
    },
    take: parsed.data.limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      content: true,
      postType: true,
      createdAt: true,
      author: { select: { id: true, username: true, fullName: true } },
      artisan: {
        select: {
          professionalTitle: true,
          verificationStatus: true,
        },
      },
      location: { select: { id: true, name: true, city: true } },
      media: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          mediaType: true,
          displayOrder: true,
          media: {
            select: {
              publicId: true,
              resourceType: true,
              status: true,
            },
          },
        },
      },
      _count: { select: { likes: true, comments: true } },
      likes: {
        where: { userId: request.auth!.user.id },
        select: { id: true },
        take: 1,
      },
    },
  });

  const hasMore = posts.length > parsed.data.limit;
  const page = posts.slice(0, parsed.data.limit);
  apiSuccess(response, {
    items: page.map((post) => ({
      id: post.id,
      content: post.content,
      postType: post.postType,
      createdAt: post.createdAt,
      author: post.author,
      artisan: {
        professionalTitle: post.artisan.professionalTitle,
        verificationStatus: post.artisan.verificationStatus,
      },
      location: post.location,
      media: post.media.map((item) => ({
        id: item.id,
        mediaType: item.mediaType,
        displayOrder: item.displayOrder,
        url: item.media?.status === "ACTIVE"
          ? optimizedMediaUrl(
            item.media.publicId,
            item.media.resourceType,
            1200,
            900,
          )
          : null,
      })),
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      likedByMe: post.likes.length > 0,
    })),
    nextCursor: hasMore && page.length
      ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
      : null,
  });
});

router.post(
  "/:postId/like",
  authenticate,
  requireActiveAccount,
  async (request, response) => {
    const parsed = postIdSchema.safeParse(request.params);
    if (!parsed.success) throw new HttpError(400, "INVALID_POST_ID", "The post ID is invalid.");
    const post = await prisma.post.findFirst({
      where: { id: parsed.data.postId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!post) throw new HttpError(404, "POST_NOT_FOUND", "This post could not be found.");
    await prisma.like.upsert({
      where: { postId_userId: { postId: post.id, userId: request.auth!.user.id } },
      create: { postId: post.id, userId: request.auth!.user.id },
      update: {},
    });
    apiSuccess(response, { liked: true });
  },
);

router.delete(
  "/:postId/media/:mediaId",
  authenticate,
  requireActiveAccount,
  requireRole("ARTISAN"),
  async (request, response) => {
    const parsedPost = postIdSchema.safeParse(request.params);
    const parsedMedia = mediaIdSchema.safeParse({ mediaId: request.params.mediaId });
    if (!parsedPost.success || !parsedMedia.success) {
      throw new HttpError(400, "INVALID_POST_MEDIA", "The post or media ID is invalid.");
    }

    const removed = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM media WHERE id = ${parsedMedia.data.mediaId}::uuid FOR UPDATE
      `;
      const attachment = await transaction.postMedia.findFirst({
        where: {
          postId: parsedPost.data.postId,
          mediaId: parsedMedia.data.mediaId,
          post: { authorId: request.auth!.user.id },
        },
        select: { id: true },
      });
      if (!attachment) return false;
      await transaction.postMedia.delete({ where: { id: attachment.id } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!removed) throw new HttpError(404, "POST_MEDIA_NOT_FOUND", "This media attachment could not be found.");
    apiSuccess(response, { removed: true });
  },
);

router.delete(
  "/:postId/like",
  authenticate,
  requireActiveAccount,
  async (request, response) => {
    const parsed = postIdSchema.safeParse(request.params);
    if (!parsed.success) throw new HttpError(400, "INVALID_POST_ID", "The post ID is invalid.");
    await prisma.like.deleteMany({
      where: { postId: parsed.data.postId, userId: request.auth!.user.id },
    });
    apiSuccess(response, { liked: false });
  },
);

router.get("/:postId/comments", authenticate, async (request, response) => {
  const parsed = postIdSchema.safeParse(request.params);
  if (!parsed.success) throw new HttpError(400, "INVALID_POST_ID", "The post ID is invalid.");
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) throw new HttpError(404, "POST_NOT_FOUND", "This post could not be found.");
  const comments = await prisma.comment.findMany({
    where: { postId: post.id },
    take: 100,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, username: true, fullName: true } },
    },
  });
  apiSuccess(response, comments);
});

router.post(
  "/:postId/comments",
  authenticate,
  requireActiveAccount,
  validateBody(commentSchema),
  async (request, response) => {
    const parsed = postIdSchema.safeParse(request.params);
    if (!parsed.success) throw new HttpError(400, "INVALID_POST_ID", "The post ID is invalid.");
    const post = await prisma.post.findFirst({
      where: { id: parsed.data.postId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!post) throw new HttpError(404, "POST_NOT_FOUND", "This post could not be found.");
    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: request.auth!.user.id,
        content: request.body.content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, username: true, fullName: true } },
      },
    });
    apiSuccess(response, comment, "Comment added.", 201);
  },
);

export const postRouter = router;
