export const COMPANIES = [
    'AAPL', 'META', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NFLX',
    'JPM', 'JNJ', 'V', 'UNH', 'HD', 'DIS', 'BAC', 'XOM', 'PG', 'MA', 'PEP', 'WMT',
];

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

export const getRandomCompanies = (count: number) => {
    const shuffled = [...COMPANIES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
