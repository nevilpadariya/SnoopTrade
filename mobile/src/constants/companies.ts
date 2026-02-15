export const COMPANIES = [
  'AAPL', 'META', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NFLX',
  'JPM', 'JNJ', 'V', 'UNH', 'HD', 'DIS', 'BAC', 'XOM', 'PG', 'MA', 'PEP', 'WMT',
] as const;

export const COMPANY_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  META: 'Meta Platforms',
  NVDA: 'NVIDIA',
  GOOGL: 'Alphabet (Google)',
  MSFT: 'Microsoft',
  AMZN: 'Amazon',
  TSLA: 'Tesla',
  NFLX: 'Netflix',
  JPM: 'JPMorgan Chase',
  JNJ: 'Johnson & Johnson',
  V: 'Visa',
  UNH: 'UnitedHealth',
  HD: 'Home Depot',
  DIS: 'Walt Disney',
  BAC: 'Bank of America',
  XOM: 'Exxon Mobil',
  PG: 'Procter & Gamble',
  MA: 'Mastercard',
  PEP: 'PepsiCo',
  WMT: 'Walmart',
};

export const TIME_PERIODS = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
] as const;

export type TimePeriod = (typeof TIME_PERIODS)[number]['value'];
