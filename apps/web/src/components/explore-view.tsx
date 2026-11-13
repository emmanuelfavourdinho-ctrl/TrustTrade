"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BadgeCheck, MapPin, Search } from "lucide-react";
import type { ArtisanSearchParams } from "@trusttrade/shared";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { getArtisanCatalog, getLocationCatalog, searchArtisans } from "@/lib/api/artisans";

function describeStatus(status: string) {
  switch (status) {
    case "approved":
      return "Identity reviewed";
    case "pending":
      return "Review in progress";
    case "resubmission_required":
      return "Review needs an update";
    case "rejected":
      return "Not verified";
    default:
      return "Not verified";
  }
}

export function ExploreView({
  initialParams,
}: {
  initialParams: ArtisanSearchParams;
}) {
  const [draft, setDraft] = useState({
    query: initialParams.query ?? "",
    category: initialParams.category ?? "",
    locality: initialParams.locality ?? "",
  });
  const [search, setSearch] = useState<ArtisanSearchParams>(initialParams);
  const categories = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: getArtisanCatalog,
    retry: 0,
  });
  const locations = useQuery({
    queryKey: ["catalog", "locations"],
    queryFn: getLocationCatalog,
    retry: 0,
  });
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["artisans", "search", search],
    queryFn: () => searchArtisans(search),
    retry: 0,
  });

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch({
      query: draft.query.trim() || undefined,
      category: draft.category || undefined,
      locality: draft.locality.trim() || undefined,
    });
  }

  return (
    <PageShell>
      <section className="bg-cream">
        <div className="mx-auto max-w-page px-5 py-16 sm:px-8 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Local professional discovery</p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.1] tracking-[-0.02em] sm:text-6xl">
            Find the right skill for the work ahead.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
            Search by service and locality, then review real professional
            profiles and work before you reach out.
          </p>

          <form
            className="mt-10 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.15fr_1fr_1fr_auto] lg:items-end"
            onSubmit={submitSearch}
          >
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted" htmlFor="search-query">
                What service?
              </label>
              <input
                id="search-query"
                className="min-h-12 w-full border border-line px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
                placeholder="Service or professional"
                value={draft.query}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted" htmlFor="search-category">
                Category
              </label>
              <select
                id="search-category"
                className="min-h-12 w-full border border-line bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                disabled={categories.isPending}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                value={draft.category}
              >
                <option value="">{categories.isPending ? "Loading categories…" : categories.data?.length ? "All categories" : "No categories available"}</option>
                {categories.data?.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
              {categories.isError && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-800" role="alert">
                  <span>Categories could not be loaded.</span>
                  <button className="font-semibold underline underline-offset-2" onClick={() => void categories.refetch()} type="button">Try again</button>
                </div>
              )}
              {categories.isSuccess && categories.data.length === 0 && (
                <p className="mt-2 text-xs text-muted">The directory has no active categories yet.</p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted" htmlFor="search-locality">
                Locality
              </label>
              <input
                id="search-locality"
                className="min-h-12 w-full border border-line px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                list="available-localities"
                onChange={(event) => setDraft((current) => ({ ...current, locality: event.target.value }))}
                placeholder="Town or neighbourhood"
                value={draft.locality}
              />
              <datalist id="available-localities">
                {locations.data?.map((location) => (
                  <option key={location.id} value={location.name}>{location.name}, {location.city}</option>
                ))}
              </datalist>
              {locations.isError && <p className="mt-2 text-xs text-red-800" role="alert">Locality suggestions could not be loaded; you can still enter a locality.</p>}
            </div>
            <Button className="w-full lg:w-auto" type="submit">
              Search <Search aria-hidden="true" size={16} />
            </Button>
          </form>
          <p className="mt-3 text-xs leading-5 text-muted">
            Search results depend on professionals who have joined and shared their service areas.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-page px-5 py-14 sm:px-8 md:py-20">
          <div className="flex flex-col justify-between gap-3 border-b border-line pb-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl tracking-[-0.04em] sm:text-4xl">Professionals</h2>
              <p className="mt-2 text-sm text-muted">
                {isPending ? "Searching…" : data ? `${data.length} results` : "Search results will appear here"}
              </p>
            </div>
            {search.category && (
              <p className="text-sm text-muted">
                Category: <span className="font-medium text-ink">{search.category}</span>
              </p>
            )}
          </div>

          {isPending && (
            <div className="divide-y divide-line" aria-label="Loading professionals" aria-live="polite">
              {[1, 2, 3].map((item) => (
                <div className="flex animate-pulse items-start gap-5 py-6" key={item}>
                  <div className="size-12 shrink-0 bg-cream" />
                  <div className="w-full">
                    <div className="h-4 w-44 bg-cream" />
                    <div className="mt-3 h-3 w-72 max-w-full bg-cream" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="border-l-2 border-amber-700 bg-amber-50 px-5 py-5" role="alert">
              <h3 className="font-semibold text-ink">Discovery is not available right now.</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {error instanceof Error ? error.message : "The request could not be completed."}
              </p>
              <Button className="mt-4" onClick={() => void refetch()} variant="secondary">
                Try again
              </Button>
            </div>
          )}

          {data?.length === 0 && (
            <div className="border-b border-line py-14">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">No matches yet</p>
              <h3 className="mt-4 font-display text-3xl tracking-[-0.04em]">Try a different service or locality.</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                There are no professionals matching this search in the connected directory. You can broaden the search or come back as the directory grows.
              </p>
            </div>
          )}

          {data && data.length > 0 && (
            <ul className="divide-y divide-line">
              {data.map((artisan) => (
                <li className="py-6 sm:py-8" key={artisan.id}>
                  <article className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className="text-lg font-semibold tracking-[-0.02em]">{artisan.displayName}</h3>
                        {artisan.verificationStatus === "approved" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                            <BadgeCheck aria-hidden="true" size={15} />
                            Identity reviewed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-brand">{artisan.headline}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                        <span>{artisan.category}</span>
                        <span aria-hidden="true">·</span>
                        <MapPin aria-hidden="true" size={14} />
                        {artisan.locality}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        Verification status: {describeStatus(artisan.verificationStatus)}
                      </p>
                    </div>
                    <Link
                      className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark"
                      href={`/artisans/${encodeURIComponent(artisan.username)}`}
                    >
                      View profile <ArrowRight aria-hidden="true" size={16} />
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}

          {!isPending && !error && !data && (
            <p className="py-10 text-sm text-muted">Enter a service or locality to begin.</p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
