import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function ArtisanReviewsPage() {
  return (
    <BackendCapabilityNotice
      allowedRoles={["artisan"]}
      title="Customer reviews"
      description="Review and rating data should be displayed only when it is returned and managed by TrustTrade's backend."
    >
      <p className="mt-3 text-sm text-muted">The current API has no review endpoints or review records. Existing rating fields are not currently exposed as a reviews feed.</p>
    </BackendCapabilityNotice>
  );
}
