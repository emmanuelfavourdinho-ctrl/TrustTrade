import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../database/client.js";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const fullName = process.env.ADMIN_FULL_NAME?.trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !fullName || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_FULL_NAME, and an ADMIN_INITIAL_PASSWORD of at least 12 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error("An account already uses ADMIN_EMAIL. No account was changed.");

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const username = `admin-${randomUUID().slice(0, 8)}`;
  await prisma.user.create({
    data: {
      fullName,
      username,
      email,
      passwordHash,
      role: "ADMIN",
      profile: { create: {} },
    },
    select: { id: true },
  });
  console.info(`Administrator provisioned for ${email}. Remove ADMIN_INITIAL_PASSWORD from the environment.`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      console.error("The admin username or email is already in use.");
    } else {
      console.error(error instanceof Error ? error.message : "Administrator provisioning failed.");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
