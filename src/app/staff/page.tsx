"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateLecturerForm } from "@/components/domain/CreateLecturerForm";

export default function StaffCapacityPage() {
  const { currentYear } = useAcademicYear();
  const { user } = useUser();
  const anyApi = api as any;
  const convexUser = useQuery(
    anyApi.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  ) as { systemRoles?: string[] } | undefined;
  const isAdminLike = (convexUser?.systemRoles || []).some(
    (r) => r === "orgadmin" || r === "sysadmin" || r === "developer",
  );

  const profiles = useQuery(
    (api as any).staff.list,
    user?.id && isAdminLike ? ({ userId: user.id } as any) : ("skip" as any),
  ) as Array<any> | undefined;

  // Filters
  const [search, setSearch] = useState("");
  const [contract, setContract] = useState<string>("all"); // all | FT | PT | Bank
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [overCapacityOnly, setOverCapacityOnly] = useState<boolean>(false);
  const [capacityMode, setCapacityMode] = useState<"teaching" | "total">(
    "teaching",
  );
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Staff" },
      ]}
      title="Staff capacity"
      subtitle={
        currentYear
          ? `Academic Year: ${currentYear.name}`
          : "Select an academic year"
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        {isAdminLike && (
          <div className="flex flex-col md:flex-row gap-3 md:items-end border rounded-md p-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                data-testid="staff-search-input"
                placeholder="Name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40 space-y-1">
              <Label>Contract</Label>
              <Select value={contract} onValueChange={setContract}>
                <SelectTrigger data-testid="contract-select-trigger">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="FT">Full Time</SelectItem>
                  <SelectItem value="PT">Part Time</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44 space-y-1">
              <Label>Capacity Mode</Label>
              <Select
                value={capacityMode}
                onValueChange={(v) => setCapacityMode(v as any)}
              >
                <SelectTrigger data-testid="capacity-mode-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teaching">Teaching</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-1 md:mt-0">
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  data-testid="active-only-checkbox"
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                />{" "}
                Active only
              </label>
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  data-testid="over-capacity-checkbox"
                  type="checkbox"
                  checked={overCapacityOnly}
                  onChange={(e) => setOverCapacityOnly(e.target.checked)}
                />{" "}
                Over capacity
              </label>
            </div>
            <div className="md:ml-auto">
              <Button onClick={() => setOpenCreate(true)}>
                Create lecturer
              </Button>
            </div>
          </div>
        )}
        {isAdminLike && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Lecturer</DialogTitle>
              </DialogHeader>
              <div className="max-h-[80vh] overflow-y-auto px-1">
                <CreateLecturerForm onSuccess={() => setOpenCreate(false)} />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {!isAdminLike && (
          <div className="text-sm text-muted-foreground">
            View your profile from the sidebar (Staff → My Profile).
          </div>
        )}
        {isAdminLike && (!Array.isArray(profiles) || profiles.length === 0) && (
          <div className="text-sm text-muted-foreground">
            No lecturer profiles yet.
          </div>
        )}
        {isAdminLike && Array.isArray(profiles) && profiles.length > 0 && (
          <ul className="divide-y border rounded-md" data-testid="staff-list">
            {profiles.map((p) => (
              <StaffRow
                key={String(p._id)}
                profile={p}
                yearId={currentYear?._id}
                filters={{
                  search,
                  contract,
                  activeOnly,
                  overCapacityOnly,
                  capacityMode,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </StandardizedSidebarLayout>
  );
}

function StaffRow({
  profile,
  yearId,
  filters,
}: {
  profile: any;
  yearId?: any;
  filters: {
    search: string;
    contract: string;
    activeOnly: boolean;
    overCapacityOnly: boolean;
    capacityMode: "teaching" | "total";
  };
}) {
  const totals = useQuery(
    (api as any).allocations.computeLecturerTotals,
    profile && yearId
      ? ({ lecturerId: profile._id, academicYearId: yearId } as any)
      : ("skip" as any),
  ) as
    | {
        allocatedTeaching: number;
        allocatedAdmin: number;
        allocatedTotal: number;
      }
    | undefined;

  // Apply filters when data available
  const matchesFilters = useMemo(() => {
    // Search by name/email
    const q = filters.search.trim().toLowerCase();
    const searchOk =
      !q ||
      (profile.fullName || "").toLowerCase().includes(q) ||
      (profile.email || "").toLowerCase().includes(q);
    // Contract
    const contractOk =
      filters.contract === "all" || profile.contract === filters.contract;
    // Active
    const activeOk = !filters.activeOnly || Boolean(profile.isActive);
    // Over capacity (requires totals and max values)
    if (!filters.overCapacityOnly) {
      return searchOk && contractOk && activeOk;
    }
    if (!totals) return false;
    const teachingMax = Number(profile.maxTeachingHours) || 0;
    const totalMax = Number(profile.totalContract) || 0;
    const teachingPct =
      teachingMax > 0 ? (totals.allocatedTeaching / teachingMax) * 100 : 0;
    const totalPct =
      totalMax > 0 ? (totals.allocatedTotal / totalMax) * 100 : 0;
    const over =
      filters.capacityMode === "teaching" ? teachingPct > 100 : totalPct > 100;
    return searchOk && contractOk && activeOk && over;
  }, [filters, profile, totals]);

  if (!matchesFilters) return null;

  const teachingMax = Number(profile.maxTeachingHours) || 0;
  const totalMax = Number(profile.totalContract) || 0;
  const teaching = totals?.allocatedTeaching ?? 0;
  const admin = totals?.allocatedAdmin ?? 0;
  const total = totals?.allocatedTotal ?? 0;
  const teachingPct =
    teachingMax > 0
      ? Math.min(100, Math.round((teaching / teachingMax) * 100))
      : 0;
  const totalPct =
    totalMax > 0 ? Math.min(100, Math.round((total / totalMax) * 100)) : 0;

  const teachingColor =
    teachingPct < 80
      ? "bg-emerald-500"
      : teachingPct < 100
        ? "bg-amber-500"
        : "bg-red-500";
  const totalColor =
    totalPct < 80
      ? "bg-emerald-600"
      : totalPct < 100
        ? "bg-amber-600"
        : "bg-red-600";

  return (
    <li className="p-3 text-sm hover:bg-accent/50" data-testid="staff-row">
      <a
        href={`/staff/${profile._id}`}
        className="flex items-start justify-between"
      >
        <div>
          <div className="font-medium flex items-center gap-2">
            {profile.fullName}
            {!profile.isActive && <Badge variant="secondary">Inactive</Badge>}
          </div>
          <div className="text-muted-foreground">{profile.email}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {profile.contract} • FTE {profile.fte} • Max Teach{" "}
            {teachingMax || "–"}h • Total {totalMax || "–"}h
          </div>
        </div>
        <div className="flex-1 px-4">
          <div className="space-y-2">
            {/* Teaching capacity */}
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Teaching</span>
                <span>
                  {teaching}/{teachingMax || "–"}h (
                  {teachingMax ? teachingPct : 0}%)
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${teachingColor}`}
                  style={{ width: `${teachingPct}%` }}
                />
              </div>
            </div>
            {/* Total capacity */}
            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Total</span>
                <span>
                  {total}/{totalMax || "–"}h ({totalMax ? totalPct : 0}%)
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${totalColor}`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="text-right min-w-40">
          <div data-testid="staff-teaching">Teaching: {teaching}h</div>
          <div data-testid="staff-admin">Admin: {admin}h</div>
          <div data-testid="staff-total" className="font-medium">
            Total: {total}h
          </div>
        </div>
      </a>
    </li>
  );
}
