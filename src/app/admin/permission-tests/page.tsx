'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

export default function PermissionTestsPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  const createTestOrg = useMutation(api.permissions.createTestOrgWithRoles);
  const createTestUsers = useMutation(api.permissions.createTestUsers);
  const runTests = useQuery(api.permissions.runPermissionTests);
  const debugData = useQuery(api.permissions.debugOrganisationsAndRoles);

  const handleCreateTestOrg = async () => {
    setOrgLoading(true);
    try {
      console.log('Creating test organisation...');
      const result = await createTestOrg();
      console.log('Test organisation created:', result);
      alert(`Created test organisation with ${result.roles.length} roles and ${result.permissions.length} permissions`);
    } catch (error) {
      console.error('Error creating test organisation:', error);
      alert('Error creating test organisation: ' + (error as Error).message);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateTestUsers = async () => {
    setUserLoading(true);
    try {
      console.log('Creating test users...');
      const result = await createTestUsers();
      console.log('Test users created:', result);
      alert(`Created ${result.users.length} test users with ${result.roleAssignments.length} role assignments`);
    } catch (error) {
      console.error('Error creating test users:', error);
      alert('Error creating test users: ' + (error as Error).message);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSetupTestData = async () => {
    setIsLoading(true);
    try {
      console.log('Creating test organisation...');
      await createTestOrg();
      
      console.log('Creating test users...');
      await createTestUsers();
      
      console.log('Test data created successfully!');
      alert('Test data created successfully!');
    } catch (error) {
      console.error('Error setting up test data:', error);
      alert('Error setting up test data: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTests = () => {
    setTestResults(runTests);
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Permission System Tests</CardTitle>
          <CardDescription>
            Test the permission system with different user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Setup Test Data</h4>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleCreateTestOrg} 
                  disabled={orgLoading}
                  className="w-full"
                >
                  {orgLoading ? 'Creating...' : 'Create Test Org with Roles'}
                </Button>
                <Button 
                  onClick={handleCreateTestUsers} 
                  disabled={userLoading}
                  variant="outline"
                  className="w-full"
                >
                  {userLoading ? 'Creating...' : 'Create Test Users'}
                </Button>
                <Button 
                  onClick={handleSetupTestData} 
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  {isLoading ? 'Setting up...' : 'Setup All Test Data'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Run Tests</h4>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleRunTests}
                  variant="outline"
                  className="w-full"
                >
                  Run Permission Tests
                </Button>
              </div>
            </div>
          </div>

          {testResults && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <h3 className="text-lg font-semibold">Test Results</h3>
                <Badge variant={testResults.summary.failedTests === 0 ? "default" : "destructive"}>
                  {testResults.summary.passedTests}/{testResults.summary.totalTests} passed
                </Badge>
              </div>

              {testResults.testResults.map((userTest: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{userTest.userId}</CardTitle>
                      <Badge variant={userTest.allPassed ? "default" : "destructive"}>
                        {userTest.allPassed ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userTest.results.map((result: any, resultIndex: number) => (
                        <div key={resultIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-mono text-sm">{result.permission}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              Expected: {result.expected ? '✅' : '❌'}
                            </span>
                            <span className="text-sm">
                              Actual: {result.actual ? '✅' : '❌'}
                            </span>
                            <Badge variant={result.passed ? "default" : "destructive"}>
                              {result.passed ? "PASS" : "FAIL"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Test Users Created:</h4>
            <ul className="space-y-1 text-sm">
              <li><strong>test_admin_user</strong> - Admin role (all permissions)</li>
              <li><strong>test_manager_user</strong> - Manager role (staff.create, staff.edit, users.edit)</li>
              <li><strong>test_lecturer_user</strong> - Lecturer role (no permissions)</li>
              <li><strong>test_sysadmin_user</strong> - System admin (bypasses all checks)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold mb-2">Expected Test Results:</h4>
            <ul className="space-y-1 text-sm">
              <li><strong>Admin:</strong> All permissions = true</li>
              <li><strong>Manager:</strong> staff.create=true, staff.edit=true, users.invite=false, users.edit=true</li>
              <li><strong>Lecturer:</strong> All permissions = false</li>
              <li><strong>Sysadmin:</strong> All permissions = true (including non-existent ones)</li>
            </ul>
          </div>

          {debugData && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold mb-2">Current Organizations & Roles:</h4>
              {debugData.length === 0 ? (
                <p className="text-sm text-gray-600">No organizations found. Create test data first.</p>
              ) : (
                <div className="space-y-3">
                  {debugData.map((orgData: any, index: number) => (
                    <div key={index} className="border-l-2 border-yellow-300 pl-3">
                      <div className="font-medium">{orgData.org.name} ({orgData.org.code})</div>
                      <div className="text-sm text-gray-600">
                        {orgData.roles.length === 0 ? (
                          <p>No roles found</p>
                        ) : (
                          <ul className="ml-4">
                            {orgData.roles.map((role: any, roleIndex: number) => (
                              <li key={roleIndex}>
                                <strong>{role.name}</strong> - {role.permissions.length} permissions
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 