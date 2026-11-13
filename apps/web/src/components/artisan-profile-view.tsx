"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, MapPin } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { getArtisanProfile } from "@/lib/api/artisans";

export function ArtisanProfileView({ username }: { username: string }) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["artisan", "profile", username],
    queryFn: () => getArtisanProfile(username),
    retry: 0,
  });

  return (
    <PageShell>
      <section className="bg-cream">
        <div className="mx-auto max-w-page px-5 py-10 sm:px-8 md:py-16">
          <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand" href="/explore">
            <ArrowLeft aria-hidden="true" size={16} /> Back to professionals
          </Link>

          {isPending && (
            <div className="mt-10 max-w-3xl animate-pulse" aria-label="Loading profile" aria-live="polite">
              <div className="h-4 w-36 bg-white" />
              <div className="mt-5 h-12 w-2/3 bg-white" />
              <div className="mt-4 h-4 w-1/2 bg-white" />
            </div>
          )}

          {error && (
            <div className="mt-10 max-w-2xl border-l-2 border-amber-700 bg-amber-50 px-5 py-5" role="alert">
              <h1 className="font-display text-3xl tracking-[-0.04em]">This profile is unavailable.</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                {error instanceof Error ? error.message : "The request could not be completed."}
              </p>
              <button
                className="mt-4 min-h-11 text-sm font-semibold text-brand underline underline-offset-4"
                onClick={() => void refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {data && (
            <article className="mt-10 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                {data.category}
              </p>
              <h1 className="mt-4 font-display text-4xl leading-[1.1] tracking-[-0.02em] sm:text-6xl">
                {data.displayName}
              </h1>
              <p className="mt-4 text-lg text-muted">{data.headline}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <MapPin aria-hidden="true" size={16} />
                  {data.locality}
                </span>
                <span className="flex items-center gap-2">
                  {data.verificationStatus === "approved" && (
                    <BadgeCheck aria-hidden="true" className="text-brand" size={16} />
                  )}
                  {data.verificationStatus === "approved" ? "Identity reviewed" : "Not verified"}
                </span>
              </div>
            </article>
          )}
        </div>
      </section>

      {data && (
        <section className="bg-white">
          <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:px-8 md:grid-cols-[0.7fr_1.3fr] md:gap-20 md:py-20">
            <h2 className="font-display text-3xl tracking-[-0.04em]">About this professional</h2>
            <div>
              <p className="whitespace-pre-line text-base leading-7 text-muted">
                {data.bio || "This professional has not added an introduction yet."}
              </p>
              <h3 className="mt-10 border-t border-line pt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Service areas
              </h3>
              {data.serviceAreas.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
                  {data.serviceAreas.map((area) => <li key={area}>{area}</li>)}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">No service areas have been added.</p>
              )}
              <p className="mt-10 border-l-2 border-brand pl-4 text-sm leading-6 text-muted">
                Verification confirms an identity review only. Discuss scope,
                availability and terms directly with the professional. TrustTrade
                does not handle payment for services.
              </p>
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
