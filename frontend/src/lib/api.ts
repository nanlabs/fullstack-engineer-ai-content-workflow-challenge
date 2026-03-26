const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Auth (no token required)
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: { id: string; email: string; name: string | null } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  signup: (email: string, password: string, name?: string) =>
    request<{ access_token: string; user: { id: string; email: string; name: string | null } }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify({ email, password, name }) },
    ),
};

// Campaigns
export const campaignsApi = {
  list: () => request<import('./types').Campaign[]>('/campaigns'),
  get: (id: string) => request<import('./types').Campaign>(`/campaigns/${id}`),
  create: (data: { name: string; description?: string; targetLanguages: string[] }) =>
    request<import('./types').Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; description?: string; targetLanguages?: string[] }) =>
    request<import('./types').Campaign>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request(`/campaigns/${id}`, { method: 'DELETE' }),
};

// Content
export const contentApi = {
  get: (id: string) => request<import('./types').ContentPiece>(`/content/${id}`),
  create: (campaignId: string, data: { title: string; body?: string; language?: string }) =>
    request<import('./types').ContentPiece>(`/campaigns/${campaignId}/content`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { title?: string; body?: string; reviewNotes?: string }) =>
    request<import('./types').ContentPiece>(`/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, data: { status: string; reviewNotes?: string }) =>
    request<import('./types').ContentPiece>(`/content/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request(`/content/${id}`, { method: 'DELETE' }),
};

// AI
export const aiApi = {
  providers: () => request<import('./types').ProvidersResponse>('/ai/providers'),
  generate: (id: string, model?: string, prompt?: string, wordCount?: number) =>
    request<import('./types').ContentPiece>(`/content/${id}/generate`, {
      method: 'POST',
      body: JSON.stringify({ model, prompt, wordCount }),
    }),
  translate: (id: string, targetLanguage: string, model?: string) =>
    request<import('./types').ContentPiece>(`/content/${id}/translate`, {
      method: 'POST',
      body: JSON.stringify({ targetLanguage, model }),
    }),
  extract: (id: string, model?: string) =>
    request<import('./types').ContentPiece>(`/content/${id}/extract`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),
  chain: (id: string, model?: string, prompt?: string, wordCount?: number) =>
    request<import('./types').ChainResponse>(`/content/${id}/chain`, {
      method: 'POST',
      body: JSON.stringify({ model, prompt, wordCount }),
    }),
  compare: (id: string, models?: string[]) =>
    request<import('./types').CompareResponse>(`/content/${id}/compare`, {
      method: 'POST',
      body: JSON.stringify({ models }),
    }),
};
