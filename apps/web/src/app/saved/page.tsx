import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function SavedPage() {
  return (
    <BackendCapabilityNotice
      title="Saved professionals and posts"
      description="Keep useful profiles and service posts close at hand."
    >
      <p className="mt-3 text-sm text-muted">The current API supports post likes, but does not support saved professionals or bookmarked posts.</p>
    </BackendCapabilityNotice>
  );
}
