import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  Mic,
  Volume2,
  Languages,
  Building2,
  MessageSquare,
  Play,
  Loader2,
  Check,
  Bot,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";

// Free Web Speech API voices - no API key required
// These use the browser's built-in text-to-speech
const FREE_VOICES = [
  // English voices
  { id: "en-US-male", name: "English (US) - Male", language: "en", gender: "male", accent: "US", type: "free" },
  { id: "en-US-female", name: "English (US) - Female", language: "en", gender: "female", accent: "US", type: "free" },
  { id: "en-GB-male", name: "English (UK) - Male", language: "en", gender: "male", accent: "UK", type: "free" },
  { id: "en-GB-female", name: "English (UK) - Female", language: "en", gender: "female", accent: "UK", type: "free" },
  // Chinese voices
  { id: "zh-CN-male", name: "中文 (普通话) - 男声", language: "zh", gender: "male", accent: "CN", type: "free" },
  { id: "zh-CN-female", name: "中文 (普通话) - 女声", language: "zh", gender: "female", accent: "CN", type: "free" },
  { id: "zh-TW-male", name: "中文 (台灣) - 男聲", language: "zh", gender: "male", accent: "TW", type: "free" },
  { id: "zh-TW-female", name: "中文 (台灣) - 女聲", language: "zh", gender: "female", accent: "TW", type: "free" },
  // Spanish voices
  { id: "es-ES-male", name: "Español (España) - Masculino", language: "es", gender: "male", accent: "ES", type: "free" },
  { id: "es-ES-female", name: "Español (España) - Femenino", language: "es", gender: "female", accent: "ES", type: "free" },
  { id: "es-US-male", name: "Español (US) - Masculino", language: "es", gender: "male", accent: "US", type: "free" },
  { id: "es-US-female", name: "Español (US) - Femenino", language: "es", gender: "female", accent: "US", type: "free" },
  // French voices
  { id: "fr-FR-male", name: "Français - Masculin", language: "fr", gender: "male", accent: "FR", type: "free" },
  { id: "fr-FR-female", name: "Français - Féminin", language: "fr", gender: "female", accent: "FR", type: "free" },
  // German voices
  { id: "de-DE-male", name: "Deutsch - Männlich", language: "de", gender: "male", accent: "DE", type: "free" },
  { id: "de-DE-female", name: "Deutsch - Weiblich", language: "de", gender: "female", accent: "DE", type: "free" },
  // Japanese voices
  { id: "ja-JP-male", name: "日本語 - 男性", language: "ja", gender: "male", accent: "JP", type: "free" },
  { id: "ja-JP-female", name: "日本語 - 女性", language: "ja", gender: "female", accent: "JP", type: "free" },
  // Korean voices
  { id: "ko-KR-male", name: "한국어 - 남성", language: "ko", gender: "male", accent: "KR", type: "free" },
  { id: "ko-KR-female", name: "한국어 - 여성", language: "ko", gender: "female", accent: "KR", type: "free" },
  // Portuguese voices
  { id: "pt-BR-male", name: "Português (Brasil) - Masculino", language: "pt", gender: "male", accent: "BR", type: "free" },
  { id: "pt-BR-female", name: "Português (Brasil) - Feminino", language: "pt", gender: "female", accent: "BR", type: "free" },
  // Russian voices
  { id: "ru-RU-male", name: "Русский - Мужской", language: "ru", gender: "male", accent: "RU", type: "free" },
  { id: "ru-RU-female", name: "Русский - Женский", language: "ru", gender: "female", accent: "RU", type: "free" },
  // Arabic voices
  { id: "ar-SA-male", name: "العربية - ذكر", language: "ar", gender: "male", accent: "SA", type: "free" },
  { id: "ar-SA-female", name: "العربية - أنثى", language: "ar", gender: "female", accent: "SA", type: "free" },
];

const DEFAULT_GREETING_SCRIPT = `Hello {{customer_name}}, this is {{company_name}} calling about your order {{order_id}}. 

Your order status is: {{order_status}}.

Is now a good time to talk?`;

const DEFAULT_MAIN_SCRIPT = `Thank you for your time. I'm calling to provide an update on your order.

Your order is currently: {{order_status}}.

{{#if delivery_date}}
Expected delivery date: {{delivery_date}}.
{{/if}}

{{#if courier_name}}
Shipping with: {{courier_name}}.
{{/if}}

{{#if tracking_number}}
Tracking number: {{tracking_number}}.
{{/if}}

Do you have any questions about your order?`;

