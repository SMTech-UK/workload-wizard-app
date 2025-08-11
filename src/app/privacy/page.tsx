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
import {
  Shield,
  Lock,
  Eye,
  Database,
  Users,
  AlertTriangle,
  ArrowLeft,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: August 2025
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Our Commitment to Privacy
                </CardTitle>
                <Badge variant="outline">GDPR Compliant</Badge>
              </div>
              <CardDescription>
                WorkloadWizard is committed to protecting your privacy and
                ensuring the security of your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our academic workload
                management service. Please read this policy carefully to
                understand our views and practises regarding your personal data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Personal Information
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Name, email address, and institutional affiliation</li>
                  <li>Academic role and department information</li>
                  <li>Authentication credentials (securely hashed)</li>
                  <li>Profile preferences and settings</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Academic Data</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>Course assignments and workload allocations</li>
                  <li>Teaching schedules and academic calendar data</li>
                  <li>Research project information and timelines</li>
                  <li>Administrative task assignments</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Technical Information</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  <li>IP address and browser information</li>
                  <li>Usage patterns and feature interactions</li>
                  <li>Error logs and performance metrics</li>
                  <li>Session data and authentication tokens</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">Service Provision</p>
                    <p className="text-xs text-muted-foreground">
                      Provide and maintain the workload management platform
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">
                      Analytics and Improvement
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analyse usage patterns to improve functionality and user
                      experience
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">Communication</p>
                    <p className="text-xs text-muted-foreground">
                      Send important updates, notifications, and support
                      communications
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">
                      Security and Compliance
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maintain system security and comply with institutional
                      policies
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-500" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                <h4 className="font-semibold text-indigo-900 mb-2">
                  Security Measures
                </h4>
                <div className="grid gap-2 text-sm text-indigo-800">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>End-to-end encryption for data transmission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>Encrypted database storage with AES-256</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>Multi-factor authentication support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    <span>Regular security audits and monitoring</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                We implement industry-standard security measures to protect your
                personal information. However, no method of transmission over
                the internet is 100% secure, and we cannot guarantee absolute
                security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">
                    We DO NOT sell your personal information
                  </h4>
                  <p className="text-sm text-green-800">
                    Your data is never sold to third parties for marketing or
                    commercial purposes.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Limited Sharing</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    We may share information only in the following
                    circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>With your explicit consent</li>
                    <li>
                      Within your institution for legitimate academic purposes
                    </li>
                    <li>To comply with legal obligations</li>
                    <li>To protect the safety and security of our users</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    Access
                  </Badge>
                  <p className="text-sm">
                    Request access to your personal data
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    Rectification
                  </Badge>
                  <p className="text-sm">
                    Request correction of inaccurate data
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    Erasure
                  </Badge>
                  <p className="text-sm">
                    Request deletion of your personal data
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    Portability
                  </Badge>
                  <p className="text-sm">Request transfer of your data</p>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    Objection
                  </Badge>
                  <p className="text-sm">Object to processing of your data</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                We retain your personal information only for as long as
                necessary to fulfil the purposes outlined in this privacy
                policy, unless a longer retention period is required by law.
              </p>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <h4 className="font-semibold text-amber-900 mb-2">
                  Retention Periods
                </h4>
                <div className="text-sm text-amber-800 space-y-1">
                  <p>
                    <strong>Active accounts:</strong> Data retained while
                    account is active
                  </p>
                  <p>
                    <strong>Inactive accounts:</strong> Data deleted after 3
                    years of inactivity
                  </p>
                  <p>
                    <strong>Legal requirements:</strong> Some data may be
                    retained longer as required by law
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about this Privacy Policy or our data
                practises, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Email:</strong> support@workload-wiz.xyz
                </p>
                <p>
                  <strong>Data Protection Officer:</strong>{" "}
                  dpo@workloadwizard.com
                </p>
                <p>
                  <strong>Support:</strong> Available through your admin
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
