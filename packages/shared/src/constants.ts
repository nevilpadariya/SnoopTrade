/**
 * Companies tracked by SnoopTrade.
 * Single source of truth — consumed by frontend, mobile, and should match backend.
 */
export const COMPANIES = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'NVDA', 'JPM', 'V', 'JNJ',
] as const;

export type CompanyTicker = (typeof COMPANIES)[number];

/** Human-readable company names keyed by ticker. */
export const COMPANY_NAMES: Record<CompanyTicker, string> = {
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    GOOGL: 'Alphabet Inc.',
    AMZN: 'Amazon.com Inc.',
    META: 'Meta Platforms Inc.',
    TSLA: 'Tesla Inc.',
    NVDA: 'NVIDIA Corporation',
    JPM: 'JPMorgan Chase & Co.',
    V: 'Visa Inc.',
    JNJ: 'Johnson & Johnson',
};

/** Time period options for stock data and forecasts. */
export const TIME_PERIODS = {
    '1m': '1 Month',
    '3m': '3 Months',
    '6m': '6 Months',
    '1y': '1 Year',
    '5y': '5 Years',
} as const;

export type TimePeriod = keyof typeof TIME_PERIODS;
