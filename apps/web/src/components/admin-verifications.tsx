"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedApp } from "@/components/authenticated-app";
import {
  decideVerification,
  downloadVerificationDocument,
  getVerificationQueue,
  type VerificationQueueItem,
} from "@/lib/api/admin";

function VerificationQueue() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | "request-resubmission">("approve");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const queue = useQuery({
    queryKey: ["admin", "verification-queue"],
    queryFn: getVerificationQueue,
    retry: 0,
  });
  const selected: VerificationQueueItem | undefined =
    queue.data?.find((item) => item.id === selectedId) ?? queue.data?.[0];
  const review = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("Select an application to review.");
      return decideVerification(selected.id, decision, { reason: reason.trim(), ...(notes.trim() ? { notes: notes.trim() } : {}) });
    },
    onSuccess: async () => {
      setReason("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "verification-queue"] });
    },
  });

  async function download(kind: "document" | "selfie") {
    if (!selected) return;
    setDownloadError("");
    try {
      const blob = await downloadVerificationDocument(selected.id, kind);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${kind}-${selected.id}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "The private file could not be downloaded.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Administration · identity review</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Verification queue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Review submitted identity materials carefully. Approval confirms identity review only and does not guarantee work quality.
        </p>
      </header>

      {queue.isPending && <p className="py-8 text-sm text-muted" aria-live="polite">Loading pending applications…</p>}
      {queue.isError && (
        <div className="mt-7 border-l-2 border-red-700 bg-red-50 px-5 py-4" role="alert">
          <h2 className="font-semibold">The review queue could not be loaded.</h2>
          <p className="mt-2 text-sm text-red-900">{queue.error instanceof Error ? queue.error.message : "Try again shortly."}</p>
          <button className="mt-3 min-h-11 text-sm font-semibold text-brand underline underline-offset-4" onClick={() => void queue.refetch()} type="button">Try again</button>
        </div>
      )}
      {queue.isSuccess && queue.data.length === 0 && (
        <div className="mt-7 border-y border-line bg-paper px-5 py-8">
          <h2 className="text-xl font-semibold">No applications are waiting.</h2>
          <p className="mt-2 text-sm text-muted">The queue is empty according to the current API response.</p>
        </div>
      )}
      {selected && (
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(15rem,0.75fr)_1.25fr]">
          <section aria-label="Pending verification applications">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Pending applications · {queue.data?.length ?? 0}</h2>
            <ul className="divide-y divide-line border-y border-line bg-paper">
              {queue.data?.map((item) => (
                <li key={item.id}>
                  <button
                    aria-current={selected.id === item.id ? "true" : undefined}
                    className={`w-full px-4 py-4 text-left ${selected.id === item.id ? "border-l-2 border-brand bg-brand-soft" : "hover:bg-cream"}`}
                    onClick={() => {
                      setSelectedId(item.id);
                      review.reset();
                    }}
                    type="button"
                  >
                    <span className="block font-semibold text-ink">{item.applicant.fullName}</span>
                    <span className="mt-1 block text-xs text-muted">@{item.applicant.username} · {item.documentType.replaceAll("_", " ")}</span>
                    <time className="mt-2 block text-xs text-muted" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="min-w-0">
            <div className="border-b border-line pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Applicant</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{selected.applicant.fullName}</h2>
              <p className="mt-1 text-sm text-muted">@{selected.applicant.username} · {selected.artisan.professionalTitle || "Professional"}</p>
              <p className="mt-2 text-sm text-muted">Document type: {selected.documentType.replaceAll("_", " ")}</p>
              <p className="mt-1 text-sm text-muted">Submitted: {new Date(selected.createdAt).toLocaleString()}</p>
            </div>

            <div className="mt-5">
              <h3 className="font-semibold">Private identity materials</h3>
              <p className="mt-1 text-sm leading-6 text-muted">Files are retrieved from the authenticated admin endpoint and downloaded only when requested.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="min-h-11 border border-line bg-paper px-4 text-sm font-semibold hover:border-brand" onClick={() => void download("document")} type="button">Download document</button>
                <button className="min-h-11 border border-line bg-paper px-4 text-sm font-semibold hover:border-brand" onClick={() => void download("selfie")} type="button">Download selfie</button>
              </div>
              {downloadError && <p className="mt-3 text-sm text-red-800" role="alert">{downloadError}</p>}
            </div>

            <form
              className="mt-7 space-y-4 border-t border-line pt-6"
              onSubmit={(event) => {
                event.preventDefault();
                review.mutate();
              }}
            >
              <h3 className="font-semibold">Record a decision</h3>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="verification-decision">Decision</label>
                <select className="min-h-11 w-full border border-line bg-paper px-3 text-sm" id="verification-decision" onChange={(event) => setDecision(event.target.value as typeof decision)} value={decision}>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="request-resubmission">Request resubmission</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="verification-reason">Reason <span className="text-muted">(required)</span></label>
                <textarea className="min-h-24 w-full border border-line bg-paper p-3 text-sm" id="verification-reason" maxLength={500} minLength={3} onChange={(event) => setReason(event.target.value)} required value={reason} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="verification-notes">Internal notes <span className="text-muted">(optional)</span></label>
                <textarea className="min-h-20 w-full border border-line bg-paper p-3 text-sm" id="verification-notes" maxLength={2000} onChange={(event) => setNotes(event.target.value)} value={notes} />
              </div>
              {review.isError && <p className="text-sm text-red-800" role="alert">{review.error instanceof Error ? review.error.message : "The decision could not be saved."}</p>}
              {review.isSuccess && <p className="text-sm font-medium text-brand" role="status">Decision recorded: {review.data.status.replaceAll("_", " ")}.</p>}
              <button className="min-h-12 bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60" disabled={!reason.trim() || review.isPending} type="submit">
                {review.isPending ? "Recording…" : "Submit decision"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export function AdminVerificationPage() {
  return (
    <AuthenticatedApp allowedRoles={["admin"]}>
      <VerificationQueue />
    </AuthenticatedApp>
  );
}
