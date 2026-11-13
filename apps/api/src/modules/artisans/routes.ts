import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../database/client.js";
import { authenticate, requireActiveAccount, requireRole } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { apiSuccess } from "../../utils/response.js";
import { HttpError } from "../../utils/http-error.js";
import { optimizedMediaUrl } from "../media/cloudinary.js";
import { artisanSearchSchema, artisanUsernameSchema, profileUpdateSchema } from "./schemas.js";

const router = Router();

function publicStatus(status: string) {
  switch (status) {
    case "PENDING_REVIEW": return "pending";
    case "APPROVED": return "approved";
    case "REJECTED": return "rejected";
    case "NEEDS_RESUBMISSION": return "resubmission_required";
    default: return "not_submitted";
  }
}

router.get("/", async (request, response) => {
  const parsed = artisanSearchSchema.safeParse(request.query);
  if (!parsed.success) {
    throw new HttpError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid search filters.");
  }
  const { query, category, locality } = parsed.data;
  const artisans = await prisma.artisanProfile.findMany({
    where: {
      user: { accountStatus: "ACTIVE" },
      ...(query ? {
        OR: [
          { professionalTitle: { contains: query, mode: "insensitive" } },
          { professionalBio: { contains: query, mode: "insensitive" } },
          { user: { fullName: { contains: query, mode: "insensitive" } } },
          { skills: { some: { skill: { name: { contains: query, mode: "insensitive" } } } } },
        ],
      } : {}),
      ...(category ? {
        skills: { some: { skill: { category: { name: { equals: category, mode: "insensitive" } } } } },
      } : {}),
      ...(locality ? {
        serviceAreas: {
          some: {
            location: {
              isActive: true,
              OR: [
                { name: { contains: locality, mode: "insensitive" } },
                { city: { contains: locality, mode: "insensitive" } },
              ],
            },
          },
        },
      } : {}),
    },
    take: 50,
    orderBy: [{ verificationStatus: "desc" }, { totalReviews: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      professionalTitle: true,
      verificationStatus: true,
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          profile: { select: { profilePhotoMedia: { select: { publicId: true, resourceType: true, status: true } } } },
        },
      },
      skills: {
        take: 1,
        orderBy: { skill: { name: "asc" } },
        select: { skill: { select: { category: { select: { name: true } } } } },
      },
      serviceAreas: {
        take: 1,
        orderBy: { location: { city: "asc" } },
        select: { location: { select: { name: true, city: true } } },
      },
    },
  });

  apiSuccess(response, artisans.map((artisan) => ({
    id: artisan.user.id,
    username: artisan.user.username,
    displayName: artisan.user.fullName,
    headline: artisan.professionalTitle,
    category: artisan.skills[0]?.skill.category.name ?? "Professional services",
    locality: artisan.serviceAreas[0]?.location.name ?? artisan.serviceAreas[0]?.location.city ?? "",
    verificationStatus: publicStatus(artisan.verificationStatus),
    avatarUrl: artisan.user.profile?.profilePhotoMedia?.status === "ACTIVE"
      ? optimizedMediaUrl(artisan.user.profile.profilePhotoMedia.publicId, "IMAGE", 128, 128, "fill", "face")
      : null,
  })));
});

router.get("/catalog/categories", async (_request, response) => {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      skills: { select: { id: true, name: true, slug: true } },
    },
  });
  apiSuccess(response, categories);
});

router.get("/catalog/locations", async (_request, response) => {
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: { id: true, name: true, city: true, region: true },
  });
  apiSuccess(response, locations);
});

