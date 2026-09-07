import { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  FileCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Types
interface ParsedRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: ValidationError[];
  status: "valid" | "invalid" | "warning";
}

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  rows: ParsedRow[];
}

// Required fields for customer import
const REQUIRED_FIELDS = [
  { key: "name", label: "Customer Name", required: true },
  { key: "phone", label: "Phone Number", required: true },
  { key: "order_id", label: "Order ID", required: true },
  { key: "order_status", label: "Order Status", required: true },
];

const OPTIONAL_FIELDS = [
  { key: "delivery_date", label: "Estimated Delivery Date", required: false },
  { key: "courier_name", label: "Courier Company", required: false },
  { key: "tracking_number", label: "Tracking Number", required: false },
  { key: "language", label: "Preferred Language", required: false },
  { key: "city", label: "City", required: false },
  { key: "amount", label: "Order Amount", required: false },
  { key: "notes", label: "Notes", required: false },
];

const ALL_TARGET_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

// Phone number normalization
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Already has + prefix, just return as is
  if (phone.trim().startsWith('+')) {
    return `+${digitsOnly}`;
  }
  
  // If number starts with 1 and has 11 digits, it's likely US/Canada
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If number has 10 digits (US/Canada without country code), add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // For other cases, assume the digits already include country code
  if (digitsOnly.length > 10) {
    return `+${digitsOnly}`;
  }
  
  // Fallback: return with + prefix
  return `+${digitsOnly}`;
}

// CSV/Excel parsing utilities
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function validateRow(
  row: Record<string, string>,
  rowIndex: number,
  fieldMappings: FieldMapping[]
): ParsedRow {
  const errors: ValidationError[] = [];
  let status: "valid" | "invalid" | "warning" = "valid";

  // Build a mapped row using field mappings
  const mappedRow: Record<string, string> = {};
  fieldMappings.forEach((mapping) => {
    if (mapping.sourceField && mapping.targetField) {
      mappedRow[mapping.targetField] = row[mapping.sourceField] || "";
    }
  });

  // Normalize phone number if present
  if (mappedRow["phone"]) {
    mappedRow["phone"] = normalizePhone(mappedRow["phone"]);
  }

  // Check required fields
  REQUIRED_FIELDS.forEach((field) => {
    const value = mappedRow[field.key];
    if (!value || value.trim() === "") {
      errors.push({
        field: field.key,
        message: `${field.label} is required`,
        severity: "error",
      });
      status = "invalid";
    }
  });

  // Validate phone format (E.164 format)
  const phone = mappedRow["phone"];
  if (phone && !/^\+\d{8,15}$/.test(phone)) {
    errors.push({
      field: "phone",
      message: "Phone must be in E.164 format (e.g., +9779704011561)",
      severity: "error",
    });
    status = "invalid";
  }

  // Validate amount if present
  const amount = mappedRow["amount"];
  if (amount && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    errors.push({
      field: "amount",
      message: "Invalid order amount format",
      severity: "warning",
    });
    if (status === "valid") status = "warning";
  }

  return {
    rowIndex,
    data: mappedRow,
    errors,
    status,
  };
}

