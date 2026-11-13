import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-[-0.04em] text-ink">
            trusttrade
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            A clearer way to discover skilled professionals and see the work they do.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted" aria-label="Footer navigation">
          <Link className="hover:text-brand" href="/explore">Explore</Link>
          <Link className="hover:text-brand" href="/about">About</Link>
          <Link className="hover:text-brand" href="/register">Join as an artisan <ArrowUpRight aria-hidden="true" className="inline" size={13} /></Link>
          <Link className="hover:text-brand" href="/login">Sign in</Link>
        </nav>
        <p className="text-xs leading-5 text-muted md:col-span-2">
          Identity verification confirms that an artisan&apos;s identity has been
          reviewed. It is not a guarantee of work quality or the outcome of a
          private service agreement.
        </p>
        <p className="text-xs text-muted md:col-span-2">
          © {new Date().getFullYear()} TrustTrade. Local services are arranged directly between customers and professionals.
        </p>
      </div>
    </footer>
  );
}
