import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  History,
  Phone,
  Clock,
  Play,
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Headphones,
  MessageSquare,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PhoneOff,
  RotateCcw,
  Loader2,
  Sparkles
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CallsS622Aa9440Row } from '@/types/database';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

// Extended call type with related data
interface CallWithRelations extends CallsS622Aa9440Row {
  campaign_name?: string;
  customer_name?: string;
  customer_order_id?: string;
}

// Status badge configuration
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  dialing: { label: 'Dialing', variant: 'info', icon: <Phone className="h-3 w-3" /> },
  connected: { label: 'Connected', variant: 'default', icon: <Headphones className="h-3 w-3" /> },
  completed: { label: 'Completed', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Failed', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: <PhoneOff className="h-3 w-3" /> },
  retrying: { label: 'Retrying', variant: 'warning', icon: <RotateCcw className="h-3 w-3" /> },
  voicemail: { label: 'Voicemail', variant: 'secondary', icon: <MessageSquare className="h-3 w-3" /> },
};

// Outcome badge configuration
const outcomeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' }> = {
  answered: { label: 'Answered', variant: 'success' },
  voicemail: { label: 'Voicemail', variant: 'secondary' },
  no_answer: { label: 'No Answer', variant: 'warning' },
  busy: { label: 'Busy', variant: 'warning' },
  failed: { label: 'Failed', variant: 'destructive' },
  callback_requested: { label: 'Callback Requested', variant: 'info' },
  info_confirmed: { label: 'Info Confirmed', variant: 'success' },
  declined: { label: 'Declined', variant: 'destructive' },
};

// Sentiment icon configuration
const sentimentConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  positive: { icon: <Smile className="h-4 w-4" />, label: 'Positive', color: 'text-green-500' },
  neutral: { icon: <Meh className="h-4 w-4" />, label: 'Neutral', color: 'text-amber-500' },
  negative: { icon: <Frown className="h-4 w-4" />, label: 'Negative', color: 'text-red-500' },
};

