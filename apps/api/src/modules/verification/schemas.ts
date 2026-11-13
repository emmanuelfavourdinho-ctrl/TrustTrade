import { z } from "zod";

export const verificationSubmissionSchema = z.object({
  documentType: z.string().trim().min(2).max(80),
});

export const verificationDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(2000).optional(),
});

export const verificationIdSchema = z.object({
  applicationId: z.uuid(),
});
