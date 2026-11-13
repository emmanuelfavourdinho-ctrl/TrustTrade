import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function MessagesPage() {
  return (
    <BackendCapabilityNotice
      title="Messages"
      description="Contact between customers and professionals should stay private and reliable."
    >
      <p className="mt-3 text-sm text-muted">Private messaging and conversations are not yet supported by the backend.</p>
    </BackendCapabilityNotice>
  );
}
