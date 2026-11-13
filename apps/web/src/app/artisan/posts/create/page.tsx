"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedApp, useCurrentUser } from "@/components/authenticated-app";
import { getMyVerification } from "@/lib/api/auth";
import { getLocationCatalog } from "@/lib/api/artisans";
import { createProfessionalPost } from "@/lib/api/posts";
import { deleteMedia, uploadMedia } from "@/lib/api/media";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/webm"]);

function isAllowedMedia(file: File) {
  if (imageTypes.has(file.type)) return file.size <= 10 * 1024 * 1024;
  if (videoTypes.has(file.type)) return file.size <= 100 * 1024 * 1024;
  return false;
}

function CreatePostForm() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const verification = useQuery({
    queryKey: ["artisan", "verification"],
    queryFn: getMyVerification,
    retry: 0,
  });
  const locations = useQuery({
    queryKey: ["catalog", "locations"],
    queryFn: getLocationCatalog,
    retry: 0,
  });
  const [content, setContent] = useState("");
  const [locationId, setLocationId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState("");
  const createPost = useMutation({
    mutationFn: async () => {
      const completed: Array<{ id: string }> = [];
      try {
        for (const file of files) {
          const purpose = "POST" as const;
          const media = await uploadMedia(file, purpose);
          completed.push(media);
        }
        return await createProfessionalPost({
          content: content.trim(),
          locationId,
          mediaIds: completed.map((media) => media.id),
        });
      } catch (error) {
        const cleanupResults = await Promise.allSettled(completed.map((media) => deleteMedia(media.id)));
        if (cleanupResults.some((result) => result.status === "rejected")) {
          console.error("One or more unpublished media uploads could not be cleaned up.");
          throw new Error(
            `${error instanceof Error ? error.message : "Publishing failed."} An uploaded file may remain unattached; it will be handled by media cleanup.`,
          );
        }
        throw error;
      }
    },
    onSuccess: async () => {
      setContent("");
      setFiles([]);
      await queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      await queryClient.invalidateQueries({ queryKey: ["artisan", "posts"] });
    },
  });
  const approved = verification.data?.verificationStatus.toUpperCase() === "APPROVED";

  function onFilesChange(next: FileList | null) {
    const selected = Array.from(next ?? []);
    setValidationError("");
    if (selected.length > 5) {
      setValidationError("Choose no more than five images or videos.");
      return;
    }
    const invalid = selected.find((file) => !isAllowedMedia(file));
    if (invalid) {
      setValidationError("Use JPEG, PNG or WebP images up to 10 MB, or MP4/WebM video up to 100 MB.");
      return;
    }
    setFiles(selected);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    if (!approved) {
      setValidationError("Only artisans with approved identity verification can publish.");
      return;
    }
    if (!locationId) {
      setValidationError("Choose a service locality.");
      return;
    }
    createPost.mutate();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Professional publishing</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Create a service post</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Share the work you do and where you serve. TrustTrade does not process customer payments for services.
      </p>

      {verification.isPending && <p className="mt-6 text-sm text-muted" aria-live="polite">Checking verification status…</p>}
      {verification.isError && <p className="mt-6 text-sm text-red-800" role="alert">Your verification status could not be checked. Publishing is disabled until it can be confirmed.</p>}
      {verification.data && !approved && (
        <div className="mt-6 border-l-2 border-amber-700 bg-amber-50 px-5 py-4">
          <h2 className="font-semibold text-amber-950">Approved verification is required.</h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">
            Current status: {verification.data.verificationStatus.replaceAll("_", " ")}. The server independently enforces this requirement.
          </p>
          <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href="/artisan/verification">View verification</Link>
        </div>
      )}

      <form className="mt-8 space-y-6 border-t border-line pt-7" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="post-content">Describe your service</label>
          <textarea
            className="min-h-36 w-full resize-y border border-line bg-paper p-3 text-sm leading-6"
            id="post-content"
            maxLength={5000}
            onChange={(event) => setContent(event.target.value)}
            required
            value={content}
          />
          <p className="mt-1 text-right text-xs text-muted">{content.length}/5000</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="post-location">Service locality</label>
          <select
            className="min-h-12 w-full border border-line bg-paper px-3 text-sm"
            disabled={locations.isPending || locations.isError}
            id="post-location"
            onChange={(event) => setLocationId(event.target.value)}
            required
            value={locationId}
          >
            <option value="">{locations.isPending ? "Loading localities…" : "Select a service locality"}</option>
            {locations.data?.map((location) => (
              <option key={location.id} value={location.id}>{location.name}, {location.city}</option>
            ))}
          </select>
          {locations.isError && <p className="mt-2 text-sm text-red-800" role="alert">Service localities could not be loaded.</p>}
          <p className="mt-2 text-xs leading-5 text-muted">The API will accept only a locality in your active service areas.</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="post-media">Images or video (up to 5)</label>
          <input
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="block min-h-12 w-full border border-line bg-paper p-2 text-sm"
            id="post-media"
            multiple
            onChange={(event) => onFilesChange(event.target.files)}
            type="file"
          />
          {files.length > 0 && <p className="mt-2 text-sm text-muted">{files.map((file) => file.name).join(", ")}</p>}
        </div>
        {(validationError || createPost.isError) && (
          <p className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {validationError || (createPost.error instanceof Error ? createPost.error.message : "The post could not be published.")}
          </p>
        )}
        {createPost.isSuccess && <p className="text-sm font-medium text-brand" role="status">Your service post has been published.</p>}
        <button
          className="min-h-12 bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!approved || !content.trim() || !locationId || !user || createPost.isPending || verification.isPending}
          type="submit"
        >
          {createPost.isPending ? "Uploading and publishing…" : "Publish service post"}
        </button>
      </form>
    </section>
  );
}

export default function CreateArtisanPostPage() {
  return (
    <AuthenticatedApp allowedRoles={["artisan"]}>
      <CreatePostForm />
    </AuthenticatedApp>
  );
}