router.get("/:username", async (request, response) => {
  const parsed = artisanUsernameSchema.safeParse(request.params);
  if (!parsed.success) throw new HttpError(400, "INVALID_USERNAME", "The username is invalid.");

  const artisan = await prisma.artisanProfile.findFirst({
    where: {
      user: { username: parsed.data.username, accountStatus: "ACTIVE" },
    },
    select: {
      professionalTitle: true,
      professionalBio: true,
      verificationStatus: true,
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          profile: {
            select: {
              profilePhotoMedia: { select: { publicId: true, resourceType: true, status: true } },
              coverPhotoMedia: { select: { publicId: true, resourceType: true, status: true } },
            },
          },
        },
      },
      skills: {
        take: 1,
        orderBy: { skill: { name: "asc" } },
        select: { skill: { select: { category: { select: { name: true } } } } },
      },
      serviceAreas: {
        orderBy: { location: { city: "asc" } },
        select: { location: { select: { name: true, city: true } } },
      },
      portfolioMedia: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          displayOrder: true,
          media: { select: { publicId: true, resourceType: true, status: true } },
        },
      },
    },
  });

  if (!artisan) throw new HttpError(404, "ARTISAN_NOT_FOUND", "This professional profile could not be found.");

  apiSuccess(response, {
    id: artisan.user.id,
    username: artisan.user.username,
    displayName: artisan.user.fullName,
    headline: artisan.professionalTitle,
    category: artisan.skills[0]?.skill.category.name ?? "Professional services",
    locality: artisan.serviceAreas[0]?.location.name ?? artisan.serviceAreas[0]?.location.city ?? "",
    verificationStatus: publicStatus(artisan.verificationStatus),
    bio: artisan.professionalBio,
    serviceAreas: artisan.serviceAreas.map((area) => area.location.name),
    avatarUrl: artisan.user.profile?.profilePhotoMedia?.status === "ACTIVE"
      ? optimizedMediaUrl(artisan.user.profile.profilePhotoMedia.publicId, "IMAGE", 256, 256, "fill", "face")
      : null,
    coverUrl: artisan.user.profile?.coverPhotoMedia?.status === "ACTIVE"
      ? optimizedMediaUrl(artisan.user.profile.coverPhotoMedia.publicId, "IMAGE", 1600, 600, "fill", "auto")
      : null,
    portfolio: artisan.portfolioMedia
      .filter((entry) => entry.media.status === "ACTIVE")
      .map((entry) => ({
        id: entry.id,
        displayOrder: entry.displayOrder,
        url: optimizedMediaUrl(entry.media.publicId, "IMAGE", 1600, 1200),
      })),
  });
});

router.patch(
  "/me/profile",
  authenticate,
  requireActiveAccount,
  requireRole("ARTISAN"),
  validateBody(profileUpdateSchema),
  async (request, response) => {
    const body = request.body as z.infer<typeof profileUpdateSchema>;
    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: request.auth!.user.id },
      select: { id: true },
    });
    if (!artisan) throw new HttpError(404, "ARTISAN_PROFILE_NOT_FOUND", "Create an artisan account to manage this profile.");

    await prisma.$transaction(async (transaction) => {
      const skills = await transaction.skill.findMany({
        where: { id: { in: body.skillIds }, category: { isActive: true } },
        select: { id: true },
      });
      const locations = await transaction.location.findMany({
        where: { id: { in: body.serviceAreaIds }, isActive: true },
        select: { id: true },
      });
      if (skills.length !== new Set(body.skillIds).size || locations.length !== new Set(body.serviceAreaIds).size) {
        throw new HttpError(422, "INVALID_SKILL_OR_LOCATION", "Choose active skills and service areas.");
      }

      await transaction.artisanProfile.update({
        where: { id: artisan.id },
        data: {
          professionalTitle: body.professionalTitle,
          professionalBio: body.professionalBio,
          experienceYears: body.experienceYears,
          skills: {
            deleteMany: {},
            create: body.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })),
          },
          serviceAreas: {
            deleteMany: {},
            create: body.serviceAreaIds.map((locationId) => ({ location: { connect: { id: locationId } } })),
          },
        },
      });
    });

    apiSuccess(response, { message: "Professional profile updated." });
  },
);

export const artisanRouter = router;
