"use client";

import Link from "next/link";
import { AuthenticatedApp, useCurrentUser } from "@/components/authenticated-app";

function AccountDetails() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Account</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Your profile</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
        These details come from your TrustTrade account. Profile editing is not yet available through the current account API.
      </p>
      <dl className="mt-8 divide-y divide-line border-y border-line bg-paper">
        {[
          ["Full name", user.fullName],
          ["Username", `@${user.username}`],
          ["Email", user.email],
          ["Account type", user.role],
          ["Account status", user.accountStatus.toLowerCase()],
        ].map(([label, value]) => (
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4" key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="break-words text-sm font-medium capitalize text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {user.role === "artisan" && (
        <Link className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href={`/artisans/${encodeURIComponent(user.username)}`}>
          View your public professional profile
        </Link>
      )}
    </section>
  );
}

export default function ProfilePage() {
  return (
    <AuthenticatedApp>
      <AccountDetails />
    </AuthenticatedApp>
  );
}
