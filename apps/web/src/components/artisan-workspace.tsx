"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CircleAlert, Clock3 } from "lucide-react";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { getMyVerification } from "@/lib/api/auth";

const verificationLabels: Record<string, { title: string; detail: string; icon: typeof BadgeCheck }> = {
  NOT_VERIFIED: {
    title: "Identity not yet verified",
    detail: "Submit identity documents for review. Verification is free and does not guarantee service quality.",
    icon: CircleAlert,
  },
  NOT_SUBMITTED: {
    title: "Identity not yet verified",
    detail: "Submit identity documents for review. Verification is free and does not guarantee service quality.",
    icon: CircleAlert,
  },
  PENDING_REVIEW: {
    title: "Review in progress",
    detail: "Your application is awaiting an administrator decision. Publishing stays unavailable until approval.",
    icon: Clock3,
  },
  PENDING: {
    title: "Review in progress",
    detail: "Your application is awaiting an administrator decision. Publishing stays unavailable until approval.",
    icon: Clock3,
  },
  APPROVED: {
    title: "Identity reviewed",
    detail: "Your identity review is approved. This confirms identity review only, not service quality.",
    icon: BadgeCheck,
  },
  REJECTED: {
    title: "Application not approved",
    detail: "Review the decision details and follow the resubmission process if one is available.",
    icon: CircleAlert,
  },
  NEEDS_RESUBMISSION: {
    title: "More information requested",
    detail: "Review the administrator's request and submit updated information.",
    icon: CircleAlert,
  },
  RESUBMISSION_REQUIRED: {
    title: "More information requested",
    detail: "Review the administrator's request and submit updated information.",
    icon: CircleAlert,
  },
  SUSPENDED: {
    title: "Verification suspended",
    detail: "Professional publishing is unavailable while verification is suspended.",
    icon: CircleAlert,
  },
};

function ArtisanDashboardContent() {
  const verification = useQuery({
    queryKey: ["artisan", "verification"],
    queryFn: getMyVerification,
    retry: 0,
  });
  const status = verification.data?.verificationStatus.toUpperCase();
  const current = status ? verificationLabels[status] : undefined;
  const Icon = current?.icon ?? CircleAlert;
  const canPublish = status === "APPROVED";

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-b border-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Professional workspace</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Your work, made visible.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Manage your public profile and verification. TrustTrade does not process payments for services.
        </p>
      </header>

      <section className="mt-7 border-l-2 border-brand bg-paper px-5 py-5 sm:px-7" aria-live="polite">
        {verification.isPending && <p className="text-sm text-muted">Loading your verification status…</p>}
        {verification.isError && (
          <div role="alert">
            <h2 className="font-semibold">Verification status could not be loaded.</h2>
            <p className="mt-2 text-sm text-muted">
              {verification.error instanceof Error ? verification.error.message : "Try again shortly."}
            </p>
            <button className="mt-3 min-h-11 text-sm font-semibold text-brand underline underline-offset-4" onClick={() => void verification.refetch()} type="button">Try again</button>
          </div>
        )}
        {verification.data && (
          <>
            <div className="flex items-start gap-3">
              <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-brand" size={20} />
              <div>
                <h2 className="font-semibold">{current?.title ?? `Verification status: ${verification.data.verificationStatus}`}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {current?.detail ?? "See your verification page for the latest application details."}
                </p>
                <Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4" href="/artisan/verification">
                  View verification <ArrowRight aria-hidden="true" size={15} />
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mt-10 grid gap-0 border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-line">
        <article className="py-6 sm:pr-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Public presence</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em]">Keep your profile useful.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add a professional title, experience, skills and service localities so customers can understand your work.
          </p>
          <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4" href="/artisan/profile/edit">Edit professional profile</Link>
        </article>
        <article className="border-t border-line py-6 sm:border-t-0 sm:pl-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Publishing</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{canPublish ? "Share a service post." : "Approval is required to publish."}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {canPublish
              ? "Publish a professional service post with the work and service area you want customers to see."
              : "Only artisans with approved identity verification can publish professional service posts."}
          </p>
          <Link
            aria-disabled={!canPublish}
            className={`mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 ${
              canPublish ? "text-brand" : "pointer-events-none text-muted"
            }`}
            href={canPublish ? "/artisan/posts/create" : "/artisan/verification"}
          >
            {canPublish ? "Create a post" : "Continue verification"}
          </Link>
        </article>
      </section>
    </div>
  );
}

export function ArtisanDashboard() {
  return (
    <AuthenticatedApp allowedRoles={["artisan"]}>
      <ArtisanDashboardContent />
    </AuthenticatedApp>
  );
}
