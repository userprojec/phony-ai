/**
 * API fetch wrapper with Authorization header injection, error handling, and typed responses.
 * Phony AI - Enterprise AI Phone Outreach System
 */

import { getToken } from './auth';
import { resolveUrl } from './url';
import type {
  CampaignsS622Aa9440Row,
  CampaignsS622Aa9440Insert,
  CampaignsS622Aa9440Update,
  CustomersS622Aa9440Row,
  CustomersS622Aa9440Insert,
  CallsS622Aa9440Row,
  CallsS622Aa9440Insert,
  VoiceAgentsS622Aa9440Row,
  VoiceAgentsS622Aa9440Insert,
  VoiceAgentsS622Aa9440Update,
  CampaignCustomersS622Aa9440Row,
} from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
  success: true;
  data: T;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  data?: unknown;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface DashboardStats {
  totalCampaigns: number;
  todayCalls: number;
  successRate: number;
  avgDuration: number;
  activeCampaigns: number;
  recentCampaigns: CampaignsS622Aa9440Row[];
}

export interface CampaignWithStats extends CampaignsS622Aa9440Row {
  totalCustomers: number;
  calledCount: number;
  successCount: number;
}

export interface CallWithDetails extends CallsS622Aa9440Row {
  customerName?: string;
  campaignName?: string;
}

export interface CustomerWithCampaigns extends CustomersS622Aa9440Row {
  campaigns?: { id: number; name: string }[];
}

export interface AnalyticsTrends {
  dates: string[];
  calls: number[];
  success: number[];
  failed: number[];
}

export interface LanguageStats {
  language: string;
  count: number;
  successRate: number;
}

export interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  errors: { row: number; message: string }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// Core API Fetch Wrapper
// ============================================================================

/**
 * Custom error class for API errors
 */
export class ApiErrorException extends Error {
  status: number;
  response?: Response;
  
  constructor(
    message: string,
    status: number,
    response?: Response
  ) {
    super(message);
    this.name = 'ApiErrorException';
    this.status = status;
    this.response = response;
  }
}

