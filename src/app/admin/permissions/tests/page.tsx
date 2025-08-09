"use client";

import { useEffect, useState } from "react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Play } from "lucide-react";
// header actions use plain buttons (no dropdown)
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

type TestSummary = {
  totalTests: number;
  passedTests: number;
  failedTests: number;
};
type TestResultItem = {
  permission: string;
  expected: boolean;
  actual: boolean;
  passed: boolean;
};
type UserTestResult = {
  userId: string;
  results: TestResultItem[];
  allPassed: boolean;
};
type TestRun = { testResults: UserTestResult[]; summary: TestSummary };

export default function PermissionTestsPage() {
  const [testResults, setTestResults] = useState<TestRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  const createTestOrg = useMutation(api.permissions.createTestOrgWithRoles);
  const createTestUsers = useMutation(api.permissions.createTestUsers);
  const [nonce, setNonce] = useState<number>(Date.now());
  const runTests = useQuery(api.permissions.runPermissionTests, { nonce }) as
    | TestRun
    | undefined;
  const debugData = useQuery(api.permissions.debugOrganisationsAndRoles);

  const handleCreateTestOrg = async () => {
    setOrgLoading(true);
    try {
      console.log("Creating test organisation...");
      const result = await createTestOrg();
      console.log("Test organisation created:", result);
      alert(
        `Created test organisation with ${result.roles.length} roles and ${result.permissions.length} permissions`,
      );
    } catch (error) {
      console.error("Error creating test organisation:", error);
      alert("Error creating test organisation: " + (error as Error).message);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateTestUsers = async () => {
    setUserLoading(true);
    try {
      console.log("Creating test users...");
      const result = await createTestUsers();
      console.log("Test users created:", result);
      alert(
        `Created ${result.users.length} test users with ${result.roleAssignments.length} role assignments`,
      );
    } catch (error) {
      console.error("Error creating test users:", error);
      alert("Error creating test users: " + (error as Error).message);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSetupTestData = async () => {
    setIsLoading(true);
    try {
      console.log("Creating test organisation...");
      await createTestOrg();

      console.log("Creating test users...");
      await createTestUsers();

      console.log("Test data created successfully!");
      alert("Test data created successfully!");
    } catch (error) {
      console.error("Error setting up test data:", error);
      alert("Error setting up test data: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTests = () => {
    setNonce(Date.now());
    if (runTests) setTestResults(runTests);
  };

  // When query result changes, sync into local state for rendering
  useEffect(() => {
    if (runTests) setTestResults(runTests);
  }, [runTests]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Permissions", href: "/admin/permissions" },
    { label: "Tests" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="default" size="sm" onClick={handleRunTests}>
        <Play className="h-4 w-4 mr-2" />
        Run Tests
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateTestOrg}
        disabled={orgLoading}
      >
        {orgLoading ? "Creating Org…" : "Create Test Org"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateTestUsers}
        disabled={userLoading}
      >
        {userLoading ? "Creating Users…" : "Create Test Users"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSetupTestData}
        disabled={isLoading}
      >
        <Settings className="h-4 w-4 mr-2" />
        {isLoading ? "Setting up…" : "Setup All"}
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Permission System Tests"
      subtitle="Test the permission system with different user roles and permissions"
      headerActions={headerActions}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Permission Validation</CardTitle>
          </div>
          <CardDescription>
            Use the header actions to setup test data and run the test suite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {((testResults || runTests) as TestRun | null) && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <h3 className="text-lg font-semibold">Test Results</h3>
                <Badge
                  variant={
                    ((testResults || runTests) as TestRun).summary
                      .failedTests === 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {((testResults || runTests) as TestRun).summary.passedTests}/
                  {((testResults || runTests) as TestRun).summary.totalTests}{" "}
                  passed
                </Badge>
              </div>

              {((testResults || runTests) as TestRun).testResults.map(
                (userTest: UserTestResult, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {userTest.userId}
                        </CardTitle>
                        <Badge
                          variant={
                            userTest.allPassed ? "default" : "destructive"
                          }
                        >
                          {userTest.allPassed ? "PASS" : "FAIL"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {userTest.results.map(
                          (result: TestResultItem, resultIndex: number) => (
                            <div
                              key={resultIndex}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <span className="font-mono text-sm">
                                {result.permission}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  Expected: {result.expected ? "✅" : "❌"}
                                </span>
                                <span className="text-sm">
                                  Actual: {result.actual ? "✅" : "❌"}
                                </span>
                                <Badge
                                  variant={
                                    result.passed ? "default" : "destructive"
                                  }
                                >
                                  {result.passed ? "PASS" : "FAIL"}
                                </Badge>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">How it works now:</h4>
            <ul className="space-y-1 text-sm">
              <li>
                Creates a TEST org, then roles from your current Default Role
                Templates (or Admin/Manager/Lecturer/Viewer fallback).
              </li>
              <li>
                Assigns permissions per `system_permissions.defaultRoles`
                mapping.
              </li>
              <li>
                Creates one test user per role (subject:{" "}
                <code>{"test_{role}_user"}</code>) plus a{" "}
                <code>test_sysadmin_user</code>.
              </li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold mb-2">Expected:</h4>
            <p className="text-sm">
              For each role, a permission passes if it is explicitly on the role
              or the role name is included in that permission’s{" "}
              <code>defaultRoles</code>. Sysadmin passes all.
            </p>
          </div>

          {debugData && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold mb-2">
                Current Organizations & Roles:
              </h4>
              {debugData.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No organizations found. Create test data first.
                </p>
              ) : (
                <div className="space-y-3">
                  {debugData.map(
                    (
                      orgData: {
                        org: { name: string; code: string };
                        roles: { name: string; permissions: string[] }[];
                      },
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="border-l-2 border-yellow-300 pl-3"
                      >
                        <div className="font-medium">
                          {orgData.org.name} ({orgData.org.code})
                        </div>
                        <div className="text-sm text-gray-600">
                          {orgData.roles.length === 0 ? (
                            <p>No roles found</p>
                          ) : (
                            <ul className="ml-4">
                              {orgData.roles.map(
                                (
                                  role: { name: string; permissions: string[] },
                                  roleIndex: number,
                                ) => (
                                  <li key={roleIndex}>
                                    <strong>{role.name}</strong> -{" "}
                                    {role.permissions.length} permissions
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
}
