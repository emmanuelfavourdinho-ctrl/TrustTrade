import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { prisma } from "../../database/client.js";
import { HttpError } from "../../utils/http-error.js";
import type { LoginInput, RegisterInput } from "./schemas.js";

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeUsername(fullName: string) {
  const base = fullName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 27);
  return `${base || "member"}-${randomBytes(3).toString("hex")}`.slice(0, 40);
}

export async function registerAccount(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "An account with that email already exists.");
  }
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          fullName: input.fullName.trim(),
          username: makeUsername(input.fullName),
          email,
          passwordHash,
          role: input.role === "artisan" ? "ARTISAN" : "CUSTOMER",
          profile: { create: {} },
          ...(input.role === "artisan" ? { artisanProfile: { create: {} } } : {}),
        },
        select: { id: true },
      });

      return user;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const emailExists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (emailExists) {
        throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "An account with that email already exists.");
      }
    }
    throw error;
  }
}

export async function authenticateAccount(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      accountStatus: true,
    },
  });

  if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  if (user.accountStatus === "BANNED" || user.accountStatus === "DEACTIVATED") {
    throw new HttpError(403, "ACCOUNT_UNAVAILABLE", "This account cannot sign in.");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(rawToken),
      expiresAt,
    },
  });

  return {
    token: rawToken,
    expiresAt,
    user: { id: user.id, role: user.role },
  };
}

export async function revokeSession(rawToken: string) {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(rawToken) },
  });
}

export async function getSession(rawToken: string) {
  return prisma.session.findFirst({
    where: {
      tokenHash: hashSessionToken(rawToken),
      expiresAt: { gt: new Date() },
      user: {
        accountStatus: { notIn: ["BANNED", "DEACTIVATED"] },
      },
    },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          role: true,
          accountStatus: true,
        },
      },
    },
  });
}
