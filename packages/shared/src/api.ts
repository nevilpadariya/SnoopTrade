import { ApiError } from './types';
import type {
    AuthTokenResponse,
    UserProfile,
    StockPoint,
    TransactionItem,
    ForecastPoint,
    MessageResponse,
    UpdateUserRequest,
} from './types';

// ─── Types ───────────────────────────────────────────────────────
/** Platform-specific token provider injected by web or mobile. */
export type TokenProvider = () => Promise<string | null>;

export interface ApiClientConfig {
    baseUrl: string;
    getToken: TokenProvider;
}

// ─── Client Factory ──────────────────────────────────────────────
/**
 * Creates a platform-agnostic API client.
 *
 * Usage (Web):
 *   createApiClient({ baseUrl: 'http://…', getToken: async () => localStorage.getItem('authToken') })
 *
 * Usage (Mobile):
 *   createApiClient({ baseUrl: 'http://…', getToken: () => SecureStore.getItemAsync('authToken') })
 */
export function createApiClient({ baseUrl, getToken }: ApiClientConfig) {
    // ── helpers ────────────────────────────────────────────────────
    async function authHeaders(): Promise<Record<string, string>> {
        const token = await getToken();
        if (!token) throw new ApiError('Not authenticated', 401);
        return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    }

    async function request<T>(path: string, init?: RequestInit): Promise<T> {
        const res = await fetch(`${baseUrl}${path}`, init);
        if (!res.ok) {
            let detail = res.statusText;
            try {
                const body = await res.json();
                detail = body.detail || detail;
            } catch { /* ignore */ }
            throw new ApiError(detail, res.status);
        }
        return res.json();
    }

    // ── auth ───────────────────────────────────────────────────────
    async function login(email: string, password: string): Promise<AuthTokenResponse> {
        const form = new URLSearchParams({ username: email, password });
        return request<AuthTokenResponse>('/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
        });
    }

    async function loginWithGoogle(credential: string): Promise<AuthTokenResponse> {
        return request<AuthTokenResponse>('/auth/google-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: credential }),
        });
    }

    async function signup(name: string, email: string, password: string): Promise<MessageResponse> {
        return request<MessageResponse>('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
    }

    // ── user ───────────────────────────────────────────────────────
    async function getUserProfile(): Promise<UserProfile> {
        const headers = await authHeaders();
        return request<UserProfile>('/auth/me', { headers });
    }

    async function updateUserProfile(data: UpdateUserRequest): Promise<MessageResponse> {
        const headers = await authHeaders();
        return request<MessageResponse>('/auth/me/update', {
            method: 'PUT',
            headers,
            body: JSON.stringify(data),
        });
    }

    // ── stocks ─────────────────────────────────────────────────────
    async function getStocks(company: string, period: string): Promise<StockPoint[]> {
        const headers = await authHeaders();
        return request<StockPoint[]>(`/stock/${company}?period=${period}`, { headers });
    }

    async function getTransactions(company: string, period: string): Promise<TransactionItem[]> {
        const headers = await authHeaders();
        return request<TransactionItem[]>(
            `/stock/${company}/transactions?period=${period}`,
            { headers },
        );
    }

    // ── forecasts ──────────────────────────────────────────────────
    async function getForecast(company: string, period: string): Promise<ForecastPoint[]> {
        const headers = await authHeaders();
        return request<ForecastPoint[]>(
            `/forecast/${company}/predict?period=${period}`,
            { headers },
        );
    }

    return {
        login,
        loginWithGoogle,
        signup,
        getUserProfile,
        updateUserProfile,
        getStocks,
        getTransactions,
        getForecast,
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
