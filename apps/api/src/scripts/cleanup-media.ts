import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../database/client.js";
import { cleanupOrphanedMedia } from "../modules/media/cleanup.js";

async function main() {
  const result = await cleanupOrphanedMedia();
  console.info("Media cleanup completed.", result);
}

main()
  .catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Media cleanup failed due to a database error.", error.code);
    } else {
      console.error("Media cleanup did not complete successfully.", error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
