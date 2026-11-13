import type { Metadata } from "next";
import { ArtisanProfileView } from "@/components/artisan-profile-view";

export const metadata: Metadata = { title: "Professional profile" };

export default async function ArtisanProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ArtisanProfileView username={username} />;
}
