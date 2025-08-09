'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { getAuditLogs, getAuditStats } from '@/lib/actions/auditActions';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Calendar, 
  User, 
  Building2, 
  AlertTriangle, 
  Eye,
  Clock,
  Shield,
  Users,
  FileText,
  Database,
  Settings,
  List,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';



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
  hourlyActivity?: Record<number, number>;
  topActions?: [string, number][];
  topEntities?: [string, number][];
  topUsers?: [string, number][];
  criticalLogs?: number;
  errorLogs?: number;
  warningLogs?: number;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

const ENTITY_TYPES = [
  'user',
  'organisation',
  'module',
  'academic_year',
  'system',
  'permission',
  'role',
] as const;

const ACTIONS = [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'permission.change',
  'error',
  'deactivate',
  'reactivate',
  'password.reset',
  'email.update',
  'status.change',
  'maintenance',
  'data.export',
  'data.import',
  'login.failed',
  'account.locked',
  'suspicious.activity',
  'permission.assigned',
  'permission.revoked',
  'permission.pushed',
  'role.created',
  'role.updated',
  'role.deleted',
] as const;

const SEVERITIES = [
  'info',
  'warning',
  'error',
  'critical',
] as const;

const TIME_RANGES = [
  { label: 'Last Hour', value: 1 },
  { label: 'Last 24 Hours', value: 24 },
  { label: 'Last 7 Days', value: 168 },
  { label: 'Last 30 Days', value: 720 },
  { label: 'All Time', value: 0 },
] as const;



