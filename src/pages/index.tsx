import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Phone,
  Users,
  TrendingUp,
  Clock,
  Activity,
  ArrowRight,
  Play,
  Pause,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiFetch } from '@/lib/api'
import type { CampaignsS622Aa9440Row, CallsS622Aa9440Row } from '@/types/database'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

interface DashboardData {
  totalCampaigns: number
  activeCampaigns: number
  todayCalls: number
  successRate: number
  avgDuration: number
  recentCampaigns: CampaignsS622Aa9440Row[]
  recentCalls: CallsS622Aa9440Row[]
  dailyStats: { date: string; calls: number; success: number }[]
  campaignStatusDistribution: { name: string; value: number }[]
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  running: { label: 'Running', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

const callStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  dialing: { label: 'Dialing', variant: 'warning' },
  connected: { label: 'Connected', variant: 'success' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/api/dashboard')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        toast.error('Failed to load dashboard data')
      }
    } catch (error) {
      toast.error('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const KPICard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string
    value: string | number
    icon: React.ElementType
    color: string
  }) => (
    <Card className="rounded-xl border-0 shadow-sm bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {loading ? <Skeleton className="h-9 w-24" /> : value}
            </p>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-[hsl(210_40%_98%)] dark:bg-[hsl(222_47%_7%)]">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[hsl(222_47%_11%)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monitor your outbound calling campaigns in real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              View Reports
            </Button>
            <Button size="sm" className="gap-2 bg-[hsl(250_95%_60%)] hover:bg-[hsl(250_95%_55%)]">
              <Play className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Campaigns"
              value={data?.totalCampaigns ?? 0}
              icon={Activity}
              color="hsl(250 95% 60%)"
            />
            <KPICard
              title="Today's Calls"
              value={data?.todayCalls ?? 0}
              icon={Phone}
              color="hsl(25 95% 55%)"
            />
            <KPICard
              title="Success Rate"
              value={`${data?.successRate ?? 0}%`}
              icon={TrendingUp}
              color="hsl(142 76% 36%)"
            />
            <KPICard
              title="Avg Call Duration"
              value={`${data?.avgDuration ?? 0}s`}
              icon={Clock}
              color="hsl(200 98% 45%)"
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Call Trend Chart */}
            <Card className="rounded-xl border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Call Trends</CardTitle>
                <CardDescription>Call volume and success rate over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[240px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={data?.dailyStats ?? []}>
                      <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(250 95% 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(250 95% 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid hsl(214 32% 91%)',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="calls"
                        stroke="hsl(250 95% 60%)"
                        fillOpacity={1}
                        fill="url(#colorCalls)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="success"
                        stroke="hsl(142 76% 36%)"
                        fillOpacity={1}
                        fill="url(#colorSuccess)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Campaign Status Chart — real data from API */}
            <Card className="rounded-xl border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Campaign Status Distribution</CardTitle>
                <CardDescription>Campaign count by status</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[240px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data?.campaignStatusDistribution ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid hsl(214 32% 91%)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(250 95% 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tables Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Campaigns */}
            <Card className="rounded-xl border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">Active Campaigns</CardTitle>
                  <CardDescription>Currently running outbound campaigns</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-[hsl(250_95%_60%)]">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Campaign Name</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.recentCampaigns?.slice(0, 5).map((campaign) => (
                          <TableRow key={campaign.id} className="cursor-pointer">
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={statusConfig[campaign.status ?? 'draft']?.variant ?? 'secondary'}
                                className="rounded px-2 py-0.5 text-xs"
                              >
                                {statusConfig[campaign.status ?? 'draft']?.label ?? campaign.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!data?.recentCampaigns?.length && (
                          <TableRow>
                            <TableCell colSpan={2} className="py-8 text-center text-slate-500">
                              No active campaigns
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Calls */}
            <Card className="rounded-xl border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Calls</CardTitle>
                  <CardDescription>Latest call records</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 text-[hsl(250_95%_60%)]">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.recentCalls?.slice(0, 5).map((call) => (
                          <TableRow key={call.id} className="cursor-pointer">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                  <Users className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="font-medium">{call.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={callStatusConfig[call.status ?? 'pending']?.variant ?? 'secondary'}
                                className="rounded px-2 py-0.5 text-xs"
                              >
                                {callStatusConfig[call.status ?? 'pending']?.label ?? call.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {formatDuration(call.duration)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!data?.recentCalls?.length && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                              No call records
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="rounded-xl border-0 shadow-sm bg-gradient-to-r from-[hsl(250_95%_60%)] to-[hsl(250_95%_50%)]">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">Quick Start</h3>
                <p className="text-sm text-white/80">Create a new outbound campaign, import customer data, and start automated notifications</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  Import Customers
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-white text-[hsl(250_95%_60%)] hover:bg-white/90"
                >
                  <Phone className="h-4 w-4" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}