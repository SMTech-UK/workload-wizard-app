"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, WandSparkles } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex aspect-square size-8 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: "#0F59FF" }}
                >
                  <WandSparkles className="size-4" />
                </div>
                <span className="font-semibold text-sm">WorkloadWizard</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mt-2">
            Last updated: August 2025
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Agreement to Terms</CardTitle>
                <Badge variant="outline">Version 1.0</Badge>
              </div>
              <CardDescription>
                By accessing and using WorkloadWizard, you accept and agree to
                be bound by these terms.
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your use of
                WorkloadWizard (&quot;Service&quot;) operated by our
                organisation (&quot;us&quot;, &quot;we&quot;, or
                &quot;our&quot;). By accessing or using our Service, you agree
                to be bound by these Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Use of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Permitted Use</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Academic workload management and planning</li>
                  <li>Resource allocation and scheduling</li>
                  <li>Collaboration with authorised team members</li>
                  <li>
                    Data analysis and reporting for institutional purposes
                  </li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Prohibited Activities</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Unauthorised access to other users&apos; data</li>
                  <li>Sharing login credentials with unauthorised personnel</li>
                  <li>Attempting to circumvent security measures</li>
                  <li>
                    Using the service for non-academic commercial purposes
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account.
              </p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    Provide accurate and complete information during
                    registration
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    Maintain the security of your password and account
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">
                    Notify us immediately of any unauthorised use
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data and Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                We are committed to protecting your privacy and handling your
                data responsibly. For detailed information about how we collect,
                use, and protect your data, please review our Privacy Policy.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium">Academic Data Protection</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All academic workload data is encrypted and stored securely in
                  compliance with educational data protection standards.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We strive to maintain high service availability but cannot
                guarantee uninterrupted access. Scheduled maintenance will be
                communicated in advance when possible.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                WorkloadWizard is provided &quot;as is&quot; without warranties
                of any kind. We shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages
                resulting from your use of the service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We reserve the right to modify these terms at any time. Users
                will be notified of significant changes via email or through the
                service interface. Continued use of the service after changes
                constitutes acceptance of the new terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please
                contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Email:</strong> support@workload-wiz.xyz
                </p>
                <p>
                  <strong>Support Portal:</strong> Available through your admin
                  dashboard
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
