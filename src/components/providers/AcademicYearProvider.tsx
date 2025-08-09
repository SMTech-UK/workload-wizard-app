"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";

export type AcademicYearStatus = "draft" | "published" | "archived";

export interface AcademicYear {
  _id: Id<"academic_years">;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  staging?: boolean;
  isDefaultForOrg?: boolean;
  organisationId: Id<"organisations">;
}

type AcademicYearContextValue = {
  years: AcademicYear[];
  currentYearId: string | null;
  currentYear: AcademicYear | null;
  setCurrentYearId: (id: string) => void;
  includeDrafts: boolean;
  setIncludeDrafts: (v: boolean) => void;
  isManagement: boolean;
  setAsDefaultForOrg: (id: string) => Promise<void>;
  refresh: () => void;
};

const AcademicYearContext = createContext<AcademicYearContextValue | undefined>(
  undefined,
);

export function AcademicYearProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { toast } = useToast();

  // Management detection from convex user.systemRoles
  const apiAny = api as any;

  const convexUser = useQuery(
    apiAny.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  ) as
    | { systemRoles?: string[]; organisationId?: Id<"organisations"> }
    | undefined;

  const isManagement = useMemo(() => {
    const roles = convexUser?.systemRoles || [];
    return (
      roles.includes("orgadmin") ||
      roles.includes("sysadmin") ||
      roles.includes("developer")
    );
  }, [convexUser]);

  const orgIdStr = useMemo(
    () =>
      convexUser?.organisationId ? String(convexUser.organisationId) : null,
    [convexUser],
  );

  // Fetch academic years for organisation, server decides visibility based on permissions
  const allYears = (useQuery(
    apiAny.academicYears.listForOrganisation,
    user?.id ? { userId: user.id } : "skip",
  ) || []) as AcademicYear[];

  // UI toggle: include drafts (only meaningful for management)
  const [includeDrafts, setIncludeDraftsState] = useState<boolean>(false);

  // Load persisted includeDrafts per org
  React.useEffect(() => {
    if (!orgIdStr) return;
    try {
      const raw = localStorage.getItem(`ay_drafts:${orgIdStr}`);
      if (raw !== null) setIncludeDraftsState(raw === "1");
    } catch {}
  }, [orgIdStr]);

  const setIncludeDrafts = useCallback(
    (v: boolean) => {
      setIncludeDraftsState(v);
      try {
        if (orgIdStr)
          localStorage.setItem(`ay_drafts:${orgIdStr}`, v ? "1" : "0");
      } catch {}
    },
    [orgIdStr],
  );

  const years = useMemo(() => {
    if (!isManagement || !includeDrafts) {
      return (allYears || []).filter(
        (y) => y.status === "published" && !y.staging,
      );
    }
    return allYears || [];
  }, [allYears, includeDrafts, isManagement]);

  // Select current year: default to org default if present, else first published
  const defaultYearId = useMemo(() => {
    const defaultYear = years.find((y) => y.isDefaultForOrg);
    if (defaultYear) return String(defaultYear._id);
    const published = years.find((y) => y.status === "published" && !y.staging);
    return published ? String(published._id) : null;
  }, [years]);

  const [currentYearId, setCurrentYearIdState] = useState<string | null>(null);
  const currentYear = useMemo(
    () => (years || []).find((y) => String(y._id) === currentYearId) || null,
    [years, currentYearId],
  );

  // Ensure we always have a selection when years change
  React.useEffect(() => {
    if (!orgIdStr) return;
    // Try to restore from storage first
    try {
      const stored = localStorage.getItem(`ay_current:${orgIdStr}`);
      if (stored && years.some((y) => String(y._id) === stored)) {
        if (currentYearId !== stored) setCurrentYearIdState(stored);
        return;
      }
    } catch {}
    // Otherwise ensure a sensible default
    if (!currentYearId && defaultYearId) {
      setCurrentYearIdState(defaultYearId);
    } else if (
      currentYearId &&
      years.every((y) => String(y._id) !== currentYearId)
    ) {
      setCurrentYearIdState(defaultYearId);
    }
  }, [years, currentYearId, defaultYearId, orgIdStr]);

  const setCurrentYearId = useCallback(
    (id: string) => {
      setCurrentYearIdState(id);
      try {
        if (orgIdStr) localStorage.setItem(`ay_current:${orgIdStr}`, id);
      } catch {}
    },
    [orgIdStr],
  );

  // Mutations
  const updateYear = useMutation(apiAny.academicYears.update);

  const setAsDefaultForOrg = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      try {
        await updateYear({
          userId: user.id,
          id: id as unknown as Id<"academic_years">,
          isDefaultForOrg: true,
        });
        toast({
          title: "Default year updated",
          description:
            "This organisation's default academic year has been set.",
          variant: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to set default year";
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    },
    [updateYear, user?.id, toast],
  );

  const refreshNonce = useState<number>(0)[1];
  const refresh = useCallback(() => {
    // Convex useQuery will refetch when args object identity changes; bump a local nonce
    refreshNonce((n) => n + 1);
  }, [refreshNonce]);

  const value: AcademicYearContextValue = useMemo(
    () => ({
      years,
      currentYearId,
      currentYear,
      setCurrentYearId,
      includeDrafts,
      setIncludeDrafts,
      isManagement,
      setAsDefaultForOrg,
      refresh,
    }),
    [
      years,
      currentYearId,
      currentYear,
      includeDrafts,
      isManagement,
      setAsDefaultForOrg,
      refresh,
    ],
  );

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext);
  if (!ctx)
    throw new Error("useAcademicYear must be used within AcademicYearProvider");
  return ctx;
}
