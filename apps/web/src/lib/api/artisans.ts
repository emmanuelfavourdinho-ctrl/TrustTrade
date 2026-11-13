import {
  artisanSearchResultSchema,
  artisanSearchParamsSchema,
  artisanSearchResponseSchema,
  type ArtisanSearchParams,
} from "@trusttrade/shared";
import { apiRequest } from "./client";
import { z } from "zod";

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  skills: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  })),
});

const locationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  city: z.string(),
  region: z.string(),
});

export function getArtisanCatalog() {
  return apiRequest("/api/v1/artisans/catalog/categories", z.array(categorySchema));
}

export function getLocationCatalog() {
  return apiRequest("/api/v1/artisans/catalog/locations", z.array(locationSchema));
}

export function updateArtisanProfile(input: {
  professionalTitle: string;
  professionalBio: string;
  experienceYears: number;
  skillIds: string[];
  serviceAreaIds: string[];
}) {
  return apiRequest(
    "/api/v1/artisans/me/profile",
    z.object({ message: z.string() }),
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function searchArtisans(input: ArtisanSearchParams) {
  const params = artisanSearchParamsSchema.parse(input);
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.size ? `?${search.toString()}` : "";
  return apiRequest(
    `/api/v1/artisans${query}`,
    artisanSearchResponseSchema,
  );
}

export function getArtisanProfile(username: string) {
  return apiRequest(
    `/api/v1/artisans/${encodeURIComponent(username)}`,
    artisanSearchResultSchema.extend({
      bio: z.string(),
      serviceAreas: z.array(z.string()),
      coverUrl: z.url().nullable(),
      portfolio: z.array(z.object({
        id: z.string(),
        displayOrder: z.number().int(),
        url: z.url(),
      })),
    }),
  );
}
