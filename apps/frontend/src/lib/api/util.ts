import { API_BASE_URL } from '@/lib/config';
import { HttpError } from '@/lib/errors';

async function fetchFromAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new HttpError(response.status, errorBody.message || 'API Error');
  }

  return response.json();
}

// Define API methods
export const api = {
  get: <T>(endpoint: string) => fetchFromAPI<T>(endpoint, { method: 'GET' }),
  post: <T, U>(endpoint: string, body: U) =>
    fetchFromAPI<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: <T, U>(endpoint: string, body: U) =>
    fetchFromAPI<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) => fetchFromAPI<T>(endpoint, { method: 'DELETE' }),
};
