const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('sentri_token') || localStorage.getItem('ai_soc_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('sentri_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('sentri_token');
  localStorage.removeItem('sentri_user');
  localStorage.removeItem('ai_soc_token');
  localStorage.removeItem('ai_soc_user');
}

export function getSavedUser() {
  const user = localStorage.getItem('sentri_user') || localStorage.getItem('ai_soc_user');
  return user ? JSON.parse(user) : null;
}

export function setSavedUser(user: any) {
  localStorage.setItem('sentri_user', JSON.stringify(user));
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // Network unavailable, server offline, or CORS error
    throw new Error('Unable to connect to the server. Please try again.');
  }

  if (!response.ok) {
    let errorMsg = 'Request failed';
    try {
      const errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null) {
        if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else if (errorData.message) {
          errorMsg = errorData.message;
        }
      }
    } catch {
      if (response.status >= 500) {
        errorMsg = 'Unable to connect to the server. Please try again.';
      } else {
        errorMsg = `Request failed (${response.status})`;
      }
    }

    const lower = errorMsg.toLowerCase();
    if (
      lower.includes('email service is not configured') ||
      lower.includes('smtp') ||
      lower.includes('email delivery failed') ||
      lower.includes('verification email could not be sent') ||
      lower.includes('unable to send verification email')
    ) {
      errorMsg = 'Unable to send verification email. Please try again.';
    } else if (lower.includes('expired')) {
      errorMsg = 'This verification code has expired.';
    } else if (
      lower.includes('invalid') &&
      (lower.includes('otp') || lower.includes('code') || lower.includes('verification'))
    ) {
      errorMsg = 'Invalid verification code.';
    }

    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data: { email: string; otp: string }) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resendOtp: (data: { email: string }) =>
    request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data: { email: string }) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data: { email: string; otp: string; new_password: string; confirm_password: string }) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentUser: () => request('/auth/me'),
  getUsers: () => request('/auth/users'),

  // Analysis
  analyzeEmail: (data: { sender: string; subject: string; body: string; user_mode?: string }) =>
    request('/analysis/email', { method: 'POST', body: JSON.stringify(data) }),
  analyzeMessage: (data: { content: string; user_mode?: string }) =>
    request('/analysis/message', { method: 'POST', body: JSON.stringify(data) }),
  analyzeUrl: (data: { url: string; user_mode?: string }) =>
    request('/analysis/url', { method: 'POST', body: JSON.stringify(data) }),
  analyzeFile: (formData: FormData) =>
    request('/analysis/file', { method: 'POST', body: formData }),
  reportCompromise: (data: { scenario: string; credentials_entered: boolean; clicked_link: boolean; user_mode?: string }) =>
    request('/analysis/compromise', { method: 'POST', body: JSON.stringify(data) }),

  // Agent
  investigate: (data: { content: string; submission_type?: string; user_mode?: string; credentials_entered?: boolean }) =>
    request('/agent/investigate', { method: 'POST', body: JSON.stringify(data) }),
  chat: (data: { messages: { role: string; content: string }[]; incident_id?: string; user_mode?: string }) =>
    request('/agent/chat', { method: 'POST', body: JSON.stringify(data) }),

  // Incidents
  getIncidents: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/incidents${q ? `?${q}` : ''}`);
  },
  getMyIncidents: () => request('/incidents/my'),
  getIncidentDetail: (id: string) => request(`/incidents/${id}`),
  updateIncidentStatus: (id: string, status: string, notes?: string) =>
    request(`/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  addIncidentNote: (id: string, note: string) =>
    request(`/incidents/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
  executeAnalystAction: (id: string, action_type: string, notes?: string) =>
    request(`/incidents/${id}/action`, { method: 'POST', body: JSON.stringify({ action_type, notes }) }),

  // Dashboard
  getUserDashboard: () => request('/dashboard/user'),
  getSocDashboard: () => request('/dashboard/soc'),
  getTrends: () => request('/dashboard/trends'),

  // Knowledge Base & RAG
  getKnowledgeDocuments: () => request('/knowledge/documents'),
  ingestKnowledgeText: (data: { title: string; category: string; content: string; author?: string }) =>
    request('/knowledge/ingest', { method: 'POST', body: JSON.stringify(data) }),
  uploadKnowledgeFile: (formData: FormData) =>
    request('/knowledge/upload', { method: 'POST', body: formData }),
  deleteKnowledgeDocument: (id: string) =>
    request(`/knowledge/documents/${id}`, { method: 'DELETE' }),
  queryKnowledge: (data: { query: string; category?: string; top_k?: number }) =>
    request('/knowledge/query', { method: 'POST', body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/audit/logs${q ? `?${q}` : ''}`);
  },
};
