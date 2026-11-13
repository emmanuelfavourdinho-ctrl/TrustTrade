import { createReadStream, promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Router } from "express";
import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { authenticate, requireActiveAccount, requireRole } from "../../middleware/authenticate.js";
import { HttpError } from "../../utils/http-error.js";
import { apiSuccess } from "../../utils/response.js";
import { verificationStoragePath, verificationUpload, sniffDocumentType } from "./upload.js";
import { verificationDecisionSchema, verificationIdSchema, verificationSubmissionSchema } from "./schemas.js";

const router = Router();

function getUploadedFiles(request: Request) {
  const files = request.files as Record<string, Express.Multer.File[]> | undefined;
  const document = files?.document?.[0];
  const selfie = files?.selfie?.[0];
  if (!document || !selfie) {
    throw new HttpError(422, "DOCUMENTS_REQUIRED", "Upload one identity document and one selfie.");
  }
  return [document, selfie] as const;
}

async function removeUploadedFiles(request: Request) {
  const files = request.files as Record<string, Express.Multer.File[]> | undefined;
  await Promise.all(
    Object.values(files ?? {}).flat().map((file) => fs.unlink(file.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    })),
  );
}

router.post(
  "/applications",
  authenticate,
  requireActiveAccount,
  requireRole("ARTISAN"),
  verificationUpload.fields([
    { name: "document", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (request, response) => {
    try {
      const parsedBody = verificationSubmissionSchema.safeParse(request.body);
      if (!parsedBody.success) {
        throw new HttpError(422, "VALIDATION_ERROR", parsedBody.error.issues[0]?.message ?? "The submission is invalid.");
      }
      const body = parsedBody.data;
      const [document, selfie] = getUploadedFiles(request);
      const [documentBytes, selfieBytes] = await Promise.all([
        fs.readFile(document.path),
        fs.readFile(selfie.path),
      ]);
      const documentType = sniffDocumentType(documentBytes, true);
      const selfieType = sniffDocumentType(selfieBytes, false);
      if (!documentType || !selfieType || selfieType.extension === "pdf") {
        throw new HttpError(415, "INVALID_FILE_CONTENT", "The uploaded file contents do not match an accepted identity document or selfie format.");
      }

      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: request.auth!.user.id },
        select: { id: true, verificationStatus: true },
      });
      if (!artisan) throw new HttpError(404, "ARTISAN_PROFILE_NOT_FOUND", "This artisan profile could not be found.");
      if (artisan.verificationStatus === "APPROVED" || artisan.verificationStatus === "PENDING_REVIEW") {
        throw new HttpError(409, "APPLICATION_NOT_ALLOWED", "There is already an approved or pending verification application.");
      }

      const documentKey = `${randomUUID()}.${documentType.extension}`;
      const selfieKey = `${randomUUID()}.${selfieType.extension}`;
      try {
        await fs.rename(document.path, resolve(verificationStoragePath, documentKey));
        await fs.rename(selfie.path, resolve(verificationStoragePath, selfieKey));
        const application = await prisma.$transaction(async (transaction) => {
          await transaction.$queryRaw`
            SELECT id FROM artisan_profiles
            WHERE id = ${artisan.id}::uuid
            FOR UPDATE
          `;
          const currentArtisan = await transaction.artisanProfile.findUniqueOrThrow({
            where: { id: artisan.id },
            select: { verificationStatus: true },
          });
          if (currentArtisan.verificationStatus === "APPROVED" || currentArtisan.verificationStatus === "PENDING_REVIEW") {
            throw new HttpError(409, "APPLICATION_NOT_ALLOWED", "There is already an approved or pending verification application.");
          }

          const created = await transaction.verificationApplication.create({
            data: {
              artisanId: artisan.id,
              applicantId: request.auth!.user.id,
              documentType: body.documentType,
              documentStorageKey: documentKey,
              selfieStorageKey: selfieKey,
              status: "PENDING_REVIEW",
            },
            select: { id: true, status: true, createdAt: true },
          });
          await transaction.verificationDecision.create({
            data: {
              applicationId: created.id,
              actorId: request.auth!.user.id,
              decision: "SUBMITTED",
            },
          });
          await transaction.artisanProfile.update({
            where: { id: artisan.id },
            data: { verificationStatus: "PENDING_REVIEW" },
          });
          return created;
        });

        apiSuccess(response, application, "Verification application submitted.", 201);
      } catch (error) {
        const cleanup = await Promise.allSettled([
          fs.unlink(resolve(verificationStoragePath, documentKey)).catch((unlinkError: NodeJS.ErrnoException) => {
            if (unlinkError.code !== "ENOENT") throw unlinkError;
          }),
          fs.unlink(resolve(verificationStoragePath, selfieKey)).catch((unlinkError: NodeJS.ErrnoException) => {
            if (unlinkError.code !== "ENOENT") throw unlinkError;
          }),
        ]);
        for (const result of cleanup) {
          if (result.status === "rejected") console.error("Could not remove failed verification upload.", result.reason);
        }
        throw error;
      }
    } catch (error) {
      try {
        await removeUploadedFiles(request);
      } catch (cleanupError) {
        console.error("Could not remove temporary verification upload.", cleanupError);
      }
      throw error;
    }
  },
);

