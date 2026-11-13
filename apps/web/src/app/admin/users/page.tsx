import { BackendCapabilityNotice } from "@/components/backend-capability-notice";

export default function AdminUsersPage() {
  return <BackendCapabilityNotice allowedRoles={["admin"]} title="User management" description="Review account status and manage access only through audited administrative actions." />;
}
