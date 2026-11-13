import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  sign: vi.fn(() => ({
    cloudName: "test-cloud",
    apiKey: "test-api-key",
    timestamp: 1_800_000_000,
    signature: "test-signature",
    uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
    params: {
      asset_folder: "trusttrade/public/profile_avatar/test-user",
      allowed_formats: "jpg,jpeg,png,webp",
      context: "signed-context",
      overwrite: false,
      public_id: "trusttrade/public/profile_avatar/test-user/test-asset",
      upload_preset: "test-preset",
      timestamp: 1_800_000_000,
    },
  })),
  fetch: vi.fn(),
  remove: vi.fn(),
  url: vi.fn((publicId: string) => `https://res.cloudinary.com/test-cloud/image/upload/${publicId}`),
}));

vi.mock("./cloudinary.js", () => ({
  createUploadSignature: provider.sign,
  fetchCloudinaryAsset: provider.fetch,
  deleteCloudinaryAsset: provider.remove,
  optimizedMediaUrl: provider.url,
}));

import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../database/client.js";
import { cleanupOrphanedMedia } from "./cleanup.js";

const app = createApp();
const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const runId = randomUUID();
const trackedUserIds: string[] = [];
const previousCloudName = process.env.CLOUDINARY_CLOUD_NAME;

async function createSession(role: "customer" | "artisan") {
  const email = `media-${runId}-${role}-${randomUUID()}@example.test`;
  await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .send({ fullName: `Media ${role}`, email, password: "A-long-test-password-2026", role })
    .expect(201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  trackedUserIds.push(user.id);
  const signedIn = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", origin)
    .send({ email, password: "A-long-test-password-2026" })
    .expect(200);
  const cookies: unknown = signedIn.headers["set-cookie"];
  const cookie = Array.isArray(cookies) ? cookies[0] : cookies;
  if (typeof cookie !== "string") throw new Error("Media test login did not return a session cookie.");
  return { userId: user.id, cookie: cookie.split(";")[0]! };
}

function providerAsset(
  intent: { id: string; ownerId: string; purpose: string; publicId: string; resourceType: "IMAGE" | "VIDEO" },
  overrides: Record<string, unknown> = {},
) {
  return {
    assetId: `asset-${intent.id}`,
    publicId: intent.publicId,
    secureUrl: `https://res.cloudinary.com/test-cloud/${intent.resourceType.toLowerCase()}/upload/${intent.publicId}.${intent.resourceType === "IMAGE" ? "webp" : "mp4"}`,
    resourceType: intent.resourceType.toLowerCase(),
    format: intent.resourceType === "IMAGE" ? "webp" : "mp4",
    bytes: 1200,
    width: 640,
    height: 480,
    context: {
      owner_id: intent.ownerId,
      upload_intent_id: intent.id,
      purpose: intent.purpose,
    },
    ...overrides,
  };
}

function authorizeUpload(
  session: { cookie: string },
  purpose: "PROFILE_AVATAR" | "PROFILE_COVER" | "ARTISAN_PORTFOLIO" | "POST",
  contentType = "image/webp",
) {
  return request(app)
    .post("/api/v1/media/uploads/sign")
    .set("Origin", origin)
    .set("Cookie", session.cookie)
    .send({ purpose, contentType });
}

describe("signed public media", () => {
  let customer: { userId: string; cookie: string };
  let anotherCustomer: { userId: string; cookie: string };
  let artisan: { userId: string; cookie: string };
  let anotherArtisan: { userId: string; cookie: string };
  let adminUserId: string;
  const locationId = "00000000-0000-4000-8000-000000000001";

  beforeAll(async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    await prisma.$connect();
    [customer, anotherCustomer, artisan, anotherArtisan] = await Promise.all([
      createSession("customer"),
      createSession("customer"),
      createSession("artisan"),
      createSession("artisan"),
    ]);
    const admin = await prisma.user.create({
      data: {
        fullName: "Media Test Administrator",
        username: `media-admin-${runId.slice(0, 8)}`,
        email: `media-admin-${runId}@example.test`,
        passwordHash: "unused-test-password-hash",
        role: "ADMIN",
        profile: { create: {} },
      },
      select: { id: true },
    });
    adminUserId = admin.id;
    trackedUserIds.push(admin.id);
    await prisma.location.upsert({
      where: { id: locationId },
      create: { id: locationId, name: "Buea", city: "Buea", region: "South-West", isActive: true },
      update: { isActive: true },
    });
  });

  beforeEach(() => {
    provider.fetch.mockReset();
    provider.remove.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (trackedUserIds.length) {
      await prisma.verificationApplication.deleteMany({ where: { applicantId: { in: trackedUserIds } } });
      await prisma.post.deleteMany({ where: { authorId: { in: trackedUserIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: trackedUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: trackedUserIds } } });
    }
    await prisma.$disconnect();
    if (previousCloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = previousCloudName;
  });

  it("requires authentication and rejects unsupported media types", async () => {
    await request(app)
      .post("/api/v1/media/uploads/sign")
      .set("Origin", origin)
      .send({ purpose: "PROFILE_AVATAR", contentType: "image/svg+xml" })
      .expect(401);

    await authorizeUpload(customer, "PROFILE_AVATAR", "image/svg+xml")
      .expect(415);
    await authorizeUpload(customer, "POST", "video/mp4")
      .expect(403);
  });

  it("verifies and persists metadata, enforces ownership and deletes only detached media", async () => {
    const signed = await authorizeUpload(customer, "PROFILE_AVATAR").expect(201);
    const intent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: signed.body.data.uploadIntentId },
    });
    provider.fetch.mockResolvedValue(providerAsset(intent));

    await request(app)
      .post(`/api/v1/media/uploads/${intent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", anotherCustomer.cookie)
      .send({ publicId: intent.publicId, assetId: `asset-${intent.id}` })
      .expect(404);
    expect(provider.fetch).not.toHaveBeenCalled();

    const completed = await request(app)
      .post(`/api/v1/media/uploads/${intent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .send({ publicId: intent.publicId, assetId: `asset-${intent.id}` })
      .expect(201);
    const mediaId = completed.body.data.id as string;
    expect(completed.body.data).toMatchObject({
      provider: "cloudinary",
      publicId: intent.publicId,
      resourceType: "image",
      format: "webp",
      bytes: 1200,
      width: 640,
      height: 480,
    });
    expect(await prisma.media.findUnique({ where: { id: mediaId }, select: { ownerId: true, secureUrl: true } }))
      .toMatchObject({ ownerId: customer.userId, secureUrl: expect.stringContaining("res.cloudinary.com") });

    await request(app)
      .patch("/api/v1/media/me/profile")
      .set("Origin", origin)
      .set("Cookie", anotherCustomer.cookie)
      .send({ profilePhotoMediaId: mediaId })
      .expect(422);

    await request(app)
      .patch("/api/v1/media/me/profile")
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .send({ profilePhotoMediaId: mediaId })
      .expect(200);
    await request(app)
      .delete(`/api/v1/media/${mediaId}`)
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .expect(409);

    await request(app)
      .patch("/api/v1/media/me/profile")
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .send({ profilePhotoMediaId: null })
      .expect(200);
    await request(app)
      .delete(`/api/v1/media/${mediaId}`)
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .expect(200);
    expect(await prisma.media.findUnique({ where: { id: mediaId } })).toBeNull();
    expect(provider.remove).toHaveBeenCalledWith(intent.publicId, "IMAGE");
  });

  it("rejects oversized provider assets, prevents foreign portfolio attachments and supports cleanup", async () => {
    const oversizeAuthorization = await authorizeUpload(artisan, "ARTISAN_PORTFOLIO").expect(201);
    const oversizeIntent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: oversizeAuthorization.body.data.uploadIntentId },
    });
    provider.fetch.mockResolvedValueOnce(providerAsset(oversizeIntent, { bytes: oversizeIntent.maxBytes + 1 }));
    await request(app)
      .post(`/api/v1/media/uploads/${oversizeIntent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ publicId: oversizeIntent.publicId, assetId: `asset-${oversizeIntent.id}` })
      .expect(422);
    expect(provider.remove).toHaveBeenCalledWith(oversizeIntent.publicId, "IMAGE");
    expect(await prisma.media.findUnique({ where: { publicId: oversizeIntent.publicId } })).toBeNull();

    const invalidContextAuthorization = await authorizeUpload(artisan, "ARTISAN_PORTFOLIO").expect(201);
    const invalidContextIntent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: invalidContextAuthorization.body.data.uploadIntentId },
    });
    provider.fetch.mockResolvedValueOnce(providerAsset(invalidContextIntent, {
      context: {
        owner_id: anotherArtisan.userId,
        upload_intent_id: invalidContextIntent.id,
        purpose: invalidContextIntent.purpose,
      },
    }));
    await request(app)
      .post(`/api/v1/media/uploads/${invalidContextIntent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ publicId: invalidContextIntent.publicId, assetId: `asset-${invalidContextIntent.id}` })
      .expect(422);
    expect(provider.remove).toHaveBeenCalledWith(invalidContextIntent.publicId, "IMAGE");

    const signed = await authorizeUpload(artisan, "ARTISAN_PORTFOLIO").expect(201);
    const intent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: signed.body.data.uploadIntentId },
    });
    provider.fetch.mockResolvedValueOnce(providerAsset(intent));
    const completed = await request(app)
      .post(`/api/v1/media/uploads/${intent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ publicId: intent.publicId, assetId: `asset-${intent.id}` })
      .expect(201);
    const mediaId = completed.body.data.id as string;
    await prisma.media.update({
      where: { id: mediaId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    await request(app)
      .post("/api/v1/media/me/portfolio")
      .set("Origin", origin)
      .set("Cookie", anotherArtisan.cookie)
      .send({ mediaIds: [mediaId] })
      .expect(422);
    const portfolio = await request(app)
      .post("/api/v1/media/me/portfolio")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ mediaIds: [mediaId] })
      .expect(201);
    expect(portfolio.body.data).toHaveLength(1);

    const expiredIntent = await prisma.mediaUploadIntent.create({
      data: {
        ownerId: customer.userId,
        publicId: `trusttrade/public/post/${customer.userId}/${randomUUID()}`,
        folder: `trusttrade/public/post/${customer.userId}`,
        purpose: "POST",
        resourceType: "IMAGE",
        maxBytes: 10 * 1024 * 1024,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const cleanup = await cleanupOrphanedMedia();
    expect(cleanup.expiredUploadsRemoved).toBe(1);
    expect(await prisma.mediaUploadIntent.findUnique({ where: { id: expiredIntent.id } })).toBeNull();
    expect(provider.remove).toHaveBeenCalledWith(expiredIntent.publicId, "IMAGE");

    const entryId = portfolio.body.data[0].id as string;
    await request(app)
      .delete(`/api/v1/media/me/portfolio/${entryId}`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .expect(200);
    const orphanCleanup = await cleanupOrphanedMedia();
    expect(orphanCleanup.unattachedMediaRemoved).toBe(1);
    expect(await prisma.media.findUnique({ where: { id: mediaId } })).toBeNull();
    expect(provider.remove).toHaveBeenCalledWith(intent.publicId, "IMAGE");
  });

  it("attaches only owned uploads to posts and retains verified-artisan publishing rules", async () => {
    for (const artisanSession of [artisan, anotherArtisan]) {
      const artisanProfile = await prisma.artisanProfile.findUniqueOrThrow({
        where: { userId: artisanSession.userId },
        select: { id: true },
      });
      await prisma.verificationApplication.create({
        data: {
          artisanId: artisanProfile.id,
          applicantId: artisanSession.userId,
          documentType: "test_document",
          documentStorageKey: "test-document.pdf",
          selfieStorageKey: "test-selfie.png",
          status: "APPROVED",
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      });
      await prisma.artisanProfile.update({
        where: { id: artisanProfile.id },
        data: {
          verificationStatus: "APPROVED",
          serviceAreas: { create: { location: { connect: { id: locationId } } } },
        },
      });
    }

    const signed = await authorizeUpload(artisan, "POST").expect(201);
    const intent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: signed.body.data.uploadIntentId },
    });
    provider.fetch.mockResolvedValueOnce(providerAsset(intent));
    const uploaded = await request(app)
      .post(`/api/v1/media/uploads/${intent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ publicId: intent.publicId, assetId: `asset-${intent.id}` })
      .expect(201);
    const videoSigned = await authorizeUpload(artisan, "POST", "video/mp4").expect(201);
    const videoIntent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: videoSigned.body.data.uploadIntentId },
    });
    provider.fetch.mockResolvedValueOnce(providerAsset(videoIntent));
    const videoUploaded = await request(app)
      .post(`/api/v1/media/uploads/${videoIntent.id}/complete`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ publicId: videoIntent.publicId, assetId: `asset-${videoIntent.id}` })
      .expect(201);

    await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", anotherArtisan.cookie)
      .send({ content: "Attempt with somebody else's media.", locationId, mediaIds: [uploaded.body.data.id, videoUploaded.body.data.id] })
      .expect(422);
    await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .send({ content: "Customer attempt.", locationId, mediaIds: [uploaded.body.data.id, videoUploaded.body.data.id] })
      .expect(403);

    const published = await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ content: "A verified professional post.", locationId, mediaIds: [uploaded.body.data.id, videoUploaded.body.data.id] })
      .expect(201);
    expect(published.body.data.media).toMatchObject([
      { id: uploaded.body.data.id, mediaType: "IMAGE", displayOrder: 0 },
      { id: videoUploaded.body.data.id, mediaType: "VIDEO", displayOrder: 1 },
    ]);

    const feed = await request(app)
      .get("/api/v1/posts")
      .set("Cookie", customer.cookie)
      .expect(200);
    const feedPost = feed.body.data.items.find((post: { id: string }) => post.id === published.body.data.id);
    expect(feedPost.media).toMatchObject([
      { id: expect.any(String), mediaType: "IMAGE", displayOrder: 0, url: expect.stringContaining("res.cloudinary.com") },
      { id: expect.any(String), mediaType: "VIDEO", displayOrder: 1, url: expect.stringContaining("res.cloudinary.com") },
    ]);
    for (const media of [uploaded.body.data, videoUploaded.body.data]) {
      await request(app)
        .delete(`/api/v1/posts/${published.body.data.id}/media/${media.id}`)
        .set("Origin", origin)
        .set("Cookie", artisan.cookie)
        .expect(200);
      await request(app)
        .delete(`/api/v1/media/${media.id}`)
        .set("Origin", origin)
        .set("Cookie", artisan.cookie)
        .expect(200);
    }
  });
});
