import { z } from "zod";

export const uploadAuthorizationSchema = z.object({
  purpose: z.enum(["PROFILE_AVATAR", "PROFILE_COVER", "ARTISAN_PORTFOLIO", "POST"]),
  contentType: z.string().trim().min(1).max(100),
});

export const completeUploadSchema = z.object({
  publicId: z.string().min(1).max(500),
  assetId: z.string().min(1).max(100),
});

export const mediaIdSchema = z.object({
  mediaId: z.uuid(),
});

export const profileMediaSchema = z.object({
  profilePhotoMediaId: z.uuid().nullable().optional(),
  coverPhotoMediaId: z.uuid().nullable().optional(),
}).refine((value) => value.profilePhotoMediaId !== undefined || value.coverPhotoMediaId !== undefined);

export const portfolioMediaSchema = z.object({
  mediaIds: z.array(z.uuid()).min(1).max(20).refine((ids) => new Set(ids).size === ids.length),
});

export const portfolioEntryIdSchema = z.object({
  entryId: z.uuid(),
});
