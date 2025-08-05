'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAuditLogs, getAuditStats } from '@/lib/actions/auditActions';

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  performedBy: string;
  performedByName?: string;
  organisationId?: string;
  details?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  severity?: string;
}

interface AuditStats {
  totalLogs: number;
  actionCounts: Record<string, number>;
  entityTypeCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  uniqueUsers: number;
  userCounts: Record<string, number>;
}

const ENTITY_TYPES = [
  'user',
  'organisation',
  'module',
  'academic_year',
  'system',
] as const;

const ACTIONS = [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'permission_change',
  'error',
] as const;

const SEVERITIES = [
  'info',
  'warning',
  'error',
  'critical',
] as const;

export function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    severity: '',
    limit: 50,
  });

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const auditLogs = await getAuditLogs(filters);
      setLogs(auditLogs as AuditLog[]);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const auditStats = await getAuditStats();
      setStats(auditStats as AuditStats);
    } catch (error) {
      console.error('Failed to load audit stats:', error);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [filters, loadLogs, loadStats]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'permission_change':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Active Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(stats.actionCounts)
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Active Entity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(stats.entityTypeCounts)
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>View and filter system audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={filters.entityType || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {ENTITY_TYPES.filter((type) => typeof type === 'string' && !!type).map((type) => {
                    if (typeof type !== 'string') {
                      console.error('Invalid ENTITY_TYPE:', type);
                      return null;
                    }
                    return (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={filters.action || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, action: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.filter((action) => typeof action === 'string' && !!action).map((action) => {
                    if (typeof action !== 'string') {
                      console.error('Invalid ACTION:', action);
                      return null;
                    }
                    return (
                      <SelectItem key={action} value={action}>
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={filters.severity || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value === 'all' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {SEVERITIES.filter((severity) => typeof severity === 'string' && !!severity).map((severity) => {
                    if (typeof severity !== 'string') {
                      console.error('Invalid SEVERITY:', severity);
                      return null;
                    }
                    return (
                      <SelectItem key={severity} value={severity}>
                        {severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Select
                value={filters.limit ? filters.limit.toString() : '50'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={loadLogs} disabled={isLoading} className="mb-4">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>

          {/* Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="font-mono text-sm">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.entityType}</div>
                        {log.entityName && (
                          <div className="text-sm text-gray-500">{log.entityName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.performedByName || log.performedBy}</div>
                        <div className="text-sm text-gray-500">{log.performedBy}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={log.details}>
                        {log.details}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.severity && (
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ipAddress}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {logs.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No audit logs found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 