"use client";

import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { BadgeCheck, Heart, MapPin, RefreshCw } from "lucide-react";
import { getFeed, setPostLiked, type FeedPost } from "@/lib/api/posts";

function relativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "Just now";
}

function displayName(post: FeedPost) {
  return post.author.fullName ?? post.author.displayName ?? post.author.username ?? "Professional";
}

function FeedItem({ post }: { post: FeedPost }) {
  const queryClient = useQueryClient();
  const feedQueryKey = ["posts", "feed"];
  type FeedData = InfiniteData<Awaited<ReturnType<typeof getFeed>>, string | undefined>;
  const liked = post.likedByMe ?? false;
  const likeMutation = useMutation({
    mutationFn: (nextLiked: boolean) => setPostLiked(post.id, nextLiked),
    onMutate: async (nextLiked) => {
      await queryClient.cancelQueries({ queryKey: feedQueryKey });
      const previous = queryClient.getQueryData<FeedData>(feedQueryKey);
      queryClient.setQueryData<FeedData>(feedQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === post.id
                ? {
                    ...item,
                    likedByMe: nextLiked,
                    ...(item.likeCount !== undefined
                      ? { likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)) }
                      : {}),
                  }
                : item,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_error, _nextLiked, context) => {
      if (context?.previous) queryClient.setQueryData(feedQueryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedQueryKey }),
  });

  const verified = post.artisan?.verificationStatus?.toLowerCase() === "approved";

  return (
    <article className="border-b border-line bg-paper px-5 py-5 sm:px-7">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              className="font-semibold text-ink hover:text-brand"
              href={post.author.username ? `/artisans/${encodeURIComponent(post.author.username)}` : "/explore"}
            >
              {displayName(post)}
            </Link>
            {verified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand" aria-label="Identity reviewed">
                <BadgeCheck aria-hidden="true" size={15} /> Identity reviewed
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            {post.author.username && <span>@{post.author.username}</span>}
            <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" size={13} />
              {post.location.name}, {post.location.city}
            </span>
          </p>
        </div>
      </header>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink sm:text-base sm:leading-7">
        {post.content}
      </p>

      {post.media.some((media) => media.url) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {post.media.map((media) =>
            !media.url ? null : (media.mediaType ?? media.resourceType)?.toLowerCase() === "video" ? (
              <video className="max-h-[34rem] w-full bg-ink object-contain" controls key={media.id} preload="metadata">
                <source src={media.url} />
                Your browser does not support video playback.
              </video>
            ) : (
              // Remote media URLs are served by Cloudinary; use a plain img to avoid unconfigured remote hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`Work shared by ${displayName(post)}`}
                className="max-h-[34rem] w-full bg-cream object-contain"
                key={media.id}
                loading="lazy"
                src={media.url}
              />
            ),
          )}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-5 border-t border-line pt-3">
        <button
          aria-pressed={liked}
          className={`inline-flex min-h-11 items-center gap-2 text-sm font-medium ${
            liked ? "text-brand" : "text-muted hover:text-brand"
          }`}
          disabled={likeMutation.isPending || post.likedByMe === undefined}
          onClick={() => likeMutation.mutate(!liked)}
          type="button"
        >
          <Heart aria-hidden="true" fill={liked ? "currentColor" : "none"} size={17} />
          {liked ? "Liked" : "Like"}
          {post.likeCount !== undefined && <span>{post.likeCount}</span>}
        </button>
        {post.commentCount !== undefined && (
          <span className="text-sm text-muted">{post.commentCount} comments</span>
        )}
        {likeMutation.isError && (
          <p className="text-xs text-red-800" role="alert">
            {likeMutation.error instanceof Error ? likeMutation.error.message : "The like could not be saved."}
          </p>
        )}
      </footer>
    </article>
  );
}

export function FeedView() {
  const queryKey = ["posts", "feed"] as const;
  const feed = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => getFeed({ cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 0,
  });
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-7 flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Local work, in view</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Your feed</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Service posts shared by professionals. Verification reflects identity review, not a guarantee of work quality.
          </p>
        </div>
        <button
          aria-label="Refresh feed"
          className="grid size-11 shrink-0 place-items-center border border-line bg-paper text-muted hover:text-brand"
          disabled={feed.isFetching}
          onClick={() => void feed.refetch()}
          type="button"
        >
          <RefreshCw aria-hidden="true" className={feed.isFetching ? "animate-spin" : ""} size={17} />
        </button>
      </header>

      {feed.isPending && (
        <div className="divide-y divide-line border-y border-line bg-paper" aria-label="Loading feed" aria-live="polite">
          {[0, 1, 2].map((item) => (
            <div className="animate-pulse px-5 py-6" key={item}>
              <div className="h-4 w-40 bg-cream" />
              <div className="mt-4 h-3 w-full bg-cream" />
              <div className="mt-2 h-3 w-2/3 bg-cream" />
            </div>
          ))}
        </div>
      )}

      {feed.isError && (
        <div className="border-l-2 border-red-700 bg-red-50 px-5 py-5" role="alert">
          <h2 className="font-semibold text-red-950">The feed could not be loaded.</h2>
          <p className="mt-2 text-sm leading-6 text-red-900">
            {feed.error instanceof Error ? feed.error.message : "Check your connection and try again."}
          </p>
          <button className="mt-3 min-h-11 text-sm font-semibold text-brand underline underline-offset-4" onClick={() => void feed.refetch()} type="button">
            Try again
          </button>
        </div>
      )}

      {feed.isSuccess && posts.length === 0 && (
        <div className="border-y border-line bg-paper px-5 py-10 sm:px-7">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">No posts in your feed yet</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
            As professionals publish work in your service area, their posts will appear here.
          </p>
          <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href="/explore">
            Explore professionals
          </Link>
        </div>
      )}

      {posts.length > 0 && (
        <div className="divide-y divide-line border-y border-line">
          {posts.map((post) => <FeedItem key={post.id} post={post} />)}
        </div>
      )}

      {feed.hasNextPage && (
        <button
          className="mt-5 min-h-12 w-full border border-line bg-paper text-sm font-semibold text-ink hover:border-brand hover:text-brand"
          disabled={feed.isFetchingNextPage}
          onClick={() => void feed.fetchNextPage()}
          type="button"
        >
          {feed.isFetchingNextPage ? "Loading more posts…" : "Load more"}
        </button>
      )}
    </div>
  );
}
