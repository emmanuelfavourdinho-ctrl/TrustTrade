import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, HandHeart, ShieldCheck, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About TrustTrade",
  description:
    "Learn how TrustTrade helps customers discover skilled professionals and helps artisans present their work.",
};

const values = [
  {
    title: "Trust through transparency",
    text: "Explain what a profile, review or identity badge can tell you—and where your own judgement still matters.",
    icon: ShieldCheck,
  },
  {
    title: "Respect for skilled work",
    text: "Give professionals room to describe their services, show their craft and define the areas they serve.",
    icon: HandHeart,
  },
  {
    title: "Access to opportunity",
    text: "Make it easier for customers and professionals to find one another through useful local discovery.",
    icon: Eye,
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <section className="bg-cream">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">About TrustTrade</p>
          <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[1.1] tracking-[-0.02em] sm:text-6xl">
            The right skill can change the shape of a day.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            TrustTrade is being built to make it easier to find skilled
            professionals, understand the work they do and connect with them
            in your locality.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-page gap-8 px-5 py-20 sm:px-8 md:grid-cols-[0.7fr_1.3fr] md:gap-20 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Why this matters</p>
          <div>
            <h2 className="max-w-3xl font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              Finding good work can begin with a word-of-mouth search.
              It shouldn&apos;t have to end there.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
              Customers may have little context beyond a name or recommendation.
              Professionals may have no straightforward place to present their
              services, show previous work and describe where they operate.
              TrustTrade aims to bring those details into one considered place,
              while leaving customers and artisans in control of their decisions
              and agreements.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8 md:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">What guides us</p>
            <h2 className="mt-5 font-display text-4xl tracking-[-0.045em] sm:text-5xl">A useful platform starts with honest principles.</h2>
          </div>
          <div className="mt-12 grid gap-10 border-t border-line pt-8 md:grid-cols-3 md:gap-12">
            {values.map(({ title, text, icon: Icon }) => (
              <article key={title}>
                <Icon aria-hidden="true" className="text-brand" size={22} strokeWidth={1.6} />
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-page gap-8 px-5 py-20 sm:px-8 md:grid-cols-[0.7fr_1.3fr] md:gap-20 md:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Our story</p>
            <Sparkles aria-hidden="true" className="mt-7 text-brand" size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="max-w-3xl font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              A story still being written with the people who make it useful.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
              TrustTrade is at the beginning of its journey. Its purpose is
              grounded in a simple idea: skilled professionals should have a
              clear way to present their work, and customers should have a
              better starting point when searching for help. We will share
              more about the people and milestones behind the platform as
              those details are ready to tell.
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
              We won&apos;t invent a founder story or claim a history that has not
              yet been shared.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-page flex-col gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Find your next step</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              Start with the work you need or the work you do.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/explore">Explore professionals <ArrowRight aria-hidden="true" size={16} /></Link>
            </Button>
            <Button asChild>
              <Link href="/register">Join as an artisan <ArrowRight aria-hidden="true" size={16} /></Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
