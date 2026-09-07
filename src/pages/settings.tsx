import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Phone,
  Key,
  Bell,
  Shield,
  Copy,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  TestTube,
  Save,
  Info,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// Telephony Settings State
interface TelephonySettings {
  provider: "twilio" | "sip";
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  sipHost: string;
  sipPort: string;
  sipUsername: string;
  sipPassword: string;
  callerId: string;
}

// API Keys State
interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
}

// Notification Settings State
interface NotificationSettings {
  emailEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
  campaignCompleted: boolean;
  dailyReport: boolean;
  errorAlert: boolean;
  lowBalanceAlert: boolean;
}

// Compliance Settings State
interface ComplianceSettings {
  dncListEnabled: boolean;
  callRecordingConsent: boolean;
  gdprCompliance: boolean;
  maxCallsPerDay: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  autoDeleteRecordings: boolean;
  retentionDays: number;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("telephony");
  const [isLoading, setIsLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Telephony Settings
  const [telephony, setTelephony] = useState<TelephonySettings>({
    provider: "twilio",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    sipHost: "",
    sipPort: "5060",
    sipUsername: "",
    sipPassword: "",
    callerId: "",
  });

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "1",
      name: "Production API Key",
      key: "pk_live_xxxxxxxxxxxxxxxxxxxxxxxx",
      createdAt: "2024-01-15",
      lastUsed: "2024-01-20",
    },
    {
      id: "2",
      name: "Development API Key",
      key: "pk_test_yyyyyyyyyyyyyyyyyyyyyyyy",
      createdAt: "2024-01-10",
      lastUsed: "2024-01-19",
    },
  ]);
  const [newKeyName, setNewKeyName] = useState("");

  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailEnabled: true,
    webhookEnabled: false,
    webhookUrl: "",
    campaignCompleted: true,
    dailyReport: true,
    errorAlert: true,
    lowBalanceAlert: true,
  });

  // Compliance Settings
  const [compliance, setCompliance] = useState<ComplianceSettings>({
    dncListEnabled: true,
    callRecordingConsent: true,
    gdprCompliance: true,
    maxCallsPerDay: 100,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    autoDeleteRecordings: false,
    retentionDays: 90,
  });

  // Load settings from backend on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load telephony settings
      const telephonyRes = await apiFetch('/api/settings/telephony');
      const telephonyResult = await telephonyRes.json();
      if (telephonyResult.success && telephonyResult.data) {
        setTelephony(prev => ({ ...prev, ...telephonyResult.data }));
      }

      // Load notification settings
      const notifRes = await apiFetch('/api/settings/notifications');
      const notifResult = await notifRes.json();
      if (notifResult.success && notifResult.data) {
        setNotifications(prev => ({ ...prev, ...notifResult.data }));
      }

      // Load compliance settings
      const complianceRes = await apiFetch('/api/settings/compliance');
      const complianceResult = await complianceRes.json();
      if (complianceResult.success && complianceResult.data) {
        setCompliance(prev => ({ ...prev, ...complianceResult.data }));
      }

      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    setIsLoading(true);
    try {
      let settingsData: any;
      let category: string;

      switch (section) {
        case 'Telephony':
          settingsData = telephony;
          category = 'telephony';
          break;
        case 'Notification':
          settingsData = notifications;
          category = 'notifications';
          break;
        case 'Compliance':
          settingsData = compliance;
          category = 'compliance';
          break;
        default:
          throw new Error('Unknown settings category');
      }

      const response = await apiFetch(`/api/settings/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsData }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${section} settings saved successfully`);
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Network error, please try again');
      console.error('Save settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/settings/test-twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twilioAccountSid: telephony.twilioAccountSid,
          twilioAuthToken: telephony.twilioAuthToken,
          twilioPhoneNumber: telephony.twilioPhoneNumber,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.data?.message || 'Connection test successful');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    } catch (error) {
      toast.error('Network error, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API Key copied to clipboard");
  };

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter an API Key name");
      return;
    }
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: "pk_live_" + Math.random().toString(36).substring(2, 30),
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "-",
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    toast.success("New API Key generated");
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast.success("API Key deleted");
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure telephony, API keys, notifications, and compliance settings
          </p>
        </div>
        {!isLoaded && (
          <Badge variant="secondary" className="gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Loading...
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="telephony" className="gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Telephony</span>
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
        </TabsList>

        {/* Telephony Settings */}
        <TabsContent value="telephony" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Telephony Configuration</CardTitle>
              <CardDescription>
                Configure your telephony service provider (Twilio or SIP Trunk)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Service Provider</Label>
                <Select
                  value={telephony.provider}
                  onValueChange={(value: "twilio" | "sip") =>
                    setTelephony({ ...telephony, provider: value })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="sip">SIP Trunk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {telephony.provider === "twilio" ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-sid">Account SID</Label>
                    <Input
                      id="account-sid"
                      value={telephony.twilioAccountSid}
                      onChange={(e) =>
                        setTelephony({ ...telephony, twilioAccountSid: e.target.value })
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-token">Auth Token</Label>
                    <div className="relative">
                      <Input
                        id="auth-token"
                        type={showSecrets["twilioAuthToken"] ? "text" : "password"}
                        value={telephony.twilioAuthToken}
                        onChange={(e) =>
                          setTelephony({ ...telephony, twilioAuthToken: e.target.value })
                        }
                        placeholder="Your Twilio Auth Token"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowSecret("twilioAuthToken")}
                      >
                        {showSecrets["twilioAuthToken"] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twilio-phone">Twilio Phone Number</Label>
                    <Input
                      id="twilio-phone"
                      value={telephony.twilioPhoneNumber}
                      onChange={(e) =>
                        setTelephony({ ...telephony, twilioPhoneNumber: e.target.value })
                      }
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="caller-id">Caller ID</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Info className="h-5 w-5 text-primary" />
                              What is Caller ID?
                            </DialogTitle>
                            <DialogDescription className="space-y-4 pt-4">
                              <p>
                                <strong>Caller ID</strong> is the phone number that will be displayed 
                                to recipients when your AI makes outbound calls.
                              </p>
                              <div className="space-y-2">
                                <p className="font-medium">What to enter:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  <li>Your Twilio phone number (e.g., +1234567890)</li>
                                  <li>A verified Twilio caller ID number</li>
                                  <li>Must be in E.164 format (+country code + number)</li>
                                </ul>
                              </div>
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-900">
                                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>
                                    <strong>Important:</strong> The number must be verified with Twilio 
                                    before it can be used as a caller ID. If left empty, your Twilio 
                                    phone number will be used by default.
                                  </span>
                                </p>
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Input
                      id="caller-id"
                      value={telephony.callerId}
                      onChange={(e) =>
                        setTelephony({ ...telephony, callerId: e.target.value })
                      }
                      placeholder="+1234567890 (or leave empty to use Twilio number)"
                    />
                    <p className="text-xs text-muted-foreground">
                      If empty, your Twilio phone number will be used as the caller ID
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sip-host">SIP Host</Label>
                    <Input
                      id="sip-host"
                      value={telephony.sipHost}
                      onChange={(e) =>
                        setTelephony({ ...telephony, sipHost: e.target.value })
                      }
                      placeholder="sip.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sip-port">SIP Port</Label>
                    <Input
                      id="sip-port"
                      value={telephony.sipPort}
                      onChange={(e) =>
                        setTelephony({ ...telephony, sipPort: e.target.value })
                      }
                      placeholder="5060"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sip-username">SIP Username</Label>
                    <Input
                      id="sip-username"
                      value={telephony.sipUsername}
                      onChange={(e) =>
                        setTelephony({ ...telephony, sipUsername: e.target.value })
                      }
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sip-password">SIP Password</Label>
                    <div className="relative">
                      <Input
                        id="sip-password"
                        type={showSecrets["sipPassword"] ? "text" : "password"}
                        value={telephony.sipPassword}
                        onChange={(e) =>
                          setTelephony({ ...telephony, sipPassword: e.target.value })
                        }
                        placeholder="password"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowSecret("sipPassword")}
                      >
                        {showSecrets["sipPassword"] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sip-caller-id">Caller ID</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Info className="h-5 w-5 text-primary" />
                              What is Caller ID?
                            </DialogTitle>
                            <DialogDescription className="space-y-4 pt-4">
                              <p>
                                <strong>Caller ID</strong> is the phone number that will be displayed 
                                to recipients when your AI makes outbound calls via SIP.
                              </p>
                              <div className="space-y-2">
                                <p className="font-medium">What to enter:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  <li>A phone number you own and control</li>
                                  <li>Must be in E.164 format (+country code + number)</li>
                                  <li>Example: +14155551234 for US numbers</li>
                                </ul>
                              </div>
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-900">
                                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>
                                    <strong>Important:</strong> Ensure you have the right to use this 
                                    number as caller ID. Using unauthorized numbers may violate 
                                    regulations.
                                  </span>
                                </p>
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Input
                      id="sip-caller-id"
                      value={telephony.callerId}
                      onChange={(e) =>
                        setTelephony({ ...telephony, callerId: e.target.value })
                      }
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => handleSave("Telephony")}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Settings Info */}
          {isLoaded && telephony.twilioAccountSid && (
            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Settings Saved
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your Twilio configuration is saved and will be used for outbound calls. 
                      Caller ID: {telephony.callerId || telephony.twilioPhoneNumber || "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="apikeys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Manage API keys for accessing Phony AI API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Generate New Key */}
              <div className="flex gap-4">
                <Input
                  placeholder="Enter new API Key name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleGenerateKey} className="gap-2">
                  <Key className="h-4 w-4" />
                  Generate New Key
                </Button>
              </div>

              <Separator />

              {/* API Keys List */}
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{apiKey.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {apiKey.key.startsWith("pk_live") ? "Live" : "Test"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          {showSecrets[apiKey.id]
                            ? apiKey.key
                            : apiKey.key.substring(0, 12) + "..." + apiKey.key.slice(-4)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleShowSecret(apiKey.id)}
                        >
                          {showSecrets[apiKey.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {apiKey.createdAt} · Last used {apiKey.lastUsed}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyKey(apiKey.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteKey(apiKey.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Security Tips</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Keep your API keys secure and do not expose them in client-side code</li>
                  <li>Rotate API keys regularly to improve security</li>
                  <li>If you suspect a key has been compromised, delete it and generate a new one immediately</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure notification methods and event types to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important system notifications via email
                  </p>
                </div>
                <Switch
                  checked={notifications.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailEnabled: checked })
                  }
                />
              </div>

              <Separator />

              {/* Webhook */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Webhook Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Push events to your server endpoint
                    </p>
                  </div>
                  <Switch
                    checked={notifications.webhookEnabled}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, webhookEnabled: checked })
                    }
                  />
                </div>
                {notifications.webhookEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      value={notifications.webhookUrl}
                      onChange={(e) =>
                        setNotifications({ ...notifications, webhookUrl: e.target.value })
                      }
                      placeholder="https://your-domain.com/webhook"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Event Types */}
              <div className="space-y-4">
                <Label className="text-base">Notification Event Types</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="campaign-completed"
                      checked={notifications.campaignCompleted}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          campaignCompleted: checked,
                        })
                      }
                    />
                    <Label htmlFor="campaign-completed" className="cursor-pointer">
                      Campaign Completed
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="daily-report"
                      checked={notifications.dailyReport}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, dailyReport: checked })
                      }
                    />
                    <Label htmlFor="daily-report" className="cursor-pointer">
                      Daily Report
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="error-alert"
                      checked={notifications.errorAlert}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, errorAlert: checked })
                      }
                    />
                    <Label htmlFor="error-alert" className="cursor-pointer">
                      Error Alerts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="low-balance"
                      checked={notifications.lowBalanceAlert}
                      onCheckedChange={(checked) =>
                        setNotifications({
                          ...notifications,
                          lowBalanceAlert: checked,
                        })
                      }
                    />
                    <Label htmlFor="low-balance" className="cursor-pointer">
                      Low Balance Alert
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => handleSave("Notification")}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Configuration</CardTitle>
              <CardDescription>
                Configure compliance settings for outbound calls to meet regulatory requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* DNC List */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Do Not Call (DNC) List</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically filter phone numbers on the DNC list
                  </p>
                </div>
                <Switch
                  checked={compliance.dncListEnabled}
                  onCheckedChange={(checked) =>
                    setCompliance({ ...compliance, dncListEnabled: checked })
                  }
                />
              </div>

              <Separator />

              {/* Call Recording Consent */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Call Recording Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Play recording notification at the start of calls
                  </p>
                </div>
                <Switch
                  checked={compliance.callRecordingConsent}
                  onCheckedChange={(checked) =>
                    setCompliance({ ...compliance, callRecordingConsent: checked })
                  }
                />
              </div>

              <Separator />

              {/* GDPR Compliance */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">GDPR Compliance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable GDPR data protection compliance features
                  </p>
                </div>
                <Switch
                  checked={compliance.gdprCompliance}
                  onCheckedChange={(checked) =>
                    setCompliance({ ...compliance, gdprCompliance: checked })
                  }
                />
              </div>

              <Separator />

              {/* Call Limits */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-calls">Max Calls Per Day</Label>
                  <Input
                    id="max-calls"
                    type="number"
                    value={compliance.maxCallsPerDay}
                    onChange={(e) =>
                      setCompliance({
                        ...compliance,
                        maxCallsPerDay: parseInt(e.target.value) || 0,
                      })
                    }
                    min={1}
                    max={1000}
                  />
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4">
                <Label className="text-base">Quiet Hours</Label>
                <p className="text-sm text-muted-foreground">
                  No outbound calls will be made during these hours
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={compliance.quietHoursStart}
                      onChange={(e) =>
                        setCompliance({ ...compliance, quietHoursStart: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={compliance.quietHoursEnd}
                      onChange={(e) =>
                        setCompliance({ ...compliance, quietHoursEnd: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Retention */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto Delete Recordings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete call recordings after retention period
                    </p>
                  </div>
                  <Switch
                    checked={compliance.autoDeleteRecordings}
                    onCheckedChange={(checked) =>
                      setCompliance({ ...compliance, autoDeleteRecordings: checked })
                    }
                  />
                </div>
                {compliance.autoDeleteRecordings && (
                  <div className="space-y-2">
                    <Label htmlFor="retention-days">Retention Days</Label>
                    <Input
                      id="retention-days"
                      type="number"
                      value={compliance.retentionDays}
                      onChange={(e) =>
                        setCompliance({
                          ...compliance,
                          retentionDays: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1}
                      max={365}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => handleSave("Compliance")}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
