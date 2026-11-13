import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "../app.js";
import { prisma } from "../database/client.js";
import { Prisma } from "../generated/prisma/client.js";
import { verificationStoragePath } from "./verification/upload.js";

const app = createApp();
const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const runId = randomUUID();
const email = (role: string) => `test-${runId}-${role}@example.test`;
const adminEmail = "api-journey-admin@example.test";
const trackedUserIds: string[] = [];

async function registerAndSignIn(role: "customer" | "artisan", fullName: string) {
  const registered = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", origin)
    .send({ fullName, email: email(role), password: "A-long-test-password-2026", role })
    .expect(201);
  expect(registered.body.success).toBe(true);

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: email(role) },
    select: { id: true },
  });
  trackedUserIds.push(user.id);

  const signedIn = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", origin)
    .send({ email: email(role), password: "A-long-test-password-2026" })
    .expect(200);
  const cookieHeader: unknown = signedIn.headers["set-cookie"];
  const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  if (typeof cookie !== "string") throw new Error("Login response did not set a session cookie.");
  return { cookie: cookie.split(";")[0]!, userId: user.id };
}

describe("TrustTrade registration, verification and publishing", () => {
  let artisan: { cookie: string; userId: string };
  let customer: { cookie: string; userId: string };
  let adminCookie: string;
  let adminUserId: string;
  let skillId: string;
  let locationId: string;
  let applicationId: string;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.serviceCategory.upsert({
      where: { slug: "test-carpentry" },
      create: { name: "Test Carpentry", slug: "test-carpentry" },
      update: { isActive: true },
    }).then(async (category) => {
      const skill = await prisma.skill.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: "test-carpentry" } },
        create: { categoryId: category.id, name: "Test Carpentry", slug: "test-carpentry" },
        update: {},
      });
      skillId = skill.id;
    });
    const location = await prisma.location.upsert({
      where: { id: "00000000-0000-4000-8000-000000000001" },
      create: {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Buea",
        city: "Buea",
        region: "South-West",
        isActive: true,
      },
      update: { isActive: true },
    });
    locationId = location.id;

    artisan = await registerAndSignIn("artisan", "Test Artisan");
    customer = await registerAndSignIn("customer", "Test Customer");

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        fullName: "API Journey Administrator",
        username: "api-journey-admin",
        email: adminEmail,
        passwordHash: await argon2.hash("A-long-test-password-2026", { type: argon2.argon2id }),
        role: "ADMIN",
        profile: { create: {} },
      },
      update: {},
      select: { id: true, email: true },
    });
    adminUserId = admin.id;
    const signedInAdmin = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", origin)
      .send({ email: adminEmail, password: "A-long-test-password-2026" })
      .expect(200);
    const cookieHeader: unknown = signedInAdmin.headers["set-cookie"];
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    if (typeof cookie !== "string") throw new Error("Administrator login response did not set a session cookie.");
    adminCookie = cookie.split(";")[0]!;
  });

  afterAll(async () => {
    if (applicationId) {
      const application = await prisma.verificationApplication.findUnique({
        where: { id: applicationId },
        select: { documentStorageKey: true, selfieStorageKey: true },
      });
      if (application) {
        await Promise.all([
          application.documentStorageKey,
          application.selfieStorageKey,
        ].map((key) => fs.unlink(resolve(verificationStoragePath, key))));
      }
    }
    if (trackedUserIds.length) {
      const usersToDelete = trackedUserIds.filter((id) => id !== adminUserId);
      await prisma.$transaction(async (transaction) => {
        await transaction.verificationApplication.deleteMany({ where: { applicantId: { in: usersToDelete } } });
        await transaction.comment.deleteMany({ where: { authorId: { in: usersToDelete } } });
        await transaction.like.deleteMany({ where: { userId: { in: usersToDelete } } });
        await transaction.post.deleteMany({ where: { authorId: { in: usersToDelete } } });
        await transaction.session.deleteMany({ where: { userId: { in: [...trackedUserIds, adminUserId] } } });
        await transaction.user.deleteMany({ where: { id: { in: usersToDelete } } });
      });
    }
    await prisma.$disconnect();
  });

  it("denies customer verification and unverified artisan publishing", async () => {
    const duplicate = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", origin)
      .send({ fullName: "Duplicate Customer", email: email("customer"), password: "A-long-test-password-2026", role: "customer" })
      .expect(409);
    expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_EXISTS");

    await request(app)
      .post("/api/v1/verification/applications")
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .field("documentType", "national_identity_card")
      .expect(403);

    const customerPost = await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .send({ content: "Not permitted", locationId });
    expect(customerPost.status).toBe(403);
    expect(customerPost.body.error.code).toBe("FORBIDDEN");

    const unverifiedPost = await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ content: "A new table", locationId });
    expect(unverifiedPost.status).toBe(403);
    expect(unverifiedPost.body.error.code).toBe("ARTISAN_VERIFICATION_REQUIRED");
  });

  it("accepts private identity files, hides their keys, and records an admin approval", async () => {
    const pdf = Buffer.from("%PDF-1.7\nprivate test identity document");
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

    const submitted = await request(app)
      .post("/api/v1/verification/applications")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .field("documentType", "national_identity_card")
      .attach("document", pdf, { filename: "identity.pdf", contentType: "application/pdf" })
      .attach("selfie", png, { filename: "selfie.png", contentType: "image/png" })
      .expect(201);

    applicationId = submitted.body.data.id as string;
    expect(submitted.body.data.status).toBe("PENDING_REVIEW");

    const pendingPost = await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ content: "Still waiting for identity review.", locationId });
    expect(pendingPost.status).toBe(403);
    expect(pendingPost.body.error.code).toBe("VERIFICATION_PENDING");

    const ownStatus = await request(app)
      .get("/api/v1/verification/me")
      .set("Cookie", artisan.cookie)
      .expect(200);
    expect(JSON.stringify(ownStatus.body)).not.toContain("documentStorageKey");
    expect(JSON.stringify(ownStatus.body)).not.toContain("selfieStorageKey");

    await request(app)
      .get(`/api/v1/admin/verifications/${applicationId}/documents/document`)
      .set("Cookie", artisan.cookie)
      .expect(403);

    await request(app)
      .post(`/api/v1/admin/verifications/${applicationId}/approve`)
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ reason: "Unauthorized review attempt" })
      .expect(403);

    const queue = await request(app)
      .get("/api/v1/admin/verifications")
      .set("Cookie", adminCookie)
      .expect(200);
    expect(queue.body.data.some((item: { id: string }) => item.id === applicationId)).toBe(true);

    const document = await request(app)
      .get(`/api/v1/admin/verifications/${applicationId}/documents/document`)
      .set("Cookie", adminCookie)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(document.headers["cache-control"]).toContain("no-store");
    expect(document.body).toEqual(pdf);

    await request(app)
      .post(`/api/v1/admin/verifications/${applicationId}/approve`)
      .set("Origin", origin)
      .set("Cookie", adminCookie)
      .send({ reason: "Identity reviewed for the test flow." })
      .expect(200);

    const [application, audit] = await Promise.all([
      prisma.verificationApplication.findUniqueOrThrow({ where: { id: applicationId } }),
      prisma.adminAuditLog.findFirst({ where: { targetId: applicationId, action: "VERIFICATION_APPROVED" } }),
    ]);
    expect(application.status).toBe("APPROVED");
    expect(application.reviewedBy).toBe(adminUserId);
    expect(audit?.action).toBe("VERIFICATION_APPROVED");

    const publicProfile = await request(app)
      .get(`/api/v1/artisans/${(await prisma.user.findUniqueOrThrow({ where: { id: artisan.userId }, select: { username: true } })).username}`)
      .expect(200);
    expect(publicProfile.body.data.verificationStatus).toBe("approved");
    expect(JSON.stringify(publicProfile.body)).not.toContain("storageKey");
  });

  it("publishes only after approval and allows customers to read, like and comment", async () => {
    await prisma.artisanProfile.update({
      where: { userId: artisan.userId },
      data: {
        professionalTitle: "Furniture maker",
        professionalBio: "Test profile",
        skills: { create: { skill: { connect: { id: skillId } } } },
        serviceAreas: { create: { location: { connect: { id: locationId } } } },
      },
    });

    const published = await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ content: "A handcrafted dining table.", locationId })
      .expect(201);
    const postId = published.body.data.id as string;

    const artisanProfile = await prisma.artisanProfile.findUniqueOrThrow({
      where: { userId: artisan.userId },
      select: { id: true },
    });
    let databaseRejectedCustomerPost = false;
    try {
      await prisma.post.create({
        data: {
          authorId: customer.userId,
          artisanId: artisanProfile.id,
          content: "Direct database insert bypass attempt.",
          locationId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        databaseRejectedCustomerPost =
          error.code === "P2039" && error.message.includes("ARTISAN_VERIFICATION_REQUIRED");
        expect(error.message).toContain("ARTISAN_VERIFICATION_REQUIRED");
      }
    }
    expect(databaseRejectedCustomerPost).toBe(true);

    const feed = await request(app)
      .get("/api/v1/posts?limit=1")
      .set("Cookie", customer.cookie)
      .expect(200);
    expect(feed.body.data.items[0].id).toBe(postId);

    await request(app)
      .post(`/api/v1/posts/${postId}/like`)
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .expect(200);
    await request(app)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Origin", origin)
      .set("Cookie", customer.cookie)
      .send({ content: "Can you make a smaller version?" })
      .expect(201);

    const comments = await request(app)
      .get(`/api/v1/posts/${postId}/comments`)
      .set("Cookie", customer.cookie)
      .expect(200);
    expect(comments.body.data).toHaveLength(1);
    expect(comments.body.data[0].content).toBe("Can you make a smaller version?");
  });

  it("refuses publishing if account status changes after verification", async () => {
    await prisma.user.update({
      where: { id: artisan.userId },
      data: { accountStatus: "SUSPENDED" },
    });
    const response = await request(app)
      .post("/api/v1/posts")
      .set("Origin", origin)
      .set("Cookie", artisan.cookie)
      .send({ content: "Must not publish while suspended.", locationId });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("rejects foreign-origin mutations and exposes only structured API errors", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "https://untrusted.example")
      .send({ fullName: "Blocked user", email: email("blocked"), password: "A-long-test-password-2026", role: "customer" })
      .expect(403);
    expect(response.body).toEqual({
      success: false,
      error: { code: "CSRF_ORIGIN_REJECTED", message: "The request origin is not allowed." },
    });
  });
});
