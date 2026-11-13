import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function AdminAuditLogsPage() {
  return <BackendCapabilityNotice allowedRoles={["admin"]} title="Audit log" description="Administrative actions should be visible in an immutable audit trail." />;
}
