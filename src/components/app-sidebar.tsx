"use client"

import * as React from "react"
import { useUser } from "@clerk/nextjs"
import { getUserRoles } from "@/lib/utils"
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
  User,
  Code,
  Database,
  Bug,
  Terminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
// Removed BETA_FEATURES imports - no longer needed
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Generate role-based navigation data
const getNavigationData = (userRoles?: string[]) => {
  const baseNav = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Account",
      url: "/account",
      icon: User,
    },
  ]

  // Add role-specific navigation
  const roleNav = []

  // Admin navigation (for both sysadmin and developer)
  if (userRoles?.some(role => role === 'sysadmin' || role === 'developer')) {
    roleNav.push({
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
    })
  }

  // Developer-specific tools (only for developer role)
  if (userRoles?.includes('developer')) {
    
    // Add developer-specific tools
    roleNav.push({
      title: "Dev Tools",
      url: "/dev",
      icon: Code,
      items: [
        {
          title: "Database",
          url: "/dev/database",
        },
        {
          title: "API Testing",
          url: "/dev/api",
        },
        {
          title: "Debug Console",
          url: "/dev/debug",
        },
      ],
    })
  }

  // Orgadmin navigation
  if (userRoles?.includes('orgadmin')) {
    roleNav.push({
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
    })
  }

  // UI Components (for development)
  if (userRoles?.some(role => role === 'developer' || role === 'sysadmin')) {
    roleNav.push({
      title: "UI Components",
      url: "/ui",
      icon: Settings,
    })
  }

  return {
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
    navMain: [...baseNav, ...roleNav],
    projects: getProjectsData(userRoles),
  }
}

// Generate role-based projects data
const getProjectsData = (userRoles?: string[]) => {
  const projects = []

  // Admin projects (for both sysadmin and developer)
  if (userRoles?.some(role => role === 'sysadmin' || role === 'developer')) {
    projects.push(
      {
        name: "User Management",
        url: "/admin/users",
        icon: Users,
      },
      {
        name: "Organisation Setup",
        url: "/admin/organisations",
        icon: Building2,
      },
      {
        name: "Audit & Compliance",
        url: "/admin/audit-logs",
        icon: FileText,
      }
    )
  }

  // Developer-specific projects (only for developer role)
  if (userRoles?.includes('developer')) {
    projects.push(
      {
        name: "Database Tools",
        url: "/dev/database",
        icon: Database,
      },
      {
        name: "API Testing",
        url: "/dev/api",
        icon: Terminal,
      },
      {
        name: "Debug Console",
        url: "/dev/debug",
        icon: Bug,
      }
    )
  }

  // Orgadmin projects
  if (userRoles?.includes('orgadmin')) {
    projects.push(
      {
        name: "Team Management",
        url: "/organisation/users",
        icon: Users,
      },
      {
        name: "Role Configuration",
        url: "/organisation/roles",
        icon: Shield,
      },
      {
        name: "Organisation Settings",
        url: "/organisation/settings",
        icon: Building2,
      }
    )
  }

  return projects
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser()
  const userRoles = getUserRoles(user)
  
  // Get role-based navigation data
  const data = getNavigationData(userRoles)

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

