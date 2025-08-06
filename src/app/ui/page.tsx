"use client"

import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, Download } from "lucide-react"

export default function UIComponentsPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "UI Components" }
  ]

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Component
      </Button>
    </div>
  )

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="UI Components"
      subtitle="Explore and test the available UI components in the design system"
      headerActions={headerActions}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sidebar Navigation</CardTitle>
              <Badge variant="secondary">Active</Badge>
            </div>
            <CardDescription>
              Standardized sidebar with dynamic breadcrumbs and collapsible navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Features:</div>
              <ul className="text-sm space-y-1">
                <li>• Dynamic breadcrumb generation</li>
                <li>• Collapsible sidebar with icons</li>
                <li>• Responsive design</li>
                <li>• Custom header actions</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Form Components</CardTitle>
              <Badge variant="outline">Available</Badge>
            </div>
            <CardDescription>
              Reusable form components with validation and accessibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Components:</div>
              <ul className="text-sm space-y-1">
                <li>• Input fields</li>
                <li>• Select dropdowns</li>
                <li>• Checkboxes & toggles</li>
                <li>• Form validation</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Data Tables</CardTitle>
              <Badge variant="outline">Available</Badge>
            </div>
            <CardDescription>
              Feature-rich tables with sorting, filtering, and pagination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Features:</div>
              <ul className="text-sm space-y-1">
                <li>• Column sorting</li>
                <li>• Search & filtering</li>
                <li>• Pagination</li>
                <li>• Row selection</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Modal Dialogs</CardTitle>
              <Badge variant="outline">Available</Badge>
            </div>
            <CardDescription>
              Accessible modal dialogs for various use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Types:</div>
              <ul className="text-sm space-y-1">
                <li>• Confirmation dialogs</li>
                <li>• Form modals</li>
                <li>• Delete confirmations</li>
                <li>• Success notifications</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Navigation</CardTitle>
              <Badge variant="secondary">Updated</Badge>
            </div>
            <CardDescription>
              Consistent navigation patterns across the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Components:</div>
              <ul className="text-sm space-y-1">
                <li>• Breadcrumb navigation</li>
                <li>• Tab navigation</li>
                <li>• Menu dropdowns</li>
                <li>• Page headers</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Feedback</CardTitle>
              <Badge variant="outline">Available</Badge>
            </div>
            <CardDescription>
              User feedback components for better UX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Components:</div>
              <ul className="text-sm space-y-1">
                <li>• Toast notifications</li>
                <li>• Loading spinners</li>
                <li>• Progress indicators</li>
                <li>• Error states</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Layout Configuration
            </CardTitle>
            <CardDescription>
              Example of how to use the StandardizedSidebarLayout component
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
{`<StandardizedSidebarLayout
  breadcrumbs={[
    { label: "Home", href: "/" },
    { label: "UI Components" }
  ]}
  title="UI Components"
  subtitle="Explore and test the available UI components"
  headerActions={<Button>Action</Button>}
>
  {/* Your page content here */}
</StandardizedSidebarLayout>`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  )
}
