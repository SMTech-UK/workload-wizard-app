"use client"

import * as React from "react"
import {
  Building2,
  Home,
  Settings,
  Shield,
  Users,
  FileText,
  UserCheck,
  Building,
  Zap,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Workload Wizard App navigation data
const data = {
  user: {
    name: "Admin User",
    email: "admin@workload.com",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "Workload Wizard",
      logo: Zap,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Organisation",
      url: "/organisation",
      icon: Building,
      items: [
        {
          title: "Users",
          url: "/organisation/users",
        },
        {
          title: "Roles",
          url: "/organisation/roles",
        },
        {
          title: "Settings",
          url: "/organisation/settings",
        },
      ],
    },
    {
      title: "Admin",
      url: "/admin",
      icon: Shield,
      items: [
        {
          title: "Overview",
          url: "/admin",
        },
        {
          title: "Users Management",
          url: "/admin/users",
        },
        {
          title: "Organisations",
          url: "/admin/organisations",
        },
        {
          title: "Permissions",
          url: "/admin/permissions",
        },
        {
          title: "Audit Logs",
          url: "/admin/audit-logs",
        },
        {
          title: "Permission Tests",
          url: "/admin/permission-tests",
        },
      ],
    },
    {
      title: "UI Components",
      url: "/ui",
      icon: Settings,
    },
  ],
  projects: [
    {
      name: "User Management",
      url: "/admin/users",
      icon: Users,
    },
    {
      name: "Organisation Setup",
      url: "/organisation",
      icon: Building2,
    },
    {
      name: "Audit & Compliance",
      url: "/admin/audit-logs",
      icon: FileText,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

