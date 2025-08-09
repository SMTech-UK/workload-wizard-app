"use client";

import React, { useEffect, useState } from "react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
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

import {
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  GitCompareArrows,
  ShieldCheck,
  Filter,
  Search,
  MoreHorizontal,
  UserCog,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { deleteUser } from "@/lib/actions/userActions";
import { CreateUserForm } from "@/components/domain/CreateUserForm";
import { EditUserForm } from "@/components/domain/EditUserForm";
import { DeleteConfirmationModal } from "@/components/domain/DeleteConfirmationModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  _id: string;
  email: string;
  username?: string;
  givenName: string;
  familyName: string;
  fullName: string;
  systemRoles: string[];
  organisationId: string;
  isActive: boolean;
  lastSignInAt?: number;
  createdAt: number;
  subject?: string; // Clerk user ID
  pictureUrl?: string;
  organisation?: {
    id: string;
    name: string;
    code: string;
  };
}

export default function OrganisationUsersPage() {
  const { user } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local data views
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [sortedUsers, setSortedUsers] = useState<User[]>([]);

  // Sorting
  type SortField =
    | "name"
    | "email"
    | "username"
    | "role"
    | "status"
    | "created"
    | "lastSignIn";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filters/search
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgRoleFilter, setOrgRoleFilter] = useState<string>("all");

  // Selection + assign modal
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [selectedSystemRoles, setSelectedSystemRoles] = useState<string[]>([]);
  const [selectedOrgRoleIds, setSelectedOrgRoleIds] = useState<string[]>([]);
  const [isBulkAssign, setIsBulkAssign] = useState(false);

  // Get current user's organisation
  const currentUser = useQuery(
    api.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  );

  // Get organisation users
  const organisationUsers = useQuery(
    api.users.list,
    currentUser?.organisationId
      ? {
          organisationId:
            currentUser.organisationId as unknown as Id<"organisations">,
        }
      : "skip",
  );
  const orgRoles = useQuery(
    api.organisationalRoles.listByOrganisation,
    currentUser?.organisationId
      ? {
          organisationId:
            currentUser.organisationId as unknown as Id<"organisations">,
        }
      : "skip",
  );

  // Permission: can this actor assign elevated roles (sysadmin/developer/trial)?
  const canAssignElevated = (() => {
    const meta = user?.publicMetadata as Record<string, unknown> | undefined;
    const roles: string[] = Array.isArray(meta?.roles) ? meta.roles : [];
    const role: string | undefined =
      typeof meta?.role === "string" ? (meta.role as string) : undefined;
    return (
      roles.includes("sysadmin") ||
      roles.includes("developer") ||
      role === "sysadmin" ||
      role === "developer"
    );
  })();
  const assignableSystemRoles = canAssignElevated
    ? ["user", "orgadmin", "sysadmin", "developer", "trial"]
    : ["user", "orgadmin"];

  // Helpers
  const getUniqueRoles = () => {
    const all = (organisationUsers || []).flatMap((u) => u.systemRoles || []);
    return Array.from(new Set(all)).sort();
  };

  const getRolesDisplay = (roles: string[]) => {
    if (!roles || roles.length === 0) return "No roles";
    if (roles.length === 1 && roles[0]) return getRoleLabel(roles[0]);
    const priorityOrder = [
      "sysadmin",
      "developer",
      "orgadmin",
      "user",
      "trial",
    ];
    const sorted = [...roles].sort(
      (a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b),
    );
    return sorted.map(getRoleLabel).join(", ");
  };

  const sortUsers = (
    list: User[],
    field: SortField,
    direction: SortDirection,
  ) => {
    return [...list].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (field) {
        case "name":
          aVal = `${a.givenName || ""} ${a.familyName || ""}`
            .toLowerCase()
            .trim();
          bVal = `${b.givenName || ""} ${b.familyName || ""}`
            .toLowerCase()
            .trim();
          break;
        case "email":
          aVal = (a.email || "").toLowerCase();
          bVal = (b.email || "").toLowerCase();
          break;
        case "username":
          aVal = (a.username || "").toLowerCase();
          bVal = (b.username || "").toLowerCase();
          break;
        case "role":
          aVal = getRolesDisplay(a.systemRoles || []).toLowerCase();
          bVal = getRolesDisplay(b.systemRoles || []).toLowerCase();
          break;
        case "status":
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        case "created":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "lastSignIn":
          aVal = a.lastSignInAt || 0;
          bVal = b.lastSignInAt || 0;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Filter + sort derive
  const applyFilters = () => {
    let list = [...(organisationUsers || [])] as User[];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          (u.givenName && u.givenName.toLowerCase().includes(t)) ||
          (u.familyName && u.familyName.toLowerCase().includes(t)) ||
          (u.fullName && u.fullName.toLowerCase().includes(t)) ||
          (u.email && u.email.toLowerCase().includes(t)) ||
          (u.username && u.username.toLowerCase().includes(t)),
      );
    }
    if (roleFilter !== "all")
      list = list.filter((u) => (u.systemRoles || []).includes(roleFilter));
    if (orgRoleFilter !== "all")
      list = list.filter(
        (u) =>
          (u as unknown as { organisationalRole?: { id: string } })
            .organisationalRole?.id === orgRoleFilter,
      );
    if (statusFilter !== "all")
      list = list.filter((u) => u.isActive === (statusFilter === "active"));
    setFilteredUsers(list);
  };

  // effects

  // Re-run filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [organisationUsers, searchTerm, roleFilter, orgRoleFilter, statusFilter]);

  // Sort changes
  useEffect(() => {
    setSortedUsers(sortUsers(filteredUsers, sortField, sortDirection));
  }, [filteredUsers, sortField, sortDirection]);

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedUserIds.size === sortedUsers.length)
      setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(sortedUsers.map((u) => u._id)));
  };
  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Assign Roles
  const openAssignRoles = (target: User | null, bulk = false) => {
    setAssigningUser(bulk ? ({} as unknown as User) : target);
    const initialSys = target?.systemRoles || [];
    const clampedSys = initialSys.filter((r) =>
      assignableSystemRoles.includes(r),
    );
    setSelectedSystemRoles(clampedSys);
    // Preselect org roles from the target user's current assignments
    const preselectedOrgRoleIds = !bulk
      ? (
          (target as unknown as { organisationalRoles?: { id: string }[] })
            ?.organisationalRoles || []
        ).map((r) => r.id)
      : [];
    setSelectedOrgRoleIds(preselectedOrgRoleIds);
    setIsBulkAssign(bulk);
  };

  const submitAssignRoles = async () => {
    try {
      if (isBulkAssign) {
        const targets = sortedUsers.filter((u) => selectedUserIds.has(u._id));
        const updates = targets.map((u) =>
          fetch("/api/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: u.subject || u._id,
              systemRoles: selectedSystemRoles,
              organisationalRoleIds: selectedOrgRoleIds.length
                ? selectedOrgRoleIds
                : undefined,
              organisationId: currentUser?.organisationId,
            }),
          }).then(async (r) => {
            if (!r.ok) throw new Error((await r.json()).error || "Failed");
          }),
        );
        await Promise.all(updates);
        setSelectedUserIds(new Set());
      } else {
        if (!assigningUser?.subject && !assigningUser?._id) return;
        const res = await fetch("/api/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: assigningUser.subject || assigningUser._id,
            systemRoles: selectedSystemRoles,
            organisationalRoleIds: selectedOrgRoleIds.length
              ? selectedOrgRoleIds
              : undefined,
            organisationId: currentUser?.organisationId,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
      }
      setAssigningUser(null);
    } catch (e) {
       
      console.error(e);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleDateString();
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

  const handleToggleUserStatus = async (targetUser: User) => {
    if (!targetUser.subject) {
      console.error("Cannot toggle status: User subject not found");
      return;
    }

    setTogglingUserId(targetUser._id);

    try {
      const response = await fetch("/api/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: targetUser.subject,
          isActive: !targetUser.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user status");
      }

      // The query will automatically refetch due to Convex reactivity
    } catch (error) {
      console.error("Error toggling user status:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update user status",
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      setDeletingUser(null);
      // The organisationUsers query will automatically refetch due to Convex reactivity
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingUser(null);
  };

  if (!currentUser?.organisationId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading organisation details...</p>
        </CardContent>
      </Card>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Organisation", href: "/organisation" },
    { label: "Users" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Sync
      </Button>
      <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Organisation Users"
      subtitle="Manage users within your organisation"
      headerActions={headerActions}
    >
      <Card>
        <CardHeader>
          <CardTitle>Users ({organisationUsers?.length || 0})</CardTitle>
          <CardDescription>All users in your organisation</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="p-3 mb-3 border rounded-md">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="pl-10 w-full h-9 rounded-md border px-3 text-sm"
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-4">
                  <div className="space-y-4">
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
                          Organisation Role
                        </label>
                        <Select
                          value={orgRoleFilter}
                          onValueChange={setOrgRoleFilter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All org roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All org roles</SelectItem>
                            {(orgRoles || []).map(
                              (r: { _id: string; name: string }) => (
                                <SelectItem key={r._id} value={r._id}>
                                  {r.name}
                                </SelectItem>
                              ),
                            )}
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
                          setOrgRoleFilter("all");
                          setStatusFilter("all");
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedUserIds.size > 0 && (
                <Button size="sm" onClick={() => openAssignRoles(null, true)}>
                  <UserCog className="h-4 w-4 mr-2" />
                  Bulk Assign ({selectedUserIds.size})
                </Button>
              )}
              <Button variant="outline" size="sm" className="shrink-0">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {sortedUsers && sortedUsers.length > 0 ? (
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
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[18%]"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Name {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[18%]"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Email {getSortIcon("email")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[12%]"
                    onClick={() => handleSort("username")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Username {getSortIcon("username")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[16%]"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      System Roles {getSortIcon("role")}
                    </div>
                  </TableHead>
                  <TableHead className="text-center font-semibold text-sm py-4 w-[16%]">
                    Organisation Role
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[10%]"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Status {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[12%]"
                    onClick={() => handleSort("created")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Created {getSortIcon("created")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer hover:bg-muted transition-colors font-semibold text-sm py-4 w-[12%]"
                    onClick={() => handleSort("lastSignIn")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Last Sign In {getSortIcon("lastSignIn")}
                    </div>
                  </TableHead>
                  <TableHead className="w-[8%] text-center font-semibold text-sm py-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user._id)}
                        onChange={() => toggleSelectUser(user._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.pictureUrl ? (
                          <img
                            src={user.pictureUrl}
                            alt={`${user.fullName} avatar`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.username ||
                              `${user.givenName} ${user.familyName}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.username || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(user.systemRoles || []).length === 0 ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}
                          >
                            None
                          </span>
                        ) : (
                          user.systemRoles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(r)}`}
                            >
                              {getRoleLabel(r)}
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1 justify-center">
                          {(
                            user as unknown as {
                              organisationalRoles?: Array<{
                                id: string;
                                name: string;
                              }>;
                            }
                          ).organisationalRoles &&
                          (
                            user as unknown as {
                              organisationalRoles?: Array<{
                                id: string;
                                name: string;
                              }>;
                            }
                          ).organisationalRoles!.length > 0 ? (
                            (
                              user as unknown as {
                                organisationalRoles: Array<{
                                  id: string;
                                  name: string;
                                }>;
                              }
                            ).organisationalRoles.map((r) => (
                              <span
                                key={r.id}
                                className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800"
                              >
                                {r.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm">—</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="flex items-center">
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
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.lastSignInAt
                        ? formatDateTime(user.lastSignInAt)
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
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
                          <DropdownMenuItem
                            onClick={() => openAssignRoles(user, false)}
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            <span>Assign Roles</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={togglingUserId === user._id}
                          >
                            {togglingUserId === user._id ? (
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
                          <DropdownMenuItem
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit User</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.isActive}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete User</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first user to the organisation.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                  {assignableSystemRoles.map((role) => {
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
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">
                  Organisation Roles
                </div>
                <div className="flex flex-wrap gap-2">
                  {(orgRoles || []).map((r: { _id: string; name: string }) => {
                    const checked = selectedOrgRoleIds.includes(r._id);
                    return (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() =>
                          setSelectedOrgRoleIds(
                            checked
                              ? selectedOrgRoleIds.filter((id) => id !== r._id)
                              : [...selectedOrgRoleIds, r._id],
                          )
                        }
                        className={`px-2 py-1 rounded border text-xs ${checked ? "bg-slate-900 text-white" : "bg-white"}`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
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

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserForm
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={() => {
            setEditingUser(null);
            // The query will automatically refetch
          }}
        />
      )}

      {/* Create User Modal */}
      {isCreateDialogOpen && (
        <CreateUserForm
          organisationId={currentUser.organisationId}
          onClose={() => setIsCreateDialogOpen(false)}
          onUserCreated={() => {
            setIsCreateDialogOpen(false);
            // The query will automatically refetch
          }}
        />
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <DeleteConfirmationModal
          user={{
            id: deletingUser.subject || deletingUser._id,
            firstName: deletingUser.givenName,
            lastName: deletingUser.familyName,
            email: deletingUser.email,
            roles: deletingUser.systemRoles,
          }}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}
    </StandardizedSidebarLayout>
  );
}
