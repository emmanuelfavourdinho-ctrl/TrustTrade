import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function ArtisanProfileEditPage() {
  return (
    <BackendCapabilityNotice
      allowedRoles={["artisan"]}
      title="Edit professional profile"
      description="Your public artisan profile is available to customers who discover your work."
    >
      <p className="mt-3 text-sm text-muted">
        Profile updates are supported, but the current read endpoint does not return the skill IDs or experience value needed to prefill a safe edit form. Saving without those values could overwrite existing profile details, so this editor is withheld until the API exposes an editable profile representation.
      </p>
    </BackendCapabilityNotice>
  );
}
