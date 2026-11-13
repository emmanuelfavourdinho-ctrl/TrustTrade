import { z } from "zod";

export const artisanSearchSchema = z.object({
  query: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(100).optional(),
});

export const artisanUsernameSchema = z.object({
  username: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
});

export const profileUpdateSchema = z.object({
  professionalTitle: z.string().trim().min(2).max(120),
  professionalBio: z.string().trim().max(3000),
  experienceYears: z.number().int().min(0).max(80),
  skillIds: z.array(z.uuid()).max(20),
  serviceAreaIds: z.array(z.uuid()).min(1).max(20),
});
