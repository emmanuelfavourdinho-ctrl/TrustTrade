import Link from "next/link";
import type { ReactNode } from "react";
import { AuthenticatedApp } from "@/components/authenticated-app";
import type { CurrentUser } from "@/lib/api/auth";

export function BackendCapabilityNotice({
  title,
  description,
  children,
  allowedRoles,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  allowedRoles?: CurrentUser["role"][];
}) {
  return (
    <AuthenticatedApp allowedRoles={allowedRoles}>
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">TrustTrade workspace</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        <div className="mt-8 border-l-2 border-brand bg-paper px-5 py-5">
          <h2 className="font-semibold text-ink">This feature is not connected yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            The current API does not provide the data or actions needed for this page. TrustTrade will not display sample activity or claim an action succeeded when the server cannot perform it.
          </p>
          {children}
          <Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href="/explore">
            Return to professional discovery
          </Link>
        </div>
      </section>
    </AuthenticatedApp>
  );
}
