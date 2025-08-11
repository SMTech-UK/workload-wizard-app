import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { FlagsManageGate } from "@/components/common/PermissionGate";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <FlagsManageGate redirectOnDeny>{children}</FlagsManageGate>;
}
