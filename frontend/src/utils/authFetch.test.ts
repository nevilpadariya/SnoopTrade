import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from './authFetch';

describe('authenticated requests', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('rotates an expired token and retries the original request', async () => {
    localStorage.setItem('authToken', 'expired');
    localStorage.setItem('authRefreshToken', 'refresh');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ access_token: 'renewed', refresh_token: 'rotated' }))
      .mockResolvedValueOnce(Response.json([{ ticker: 'AAPL' }]));
    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('/stocks/AAPL');

    expect(await response.json()).toEqual([{ ticker: 'AAPL' }]);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer expired');
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get('Authorization')).toBe('Bearer renewed');
    expect(localStorage.getItem('authRefreshToken')).toBe('rotated');
  });

  it('preserves the unauthorized response and clears rejected credentials', async () => {
    localStorage.setItem('authToken', 'expired');
    localStorage.setItem('authRefreshToken', 'revoked');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    expect((await authFetch('/stocks/AAPL')).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authRefreshToken')).toBeNull();
  });
});
