"use client";

import { useQuery } from "@tanstack/react-query";
import { AuthenticatedApp, useCurrentUser } from "@/components/authenticated-app";
import { getFeed } from "@/lib/api/posts";

function ArtisanPostsList() {
  const { data: user } = useCurrentUser();
  const posts = useQuery({
    queryKey: ["artisan", "posts", user?.id],
    queryFn: () => getFeed({ limit: 50 }),
    enabled: Boolean(user),
    retry: 0,
  });
  const ownPosts = posts.data?.items.filter((post) => post.author.id === user?.id) ?? [];

  return (
    <section className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Professional workspace</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Your service posts</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Posts are loaded from the authenticated feed. Editing and deletion are not supported by the current API.</p>
      {posts.isPending && <p className="mt-7 text-sm text-muted" aria-live="polite">Loading posts…</p>}
      {posts.isError && <p className="mt-7 border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">{posts.error instanceof Error ? posts.error.message : "Posts could not be loaded."}</p>}
      {posts.isSuccess && ownPosts.length === 0 && (
        <div className="mt-7 border-y border-line bg-paper px-5 py-8">
          <h2 className="font-semibold">No service posts found.</h2>
          <p className="mt-2 text-sm text-muted">The current feed contains no posts authored by this account.</p>
        </div>
      )}
      {ownPosts.length > 0 && (
        <ul className="mt-7 divide-y divide-line border-y border-line bg-paper">
          {ownPosts.map((post) => (
            <li className="px-5 py-5" key={post.id}>
              <p className="whitespace-pre-line text-sm leading-6">{post.content}</p>
              <p className="mt-3 text-xs text-muted">{post.location.name}, {post.location.city} · {new Date(post.createdAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ArtisanPostsPage() {
  return (
    <AuthenticatedApp allowedRoles={["artisan"]}>
      <ArtisanPostsList />
    </AuthenticatedApp>
  );
}
