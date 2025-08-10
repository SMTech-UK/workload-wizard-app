"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

declare global {
  interface Window {
    Featurebase?: ((...args: any[]) => void) & { q?: any[] };
  }
}

type BootPayload = {
  appId: string;
  email?: string | undefined;
  userId?: string | undefined;
  createdAt?: string | undefined;
  theme?: "light" | "dark";
  language?: string | undefined;
  userHash?: string | undefined;
  organisationId?: string | undefined;
  organisationName?: string | undefined;
  role?: string | undefined;
  fullName?: string | undefined;
  systemRoles?: string | undefined; // CSV
  orgRoles?: string | undefined; // CSV
};

export default function FeaturebaseMessenger() {
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(
    (api as any).users.getBySubject,
    user?.id ? ({ subject: user.id } as any) : ("skip" as any),
  ) as { systemRoles?: string[]; organisationId?: string } | undefined;
  const orgDoc = useQuery(
    (api as any).organisations.get,
    convexUser?.organisationId
      ? ({ organisationId: convexUser.organisationId } as any)
      : ("skip" as any),
  ) as { name?: string } | undefined;
  const roleAssignments = useQuery(
    (api as any).organisationalRoles.getUserRoles,
    user?.id ? ({ userId: user.id } as any) : ("skip" as any),
  ) as Array<{ role?: { name?: string } }> | undefined;

  const context = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress || undefined;
    const fullName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : undefined;
    const organisationId =
      (user?.publicMetadata?.organisationId as string) ||
      convexUser?.organisationId ||
      undefined;
    const role = (user?.publicMetadata?.role as string) || undefined;
    const systemRolesArr =
      (user?.publicMetadata?.roles as string[]) ||
      convexUser?.systemRoles ||
      [];
    const organisationName = orgDoc?.name || undefined;
    const orgAssignedRolesArr = (roleAssignments || [])
      .map((r) => r.role?.name)
      .filter(Boolean) as string[];
    const systemRoles = systemRolesArr.length
      ? systemRolesArr.join(",")
      : undefined;
    const orgRoles = orgAssignedRolesArr.length
      ? orgAssignedRolesArr.join(",")
      : undefined;
    return {
      email,
      fullName,
      organisationId,
      role,
      systemRoles,
      orgRoles,
      organisationName,
    };
  }, [user, convexUser, orgDoc, roleAssignments]);

  const hasBootedRef = useRef<string | null>(null);
  const [userHash, setUserHash] = useState<string | undefined>(undefined);
  const identityField =
    process.env.NEXT_PUBLIC_FEATUREBASE_IDENTITY_FIELD || "userId"; // 'email' | 'userId'

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/featurebase/user-hash");
        if (res.ok) {
          const data = (await res.json()) as { userHash?: string };
          if (!cancelled) setUserHash(data.userHash);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id]);

  useEffect(() => {
    const win = window;
    if (typeof win.Featurebase !== "function") {
      const fb: any = function (...args: any[]) {
        (fb.q = fb.q || []).push(args);
      };
      win.Featurebase = fb as any;
    }

    const appId = process.env.NEXT_PUBLIC_FEATUREBASE_APP_ID || "";
    const enableInDev =
      process.env.NEXT_PUBLIC_FEATUREBASE_ENABLE_DEV === "true";
    const isProd = process.env.NODE_ENV === "production";
    // Avoid noisy websocket errors in local dev unless explicitly enabled
    if (!appId || (!isProd && !enableInDev)) return;
    if (!isLoaded) return;
    // If we have an orgId but orgName hasn't resolved yet, wait to include it in first boot payload
    if (context.organisationId && !context.organisationName) return;
    // Enforce identifier presence according to configured identity field to avoid Featurebase preferring the wrong field
    const identifier = identityField === "email" ? context.email : user?.id;
    // If no identifier yet (e.g., on sign-in page), allow anonymous boot (no userHash, no identity fields)

    async function boot() {
      let latestHash: string | undefined = userHash;
      if (!latestHash && identifier) {
        try {
          const res = await fetch("/api/featurebase/user-hash");
          if (res.ok) {
            const data = (await res.json()) as { userHash?: string };
            latestHash = data.userHash;
          }
        } catch {}
      }

      const createdAtIso = user?.createdAt
        ? new Date(user.createdAt as any).toISOString()
        : undefined;
      const payload: BootPayload = {
        appId,
        // Only include identity if we have it; otherwise boot anonymously
        ...(identifier
          ? identityField === "email"
            ? { email: context.email }
            : { userId: user?.id }
          : {}),
        createdAt: createdAtIso,
        theme: "light",
        language: "en",
        ...(identifier && latestHash ? { userHash: latestHash } : {}),
        organisationId: context.organisationId,
        organisationName: context.organisationName,
        role: context.role,
        fullName: context.fullName,
        systemRoles: (context as any).systemRoles,
        orgRoles: (context as any).orgRoles,
      };

      // Remove undefined keys to avoid sending junk
      Object.keys(payload).forEach((k) => {
        const v = (payload as any)[k];
        if (v === undefined) delete (payload as any)[k];
      });
      const bootKey = `${identifier || "anon"}:${latestHash || "nohash"}:${
        context.organisationName || "noname"
      }:${(context as any).systemRoles || ""}:${(context as any).orgRoles || ""}`;
      if (hasBootedRef.current === bootKey) return;
      hasBootedRef.current = bootKey;
      win.Featurebase!("boot", payload);
    }

    boot();
  }, [isLoaded, user, context, userHash, identityField]);

  const enableInDev = process.env.NEXT_PUBLIC_FEATUREBASE_ENABLE_DEV === "true";
  const isProd = process.env.NODE_ENV === "production";
  const shouldLoadScript =
    Boolean(process.env.NEXT_PUBLIC_FEATUREBASE_APP_ID) &&
    (isProd || enableInDev);
  return shouldLoadScript ? (
    <Script
      src="https://do.featurebase.app/js/sdk.js"
      id="featurebase-sdk"
      strategy="afterInteractive"
      onError={() => {
        /* suppress console error noise in dev */
      }}
    />
  ) : null;
}
