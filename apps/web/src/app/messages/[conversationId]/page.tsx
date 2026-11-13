import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function ConversationPage() {
  return (
    <BackendCapabilityNotice
      title="Conversation"
      description="Private communication should be delivered through authenticated, persisted messaging."
    >
      <p className="mt-3 text-sm text-muted">The current backend does not provide conversation or message endpoints.</p>
    </BackendCapabilityNotice>
  );
}
