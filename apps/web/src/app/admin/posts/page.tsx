import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function AdminPostsPage() {
  return <BackendCapabilityNotice allowedRoles={["admin"]} title="Post moderation" description="Moderation controls are available only when the backend exposes the required review and decision endpoints." />;
}
