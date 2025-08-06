// Example usage of StandardizedSidebarLayout

"use client"

import { StandardizedSidebarLayout } from "./StandardizedSidebarLayout"
import { Button } from "@/components/ui/button"
import { Plus, Settings } from "lucide-react"

export function ExamplePageWithLayout() {
  // Define breadcrumbs for this page
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Users" }
  ]

  // Define header actions (optional)
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  )

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="User Management"
      subtitle="Manage users, roles, and permissions"
      headerActions={headerActions}
    >
      {/* Your page content goes here */}
      <div className="space-y-4">
        <p>This is where your page content would go.</p>
        <p>The layout automatically provides:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Collapsible sidebar with navigation</li>
          <li>Dynamic breadcrumb navigation</li>
          <li>Consistent header with optional actions</li>
          <li>Responsive design</li>
          <li>Proper spacing and padding</li>
        </ul>
      </div>
    </StandardizedSidebarLayout>
  )
}

// Example with minimal props
export function MinimalExamplePage() {
  return (
    <StandardizedSidebarLayout>
      <div>
        <h2 className="text-lg font-semibold mb-4">Minimal Layout Example</h2>
        <p>This page uses the layout with no additional props.</p>
        <p>The breadcrumbs will be auto-generated from the URL path.</p>
      </div>
    </StandardizedSidebarLayout>
  )
}

// Example with custom breadcrumbs only
export function CustomBreadcrumbsExample() {
  const customBreadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Reports", href: "/reports" },
    { label: "Monthly Report" }
  ]

  return (
    <StandardizedSidebarLayout breadcrumbs={customBreadcrumbs}>
      <div>
        <h2 className="text-lg font-semibold mb-4">Custom Breadcrumbs Example</h2>
        <p>This page shows custom breadcrumbs without title or header actions.</p>
      </div>
    </StandardizedSidebarLayout>
  )
}