import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function NotificationsPage() {
  return (
    <BackendCapabilityNotice
      title="Notifications"
      description="Updates about your account and activity will appear here when the notification service is available."
    >
      <p className="mt-3 text-sm text-muted">There is no notifications endpoint yet, so no activity is shown.</p>
    </BackendCapabilityNotice>
  );
}
