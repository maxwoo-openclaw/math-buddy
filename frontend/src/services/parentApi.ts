import type { DashboardResponse, LinkedStudent, StudentAnalysis, TrendPoint } from '../types';

const API_BASE = '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let url = `${API_BASE}${endpoint}`;
  
  // Append query params if provided
  if (options.params) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      params.append(key, String(value));
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const parentApi = {
  getDashboard: async (): Promise<DashboardResponse> => {
    return request<DashboardResponse>('/api/parents/dashboard');
  },

  getLinkedStudents: async (): Promise<LinkedStudent[]> => {
    return request<LinkedStudent[]>('/api/parents/students');
  },

  generateInviteCode: async (): Promise<{ invite_code: string; expires_at: string }> => {
    return request<{ invite_code: string; expires_at: string }>('/api/parents/generate-code', { method: 'POST' });
  },

  linkByCode: async (code: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>('/api/parents/link', { 
      method: 'POST',
      params: { code }
    });
  },

  getAnalysis: async (studentId: number): Promise<StudentAnalysis> => {
    return request<StudentAnalysis>(`/api/parents/dashboard/analysis/${studentId}`);
  },

  getTrends: async (studentId: number, days: number = 7): Promise<TrendPoint[]> => {
    return request<TrendPoint[]>(`/api/parents/dashboard/trends/${studentId}`, { params: { days } });
  },
};
