import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the raw `request` function behavior via the exported API methods
// Since request() is a private function, we test it through the public wrappers

describe('API utility', () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = window.location;

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
    localStorage.clear();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '/' },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
    vi.resetModules();
  });

  async function loadApi() {
    // Dynamic import to get fresh module after env setup
    return import('./api');
  }

  it('injects Authorization header when token exists', async () => {
    localStorage.setItem('auth_token', 'test-jwt-token');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const { campaignsApi } = await loadApi();
    await campaignsApi.list();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
        }),
      }),
    );
  });

  it('does not inject Authorization header when no token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const { campaignsApi } = await loadApi();
    await campaignsApi.list();

    const callHeaders = mockFetch.mock.calls[0][1]?.headers;
    expect(callHeaders?.Authorization).toBeUndefined();
  });

  it('sets Content-Type to application/json', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    const { campaignsApi } = await loadApi();
    await campaignsApi.list();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('clears auth and redirects on 401 response', async () => {
    localStorage.setItem('auth_token', 'expired-token');
    localStorage.setItem('auth_user', '{"id":"1"}');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    const { campaignsApi } = await loadApi();
    await expect(campaignsApi.list()).rejects.toThrow('Session expired');

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('throws error with server message on non-OK response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Bad input data' }),
    });

    const { campaignsApi } = await loadApi();
    await expect(campaignsApi.list()).rejects.toThrow('Bad input data');
  });

  it('falls back to statusText when JSON parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });

    const { campaignsApi } = await loadApi();
    await expect(campaignsApi.list()).rejects.toThrow('Internal Server Error');
  });

  it('sends POST body correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: '1', name: 'New Campaign' }),
    });

    const { campaignsApi } = await loadApi();
    await campaignsApi.create({
      name: 'Test',
      description: 'Desc',
      targetLanguages: ['en'],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          description: 'Desc',
          targetLanguages: ['en'],
        }),
      }),
    );
  });

  it('AI generate endpoint sends correct payload', async () => {
    localStorage.setItem('auth_token', 'token');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    const { aiApi } = await loadApi();
    await aiApi.generate('piece-1', 'gpt-5.4-mini', 'Write about summer', 200);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/content/piece-1/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          prompt: 'Write about summer',
          wordCount: 200,
        }),
      }),
    );
  });

  it('AI compare endpoint sends models array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ contentId: 'piece-1', comparisons: {} }),
    });

    const { aiApi } = await loadApi();
    await aiApi.compare('piece-1', ['gpt-5.4-mini', 'claude-sonnet-4.6']);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/content/piece-1/compare',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ models: ['gpt-5.4-mini', 'claude-sonnet-4.6'] }),
      }),
    );
  });
});
