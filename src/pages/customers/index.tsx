import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { CustomersS622Aa9440Row } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Upload,
  RefreshCw,
  Phone,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
} from "lucide-react";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type ValidationStatus = "valid" | "invalid" | "pending";

interface CustomerFilters {
  search: string;
  validationStatus: ValidationStatus | "all";
}

function ValidationStatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = (status || "pending").toLowerCase();

  switch (normalizedStatus) {
    case "valid":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Valid
        </Badge>
      );
    case "invalid":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Invalid
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

function OrderStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("deliver") || normalizedStatus.includes("ship")) {
    return <Badge variant="info">{status}</Badge>;
  }
  if (normalizedStatus.includes("complete") || normalizedStatus.includes("success")) {
    return <Badge variant="success">{status}</Badge>;
  }
  if (normalizedStatus.includes("cancel") || normalizedStatus.includes("fail")) {
    return <Badge variant="destructive">{status}</Badge>;
  }
  if (normalizedStatus.includes("pending") || normalizedStatus.includes("process")) {
    return <Badge variant="warning">{status}</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPhone(phone: string): string {
  // Format phone number for better readability (E.164 format)
  // E.164: +[country code][national number]
  // Examples: +9779704011561, +15551234567
  
  if (!phone) return "-";
  
  // Remove any spaces or formatting
  const cleanPhone = phone.replace(/\s/g, '');
  
  // Check if it's E.164 format (starts with +)
  if (cleanPhone.startsWith('+')) {
    const digits = cleanPhone.slice(1); // Remove the +
    
    // Common country code patterns for formatting
    // US/Canada: +1 XXX XXX XXXX
    if (digits.startsWith('1') && digits.length === 11) {
      return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    
    // UK: +44 XXXX XXXXXX
    if (digits.startsWith('44') && digits.length >= 10) {
      return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }
    
    // India: +91 XXXXX XXXXX
    if (digits.startsWith('91') && digits.length === 12) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    
    // Nepal: +977 XXXX XXXX
    if (digits.startsWith('977') && digits.length === 12) {
      return `+977 ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    
    // Generic: add space after country code (first 1-3 digits)
    // Country codes: 1 (1 digit), 20-99 (2 digits), 210-999 (3 digits)
    let countryCodeLength = 1;
    if (digits.length > 10) {
      // Try 3-digit country code first
      const first3 = digits.slice(0, 3);
      if (parseInt(first3) >= 210) {
        countryCodeLength = 3;
      } else if (parseInt(digits.slice(0, 2)) >= 20) {
        countryCodeLength = 2;
      }
    }
    
    const countryCode = digits.slice(0, countryCodeLength);
    const nationalNumber = digits.slice(countryCodeLength);
    
    // Format national number with spaces every 3-4 digits
    const formattedNational = nationalNumber.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();
    
    return `+${countryCode} ${formattedNational}`;
  }
  
  // Legacy: handle non-E.164 numbers
  if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    return `+${cleanPhone.slice(0, 1)} ${cleanPhone.slice(1, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7)}`;
  }
  if (cleanPhone.length === 10) {
    return `+1 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }
  
  return cleanPhone;
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  return `$${amount.toFixed(2)}`;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomersS622Aa9440Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: "",
    validationStatus: "all",
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/customers");
      const result: ApiResponse<{ list: CustomersS622Aa9440Row[]; total: number }> = await response.json();

      if (result.success && result.data) {
        setCustomers(result.data.list);
      } else {
        toast.error(result.error || "Failed to fetch customer data");
      }
    } catch (error) {
      toast.error("Network error, please try again");
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      filters.search === "" ||
      customer.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      customer.phone?.includes(filters.search) ||
      customer.order_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
      customer.city?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus =
      filters.validationStatus === "all" ||
      (customer.validation_status || "pending").toLowerCase() ===
        filters.validationStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: customers.length,
    valid: customers.filter((c) => c.validation_status === "valid").length,
    invalid: customers.filter((c) => c.validation_status === "invalid").length,
    pending: customers.filter(
      (c) => !c.validation_status || c.validation_status === "pending"
    ).length,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Data</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer order information, import and validate customer data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/customers/import")}>
            <Upload className="h-4 w-4 mr-2" />
            Import Customers
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valid Data</p>
                <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
                  {stats.valid}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invalid Data</p>
                <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                  {stats.invalid}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {stats.pending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Search by name, phone, order ID or filter by validation status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customer name, phone, order ID..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-9"
              />
            </div>
            <Select
              value={filters.validationStatus}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  validationStatus: value as ValidationStatus | "all",
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Validation Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Customer List</CardTitle>
              <CardDescription>
                {filteredCustomers.length} records total
                {filters.search && ` (search: "${filters.search}")`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-6">
              <Empty
                icon={Users}
                title={customers.length === 0 ? "No customer data" : "No matching records found"}
                description={
                  customers.length === 0
                    ? "You haven't imported any customer data yet. Click the import button to get started"
                    : "Please adjust your search criteria or filters"
                }
                actionText={customers.length === 0 ? "Import Customers" : undefined}
                onAction={
                  customers.length === 0
                    ? () => navigate("/customers/import")
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Info</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Order Info</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Validation Status</TableHead>
                    <TableHead>Import Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ID: {customer.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm tabular-nums">
                            {formatPhone(customer.phone)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {customer.order_id}
                            </span>
                          </div>
                          {customer.courier_name && (
                            <span className="text-xs text-muted-foreground">
                              {customer.courier_name}
                              {customer.tracking_number &&
                                ` · ${customer.tracking_number}`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={customer.order_status} />
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums font-medium">
                          {formatAmount(customer.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{customer.city || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <ValidationStatusBadge status={customer.validation_status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(customer.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
