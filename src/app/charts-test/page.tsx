"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Chart configuration for theming
const chartConfig = {
  actions: {
    label: "Actions",
    color: "hsl(var(--chart-1))",
  },
  entities: {
    label: "Entities",
    color: "hsl(var(--chart-2))",
  },
  users: {
    label: "Users",
    color: "hsl(var(--chart-3))",
  },
  severity: {
    label: "Severity",
    color: "hsl(var(--chart-4))",
  },
  info: {
    label: "Info",
    color: "hsl(var(--chart-1))",
  },
  warning: {
    label: "Warning",
    color: "hsl(var(--chart-2))",
  },
  error: {
    label: "Error",
    color: "hsl(var(--chart-3))",
  },
  critical: {
    label: "Critical",
    color: "hsl(var(--chart-4))",
  },
};

export default function ChartsTestPage() {
  const [timeRange, setTimeRange] = useState<number>(24 * 60 * 60 * 1000); // 24 hours default
  const [selectedOrganisation, setSelectedOrganisation] = useState<string>("");

  // Fetch audit statistics
  const stats = useQuery(
    api.audit.getStats,
    selectedOrganisation
      ? {
          organisationId: selectedOrganisation,
          startDate: Date.now() - timeRange,
          endDate: Date.now(),
        }
      : { startDate: Date.now() - timeRange, endDate: Date.now() },
  );

  // Fetch recent logs for detailed analysis
  const recentLogs = useQuery(
    api.audit.getRecentLogs,
    selectedOrganisation
      ? { limit: 100, organisationId: selectedOrganisation }
      : { limit: 100 },
  );

  // Fetch organisations for filtering
  const organisations = useQuery(api.organisations.list);

  // Process data for charts
  const processChartData = () => {
    if (!stats)
      return {
        actionData: [],
        entityData: [],
        severityData: [],
        hourlyData: [],
      };

    // Action counts data
    const actionData = Object.entries(stats.actionCounts).map(
      ([action, count]) => ({
        name: action,
        value: count,
      }),
    );

    // Entity type counts data
    const entityData = Object.entries(stats.entityTypeCounts).map(
      ([entity, count]) => ({
        name: entity,
        value: count,
      }),
    );

    // Severity counts data
    const severityData = Object.entries(stats.severityCounts).map(
      ([severity, count]) => ({
        name: severity,
        value: count,
      }),
    );

    // Hourly activity data (last 24 hours)
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const count = stats.hourlyActivity[hour] || 0;
      return {
        hour: `${hour}:00`,
        actions: count,
      };
    });

    return { actionData, entityData, severityData, hourlyData };
  };

  const { actionData, entityData, severityData, hourlyData } =
    processChartData();

  // Color palette for charts
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Charts Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Test and visualize audit log data with various chart types
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedOrganisation}
            onValueChange={setSelectedOrganisation}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Organisations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Organisations</SelectItem>
              {organisations?.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={timeRange.toString()}
            onValueChange={(value) => setTimeRange(Number(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(24 * 60 * 60 * 1000).toString()}>
                24h
              </SelectItem>
              <SelectItem value={(7 * 24 * 60 * 60 * 1000).toString()}>
                7d
              </SelectItem>
              <SelectItem value={(30 * 24 * 60 * 60 * 1000).toString()}>
                30d
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.criticalLogs}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg/Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageLogsPerHour.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hourly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hourly">Hourly Activity</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="severity">Severity</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="hourly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity (Last 24 Hours)</CardTitle>
              <CardDescription>
                Number of audit log entries per hour
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="actions"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-1))" }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Actions (Bar Chart)</CardTitle>
                <CardDescription>Most common audit actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <BarChart data={actionData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions Distribution (Pie Chart)</CardTitle>
                <CardDescription>Distribution of audit actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <PieChart>
                    <Pie
                      data={actionData.slice(0, 8)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {actionData.slice(0, 8).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Entity Types (Area Chart)</CardTitle>
                <CardDescription>Audit activity by entity type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <AreaChart data={entityData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entity Distribution (Pie Chart)</CardTitle>
                <CardDescription>Distribution of entity types</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <PieChart>
                    <Pie
                      data={entityData.slice(0, 6)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {entityData.slice(0, 6).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Severity Levels (Bar Chart)</CardTitle>
                <CardDescription>Audit logs by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <BarChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution (Pie Chart)</CardTitle>
                <CardDescription>
                  Distribution of severity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {severityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Activity</CardTitle>
              <CardDescription>Most active users in audit logs</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <BarChart
                  data={stats.topUsers.map(([user, count]) => ({
                    name: user,
                    value: count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Raw Data Display */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Logs (Raw Data)</CardTitle>
          <CardDescription>
            Latest audit log entries for reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentLogs?.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      log.severity === "critical" ? "destructive" : "secondary"
                    }
                  >
                    {log.severity}
                  </Badge>
                  <span className="font-medium">{log.action}</span>
                  <span className="text-muted-foreground">on</span>
                  <span>{log.entityType}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
