import Link from "next/link";
import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function ArtisanServiceAreasPage() {
  return (
    <BackendCapabilityNotice
      allowedRoles={["artisan"]}
      title="Service areas"
      description="Service locations are managed as part of your professional profile, using active localities from the API catalog."
    >
      <p className="mt-3 text-sm text-muted">The backend can update service-area IDs through the profile endpoint, but its read response does not return location IDs to prefill the current selection. The frontend avoids replacing existing service areas with incomplete data.</p>
      <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href="/artisan/profile/edit">Go to professional profile</Link>
    </BackendCapabilityNotice>
  );
}
