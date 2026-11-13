import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

const pageText = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to TrustTrade.",
    description: "Pick up where you left off.",
    footer: "New to TrustTrade?",
    action: "Create an account",
    href: "/register",
  },
  register: {
    eyebrow: "Make a start",
    title: "Create your account.",
    description: "Join to discover professionals or put your own work in view.",
    footer: "Already have an account?",
    action: "Sign in",
    href: "/login",
  },
  forgot: {
    eyebrow: "Account access",
    title: "Reset your password.",
    description: "Enter the email address associated with your account.",
    footer: "Remembered your password?",
    action: "Sign in",
    href: "/login",
  },
} as const;

export function AuthPage({ mode }: { mode: keyof typeof pageText }) {
  const copy = pageText[mode];

  return (
    <PageShell>
      <section className="bg-cream">
        <div className="mx-auto grid min-h-[calc(100vh-280px)] max-w-page items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-[0.85fr_1.15fr] md:gap-24 md:py-20">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{copy.eyebrow}</p>
            <h1 className="mt-5 font-display text-4xl leading-[1.07] tracking-[-0.045em] sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted">{copy.description}</p>
            <p className="mt-9 text-sm text-muted">
              {copy.footer}{" "}
              <Link className="font-semibold text-brand underline underline-offset-4" href={copy.href}>
                {copy.action}
              </Link>
            </p>
          </div>
          <div className="w-full max-w-[500px] bg-white p-5 sm:p-8 md:justify-self-end">
            <AuthForm mode={mode} />
            <p className="mt-6 border-t border-line pt-5 text-xs leading-5 text-muted">
              TrustTrade does not process payments for services between customers
              and artisans. Those arrangements are made directly between you.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
