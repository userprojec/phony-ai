import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  Bot,
  Calendar,
  Settings,
  Phone,
  Clock,
  RotateCcw,
  AlertCircle,
  Search,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import type {
  VoiceAgentsS622Aa9440Row,
  CustomersS622Aa9440Row,
} from "@/types/database";

// FieldContent component for the form fields
function FieldContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

interface CampaignFormData {
  name: string;
  description: string;
  voiceAgentId: number | null;
  language: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  maxRetryAttempts: number;
  callsPerMinute: number;
  callerId: string;
  scheduledAt: Date | null;
  selectedCustomerIds: number[];
}

const steps = [
  { id: "basic", label: "Basic Info", icon: Settings },
  { id: "customers", label: "Customer Selection", icon: Users },
  { id: "voice", label: "Voice Agent", icon: Bot },
  { id: "schedule", label: "Call Settings", icon: Calendar },
  { id: "preview", label: "Review", icon: Check },
];

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
];

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` },
  ];
}).flat();

export default function CampaignNew() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgentsS622Aa9440Row[]>([]);
  const [customers, setCustomers] = useState<CustomersS622Aa9440Row[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    description: "",
    voiceAgentId: null,
    language: "en",
    timeWindowStart: "09:00",
    timeWindowEnd: "18:00",
    maxRetryAttempts: 3,
    callsPerMinute: 60,
    callerId: "",
    scheduledAt: null,
    selectedCustomerIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [agentsRes, customersRes] = await Promise.all([
        apiFetch("/api/voice-agents"),
        apiFetch("/api/customers"),
      ]);

      const agentsData = await agentsRes.json();
      const customersData = await customersRes.json();

      if (agentsData.success) {
        setVoiceAgents(agentsData.data.list || []);
      }
      if (customersData.success) {
        setCustomers(customersData.data.list || []);
      }
    } catch (error) {
      toast.error("Failed to load data, please refresh");
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.name.trim()) {
        newErrors.name = "Please enter campaign name";
      } else if (formData.name.length < 2) {
        newErrors.name = "Campaign name must be at least 2 characters";
      } else if (formData.name.length > 100) {
        newErrors.name = "Campaign name cannot exceed 100 characters";
      }
    }

    if (step === 1) {
      if (formData.selectedCustomerIds.length === 0) {
        newErrors.customers = "Please select at least one customer";
      }
    }

    if (step === 2) {
      if (!formData.voiceAgentId) {
        newErrors.voiceAgent = "Please select a voice agent";
      }
    }

    if (step === 3) {
      if (!formData.callerId.trim()) {
        newErrors.callerId = "Please enter caller ID";
      }
      if (formData.timeWindowStart >= formData.timeWindowEnd) {
        newErrors.timeWindow = "End time must be later than start time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        voice_agent_id: formData.voiceAgentId,
        language: formData.language,
        time_window_start: formData.timeWindowStart,
        time_window_end: formData.timeWindowEnd,
        max_retry_attempts: formData.maxRetryAttempts,
        calls_per_minute: formData.callsPerMinute,
        caller_id: formData.callerId,
        scheduled_at: formData.scheduledAt?.toISOString(),
        customer_ids: formData.selectedCustomerIds,
      };

      const response = await apiFetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Campaign created successfully");
        navigate("/campaigns");
      } else {
        toast.error(data.error || "Failed to create");
      }
    } catch (error) {
      toast.error("Network error, please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch) ||
      c.order_id?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomers = customers.filter((c) =>
    formData.selectedCustomerIds.includes(c.id)
  );

  const toggleCustomerSelection = (customerId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedCustomerIds: prev.selectedCustomerIds.includes(customerId)
        ? prev.selectedCustomerIds.filter((id) => id !== customerId)
        : [...prev.selectedCustomerIds, customerId],
    }));
    setErrors((prev) => ({ ...prev, customers: "" }));
  };

  const toggleAllCustomers = () => {
    const allIds = filteredCustomers.map((c) => c.id);
    const allSelected = allIds.every((id) => formData.selectedCustomerIds.includes(id));

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        selectedCustomerIds: prev.selectedCustomerIds.filter(
          (id) => !allIds.includes(id)
        ),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedCustomerIds: [
          ...new Set([...prev.selectedCustomerIds, ...allIds]),
        ],
      }));
    }
  };

  const updateFormData = (field: keyof CampaignFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const selectedVoiceAgent = voiceAgents.find(
    (a) => a.id === formData.voiceAgentId
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/campaigns")}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Create New Campaign</h1>
            <p className="text-sm text-muted-foreground">
              Configure AI phone outreach campaign parameters
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Sidebar Steps */}
        <div className="w-64 border-r bg-card p-6">
          <nav className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (index <= currentStep || isCompleted) {
                      setCurrentStep(index);
                    }
                  }}
                  disabled={index > currentStep && !isCompleted}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && !isActive && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2",
                      isActive && "border-primary-foreground bg-primary-foreground text-primary",
                      isCompleted &&
                        !isActive &&
                        "border-primary bg-primary text-primary-foreground",
                      !isActive &&
                        !isCompleted &&
                        "border-muted-foreground bg-transparent"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className="font-medium">{step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Card className="max-w-4xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStep === 0 && <Settings className="h-5 w-5 text-primary" />}
                {currentStep === 1 && <Users className="h-5 w-5 text-primary" />}
                {currentStep === 2 && <Bot className="h-5 w-5 text-primary" />}
                {currentStep === 3 && <Calendar className="h-5 w-5 text-primary" />}
                {currentStep === 4 && <CheckCircle2 className="h-5 w-5 text-primary" />}
                {steps[currentStep].label}
              </CardTitle>
              <CardDescription>
                {currentStep === 0 && "Enter basic campaign information"}
                {currentStep === 1 && "Select customers to call"}
                {currentStep === 2 && "Configure AI voice agent"}
                {currentStep === 3 && "Set calling time and frequency"}
                {currentStep === 4 && "Review campaign configuration"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 0 && (
                <FieldGroup className="space-y-6">
                  <Field>
                    <FieldLabel>
                      Campaign Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., Double 11 Order Confirmation Campaign"
                        value={formData.name}
                        onChange={(e) => updateFormData("name", e.target.value)}
                        className={cn(errors.name && "border-destructive")}
                      />
                      {errors.name && <FieldError errors={[{ message: errors.name }]} />}
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Campaign Description</FieldLabel>
                    <FieldContent>
                      <Textarea
                        placeholder="Describe the purpose and notes of the campaign..."
                        value={formData.description}
                        onChange={(e) => updateFormData("description", e.target.value)}
                        rows={4}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>
                      Language <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={formData.language}
                        onValueChange={(value) => updateFormData("language", value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              )}

              {/* Step 2: Customer Selection */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search customer name, phone or order ID..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Badge variant="secondary">
                      {formData.selectedCustomerIds.length} selected
                    </Badge>
                  </div>

                  {errors.customers && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {errors.customers}
                    </div>
                  )}

                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                filteredCustomers.length > 0 &&
                                filteredCustomers.every((c) =>
                                  formData.selectedCustomerIds.includes(c.id)
                                )
                              }
                              onCheckedChange={toggleAllCustomers}
                            />
                          </TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Order Status</TableHead>
                          <TableHead>City</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No matching customers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <TableRow
                              key={customer.id}
                              className={cn(
                                formData.selectedCustomerIds.includes(customer.id) &&
                                  "bg-primary/5"
                              )}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={formData.selectedCustomerIds.includes(
                                    customer.id
                                  )}
                                  onCheckedChange={() =>
                                    toggleCustomerSelection(customer.id)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {customer.name}
                              </TableCell>
                              <TableCell>{customer.phone}</TableCell>
                              <TableCell>{customer.order_id}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {customer.order_status}
                                </Badge>
                              </TableCell>
                              <TableCell>{customer.city || "-"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Step 3: Voice Agent */}
              {currentStep === 2 && (
                <FieldGroup className="space-y-6">
                  <Field>
                    <FieldLabel>
                      Select Voice Agent <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={formData.voiceAgentId?.toString() || ""}
                        onValueChange={(value) =>
                          updateFormData("voiceAgentId", parseInt(value))
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full",
                            errors.voiceAgent && "border-destructive"
                          )}
                        >
                          <SelectValue placeholder="Select AI voice agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {voiceAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.voiceAgent && (
                        <FieldError errors={[{ message: errors.voiceAgent }]} />
                      )}
                    </FieldContent>
                  </Field>

                  {selectedVoiceAgent && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          {selectedVoiceAgent.name}
                        </CardTitle>
                        <CardDescription>
                          {selectedVoiceAgent.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Voice Type:</span>{" "}
                            <Badge variant="secondary">
                              {selectedVoiceAgent.voice_type === "male"
                                ? "Male"
                                : selectedVoiceAgent.voice_type === "female"
                                ? "Female"
                                : "Unknown"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Language:</span>{" "}
                            <Badge variant="secondary">
                              {selectedVoiceAgent.language}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>{" "}
                            <Badge
                              variant={
                                selectedVoiceAgent.is_active ? "success" : "secondary"
                              }
                            >
                              {selectedVoiceAgent.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        {selectedVoiceAgent.greeting_script && (
                          <div className="rounded-md bg-muted p-3 text-sm">
                            <span className="text-muted-foreground">Greeting:</span>
                            <p className="mt-1 italic">
                              "{selectedVoiceAgent.greeting_script}"
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </FieldGroup>
              )}

              {/* Step 4: Schedule Settings */}
              {currentStep === 3 && (
                <FieldGroup className="space-y-6">
                  <Field>
                    <FieldLabel>
                      <Phone className="h-4 w-4" />
                      Caller ID <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., +86 400-123-4567"
                        value={formData.callerId}
                        onChange={(e) => updateFormData("callerId", e.target.value)}
                        className={cn(errors.callerId && "border-destructive")}
                      />
                      {errors.callerId && (
                        <FieldError errors={[{ message: errors.callerId }]} />
                      )}
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>
                      <Clock className="h-4 w-4" />
                      Calling Time Window
                    </FieldLabel>
                    <FieldContent>
                      <div className="flex items-center gap-4">
                        <Select
                          value={formData.timeWindowStart}
                          onValueChange={(value) =>
                            updateFormData("timeWindowStart", value)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">to</span>
                        <Select
                          value={formData.timeWindowEnd}
                          onValueChange={(value) =>
                            updateFormData("timeWindowEnd", value)
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "w-[140px]",
                              errors.timeWindow && "border-destructive"
                            )}
                          >
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.timeWindow && (
                        <FieldError errors={[{ message: errors.timeWindow }]} />
                      )}
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>
                      <RotateCcw className="h-4 w-4" />
                      Max Retry Attempts
                    </FieldLabel>
                    <FieldContent>
                      <div className="space-y-3">
                        <Slider
                          value={[formData.maxRetryAttempts]}
                          onValueChange={([value]) =>
                            updateFormData("maxRetryAttempts", value)
                          }
                          min={0}
                          max={5}
                          step={1}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>No retry</span>
                          <span className="font-medium text-foreground">
                            {formData.maxRetryAttempts} times
                          </span>
                          <span>5 times</span>
                        </div>
                      </div>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Calls Per Minute</FieldLabel>
                    <FieldContent>
                      <div className="space-y-3">
                        <Slider
                          value={[formData.callsPerMinute]}
                          onValueChange={([value]) =>
                            updateFormData("callsPerMinute", value)
                          }
                          min={10}
                          max={120}
                          step={10}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>10 calls</span>
                          <span className="font-medium text-foreground">
                            {formData.callsPerMinute} calls/min
                          </span>
                          <span>120 calls</span>
                        </div>
                      </div>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>
                      <Calendar className="h-4 w-4" />
                      Scheduled Start Time (Optional)
                    </FieldLabel>
                    <FieldContent>
                      <DatePicker
                        value={formData.scheduledAt}
                        onChange={(date) => updateFormData("scheduledAt", date)}
                        placeholder="Start immediately"
                        disabled={(date) => date < new Date()}
                      />
                      <FieldDescription>
                        Leave empty to start immediately after creation
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              )}

              {/* Step 5: Preview */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Campaign Name</span>
                          <span className="font-medium">{formData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Language</span>
                          <span>
                            {languages.find((l) => l.value === formData.language)?.label}
                          </span>
                        </div>
                        {formData.description && (
                          <div className="pt-2">
                            <span className="text-muted-foreground">Description:</span>
                            <p className="mt-1 text-sm">{formData.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Call Settings
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Caller ID</span>
                          <span>{formData.callerId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time Window</span>
                          <span>
                            {formData.timeWindowStart} - {formData.timeWindowEnd}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Retry Attempts</span>
                          <span>{formData.maxRetryAttempts} times</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Call Rate</span>
                          <span>{formData.callsPerMinute} calls/min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start Time</span>
                          <span>
                            {formData.scheduledAt
                              ? formData.scheduledAt.toLocaleString("en-US")
                              : "Start immediately"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Voice Agent
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {selectedVoiceAgent ? (
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{selectedVoiceAgent.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedVoiceAgent.voice_type === "male" ? "Male" : "Female"} ·{" "}
                              {selectedVoiceAgent.language}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Not selected</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Target Customers
                        </CardTitle>
                        <Badge variant="secondary">
                          {formData.selectedCustomerIds.length} customers
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {selectedCustomers.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto">
                          <div className="flex flex-wrap gap-2">
                            {selectedCustomers.slice(0, 10).map((customer) => (
                              <Badge key={customer.id} variant="outline">
                                {customer.name}
                              </Badge>
                            ))}
                            {selectedCustomers.length > 10 && (
                              <Badge variant="secondary">
                                +{selectedCustomers.length - 10} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No customers selected</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between border-t pt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/campaigns")}
                  >
                    Cancel
                  </Button>
                  {currentStep < steps.length - 1 ? (
                    <Button onClick={handleNext}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-primary"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Confirm Create
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
