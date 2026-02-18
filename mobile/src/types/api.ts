export interface AuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  email: string;
  requires_password: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface UserProfile {
  email: string;
  name: string;
  login_type: 'normal' | 'google' | 'both';
  first_name?: string;
  last_name?: string;
}

export interface StockPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TransactionItem {
  filing_date?: string;
  transaction_date: string;
  shares: number;
  transaction_code: string;
  price_per_share: number;
  ownership_type?: string;
  issuer_name?: string;
  security_title?: string;
}

export interface ForecastPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number | null;
  trend: number;
  trend_lower: number;
  trend_upper: number;
  yhat_lower: number;
  yhat_upper: number;
  momentum: number;
  acceleration: number;
}

export interface ForecastInput {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}
