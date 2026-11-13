import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";

const categories = [
  "Carpentry",
  "Electrical",
  "Plumbing",
  "Welding",
  "Fashion & tailoring",
  "Painting",
  "Photography",
  "Beauty & care",
  "software Engineers",
  "Digital Marketers",

];

const steps = [
  {
    number: "01",
    title: "Start with what you need",
    description:
      "Search by service and locality to narrow your options to the work and area that matter.",
  },
  {
    number: "02",
    title: "Look at the work",
    description:
      "Review professional profiles, portfolios and available customer feedback before you decide.",
  },
  {
    number: "03",
    title: "Make the connection",
    description:
      "Contact a professional directly to discuss the job, timing and terms with one another.",
  },
];

const faqs = [
  {
    question: "What is TrustTrade?",
    answer:
      "TrustTrade helps customers discover skilled professionals, view examples of their work and connect with them directly.",
  },
  {
    question: "What does a verified badge mean?",
    answer:
      "It means an artisan’s identity has been reviewed and approved through TrustTrade’s verification process. It does not certify workmanship, guarantee service quality or guarantee the outcome of an agreement.",
  },
  {
    question: "Do customers pay TrustTrade for a service?",
    answer:
      "No. Customers and artisans discuss and settle service payments directly. TrustTrade does not process payments for services between them.",
  },
  {
    question: "Is it free to join?",
    answer:
      "Customer accounts, artisan registration and identity verification are free. Optional artisan subscriptions may provide additional visibility and professional features.",
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <section className="relative isolate min-h-[620px] overflow-hidden bg-[#17241d] sm:min-h-[690px]">
        <Image
          src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=2400&q=85"
          alt="A paintbrush and vivid paint arranged on a working palette"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#101d16]/90 via-[#101d16]/62 to-[#101d16]/20" />
        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-page items-center px-5 py-20 sm:min-h-[690px] sm:px-8">
          <div className="max-w-[740px] text-white">
            <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              <span className="h-px w-8 bg-[#a9d2b7]" />
              Skilled work, closer to home
            </p>
            <h1 className="max-w-[690px] font-display text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.1] tracking-[-0.02em]">
              Good work begins with the right person.
            </h1>
            <p className="mt-7 max-w-[520px] text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
              Find skilled professionals in your locality, see what they do
              best, and start a conversation with confidence.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/explore">
                  Discover professionals <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Join as an artisan</Link>
              </Button>
            </div>
            <p className="mt-7 text-xs text-white/70">
              Service arrangements and payments are made directly between customers and professionals.
            </p>
          </div>
        </div>
        <a
          className="absolute bottom-8 right-8 z-10 hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-white/80 md:flex"
          href="#how-it-works"
        >
          A better way to find skill <ArrowDown aria-hidden="true" size={15} />
        </a>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-page gap-7 px-5 py-20 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:gap-16 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            A clearer way to find people
          </p>
          <div>
            <h2 className="max-w-[760px] font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              Skill deserves to be seen. Finding it should feel simpler.
            </h2>
            <p className="mt-6 max-w-[650px] text-base leading-7 text-muted">
              TrustTrade brings professional profiles, examples of real work
              and local discovery together—so you can learn more before you
              reach out.
            </p>
            <Link
              className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-brand pb-1 text-sm font-semibold text-brand hover:text-brand-dark"
              href="/about"
            >
              Learn about TrustTrade <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-cream">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">How it works</p>
              <h2 className="mt-5 max-w-sm font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                From looking to knowing who to call.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-muted">
                A thoughtful way to compare the work, the person and the area
                they serve.
              </p>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {steps.map((step) => (
                <li className="grid gap-3 py-6 sm:grid-cols-[54px_1fr] sm:gap-5" key={step.number}>
                  <span className="pt-1 font-mono text-sm text-brand">{step.number}</span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.02em]">{step.title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8 md:py-28">
          <div className="flex flex-col justify-between gap-6 border-b border-line pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Explore by service</p>
              <h2 className="mt-4 font-display text-4xl tracking-[-0.045em] sm:text-5xl">
                Made by skilled hands.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted">
              Examples of the kinds of services professionals can showcase.
              Availability depends on who has joined your area.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                className="group flex min-h-[78px] items-center justify-between border-b border-line py-4 pr-3 text-base font-medium transition-colors hover:text-brand sm:mr-8"
                href={`/explore?category=${encodeURIComponent(category)}`}
                key={category}
              >
                <span className="flex items-center gap-4">
                  <span className="font-display text-sm text-muted/70">0{index + 1}</span>
                  {category}
                </span>
                <ArrowUpRight aria-hidden="true" className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" size={16} />
              </Link>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted">
            These are service examples, not a live list of available professionals.
          </p>
        </div>
      </section>

      <section className="overflow-hidden bg-[#f3f0e8]">
        <div className="mx-auto grid max-w-page md:min-h-[560px] md:grid-cols-[1.03fr_0.97fr]">
          <div className="relative min-h-[330px] md:min-h-full">
            <Image
              src="https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1400&q=82"
              alt="Carefully arranged hand tools in a working space"
              fill
              sizes="(max-width: 768px) 100vw, 52vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-5 py-16 sm:px-10 md:px-14 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">See the work, not just the promise</p>
            <h2 className="mt-5 max-w-lg font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              A portfolio says what a profile can&apos;t.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-muted">
              Explore examples of completed work, get a feel for a professional&apos;s
              craft, then decide whether to reach out. The images here illustrate
              the kind of work profiles may show; they are not TrustTrade member
              portfolios.
            </p>
            <Link
              className="mt-8 inline-flex min-h-11 w-fit items-center gap-3 border-b border-brand pb-1 text-sm font-semibold text-brand"
              href="/explore"
            >
              Explore professionals <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-page gap-12 px-5 py-20 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:gap-20 md:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Trust, with clarity</p>
            <h2 className="mt-5 max-w-sm font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              Know what a verified badge does—and doesn&apos;t—mean.
            </h2>
          </div>
          <div className="border-l-2 border-brand pl-6 sm:pl-8">
            <div className="flex items-center gap-3 text-brand">
              <ShieldCheck aria-hidden="true" size={22} />
              <p className="text-sm font-semibold">Identity review is one useful signal.</p>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              A verified badge indicates that an artisan&apos;s identity was reviewed
              and approved by TrustTrade. It is not a guarantee of workmanship,
              honesty, safety or a successful service. Ask questions, agree on
              scope and terms directly, and use your own judgement before hiring.
            </p>
            <Link className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark" href="/about">
              How verification works <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-brand-dark text-white">
        <div className="mx-auto grid max-w-page gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_auto] md:items-center md:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">For artisans</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-[1.08] tracking-[-0.045em] sm:text-5xl">
              Put your craft in front of people looking for it.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80">
              Create a professional profile, show your work and tell customers
              where you serve. Registration and identity verification are free;
              any optional subscription is separate from verification.
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/register">
              Build your artisan profile <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </Button>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr] md:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Questions, answered</p>
              <h2 className="mt-5 font-display text-4xl tracking-[-0.045em] sm:text-5xl">Before you get started.</h2>
              <Link className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand" href="/about">
                More about TrustTrade <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details className="group py-5" key={faq.question}>
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 text-left text-base font-semibold [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span className="text-xl font-normal text-brand group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-2xl pb-2 pr-8 text-sm leading-6 text-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate min-h-[440px] overflow-hidden bg-[#17241d]">
        <Image
          src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=2200&q=82"
          alt="Scissors, measuring tape and craft tools arranged on a work surface"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 -z-0 bg-[#10251a]/70" />
        <div className="relative z-10 mx-auto flex min-h-[440px] max-w-page flex-col justify-center px-5 py-16 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Make the next connection count</p>
          <h2 className="mt-5 max-w-3xl font-display text-4xl leading-[1.06] tracking-[-0.045em] sm:text-6xl">
            Your next great professional connection starts here.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
            Find a professional whose work fits what you have in mind—or give your own craft a place to be discovered.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/explore">Find a professional <Search aria-hidden="true" size={16} /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Join as an artisan <ArrowUpRight aria-hidden="true" size={16} /></Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
