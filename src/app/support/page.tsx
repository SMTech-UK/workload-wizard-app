"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";

export default function SupportPage() {
  const links = [
    {
      title: "Help Center",
      href: "https://workloadwizard.featurebase.app/help",
      description: "Guides, FAQs, and how-tos for Workload Wizard.",
    },
    {
      title: "Feedback & Suggestions",
      href: "https://workloadwizard.featurebase.app/",
      description: "Submit feedback, upvote ideas, and track requests.",
    },
    {
      title: "Roadmap",
      href: "https://workloadwizard.featurebase.app/roadmap",
      description: "See what we're building next and what's in progress.",
    },
    {
      title: "Changelog",
      href: "https://workloadwizard.featurebase.app/changelog",
      description: "Recent improvements, fixes, and releases.",
    },
  ];

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Support" },
      ]}
      title="Support"
      subtitle="Get help, give feedback, and follow progress"
    >
      <Separator className="my-2" />
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <Card key={link.href}>
            <CardHeader>
              <CardTitle className="text-lg">{link.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {link.description}
              </p>
              <Button asChild>
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Visit <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </StandardizedSidebarLayout>
  );
}
