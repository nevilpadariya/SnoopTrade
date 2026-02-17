import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import DataTable from '../components/DataTable';
import ChartContainer from '../components/ChartContainer';
import ForecastChartContainer from '../components/ForecastChartContainer';
import SearchBar from '../components/SearchBar';
import CompanyList from '../components/CompanyList';
import CompanyLogo from '../components/CompanyLogo';
import InsiderTradingChats from '../components/InsiderTradingChats';
import { Button } from '../components/ui/button';
import { fetchData } from '../utils/fetchData';
import API_ENDPOINTS from '../utils/apiEndpoints';

const TIME_PERIODS: Record<string, string> = {
  '1M': '1m',
  '3M': '3m',
  '6M': '6m',
  '1Y': '1y',
};

const COMPANIES = [
  'AAPL', 'META', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NFLX',
  'JPM', 'JNJ', 'V', 'UNH', 'HD', 'DIS', 'BAC', 'XOM', 'PG', 'MA', 'PEP', 'WMT',
];

const COMPANY_NAMES: Record<string, string> = {
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

const COLORS = {
  price: 'hsl(var(--primary-strong))',
  volume: 'hsl(var(--accent))',
  forecast: '#ef4444',
  trend: '#f97316',
  seasonal: '#3b82f6',
};

// ─── Client-side data cache ───
const DATA_CACHE_TTL = 120_000;
const stockCache = new Map<string, { data: any[]; ts: number }>();
const tradeCache = new Map<string, { data: any[]; ts: number }>();

function getCached(cache: Map<string, { data: any[]; ts: number }>, key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < DATA_CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

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

interface DashboardProps {}

const Dashboard = (_props: DashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(TIME_PERIODS['1Y']);
  const [stockData, setStockData] = useState<any[]>([]);
  const [tradeData, setTradeData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [isLogScaleShares] = useState(false);
  const [isLogScalePrice] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const navigate = useNavigate();
  const { token, setToken } = useAuth();
  const [userName, setUserName] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // Fetch user name for mobile greeting
  useEffect(() => {
    if (!token) return;
    fetch(API_ENDPOINTS.getUserDetails, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.name) setUserName(data.name);
        else if (data?.first_name) setUserName(data.first_name);
      })
      .catch(() => {});
  }, [token]);

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
  }, []);

  const handleTimePeriodChange = useCallback((period: string) => {
    setSelectedTimePeriod(period);
  }, []);

  const fetchStockData = useCallback(async () => {
    if (!selectedCompany || !token) return;

    const cacheKey = `${selectedCompany}:${selectedTimePeriod}`;
    const cached = getCached(stockCache, cacheKey);
    if (cached) {
      setStockData(cached);
      return;
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

      stockCache.set(cacheKey, { data: formattedData, ts: Date.now() });
      setStockData(formattedData);
    } catch (error: any) {
      console.error('Error fetching stock data:', error);
      if (error.message.includes('401')) {
        setToken(null);
        navigate('/login');
      }
    }
  }, [selectedCompany, selectedTimePeriod, token, setToken, navigate]);

  const futureForecast = useCallback(async (formattedData: any[], ticker?: string) => {
    if (!formattedData || formattedData.length === 0) {
      console.error('No formatted data available for forecasting');
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

      const forecastResponse = await fetch(API_ENDPOINTS.fetchFutureData(ticker), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!forecastResponse.ok) {
        const errBody = await forecastResponse.json().catch(() => ({}));
        const message = errBody.detail ?? `Error from forecast API: ${forecastResponse.statusText}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }

      const forecastResult = await forecastResponse.json();
      setForecastData(forecastResult);
      setShowForecast(true);
    } catch (error: any) {
      console.error('Error during forecasting:', error);
      setForecastError(error?.message ?? 'Failed to load forecast. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  }, [token]);

  const fetchTradeData = useCallback(async () => {
    if (!selectedCompany || !token) return;

    const cacheKey = `${selectedCompany}:${selectedTimePeriod}`;
    const cached = getCached(tradeCache, cacheKey);
    if (cached) {
      setTradeData(cached);
      return;
    }

    try {
      const url = API_ENDPOINTS.getTransactions(selectedCompany, selectedTimePeriod);
      const data = await fetchData(url, token);

      const filteredTrades = data.filter((trade: any) => {
        const transactionDate = new Date(trade.transaction_date);
        return !isNaN(transactionDate.getTime());
      });

      const formattedTrades = filteredTrades
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
        .sort((a: { date: string }, b: { date: string }) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

      tradeCache.set(cacheKey, { data: formattedTrades, ts: Date.now() });
      setTradeData(formattedTrades);
    } catch (error) {
      console.error('Error fetching insider trade data:', error);
    }
  }, [selectedCompany, selectedTimePeriod, token]);

  useEffect(() => {
    if (token && selectedCompany) {
      fetchStockData();
      fetchTradeData();
    }
  }, [fetchStockData, fetchTradeData, token, selectedCompany]);

  // Derived values for mobile summary
  const latestStock = stockData.length ? stockData[stockData.length - 1] : null;
  const purchases = tradeData.filter((t) => t.transaction_code === 'P').length;
  const sales = tradeData.filter((t) => t.transaction_code === 'S').length;
  const netSignal = purchases > sales ? 'mildly bullish' : sales > purchases ? 'cautious' : 'neutral';
  const initials = getInitials(userName);

  /* ═══════════════════════════════════════════════════════════════
     MOBILE DASHBOARD (< 768px) — matches native HomeScreen
     ═══════════════════════════════════════════════════════════════ */
  const mobileDashboard = (
    <div className="md:hidden has-bottom-nav" style={{ backgroundColor: '#0E1410', minHeight: '100vh' }}>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Avatar header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 8 }}>
          <div className="mobile-avatar">
            {initials}
          </div>
          <div>
            <p style={{ color: '#A7B7AC', fontSize: 12 }}>{getGreeting()}</p>
            <p style={{ color: '#EAF5EC', fontSize: 22, fontWeight: 700 }}>
              {userName || 'Trader'}
            </p>
          </div>
        </div>

        {/* Search */}
        <input
          className="mobile-input"
          placeholder="Search ticker or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ textTransform: 'uppercase' }}
        />

        {showCompanyList && filteredCompanies.length > 0 && (
          <div className="mobile-card" style={{ padding: 8, maxHeight: 200, overflowY: 'auto' }}>
            {filteredCompanies.map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleCompanySelect(ticker)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', color: '#EAF5EC', fontSize: 14,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderRadius: 8,
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#253129')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ fontWeight: 700 }}>{ticker}</span>
                <span style={{ color: '#A7B7AC', marginLeft: 8 }}>{COMPANY_NAMES[ticker]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected ticker chip */}
        {selectedCompany && (
          <div className="mobile-chip">
            <div className="dot" />
            <span className="ticker">{selectedCompany}</span>
            <span className="name">{COMPANY_NAMES[selectedCompany] || selectedCompany}</span>
          </div>
        )}

        {/* Time period selector */}
        {selectedCompany && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(TIME_PERIODS).map(([label, value]) => (
              <button
                key={value}
                className={`mobile-filter-chip ${selectedTimePeriod === value ? 'active' : ''}`}
                onClick={() => handleTimePeriodChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {selectedCompany && (
          <>
            {/* Stock Price Chart */}
            <div className="mobile-card mobile-card-shadow">
              <ChartContainer
                title={`Stock Price (${selectedTimePeriod.toUpperCase()})`}
                data={stockData}
                dataKey="open"
                lineColor={COLORS.price}
                isLogScale={isLogScalePrice}
              />
            </div>

            {/* Summary cards: 2×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="mobile-summary-card">
                <div className="label">Open</div>
                <div className="value">{latestStock ? `$${Number(latestStock.open).toFixed(2)}` : '--'}</div>
              </div>
              <div className="mobile-summary-card">
                <div className="label">Close</div>
                <div className="value">{latestStock ? `$${Number(latestStock.close).toFixed(2)}` : '--'}</div>
              </div>
              <div className="mobile-summary-card">
                <div className="label">High</div>
                <div className="value">{latestStock ? `$${Number(latestStock.high).toFixed(2)}` : '--'}</div>
              </div>
              <div className="mobile-summary-card">
                <div className="label">Low</div>
                <div className="value">{latestStock ? `$${Number(latestStock.low).toFixed(2)}` : '--'}</div>
              </div>
            </div>

            {/* Insider Snapshot */}
            <div className="mobile-snapshot">
              <div className="title">Insider Snapshot</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#68D08E' }} />
                  <span style={{ color: '#A7B7AC', fontSize: 15 }}>Purchases: {purchases}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E56A6A' }} />
                  <span style={{ color: '#A7B7AC', fontSize: 15 }}>Sales: {sales}</span>
                </div>
              </div>
              <p style={{ color: '#64C9A8', fontSize: 15, fontWeight: 600, marginTop: 12 }}>
                Net signal: {netSignal}
              </p>
            </div>

            {/* Predict button */}
            <button
              className="mobile-btn-primary"
              onClick={() => futureForecast(stockData, selectedCompany ?? undefined)}
              disabled={isPredicting}
            >
              {isPredicting ? 'Predicting...' : 'Predict Future Trends'}
            </button>

            {forecastError && (
              <p style={{ color: '#E56A6A', fontSize: 12, textAlign: 'center' }}>{forecastError}</p>
            )}

            {/* Forecast chart */}
            {showForecast && (
              <div id="forecast" className="mobile-card mobile-card-shadow">
                <ForecastChartContainer
                  title="Predicted Stock Price Trends"
                  data={forecastData}
                  dataKey="open"
                  lineColor={COLORS.forecast}
                  isLogScale={isLogScalePrice}
                  additionalLines={[
                    { dataKey: 'trend', lineColor: COLORS.trend, title: 'Trend' },
                    { dataKey: 'seasonal', lineColor: COLORS.seasonal, title: 'Seasonal' },
                  ]}
                  areaDataKeyLower="yhat_lower"
                  areaDataKeyUpper="yhat_upper"
                />
              </div>
            )}

            {/* Volume chart */}
            <div className="mobile-card mobile-card-shadow">
              <ChartContainer
                title="Volume of Shares Traded"
                data={tradeData}
                dataKey="shares"
                lineColor={COLORS.volume}
                isLogScale={isLogScaleShares}
              />
            </div>

            {/* Insider trading charts */}
            <div className="mobile-card mobile-card-shadow">
              <InsiderTradingChats tradeData={tradeData} />
            </div>

            {/* Transaction Details */}
            <div id="transactions">
              <h3 style={{ color: '#EAF5EC', fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>
                Transaction Details
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  tradeData={tradeData}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  handleChangePage={(e, newPage) => setPage(newPage)}
                  handleChangeRowsPerPage={(e) =>
                    setRowsPerPage(parseInt(e.target.value, 10))
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP DASHBOARD (≥ 768px) — unchanged
     ═══════════════════════════════════════════════════════════════ */
  const desktopDashboard = (
    <div className="min-h-screen bg-background text-foreground hidden md:block">
      <Helmet>
        <title>Dashboard | SnoopTrade</title>
      </Helmet>

      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-center mb-4 sm:mb-6 font-display text-foreground">
          Insider Trading <span className="text-primary-strong">Dashboard</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-center text-muted-foreground mb-10 sm:mb-12 md:mb-16 max-w-3xl mx-auto px-4">
          Analyze market trends and insider trading activities with real-time data and insights.
        </p>

        <div className="flex flex-col items-center mt-6 sm:mt-8 space-y-4">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
          />
          {showCompanyList && filteredCompanies.length > 0 && (
            <CompanyList
              companies={filteredCompanies}
              companyNames={COMPANY_NAMES}
              onSelectCompany={handleCompanySelect}
            />
          )}
          {showCompanyList && filteredCompanies.length === 0 && (
            <p className="text-muted-foreground mt-4 text-sm sm:text-base">No companies found.</p>
          )}

          {selectedCompany && (
            <div className="flex justify-center mt-6 sm:mt-8 w-full px-2">
              <div
                className="time-range-row inline-flex rounded-xl border border-border bg-muted/30 p-1 shadow-inner"
                role="group"
                aria-label="Stock data range"
              >
                {Object.entries(TIME_PERIODS).map(([label, value]) => {
                  const isActive = selectedTimePeriod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleTimePeriodChange(value)}
                      className={`
                        relative px-4 py-2.5 text-sm font-medium rounded-lg
                        transition-all duration-200 ease-out
                        min-w-[4rem] whitespace-nowrap
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                        ${isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }
                      `}
                      aria-pressed={isActive}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedCompany && (
          <>
            <h2 className="text-2xl sm:text-3xl font-semibold text-center mt-10 sm:mt-12 mb-6 sm:mb-8 font-display text-foreground px-4 flex items-center justify-center gap-3 flex-wrap">
              <CompanyLogo ticker={selectedCompany} size={40} />
              <span>Data for {selectedCompany} ({COMPANY_NAMES[selectedCompany] ?? selectedCompany})</span>
            </h2>

            <div className="mb-8 sm:mb-10">
              <ChartContainer
                title="Stock Price Trends"
                data={stockData}
                dataKey="open"
                lineColor={COLORS.price}
                isLogScale={isLogScalePrice}
              />
            </div>

            <div className="flex justify-center mb-6 sm:mb-8 px-4">
              <Button
                onClick={() => futureForecast(stockData, selectedCompany ?? undefined)}
                disabled={isPredicting}
                className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-auto sm:py-3 text-base sm:text-lg font-semibold"
              >
                {isPredicting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Predicting...</span>
                  </div>
                ) : (
                  'Predict Future Trends'
                )}
              </Button>
            </div>

            {forecastError && (
              <div className="mb-6 px-4 py-3 rounded-md bg-destructive/10 text-destructive-foreground text-sm text-center" role="alert">
                {forecastError}
              </div>
            )}

            {showForecast && (
              <div className="mb-8 sm:mb-10">
                <ForecastChartContainer
                  title="Predicted Stock Price Trends"
                  data={forecastData}
                  dataKey="open"
                  lineColor={COLORS.forecast}
                  isLogScale={isLogScalePrice}
                  additionalLines={[
                    { dataKey: 'trend', lineColor: COLORS.trend, title: 'Trend' },
                    { dataKey: 'seasonal', lineColor: COLORS.seasonal, title: 'Seasonal' },
                  ]}
                  areaDataKeyLower="yhat_lower"
                  areaDataKeyUpper="yhat_upper"
                />
              </div>
            )}

            <div className="mb-8 sm:mb-10">
              <ChartContainer
                title="Volume of Shares Traded"
                data={tradeData}
                dataKey="shares"
                lineColor={COLORS.volume}
                isLogScale={isLogScaleShares}
              />
            </div>

            <div className="mb-8 sm:mb-10">
              <InsiderTradingChats tradeData={tradeData} />
            </div>

            <div className="mt-10 sm:mt-12">
              <h3 className="text-2xl sm:text-3xl font-semibold text-center mb-4 sm:mb-6 font-display text-foreground px-4">
                Transaction Details
              </h3>
              <div className="overflow-x-auto">
                <DataTable
                  tradeData={tradeData}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  handleChangePage={(e, newPage) => setPage(newPage)}
                  handleChangeRowsPerPage={(e) =>
                    setRowsPerPage(parseInt(e.target.value, 10))
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {mobileDashboard}
      {desktopDashboard}
    </>
  );
};

export default Dashboard;
