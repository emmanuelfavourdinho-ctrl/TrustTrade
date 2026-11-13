"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthenticatedApp } from "@/components/authenticated-app";
import { getMyVerification, submitVerification } from "@/lib/api/auth";

function VerificationContent() {
  const queryClient = useQueryClient();
  const [document, setDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("national_identity_card");
  const [validationError, setValidationError] = useState("");
  const verification = useQuery({
    queryKey: ["artisan", "verification"],
    queryFn: getMyVerification,
    retry: 0,
  });
  const submit = useMutation({
    mutationFn: submitVerification,
    onSuccess: async () => {
      setDocument(null);
      setSelfie(null);
      await queryClient.invalidateQueries({ queryKey: ["artisan", "verification"] });
    },
  });
  const status = verification.data?.verificationStatus.toUpperCase();
  const latest = verification.data?.verificationApps[0];
  const canSubmit = ["NOT_VERIFIED", "NOT_SUBMITTED", "REJECTED", "NEEDS_RESUBMISSION", "RESUBMISSION_REQUIRED"].includes(status ?? "");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    if (!document || !selfie) {
      setValidationError("Choose both the identity document and verification selfie.");
      return;
    }
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowedTypes.has(document.type) || !["image/jpeg", "image/png"].includes(selfie.type)) {
      setValidationError("Use a PDF, JPEG or PNG document and a JPEG or PNG selfie.");
      return;
    }
    if (document.size > 8 * 1024 * 1024 || selfie.size > 8 * 1024 * 1024) {
      setValidationError("Each verification file must be 8 MB or smaller.");
      return;
    }
    submit.mutate({ documentType, document, selfie });
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Identity review</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">Verify your identity</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Verification is free and requires administrator review. It does not certify workmanship or guarantee the outcome of a service arrangement.
      </p>

      {verification.isPending && <p className="mt-7 text-sm text-muted" aria-live="polite">Loading current status…</p>}
      {verification.isError && (
        <div className="mt-7 border-l-2 border-red-700 bg-red-50 px-5 py-4" role="alert">
          {verification.error instanceof Error ? verification.error.message : "Verification status could not be loaded."}
        </div>
      )}
      {verification.data && (
        <div className="mt-7 border border-line bg-paper px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Current status</p>
          <p className="mt-2 font-semibold text-ink">{verification.data.verificationStatus.replaceAll("_", " ")}</p>
          {latest?.submittedAt && <p className="mt-1 text-sm text-muted">Submitted {new Date(latest.submittedAt).toLocaleDateString()}</p>}
          {latest?.createdAt && <p className="mt-1 text-sm text-muted">Submitted {new Date(latest.createdAt).toLocaleDateString()}</p>}
          {latest?.status && <p className="mt-1 text-sm text-muted">Latest application: {latest.status.replaceAll("_", " ")}</p>}
          {latest?.rejectionReason && <p className="mt-2 text-sm text-red-800">Reason: {latest.rejectionReason}</p>}
          {latest?.reviewNotes && <p className="mt-2 text-sm text-muted">Review notes: {latest.reviewNotes}</p>}
        </div>
      )}

      {canSubmit && (
        <form className="mt-8 space-y-5 border-t border-line pt-7" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="documentType">Identity document</label>
            <select className="min-h-12 w-full border border-line bg-paper px-3 text-sm" id="documentType" onChange={(event) => setDocumentType(event.target.value)} value={documentType}>
              <option value="national_identity_card">National identity card</option>
              <option value="passport">Passport</option>
              <option value="driving_license">Driving licence</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="verificationDocument">Document image or file</label>
            <input accept="application/pdf,image/jpeg,image/png" className="block min-h-12 w-full border border-line bg-paper p-2 text-sm" id="verificationDocument" onChange={(event) => setDocument(event.target.files?.[0] ?? null)} required type="file" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="verificationSelfie">Verification selfie</label>
            <input accept="image/jpeg,image/png" className="block min-h-12 w-full border border-line bg-paper p-2 text-sm" id="verificationSelfie" onChange={(event) => setSelfie(event.target.files?.[0] ?? null)} required type="file" />
          </div>
          <p className="text-xs leading-5 text-muted">
            These files are submitted to the private verification endpoint and are not public profile media. Only send documents requested for identity review.
          </p>
          {validationError && <p className="text-sm text-red-800" role="alert">{validationError}</p>}
          {submit.isError && (
            <p className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
              {submit.error instanceof Error ? submit.error.message : "The application could not be submitted."}
            </p>
          )}
          {submit.isSuccess && <p className="text-sm font-medium text-brand" role="status">Your application was submitted for administrator review.</p>}
          <button className="min-h-12 bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60" disabled={!document || !selfie || submit.isPending} type="submit">
            {submit.isPending ? "Submitting securely…" : "Submit for review"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function ArtisanVerificationPage() {
  return (
    <AuthenticatedApp allowedRoles={["artisan"]}>
      <VerificationContent />
    </AuthenticatedApp>
  );
}
