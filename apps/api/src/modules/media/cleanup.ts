import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../database/client.js";
import { deleteCloudinaryAsset } from "./cloudinary.js";

const cleanupBatchSize = 100;
const unattachedMediaGracePeriodMs = 24 * 60 * 60 * 1000;

export async function cleanupOrphanedMedia(now = new Date()) {
  let expiredUploadsRemoved = 0;
  let unattachedMediaRemoved = 0;
  const failures: unknown[] = [];

  const expiredIntents = await prisma.mediaUploadIntent.findMany({
    where: { completedAt: null, expiresAt: { lte: now } },
    take: cleanupBatchSize,
    orderBy: { expiresAt: "asc" },
  });
  for (const intent of expiredIntents) {
    try {
      await deleteCloudinaryAsset(intent.publicId, intent.resourceType);
      await prisma.mediaUploadIntent.deleteMany({
        where: { id: intent.id, completedAt: null },
      });
      expiredUploadsRemoved += 1;
    } catch (error) {
      console.error("Could not clean up expired media upload.", { intentId: intent.id, error });
      failures.push(error);
    }
  }

  const cutoff = new Date(now.getTime() - unattachedMediaGracePeriodMs);
  const oldMedia = await prisma.media.findMany({
    where: {
      status: { in: ["ACTIVE", "DELETING"] },
      createdAt: { lte: cutoff },
      profilePhotoFor: null,
      coverPhotoFor: null,
      postMedia: null,
      portfolioMedia: null,
    },
    take: cleanupBatchSize,
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  for (const candidate of oldMedia) {
    try {
      const media = await prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM media WHERE id = ${candidate.id}::uuid FOR UPDATE
        `;
        const current = await transaction.media.findUnique({
          where: { id: candidate.id },
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
        if (!current) return null;
        if (
          current.profilePhotoFor ||
          current.coverPhotoFor ||
          current.postMedia ||
          current.portfolioMedia
        ) return null;
        if (current.status === "DELETING") {
          return {
            id: current.id,
            publicId: current.publicId,
            resourceType: current.resourceType,
          };
        }
        return transaction.media.update({
          where: { id: current.id },
          data: { status: "DELETING" },
          select: { id: true, publicId: true, resourceType: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (!media) continue;

      await deleteCloudinaryAsset(media.publicId, media.resourceType);
      await prisma.media.delete({ where: { id: media.id } });
      unattachedMediaRemoved += 1;
    } catch (error) {
      console.error("Could not clean up unattached media.", { mediaId: candidate.id, error });
      failures.push(error);
    }
  }

  if (failures.length) {
    throw new Error(`Media cleanup failed for ${failures.length} item(s).`);
  }
  return { expiredUploadsRemoved, unattachedMediaRemoved };
}