// Format duration from seconds to mm:ss
function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date to readable string
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Truncate text with ellipsis
function truncateText(text: string | null, maxLength: number = 60): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export default function CallsPage() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<CallWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallWithRelations | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const pageSize = 20;

  // Fetch calls data
  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (outcomeFilter) params.append('outcome', outcomeFilter);

      const response = await apiFetch(`/api/calls?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCalls(result.data.calls || []);
        setTotalPages(Math.ceil((result.data.total || 0) / pageSize));
      } else {
        toast.error(result.error || 'Failed to fetch calls');
      }
    } catch (error) {
      toast.error('Network error, please try again later');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, outcomeFilter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCalls();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleViewDetail = (call: CallWithRelations) => {
    setSelectedCall(call);
    setShowDetailDialog(true);
  };

  const handleViewTranscript = (call: CallWithRelations) => {
    setSelectedCall(call);
    setShowTranscriptDialog(true);
  };

  const handleViewSummary = (call: CallWithRelations) => {
    setSelectedCall(call);
    setShowSummaryDialog(true);
  };

  const handlePlayRecording = (call: CallWithRelations) => {
    if (call.recording_url) {
      window.open(call.recording_url, '_blank');
    } else {
      toast.info('No recording available');
    }
  };

  // Loading skeleton
  if (loading && calls.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Filters skeleton */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>
            </CardContent>
          </Card>

          {/* Table skeleton */}
          <Card>
            <CardContent className="p-0">
              <div className="space-y-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
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
              Call Records
            </h1>
            <p className="text-sm text-muted-foreground">
              View all AI phone call records, recordings and AI analysis results
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCalls}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customer name, phone or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Call Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dialing">Dialing</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                </SelectContent>
              </Select>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Call Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Outcomes</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="callback_requested">Callback Requested</SelectItem>
                  <SelectItem value="info_confirmed">Info Confirmed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              {(searchQuery || statusFilter || outcomeFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                    setOutcomeFilter('');
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calls Table */}
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Customer Info</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="w-[100px]">Duration</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>AI Summary</TableHead>
                    <TableHead className="w-[120px]">Call Time</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <History className="h-8 w-8 opacity-50" />
                          <p>No call records</p>
                          <p className="text-sm">Call records will appear here after creating campaigns and making calls</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    calls.map((call) => {
                      const status = statusConfig[call.status || 'pending'] || statusConfig.pending;
                      const outcome = call.outcome ? (outcomeConfig[call.outcome] || { label: call.outcome, variant: 'outline' }) : null;
                      const sentiment = call.customer_sentiment ? sentimentConfig[call.customer_sentiment] : null;

                      return (
                        <TableRow key={call.id} className="group">
                          <TableCell>
                            <Badge
                              variant={status.variant}
                              className="flex items-center gap-1 font-normal"
                            >
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="font-medium text-sm">
                                {call.customer_name || `Customer #${call.customer_id}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {call.phone}
                              </div>
                              {call.customer_order_id && (
                                <div className="text-xs text-muted-foreground">
                                  Order: {call.customer_order_id}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {call.campaign_name || `Campaign #${call.campaign_id}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDuration(call.duration)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {outcome ? (
                              <Badge variant={outcome.variant} className="font-normal">
                                {outcome.label}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {sentiment ? (
                              <div className={cn("flex items-center gap-1", sentiment.color)}>
                                {sentiment.icon}
                                <span className="text-sm">{sentiment.label}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {call.ai_summary ? (
                              <button
                                onClick={() => handleViewSummary(call)}
                                className="text-left text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[200px]"
                              >
                                {truncateText(call.ai_summary, 40)}
                              </button>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(call.started_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
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
                                <DropdownMenuItem onClick={() => handleViewDetail(call)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {call.transcript && (
                                  <DropdownMenuItem onClick={() => handleViewTranscript(call)}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    View Transcript
                                  </DropdownMenuItem>
                                )}
                                {call.recording_url && (
                                  <DropdownMenuItem onClick={() => handlePlayRecording(call)}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Play Recording
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {calls.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Call Details</DialogTitle>
              <DialogDescription>
                Call Record #{selectedCall?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedCall && (
              <div className="space-y-6">
                {/* Status Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Call Status</label>
                    <div>
                      <Badge
                        variant={statusConfig[selectedCall.status || 'pending']?.variant || 'secondary'}
                        className="flex items-center gap-1"
                      >
                        {statusConfig[selectedCall.status || 'pending']?.icon}
                        {statusConfig[selectedCall.status || 'pending']?.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Call Outcome</label>
                    <div>
                      {selectedCall.outcome ? (
                        <Badge variant={outcomeConfig[selectedCall.outcome]?.variant || 'outline'}>
                          {outcomeConfig[selectedCall.outcome]?.label || selectedCall.outcome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Call Duration</label>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDuration(selectedCall.duration)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Customer Sentiment</label>
                    <div>
                      {selectedCall.customer_sentiment ? (
                        <div className={cn(
                          "flex items-center gap-1",
                          sentimentConfig[selectedCall.customer_sentiment]?.color
                        )}>
                          {sentimentConfig[selectedCall.customer_sentiment]?.icon}
                          <span>{sentimentConfig[selectedCall.customer_sentiment]?.label}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium text-sm">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <span>{selectedCall.customer_name || `Customer #${selectedCall.customer_id}`}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      <span>{selectedCall.phone}</span>
                    </div>
                    {selectedCall.customer_order_id && (
                      <div>
                        <span className="text-muted-foreground">Order ID: </span>
                        <span>{selectedCall.customer_order_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campaign Info */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium text-sm">Campaign Information</h4>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Campaign Name: </span>
                    <span>{selectedCall.campaign_name || `Campaign #${selectedCall.campaign_id}`}</span>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start Time: </span>
                    <span>{formatDate(selectedCall.started_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End Time: </span>
                    <span>{formatDate(selectedCall.ended_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedCall.recording_url && (
                    <Button onClick={() => handlePlayRecording(selectedCall)}>
                      <Play className="mr-2 h-4 w-4" />
                      Play Recording
                    </Button>
                  )}
                  {selectedCall.transcript && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDetailDialog(false);
                        setShowTranscriptDialog(true);
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      View Transcript
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Transcript Dialog */}
        <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Call Transcript</DialogTitle>
              <DialogDescription>
                Call Record #{selectedCall?.id} - Full conversation transcript
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4">
                {selectedCall?.transcript ? (
                  <div className="rounded-lg bg-muted p-4">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedCall.transcript}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-50 mb-4" />
                    <p>No transcript available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Summary Dialog */}
        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI Call Summary</DialogTitle>
              <DialogDescription>
                Call Record #{selectedCall?.id} - AI intelligent analysis summary
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCall?.ai_summary ? (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm leading-relaxed">{selectedCall.ai_summary}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 opacity-50 mb-4" />
                  <p>No AI summary</p>
                </div>
              )}

              {selectedCall?.follow_up_required && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Follow-up Required</span>
                  </div>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    This call is marked as requiring manual follow-up
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
