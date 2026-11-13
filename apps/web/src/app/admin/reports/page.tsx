import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function AdminReportsPage() {
  return <BackendCapabilityNotice allowedRoles={["admin"]} title="Reports" description="Trust and safety reports must be investigated using authenticated moderation workflows." />;
}
