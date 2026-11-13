import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function SettingsPage() {
  return (
    <BackendCapabilityNotice
      title="Settings"
      description="Account and privacy controls will be available here as the related account APIs are added."
    >
      <p className="mt-3 text-sm text-muted">The current API does not yet support editing account settings, password changes, or account deactivation.</p>
    </BackendCapabilityNotice>
  );
}
