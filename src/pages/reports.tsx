import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  Globe,
  Phone,
  Clock,
  Users,
  Target,
  BarChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// Types
interface ReportSummary {
  totalCalls: number;
  totalDuration: number;
  successRate: number;
  avgDuration: number;
  activeCampaigns: number;
  totalCustomers: number;
}

interface TrendData {
  date: string;
  calls: number;
  completed: number;
  failed: number;
  duration: number;
}

interface CampaignReport {
  id: number;
  name: string;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  successRate: number;
  avgDuration: number;
  totalCustomers: number;
}

interface LanguageReport {
  language: string;
  totalCalls: number;
  successRate: number;
  avgDuration: number;
}

interface HourlyReport {
  hour: number;
  calls: number;
  successRate: number;
}

// Chart colors
const COLORS = {
  primary: "hsl(250 95% 60%)",
  secondary: "hsl(25 95% 55%)",
  success: "hsl(142 76% 36%)",
  warning: "hsl(38 92% 50%)",
  info: "hsl(200 98% 45%)",
  muted: "hsl(215 16% 47%)",
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.info];

// Language labels
const languageLabels: Record<string, string> = {
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [campaignReports, setCampaignReports] = useState<CampaignReport[]>([]);
  const [languageReports, setLanguageReports] = useState<LanguageReport[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyReport[]>([]);

  // Fetch report data
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append("start_date", dateRange.start.toISOString().split("T")[0]);
      if (dateRange.end) params.append("end_date", dateRange.end.toISOString().split("T")[0]);
      if (selectedCampaign) params.append("campaign_id", selectedCampaign);

      const response = await apiFetch(`/api/reports?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setSummary(result.data.summary);
        setTrendData(result.data.trends || []);
        setCampaignReports(result.data.campaigns || []);
        setLanguageReports(result.data.languages || []);
        setHourlyData(result.data.hourly || []);
      } else {
        toast.error(result.error || "Failed to fetch report data");
      }
    } catch (error) {
      toast.error("Network error, please try again later");
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedCampaign]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m ${seconds % 60}s`;
  };

  // Format number
  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate trend
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: "neutral" as const };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? "up" : change < 0 ? "down" : "neutral" as const,
    };
  };

  // Export report
  const handleExport = async (format: "csv" | "pdf") => {
    try {
      const params = new URLSearchParams();
      params.append("format", format);
      if (dateRange.start) params.append("start_date", dateRange.start.toISOString().split("T")[0]);
      if (dateRange.end) params.append("end_date", dateRange.end.toISOString().split("T")[0]);

      const response = await apiFetch(`/api/reports/export?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `report_${new Date().toISOString().split("T")[0]}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export successful");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  // Loading skeleton
  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Report Analysis
            </h1>
            <p className="text-sm text-muted-foreground">
              View call data statistics, trend analysis and export reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Date Range:</span>
              </div>
              <DatePicker
                value={dateRange.start}
                onChange={(date) => setDateRange((prev) => ({ ...prev, start: date }))}
                placeholder="Start Date"
                className="w-[160px]"
              />
              <span className="text-muted-foreground">to</span>
              <DatePicker
                value={dateRange.end}
                onChange={(date) => setDateRange((prev) => ({ ...prev, end: date }))}
                placeholder="End Date"
                className="w-[160px]"
              />
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Campaigns</SelectItem>
                  {campaignReports.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchReports}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totalCalls)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">{formatPercent(summary.successRate)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold">{formatDuration(summary.avgDuration)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active Campaigns</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.activeCampaigns)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Call Volume Trend */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart className="h-4 w-4 text-primary" />
                    Call Volume Trend
                  </CardTitle>
                  <CardDescription>Daily call volume and completion status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          stroke="hsl(215 16% 47%)"
                          fontSize={12}
                        />
                        <YAxis stroke="hsl(215 16% 47%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0 0% 100%)",
                            border: "1px solid hsl(214 32% 91%)",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="calls"
                          stroke={COLORS.primary}
                          fillOpacity={1}
                          fill="url(#colorCalls)"
                          name="Total Calls"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Success Rate Trend */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Success Rate Trend
                  </CardTitle>
                  <CardDescription>Daily call success rate changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          stroke="hsl(215 16% 47%)"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="hsl(215 16% 47%)"
                          fontSize={12}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0 0% 100%)",
                            border: "1px solid hsl(214 32% 91%)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, "Success Rate"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="successRate"
                          stroke={COLORS.success}
                          strokeWidth={2}
                          dot={false}
                          name="Success Rate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Hourly Distribution */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-amber-600" />
                    Hourly Call Distribution
                  </CardTitle>
                  <CardDescription>Call volume by hour of day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(value) => `${value}:00`}
                          stroke="hsl(215 16% 47%)"
                          fontSize={12}
                        />
                        <YAxis stroke="hsl(215 16% 47%)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0 0% 100%)",
                            border: "1px solid hsl(214 32% 91%)",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="calls" fill={COLORS.primary} name="Call Volume" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Duration Distribution */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChart className="h-4 w-4 text-blue-600" />
                    Call Duration Distribution
                  </CardTitle>
                  <CardDescription>Call duration distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: "< 1 min", value: 25 },
                            { name: "1-3 min", value: 35 },
                            { name: "3-5 min", value: 25 },
                            { name: "5-10 min", value: 12 },
                            { name: "> 10 min", value: 3 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {PIE_COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Call Trend Analysis</CardTitle>
                <CardDescription>Call volume, completion and duration trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        stroke="hsl(215 16% 47%)"
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" stroke="hsl(215 16% 47%)" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(215 16% 47%)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(0 0% 100%)",
                          border: "1px solid hsl(214 32% 91%)",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="calls"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        name="Total Calls"
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="completed"
                        stroke={COLORS.success}
                        strokeWidth={2}
                        name="Completed"
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="failed"
                        stroke={COLORS.warning}
                        strokeWidth={2}
                        name="Failed"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Call statistics for each campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead className="text-right">Total Calls</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead className="text-right">Avg Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          No campaign data
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaignReports.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(campaign.totalCalls)}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatNumber(campaign.completedCalls)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatNumber(campaign.failedCalls)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={campaign.successRate >= 70 ? "success" : campaign.successRate >= 40 ? "warning" : "destructive"}
                            >
                              {formatPercent(campaign.successRate)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatDuration(campaign.avgDuration)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Languages Tab */}
          <TabsContent value="languages" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Language Distribution
                  </CardTitle>
                  <CardDescription>Call volume by language</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={languageReports}
                        layout="vertical"
                        margin={{ left: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                        <XAxis type="number" stroke="hsl(215 16% 47%)" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="language"
                          tickFormatter={(value) => languageLabels[value] || value}
                          stroke="hsl(215 16% 47%)"
                          fontSize={12}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0 0% 100%)",
                            border: "1px solid hsl(214 32% 91%)",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="totalCalls" fill={COLORS.primary} name="Total Calls" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Language Performance</CardTitle>
                  <CardDescription>Success rate and average duration by language</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Language</TableHead>
                        <TableHead className="text-right">Total Calls</TableHead>
                        <TableHead className="text-right">Success Rate</TableHead>
                        <TableHead className="text-right">Avg Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {languageReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                            No language data
                          </TableCell>
                        </TableRow>
                      ) : (
                        languageReports.map((lang) => (
                          <TableRow key={lang.language}>
                            <TableCell className="font-medium">
                              {languageLabels[lang.language] || lang.language}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(lang.totalCalls)}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={lang.successRate >= 70 ? "success" : lang.successRate >= 40 ? "warning" : "destructive"}
                              >
                                {formatPercent(lang.successRate)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatDuration(lang.avgDuration)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