interface VoiceAgentFormData {
  name: string;
  description: string;
  company_name: string;
  voice_id: string;
  voice_type: string;
  voice_accent: string;
  language: string;
  greeting_script: string;
  main_script: string;
  faq_responses: string;
}

export default function VoiceAgentNew() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<VoiceAgentFormData>({
    name: "",
    description: "",
    company_name: "",
    voice_id: "",
    voice_type: "",
    voice_accent: "",
    language: "en",
    greeting_script: DEFAULT_GREETING_SCRIPT,
    main_script: DEFAULT_MAIN_SCRIPT,
    faq_responses: JSON.stringify({
      "What is my order status?": "Your order status is {{order_status}}.",
      "When will my order arrive?": "Your order is expected to arrive on {{delivery_date}}.",
      "What is my tracking number?": "Your tracking number is {{tracking_number}}.",
      "I want to cancel my order": "I understand. Let me connect you with customer service to help with the cancellation.",
      "Speak to a human": "Of course. I'll transfer you to a customer service representative.",
    }, null, 2),
  });

  const selectedVoice = FREE_VOICES.find((v) => v.id === formData.voice_id);

  const updateFormData = (field: keyof VoiceAgentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleVoiceSelect = (voiceId: string) => {
    const voice = FREE_VOICES.find((v) => v.id === voiceId);
    if (voice) {
      setFormData((prev) => ({
        ...prev,
        voice_id: voiceId,
        voice_type: voice.gender,
        voice_accent: voice.accent,
        language: voice.language,
      }));
    }
    setErrors((prev) => ({ ...prev, voice_id: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter agent name";
    } else if (formData.name.length < 2) {
      newErrors.name = "Agent name must be at least 2 characters";
    }

    if (!formData.company_name.trim()) {
      newErrors.company_name = "Please enter company name";
    }

    if (!formData.voice_id) {
      newErrors.voice_id = "Please select a voice";
    }

    if (!formData.greeting_script.trim()) {
      newErrors.greeting_script = "Please enter greeting script";
    }

    if (!formData.main_script.trim()) {
      newErrors.main_script = "Please enter main script";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlayPreview = async () => {
    if (!formData.voice_id || !previewText.trim()) {
      toast.error("Please select a voice and enter preview text");
      return;
    }

    const voice = FREE_VOICES.find((v) => v.id === formData.voice_id);
    if (!voice) return;

    setIsPlaying(true);

    try {
      // Use Web Speech API for free TTS
      if ("speechSynthesis" in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(previewText);
        
        // Try to find matching voice
        const voices = window.speechSynthesis.getVoices();
        const langPrefix = voice.language === "zh" ? "zh" : voice.language;
        const preferredVoice = voices.find((v) => 
          v.lang.toLowerCase().startsWith(langPrefix) &&
          (voice.gender === "male" ? v.name.toLowerCase().includes("male") : v.name.toLowerCase().includes("female"))
        ) || voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.lang = voice.language === "zh" ? "zh-CN" : `${voice.language}-${voice.accent}`;
        utterance.rate = 0.9;
        utterance.pitch = voice.gender === "male" ? 0.9 : 1.1;

        utterance.onend = () => {
          setIsPlaying(false);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          toast.error("Failed to play preview");
        };

        window.speechSynthesis.speak(utterance);
      } else {
        toast.error("Your browser doesn't support text-to-speech");
        setIsPlaying(false);
      }
    } catch (error) {
      toast.error("Failed to play preview");
      setIsPlaying(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Switch to the tab with errors
      if (errors.name || errors.company_name || errors.voice_id) {
        setActiveTab("basic");
      } else if (errors.greeting_script || errors.main_script) {
        setActiveTab("scripts");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        company_name: formData.company_name,
        voice_type: formData.voice_type,
        voice_accent: formData.voice_accent,
        language: formData.language,
        greeting_script: formData.greeting_script,
        main_script: formData.main_script,
        faq_responses: JSON.parse(formData.faq_responses || "{}"),
      };

      const response = await apiFetch("/api/voice-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Voice agent created successfully");
        navigate("/voice-agents");
      } else {
        toast.error(data.error || "Failed to create voice agent");
      }
    } catch (error) {
      toast.error("Network error, please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group voices by language
  const voicesByLanguage = FREE_VOICES.reduce((acc, voice) => {
    if (!acc[voice.language]) {
      acc[voice.language] = [];
    }
    acc[voice.language].push(voice);
    return acc;
  }, {} as Record<string, typeof FREE_VOICES>);

  const languageLabels: Record<string, string> = {
    en: "English",
    zh: "中文",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    ja: "日本語",
    ko: "한국어",
    pt: "Português",
    ru: "Русский",
    ar: "العربية",
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/voice-agents")}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Voice Agent</h1>
          <p className="text-sm text-muted-foreground">
            Configure an AI voice agent for automated phone calls
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="basic" className="gap-2">
            <Bot className="h-4 w-4" />
            Basic Settings
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Scripts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Agent Information
                </CardTitle>
                <CardDescription>
                  Configure the basic information for your voice agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="space-y-6">
                  <Field>
                    <FieldLabel>
                      Agent Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      placeholder="e.g., Order Notification Agent"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      className={cn(errors.name && "border-destructive")}
                    />
                    {errors.name && <FieldError errors={[{ message: errors.name }]} />}
                  </Field>

                  <Field>
                    <FieldLabel>
                      <Building2 className="h-4 w-4" />
                      Company Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      placeholder="e.g., Acme Corporation"
                      value={formData.company_name}
                      onChange={(e) => updateFormData("company_name", e.target.value)}
                      className={cn(errors.company_name && "border-destructive")}
                    />
                    {errors.company_name && (
                      <FieldError errors={[{ message: errors.company_name }]} />
                    )}
                  </Field>

                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      placeholder="Describe the purpose of this voice agent..."
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                      rows={3}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* Right Column - Voice Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  Voice Selection
                </CardTitle>
                <CardDescription>
                  Choose a voice for your AI agent (Free voices using browser TTS)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="space-y-6">
                  <Field>
                    <FieldLabel>
                      <Languages className="h-4 w-4" />
                      Voice <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      value={formData.voice_id}
                      onValueChange={handleVoiceSelect}
                    >
                      <SelectTrigger
                        className={cn(errors.voice_id && "border-destructive")}
                      >
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(voicesByLanguage).map(([lang, voices]) => (
                          <div key={lang}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {languageLabels[lang] || lang}
                            </div>
                            {voices.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                <div className="flex items-center gap-2">
                                  <span>{voice.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {voice.type === "free" ? "Free" : "Premium"}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.voice_id && <FieldError errors={[{ message: errors.voice_id }]} />}
                  </Field>

                  {selectedVoice && (
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <Mic className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{selectedVoice.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {selectedVoice.gender === "male" ? "Male" : "Female"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {selectedVoice.accent}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Free
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Voice Preview */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <Label className="text-sm font-medium">Voice Preview</Label>
                    <Textarea
                      placeholder="Enter text to preview the voice..."
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handlePlayPreview}
                      disabled={isPlaying || !previewText.trim() || !formData.voice_id}
                    >
                      {isPlaying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Play Preview
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Uses your browser's built-in text-to-speech (no API key required)
                    </p>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/voice-agents")}>
              Cancel
            </Button>
            <Button onClick={() => setActiveTab("scripts")}>
              Next: Scripts
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="scripts" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Greeting Script */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Greeting Script
                </CardTitle>
                <CardDescription>
                  The opening message when the call connects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <Textarea
                    value={formData.greeting_script}
                    onChange={(e) => updateFormData("greeting_script", e.target.value)}
                    rows={10}
                    className={cn(
                      "font-mono text-sm",
                      errors.greeting_script && "border-destructive"
                    )}
                  />
                  {errors.greeting_script && (
                    <FieldError errors={[{ message: errors.greeting_script }]} />
                  )}
                </Field>
                <div className="mt-4 rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">Available Variables:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["{{customer_name}}", "{{company_name}}", "{{order_id}}", "{{order_status}}"].map((v) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Script */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Main Conversation Script
                </CardTitle>
                <CardDescription>
                  The main dialogue flow after greeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <Textarea
                    value={formData.main_script}
                    onChange={(e) => updateFormData("main_script", e.target.value)}
                    rows={10}
                    className={cn(
                      "font-mono text-sm",
                      errors.main_script && "border-destructive"
                    )}
                  />
                  {errors.main_script && (
                    <FieldError errors={[{ message: errors.main_script }]} />
                  )}
                </Field>
                <div className="mt-4 rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">Available Variables:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["{{customer_name}}", "{{company_name}}", "{{order_id}}", "{{order_status}}", "{{delivery_date}}", "{{courier_name}}", "{{tracking_number}}"].map((v) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Responses */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  FAQ Responses (JSON)
                </CardTitle>
                <CardDescription>
                  Configure automated responses to common questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <Textarea
                    value={formData.faq_responses}
                    onChange={(e) => updateFormData("faq_responses", e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </Field>
                <p className="mt-2 text-xs text-muted-foreground">
                  Format: {`{"question": "response"}`} - Supports the same variables as scripts
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("basic")}>
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/voice-agents")}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