export function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalFilteredLogs, setTotalFilteredLogs] = useState(0);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    severity: '',
    search: '',
    timeRange: 24,
    limit: 25,
  });

  const formatWords = (input: string, separators: RegExp) =>
    input
      .split(separators)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const formatActionLabel = (action: string) => formatWords(action, /[._]/g);
  const formatEntityTypeLabel = (entityType: string) => formatWords(entityType, /[_]/g);

  const loadLogs = useCallback(async (page = 1, cursor?: string | null, reset = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const args = {
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.timeRange > 0 ? { startDate: Date.now() - (filters.timeRange * 60 * 60 * 1000) } : {}),
        ...(cursor ? { cursor } : {}),
        ...(filters.limit ? { limit: filters.limit } : {}),
      } as const;
      const auditLogs = await getAuditLogs(args as any);
      
      // Handle both array and object response formats
      if (Array.isArray(auditLogs)) {
        const logsArray = auditLogs as AuditLog[];
        if (reset || page === 1) {
          setLogs(logsArray);
          setCurrentPage(1);
        } else {
          setLogs(prev => [...prev, ...logsArray]);
        }
        setHasMore(false);
        setNextCursor(null);
        setTotalLogs(logsArray.length);
      } else {
              const response = auditLogs as AuditLogsResponse;
      const logsArray = response?.logs || [];
      console.log('Audit logs response:', { 
        logsCount: logsArray.length, 
        hasMore: response?.hasMore, 
        nextCursor: response?.nextCursor,
        page,
        reset
      });
      
      if (reset || page === 1) {
        setLogs(logsArray as AuditLog[]);
        setCurrentPage(1);
      } else {
        setLogs(prev => [...prev, ...(logsArray as AuditLog[])]);
      }
        setHasMore(!!response?.hasMore);
        setNextCursor(response?.nextCursor ?? null);
        // For cursor-based pagination, we accumulate the loaded logs
        if (page === 1) {
          setTotalLogs(logsArray.length);
        } else {
          setTotalLogs(prev => prev + logsArray.length);
        }
        // Note: totalFilteredLogs is set from the stats, not from individual page loads
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const auditStats = await getAuditStats({
        ...(filters.timeRange > 0 ? { startDate: Date.now() - (filters.timeRange * 60 * 60 * 1000) } : {}),
      });
      setStats(auditStats as AuditStats);
      // Update the total filtered logs count from stats
      if (auditStats && typeof auditStats === 'object' && 'totalLogs' in auditStats) {
        setTotalFilteredLogs(auditStats.totalLogs);
      }
    } catch (error) {
      console.error('Failed to load audit stats:', error);
      setStats(null);
    }
  }, [filters.timeRange]);

  useEffect(() => {
    setCurrentPage(1);
    setTotalLogs(0);
    // Don't reset totalFilteredLogs here - it will be set by loadStats
    loadLogs(1, undefined, true);
    loadStats();
  }, [loadLogs, loadStats]);

  const loadMore = useCallback(() => {
    console.log('loadMore called:', { hasMore, nextCursor, isLoading, currentPage });
    if (hasMore && nextCursor && !isLoading) {
      const nextPage = currentPage + 1;
      console.log('Loading next page:', nextPage, 'with cursor:', nextCursor);
      setCurrentPage(nextPage);
      loadLogs(nextPage, nextCursor);
    } else {
      console.log('Cannot load more:', { hasMore, nextCursor, isLoading });
    }
  }, [hasMore, nextCursor, isLoading, currentPage, loadLogs]);

  const goToPage = useCallback((page: number) => {
    if (page === 1) {
      setCurrentPage(1);
      setTotalLogs(0);
      // Don't reset totalFilteredLogs - it will be set by loadStats
      loadLogs(1, undefined, true);
    } else if (page < currentPage) {
      // For going back, we need to reset and reload from the beginning
      // This is a limitation of cursor-based pagination
      console.warn('Going back to previous pages not supported with cursor-based pagination');
    } else {
      // For pages > currentPage, we need to load all intermediate pages
      console.warn('Direct page navigation not supported with cursor-based pagination');
    }
  }, [loadLogs, currentPage]);



  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.round(diffInHours * 60)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.round(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getActionColor = (action: string) => {
    const a = action.replace(/_/g, '.');
    switch (a) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'login':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'logout':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'permission.change':
      case 'permission.assigned':
      case 'permission.revoked':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
      case 'login.failed':
      case 'account.locked':
      case 'suspicious.activity':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'deactivate':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'reactivate':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'password.reset':
      case 'email.update':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'maintenance':
      case 'data.export':
      case 'data.import':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'organisation':
        return <Building2 className="h-4 w-4" />;
      case 'module':
        return <FileText className="h-4 w-4" />;
      case 'academic_year':
        return <Calendar className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'permission':
        return <Shield className="h-4 w-4" />;
      case 'role':
        return <Users className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          log.action.toLowerCase().includes(searchLower) ||
          log.entityType.toLowerCase().includes(searchLower) ||
          log.entityName?.toLowerCase().includes(searchLower) ||
          log.performedByName?.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower) ||
          log.ipAddress?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [logs, filters.search]);





  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Error loading audit logs</p>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setError(null);
                loadLogs();
              }}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}





      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Monitor system activity and user actions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              >
                {viewMode === 'table' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadLogs(1)} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.timeRange.toString()}
                onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: parseInt(value) }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value.toString()}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Filters Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="font-medium">Filter Options</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Entity Type</label>
                        <Select
                          value={filters.entityType || 'all'}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, entityType: value === 'all' ? '' : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            {ENTITY_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Action</label>
                        <Select
                          value={filters.action || 'all'}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, action: value === 'all' ? '' : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All actions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All actions</SelectItem>
                            {ACTIONS.map((action) => (
                              <SelectItem key={action} value={action}>
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Severity</label>
                        <Select
                          value={filters.severity || 'all'}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value === 'all' ? '' : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All severities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All severities</SelectItem>
                            {SEVERITIES.map((severity) => (
                              <SelectItem key={severity} value={severity}>
                                {severity.charAt(0).toUpperCase() + severity.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            entityType: '',
                            action: '',
                            severity: '',
                            search: ''
                          }));
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading audit logs...</p>
            </div>
          )}

          {/* Logs Display */}
          {!isLoading && (
            <>
              {viewMode === 'table' ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="text-center font-bold text-gray-900">Time</TableHead>
                        <TableHead className="text-center font-bold text-gray-900">Action</TableHead>
                        <TableHead className="text-center font-bold text-gray-900">Entity</TableHead>
                        <TableHead className="text-center font-bold text-gray-900">Performed By</TableHead>
                        <TableHead className="text-center font-bold text-gray-900">Details</TableHead>
                        <TableHead className="text-center font-bold text-gray-900">Severity</TableHead>
                        <TableHead className="text-center font-bold text-gray-900">IP</TableHead>
                        <TableHead className="text-center font-bold text-gray-900"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log._id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionColor(log.action)}>
                              {formatActionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEntityIcon(log.entityType)}
                              <div>
                                <div className="font-medium">
                                  {(() => {
                                    const label = formatEntityTypeLabel(log.entityType);
                                    const href = (() => {
                                      switch (log.entityType) {
                                        case 'user': return `/admin/users`;
                                        case 'organisation': return `/admin/organisations`;
                                        case 'permission': return `/admin/permissions`;
                                        case 'role': return `/admin/permissions`; // roles live under permissions UI
                                        default: return undefined;
                                      }
                                    })();
                                    return href ? (
                                      <a className="underline underline-offset-2" href={href}>{label}</a>
                                    ) : label;
                                  })()}
                                </div>
                                {log.entityName && (
                                  <div className="text-sm text-gray-500">{log.entityName}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.performedByName || log.performedBy}</div>
                              <div className="text-sm text-gray-500">{log.performedBy}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <div className="truncate cursor-help">
                                    {log.details ? (
                                      log.details.length > 50 ? 
                                        `${log.details.substring(0, 50)}...` : 
                                        log.details
                                    ) : (
                                      <span className="text-gray-400 italic">No details</span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-md p-4 bg-white border border-gray-200 shadow-lg">
                                  <div className="space-y-3">
                                    <div className="font-semibold text-sm text-gray-900 border-b border-gray-200 pb-2">Details</div>
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                      {log.details || 'No additional details available'}
                                    </div>
                                    {log.metadata && (
                                      <>
                                        <div className="font-semibold text-sm text-gray-900 border-b border-gray-200 pb-2 pt-3">Metadata</div>
                                        <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-32 text-gray-800 font-mono">
                                          {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                        </pre>
                                      </>
                                    )}
                                  </div>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            {log.severity && (
                              <Badge className={getSeverityColor(log.severity)}>
                                {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ipAddress}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Audit Log Details</DialogTitle>
                                  <DialogDescription>
                                    Detailed information about this audit log entry
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="max-h-96 overflow-auto">
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-sm font-medium">Timestamp</Label>
                                      <p className="text-sm text-gray-600">
                                        {new Date(log.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                    <Separator />
                                    <div>
                                      <Label className="text-sm font-medium">Action</Label>
                                      <Badge className={getActionColor(log.action)}>
                                        {formatActionLabel(log.action)}
                                      </Badge>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Entity</Label>
                                      <div className="flex items-center gap-2 mt-1">
                                        {getEntityIcon(log.entityType)}
                                        <span className="text-sm">{formatEntityTypeLabel(log.entityType)}</span>
                                        {log.entityName && (
                                          <span className="text-sm text-gray-500">- {log.entityName}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Performed By</Label>
                                      <p className="text-sm">{log.performedByName || log.performedBy}</p>
                                      <p className="text-xs text-gray-500">{log.performedBy}</p>
                                    </div>
                                    {log.details && (
                                      <div>
                                        <Label className="text-sm font-medium">Details</Label>
                                        <p className="text-sm text-gray-600">{log.details}</p>
                                      </div>
                                    )}
                                    {log.metadata && (
                                      <div>
                                        <Label className="text-sm font-medium">Metadata</Label>
                                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                          {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium">IP Address</Label>
                                        <p className="text-sm font-mono">{log.ipAddress || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Severity</Label>
                                        {log.severity && (
                                          <Badge className={getSeverityColor(log.severity)}>
                                            {log.severity}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLogs.map((log) => (
                    <Card key={log._id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                                                  <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getEntityIcon(log.entityType)}
                              <span className="text-sm font-medium">{formatEntityTypeLabel(log.entityType)}</span>
                            </div>
                            {log.severity && (
                              <Badge className={getSeverityColor(log.severity)}>
                                {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                              </Badge>
                            )}
                          </div>
                                              <div className="flex items-center gap-2">
                        <Badge className={getActionColor(log.action)}>
                          {formatActionLabel(log.action)}
                        </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs font-medium">Performed By</Label>
                            <p className="text-sm">{log.performedByName || log.performedBy}</p>
                          </div>
                          {log.details && (
                            <div>
                              <Label className="text-xs font-medium">Details</Label>
                              <p className="text-sm text-gray-600 line-clamp-2">{log.details}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{log.ipAddress}</span>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Audit Log Details</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-96 overflow-auto">
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-sm font-medium">Timestamp</Label>
                                      <p className="text-sm text-gray-600">
                                        {new Date(log.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                    <Separator />
                                    <div>
                                      <Label className="text-sm font-medium">Action</Label>
                                      <Badge className={getActionColor(log.action)}>
                                        {log.action}
                                      </Badge>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Entity</Label>
                                      <div className="flex items-center gap-2 mt-1">
                                        {getEntityIcon(log.entityType)}
                                        <span className="text-sm">{log.entityType}</span>
                                        {log.entityName && (
                                          <span className="text-sm text-gray-500">- {log.entityName}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Performed By</Label>
                                      <p className="text-sm">{log.performedByName || log.performedBy}</p>
                                      <p className="text-xs text-gray-500">{log.performedBy}</p>
                                    </div>
                                    {log.details && (
                                      <div>
                                        <Label className="text-sm font-medium">Details</Label>
                                        <p className="text-sm text-gray-600">{log.details}</p>
                                      </div>
                                    )}
                                    {log.metadata && (
                                      <div>
                                        <Label className="text-sm font-medium">Metadata</Label>
                                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                          {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium">IP Address</Label>
                                        <p className="text-sm font-mono">{log.ipAddress || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Severity</Label>
                                        {log.severity && (
                                          <Badge className={getSeverityColor(log.severity)}>
                                            {log.severity}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Table Toolbar with Pagination */}
              <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-4">
                  {/* Logs Count */}
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">
                      {totalLogs > 0 ? (
                        (() => {
                          const startItem = (currentPage - 1) * filters.limit + 1;
                          const endItem = Math.min(currentPage * filters.limit, totalFilteredLogs);
                          return `Showing ${startItem}-${endItem} of ${totalFilteredLogs} logs`;
                        })()
                      ) : (
                        'No logs found'
                      )}
                    </span>
                    {hasMore && <span className="text-gray-500"> (more available)</span>}
                  </div>
                  
                  {/* Search Filter Badge */}
                  {filters.search && (
                    <Badge variant="outline" className="text-xs">
                      Filtered by: &quot;{filters.search}&quot;
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Limit Dropdown */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="limit" className="text-sm text-gray-700">Show:</Label>
                    <Select
                      value={filters.limit.toString()}
                                             onValueChange={(value) => {
                         const newLimit = parseInt(value);
                         setFilters(prev => ({ ...prev, limit: newLimit }));
                         // Just update the limit without reloading - keep current position
                       }}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Page Navigation */}
                  <div className="flex items-center gap-1">
                                         <Button
                       variant="outline"
                       size="sm"
                       onClick={() => goToPage(1)}
                       disabled={currentPage === 1 || isLoading}
                       className="h-8 px-3"
                     >
                       <ChevronsLeft className="h-4 w-4 mr-1" />
                       First
                     </Button>
                     
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => goToPage(currentPage - 1)}
                       disabled={currentPage === 1 || isLoading}
                       className="h-8 px-3"
                     >
                       <ChevronLeft className="h-4 w-4 mr-1" />
                       Previous
                     </Button>
                    
                    <span className="px-3 py-1 text-sm text-gray-700 bg-white border rounded-md">
                      Page {currentPage}
                    </span>
                    
                                         <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         console.log('Next button clicked');
                         loadMore();
                       }}
                       disabled={!hasMore || isLoading}
                       className="h-8 px-3"
                     >
                       {isLoading ? (
                         <RefreshCw className="h-4 w-4 animate-spin" />
                       ) : (
                         <>
                           <ChevronRight className="h-4 w-4" />
                           Next
                         </>
                       )}
                     </Button>
                     
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         // For cursor-based pagination, we can't jump to last page directly
                         // This would load all remaining pages
                         console.warn('Jump to last page not supported with cursor-based pagination');
                       }}
                       disabled={!hasMore || isLoading}
                       className="h-8 px-3"
                       title="Go to last page (not supported with cursor-based pagination)"
                     >
                       <ChevronsRight className="h-4 w-4 mr-1" />
                       Last
                     </Button>
                  </div>
                </div>
              </div>

              {filteredLogs.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                  <p className="text-gray-500">
                    {filters.search || filters.entityType || filters.action || filters.severity
                      ? 'Try adjusting your filters or search terms.'
                      : 'No audit logs match the current criteria.'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 