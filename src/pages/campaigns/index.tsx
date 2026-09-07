import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CampaignsS622Aa9440Row } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Play,
  Pause,
  RotateCcw,
  MoreHorizontal,
  Phone,
  Users,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Campaign status definitions with colors
const CAMPAIGN_STATUSES = {
  draft: { label: "Draft", variant: "secondary" as const },
  pending: { label: "Pending", variant: "info" as const },
  running: { label: "Running", variant: "success" as const },
  paused: { label: "Paused", variant: "warning" as const },
  completed: { label: "Completed", variant: "default" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

type CampaignStatus = keyof typeof CAMPAIGN_STATUSES;

interface CampaignWithStats extends CampaignsS622Aa9440Row {
  total_customers?: number;
  called_count?: number;
  success_rate?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const ITEMS_PER_PAGE = 10;

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);
      params.append("page", currentPage.toString());
      params.append("limit", ITEMS_PER_PAGE.toString());

      const response = await apiFetch(`/api/campaigns?${params.toString()}`);
      const result: ApiResponse<{
        list: CampaignWithStats[];
        total: number;
      }> = await response.json();

      if (result.success && result.data) {
        setCampaigns(result.data.list);
        setTotalCount(result.data.total);
      } else {
        toast.error(result.error || "Failed to fetch campaigns");
      }
    } catch (error) {
      toast.error("Network error, please try again later");
      console.error("Fetch campaigns error:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCampaigns();
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalCount / ITEMS_PER_PAGE)) {
      setCurrentPage(page);
    }
  };

  const handleCampaignAction = async (
    campaignId: number,
    action: "start" | "pause" | "resume" | "stop"
  ) => {
    try {
      setActionLoading(campaignId);
      const response = await apiFetch(`/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
      });
      const result: ApiResponse<{ campaign: CampaignsS622Aa9440Row }> =
        await response.json();

      if (result.success) {
        toast.success(
          action === "start"
            ? "Campaign started"
            : action === "pause"
            ? "Campaign paused"
            : action === "resume"
            ? "Campaign resumed"
            : "Campaign stopped"
        );
        fetchCampaigns();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "Network error, please try again later";
      toast.error(errorMessage);
      console.error("Campaign action error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig =
      CAMPAIGN_STATUSES[status as CampaignStatus] || CAMPAIGN_STATUSES.draft;
    return (
      <Badge variant={statusConfig.variant} className="rounded-[4px]">
        {statusConfig.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Campaign Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage your AI phone outreach campaigns
            </p>
          </div>
          <Button
            onClick={() => navigate("/campaigns/new")}
            className="gap-2 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaign name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 rounded-lg"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px] rounded-lg">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleSearch}
            className="rounded-lg"
          >
            Filter
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Campaign Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target Customers</TableHead>
                <TableHead>Called</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Calling Time Window</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[50px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-[100px] float-right" />
                    </TableCell>
                  </TableRow>
                ))
              ) : campaigns.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Phone className="h-8 w-8 text-muted-foreground/50" />
                      <p>No campaigns yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/campaigns/new")}
                        className="mt-2"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Campaign
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Data rows
                campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground">
                          {campaign.name}
                        </span>
                        {campaign.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {campaign.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="tabular-nums">
                          {campaign.total_customers || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="tabular-nums">
                          {campaign.called_count || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="tabular-nums">
                          {campaign.success_rate
                            ? `${campaign.success_rate}%`
                            : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {campaign.time_window_start &&
                          campaign.time_window_end
                            ? `${campaign.time_window_start.slice(
                                0,
                                5
                              )} - ${campaign.time_window_end.slice(0, 5)}`
                            : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(campaign.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Quick action buttons based on status */}
                        {campaign.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() =>
                              handleCampaignAction(campaign.id, "start")
                            }
                            disabled={actionLoading === campaign.id}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === "running" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                            onClick={() =>
                              handleCampaignAction(campaign.id, "pause")
                            }
                            disabled={actionLoading === campaign.id}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === "paused" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() =>
                              handleCampaignAction(campaign.id, "resume")
                            }
                            disabled={actionLoading === campaign.id}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}

                        {/* More actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/campaigns/${campaign.id}`)
                              }
                            >
                              View Details
                            </DropdownMenuItem>
                            {campaign.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/campaigns/${campaign.id}/edit`)
                                }
                              >
                                Edit Campaign
                              </DropdownMenuItem>
                            )}
                            {(campaign.status === "running" ||
                              campaign.status === "paused") && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleCampaignAction(campaign.id, "stop")
                                }
                                className="text-destructive"
                              >
                                Stop Campaign
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && campaigns.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              <div className="text-sm text-muted-foreground">
                {totalCount} records total, page {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "h-8 w-8 p-0",
                        currentPage === pageNum &&
                          "bg-primary text-primary-foreground"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