/**
 * Fetch wrapper that automatically injects the Authorization header
 * and handles common error scenarios.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const resolvedUrl = resolveUrl(url);

  try {
    const response = await fetch(resolvedUrl, {
      ...options,
      headers,
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiErrorException(
        `HTTP ${response.status}: ${errorText}`,
        response.status,
        response
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ApiErrorException) {
      throw error;
    }
    // Network or other errors
    throw new ApiErrorException(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Typed API request helper that parses JSON responses
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(url, options);
  const data = await response.json() as ApiResult<T>;
  
  if (!data.success) {
    throw new ApiErrorException(data.error || 'API request failed', response.status, response);
  }
  
  return data.data;
}

// ============================================================================
// Dashboard API
// ============================================================================

export async function getDashboard(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>('/api/dashboard');
}

// ============================================================================
// Campaigns API
// ============================================================================

export async function getCampaigns(params?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<CampaignWithStats>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
  
  const query = queryParams.toString();
  return apiRequest<PaginatedResponse<CampaignWithStats>>(
    `/api/campaigns${query ? `?${query}` : ''}`
  );
}

export async function getCampaign(id: number): Promise<CampaignWithStats> {
  return apiRequest<CampaignWithStats>(`/api/campaigns/${id}`);
}

export async function createCampaign(
  data: CampaignsS622Aa9440Insert
): Promise<CampaignsS622Aa9440Row> {
  return apiRequest<CampaignsS622Aa9440Row>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaign(
  id: number,
  data: CampaignsS622Aa9440Update
): Promise<CampaignsS622Aa9440Row> {
  return apiRequest<CampaignsS622Aa9440Row>(`/api/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCampaign(id: number): Promise<void> {
  await apiRequest<void>(`/api/campaigns/${id}`, {
    method: 'DELETE',
  });
}

export async function startCampaign(id: number): Promise<CampaignsS622Aa9440Row> {
  return apiRequest<CampaignsS622Aa9440Row>(`/api/campaigns/${id}/start`, {
    method: 'POST',
  });
}

export async function pauseCampaign(id: number): Promise<CampaignsS622Aa9440Row> {
  return apiRequest<CampaignsS622Aa9440Row>(`/api/campaigns/${id}/pause`, {
    method: 'POST',
  });
}

export async function stopCampaign(id: number): Promise<CampaignsS622Aa9440Row> {
  return apiRequest<CampaignsS622Aa9440Row>(`/api/campaigns/${id}/stop`, {
    method: 'POST',
  });
}

// ============================================================================
// Customers API
// ============================================================================

export async function getCustomers(params?: {
  search?: string;
  validationStatus?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<CustomerWithCampaigns>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.validationStatus) queryParams.append('validationStatus', params.validationStatus);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
  
  const query = queryParams.toString();
  return apiRequest<PaginatedResponse<CustomerWithCampaigns>>(
    `/api/customers${query ? `?${query}` : ''}`
  );
}

export async function getCustomer(id: number): Promise<CustomerWithCampaigns> {
  return apiRequest<CustomerWithCampaigns>(`/api/customers/${id}`);
}

export async function createCustomer(
  data: CustomersS622Aa9440Insert
): Promise<CustomersS622Aa9440Row> {
  return apiRequest<CustomersS622Aa9440Row>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomer(
  id: number,
  data: Partial<CustomersS622Aa9440Insert>
): Promise<CustomersS622Aa9440Row> {
  return apiRequest<CustomersS622Aa9440Row>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiRequest<void>(`/api/customers/${id}`, {
    method: 'DELETE',
  });
}

export async function importCustomers(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiFetch('/api/customers/import', {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set Content-Type for FormData
  });
  
  const data = await response.json() as ApiResult<ImportResult>;
  if (!data.success) {
    throw new ApiErrorException(data.error || 'Import failed', response.status, response);
  }
  return data.data;
}

export async function validateCustomers(customerIds: number[]): Promise<{
  valid: number[];
  invalid: { id: number; errors: string[] }[];
}> {
  return apiRequest<{ valid: number[]; invalid: { id: number; errors: string[] }[] }>(
    '/api/customers/validate',
    {
      method: 'POST',
      body: JSON.stringify({ customerIds }),
    }
  );
}

// ============================================================================
// Calls API
// ============================================================================

export async function getCalls(params?: {
  campaignId?: number;
  customerId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<CallWithDetails>> {
  const queryParams = new URLSearchParams();
  if (params?.campaignId) queryParams.append('campaignId', String(params.campaignId));
  if (params?.customerId) queryParams.append('customerId', String(params.customerId));
  if (params?.status) queryParams.append('status', params.status);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
  
  const query = queryParams.toString();
  return apiRequest<PaginatedResponse<CallWithDetails>>(
    `/api/calls${query ? `?${query}` : ''}`
  );
}

export async function getCall(id: number): Promise<CallWithDetails> {
  return apiRequest<CallWithDetails>(`/api/calls/${id}`);
}

export async function createCall(data: CallsS622Aa9440Insert): Promise<CallsS622Aa9440Row> {
  return apiRequest<CallsS622Aa9440Row>('/api/calls', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCall(
  id: number,
  data: Partial<CallsS622Aa9440Insert>
): Promise<CallsS622Aa9440Row> {
  return apiRequest<CallsS622Aa9440Row>(`/api/calls/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getCallTranscript(id: number): Promise<{
  transcript: string;
  aiSummary: string;
  sentiment: string;
}> {
  return apiRequest<{ transcript: string; aiSummary: string; sentiment: string }>(
    `/api/calls/${id}/transcript`
  );
}

export async function exportCalls(params?: {
  campaignId?: number;
  startDate?: string;
  endDate?: string;
  format?: 'csv' | 'xlsx';
}): Promise<Blob> {
  const queryParams = new URLSearchParams();
  if (params?.campaignId) queryParams.append('campaignId', String(params.campaignId));
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.format) queryParams.append('format', params.format);
  
  const query = queryParams.toString();
  const response = await apiFetch(`/api/calls/export${query ? `?${query}` : ''}`);
  return response.blob();
}

// ============================================================================
// Voice Agents API
// ============================================================================

export async function getVoiceAgents(params?: {
  isActive?: boolean;
  search?: string;
}): Promise<VoiceAgentsS622Aa9440Row[]> {
  const queryParams = new URLSearchParams();
  if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
  if (params?.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  return apiRequest<VoiceAgentsS622Aa9440Row[]>(
    `/api/voice-agents${query ? `?${query}` : ''}`
  );
}

export async function getVoiceAgent(id: number): Promise<VoiceAgentsS622Aa9440Row> {
  return apiRequest<VoiceAgentsS622Aa9440Row>(`/api/voice-agents/${id}`);
}

export async function createVoiceAgent(
  data: VoiceAgentsS622Aa9440Insert
): Promise<VoiceAgentsS622Aa9440Row> {
  return apiRequest<VoiceAgentsS622Aa9440Row>('/api/voice-agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVoiceAgent(
  id: number,
  data: VoiceAgentsS622Aa9440Update
): Promise<VoiceAgentsS622Aa9440Row> {
  return apiRequest<VoiceAgentsS622Aa9440Row>(`/api/voice-agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVoiceAgent(id: number): Promise<void> {
  await apiRequest<void>(`/api/voice-agents/${id}`, {
    method: 'DELETE',
  });
}

export async function testVoiceAgent(
  id: number,
  text: string
): Promise<{ audioUrl: string; duration: number }> {
  return apiRequest<{ audioUrl: string; duration: number }>(`/api/voice-agents/${id}/test`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ============================================================================
// Analytics API
// ============================================================================

export async function getAnalyticsTrends(params?: {
  campaignId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsTrends> {
  const queryParams = new URLSearchParams();
  if (params?.campaignId) queryParams.append('campaignId', String(params.campaignId));
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  
  const query = queryParams.toString();
  return apiRequest<AnalyticsTrends>(`/api/analytics/trends${query ? `?${query}` : ''}`);
}

export async function getLanguageStats(params?: {
  campaignId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<LanguageStats[]> {
  const queryParams = new URLSearchParams();
  if (params?.campaignId) queryParams.append('campaignId', String(params.campaignId));
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  
  const query = queryParams.toString();
  return apiRequest<LanguageStats[]>(`/api/analytics/languages${query ? `?${query}` : ''}`);
}

// ============================================================================
// Campaign Customers API
// ============================================================================

export async function getCampaignCustomers(
  campaignId: number,
  params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<PaginatedResponse<CampaignCustomersS622Aa9440Row & { customer: CustomersS622Aa9440Row }>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
  
  const query = queryParams.toString();
  return apiRequest<PaginatedResponse<CampaignCustomersS622Aa9440Row & { customer: CustomersS622Aa9440Row }>>(
    `/api/campaigns/${campaignId}/customers${query ? `?${query}` : ''}`
  );
}

export async function addCustomersToCampaign(
  campaignId: number,
  customerIds: number[]
): Promise<void> {
  await apiRequest<void>(`/api/campaigns/${campaignId}/customers`, {
    method: 'POST',
    body: JSON.stringify({ customer_ids: customerIds }),
  });
}

export async function removeCustomerFromCampaign(
  campaignId: number,
  customerId: number
): Promise<void> {
  await apiRequest<void>(`/api/campaigns/${campaignId}/customers/${customerId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Monitoring API (WebSocket ready)
// ============================================================================

export interface MonitoringStats {
  activeCalls: number;
  queuedCalls: number;
  successRate: number;
  callsPerMinute: number;
  campaigns: {
    id: number;
    name: string;
    status: string;
    progress: number;
  }[];
}

export async function getMonitoringStats(): Promise<MonitoringStats> {
  return apiRequest<MonitoringStats>('/api/monitoring/stats');
}

export async function getActiveCalls(): Promise<CallWithDetails[]> {
  return apiRequest<CallWithDetails[]>('/api/monitoring/active-calls');
}

// ============================================================================
// Settings API
// ============================================================================

export interface Settings {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  webhookUrl?: string;
  notificationEmail?: string;
  notificationWebhook?: string;
  dncListEnabled?: boolean;
}

export async function getSettings(): Promise<Settings> {
  return apiRequest<Settings>('/api/settings');
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  return apiRequest<Settings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function testConnection(provider: 'twilio' | 'sip'): Promise<{
  success: boolean;
  message: string;
}> {
  return apiRequest<{ success: boolean; message: string }>(`/api/settings/test/${provider}`);
}
