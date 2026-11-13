"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { getVerificationQueue } from "@/lib/api/admin";

function AdminOverview() {
  const queue = useQuery({
    queryKey: ["admin", "verification-queue"],
    queryFn: getVerificationQueue,
    retry: 0,
  });

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">TrustTrade operations</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Administration</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Operational tools are limited to endpoints currently exposed by the backend.</p>
      <div className="mt-8 border-y border-line bg-paper px-5 py-5 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Identity review</p>
        {queue.isPending && <p className="mt-2 text-sm text-muted">Loading review queue…</p>}
        {queue.isError && <p className="mt-2 text-sm text-red-800" role="alert">{queue.error instanceof Error ? queue.error.message : "The review queue is unavailable."}</p>}
        {queue.data && (
          <>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{queue.data.length}</p>
            <p className="mt-1 text-sm text-muted">pending applications in the current API response</p>
          </>
        )}
        <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href="/admin/verifications">Open verification queue</Link>
      </div>
      <p className="mt-6 text-sm leading-6 text-muted">
        User management, reports, post moderation and audit-log endpoints are not currently available; no fabricated metrics or controls are shown.
      </p>
    </section>
  );
}

export default function AdminPage() {
  return (
    <AuthenticatedApp allowedRoles={["admin"]}>
      <AdminOverview />
    </AuthenticatedApp>
  );
}
