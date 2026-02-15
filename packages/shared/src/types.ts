// ─── Auth ────────────────────────────────────────────────────────
export interface AuthTokenResponse {
    access_token: string;
    token_type: string;
    email: string;
    requires_password?: boolean;
}

export interface MessageResponse {
    message: string;
}

export interface UserProfile {
    email: string;
    name: string;
    login_type: 'normal' | 'google' | 'both';
    first_name?: string;
    family_name?: string;
}

export interface UpdateUserRequest {
    name?: string;
    password?: string;
    current_password?: string;
}

// ─── Stock Data ──────────────────────────────────────────────────
export interface StockPoint {
    date: string;
    close: number;
    volume?: number;
}

export interface TransactionItem {
    ownerName: string;
    transactionDate: string;
    transactionType: string;
    sharesTraded: number;
    pricePerShare: number;
    sharesOwned: number;
    secFilingUrl: string;
    companyName?: string;
    ticker?: string;
}

// ─── Forecasting ─────────────────────────────────────────────────
export interface ForecastPoint {
    date: string;
    predicted: number;
    lower_bound?: number;
    upper_bound?: number;
}

export interface ForecastInput {
    company: string;
    period: string;
}

// ─── API Error ───────────────────────────────────────────────────
export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}
