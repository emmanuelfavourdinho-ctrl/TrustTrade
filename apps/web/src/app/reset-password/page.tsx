import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export default function ResetPasswordPage() {
  return (
    <PageShell>
      <section className="bg-cream">
        <div className="mx-auto max-w-2xl px-5 py-20 sm:px-8 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Account access</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em]">Password reset is not available yet.</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            The backend does not currently provide reset tokens or a password update endpoint, so this page cannot safely change your password.
          </p>
          <Link className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href="/login">Return to sign in</Link>
        </div>
      </section>
    </PageShell>
  );
}
