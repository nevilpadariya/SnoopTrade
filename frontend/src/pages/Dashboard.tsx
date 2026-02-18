import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, History, Loader2, Search, Sparkles } from 'lucide-react';
import { COMPANIES, COMPANY_NAMES } from '../data/companies';
import { useAuth } from '../context/AuthContext';
import MobileBottomNav from '../components/MobileBottomNav';
import DataTable from '../components/DataTable';
import ChartContainer from '../components/ChartContainer';
import ForecastChartContainer from '../components/ForecastChartContainer';
import InsiderTradingChats from '../components/InsiderTradingChats';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { fetchData } from '../utils/fetchData';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { authFetch } from '../utils/authFetch';

const TIME_PERIODS: Record<string, string> = {
  '1M': '1m',
  '3M': '3m',
  '6M': '6m',
  '1Y': '1y',
};

const WATCHLIST_STORAGE_KEY = 'snooptrade.watchlist';
const RECENT_STORAGE_KEY = 'snooptrade.recent_tickers';
const LOGIN_WELCOME_ANIMATION_KEY = 'snooptrade.login_welcome_animation';
const MAX_WATCHLIST = 12;
const MAX_RECENT = 8;

const COLORS = {
  price: 'hsl(var(--primary-strong))',
  volume: 'hsl(var(--accent))',
  forecast: '#ef4444',
  trend: '#f97316',
  seasonal: '#3b82f6',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, setToken, user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(TIME_PERIODS['1Y']);
  const [stockData, setStockData] = useState<any[]>([]);
  const [tradeData, setTradeData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

  useEffect(() => {
    if (location.state?.company && COMPANIES.includes(location.state.company)) {
      setSelectedCompany(location.state.company);
    }
  }, [location.state]);

  useEffect(() => {
    const parseTickerList = (raw: string | null): string[] => {
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((value) => String(value).toUpperCase())
          .filter((ticker) => COMPANIES.includes(ticker));
      } catch {
        return [];
      }
    };

    setWatchlist(parseTickerList(localStorage.getItem(WATCHLIST_STORAGE_KEY)).slice(0, MAX_WATCHLIST));
    setRecentTickers(parseTickerList(localStorage.getItem(RECENT_STORAGE_KEY)).slice(0, MAX_RECENT));
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(LOGIN_WELCOME_ANIMATION_KEY) !== '1') return;
    sessionStorage.removeItem(LOGIN_WELCOME_ANIMATION_KEY);
    setShowWelcomeAnimation(true);
    const timer = window.setTimeout(() => setShowWelcomeAnimation(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentTickers));
  }, [recentTickers]);

  const getCacheKey = (ticker: string, period: string) => `stock_cache_${ticker}_${period}`;

  const getPersistentCache = (key: string) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const { data } = JSON.parse(item);
      return data;
    } catch {
      return null;
    }
  };

  const setPersistentCache = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch (error) {
      console.warn('Failed to save to cache', error);
    }
  };

  const filteredCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return COMPANIES;
    return COMPANIES.filter((ticker) => {
      const name = (COMPANY_NAMES[ticker] ?? '').toLowerCase();
      return ticker.toLowerCase().includes(term) || name.includes(term);
    });
  }, [searchTerm]);

  useEffect(() => {
    setShowCompanyList(searchTerm.length > 0);
  }, [searchTerm]);

  const handleCompanySelect = useCallback((company: string) => {
    setSelectedCompany(company);
    setSearchTerm('');
    setShowCompanyList(false);
    setShowForecast(false);
    setForecastError('');
    setPage(0);
    setRecentTickers((previous) => [company, ...previous.filter((ticker) => ticker !== company)].slice(0, MAX_RECENT));
  }, []);

  const toggleWatchlist = useCallback(() => {
    if (!selectedCompany) return;
    setWatchlist((previous) => {
      if (previous.includes(selectedCompany)) {
        return previous.filter((ticker) => ticker !== selectedCompany);
      }
      return [selectedCompany, ...previous].slice(0, MAX_WATCHLIST);
    });
  }, [selectedCompany]);

  const handleTimePeriodChange = useCallback((period: string) => {
    setSelectedTimePeriod(period);
    setShowForecast(false);
    setForecastError('');
  }, []);

  const fetchStockData = useCallback(async () => {
    if (!selectedCompany || !token) return;

    const cacheKey = getCacheKey(selectedCompany, selectedTimePeriod);
    const cached = getPersistentCache(cacheKey);
    if (cached) {
      setStockData(cached);
    } else {
      setIsLoadingStock(true);
    }

    try {
      const url = API_ENDPOINTS.getStocks(selectedCompany, selectedTimePeriod);
      const data = await fetchData(url, token);
      const formattedData = data
        .filter((item: any) => item.date)
        .map((item: any) => {
          const d = new Date(item.date);
          return {
            date: d.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            dateISO: d.toISOString().split('T')[0],
            open: item.open ?? 0,
            close: item.close ?? 0,
            high: item.high ?? 0,
            low: item.low ?? 0,
          };
        })
        .sort((a: any, b: any) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

      setPersistentCache(cacheKey, formattedData);
      setStockData(formattedData);
    } catch (error: any) {
      console.error('Error fetching stock data:', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
      }
    } finally {
      setIsLoadingStock(false);
    }
  }, [navigate, selectedCompany, selectedTimePeriod, setToken, token]);

  const fetchTradeData = useCallback(async () => {
    if (!selectedCompany || !token) return;

    const cacheKey = getCacheKey(`${selectedCompany}_trades`, selectedTimePeriod);
    const cached = getPersistentCache(cacheKey);
    if (cached) {
      setTradeData(cached);
    } else {
      setIsLoadingTrades(true);
    }

    try {
      const url = API_ENDPOINTS.getTransactions(selectedCompany, selectedTimePeriod);
      const data = await fetchData(url, token);

      const formattedTrades = data
        .filter((trade: any) => !isNaN(new Date(trade.transaction_date).getTime()))
        .map((trade: any) => ({
          filing_date: trade.filing_date,
          date: trade.transaction_date,
          formatted_date: new Date(trade.transaction_date).toLocaleDateString('en-US'),
          shares: Number(trade.shares) || 0,
          transaction_code: trade.transaction_code,
          price_per_share: trade.price_per_share,
          ownership_type: trade.ownership_type,
          issuer_name: trade.issuer_name,
          security_title: trade.security_title,
        }))
        .sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPersistentCache(cacheKey, formattedTrades);
      setTradeData(formattedTrades);
    } catch (error: any) {
      console.error('Error fetching insider trade data:', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
      }
    } finally {
      setIsLoadingTrades(false);
    }
  }, [navigate, selectedCompany, selectedTimePeriod, setToken, token]);

  useEffect(() => {
    if (token && selectedCompany) {
      void fetchStockData();
      void fetchTradeData();
    }
  }, [fetchStockData, fetchTradeData, selectedCompany, token]);

  const futureForecast = useCallback(async (formattedData: any[], ticker?: string) => {
    if (!formattedData || formattedData.length === 0) {
      setForecastError('No stock data available to forecast yet.');
      return;
    }

    setIsPredicting(true);
    setForecastError('');
    try {
      const payload = formattedData.map((d: any) => ({
        date: d.dateISO ?? new Date(d.date).toISOString().split('T')[0],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      const response = await authFetch(
        API_ENDPOINTS.fetchFutureData(ticker),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        token ?? undefined,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        const body = await response.json().catch(() => ({}));
        const message = body.detail ?? `Error from forecast API: ${response.statusText}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }

      const result = await response.json();
      setForecastData(result);
      setShowForecast(true);
    } catch (error: any) {
      setForecastError(error?.message ?? 'Failed to load forecast. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  }, [navigate, setToken, token]);

  const latestStock = stockData.length ? stockData[stockData.length - 1] : null;
  const purchases = tradeData.filter((t) => t.transaction_code === 'P').length;
  const sales = tradeData.filter((t) => t.transaction_code === 'S').length;
  const netSignal = purchases > sales ? 'Mildly Bullish' : sales > purchases ? 'Cautious' : 'Neutral';
  const initials = getInitials(user?.name || user?.first_name || user?.email);
  const selectedCompanyName = selectedCompany ? COMPANY_NAMES[selectedCompany] ?? selectedCompany : '';
  const isInWatchlist = selectedCompany ? watchlist.includes(selectedCompany) : false;
  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Trader';

  const statCards = [
    { label: 'Open', value: latestStock ? `$${Number(latestStock.open).toFixed(2)}` : '--' },
    { label: 'Close', value: latestStock ? `$${Number(latestStock.close).toFixed(2)}` : '--' },
    { label: 'High', value: latestStock ? `$${Number(latestStock.high).toFixed(2)}` : '--' },
    { label: 'Low', value: latestStock ? `$${Number(latestStock.low).toFixed(2)}` : '--' },
  ];

  return (
    <div className="signal-surface signal-page text-[#E6ECE8]">
      <Helmet>
        <title>Dashboard - SnoopTrade</title>
      </Helmet>

      {showWelcomeAnimation && (
        <div className="welcome-login-overlay" aria-hidden="true">
          <div className="welcome-login-panel">
            <p className="welcome-login-kicker">Signal active</p>
            <h2 className="welcome-login-title">Welcome back, {displayName}</h2>
            <svg
              className="welcome-login-chart"
              viewBox="0 0 420 160"
              role="presentation"
              focusable="false"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="welcomeLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7BC97A" />
                  <stop offset="100%" stopColor="#C7F6AE" />
                </linearGradient>
              </defs>
              <polyline
                className="welcome-login-area"
                points="24,136 82,112 130,122 192,88 248,102 308,56 364,72 396,24 396,136 24,136"
              />
              <polyline
                className="welcome-login-line"
                points="24,136 82,112 130,122 192,88 248,102 308,56 364,72 396,24"
              />
              <circle className="welcome-login-dot" cx="396" cy="24" r="6" />
            </svg>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#E6ECE8] sm:text-2xl">
            SnoopTrade
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-[#8EA197]">{getGreeting()}</p>
              <p className="text-sm font-semibold text-[#D4E2D6]">{user?.name || user?.first_name || 'Trader'}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#35503D] bg-[#1A2B21] text-sm font-bold text-[#DDEADF]">
              {initials}
            </div>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
            >
              <Link to="/account">Account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="signal-grid-overlay">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <section className="signal-glass relative rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8EA197]">Insider Intelligence</p>
                <h1 className="mt-2 text-3xl font-extrabold text-[#EAF5EC] sm:text-4xl">Dashboard</h1>
              </div>
              <div className="relative w-full max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8EA197]" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value.toUpperCase())}
                  onFocus={() => setShowCompanyList(searchTerm.length > 0)}
                  placeholder="Search ticker or company..."
                  className="signal-input h-12 rounded-2xl border pl-11 text-base"
                />
                {showCompanyList && filteredCompanies.length > 0 && (
                  <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#35503D] bg-[#111A15] p-2 shadow-2xl">
                    {filteredCompanies.slice(0, 40).map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => handleCompanySelect(ticker)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[#1F2F25]"
                      >
                        <span className="font-semibold text-[#E6ECE8]">{ticker}</span>
                        <span className="truncate pl-3 text-sm text-[#9FB1A5]">{COMPANY_NAMES[ticker]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedCompany ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="signal-chip px-3 py-1.5 text-xs font-bold tracking-[0.08em]">
                    {selectedCompany}
                  </Badge>
                  <p className="text-sm text-[#B7C8BC]">{selectedCompanyName}</p>
                  <button
                    type="button"
                    onClick={toggleWatchlist}
                    className={`ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      isInWatchlist
                        ? 'border-[#4D6B53] bg-[#203127] text-[#D4E5D6] hover:bg-[#263A2E]'
                        : 'border-[#35503D] bg-[#18241D] text-[#AEC1B4] hover:bg-[#1E2D23]'
                    }`}
                  >
                    {isInWatchlist ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
                    {isInWatchlist ? 'Saved' : 'Add to Watchlist'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TIME_PERIODS).map(([label, value]) => {
                    const active = selectedTimePeriod === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleTimePeriodChange(value)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? 'border-[#91D88C] bg-[#1F3325] text-[#DFF0DF]'
                            : 'border-[#35503D] bg-[#18241D] text-[#AFC0B3] hover:bg-[#1E2D23]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#A8B8AD]">Search and select a company to load charts, signals, and transactions.</p>
            )}

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#35503D] bg-[#111A15] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-[#A7E89A]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A9BCB0]">Watchlist</p>
                </div>
                {watchlist.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {watchlist.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => handleCompanySelect(ticker)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                          selectedCompany === ticker
                            ? 'border-[#91D88C] bg-[#1F3325] text-[#DFF0DF]'
                            : 'border-[#35503D] bg-[#18241D] text-[#AFC0B3] hover:bg-[#1E2D23]'
                        }`}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8EA197]">No saved tickers yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[#35503D] bg-[#111A15] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-[#A7E89A]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A9BCB0]">Recent</p>
                </div>
                {recentTickers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recentTickers.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => handleCompanySelect(ticker)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                          selectedCompany === ticker
                            ? 'border-[#91D88C] bg-[#1F3325] text-[#DFF0DF]'
                            : 'border-[#35503D] bg-[#18241D] text-[#AFC0B3] hover:bg-[#1E2D23]'
                        }`}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8EA197]">No recent selections.</p>
                )}
              </div>
            </div>
          </section>

          {!selectedCompany && (
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {['AAPL', 'MSFT', 'NVDA'].map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => handleCompanySelect(ticker)}
                  className="signal-glass rounded-2xl p-5 text-left transition hover:-translate-y-0.5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Quick Load</p>
                  <p className="mt-2 text-2xl font-bold text-[#EAF5EC]">{ticker}</p>
                  <p className="mt-1 text-sm text-[#AFBFB3]">{COMPANY_NAMES[ticker]}</p>
                </button>
              ))}
            </section>
          )}

          {selectedCompany && (
            <section className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                  <article key={card.label} className="signal-glass rounded-2xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">{card.label}</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-[#D6E8D7]">{card.value}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <div className="signal-glass rounded-3xl p-4 sm:p-5">
                    {isLoadingStock && stockData.length === 0 ? (
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-[310px] w-full" />
                      </div>
                    ) : (
                      <ChartContainer
                        title={`Stock Price (${selectedTimePeriod.toUpperCase()})`}
                        data={stockData}
                        dataKey="open"
                        lineColor={COLORS.price}
                        isLogScale={false}
                      />
                    )}
                  </div>
                </div>
                <aside className="xl:col-span-4">
                  <div className="signal-glass rounded-3xl p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#A7E89A]" />
                      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#CFE7CE]">Signal Summary</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      <Badge variant="purchase" className="px-3 py-1.5 text-sm">Purchases: {purchases}</Badge>
                      <Badge variant="sale" className="px-3 py-1.5 text-sm">Sales: {sales}</Badge>
                    </div>
                    <p className="mt-4 text-xl font-bold text-[#A7E89A]">Net signal: {netSignal}</p>

                    <Button
                      onClick={() => futureForecast(stockData, selectedCompany)}
                      disabled={isPredicting}
                      className="signal-cta mt-5 h-11 w-full rounded-xl text-sm font-bold"
                    >
                      {isPredicting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Predicting...
                        </span>
                      ) : (
                        'Predict Future Trends'
                      )}
                    </Button>

                    {forecastError && (
                      <p className="mt-3 rounded-lg border border-[#603333] bg-[#2B1717] p-3 text-sm font-medium text-[#F7D1D1]">
                        {forecastError}
                      </p>
                    )}
                  </div>
                </aside>
              </div>

              {showForecast && (
                <div className="signal-glass rounded-3xl p-4 sm:p-5">
                  <ForecastChartContainer
                    title="Predicted Stock Price Trends"
                    data={forecastData}
                    dataKey="open"
                    lineColor={COLORS.forecast}
                    isLogScale={false}
                    additionalLines={[
                      { dataKey: 'trend', lineColor: COLORS.trend, title: 'Trend' },
                      { dataKey: 'seasonal', lineColor: COLORS.seasonal, title: 'Seasonal' },
                    ]}
                    areaDataKeyLower="yhat_lower"
                    areaDataKeyUpper="yhat_upper"
                  />
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="signal-glass rounded-3xl p-4 sm:p-5">
                  <ChartContainer
                    title="Volume of Shares Traded"
                    data={tradeData}
                    dataKey="shares"
                    lineColor={COLORS.volume}
                    isLogScale={false}
                  />
                </div>
                <div className="signal-glass rounded-3xl p-4 sm:p-5">
                  <InsiderTradingChats tradeData={tradeData} />
                </div>
              </div>

              <div className="signal-glass rounded-3xl p-4 sm:p-5" id="transactions">
                {isLoadingTrades && tradeData.length === 0 ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-64" />
                    <Skeleton className="h-[340px] w-full" />
                  </div>
                ) : (
                  <DataTable
                    tradeData={tradeData}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    handleChangePage={(_, newPage) => setPage(newPage)}
                    handleChangeRowsPerPage={(event) => {
                      setRowsPerPage(parseInt(event.target.value, 10));
                      setPage(0);
                    }}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Dashboard;