export default function CustomerImport() {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "complete">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = uploadedFile.name.slice(uploadedFile.name.lastIndexOf(".")).toLowerCase();

    if (!validTypes.includes(uploadedFile.type) && !validExtensions.includes(fileExtension)) {
      toast.error("Please upload CSV or Excel file");
      return;
    }

    setFile(uploadedFile);
    handleFileParse(uploadedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    noClick: true,
  });

  const handleFileParse = async (uploadedFile: File) => {
    setIsUploading(true);
    try {
      const content = await uploadedFile.text();
      const { headers, rows } = parseCSV(content);

      if (headers.length === 0) {
        toast.error("File parsing failed: No headers found");
        setIsUploading(false);
        return;
      }

      setParsedData({ headers, rows });

      // Auto-map fields based on header names
      const autoMappings: FieldMapping[] = [];
      headers.forEach((header) => {
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, "_");
        const matchedField = ALL_TARGET_FIELDS.find(
          (f) =>
            f.key === normalizedHeader ||
            f.label === header ||
            header.toLowerCase().includes(f.key.toLowerCase())
        );
        if (matchedField) {
          autoMappings.push({ sourceField: header, targetField: matchedField.key });
        }
      });
      setFieldMappings(autoMappings);

      // Don't validate here - wait until mapping is confirmed
      // Validation will happen when user proceeds to preview step

      setStep("mapping");
      toast.success(`Successfully parsed ${rows.length} records`);
    } catch (error) {
      toast.error("File parsing failed");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setFieldMappings((prev) => {
      const filtered = prev.filter((m) => m.sourceField !== sourceField);
      if (targetField && targetField !== "unmapped") {
        filtered.push({ sourceField, targetField });
      }
      return filtered;
    });
  };

  const runValidation = () => {
    if (!parsedData) return;

    const rows: ParsedRow[] = parsedData.rows.map((row, index) =>
      validateRow(row, index + 1, fieldMappings)
    );

    const valid = rows.filter((r) => r.status === "valid").length;
    const invalid = rows.filter((r) => r.status === "invalid").length;
    const warnings = rows.filter((r) => r.status === "warning").length;

    setValidationResult({
      total: rows.length,
      valid,
      invalid,
      warnings,
      rows,
    });
  };

  const getMappedTargetFields = () => {
    return fieldMappings.map((m) => m.targetField);
  };

  const handleConfirmImport = async () => {
    if (!validationResult) return;

    setIsImporting(true);
    setStep("importing");

    try {
      // Simulate progress
      const totalSteps = 10;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setImportProgress((i / totalSteps) * 100);
      }

      // Prepare data for API - r.data is already the mapped data
      const validRows = validationResult.rows
        .filter((r) => r.status !== "invalid")
        .map((r) => r.data);

      // Call API
      const response = await apiFetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: validRows }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      if (result.success) {
        setStep("complete");
        toast.success(`Successfully imported ${validRows.length} customer records`);
      } else {
        throw new Error(result.error || "Import failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
      setStep("preview");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!validationResult) return;

    const errorRows = validationResult.rows.filter((r) => r.errors.length > 0);
    const csvContent = [
      ["Row", "Field", "Error Message", "Severity"],
      ...errorRows.flatMap((r) =>
        r.errors.map((e) => [r.rowIndex, e.field, e.message, e.severity])
      ),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `import_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleDownloadTemplate = () => {
    const headers = ALL_TARGET_FIELDS.map((f) => f.label).join(",");
    const sampleRow = [
      "John Doe",
      "+1 555-123-4567",
      "ORD-2024-001",
      "Pending Delivery",
      "2024-12-31",
      "FedEx",
      "FX123456789",
      "en-US",
      "New York",
      "299.99",
      "Please deliver ASAP",
    ].join(",");

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "customer_import_template.csv";
    link.click();
  };

  const filteredRows = useMemo(() => {
    if (!validationResult) return [];
    switch (activeTab) {
      case "valid":
        return validationResult.rows.filter((r) => r.status === "valid");
      case "invalid":
        return validationResult.rows.filter((r) => r.status === "invalid");
      case "warning":
        return validationResult.rows.filter((r) => r.status === "warning");
      default:
        return validationResult.rows;
    }
  }, [validationResult, activeTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      case "warning":
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_40%_98%)] dark:bg-[hsl(222_47%_7%)]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <a href="/customers">
                <ArrowLeft className="h-4 w-4" />
                Back to Customer List
              </a>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Import Customer Data</h1>
          <p className="text-muted-foreground mt-1">Upload CSV or Excel file to import customer order data in batch</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {[
              { key: "upload", label: "Upload File" },
              { key: "mapping", label: "Field Mapping" },
              { key: "preview", label: "Data Preview" },
              { key: "complete", label: "Complete" },
            ].map((s, index, arr) => {
              const isActive =
                step === s.key ||
                (step === "importing" && s.key === "complete") ||
                (step === "complete" && s.key === "complete");
              const isPast =
                arr.findIndex((x) => x.key === step) > index ||
                (step === "importing" && index < 3) ||
                (step === "complete" && index < 3);

              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                      isActive && "bg-[hsl(250_95%_60%)] text-white",
                      isPast && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                      !isActive && !isPast && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isPast && !isActive ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  {index < arr.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card className="border-0 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>Supports CSV, XLS, XLSX formats, file size up to 10MB</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-[hsl(250_95%_60%)] bg-[hsl(250_95%_95%)]"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                      isDragActive
                        ? "bg-[hsl(250_95%_60%)] text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {isDragActive ? "Drop file here" : "Drag file here or click to select"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Supports CSV, Excel formats</p>
                  </div>
                  <Button variant="outline" onClick={open} className="mt-2">
                    Select File
                  </Button>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Import Template</h3>
                  <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="gap-1">
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Required Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {REQUIRED_FIELDS.map((field) => (
                      <Badge key={field.key} variant="secondary">
                        {field.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 mb-2">Optional Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONAL_FIELDS.map((field) => (
                      <Badge key={field.key} variant="outline">
                        {field.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Field Mapping */}
        {step === "mapping" && parsedData && (
          <Card className="border-0 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>Map file columns to system fields, unmapped columns will be ignored</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parsedData.headers.map((header) => {
                  const currentMapping = fieldMappings.find((m) => m.sourceField === header);
                  const mappedTargets = getMappedTargetFields();

                  return (
                    <div key={header} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{header}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sample: {parsedData.rows[0]?.[header] || "-"}
                        </p>
                      </div>
                      <div className="text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <Select
                          value={currentMapping?.targetField || "unmapped"}
                          onValueChange={(value) => handleMappingChange(header, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select target field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">-- Skip --</SelectItem>
                            <SelectItem value="name" disabled={mappedTargets.includes("name") && currentMapping?.targetField !== "name"}>
                              Customer Name (Required)
                            </SelectItem>
                            <SelectItem value="phone" disabled={mappedTargets.includes("phone") && currentMapping?.targetField !== "phone"}>
                              Phone Number (Required)
                            </SelectItem>
                            <SelectItem value="order_id" disabled={mappedTargets.includes("order_id") && currentMapping?.targetField !== "order_id"}>
                              Order ID (Required)
                            </SelectItem>
                            <SelectItem value="order_status" disabled={mappedTargets.includes("order_status") && currentMapping?.targetField !== "order_status"}>
                              Order Status (Required)
                            </SelectItem>
                            <Separator className="my-2" />
                            {OPTIONAL_FIELDS.map((field) => (
                              <SelectItem
                                key={field.key}
                                value={field.key}
                                disabled={mappedTargets.includes(field.key) && currentMapping?.targetField !== field.key}
                              >
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {currentMapping && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Required fields check */}
              <Alert className="mt-6" variant={fieldMappings.some((m) => REQUIRED_FIELDS.some((r) => r.key === m.targetField)) ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Required Fields Check</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {REQUIRED_FIELDS.map((field) => {
                      const isMapped = fieldMappings.some((m) => m.targetField === field.key);
                      return (
                        <Badge key={field.key} variant={isMapped ? "success" : "destructive"}>
                          {isMapped ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {field.label}
                        </Badge>
                      );
                    })}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  runValidation();
                  setStep("preview");
                }}
                disabled={!REQUIRED_FIELDS.every((f) => fieldMappings.some((m) => m.targetField === f.key))}
                className="bg-[hsl(250_95%_60%)] hover:bg-[hsl(250_95%_55%)]"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Preview & Validation */}
        {step === "preview" && validationResult && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                      <p className="text-2xl font-semibold text-foreground">{validationResult.total}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valid Records</p>
                      <p className="text-2xl font-semibold text-green-600">{validationResult.valid}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Warning Records</p>
                      <p className="text-2xl font-semibold text-amber-600">{validationResult.warnings}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Invalid Records</p>
                      <p className="text-2xl font-semibold text-red-600">{validationResult.invalid}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Preview Table */}
            <Card className="border-0 shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Data Preview</CardTitle>
                  <CardDescription>Review and validate import data</CardDescription>
                </div>
                {validationResult.invalid > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDownloadErrors} className="gap-1">
                    <Download className="h-4 w-4" />
                    Download Error Report
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All ({validationResult.total})</TabsTrigger>
                    <TabsTrigger value="valid">Valid ({validationResult.valid})</TabsTrigger>
                    <TabsTrigger value="warning">Warning ({validationResult.warnings})</TabsTrigger>
                    <TabsTrigger value="invalid">Invalid ({validationResult.invalid})</TabsTrigger>
                  </TabsList>
                  <TabsContent value={activeTab}>
                    <ScrollArea className="h-[400px] border rounded-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-16">Row</TableHead>
                            {fieldMappings.map((m) => {
                              const field = ALL_TARGET_FIELDS.find((f) => f.key === m.targetField);
                              return (
                                <TableHead key={m.targetField}>
                                  {field?.label || m.targetField}
                                  {field?.required && <span className="text-red-500 ml-1">*</span>}
                                </TableHead>
                              );
                            })}
                            <TableHead>Validation Info</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={fieldMappings.length + 3} className="text-center py-8 text-muted-foreground">
                                No data
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredRows.map((row) => (
                              <TableRow key={row.rowIndex} className={row.status === "invalid" ? "bg-red-50/50 dark:bg-red-950/20" : undefined}>
                                <TableCell>{getStatusBadge(row.status)}</TableCell>
                                <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                                {fieldMappings.map((m) => (
                                  <TableCell key={m.targetField} className="max-w-[200px] truncate">
                                    {row.data[m.targetField] || "-"}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  {row.errors.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {row.errors.map((error, idx) => (
                                        <span
                                          key={idx}
                                          className={cn(
                                            "text-xs",
                                            error.severity === "error" ? "text-red-600" : "text-amber-600"
                                          )}
                                        >
                                          {error.message}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-upload
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={validationResult.valid === 0 && validationResult.warnings === 0}
                    className="bg-[hsl(250_95%_60%)] hover:bg-[hsl(250_95%_55%)]"
                  >
                    Confirm Import
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-[hsl(250_95%_95%)] flex items-center justify-center animate-pulse">
                  <Upload className="h-10 w-10 text-[hsl(250_95%_60%)]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Importing data...</h2>
                  <p className="text-muted-foreground mt-2">Please wait, processing your data</p>
                </div>
                <div className="w-full max-w-md">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">{Math.round(importProgress)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && (
          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <FileCheck className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Import Successful!</h2>
                  <p className="text-muted-foreground mt-2">Customer data has been successfully imported into the system</p>
                </div>
                <div className="flex gap-4 mt-4">
                  <Button variant="outline" asChild>
                    <a href="/customers">View Customer List</a>
                  </Button>
                  <Button
                    onClick={() => {
                      setStep("upload");
                      setFile(null);
                      setParsedData(null);
                      setFieldMappings([]);
                      setValidationResult(null);
                      setImportProgress(0);
                    }}
                    className="bg-[hsl(250_95%_60%)] hover:bg-[hsl(250_95%_55%)]"
                  >
                    Continue Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
