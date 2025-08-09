"use client";

import {
  StandardizedSidebarLayout,
  type BreadcrumbItem,
} from "@/components/layout/StandardizedSidebarLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Construction,
  ArrowRight,
  Lightbulb,
  Calendar,
  Users,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface PlaceholderPageProps {
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  description?: string;
  suggestedActions?: {
    label: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: "default" | "outline" | "secondary";
  }[];
  headerActions?: React.ReactNode;
}

export function PlaceholderPage({
  breadcrumbs,
  title,
  subtitle,
  description,
  suggestedActions = [],
  headerActions,
}: PlaceholderPageProps) {
  return (
    <StandardizedSidebarLayout
      {...(breadcrumbs ? { breadcrumbs } : {})}
      {...(title ? { title } : {})}
      {...(subtitle ? { subtitle } : {})}
      {...(headerActions ? { headerActions } : {})}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="text-center space-y-4 max-w-2xl">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>

          <h2 className="text-2xl font-semibold text-muted-foreground">
            Coming Soon
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            {description ||
              `The ${title} section is currently under development. We're working hard to bring you powerful features for managing your workload and academic resources.`}
          </p>
        </div>

        {suggestedActions.length > 0 && (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Suggested Actions
              </CardTitle>
              <CardDescription>
                While we&apos;re building this feature, here are some related
                actions you can take:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestedActions.map((action, index) => {
                  const Icon = action.icon || ArrowRight;
                  return (
                    <Button
                      key={index}
                      variant={action.variant || "outline"}
                      asChild
                      className="justify-start h-auto p-4"
                    >
                      <Link href={action.href}>
                        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{action.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-sm text-muted-foreground">
          Need help or have feedback? Contact your system administrator.
        </div>
      </div>
    </StandardizedSidebarLayout>
  );
}

// Pre-configured placeholder for common pages
export function DashboardPlaceholder() {
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Dashboard" }];

  const suggestedActions = [
    {
      label: "Manage Users",
      href: "/admin/users",
      icon: Users,
      variant: "default" as const,
    },
    {
      label: "View Organisation",
      href: "/organisation",
      icon: Users,
      variant: "outline" as const,
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: BarChart3,
      variant: "outline" as const,
    },
    {
      label: "UI Components",
      href: "/ui",
      icon: Calendar,
      variant: "outline" as const,
    },
  ];

  return (
    <PlaceholderPage
      breadcrumbs={breadcrumbs}
      description="The dashboard will provide an overview of your workload assignments, upcoming deadlines, and key metrics. You'll be able to view your teaching schedule, research commitments, and administrative tasks all in one place."
      suggestedActions={suggestedActions}
    />
  );
}

// Pre-configured placeholder for common pages
export function HomePlaceholder() {
  const breadcrumbs = [{ label: "Home", href: "/" }];

  const suggestedActions = [
    {
      label: "Manage Users",
      href: "/admin/users",
      icon: Users,
      variant: "default" as const,
    },
    {
      label: "View Organisation",
      href: "/organisation",
      icon: Users,
      variant: "outline" as const,
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: BarChart3,
      variant: "outline" as const,
    },
    {
      label: "UI Components",
      href: "/ui",
      icon: Calendar,
      variant: "outline" as const,
    },
  ];

  return (
    <PlaceholderPage
      breadcrumbs={breadcrumbs}
      description="The home page will provide an overview of your workload assignments, upcoming deadlines, and key metrics. You'll be able to view your teaching schedule, research commitments, and administrative tasks all in one place."
      suggestedActions={suggestedActions}
    />
  );
}
