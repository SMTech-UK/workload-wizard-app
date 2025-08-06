"use client"

import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { Building2, Users, Settings, FileText } from "lucide-react"

export default function OrganisationSettingsPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Organisation", href: "/organisation" },
    { label: "Settings" }
  ]

  const suggestedActions = [
    {
      label: "Manage Users",
      href: "/organisation/users",
      icon: Users,
      variant: "default" as const
    },
    {
      label: "Configure Roles",
      href: "/organisation/roles",
      icon: Settings,
      variant: "outline" as const
    },
    {
      label: "Back to Organisation",
      href: "/organisation",
      icon: Building2,
      variant: "outline" as const
    }
  ]

  return (
    <PlaceholderPage
      breadcrumbs={breadcrumbs}
      title="Organisation Settings"
      subtitle="Configure your organisation preferences and details"
      description="This page will allow you to manage organisation-wide settings including branding, preferences, integration settings, and administrative configurations. You'll be able to customize how your organisation appears and operates within the system."
      suggestedActions={suggestedActions}
    />
  )
}