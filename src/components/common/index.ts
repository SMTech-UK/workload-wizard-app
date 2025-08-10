// Permission-related components and utilities
export { PermissionGate } from "./PermissionGate";
export { PermissionButton } from "../domain/PermissionButton";
export { PermissionPageWrapper } from "./PermissionPageWrapper";
export { PermissionGatingExample } from "./PermissionGatingExample";

// Convenience components
export {
  UsersViewGate,
  UsersCreateGate,
  UsersEditGate,
  UsersDeleteGate,
  PermissionsManageGate,
  FlagsManageGate,
} from "./PermissionGate";

export {
  CreateUserButton,
  EditUserButton,
  DeleteUserButton,
  ManagePermissionsButton,
  ManageFlagsButton,
} from "../domain/PermissionButton";

export {
  UsersPageWrapper,
  AdminPageWrapper,
  SystemAdminPageWrapper,
} from "./PermissionPageWrapper";
