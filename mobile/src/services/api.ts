import {
  AuthTokenResponse,
  ForecastInput,
  ForecastPoint,
  MessageResponse,
  StockPoint,
  TransactionItem,
  UserProfile,
} from '../types/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ─── Request deduplication + client cache ───
// If the same request is already in-flight, return the existing promise
// If the same request was completed recently, return the cached result
const CACHE_TTL = 120_000; // 2 minutes
const _cache = new Map<string, { data: unknown; ts: number }>();
const _inflight = new Map<string, Promise<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  _cache.delete(key);
  return null;
}

function dedupFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Return cached data if available
  const cached = getCached<T>(key);
  if (cached !== null) return Promise.resolve(cached);

  // Return in-flight promise if same request is already pending
  const existing = _inflight.get(key);
  if (existing) return existing as Promise<T>;

  // Start new request and cache the promise
  const promise = fetcher().then((data) => {
    _cache.set(key, { data, ts: Date.now() });
    _inflight.delete(key);
    return data;
  }).catch((err) => {
    _inflight.delete(key);
    throw err;
  });

  _inflight.set(key, promise);
  return promise;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let detail = 'Request failed';
  try {
    const err = await response.json();
    if (typeof err?.detail === 'string') {
      detail = err.detail;
    } else if (Array.isArray(err?.detail) && err.detail[0]?.msg) {
      detail = err.detail[0].msg;
    }
  } catch {
    // use default message when body is not JSON
  }

  throw new ApiError(detail, response.status);
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function loginWithPassword(email: string, password: string): Promise<AuthTokenResponse> {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);

  const response = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  return parseResponse<AuthTokenResponse>(response);
}

export async function loginWithGoogle(email: string, googleIdToken: string): Promise<AuthTokenResponse> {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', '');
  body.append('login_type', 'google');
  body.append('token', googleIdToken);

  const response = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  return parseResponse<AuthTokenResponse>(response);
}

export async function signUp(name: string, email: string, password: string): Promise<MessageResponse> {
  const response = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  return parseResponse<MessageResponse>(response);
}

export async function getCurrentUser(token: string): Promise<UserProfile> {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<UserProfile>(response);
}

export async function updatePassword(token: string, password: string): Promise<MessageResponse> {
  const response = await fetch(`${BASE_URL}/auth/me/update`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ password }),
  });

  return parseResponse<MessageResponse>(response);
}

export async function fetchStocks(token: string, ticker: string, period: string): Promise<StockPoint[]> {
  return dedupFetch(`stocks:${ticker}:${period}`, async () => {
    const response = await fetch(`${BASE_URL}/stocks/${ticker}?period=${period}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return parseResponse<StockPoint[]>(response);
  });
}

export async function fetchTransactions(token: string, ticker: string, period: string): Promise<TransactionItem[]> {
  return dedupFetch(`txn:${ticker}:${period}`, async () => {
    const response = await fetch(`${BASE_URL}/transactions/${ticker}?time_period=${period}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return parseResponse<TransactionItem[]>(response);
  });
}

export async function fetchForecast(token: string, payload: ForecastInput[]): Promise<ForecastPoint[]> {
  const response = await fetch(`${BASE_URL}/future`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse<ForecastPoint[]>(response);
}

export { ApiError };
