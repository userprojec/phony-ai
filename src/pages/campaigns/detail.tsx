import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { CampaignsS622Aa9440Row, CustomersS622Aa9440Row, CallsS622Aa9440Row } from "@/types/database";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Square,
  Phone,
  Users,
  BarChart3,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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
  failed_count?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignWithStats | null>(null);
  const [customers, setCustomers] = useState<CustomersS622Aa9440Row[]>([]);
  const [calls, setCalls] = useState<CallsS622Aa9440Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Add customers dialog state
  const [showAddCustomers, setShowAddCustomers] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState<CustomersS622Aa9440Row[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [addingCustomers, setAddingCustomers] = useState(false);

  const fetchCampaignDetail = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/campaigns/${id}`);
      const result: ApiResponse<{
        campaign: CampaignWithStats;
        customers: CustomersS622Aa9440Row[];
        calls: CallsS622Aa9440Row[];
      }> = await response.json();

      if (result.success && result.data) {
        setCampaign(result.data.campaign);
        setCustomers(result.data.customers || []);
        setCalls(result.data.calls || []);
      } else {
        toast.error(result.error || "Failed to fetch campaign details");
      }
    } catch (error) {
      toast.error("Network error, please try again later");
      console.error("Fetch campaign detail error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCampaignDetail();
    }
  }, [id]);

  const handleCampaignAction = async (
    action: "start" | "pause" | "resume" | "stop"
  ) => {
    try {
      setActionLoading(true);
      console.log(`[DEBUG] Sending ${action} request for campaign ${id}`);
      const response = await apiFetch(`/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      console.log(`[DEBUG] Response status:`, response.status, response.statusText);
      
      const text = await response.text();
      console.log(`[DEBUG] Response body:`, text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error(`[DEBUG] Failed to parse JSON:`, e);
        toast.error("Invalid response from server");
        return;
      }
      
      console.log(`[DEBUG] Parsed result:`, result);

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
        fetchCampaignDetail();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch (error: any) {
      console.error("[DEBUG] Campaign action error:", error);
      toast.error(error?.message || "Network error, please try again later");
    } finally {
      setActionLoading(false);
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

  const getCallStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "in_progress":
        return <Phone className="h-4 w-4 text-warning animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Fetch customers that are not yet in this campaign
  const fetchAvailableCustomers = async () => {
    try {
      const response = await apiFetch("/api/customers");
      const result: ApiResponse<{ list: CustomersS622Aa9440Row[]; total: number }> = await response.json();
      
      if (result.success && result.data) {
        // Filter out customers already in this campaign
        const existingIds = new Set(customers.map(c => c.id));
        const available = result.data.list.filter(c => !existingIds.has(c.id));
        setAvailableCustomers(available);
      } else {
        toast.error("Failed to fetch customers");
      }
    } catch (error) {
      toast.error("Network error");
      console.error("Fetch available customers error:", error);
    }
  };

  // Open add customers dialog
  const openAddCustomersDialog = async () => {
    await fetchAvailableCustomers();
    setSelectedCustomerIds([]);
    setCustomerSearch("");
    setShowAddCustomers(true);
  };

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomerIds(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Toggle all customers
  const toggleAllCustomers = () => {
    const filtered = filteredAvailableCustomers;
    const allSelected = filtered.length > 0 && filtered.every(c => selectedCustomerIds.includes(c.id));
    
    if (allSelected) {
      setSelectedCustomerIds(prev => prev.filter(id => !filtered.some(c => c.id === id)));
    } else {
      const newIds = filtered.map(c => c.id).filter(id => !selectedCustomerIds.includes(id));
      setSelectedCustomerIds(prev => [...prev, ...newIds]);
    }
  };

  // Add selected customers to campaign
  const handleAddCustomers = async () => {
    if (selectedCustomerIds.length === 0) {
      toast.error("Please select at least one customer");
      return;
    }

    setAddingCustomers(true);
    try {
      console.log('[DEBUG] Adding customers to campaign:', { campaignId: id, customerIds: selectedCustomerIds });
      
      const response = await apiFetch(`/api/campaigns/${id}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_ids: selectedCustomerIds }),
      });

      console.log('[DEBUG] Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('[DEBUG] Response result:', result);

      if (result.success) {
        toast.success(`Added ${result.data.added} customers to campaign`);
        setShowAddCustomers(false);
        setSelectedCustomerIds([]);
        fetchCampaignDetail();
      } else {
        toast.error(result.error || "Failed to add customers");
      }
    } catch (error: any) {
      console.error("[DEBUG] Add customers error:", error);
      toast.error(error?.message || "Network error, please try again");
    } finally {
      setAddingCustomers(false);
    }
  };

  // Filter available customers based on search
  const filteredAvailableCustomers = availableCustomers.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.order_id?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="flex h-16 items-center px-6 gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The campaign you are looking for does not exist.
          </p>
          <Button onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/campaigns")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {campaign.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Campaign ID: {campaign.id} • Created {formatDate(campaign.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(campaign.status)}
            {/* Action buttons based on status */}
            {campaign.status === "draft" && (
              <Button
                onClick={() => handleCampaignAction("start")}
                disabled={actionLoading}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
            {campaign.status === "running" && (
              <Button
                variant="outline"
                onClick={() => handleCampaignAction("pause")}
                disabled={actionLoading}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            {campaign.status === "paused" && (
              <Button
                onClick={() => handleCampaignAction("resume")}
                disabled={actionLoading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Resume
              </Button>
            )}
            {(campaign.status === "running" || campaign.status === "paused") && (
              <Button
                variant="destructive"
                onClick={() => handleCampaignAction("stop")}
                disabled={actionLoading}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {campaign.total_customers || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Called / Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">
                  {campaign.called_count || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-info" />
                <span className="text-2xl font-bold">
                  {campaign.success_rate ? `${campaign.success_rate}%` : "-"}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">
                  {campaign.failed_count || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{campaign.description || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Language</p>
                <p className="text-sm uppercase">{campaign.language || "en"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Calling Time Window</p>
                <p className="text-sm">
                  {campaign.time_window_start && campaign.time_window_end
                    ? `${campaign.time_window_start.slice(0, 5)} - ${campaign.time_window_end.slice(0, 5)}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Max Retry Attempts</p>
                <p className="text-sm">{campaign.max_retry_attempts || 3}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
            <TabsTrigger value="calls">Call Records ({calls.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Target Customers</CardTitle>
                {campaign.status === "draft" && (
                  <Button onClick={openAddCustomersDialog} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Customers
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No customers assigned to this campaign</p>
                    {campaign.status === "draft" && (
                      <Button onClick={openAddCustomersDialog} variant="outline" className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        Add Customers
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Order Status</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Language</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">
                              {customer.name}
                            </TableCell>
                            <TableCell>{customer.phone}</TableCell>
                            <TableCell>{customer.order_id}</TableCell>
                            <TableCell>{customer.order_status}</TableCell>
                            <TableCell>{customer.city || "-"}</TableCell>
                            <TableCell className="uppercase">
                              {customer.language || "en"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls">
            <Card>
              <CardHeader>
                <CardTitle>Call Records</CardTitle>
              </CardHeader>
              <CardContent>
                {calls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No call records yet</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Started At</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead>Sentiment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calls.map((call) => (
                          <TableRow key={call.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCallStatusIcon(call.status)}
                                <span className="capitalize">
                                  {call.status?.replace("_", " ") || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{call.phone}</TableCell>
                            <TableCell>{formatDuration(call.duration)}</TableCell>
                            <TableCell>{formatDate(call.started_at)}</TableCell>
                            <TableCell>{call.outcome || "-"}</TableCell>
                            <TableCell className="capitalize">
                              {call.customer_sentiment || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Customers Dialog */}
      <Dialog open={showAddCustomers} onOpenChange={setShowAddCustomers}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Customers to Campaign</DialogTitle>
            <DialogDescription>
              Select customers to add to this campaign. Only customers not already in the campaign are shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customer name, phone or order ID..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected count */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCustomerIds.length} customers selected
              </span>
              {selectedCustomerIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerIds([])}>
                  <X className="h-4 w-4 mr-1" />
                  Clear selection
                </Button>
              )}
            </div>

            {/* Customer table */}
            <div className="border rounded-md max-h-[400px] overflow-auto">
              {filteredAvailableCustomers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {availableCustomers.length === 0 
                    ? "No available customers to add. All customers are already in this campaign."
                    : "No customers match your search."
                  }
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredAvailableCustomers.length > 0 &&
                            filteredAvailableCustomers.every(c => selectedCustomerIds.includes(c.id))
                          }
                          onCheckedChange={toggleAllCustomers}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead>City</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAvailableCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className={selectedCustomerIds.includes(customer.id) ? "bg-primary/5" : ""}
                        onClick={() => toggleCustomerSelection(customer.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedCustomerIds.includes(customer.id)}
                            onCheckedChange={() => toggleCustomerSelection(customer.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.order_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{customer.order_status}</Badge>
                        </TableCell>
                        <TableCell>{customer.city || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddCustomers(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomers}
              disabled={selectedCustomerIds.length === 0 || addingCustomers}
            >
              {addingCustomers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {selectedCustomerIds.length} Customers
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
