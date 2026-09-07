import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  Phone,
  Users,
  Clock,
  TrendingUp,
  Pause,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Headphones,
  BarChart3,
  Zap,
  Server,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface LiveCall {
  id: number;
  campaign_id: number;
  campaign_name: string;
  customer_name: string;
  phone: string;
  status: "dialing" | "connected" | "speaking" | "ended";
  duration: number;
  sentiment: "positive" | "neutral" | "negative";
  started_at: string;
}

interface ActiveCampaign {
  id: number;
  name: string;
  status: "running" | "paused";
  total_customers: number;
  completed_calls: number;
  success_rate: number;
  calls_per_minute: number;
}

interface QueueStatus {
  waiting: number;
  in_progress: number;
  completed_today: number;
  failed_today: number;
}

interface SystemStats {
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  avg_response_time: number;
}

interface MonitoringData {
  live_calls: LiveCall[];
  active_campaigns: ActiveCampaign[];
  queue_status: QueueStatus;
  system_stats: SystemStats;
}

// Pulse animation component
function PulseDot({ color = "green", size = "md" }: { color?: "green" | "orange" | "blue"; size?: "sm" | "md" | "lg" }) {
  const colorClasses = {
    green: "bg-green-500",
    orange: "bg-[hsl(25_95%_55%)]",
    blue: "bg-[hsl(250_95%_60%)]",
  };
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };
  return (
    <span className={cn("relative flex", sizeClasses[size])}>
      <span
        className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          colorClasses[color]
        )}
      />
      <span className={cn("relative inline-flex rounded-full", colorClasses[color], sizeClasses[size])} />
    </span>
  );
}

// Format duration to mm:ss
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Get status badge
function CallStatusBadge({ status }: { status: LiveCall["status"] }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
    dialing: { label: "Dialing", variant: "warning" },
    connected: { label: "Connected", variant: "default" },
    speaking: { label: "Speaking", variant: "success" },
    ended: { label: "Ended", variant: "secondary" },
  };
  const { label, variant } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

