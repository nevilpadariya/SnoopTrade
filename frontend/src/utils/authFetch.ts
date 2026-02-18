import API_ENDPOINTS from './apiEndpoints';

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_REFRESH_TOKEN_KEY = 'authRefreshToken';
const AUTH_TIMESTAMP_KEY = 'authTimestamp';
const AUTH_REQUIRES_PASSWORD_KEY = 'authRequiresPassword';

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TIMESTAMP_KEY);
  localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
}

let refreshInFlight: Promise<string | null> | null = null;

async function requestTokenRotation(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(API_ENDPOINTS.refreshToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearStoredAuth();
      return null;
    }

    const data = await response.json();
    const accessToken = data.access_token as string | undefined;
    const newRefreshToken = data.refresh_token as string | undefined;
    if (!accessToken) {
      clearStoredAuth();
      return null;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    if (newRefreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefreshToken);
    }
    if (typeof data.requires_password === 'boolean') {
      if (data.requires_password) {
        localStorage.setItem(AUTH_REQUIRES_PASSWORD_KEY, 'true');
      } else {
        localStorage.removeItem(AUTH_REQUIRES_PASSWORD_KEY);
      }
    }

    return accessToken;
  } catch {
    return null;
  }
}

async function rotateAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = requestTokenRotation(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function runAuthFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  tokenOverride?: string,
  retryOnUnauthorized = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenOverride || localStorage.getItem(AUTH_TOKEN_KEY);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  const rotatedToken = await rotateAccessToken();
  if (!rotatedToken) {
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${rotatedToken}`);
  return fetch(input, { ...init, headers: retryHeaders });
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  tokenOverride?: string,
): Promise<Response> {
  return runAuthFetch(input, init, tokenOverride, true);
}
