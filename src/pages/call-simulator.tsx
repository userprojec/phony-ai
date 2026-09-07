import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Phone,
  PhoneOff,
  Code,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Headphones,
  FileText,
  Activity,
  Volume2,
  Mic
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Campaign {
  id: number;
  name: string;
  status: string;
  voice_agent_id: number | null;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  order_id: string;
  order_status: string;
}

interface TwiMLStep {
  order: number;
  type: 'say' | 'pause' | 'gather' | 'hangup';
  description: string;
  content?: string;
  voice?: string;
  language?: string;
  duration?: number;
}

interface TwiMLPreview {
  campaignId: number;
  customerId: number;
  customerName: string;
  phone: string;
  greeting: string;
  voice: string;
  language: string;
  twiml: string;
  steps: TwiMLStep[];
}

interface SimulationEvent {
  timestamp: string;
  type: string;
  message: string;
  details?: any;
}

interface Simulation {
  id: string;
  campaignId: number;
  customerId: number;
  phone: string;
  status: 'pending' | 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed';
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
  customerResponse?: string;
  outcome?: string;
  events: SimulationEvent[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-gray-500', icon: Clock },
  initiated: { label: 'Initiated', color: 'bg-blue-500', icon: Phone },
  ringing: { label: 'Ringing', color: 'bg-yellow-500', icon: Phone },
  answered: { label: 'Answered', color: 'bg-green-500', icon: Headphones },
  completed: { label: 'Completed', color: 'bg-green-600', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-500', icon: XCircle },
};

const eventTypeColors: Record<string, string> = {
  call_initiated: 'text-blue-600',
  ringing: 'text-yellow-600',
  answered: 'text-green-600',
  twiml_sent: 'text-purple-600',
  say: 'text-indigo-600',
  gather_input: 'text-orange-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  no_answer: 'text-red-600',
};

export default function CallSimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [twimlPreview, setTwimlPreview] = useState<TwiMLPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Simulation state
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<Simulation[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showTwimlModal, setShowTwimlModal] = useState(false);
  const [activeTab, setActiveTab] = useState('flow');
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load campaigns and customers
  useEffect(() => {
    fetchCampaigns();
    fetchCustomers();

    // Check for URL params
    const campaignId = searchParams.get('campaign');
    const customerId = searchParams.get('customer');
    if (campaignId) setSelectedCampaign(campaignId);
    if (customerId) setSelectedCustomer(customerId);
  }, []);

  // Auto-scroll to latest event
  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSimulation?.events]);

  // Poll for simulation updates
  useEffect(() => {
    if (activeSimulation && ['pending', 'initiated', 'ringing', 'answered'].includes(activeSimulation.status)) {
      pollIntervalRef.current = setInterval(() => {
        fetchSimulationStatus(activeSimulation.id);
      }, 1000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeSimulation?.id, activeSimulation?.status]);

  const fetchCampaigns = async () => {
    try {
      const response = await apiFetch('/api/campaigns?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setCampaigns(result.data?.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiFetch('/api/customers?pageSize=100');
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data?.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchTwimlPreview = async () => {
    if (!selectedCampaign || !selectedCustomer) {
      toast.error('Please select both a campaign and a customer');
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await apiFetch(`/api/simulation/twiml-preview/${selectedCampaign}/${selectedCustomer}`);
      const result = await response.json();

      if (result.success) {
        setTwimlPreview(result.data);
        toast.success('TwiML preview generated');
      } else {
        toast.error(result.error || 'Failed to generate preview');
      }
    } catch (error) {
      toast.error('Failed to fetch TwiML preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const startSimulation = async () => {
    if (!selectedCampaign || !selectedCustomer) {
      toast.error('Please select both a campaign and a customer');
      return;
    }

    setIsSimulating(true);
    setActiveTab('live');

    try {
      const response = await apiFetch('/api/simulation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: parseInt(selectedCampaign, 10),
          customerId: parseInt(selectedCustomer, 10),
          options: {
            autoAnswer: true,
            customerResponse: '1',
            simulateDelay: true
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Simulation started!');
        // Fetch initial status
        await fetchSimulationStatus(result.data.simulationId);
      } else {
        toast.error(result.error || 'Failed to start simulation');
        setIsSimulating(false);
      }
    } catch (error) {
      toast.error('Failed to start simulation');
      setIsSimulating(false);
    }
  };

  const fetchSimulationStatus = async (simulationId: string) => {
    try {
      const response = await apiFetch(`/api/simulation/${simulationId}`);
      const result = await response.json();

      if (result.success) {
        setActiveSimulation(result.data);

        // If simulation completed, add to history
        if (['completed', 'failed'].includes(result.data.status)) {
          setIsSimulating(false);
          setSimulationHistory(prev => {
            const exists = prev.find(s => s.id === simulationId);
            if (exists) {
              return prev.map(s => s.id === simulationId ? result.data : s);
            }
            return [result.data, ...prev];
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch simulation status:', error);
    }
  };

  const simulateInput = async (digit: string) => {
    if (!activeSimulation) return;

    try {
      const response = await apiFetch(`/api/simulation/${activeSimulation.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digit })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Simulated input: ${digit}`);
        await fetchSimulationStatus(activeSimulation.id);
      }
    } catch (error) {
      toast.error('Failed to simulate input');
    }
  };

  const endSimulation = async () => {
    if (!activeSimulation) return;

    try {
      await apiFetch(`/api/simulation/${activeSimulation.id}/end`, {
        method: 'POST'
      });
      await fetchSimulationStatus(activeSimulation.id);
      setIsSimulating(false);
      toast.success('Simulation ended');
    } catch (error) {
      toast.error('Failed to end simulation');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const selectedCampaignData = campaigns.find(c => c.id.toString() === selectedCampaign);
  const selectedCustomerData = customers.find(c => c.id.toString() === selectedCustomer);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Call Simulator</h1>
          <p className="text-sm text-muted-foreground">
            Test AI voice calls without making real phone calls. Preview TwiML and simulate the entire call flow.
          </p>
        </div>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Test Configuration
          </CardTitle>
          <CardDescription>
            Select a campaign and customer to test the call flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name} ({customer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCampaignData && selectedCustomerData && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <FileText className="h-4 w-4" />
                Selected Configuration
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Campaign:</span>{' '}
                  <span className="font-medium">{selectedCampaignData.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>{' '}
                  <span className="font-medium">{selectedCustomerData.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium">{selectedCustomerData.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Order:</span>{' '}
                  <span className="font-medium">{selectedCustomerData.order_id}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={fetchTwimlPreview}
              disabled={!selectedCampaign || !selectedCustomer || previewLoading}
              className="gap-2"
            >
              <Code className="h-4 w-4" />
              Preview TwiML
            </Button>

            <Button
              onClick={startSimulation}
              disabled={!selectedCampaign || !selectedCustomer || isSimulating}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isSimulating ? 'Simulating...' : 'Start Simulation'}
            </Button>

            {twimlPreview && (
              <Button
                variant="secondary"
                onClick={() => setShowTwimlModal(true)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                View TwiML
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="flow" className="gap-2">
            <Activity className="h-4 w-4" />
            Call Flow
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <Phone className="h-4 w-4" />
            Live Simulation
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Call Flow Tab */}
        <TabsContent value="flow">
          <Card>
            <CardHeader>
              <CardTitle>Expected Call Flow</CardTitle>
              <CardDescription>
                This is the step-by-step breakdown of what happens during the call
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!twimlPreview ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select a campaign and customer, then click "Preview TwiML"</p>
                  <p className="text-sm">to see the expected call flow</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Voice Info */}
                  <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Volume2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">AI Voice Configuration</div>
                      <div className="text-sm text-muted-foreground">
                        {twimlPreview.voice} • {twimlPreview.language}
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    {twimlPreview.steps.map((step, index) => (
                      <div
                        key={step.order}
                        className="flex gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {step.order}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{step.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {step.description}
                            </Badge>
                          </div>
                          {step.content && (
                            <div className="rounded bg-muted p-2 text-sm italic text-muted-foreground">
                              "{step.content}"
                            </div>
                          )}
                          {step.duration && (
                            <div className="text-xs text-muted-foreground">
                              Duration: {step.duration}s
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Simulation Tab */}
        <TabsContent value="live">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Phone Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSimulation ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Phone className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium">No Active Simulation</p>
                    <p className="text-sm">Start a simulation to see the call in action</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-center">
                      {(() => {
                        const config = statusConfig[activeSimulation.status];
                        const Icon = config.icon;
                        return (
                          <div className={cn(
                            "flex flex-col items-center gap-3 rounded-xl border-2 p-8",
                            activeSimulation.status === 'answered' && "border-green-500 bg-green-50"
                          )}>
                            <div className={cn("flex h-16 w-16 items-center justify-center rounded-full", config.color)}>
                              <Icon className="h-8 w-8 text-white" />
                            </div>
                            <div className="text-2xl font-bold">{config.label}</div>
                            {activeSimulation.duration && (
                              <div className="text-sm text-muted-foreground">
                                Duration: {formatDuration(activeSimulation.duration)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Call Details */}
                    <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">To:</span>
                        <span className="font-medium">{activeSimulation.phone}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-medium">{formatTime(activeSimulation.startedAt)}</span>
                      </div>
                      {activeSimulation.outcome && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Outcome:</span>
                          <Badge variant={activeSimulation.outcome === 'confirmed' ? 'default' : 'secondary'}>
                            {activeSimulation.outcome}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Interactive Controls */}
                    {activeSimulation.status === 'answered' && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-center">Simulate Customer Input</div>
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" size="lg" onClick={() => simulateInput('1')}>
                            Press 1
                          </Button>
                          <Button variant="outline" size="lg" onClick={() => simulateInput('2')}>
                            Press 2
                          </Button>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Click to simulate the customer pressing a key
                        </p>
                      </div>
                    )}

                    {/* End Button */}
                    {['pending', 'initiated', 'ringing', 'answered'].includes(activeSimulation.status) && (
                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={endSimulation}
                      >
                        <PhoneOff className="h-4 w-4" />
                        End Simulation
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Event Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!activeSimulation || activeSimulation.events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
                    <p>No events yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {activeSimulation.events.map((event, index) => (
                        <div
                          key={index}
                          className="flex gap-3 rounded-lg border p-3 text-sm"
                        >
                          <div className="shrink-0 text-xs text-muted-foreground">
                            {formatTime(event.timestamp)}
                          </div>
                          <div className="flex-1">
                            <div className={cn("font-medium", eventTypeColors[event.type] || 'text-foreground')}>
                              {event.type.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div className="text-muted-foreground">{event.message}</div>
                          </div>
                        </div>
                      ))}
                      <div ref={eventsEndRef} />
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Simulation History</CardTitle>
              <CardDescription>Previous call simulations</CardDescription>
            </CardHeader>
            <CardContent>
              {simulationHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4 opacity-30" />
                  <p>No simulations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {simulationHistory.map((sim) => {
                    const config = statusConfig[sim.status];
                    const Icon = config.icon;
                    return (
                      <div
                        key={sim.id}
                        className="flex items-center gap-4 rounded-lg border p-4"
                      >
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", config.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sim.phone}</span>
                            <Badge variant="outline">{config.label}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTime(sim.startedAt)} • {formatDuration(sim.duration)}
                            {sim.outcome && ` • ${sim.outcome}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TwiML Modal */}
      <Dialog open={showTwimlModal} onOpenChange={setShowTwimlModal}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>TwiML Preview</DialogTitle>
            <DialogDescription>
              This is the exact XML that will be sent to Twilio when the call is answered
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="rounded-lg bg-muted p-4 text-xs overflow-x-auto">
              <code>{twimlPreview?.twiml}</code>
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