router.get("/me", authenticate, requireRole("ARTISAN"), async (request, response) => {
  const artisan = await prisma.artisanProfile.findUnique({
    where: { userId: request.auth!.user.id },
    select: {
      verificationStatus: true,
      verificationApps: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          documentType: true,
          status: true,
          reviewedAt: true,
          rejectionReason: true,
          reviewNotes: true,
          createdAt: true,
          decisions: {
            orderBy: { createdAt: "asc" },
            select: { decision: true, reason: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!artisan) throw new HttpError(404, "ARTISAN_PROFILE_NOT_FOUND", "This artisan profile could not be found.");
  apiSuccess(response, artisan);
});

const adminRouter = Router();
adminRouter.use(authenticate, requireActiveAccount, requireRole("ADMIN"));

adminRouter.get("/verifications", async (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50);
  const applications = await prisma.verificationApplication.findMany({
    where: { status: "PENDING_REVIEW" },
    take: limit,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      documentType: true,
      status: true,
      createdAt: true,
      applicant: { select: { id: true, fullName: true, username: true } },
      artisan: { select: { professionalTitle: true } },
    },
  });
  apiSuccess(response, applications);
});

adminRouter.get("/verifications/:applicationId/documents/:kind", async (request, response) => {
  const parsed = verificationIdSchema.safeParse(request.params);
  if (!parsed.success) throw new HttpError(400, "INVALID_APPLICATION_ID", "The application ID is invalid.");
  const kind = request.params.kind;
  if (kind !== "document" && kind !== "selfie") {
    throw new HttpError(404, "DOCUMENT_NOT_FOUND", "The requested document could not be found.");
  }

  const application = await prisma.verificationApplication.findUnique({
    where: { id: parsed.data.applicationId },
    select: { documentStorageKey: true, selfieStorageKey: true },
  });
  if (!application) throw new HttpError(404, "APPLICATION_NOT_FOUND", "The verification application could not be found.");

  await prisma.adminAuditLog.create({
    data: {
      actorId: request.auth!.user.id,
      action: `VERIFICATION_${kind.toUpperCase()}_ACCESSED`,
      targetType: "VERIFICATION",
      targetId: parsed.data.applicationId,
      ipAddress: request.ip,
    },
  });

  const storageKey = kind === "document" ? application.documentStorageKey : application.selfieStorageKey;
  const path = resolve(verificationStoragePath, storageKey);
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Disposition", `attachment; filename="${kind}"`);
  response.setHeader(
    "Content-Type",
    storageKey.endsWith(".pdf") ? "application/pdf" : storageKey.endsWith(".png") ? "image/png" : "image/jpeg",
  );
  createReadStream(path).on("error", (error) => {
    if (!response.headersSent) response.status(404).end();
    else response.destroy(error);
  }).pipe(response);
});

async function decideVerification(
  request: Request,
  response: Response,
  status: "APPROVED" | "REJECTED" | "NEEDS_RESUBMISSION",
  decision: "APPROVED" | "REJECTED" | "RESUBMISSION_REQUESTED",
) {
  const params = verificationIdSchema.safeParse(request.params);
  const body = verificationDecisionSchema.safeParse(request.body);
  if (!params.success) throw new HttpError(400, "INVALID_APPLICATION_ID", "The application ID is invalid.");
  if (!body.success) throw new HttpError(422, "VALIDATION_ERROR", body.error.issues[0]?.message ?? "The review decision is invalid.");

  const application = await prisma.$transaction(async (transaction) => {
    const current = await transaction.verificationApplication.findUnique({
      where: { id: params.data.applicationId },
      select: {
        id: true,
        artisanId: true,
        applicantId: true,
        status: true,
        artisan: { select: { userId: true, verificationStatus: true } },
      },
    });
    if (!current) throw new HttpError(404, "APPLICATION_NOT_FOUND", "The verification application could not be found.");
    if (current.applicantId === request.auth!.user.id) {
      throw new HttpError(403, "SELF_REVIEW_FORBIDDEN", "Administrators cannot review their own applications.");
    }
    if (current.status !== "PENDING_REVIEW") {
      throw new HttpError(409, "APPLICATION_ALREADY_REVIEWED", "Only pending applications can be reviewed.");
    }

    const updated = await transaction.verificationApplication.update({
      where: { id: current.id },
      data: {
        status,
        reviewedBy: request.auth!.user.id,
        reviewedAt: new Date(),
        rejectionReason: status === "REJECTED" ? body.data.reason : null,
        reviewNotes: body.data.notes,
      },
      select: { id: true, artisanId: true, status: true },
    });
    await transaction.artisanProfile.update({
      where: { id: current.artisanId },
      data: { verificationStatus: status },
    });
    await transaction.verificationDecision.create({
      data: {
        applicationId: current.id,
        actorId: request.auth!.user.id,
        decision,
        reason: body.data.reason,
        notes: body.data.notes,
      },
    });
    await transaction.adminAuditLog.create({
      data: {
        actorId: request.auth!.user.id,
        action: `VERIFICATION_${decision}`,
        targetType: "VERIFICATION",
        targetId: current.id,
        previousValues: { status: current.status },
        newValues: { status },
        reason: body.data.reason,
        ipAddress: request.ip,
      },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  apiSuccess(response, application, "Verification decision recorded.");
}

adminRouter.post("/verifications/:applicationId/approve", async (request, response) => {
  await decideVerification(request, response, "APPROVED", "APPROVED");
});
adminRouter.post("/verifications/:applicationId/reject", async (request, response) => {
  await decideVerification(request, response, "REJECTED", "REJECTED");
});
adminRouter.post("/verifications/:applicationId/request-resubmission", async (request, response) => {
  await decideVerification(request, response, "NEEDS_RESUBMISSION", "RESUBMISSION_REQUESTED");
});

export const verificationRouter = router;
export const adminVerificationRouter = adminRouter;
