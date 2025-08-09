"use client";

import posthog from "posthog-js";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";
import { Building2, Users, Settings, FileText } from "lucide-react";

export default function OrganisationSettingsPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Organisation", href: "/organisation" },
    { label: "Settings" },
  ];

  const suggestedActions = [
    {
      label: "Manage Users",
      href: "/organisation/users",
      icon: Users,
      variant: "default" as const,
      onClick: () =>
        posthog.capture("suggested-action-clicked", {
          action_label: "Manage Users",
          target_href: "/organisation/users",
        }),
    },
    {
      label: "Configure Roles",
      href: "/organisation/roles",
      icon: Settings,
      variant: "outline" as const,
      onClick: () =>
        posthog.capture("suggested-action-clicked", {
          action_label: "Configure Roles",
          target_href: "/organisation/roles",
        }),
    },
    {
      label: "Back to Organisation",
      href: "/organisation",
      icon: Building2,
      variant: "outline" as const,
      onClick: () =>
        posthog.capture("suggested-action-clicked", {
          action_label: "Back to Organisation",
          target_href: "/organisation",
        }),
    },
  ];

  return (
    <PlaceholderPage
      breadcrumbs={breadcrumbs}
      title="Organisation Settings"
      subtitle="Configure your organisation preferences and details"
      description="This page will allow you to manage organisation-wide settings including branding, preferences, integration settings, and administrative configurations. You'll be able to customize how your organisation appears and operates within the system."
      suggestedActions={suggestedActions}
    />
  );
}