// Get sentiment badge
function SentimentBadge({ sentiment }: { sentiment: LiveCall["sentiment"] }) {
  const variants: Record<string, { label: string; className: string }> = {
    positive: { label: "Positive", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
    neutral: { label: "Neutral", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    negative: { label: "Negative", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  };
  const { label, className } = variants[sentiment];
  return <Badge className={className}>{label}</Badge>;
}

// Live Call Card
function LiveCallCard({ call }: { call: LiveCall }) {
  const isActive = call.status === "speaking" || call.status === "connected";
  
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isActive && "border-[hsl(250_95%_60%)]/30 ring-1 ring-[hsl(250_95%_60%)]/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[hsl(250_95%_95%)] dark:bg-[hsl(250_95%_20%)] flex items-center justify-center">
                <Phone className="w-5 h-5 text-[hsl(250_95%_60%)]" />
              </div>
              {isActive && (
                <div className="absolute -top-1 -right-1">
                  <PulseDot color="green" size="sm" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{call.customer_name}</p>
              <p className="text-xs text-muted-foreground">{call.phone}</p>
            </div>
          </div>
          <CallStatusBadge status={call.status} />
        </div>
        
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Campaign:</span>
            <span className="font-medium truncate max-w-[120px]">{call.campaign_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono tabular-nums">{formatDuration(call.duration)}</span>
          </div>
        </div>
        
        {isActive && (
          <div className="mt-3 flex items-center justify-between">
            <SentimentBadge sentiment={call.sentiment} />
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Headphones className="w-3 h-3 mr-1" />
              Listen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Campaign Progress Card
function CampaignProgressCard({ 
  campaign, 
  onToggle 
}: { 
  campaign: ActiveCampaign; 
  onToggle: (id: number, action: "pause" | "resume") => void;
}) {
  const progress = Math.round((campaign.completed_calls / campaign.total_customers) * 100);
  const isRunning = campaign.status === "running";
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">{campaign.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              {isRunning ? (
                <>
                  <PulseDot color="orange" size="sm" />
                  <span className="text-xs text-[hsl(25_95%_55%)]">Running</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Paused</span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggle(campaign.id, isRunning ? "pause" : "resume")}
          >
            {isRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{campaign.completed_calls.toLocaleString()} / {campaign.total_customers.toLocaleString()}</span>
            <span>{campaign.calls_per_minute} calls/min</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>Success Rate {campaign.success_rate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stat Card
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color = "primary"
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  color?: "primary" | "accent" | "success" | "warning";
}) {
  const colorClasses = {
    primary: "bg-[hsl(250_95%_95%)] text-[hsl(250_95%_60%)] dark:bg-[hsl(250_95%_20%)]",
    accent: "bg-[hsl(25_95%_95%)] text-[hsl(25_95%_55%)] dark:bg-[hsl(25_95%_20%)]",
    success: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className={cn(
                  "w-3 h-3",
                  trendUp ? "text-green-500" : "text-red-500 rotate-180"
                )} />
                <span className={cn(
                  "text-xs",
                  trendUp ? "text-green-500" : "text-red-500"
                )}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// System Metric Bar
function SystemMetricBar({ 
  label, 
  value, 
  max = 100,
  color = "primary"
}: { 
  label: string; 
  value: number; 
  max?: number;
  color?: "primary" | "warning" | "danger";
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses = {
    primary: "bg-[hsl(250_95%_60%)]",
    warning: "bg-[hsl(25_95%_55%)]",
    danger: "bg-red-500",
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function Monitoring() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch monitoring data
  const fetchData = useCallback(async () => {
    try {
      const response = await apiFetch("/api/monitoring");
      if (!response.ok) throw new Error("Failed to fetch monitoring data");
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle campaign status
  const handleToggleCampaign = async (id: number, action: "pause" | "resume") => {
    try {
      const response = await apiFetch(`/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Failed to ${action} campaign`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Real-time Monitoring</h1>
            <p className="text-muted-foreground">View system real-time status</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4 animate-pulse" />
            Loading...
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Real-time Monitoring</h1>
            <p className="text-muted-foreground">View system real-time status</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to Load</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </Card>
      </div>
    );
  }

  const liveCalls = data?.live_calls || [];
  const activeCampaigns = data?.active_campaigns || [];
  const queueStatus = data?.queue_status || { waiting: 0, in_progress: 0, completed_today: 0, failed_today: 0 };
  const systemStats = data?.system_stats || { cpu_usage: 0, memory_usage: 0, active_connections: 0, avg_response_time: 0 };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Real-time Monitoring</h1>
          <p className="text-muted-foreground">View system real-time status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PulseDot color="green" size="sm" />
            Live Updates
          </div>
          <span className="text-xs text-muted-foreground">
            Last Updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Calls"
          value={liveCalls.filter(c => c.status !== "ended").length}
          icon={Phone}
          trend="+12%"
          trendUp={true}
          color="primary"
        />
        <StatCard
          title="Waiting Queue"
          value={queueStatus.waiting}
          icon={Users}
          trend="-5%"
          trendUp={false}
          color="accent"
        />
        <StatCard
          title="Completed Today"
          value={queueStatus.completed_today.toLocaleString()}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Failed Today"
          value={queueStatus.failed_today}
          icon={XCircle}
          color="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Calls - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[hsl(250_95%_60%)]" />
                  <CardTitle>Live Calls</CardTitle>
                </div>
                <Badge variant="outline" className="font-mono">
                  {liveCalls.filter(c => c.status !== "ended").length} Active
                </Badge>
              </div>
              <CardDescription>Real-time monitoring of ongoing calls</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {liveCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Phone className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No Active Calls</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Calls will appear here automatically when they start
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {liveCalls.map((call) => (
                      <LiveCallCard key={call.id} call={call} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[hsl(250_95%_60%)]" />
                  <CardTitle>Campaign Progress</CardTitle>
                </div>
                <Badge variant="outline">
                  {activeCampaigns.filter(c => c.status === "running").length} Running
                </Badge>
              </div>
              <CardDescription>Real-time progress of active campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {activeCampaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No Active Campaigns
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCampaigns.map((campaign) => (
                    <CampaignProgressCard
                      key={campaign.id}
                      campaign={campaign}
                      onToggle={handleToggleCampaign}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Queue & System Stats */}
        <div className="space-y-4">
          {/* Queue Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[hsl(250_95%_60%)]" />
                <CardTitle>Queue Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[hsl(25_95%_55%)]" />
                  <span className="text-sm">Waiting</span>
                </div>
                <span className="text-lg font-semibold tabular-nums">{queueStatus.waiting}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="text-lg font-semibold tabular-nums">{queueStatus.in_progress}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed Today</span>
                  <span className="font-medium text-green-600">{queueStatus.completed_today.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Failed Today</span>
                  <span className="font-medium text-red-600">{queueStatus.failed_today}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Stats */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[hsl(250_95%_60%)]" />
                <CardTitle>System Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SystemMetricBar
                label="CPU Usage"
                value={systemStats.cpu_usage}
                color={systemStats.cpu_usage > 80 ? "danger" : systemStats.cpu_usage > 60 ? "warning" : "primary"}
              />
              <SystemMetricBar
                label="Memory Usage"
                value={systemStats.memory_usage}
                color={systemStats.memory_usage > 80 ? "danger" : systemStats.memory_usage > 60 ? "warning" : "primary"}
              />
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Active Connections
                  </span>
                  <span className="font-medium tabular-nums">{systemStats.active_connections}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Avg Response
                  </span>
                  <span className="font-medium tabular-nums">{systemStats.avg_response_time}ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause All Campaigns
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MoreHorizontal className="w-4 h-4 mr-2" />
                View Detailed Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
