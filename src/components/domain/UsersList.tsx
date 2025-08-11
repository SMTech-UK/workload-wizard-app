"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { listUsers, deleteUser } from "@/lib/actions/userActions";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Edit,
  Filter,
  Building2,
  Plus,
  GitCompareArrows,
  Eye,
  ChevronUp,
  ChevronDown,
  Search,
  MoreHorizontal,
  LogIn,
  UserCog,
} from "lucide-react";
import { EditUserForm } from "./EditUserForm";
import { CreateUserForm } from "./CreateUserForm";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { UserSyncButton } from "./UserSyncButton";
// DevLoginButton removed (no longer used)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// import { useAuth } from '@clerk/nextjs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PermissionGate,
  UsersEditGate,
  UsersDeleteGate,
  PermissionsManageGate,
} from "@/components/common/PermissionGate";
import { handleClientPermissionError } from "@/lib/permission-errors";

interface User {
  id: string;
  subject?: string; // Clerk user ID
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  roles: string[];
  organisationId: string;
  organisation?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: number;
  lastSignInAt: number | null;
  isActive: boolean;
}

type SortField =
  | "name"
  | "email"
  | "username"
  | "role"
  | "organisation"
  | "status"
  | "created"
  | "lastSignIn";
type SortDirection = "asc" | "desc";

export interface UsersListRef {
  handleCreateUser: () => void;
}

