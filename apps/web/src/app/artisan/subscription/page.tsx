import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function ArtisanSubscriptionPage() {
  return (
    <BackendCapabilityNotice
      allowedRoles={["artisan"]}
      title="Professional visibility"
      description="Subscriptions are separate from identity review and cannot bypass verification requirements."
    >
      <p className="mt-3 text-sm text-muted">The current backend does not expose plans, subscription status, billing history or subscription actions. No payment or renewal controls are shown.</p>
    </BackendCapabilityNotice>
  );
}
