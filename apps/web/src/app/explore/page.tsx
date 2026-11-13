import type { Metadata } from "next";
import { ExploreView } from "@/components/explore-view";
import type { ArtisanSearchParams } from "@trusttrade/shared";

export const metadata: Metadata = {
  title: "Find a professional",
  description:
    "Search for skilled professionals by service and locality on TrustTrade.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const getFirst = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const initialParams: ArtisanSearchParams = {
    query: getFirst(params.query)?.slice(0, 100),
    category: getFirst(params.category)?.slice(0, 80),
    locality: getFirst(params.locality)?.slice(0, 100),
  };

  return <ExploreView initialParams={initialParams} />;
}