export const UsersList = forwardRef<UsersListRef>((props, ref) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [sortedUsers, setSortedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [selectedSystemRoles, setSelectedSystemRoles] = useState<string[]>([]);
  const [selectedOrgRoleId, setSelectedOrgRoleId] = useState<string | null>(
    null,
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkAssign, setIsBulkAssign] = useState(false);

  // Sorting state - default to alphabetical by name
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const updateLastSignIn = useMutation(api.users.updateLastSignIn);
  const organisations = useQuery(api.organisations.list);
  const orgRolesForAssign = useQuery(
    api.organisationalRoles.listByOrganisation,
    assigningUser && assigningUser.organisationId
      ? {
          organisationId:
            assigningUser.organisationId as unknown as Id<"organisations">,
        }
      : "skip",
  );

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [organisationFilter, setOrganisationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrganisationId, setSelectedOrganisationId] =
    useState<string>("all");

  // Expose handleCreateUser function to parent component
  useImperativeHandle(ref, () => ({
    handleCreateUser,
  }));

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userList = await listUsers();
      setUsers(userList as User[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      setUsers(users.filter((user) => user.id !== userId));
      setDeletingUser(null);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingUser(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const openAssignRoles = (user: User) => {
    setAssigningUser(user);
    setSelectedSystemRoles(user.roles || []);
    setSelectedOrgRoleId(null);
    setIsBulkAssign(false);
  };

  const submitAssignRoles = async () => {
    try {
      if (isBulkAssign) {
        const targets = sortedUsers.filter((u) => selectedUserIds.has(u.id));
        const sameOrgId = targets.every(
          (u) => u.organisationId === targets[0]?.organisationId,
        )
          ? targets[0]?.organisationId
          : null;
        const updates = targets.map(async (u) => {
          return fetch("/api/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: u.subject || u.id,
              systemRoles: selectedSystemRoles,
              organisationalRoleId: sameOrgId
                ? selectedOrgRoleId || undefined
                : undefined,
              organisationId: u.organisationId,
            }),
          }).then(async (r) => {
            if (!r.ok) {
              const d = await r.json();
              throw new Error(d.error || "Failed to assign roles");
            }
          });
        });
        await Promise.all(updates);
        toast({
          title: "Success",
          description: `Roles updated for ${targets.length} user(s)`,
        });
        setSelectedUserIds(new Set());
        setAssigningUser(null);
        setIsBulkAssign(false);
        fetchUsers();
      } else {
        if (!assigningUser?.subject && !assigningUser?.id) return;
        const res = await fetch("/api/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: assigningUser.subject || assigningUser.id,
            systemRoles: selectedSystemRoles,
            organisationalRoleId: selectedOrgRoleId || undefined,
            organisationId: assigningUser.organisationId,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to assign roles");
        }
        toast({ title: "Success", description: "Roles updated" });
        setAssigningUser(null);
        fetchUsers();
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to assign roles",
        variant: "destructive",
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === sortedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(sortedUsers.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
  };

  const handleUserUpdated = () => {
    fetchUsers(); // Refresh the user list
  };

  const handleCreateUser = () => {
    setCreatingUser(true);
  };

  const handleCloseCreate = () => {
    setCreatingUser(false);
  };

  const handleUserCreated = () => {
    fetchUsers(); // Refresh the user list
  };

  const handleDevLogin = async (user: User) => {
    try {
      const response = await fetch("/api/dev-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId: user.subject || user.id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store the session token and user info
        localStorage.setItem("dev_login_session_token", data.sessionToken);
        // Store the current user's Clerk ID (subject) as the original admin
        localStorage.setItem(
          "dev_login_original_admin_id",
          user.subject || user.id,
        );
        // Store the target user's ID for cleanup
        localStorage.setItem("dev_login_current_user_id", data.targetUser.id);
        localStorage.setItem(
          "dev_login_target_user",
          JSON.stringify({
            firstName: data.targetUser.firstName,
            lastName: data.targetUser.lastName,
            email: data.targetUser.email,
          }),
        );

        toast({
          title: "Success",
          description: `Logged in as ${data.targetUser.firstName} ${data.targetUser.lastName}`,
        });

        // For now, just show success and stay on the same page
        toast({
          title: "Dev Login Success",
          description: `Logged in as ${data.targetUser.firstName} ${data.targetUser.lastName}. You can now access admin pages as this user.`,
        });

        // Refresh the page to update the UI
        window.location.reload();
      } else {
        throw new Error(data.error || "Failed to login as user");
      }
    } catch (error) {
      console.error("Dev login error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to login as user",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!user.subject) {
      console.error("Cannot toggle status: User subject not found");
      return;
    }

    setTogglingUserId(user.id);

    try {
      const response = await fetch("/api/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.subject,
          isActive: !user.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user status");
      }

      // Refresh the user list
      fetchUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update user status",
      );
      toast({
        title: "Failed to update user status",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  // Get unique organisations for filter dropdown
  const getUniqueOrganisations = () => {
    const orgs = users
      .map((user) => user.organisation)
      .filter((org) => org !== null && org !== undefined)
      .map((org) => ({ id: org!.id, name: org!.name, code: org!.code }));

    // Remove duplicates based on id
    return Array.from(new Map(orgs.map((org) => [org.id, org])).values());
  };

  // Get unique roles for filter dropdown
  const getUniqueRoles = () => {
    const allRoles = users.flatMap((user) => user.roles || []);
    return Array.from(new Set(allRoles)).sort();
  };

  // Sorting function
  const sortUsers = (
    usersToSort: User[],
    field: SortField,
    direction: SortDirection,
  ) => {
    return [...usersToSort].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (field) {
        case "name":
          aValue = `${a.firstName || ""} ${a.lastName || ""}`
            .toLowerCase()
            .trim();
          bValue = `${b.firstName || ""} ${b.lastName || ""}`
            .toLowerCase()
            .trim();
          break;
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "username":
          aValue = (a.username || "").toLowerCase();
          bValue = (b.username || "").toLowerCase();
          break;
        case "role":
          aValue = getRolesDisplay(a.roles || []).toLowerCase();
          bValue = getRolesDisplay(b.roles || []).toLowerCase();
          break;
        case "organisation":
          aValue = (a.organisation?.name || "").toLowerCase();
          bValue = (b.organisation?.name || "").toLowerCase();
          break;
        case "status":
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        case "created":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "lastSignIn":
          aValue = a.lastSignInAt || 0;
          bValue = b.lastSignInAt || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          (user.firstName && user.firstName.toLowerCase().includes(term)) ||
          (user.lastName && user.lastName.toLowerCase().includes(term)) ||
          (user.email && user.email.toLowerCase().includes(term)) ||
          (user.username && user.username.toLowerCase().includes(term)),
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.roles && user.roles.includes(roleFilter),
      );
    }

    // Organisation filter
    if (organisationFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.organisation?.id === organisationFilter,
      );
    }

    // Selected organisation filter (for admin cross-organisation viewing)
    if (selectedOrganisationId !== "all") {
      filtered = filtered.filter(
        (user) => user.organisationId === selectedOrganisationId,
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  // Apply sorting to filtered users
  useEffect(() => {
    const sorted = sortUsers(filteredUsers, sortField, sortDirection);
    setSortedUsers(sorted);
  }, [filteredUsers, sortField, sortDirection]);

  // Apply filters whenever filters or users change
  useEffect(() => {
    applyFilters();
  }, [
    users,
    searchTerm,
    roleFilter,
    organisationFilter,
    statusFilter,
    selectedOrganisationId,
  ]);

  // Initial load and fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Ensure initial sort is applied when users are first loaded
  useEffect(() => {
    if (users.length > 0 && sortedUsers.length === 0) {
      const sorted = sortUsers(users, sortField, sortDirection);
      setSortedUsers(sorted);
    }
  }, [users, sortField, sortDirection, sortedUsers.length]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "orgadmin":
        return "Organisation Admin";
      case "sysadmin":
        return "System Admin";
      case "developer":
        return "Developer";
      case "user":
        return "User";
      case "trial":
        return "Trial";
      default:
        return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "orgadmin":
        return "bg-red-100 text-red-800";
      case "sysadmin":
        return "bg-purple-100 text-purple-800";
      case "developer":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-green-100 text-green-800";
      case "trial":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRolesDisplay = (roles: string[]) => {
    if (!roles || roles.length === 0) return "No roles";
    if (roles.length === 1 && roles[0]) return getRoleLabel(roles[0]);

    // For multiple roles, show the highest priority role first
    const priorityOrder = [
      "sysadmin",
      "developer",
      "orgadmin",
      "user",
      "trial",
    ];
    const sortedRoles = [...roles].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a);
      const bIndex = priorityOrder.indexOf(b);
      return aIndex - bIndex;
    });

    return sortedRoles.map((role) => getRoleLabel(role)).join(", ");
  };

  const getPrimaryRoleBadgeClass = (roles: string[]) => {
    if (!roles || roles.length === 0) return "bg-gray-100 text-gray-800";

    // Get the highest priority role for badge styling
    const priorityOrder = [
      "sysadmin",
      "developer",
      "orgadmin",
      "user",
      "trial",
    ];
    const sortedRoles = [...roles].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a);
      const bIndex = priorityOrder.indexOf(b);
      return aIndex - bIndex;
    });

    return getRoleBadgeClass(sortedRoles[0] || "user");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">
            <p>Error: {error}</p>
            <Button onClick={fetchUsers} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground">
              Manage all users in the system ({sortedUsers.length} of{" "}
              {users.length} total)
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-4">
              {/* Search - Takes up most space */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="font-medium">Filter Options</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Role
                        </label>
                        <Select
                          value={roleFilter}
                          onValueChange={setRoleFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All roles</SelectItem>
                            {getUniqueRoles().map((role) => (
                              <SelectItem key={role} value={role}>
                                {getRoleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Organisation
                        </label>
                        <Select
                          value={organisationFilter}
                          onValueChange={setOrganisationFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All organisations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              All organisations
                            </SelectItem>
                            {getUniqueOrganisations().map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name} ({org.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Status
                        </label>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setRoleFilter("all");
                          setOrganisationFilter("all");
                          setStatusFilter("all");
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Right side - Organisation Selector and User Sync */}
              <div className="flex items-center gap-2 shrink-0">
                {selectedUserIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsBulkAssign(true);
                      setAssigningUser({} as unknown as User);
                      setSelectedOrgRoleId(null);
                    }}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Bulk Assign ({selectedUserIds.size})
                  </Button>
                )}
                {organisations && organisations.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm font-medium">View:</span>
                    </div>
                    <Select
                      value={selectedOrganisationId}
                      onValueChange={setSelectedOrganisationId}
                    >
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder="All organisations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All organisations</SelectItem>
                        {organisations.map((org) => (
                          <SelectItem key={org._id} value={org._id}>
                            {org.name} ({org.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedOrganisationId !== "all" && (
                      <Badge variant="outline" className="text-xs">
                        Filtered
                      </Badge>
                    )}
                  </>
                )}

                {/* Refresh Button */}
                <Button
                  onClick={fetchUsers}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>

                {/* User Sync Popover */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <GitCompareArrows className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-96 p-6">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <GitCompareArrows className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">
                            User Synchronization
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Keep user data in sync with Clerk
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Last Sync</span>
                            <span className="text-muted-foreground">Never</span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="font-medium">Users Synced</span>
                            <span className="text-muted-foreground">0</span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <p>
                            This will sync all users from Clerk to your local
                            database, ensuring user data is up to date.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <UserSyncButton />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b-2 border-muted-foreground/20">
                <TableHead className="w-[32px] text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedUserIds.size === sortedUsers.length &&
                      sortedUsers.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[15%]"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Name
                    {getSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[18%]"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Email
                    {getSortIcon("email")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[12%]"
                  onClick={() => handleSort("username")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Username
                    {getSortIcon("username")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[12%]"
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Role
                    {getSortIcon("role")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[15%]"
                  onClick={() => handleSort("organisation")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Organisation
                    {getSortIcon("organisation")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[10%]"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Status
                    {getSortIcon("status")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[10%]"
                  onClick={() => handleSort("created")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Created
                    {getSortIcon("created")}
                  </div>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[12%]"
                  onClick={() => handleSort("lastSignIn")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Last Sign In
                    {getSortIcon("lastSignIn")}
                  </div>
                </TableHead>
                <TableHead className="w-[8%] text-center font-semibold text-sm py-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="min-h-[400px]">
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    {users.length === 0
                      ? "No users found"
                      : "No users match the current filters"}
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.email || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.username || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(role)}`}
                            >
                              {getRoleLabel(role)}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No roles
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.organisation?.name || user.organisationId || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-green-600 text-sm">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 text-red-600 mr-1" />
                            <span className="text-red-600 text-sm">
                              Inactive
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {formatDate(user.createdAt)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatDateTime(user.createdAt)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {user.lastSignInAt
                              ? formatDate(user.lastSignInAt)
                              : "Never"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {user.lastSignInAt
                              ? formatDateTime(user.lastSignInAt)
                              : "Never signed in"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <PermissionsManageGate>
                            <DropdownMenuItem
                              onClick={() => openAssignRoles(user)}
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              <span>Assign Roles</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </PermissionsManageGate>
                          <UsersEditGate>
                            <DropdownMenuItem
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit User</span>
                            </DropdownMenuItem>
                          </UsersEditGate>
                          <DropdownMenuItem disabled>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Dev login disabled for now */}
                          {/* <DropdownMenuItem 
                                onClick={() => handleDevLogin(user)}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                <LogIn className="mr-2 h-4 w-4" />
                                <span>Login As</span>
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          <PermissionGate permission="users.edit">
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user)}
                              disabled={togglingUserId === user.id}
                            >
                              {togglingUserId === user.id ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              ) : user.isActive ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              <span>
                                {user.isActive
                                  ? "Deactivate User"
                                  : "Activate User"}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </PermissionGate>
                          <UsersDeleteGate>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              disabled={user.isActive}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete User</span>
                            </DropdownMenuItem>
                          </UsersDeleteGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {editingUser && (
        <EditUserForm
          user={editingUser}
          onClose={handleCloseEdit}
          onUserUpdated={handleUserUpdated}
          isSysadmin={true}
        />
      )}

      {creatingUser && (
        <CreateUserForm
          onClose={handleCloseCreate}
          onUserCreated={handleUserCreated}
          isSysadmin={true}
        />
      )}

      {deletingUser && (
        <DeleteConfirmationModal
          user={deletingUser}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Assign Roles Modal */}
      {assigningUser && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setAssigningUser(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Roles</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">System Roles</div>
                <div className="flex flex-wrap gap-2">
                  {["user", "orgadmin", "sysadmin", "developer", "trial"].map(
                    (role) => {
                      const checked = selectedSystemRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            setSelectedSystemRoles(
                              checked
                                ? selectedSystemRoles.filter((r) => r !== role)
                                : [...selectedSystemRoles, role],
                            )
                          }
                          className={`px-2 py-1 rounded border text-xs ${checked ? "bg-slate-900 text-white" : "bg-white"}`}
                        >
                          {getRoleLabel(role)}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  Organisation Role
                </div>
                <Select
                  value={selectedOrgRoleId || ""}
                  onValueChange={(v) => setSelectedOrgRoleId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(orgRolesForAssign || []).map(
                      (r: { _id: string; name: string }) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAssigningUser(null)}
                >
                  Cancel
                </Button>
                <Button onClick={submitAssignRoles}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
});
UsersList.displayName = "UsersList";
