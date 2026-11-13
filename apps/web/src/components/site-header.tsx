import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/explore", label: "Find a professional" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-line bg-paper">
      <div className="mx-auto flex min-h-[76px] max-w-page items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="TrustTrade home"
        >
          <span className="grid size-9 place-items-center border border-brand text-sm font-bold tracking-[-0.12em] text-brand">
            TT
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.04em]">
            trusttrade
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              className="text-sm text-muted transition-colors hover:text-brand"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
          <Link className="text-sm text-muted transition-colors hover:text-brand" href="/login">
            Sign in
          </Link>
          <Button asChild>
            <Link href="/register">
              Create an account <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </Button>
        </nav>

        <details className="group relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Toggle navigation</span>
            <span className="flex w-5 flex-col gap-1" aria-hidden="true">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
            </span>
            Menu
          </summary>
          <nav
            className="absolute right-0 top-full mt-2 flex w-[min(20rem,calc(100vw-2.5rem))] flex-col border border-line bg-paper p-2 shadow-lg"
            aria-label="Mobile navigation"
          >
            {links.map((link) => (
              <Link
                className="px-4 py-3 text-sm text-ink hover:bg-cream"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
            <Link className="px-4 py-3 text-sm text-ink hover:bg-cream" href="/login">
              Sign in
            </Link>
            <Link
              className={cn(buttonStyles(), "mt-1")}
              href="/register"
            >
              Create an account <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
