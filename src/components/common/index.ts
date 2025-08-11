// Permission-related components and utilities
export { PermissionGate } from "./PermissionGate";
export { PermissionButton } from "./PermissionButton";
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
  UsersViewButton as CreateUserButton,
  UsersEditButton as EditUserButton,
  UsersDeleteButton as DeleteUserButton,
  PermissionsManageButton as ManagePermissionsButton,
  FlagsManageButton as ManageFlagsButton,
} from "./PermissionButton";

export {
  UsersPageWrapper,
  AdminPageWrapper,
  SystemAdminPageWrapper,
} from "./PermissionPageWrapper";
