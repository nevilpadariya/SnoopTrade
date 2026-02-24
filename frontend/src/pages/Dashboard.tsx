import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookmarkCheck, BookmarkPlus, ExternalLink, History, Loader2, LogOut, Moon, Search, ShieldAlert, Sparkles, Sun, Target, User as UserIcon } from 'lucide-react';
import { COMPANIES, COMPANY_NAMES } from '../data/companies';
import { useAuth } from '../context/AuthContext';
import MobileBottomNav from '../components/MobileBottomNav';
import DataTable from '../components/DataTable';
import ChartContainer from '../components/ChartContainer';
import ForecastChartContainer from '../components/ForecastChartContainer';
import InsiderTradingChats from '../components/InsiderTradingChats';
import AlertsPanel from '../components/AlertsPanel';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { fetchData } from '../utils/fetchData';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { authFetch } from '../utils/authFetch';
import { getThemePreference, toggleThemePreference, type ThemeMode } from '../utils/theme';

const TIME_PERIODS: Record<string, string> = {
  '1M': '1m',
  '3M': '3m',
  '6M': '6m',
  '1Y': '1y',
};
const LOOKBACK_DAYS_BY_PERIOD: Record<string, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

const WATCHLIST_STORAGE_KEY = 'snooptrade.watchlist';
const RECENT_STORAGE_KEY = 'snooptrade.recent_tickers';
const WATCHLIST_GROUPS_STORAGE_KEY = 'snooptrade.watchlist_groups';
const LOGIN_WELCOME_ANIMATION_KEY = 'snooptrade.login_welcome_animation';
const MAX_WATCHLIST = 12;
const MAX_RECENT = 8;
const MAX_WATCHLIST_GROUPS = 8;
const MAX_GROUP_NAME_LENGTH = 24;
const STARTER_WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META'];
const ALL_WATCHLIST_SCOPE = '::all_watchlist::';

const COLORS = {
  price: 'hsl(var(--primary-strong))',
  volume: 'hsl(var(--accent))',
  forecast: '#ef4444',
  trend: '#f97316',
  seasonal: '#3b82f6',
};

type ConvictionScore = {
  ticker: string;
  lookback_days: number;
  score: number;
  label: string;
  purchases: number;
  sales: number;
  unique_buyers: number;
  buy_sell_imbalance: number;
  latest_buy_days_ago: number | null;
  explanation: string[];
  updated_at: string;
};

type WatchlistRadarItem = {
  ticker: string;
  score: number;
  label: string;
  purchases: number;
  sales: number;
  unique_buyers: number;
  latest_buy_days_ago: number | null;
  explanation: string[];
};

type WatchlistRadarResponse = {
  lookback_days: number;
  evaluated: number;
  items: WatchlistRadarItem[];
  sector_rollups: SectorRollupItem[];
  updated_at: string;
};

type SectorRollupItem = {
  sector: string;
  ticker_count: number;
  average_score: number;
  top_ticker: string;
  top_score: number;
  high_conviction_count: number;
  risk_off_count: number;
};

type WatchlistGroups = Record<string, string[]>;

type WatchlistPreferencesResponse = {
  watchlist?: string[];
  recent_tickers?: string[];
  watchlist_groups?: WatchlistGroups;
  updated_at?: string;
};

type WatchlistNewsItem = {
  title: string;
  link: string;
  source: string;
  source_url?: string | null;
  published_at?: string | null;
  ticker_mentions?: string[];
};

type DailyBriefItem = {
  ticker: string;
  score: number;
  label: string;
  latest_buy_days_ago: number | null;
  action: string;
  reason: string;
};

type DailyBriefResponse = {
  lookback_days: number;
  market_mood: string;
  highest_conviction_ticker: string | null;
  average_score: number;
  items: DailyBriefItem[];
  generated_at: string;
};

type AlertSummaryItem = {
  id: string;
  ticker: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
};

type AlertSummary = {
  unread_count: number;
  high_severity_unread: number;
  latest_event_at: string | null;
  items: AlertSummaryItem[];
};

type TodaySignalItem = {
  signal_id: string;
  ticker: string;
  base_score: number;
  score: number;
  label: string;
  urgency: 'high' | 'medium' | 'low';
  personalization_delta: number;
  personalization_samples: number;
  action: string;
  reason: string;
  change_24h: number;
  confidence: number;
  one_line_explanation: string;
  updated_at: string;
};

type TodaySignalsResponse = {
  lookback_days: number;
  watchlist_only: boolean;
  watchlist_group?: string | null;
  evaluated: number;
  generated_at: string;
  items: TodaySignalItem[];
};

type SignalDelta = {
  ticker: string;
  lookback_days: number;
  score_prev: number;
  score_now: number;
  buyers_prev: number;
  buyers_now: number;
  net_flow_prev: number;
  net_flow_now: number;
  summary: string;
  generated_at: string;
};

type SignalExplain = {
  ticker: string;
  lookback_days: number;
  score: number;
  label: string;
  action: string;
  reason: string;
  confidence: number;
  change_24h: number;
  one_line_explanation: string;
  key_factors: string[];
  updated_at: string;
};

type SignalBacktestPoint = {
  signal_date: string;
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | null;
  exit_price: number | null;
  return_pct: number | null;
  shares: number;
};

type SignalBacktest = {
  ticker: string;
  lookback_days: number;
  horizon_days: number;
  signal_count: number;
  sample_size: number;
  win_rate: number | null;
  average_return_pct: number | null;
  median_return_pct: number | null;
  best_return_pct: number | null;
  worst_return_pct: number | null;
  note: string;
  generated_at: string;
  points: SignalBacktestPoint[];
};

type OutcomeType = 'followed' | 'ignored' | 'entered' | 'exited';

type PriceContext = {
  sessions: number;
  changePct: number | null;
  periodHigh: number | null;
  periodLow: number | null;
  averageRangePct: number | null;
  startDate: string;
  endDate: string;
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

function getScoreBarClass(score: number): string {
  if (score >= 70) return 'bg-emerald-400';
  if (score >= 55) return 'bg-lime-400';
  if (score >= 45) return 'bg-amber-300';
  if (score >= 30) return 'bg-orange-300';
  return 'bg-rose-400';
}

function getUrgencyPillClass(urgency: 'high' | 'medium' | 'low'): string {
  if (urgency === 'high') {
    return 'border-[#c97a7a] bg-[#fde8e8] text-[#7a2828] dark:border-[#824343] dark:bg-[#3A1D1D] dark:text-[#FFD2D2]';
  }
  if (urgency === 'medium') {
    return 'border-[#b89b4a] bg-[#fdf4e3] text-[#6b5a2e] dark:border-[#6A5A2D] dark:bg-[#2E2512] dark:text-[#FFE8AE]';
  }
  return 'border-[#84b88f] bg-[#e8f4ea] text-[#2d4a34] dark:border-[#34513E] dark:bg-[#17271E] dark:text-[#BEE6BE]';
}

function formatSignedDelta(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '--';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatShortDate(value?: string | null): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNewsTime(dateValue?: string | null): string {
  if (!dateValue) return 'Recent';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Recent';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatAlertTime(value?: string | null): string {
  if (!value) return 'Recent';
  return formatNewsTime(value);
}

function normalizeTickerList(values: unknown, maxItems: number): string[] {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((value) => String(value).toUpperCase().trim())
    .filter((ticker, index, arr) => ticker.length > 0 && COMPANIES.includes(ticker) && arr.indexOf(ticker) === index);
  return normalized.slice(0, maxItems);
}

function parseStoredTickerList(raw: string | null, maxItems: number): string[] {
  if (!raw) return [];
  try {
    return normalizeTickerList(JSON.parse(raw), maxItems);
  } catch {
    return [];
  }
}

function parseStoredWatchlistGroups(raw: string | null, allowedTickers: string[]): WatchlistGroups {
  if (!raw) return {};
  try {
    return normalizeWatchlistGroups(JSON.parse(raw), allowedTickers);
  } catch {
    return {};
  }
}

function normalizeGroupName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9 &_-]/g, '')
    .slice(0, MAX_GROUP_NAME_LENGTH);
}

function normalizeWatchlistGroups(value: unknown, allowedTickers: string[]): WatchlistGroups {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowed = new Set(allowedTickers);
  const normalized: WatchlistGroups = {};
  const seen = new Set<string>();

  for (const [rawName, rawTickers] of Object.entries(value as Record<string, unknown>)) {
    const groupName = normalizeGroupName(rawName);
    if (!groupName) continue;
    const lowered = groupName.toLowerCase();
    if (seen.has(lowered)) continue;

    const tickers = normalizeTickerList(rawTickers, MAX_WATCHLIST).filter((ticker) => allowed.has(ticker));
    if (tickers.length === 0) continue;

    normalized[groupName] = tickers;
    seen.add(lowered);
    if (Object.keys(normalized).length >= MAX_WATCHLIST_GROUPS) break;
  }

  return normalized;
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
  const [isLoadingConviction, setIsLoadingConviction] = useState(false);
  const [convictionData, setConvictionData] = useState<ConvictionScore | null>(null);
  const [convictionError, setConvictionError] = useState('');
  const [isLoadingRadar, setIsLoadingRadar] = useState(false);
  const [radarData, setRadarData] = useState<WatchlistRadarResponse | null>(null);
  const [radarError, setRadarError] = useState('');
  const [isLoadingWatchlistNews, setIsLoadingWatchlistNews] = useState(false);
  const [watchlistNews, setWatchlistNews] = useState<WatchlistNewsItem[]>([]);
  const [watchlistNewsError, setWatchlistNewsError] = useState('');
  const [isLoadingDailyBrief, setIsLoadingDailyBrief] = useState(false);
  const [dailyBrief, setDailyBrief] = useState<DailyBriefResponse | null>(null);
  const [dailyBriefError, setDailyBriefError] = useState('');
  const [isLoadingAlertSummary, setIsLoadingAlertSummary] = useState(false);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [alertSummaryError, setAlertSummaryError] = useState('');
  const [isLoadingTodaySignals, setIsLoadingTodaySignals] = useState(false);
  const [todaySignals, setTodaySignals] = useState<TodaySignalsResponse | null>(null);
  const [todaySignalsError, setTodaySignalsError] = useState('');
  const [todayFeedMessage, setTodayFeedMessage] = useState('');
  const [isLoadingSignalDelta, setIsLoadingSignalDelta] = useState(false);
  const [signalDelta, setSignalDelta] = useState<SignalDelta | null>(null);
  const [signalDeltaError, setSignalDeltaError] = useState('');
  const [isLoadingSignalExplain, setIsLoadingSignalExplain] = useState(false);
  const [signalExplain, setSignalExplain] = useState<SignalExplain | null>(null);
  const [signalExplainError, setSignalExplainError] = useState('');
  const [isLoadingBacktest, setIsLoadingBacktest] = useState(false);
  const [backtestData, setBacktestData] = useState<SignalBacktest | null>(null);
  const [backtestError, setBacktestError] = useState('');
  const [outcomeSavingBySignal, setOutcomeSavingBySignal] = useState<Record<string, OutcomeType | null>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  const [watchlistGroups, setWatchlistGroups] = useState<WatchlistGroups>({});
  const [groupDraftName, setGroupDraftName] = useState('');
  const [watchlistGroupMessage, setWatchlistGroupMessage] = useState('');
  const [activeWatchlistGroup, setActiveWatchlistGroup] = useState<string>(ALL_WATCHLIST_SCOPE);
  const [hasHydratedWatchlist, setHasHydratedWatchlist] = useState(false);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    typeof document !== 'undefined' ? getThemePreference() : 'dark'
  );
  const watchlistRef = useRef<string[]>([]);
  const recentTickersRef = useRef<string[]>([]);
  const watchlistGroupsRef = useRef<WatchlistGroups>({});

  useEffect(() => {
    if (location.state?.company && COMPANIES.includes(location.state.company)) {
      setSelectedCompany(location.state.company);
    }
  }, [location.state]);

  useEffect(() => {
    const storedWatchlist = parseStoredTickerList(localStorage.getItem(WATCHLIST_STORAGE_KEY), MAX_WATCHLIST);
    const storedRecent = parseStoredTickerList(localStorage.getItem(RECENT_STORAGE_KEY), MAX_RECENT);
    const storedGroups = parseStoredWatchlistGroups(localStorage.getItem(WATCHLIST_GROUPS_STORAGE_KEY), storedWatchlist);
    watchlistRef.current = storedWatchlist;
    recentTickersRef.current = storedRecent;
    watchlistGroupsRef.current = storedGroups;
    setWatchlist(storedWatchlist);
    setRecentTickers(storedRecent);
    setWatchlistGroups(storedGroups);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(LOGIN_WELCOME_ANIMATION_KEY) !== '1') return;
    sessionStorage.removeItem(LOGIN_WELCOME_ANIMATION_KEY);
    setShowWelcomeAnimation(true);
    const timer = window.setTimeout(() => setShowWelcomeAnimation(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setThemeMode(getThemePreference());
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentTickers));
  }, [recentTickers]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_GROUPS_STORAGE_KEY, JSON.stringify(watchlistGroups));
  }, [watchlistGroups]);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    recentTickersRef.current = recentTickers;
  }, [recentTickers]);

  useEffect(() => {
    watchlistGroupsRef.current = watchlistGroups;
  }, [watchlistGroups]);

  const fetchWatchlistPreferences = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await fetchData(API_ENDPOINTS.getUserWatchlist, token)) as WatchlistPreferencesResponse;
      const serverWatchlist = normalizeTickerList(data?.watchlist, MAX_WATCHLIST);
      const serverRecent = normalizeTickerList(data?.recent_tickers, MAX_RECENT);
      const localWatchlist = watchlistRef.current;
      const localRecent = recentTickersRef.current;
      const localGroups = watchlistGroupsRef.current;

      const mergedWatchlist = [
        ...serverWatchlist,
        ...localWatchlist.filter((ticker) => !serverWatchlist.includes(ticker)),
      ].slice(0, MAX_WATCHLIST);
      const mergedRecent = [
        ...serverRecent,
        ...localRecent.filter((ticker) => !serverRecent.includes(ticker)),
      ].slice(0, MAX_RECENT);

      const serverGroups = normalizeWatchlistGroups(data?.watchlist_groups, mergedWatchlist);
      const normalizedLocalGroups = normalizeWatchlistGroups(localGroups, mergedWatchlist);
      const mergedGroups: WatchlistGroups = { ...serverGroups };
      for (const [groupName, tickers] of Object.entries(normalizedLocalGroups)) {
        const existing = mergedGroups[groupName] ?? [];
        mergedGroups[groupName] = [...existing, ...tickers.filter((ticker) => !existing.includes(ticker))].slice(0, MAX_WATCHLIST);
      }

      setWatchlist(mergedWatchlist);
      setRecentTickers(mergedRecent);
      setWatchlistGroups(normalizeWatchlistGroups(mergedGroups, mergedWatchlist));
    } catch (error: any) {
      console.error('Failed to fetch watchlist preferences', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
      }
    } finally {
      setHasHydratedWatchlist(true);
    }
  }, [navigate, setToken, token]);

  const persistWatchlistPreferences = useCallback(async () => {
    if (!token || !hasHydratedWatchlist) return;
    try {
      const response = await authFetch(
        API_ENDPOINTS.updateUserWatchlist,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            watchlist,
            recent_tickers: recentTickers,
            watchlist_groups: watchlistGroups,
          }),
        },
        token ?? undefined,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Watchlist sync failed (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to sync watchlist preferences', error);
    }
  }, [hasHydratedWatchlist, navigate, recentTickers, setToken, token, watchlist, watchlistGroups]);

  useEffect(() => {
    if (!token) {
      setHasHydratedWatchlist(false);
      return;
    }
    void fetchWatchlistPreferences();
  }, [fetchWatchlistPreferences, token]);

  useEffect(() => {
    if (!token || !hasHydratedWatchlist) return;
    const timer = window.setTimeout(() => {
      void persistWatchlistPreferences();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [hasHydratedWatchlist, persistWatchlistPreferences, recentTickers, token, watchlist, watchlistGroups]);

  useEffect(() => {
    setWatchlistGroups((previous) => {
      const normalized = normalizeWatchlistGroups(previous, watchlist);
      const prevString = JSON.stringify(previous);
      const nextString = JSON.stringify(normalized);
      return prevString === nextString ? previous : normalized;
    });
  }, [watchlist]);

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
  const groupedWatchlistEntries = useMemo(
    () =>
      Object.entries(watchlistGroups).sort((left, right) => {
        if (right[1].length !== left[1].length) return right[1].length - left[1].length;
        return left[0].localeCompare(right[0]);
      }),
    [watchlistGroups],
  );
  const watchlistScopeOptions = useMemo(
    () => groupedWatchlistEntries.map(([groupName]) => groupName),
    [groupedWatchlistEntries],
  );
  const scopedWatchlistTickers = useMemo(() => {
    if (activeWatchlistGroup === ALL_WATCHLIST_SCOPE) return watchlist;
    const watchlistSet = new Set(watchlist);
    return normalizeTickerList(watchlistGroups[activeWatchlistGroup] ?? [], MAX_WATCHLIST)
      .filter((ticker) => watchlistSet.has(ticker));
  }, [activeWatchlistGroup, watchlist, watchlistGroups]);
  const radarTickers = useMemo(() => {
    if (scopedWatchlistTickers.length > 0) return scopedWatchlistTickers;
    if (activeWatchlistGroup !== ALL_WATCHLIST_SCOPE) return [];
    return selectedCompany ? [selectedCompany] : [];
  }, [activeWatchlistGroup, scopedWatchlistTickers, selectedCompany]);
  const activeScopeLabel = activeWatchlistGroup === ALL_WATCHLIST_SCOPE ? 'All Watchlist' : activeWatchlistGroup;

  useEffect(() => {
    setShowCompanyList(searchTerm.length > 0);
  }, [searchTerm]);

  useEffect(() => {
    if (activeWatchlistGroup === ALL_WATCHLIST_SCOPE) return;
    if (watchlistScopeOptions.includes(activeWatchlistGroup)) return;
    setActiveWatchlistGroup(ALL_WATCHLIST_SCOPE);
  }, [activeWatchlistGroup, watchlistScopeOptions]);

  const scrollToSection = useCallback((sectionId: string, delayMs = 120) => {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, delayMs);
  }, []);

  const shouldAutoScrollForResponsive = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1279px)').matches;
  }, []);

  const handleCompanySelect = useCallback((company: string) => {
    setSelectedCompany(company);
    setSearchTerm('');
    setShowCompanyList(false);
    setShowForecast(false);
    setForecastError('');
    setConvictionError('');
    setConvictionData(null);
    setPage(0);
    setRecentTickers((previous) => [company, ...previous.filter((ticker) => ticker !== company)].slice(0, MAX_RECENT));
    if (shouldAutoScrollForResponsive()) {
      scrollToSection('stock-chart', 180);
    }
  }, [scrollToSection, shouldAutoScrollForResponsive]);

  const toggleWatchlist = useCallback(() => {
    if (!selectedCompany) return;
    setWatchlist((previous) => {
      if (previous.includes(selectedCompany)) {
        return previous.filter((ticker) => ticker !== selectedCompany);
      }
      return [selectedCompany, ...previous].slice(0, MAX_WATCHLIST);
    });
  }, [selectedCompany]);

  const handleUseStarterWatchlist = useCallback(() => {
    setWatchlist((previous) => {
      if (previous.length > 0) return previous;
      return STARTER_WATCHLIST.slice(0, MAX_WATCHLIST);
    });
    if (!selectedCompany) {
      setSelectedCompany(STARTER_WATCHLIST[0]);
    }
    setTodayFeedMessage('Starter watchlist added. Loading today feed...');
  }, [selectedCompany]);

  const handleCreateGroupFromSelected = useCallback(() => {
    if (!selectedCompany) {
      setWatchlistGroupMessage('Select a ticker first to create a group.');
      return;
    }
    if (!watchlist.includes(selectedCompany)) {
      setWatchlistGroupMessage('Add the ticker to your watchlist before grouping it.');
      return;
    }
    const normalizedName = normalizeGroupName(groupDraftName);
    if (!normalizedName) {
      setWatchlistGroupMessage('Enter a valid group name.');
      return;
    }

    setWatchlistGroups((previous) => {
      const next: WatchlistGroups = { ...previous };
      const existing = next[normalizedName] ?? [];
      next[normalizedName] = [selectedCompany, ...existing.filter((ticker) => ticker !== selectedCompany)].slice(0, MAX_WATCHLIST);
      return normalizeWatchlistGroups(next, watchlist);
    });

    setGroupDraftName('');
    setWatchlistGroupMessage(`Added ${selectedCompany} to "${normalizedName}".`);
  }, [groupDraftName, selectedCompany, watchlist]);

  const handleAddSelectedToGroup = useCallback((groupName: string) => {
    if (!selectedCompany) return;
    if (!watchlist.includes(selectedCompany)) {
      setWatchlistGroupMessage('Add the ticker to your watchlist before grouping it.');
      return;
    }
    setWatchlistGroups((previous) => {
      const next: WatchlistGroups = { ...previous };
      const existing = next[groupName] ?? [];
      next[groupName] = [selectedCompany, ...existing.filter((ticker) => ticker !== selectedCompany)].slice(0, MAX_WATCHLIST);
      return normalizeWatchlistGroups(next, watchlist);
    });
    setWatchlistGroupMessage(`Added ${selectedCompany} to "${groupName}".`);
  }, [selectedCompany, watchlist]);

  const handleRemoveTickerFromGroup = useCallback((groupName: string, ticker: string) => {
    setWatchlistGroups((previous) => {
      if (!previous[groupName]) return previous;
      const next: WatchlistGroups = { ...previous };
      const remaining = (next[groupName] ?? []).filter((item) => item !== ticker);
      if (remaining.length === 0) {
        delete next[groupName];
      } else {
        next[groupName] = remaining;
      }
      return normalizeWatchlistGroups(next, watchlist);
    });
    setWatchlistGroupMessage(`Removed ${ticker} from "${groupName}".`);
  }, [watchlist]);

  const handleDeleteGroup = useCallback((groupName: string) => {
    setWatchlistGroups((previous) => {
      if (!previous[groupName]) return previous;
      const next: WatchlistGroups = { ...previous };
      delete next[groupName];
      return next;
    });
    setWatchlistGroupMessage(`Deleted group "${groupName}".`);
  }, []);

  const handleTimePeriodChange = useCallback((period: string) => {
    setSelectedTimePeriod(period);
    setShowForecast(false);
    setForecastError('');
    setConvictionError('');
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

  const fetchConvictionScore = useCallback(async () => {
    if (!selectedCompany || !token) return;

    const lookbackDays = LOOKBACK_DAYS_BY_PERIOD[selectedTimePeriod] ?? 30;
    setIsLoadingConviction(true);
    setConvictionError('');
    try {
      const url = API_ENDPOINTS.getConvictionScore(selectedCompany, lookbackDays);
      const data = await fetchData(url, token);
      setConvictionData(data);
    } catch (error: any) {
      console.error('Error fetching conviction score:', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
        return;
      }
      setConvictionError('Could not load conviction score right now.');
      setConvictionData(null);
    } finally {
      setIsLoadingConviction(false);
    }
  }, [navigate, selectedCompany, selectedTimePeriod, setToken, token]);

  const fetchWatchlistRadar = useCallback(async () => {
    if (!token) return;
    if (radarTickers.length === 0) {
      setRadarData(null);
      setRadarError('');
      return;
    }

    const lookbackDays = LOOKBACK_DAYS_BY_PERIOD[selectedTimePeriod] ?? 30;
    setIsLoadingRadar(true);
    setRadarError('');
    try {
      const response = await authFetch(
        API_ENDPOINTS.getWatchlistRadar,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickers: radarTickers,
            lookback_days: lookbackDays,
            limit: Math.min(10, Math.max(5, radarTickers.length)),
          }),
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
        const message = body.detail ?? 'Unable to load watchlist radar.';
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }

      const result = await response.json();
      setRadarData(result);
    } catch (error: any) {
      console.error('Error fetching watchlist radar:', error);
      setRadarError('Could not load watchlist radar right now.');
      setRadarData(null);
    } finally {
      setIsLoadingRadar(false);
    }
  }, [navigate, radarTickers, selectedTimePeriod, setToken, token]);

  const fetchWatchlistNews = useCallback(async () => {
    if (!token) return;
    if (radarTickers.length === 0) {
      setWatchlistNews([]);
      setWatchlistNewsError('');
      return;
    }

    setIsLoadingWatchlistNews(true);
    setWatchlistNewsError('');
    try {
      const response = await authFetch(
        API_ENDPOINTS.getWatchlistNews,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickers: radarTickers,
            limit: 8,
          }),
        },
        token ?? undefined,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Watchlist news failed (${response.status})`);
      }

      const result = (await response.json()) as WatchlistNewsItem[];
      setWatchlistNews(result);
    } catch (error) {
      console.error('Error fetching watchlist news:', error);
      setWatchlistNewsError('Could not load watchlist news right now.');
      setWatchlistNews([]);
    } finally {
      setIsLoadingWatchlistNews(false);
    }
  }, [navigate, radarTickers, setToken, token]);

  const fetchAlertSummary = useCallback(async () => {
    if (!token) return;
    setIsLoadingAlertSummary(true);
    setAlertSummaryError('');
    try {
      const response = await authFetch(API_ENDPOINTS.getAlertSummary(6), undefined, token ?? undefined);
      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Alert summary failed (${response.status})`);
      }
      const payload = (await response.json()) as AlertSummary;
      setAlertSummary(payload);
    } catch (error) {
      console.error('Failed to fetch alert summary', error);
      setAlertSummaryError('Unable to load notifications.');
      setAlertSummary(null);
    } finally {
      setIsLoadingAlertSummary(false);
    }
  }, [navigate, setToken, token]);

  const fetchTodaySignals = useCallback(async () => {
    if (!token) return;
    const lookbackDays = LOOKBACK_DAYS_BY_PERIOD[selectedTimePeriod] ?? 30;
    const scopedGroup = activeWatchlistGroup === ALL_WATCHLIST_SCOPE ? undefined : activeWatchlistGroup;
    setIsLoadingTodaySignals(true);
    setTodaySignalsError('');
    try {
      const response = await authFetch(
        API_ENDPOINTS.getTodaySignals(true, 5, lookbackDays, scopedGroup),
        undefined,
        token ?? undefined,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        if (response.status === 404 && scopedGroup) {
          setTodayFeedMessage(`Group "${scopedGroup}" no longer exists. Showing all watchlist tickers.`);
          setTodaySignals(null);
          setActiveWatchlistGroup(ALL_WATCHLIST_SCOPE);
          return;
        }
        throw new Error(`Today feed failed (${response.status})`);
      }

      const payload = (await response.json()) as TodaySignalsResponse;
      setTodaySignals(payload);
    } catch (error) {
      console.error('Failed to fetch today signals', error);
      setTodaySignalsError('Could not load today feed right now.');
      setTodaySignals(null);
    } finally {
      setIsLoadingTodaySignals(false);
    }
  }, [activeWatchlistGroup, navigate, selectedTimePeriod, setToken, token]);

  const fetchSignalDelta = useCallback(async () => {
    if (!selectedCompany || !token) {
      setSignalDelta(null);
      setSignalDeltaError('');
      return;
    }

    const lookbackDays = LOOKBACK_DAYS_BY_PERIOD[selectedTimePeriod] ?? 30;
    setIsLoadingSignalDelta(true);
    setSignalDeltaError('');
    try {
      const data = await fetchData(API_ENDPOINTS.getSignalDelta(selectedCompany, lookbackDays), token);
      setSignalDelta(data as SignalDelta);
    } catch (error: any) {
      console.error('Failed to fetch signal delta', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
        return;
      }
      setSignalDeltaError('Could not load what changed since yesterday.');
      setSignalDelta(null);
    } finally {
      setIsLoadingSignalDelta(false);
    }
  }, [navigate, selectedCompany, selectedTimePeriod, setToken, token]);

  const fetchSignalExplain = useCallback(async () => {
    if (!selectedCompany || !token) {
      setSignalExplain(null);
      setSignalExplainError('');
      return;
    }

    const lookbackDays = LOOKBACK_DAYS_BY_PERIOD[selectedTimePeriod] ?? 30;
    setIsLoadingSignalExplain(true);
    setSignalExplainError('');
    try {
      const data = await fetchData(API_ENDPOINTS.getSignalExplain(selectedCompany, lookbackDays), token);
      setSignalExplain(data as SignalExplain);
    } catch (error: any) {
      console.error('Failed to fetch signal explanation', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
        return;
      }
      setSignalExplainError('Could not load signal explainability.');
      setSignalExplain(null);
    } finally {
      setIsLoadingSignalExplain(false);
    }
  }, [navigate, selectedCompany, selectedTimePeriod, setToken, token]);

  const fetchSignalBacktest = useCallback(async () => {
    if (!selectedCompany || !token) {
      setBacktestData(null);
      setBacktestError('');
      return;
    }

    const lookbackDays = selectedTimePeriod === '1m' ? 180 : selectedTimePeriod === '3m' ? 270 : 365;
    setIsLoadingBacktest(true);
    setBacktestError('');
    try {
      const data = await fetchData(
        API_ENDPOINTS.getSignalBacktest(selectedCompany, lookbackDays, 20, 0, 120),
        token,
      );
      setBacktestData(data as SignalBacktest);
    } catch (error: any) {
      console.error('Failed to fetch signal backtest', error);
      if (error?.status === 401) {
        setToken(null);
        navigate('/login');
        return;
      }
      setBacktestError('Could not load backtest credibility.');
      setBacktestData(null);
    } finally {
      setIsLoadingBacktest(false);
    }
  }, [navigate, selectedCompany, selectedTimePeriod, setToken, token]);

  const trackOutcome = useCallback(async (item: TodaySignalItem, outcomeType: OutcomeType) => {
    if (!token) return;
    setTodayFeedMessage('');
    setOutcomeSavingBySignal((prev) => ({ ...prev, [item.signal_id]: outcomeType }));
    try {
      const response = await authFetch(
        API_ENDPOINTS.postUserOutcome,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: item.ticker,
            signal_id: item.signal_id,
            outcome_type: outcomeType,
            timestamp: new Date().toISOString(),
            notes: `${item.action} | ${item.reason}`,
          }),
        },
        token ?? undefined,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Outcome save failed (${response.status})`);
      }

      setTodayFeedMessage(`Saved outcome: ${item.ticker} marked as ${outcomeType}.`);
    } catch (error) {
      console.error('Failed to save user outcome', error);
      setTodayFeedMessage('Could not save outcome right now.');
    } finally {
      setOutcomeSavingBySignal((prev) => ({ ...prev, [item.signal_id]: null }));
    }
  }, [navigate, setToken, token]);

  const fetchDailyBrief = useCallback(async () => {
    if (!token) return;
    if (radarTickers.length === 0) {
      setDailyBrief(null);
      setDailyBriefError('');
      return;
    }

    const lookbackDays = LOOKBACK_DAYS_BY_PERIOD[selectedTimePeriod] ?? 30;
    setIsLoadingDailyBrief(true);
    setDailyBriefError('');
    try {
      const response = await authFetch(
        API_ENDPOINTS.getDailyBrief,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickers: radarTickers,
            lookback_days: lookbackDays,
            limit: 5,
          }),
        },
        token ?? undefined,
      );

      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Daily brief failed (${response.status})`);
      }

      const result = (await response.json()) as DailyBriefResponse;
      setDailyBrief(result);
    } catch (error) {
      console.error('Error fetching daily brief:', error);
      setDailyBriefError('Could not load daily brief right now.');
      setDailyBrief(null);
    } finally {
      setIsLoadingDailyBrief(false);
    }
  }, [navigate, radarTickers, selectedTimePeriod, setToken, token]);

  useEffect(() => {
    if (token && selectedCompany) {
      void fetchStockData();
      void fetchTradeData();
      void fetchConvictionScore();
      void fetchSignalDelta();
      void fetchSignalExplain();
      void fetchSignalBacktest();
    } else {
      setConvictionData(null);
      setConvictionError('');
      setSignalDelta(null);
      setSignalDeltaError('');
      setSignalExplain(null);
      setSignalExplainError('');
      setBacktestData(null);
      setBacktestError('');
    }
  }, [
    fetchConvictionScore,
    fetchSignalBacktest,
    fetchSignalDelta,
    fetchSignalExplain,
    fetchStockData,
    fetchTradeData,
    selectedCompany,
    token,
  ]);

  useEffect(() => {
    if (!token) {
      setRadarData(null);
      setRadarError('');
      return;
    }
    void fetchWatchlistRadar();
  }, [fetchWatchlistRadar, token]);

  useEffect(() => {
    if (!token) {
      setWatchlistNews([]);
      setWatchlistNewsError('');
      return;
    }
    void fetchWatchlistNews();
  }, [fetchWatchlistNews, token]);

  useEffect(() => {
    if (!token) {
      setDailyBrief(null);
      setDailyBriefError('');
      return;
    }
    void fetchDailyBrief();
  }, [fetchDailyBrief, token]);

  useEffect(() => {
    if (!token) {
      setTodaySignals(null);
      setTodaySignalsError('');
      return;
    }
    void fetchTodaySignals();
  }, [fetchTodaySignals, token, watchlist, watchlistGroups, selectedTimePeriod]);

  useEffect(() => {
    if (!token) {
      setAlertSummary(null);
      setAlertSummaryError('');
      return;
    }
    void fetchAlertSummary();
    const timer = window.setInterval(() => {
      void fetchAlertSummary();
    }, 45000);
    return () => window.clearInterval(timer);
  }, [fetchAlertSummary, token]);

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
      scrollToSection('forecast-chart', 140);
    } catch (error: any) {
      setForecastError(error?.message ?? 'Failed to load forecast. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  }, [navigate, scrollToSection, setToken, token]);

  const latestStock = stockData.length ? stockData[stockData.length - 1] : null;
  const fallbackPurchases = tradeData.filter((t) => t.transaction_code === 'P').length;
  const fallbackSales = tradeData.filter((t) => t.transaction_code === 'S').length;
  const purchases = convictionData?.purchases ?? fallbackPurchases;
  const sales = convictionData?.sales ?? fallbackSales;
  const netSignal = convictionData?.label ?? (fallbackPurchases > fallbackSales ? 'Mildly Bullish' : fallbackSales > fallbackPurchases ? 'Cautious' : 'Neutral');
  const convictionScore = convictionData?.score ?? 0;
  const convictionFillClass = getScoreBarClass(convictionScore);
  const initials = getInitials(user?.name || user?.first_name || user?.email);
  const selectedCompanyName = selectedCompany ? COMPANY_NAMES[selectedCompany] ?? selectedCompany : '';
  const isInWatchlist = selectedCompany ? watchlist.includes(selectedCompany) : false;
  const displayName = user?.first_name || user?.name?.split(' ')[0] || 'Trader';
  const quickActionTickers = useMemo(() => {
    const combined = [...watchlist, ...recentTickers, ...STARTER_WATCHLIST];
    return combined.filter((ticker, index, arr) => arr.indexOf(ticker) === index).slice(0, 6);
  }, [recentTickers, watchlist]);

  const priceContext = useMemo<PriceContext | null>(() => {
    if (!stockData.length) return null;

    const firstRow = stockData[0];
    const lastRow = stockData[stockData.length - 1];
    const startOpen = Number(firstRow?.open);
    const endOpen = Number(lastRow?.open);
    const changePct =
      Number.isFinite(startOpen) && startOpen > 0 && Number.isFinite(endOpen)
        ? ((endOpen - startOpen) / startOpen) * 100
        : null;

    let periodHigh: number | null = null;
    let periodLow: number | null = null;
    let rangePctSum = 0;
    let rangePctCount = 0;

    stockData.forEach((row) => {
      const high = Number(row?.high);
      const low = Number(row?.low);
      const open = Number(row?.open);

      if (Number.isFinite(high)) {
        periodHigh = periodHigh === null ? high : Math.max(periodHigh, high);
      }
      if (Number.isFinite(low)) {
        periodLow = periodLow === null ? low : Math.min(periodLow, low);
      }
      if (Number.isFinite(open) && open > 0 && Number.isFinite(high) && Number.isFinite(low)) {
        rangePctSum += ((high - low) / open) * 100;
        rangePctCount += 1;
      }
    });

    return {
      sessions: stockData.length,
      changePct,
      periodHigh,
      periodLow,
      averageRangePct: rangePctCount > 0 ? rangePctSum / rangePctCount : null,
      startDate: String(firstRow?.date ?? ''),
      endDate: String(lastRow?.date ?? ''),
    };
  }, [stockData]);

  const statCards = [
    { label: 'Open', value: latestStock ? `$${Number(latestStock.open).toFixed(2)}` : '--' },
    { label: 'Close', value: latestStock ? `$${Number(latestStock.close).toFixed(2)}` : '--' },
    { label: 'High', value: latestStock ? `$${Number(latestStock.high).toFixed(2)}` : '--' },
    { label: 'Low', value: latestStock ? `$${Number(latestStock.low).toFixed(2)}` : '--' },
  ];

  const handleAccountOpen = useCallback(() => {
    navigate('/account');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setToken(null);
    navigate('/login', { replace: true });
  }, [navigate, setToken]);

  const handleThemeToggle = useCallback(() => {
    setThemeMode(toggleThemePreference());
  }, []);

  const handleMarkNotificationRead = useCallback(async (eventId: string) => {
    try {
      const response = await authFetch(
        API_ENDPOINTS.markAlertRead(eventId),
        { method: 'PATCH' },
        token ?? undefined,
      );
      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Failed to mark notification read (${response.status})`);
      }
      setAlertSummary((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          unread_count: Math.max(0, previous.unread_count - 1),
          high_severity_unread: Math.max(
            0,
            previous.high_severity_unread -
              (previous.items.find((item) => item.id === eventId)?.severity === 'high' ? 1 : 0),
          ),
          items: previous.items.filter((item) => item.id !== eventId),
        };
      });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      setAlertSummaryError('Could not mark notification as read.');
    }
  }, [navigate, setToken, token]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    try {
      const response = await authFetch(
        API_ENDPOINTS.markAllAlertsRead,
        { method: 'PATCH' },
        token ?? undefined,
      );
      if (!response.ok) {
        if (response.status === 401) {
          setToken(null);
          navigate('/login');
          return;
        }
        throw new Error(`Failed to mark all notifications read (${response.status})`);
      }
      setAlertSummary((previous) =>
        previous
          ? {
              ...previous,
              unread_count: 0,
              high_severity_unread: 0,
              items: [],
            }
          : previous,
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
      setAlertSummaryError('Could not mark all notifications as read.');
    }
  }, [navigate, setToken, token]);

  const handleAlertsChanged = useCallback(() => {
    void fetchAlertSummary();
  }, [fetchAlertSummary]);

  const handleOpenAlertsCenter = useCallback(() => {
    document.getElementById('alerts-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const trackWatchlistNewsClick = useCallback((item: WatchlistNewsItem) => {
    const payload = {
      title: item.title,
      link: item.link,
      source: item.source,
      source_url: item.source_url ?? null,
      published_at: item.published_at ?? null,
      click_target: 'story',
      total_items: watchlistNews.length,
      page: 'dashboard',
      session_id: 'dashboard-session',
      referrer: typeof window !== 'undefined' ? window.location.href : '',
    };
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const accepted = navigator.sendBeacon(
        API_ENDPOINTS.trackInsiderNewsClick,
        new Blob([body], { type: 'application/json' }),
      );
      if (accepted) return;
    }
    void fetch(API_ENDPOINTS.trackInsiderNewsClick, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch((error) => {
      console.warn('Failed to track watchlist news click', error);
    });
  }, [watchlistNews.length]);

  return (
    <div className="signal-surface signal-page text-[#1E3127] dark:text-[#E6ECE8]">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  {(alertSummary?.unread_count ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {Math.min(alertSummary?.unread_count ?? 0, 99)}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-xl border-border bg-card p-2 text-foreground shadow-2xl">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F675B] dark:text-[#8EA197]">Notifications</p>
                    <p className="text-xs text-[#4E6659] dark:text-[#A9BCB0]">
                      {(alertSummary?.unread_count ?? 0)} unread
                      {(alertSummary?.high_severity_unread ?? 0) > 0 ? ` • ${alertSummary?.high_severity_unread} high` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    disabled={(alertSummary?.unread_count ?? 0) === 0}
                    className="rounded-lg border border-[#35503D] bg-[#18241D] px-2 py-1 text-xs font-semibold text-[#BEE6BE] transition hover:bg-[#1E2D23] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark all
                  </button>
                </div>
                {isLoadingAlertSummary ? (
                  <div className="space-y-2 p-1">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : alertSummaryError ? (
                  <p className="rounded-lg border border-[#603333] bg-[#2B1717] px-2 py-1.5 text-xs text-[#F7D1D1]">{alertSummaryError}</p>
                ) : alertSummary?.items?.length ? (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {alertSummary.items.map((item) => (
                      <article key={item.id} className="rounded-lg border border-[#35503D] bg-[#111A15] p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#EAF5EC]">{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-[#4E6659] dark:text-[#A9BCB0]">{item.message}</p>
                            <p className="mt-1 text-[11px] text-[#4F675B] dark:text-[#8EA197]">
                              {item.ticker} • {formatAlertTime(item.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMarkNotificationRead(item.id)}
                            className="rounded-md border border-[#35503D] bg-[#18241D] px-2 py-1 text-[10px] font-semibold text-[#BEE6BE] transition hover:bg-[#1E2D23]"
                          >
                            Read
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="px-1 py-2 text-xs text-[#4F675B] dark:text-[#8EA197]">No unread alerts.</p>
                )}
                <button
                  type="button"
                  onClick={handleOpenAlertsCenter}
                  className="mt-2 w-full rounded-lg border border-[#35503D] bg-[#18241D] px-2 py-2 text-xs font-semibold text-[#DFF0DF] transition hover:bg-[#1E2D23]"
                >
                  Open Alerts Center
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="hidden text-right sm:block">
              <p className="text-xs text-[#4F675B] dark:text-[#8EA197]">{getGreeting()}</p>
              <p className="text-sm font-semibold text-[#D4E2D6]">{user?.name || user?.first_name || 'Trader'}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-bold text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="Open user menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl border-border bg-card p-1 text-foreground shadow-2xl"
              >
                <DropdownMenuItem
                  onSelect={handleAccountOpen}
                  className="cursor-pointer rounded-lg px-3 py-2 focus:bg-muted focus:text-foreground"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleThemeToggle}
                  className="cursor-pointer rounded-lg px-3 py-2 focus:bg-muted focus:text-foreground"
                >
                  {themeMode === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="cursor-pointer rounded-lg px-3 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="signal-grid-overlay min-h-[calc(100dvh-4rem)]">
        <div className="mx-auto flex max-w-7xl flex-col px-4 pb-28 pt-6 sm:px-6 md:pb-32 lg:px-8 lg:pb-24 lg:pt-8">
          <section className="signal-glass relative order-1 rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4F675B] dark:text-[#8EA197]">Insider Intelligence</p>
                <h1 className="mt-2 text-3xl font-extrabold text-[#1F3327] dark:text-[#EAF5EC] sm:text-4xl">What should I look at now?</h1>
                <p className="mt-2 text-xs text-[#4F675B] dark:text-[#8EA197]">Educational decision support only. Not financial advice.</p>
              </div>
              <div className="relative w-full max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4F675B] dark:text-[#8EA197]" />
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
                  <p className="text-sm text-[#4E6658] dark:text-[#B7C8BC]">{selectedCompanyName}</p>
                  <button
                    type="button"
                    onClick={toggleWatchlist}
                    className={`ml-auto inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold leading-none transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                      isInWatchlist
                        ? 'border-[#84B88F] bg-[#E3F3E7] text-[#1E4A31] hover:bg-[#D6EBDD] dark:border-[#4D6B53] dark:bg-[#203127] dark:text-[#D4E5D6] dark:hover:bg-[#263A2E]'
                        : 'border-[#9CB9A3] bg-[#EFF6F1] text-[#2C5440] hover:bg-[#E4EFE8] dark:border-[#35503D] dark:bg-[#18241D] dark:text-[#AEC1B4] dark:hover:bg-[#1E2D23]'
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
                            ? 'border-[#7DCB80] bg-[#B8F0AE] text-[#143022] dark:border-[#91D88C] dark:bg-[#1F3325] dark:text-[#DFF0DF]'
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
              <p className="mt-4 text-sm text-[#52685C] dark:text-[#A8B8AD]">Search and select a company to load charts, signals, and transactions.</p>
            )}

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#35503D] bg-[#111A15] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-[#A7E89A]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">Watchlist</p>
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
                            ? 'border-[#7DCB80] bg-[#B8F0AE] text-[#143022] dark:border-[#91D88C] dark:bg-[#1F3325] dark:text-[#DFF0DF]'
                            : 'border-[#35503D] bg-[#18241D] text-[#AFC0B3] hover:bg-[#1E2D23]'
                        }`}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[#4F675B] dark:text-[#8EA197]">No saved tickers yet.</p>
                    <button
                      type="button"
                      onClick={handleUseStarterWatchlist}
                      className="rounded-lg border border-[#35503D] bg-[#18241D] px-2.5 py-1.5 text-xs font-semibold text-[#BEE6BE] transition hover:bg-[#1E2D23]"
                    >
                      Add starter watchlist
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#35503D] bg-[#111A15] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-[#A7E89A]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">Recent</p>
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
                            ? 'border-[#7DCB80] bg-[#B8F0AE] text-[#143022] dark:border-[#91D88C] dark:bg-[#1F3325] dark:text-[#DFF0DF]'
                            : 'border-[#35503D] bg-[#18241D] text-[#AFC0B3] hover:bg-[#1E2D23]'
                        }`}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#4F675B] dark:text-[#8EA197]">No recent selections.</p>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[#35503D] bg-[#111A15] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">Watchlist Groups</p>
                <p className="text-[11px] text-[#7F978A]">
                  {groupedWatchlistEntries.length}/{MAX_WATCHLIST_GROUPS} groups
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={groupDraftName}
                  onChange={(event) => setGroupDraftName(event.target.value)}
                  placeholder="Create group (e.g., High Conviction)"
                  className="h-9 rounded-lg border-[#35503D] bg-[#18241D] text-sm text-[#E6ECE8] placeholder:text-[#7F978A]"
                />
                <button
                  type="button"
                  onClick={handleCreateGroupFromSelected}
                  disabled={!selectedCompany || !watchlist.includes(selectedCompany)}
                  className="whitespace-nowrap rounded-lg border border-[#9FB9A6] bg-[#EFF6F1] px-3 py-2 text-xs font-semibold text-[#2A553C] transition hover:bg-[#E5F1E9] disabled:cursor-not-allowed disabled:border-[#C8D8CD] disabled:bg-[#F4F9F6] disabled:text-[#8BA396] dark:border-[#35503D] dark:bg-[#18241D] dark:text-[#BEE6BE] dark:hover:bg-[#1E2D23] dark:disabled:border-[#35503D] dark:disabled:bg-[#18241D] dark:disabled:text-[#6F8A7B]"
                >
                  Add selected ticker
                </button>
              </div>
              {watchlistGroupMessage && (
                <p className="mt-2 text-xs text-[#5D7568] dark:text-[#A8BCB0]">{watchlistGroupMessage}</p>
              )}
              {groupedWatchlistEntries.length > 0 ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {groupedWatchlistEntries.map(([groupName, tickers]) => (
                    <div key={groupName} className="rounded-xl border border-[#334A3A] bg-[#101913] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-[#D2E4D5]">{groupName}</p>
                        <div className="flex items-center gap-1.5">
                          {selectedCompany && watchlist.includes(selectedCompany) && !tickers.includes(selectedCompany) && (
                            <button
                              type="button"
                              onClick={() => handleAddSelectedToGroup(groupName)}
                              className="rounded-md border border-[#35503D] bg-[#18241D] px-1.5 py-0.5 text-[10px] font-semibold text-[#C7E8C9] transition hover:bg-[#1E2D23]"
                            >
                              + {selectedCompany}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(groupName)}
                            className="rounded-md border border-[#513434] bg-[#271616] px-1.5 py-0.5 text-[10px] font-semibold text-[#F2C8C8] transition hover:bg-[#2F1A1A]"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tickers.map((ticker) => (
                          <span key={`${groupName}-${ticker}`} className="inline-flex items-center gap-1 rounded-md border border-[#35503D] bg-[#16231C] px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => handleCompanySelect(ticker)}
                              className="text-[10px] font-semibold text-[#D6E8D8]"
                            >
                              {ticker}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveTickerFromGroup(groupName, ticker)}
                              aria-label={`Remove ${ticker} from ${groupName}`}
                              className="text-[10px] font-bold text-[#AFC1B4] transition hover:text-[#E4EFE6]"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#4F675B] dark:text-[#8EA197]">
                  No groups yet. Create one to segment your watchlist by strategy.
                </p>
              )}
            </div>

            {hasHydratedWatchlist && watchlist.length === 0 && (
              <div className="mt-3 rounded-2xl border border-[#35503D] bg-[#111A15] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">2-Minute Onboarding</p>
                <ol className="mt-2 space-y-1 text-xs text-[#587063] dark:text-[#9EB2A5]">
                  <li>1. Add a starter watchlist (5 tickers) to activate Today Feed.</li>
                  <li>2. Create your first alert rule in Alerts Center.</li>
                  <li>3. Run a scan and review prioritized alerts.</li>
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleUseStarterWatchlist}
                    className="rounded-lg border border-[#35503D] bg-[#18241D] px-3 py-1.5 text-xs font-semibold text-[#BEE6BE] transition hover:bg-[#1E2D23]"
                  >
                    Add Starter Watchlist
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAlertsCenter}
                    className="rounded-lg border border-[#35503D] bg-[#18241D] px-3 py-1.5 text-xs font-semibold text-[#33503D] dark:text-[#DCEADA] transition hover:bg-[#1E2D23]"
                  >
                    Open Alerts Center
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="mt-6 order-3" id="alerts-center">
            <AlertsPanel selectedCompany={selectedCompany} watchlist={watchlist} onAlertsChanged={handleAlertsChanged} />
          </section>

          <section className="mt-6 order-4">
            <div className="signal-glass rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#A7E89A]" />
                    <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">Today Feed</p>
                  </div>
                  <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">
                    Actionable watchlist alerts ranked by urgency and conviction. Scope: {activeScopeLabel}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="todayFeedScope" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4F675B] dark:text-[#8EA197]">
                    Scope
                  </label>
                  <select
                    id="todayFeedScope"
                    value={activeWatchlistGroup}
                    onChange={(event) => {
                      setTodayFeedMessage('');
                      setActiveWatchlistGroup(event.target.value);
                    }}
                    className="h-8 rounded-lg border border-[#35503D] bg-[#18241D] px-2 text-xs font-semibold text-[#33503D] dark:text-[#DCEADA]"
                  >
                    <option value={ALL_WATCHLIST_SCOPE}>All Watchlist</option>
                    {watchlistScopeOptions.map((groupName) => (
                      <option key={groupName} value={groupName}>
                        {groupName}
                      </option>
                    ))}
                  </select>
                  {todaySignals && (
                    <p className="text-[11px] text-[#4F675B] dark:text-[#8EA197]">
                      {todaySignals.evaluated} ticker{todaySignals.evaluated === 1 ? '' : 's'} evaluated
                    </p>
                  )}
                </div>
              </div>

              {todayFeedMessage && (
                <p className="mt-3 rounded-xl border border-[#35503D] bg-[#121E17] px-3 py-2 text-xs text-[#BFE3C1]">{todayFeedMessage}</p>
              )}

              {isLoadingTodaySignals ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
              ) : todaySignalsError ? (
                <p className="mt-4 rounded-xl border border-[#603333] bg-[#2B1717] px-3 py-2 text-sm text-[#F7D1D1]">{todaySignalsError}</p>
              ) : todaySignals?.items?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {todaySignals.items.map((item) => (
                    <button
                      key={item.signal_id}
                      type="button"
                      onClick={() => handleCompanySelect(item.ticker)}
                      className="rounded-2xl border border-[#A8C3AE] bg-[#ECF3EE] p-3 text-left transition hover:-translate-y-0.5 hover:bg-[#E5F0E9] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:bg-[#16231C]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-bold text-[#1F3327] dark:text-[#E6ECE8]">{item.ticker}</p>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${getUrgencyPillClass(item.urgency)}`}>
                          {item.urgency}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#2E4A3D] dark:text-[#B7C8BC]">{item.action}</p>
                      <p className="mt-1 text-xs text-[#3F594C] dark:text-[#8EA197]">{item.reason}</p>
                      <p className="mt-1 text-xs text-[#496255] dark:text-[#9FB5A7]">{item.one_line_explanation}</p>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#D3E2D8] dark:bg-[#24352B]">
                        <div
                          className={`h-full rounded-full transition-all ${getScoreBarClass(item.score)}`}
                          style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#4A6558] dark:text-[#A8BCB0]">
                        Score {item.score.toFixed(1)} • {item.label} • Delta {formatSignedDelta(item.change_24h)}
                      </p>
                      {item.personalization_samples > 0 && Math.abs(item.personalization_delta) >= 0.05 && (
                        <p className="mt-1 text-[11px] text-[#466153] dark:text-[#9AB9A1]">
                          Personalized {item.personalization_delta >= 0 ? '+' : ''}
                          {item.personalization_delta.toFixed(2)} • base {item.base_score.toFixed(1)} • {item.personalization_samples} outcome
                          {item.personalization_samples === 1 ? '' : 's'}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-[#3F594C] dark:text-[#8EA197]">Confidence {(item.confidence * 100).toFixed(0)}%</p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {(['followed', 'ignored', 'entered', 'exited'] as OutcomeType[]).map((outcome) => (
                          <button
                            key={`${item.signal_id}-${outcome}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void trackOutcome(item, outcome);
                            }}
                            disabled={Boolean(outcomeSavingBySignal[item.signal_id])}
                            className="rounded-md border border-[#9FB9A6] bg-[#EFF6F1] px-2 py-1 text-[10px] font-semibold uppercase text-[#2A553C] transition hover:bg-[#E5F1E9] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#35503D] dark:bg-[#18241D] dark:text-[#BEE6BE] dark:hover:bg-[#1E2D23]"
                          >
                            {outcomeSavingBySignal[item.signal_id] === outcome ? 'Saving...' : outcome}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-[#415B4D] dark:text-[#7D9487]">Decision support only. Verify before trading.</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#4F675B] dark:text-[#8EA197]">
                  {activeWatchlistGroup === ALL_WATCHLIST_SCOPE
                    ? 'Add watchlist tickers to generate your today feed.'
                    : `No ranked signals for "${activeWatchlistGroup}" in this window.`}
                </p>
              )}
            </div>
          </section>

          <section className="mt-6 order-5">
            <div className="signal-glass rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">Watchlist Radar</p>
                  <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">
                    Ranked by insider conviction for the active {selectedTimePeriod.toUpperCase()} window. Scope: {activeScopeLabel}.
                  </p>
                </div>
                {radarData && (
                  <p className="text-[11px] text-[#4F675B] dark:text-[#8EA197]">
                    {radarData.evaluated} ticker{radarData.evaluated === 1 ? '' : 's'} analyzed
                  </p>
                )}
              </div>

              {isLoadingRadar ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : radarError ? (
                <p className="mt-4 rounded-xl border border-[#603333] bg-[#2B1717] px-3 py-2 text-sm text-[#F7D1D1]">{radarError}</p>
              ) : radarData?.items?.length ? (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {radarData.items.map((item) => (
                      <button
                        key={item.ticker}
                        type="button"
                        onClick={() => handleCompanySelect(item.ticker)}
                        className="rounded-2xl border border-[#A8C3AE] bg-[#EEF5F0] p-3 text-left transition hover:-translate-y-0.5 hover:bg-[#E3EFE7] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:bg-[#16231C]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-bold text-[#1F3327] dark:text-[#E6ECE8]">{item.ticker}</p>
                          <p className="text-xs font-semibold text-[#4F6759] dark:text-[#A9BCB0]">{item.label}</p>
                        </div>
                        <p className="mt-1 text-xs text-[#5A7265] dark:text-[#8EA197]">
                          Buys {item.purchases} | Sales {item.sales} | Buyers {item.unique_buyers}
                        </p>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#D4E5D8] dark:bg-[#24352B]">
                          <div
                            className={`h-full rounded-full transition-all ${getScoreBarClass(item.score)}`}
                            style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-[#4E6658] dark:text-[#A8BCB0]">
                          Score {item.score.toFixed(1)}
                          {item.latest_buy_days_ago !== null ? ` • Latest buy ${item.latest_buy_days_ago}d ago` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                  {radarData.sector_rollups?.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-[#A8C3AE] bg-[#EEF5F0] p-3 dark:border-[#35503D] dark:bg-[#111A15]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F6759] dark:text-[#A9BCB0]">Sector Rollups</p>
                        <p className="text-[11px] text-[#5A7265] dark:text-[#8EA197]">{radarData.sector_rollups.length} sector{radarData.sector_rollups.length === 1 ? '' : 's'}</p>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {radarData.sector_rollups.map((sector) => (
                          <div key={sector.sector} className="rounded-xl border border-[#A8C3AE] bg-[#E7F1EA] p-2.5 dark:border-[#334A3A] dark:bg-[#101913]">
                            <p className="text-sm font-semibold text-[#1F3327] dark:text-[#D6E8D8]">{sector.sector}</p>
                            <p className="mt-1 text-xs text-[#5A7265] dark:text-[#8EA197]">
                              {sector.ticker_count} ticker{sector.ticker_count === 1 ? '' : 's'} • Top {sector.top_ticker}
                            </p>
                            <p className="mt-1 text-xs text-[#4E6658] dark:text-[#A9BCB0]">
                              Avg {sector.average_score.toFixed(1)} • High {sector.high_conviction_count} • Risk-off {sector.risk_off_count}
                            </p>
                            <p className="mt-1 text-[11px] text-[#5D7669] dark:text-[#7F978A]">Top score {sector.top_score.toFixed(1)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-[#4F675B] dark:text-[#8EA197]">Add a watchlist ticker to see ranked opportunities.</p>
              )}
            </div>
          </section>

          <section className="mt-6 order-6">
            <div className="signal-glass rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">Daily Brief</p>
                  <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">
                    Actionable summary built from live insider conviction for {activeScopeLabel}.
                  </p>
                </div>
                {dailyBrief && (
                  <p className="text-[11px] text-[#4F675B] dark:text-[#8EA197]">
                    Mood: {dailyBrief.market_mood} • Avg {dailyBrief.average_score.toFixed(1)}
                  </p>
                )}
              </div>

              {isLoadingDailyBrief ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : dailyBriefError ? (
                <p className="mt-4 rounded-xl border border-[#603333] bg-[#2B1717] px-3 py-2 text-sm text-[#F7D1D1]">{dailyBriefError}</p>
              ) : dailyBrief?.items?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dailyBrief.items.map((item, index) => (
                    <button
                      key={`${item.ticker}-${index}`}
                      type="button"
                      onClick={() => handleCompanySelect(item.ticker)}
                      className="rounded-2xl border border-[#A8C3AE] bg-[#EEF5F0] p-3 text-left transition hover:-translate-y-0.5 hover:bg-[#E3EFE7] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:bg-[#16231C]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-bold text-[#1F3327] dark:text-[#E6ECE8]">{item.ticker}</p>
                        <span className="rounded-md border border-[#A8C3AE] bg-[#E7F1EA] px-2 py-0.5 text-[10px] font-semibold text-[#2E5B40] dark:border-[#33533F] dark:bg-[#17261E] dark:text-[#A9D6AF]">
                          #{index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#3E5A4B] dark:text-[#B7C8BC]">{item.action}</p>
                      <p className="mt-1 text-xs text-[#5A7265] dark:text-[#8EA197]">{item.reason}</p>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#D4E5D8] dark:bg-[#24352B]">
                        <div
                          className={`h-full rounded-full transition-all ${getScoreBarClass(item.score)}`}
                          style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#4E6658] dark:text-[#A8BCB0]">
                        Score {item.score.toFixed(1)} • {item.label}
                        {item.latest_buy_days_ago !== null ? ` • Latest buy ${item.latest_buy_days_ago}d ago` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#4F675B] dark:text-[#8EA197]">Add watchlist tickers to generate a daily brief.</p>
              )}
            </div>
          </section>

          <section className="mt-6 order-7">
            <div className="signal-glass rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">Watchlist News</p>
                  <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">
                    Live insider-related headlines for your tracked tickers in {activeScopeLabel}.
                  </p>
                </div>
                <p className="text-[11px] text-[#4F675B] dark:text-[#8EA197]">{radarTickers.length} ticker{radarTickers.length === 1 ? '' : 's'} monitored</p>
              </div>

              {isLoadingWatchlistNews ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : watchlistNewsError ? (
                <p className="mt-4 rounded-xl border border-[#603333] bg-[#2B1717] px-3 py-2 text-sm text-[#F7D1D1]">{watchlistNewsError}</p>
              ) : watchlistNews.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {watchlistNews.slice(0, 8).map((item, idx) => (
                    <a
                      key={`${item.link}-${idx}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWatchlistNewsClick(item)}
                      className="group rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 transition hover:border-[#90B69A] hover:bg-[#E5F0E8] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:border-[#496B55] dark:hover:bg-[#15221B]"
                    >
                      <p className="line-clamp-2 text-sm font-semibold text-[#1F3327] group-hover:text-[#2E5B40] dark:text-[#E6ECE8] dark:group-hover:text-[#D7F0DA]">
                        {item.title}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[#5A7265] dark:text-[#8EA197]">
                        <span>{item.source}</span>
                        <span>•</span>
                        <span>{formatNewsTime(item.published_at)}</span>
                        <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-75 transition group-hover:opacity-100" />
                      </div>
                      {item.ticker_mentions && item.ticker_mentions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.ticker_mentions.slice(0, 3).map((ticker) => (
                            <span key={ticker} className="rounded-md border border-[#9CB9A3] bg-[#E7F1EA] px-2 py-0.5 text-[10px] font-semibold text-[#2E5B40] dark:border-[#34513E] dark:bg-[#17271E] dark:text-[#A9D6AF]">
                              {ticker}
                            </span>
                          ))}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#4F675B] dark:text-[#8EA197]">No watchlist headlines available right now.</p>
              )}
            </div>
          </section>

          {!selectedCompany && (
            <section className="mt-6 order-8">
              <div className="signal-glass rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">
                      Workspace Actions
                    </p>
                    <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">
                      Use this space to continue quickly from your watchlist without cluttering the dashboard.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#A8C3AE] bg-[#EEF5F0] px-2.5 py-1 text-[11px] font-semibold text-[#2E5B40] dark:border-[#35503D] dark:bg-[#111A15] dark:text-[#A9D6AF]">
                      Watchlist {watchlist.length}
                    </span>
                    <span className="rounded-full border border-[#A8C3AE] bg-[#EEF5F0] px-2.5 py-1 text-[11px] font-semibold text-[#2E5B40] dark:border-[#35503D] dark:bg-[#111A15] dark:text-[#A9D6AF]">
                      Recent {recentTickers.length}
                    </span>
                    <span className="rounded-full border border-[#A8C3AE] bg-[#EEF5F0] px-2.5 py-1 text-[11px] font-semibold text-[#2E5B40] dark:border-[#35503D] dark:bg-[#111A15] dark:text-[#A9D6AF]">
                      Unread alerts {alertSummary?.unread_count ?? 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (watchlist.length === 0) {
                        handleUseStarterWatchlist();
                        return;
                      }
                      if (quickActionTickers.length > 0) {
                        handleCompanySelect(quickActionTickers[0]);
                      }
                    }}
                    className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 text-left transition hover:-translate-y-0.5 hover:bg-[#E3EFE7] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:bg-[#16231C]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F6759] dark:text-[#A9BCB0]">Primary Action</p>
                    <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">
                      {watchlist.length === 0 ? 'Add Starter Watchlist' : `Analyze ${quickActionTickers[0] ?? 'Ticker'}`}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAlertsCenter}
                    className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 text-left transition hover:-translate-y-0.5 hover:bg-[#E3EFE7] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:bg-[#16231C]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F6759] dark:text-[#A9BCB0]">Alerts</p>
                    <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">Open Alerts Center</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstTicker = watchlist[0] ?? recentTickers[0];
                      if (firstTicker) handleCompanySelect(firstTicker);
                    }}
                    className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 text-left transition hover:-translate-y-0.5 hover:bg-[#E3EFE7] dark:border-[#35503D] dark:bg-[#111A15] dark:hover:bg-[#16231C]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F6759] dark:text-[#A9BCB0]">Recent</p>
                    <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">
                      {recentTickers[0] ? `Resume ${recentTickers[0]}` : 'No recent ticker yet'}
                    </p>
                  </button>
                </div>

                {quickActionTickers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickActionTickers.map((ticker) => (
                      <button
                        key={`workspace-action-${ticker}`}
                        type="button"
                        onClick={() => handleCompanySelect(ticker)}
                        className="rounded-full border border-[#A8C3AE] bg-[#EAF4ED] px-3 py-1.5 text-xs font-semibold text-[#2E5B40] transition hover:bg-[#E1EEE6] dark:border-[#35503D] dark:bg-[#142119] dark:text-[#BEE6BE] dark:hover:bg-[#1A2A22]"
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {selectedCompany && (
            <section className="mt-6 order-2 space-y-5 sm:space-y-6" id="forecast">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                  <article key={card.label} className="signal-glass rounded-2xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#516C5E] dark:text-[#8EA197]">{card.label}</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-[#1E3A2D] dark:text-[#D6E8D7]">{card.value}</p>
                  </article>
                ))}
              </div>

              <div className="grid items-start gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8 space-y-6">
                  <div className="signal-glass rounded-3xl p-4 sm:p-5" id="stock-chart">
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

                  <div className="signal-glass rounded-3xl p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">
                        Price Context
                      </p>
                      {priceContext && (
                        <p className="text-[11px] text-[#4F675B] dark:text-[#8EA197]">
                          {priceContext.sessions} sessions • {formatShortDate(priceContext.startDate)} - {formatShortDate(priceContext.endDate)}
                        </p>
                      )}
                    </div>

                    {priceContext ? (
                      <>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 dark:border-[#35503D] dark:bg-[#111A15]">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[#5A7265] dark:text-[#8EA197]">Period Move</p>
                            <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">{formatSignedPercent(priceContext.changePct)}</p>
                          </div>
                          <div className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 dark:border-[#35503D] dark:bg-[#111A15]">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[#5A7265] dark:text-[#8EA197]">Range Low</p>
                            <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">
                              {priceContext.periodLow !== null ? `$${priceContext.periodLow.toFixed(2)}` : '--'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 dark:border-[#35503D] dark:bg-[#111A15]">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[#5A7265] dark:text-[#8EA197]">Range High</p>
                            <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">
                              {priceContext.periodHigh !== null ? `$${priceContext.periodHigh.toFixed(2)}` : '--'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#A8C3AE] bg-[#EEF5F0] px-3 py-2 dark:border-[#35503D] dark:bg-[#111A15]">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[#5A7265] dark:text-[#8EA197]">Avg Daily Range</p>
                            <p className="mt-1 text-sm font-semibold text-[#1F3327] dark:text-[#E6ECE8]">
                              {priceContext.averageRangePct !== null ? `${priceContext.averageRangePct.toFixed(2)}%` : '--'}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-[#5A7265] dark:text-[#8EA197]">
                          Insider flow context: {purchases} purchase{purchases === 1 ? '' : 's'} vs {sales} sale{sales === 1 ? '' : 's'} in the active
                          window. Net signal: {netSignal}.
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-[#4F675B] dark:text-[#8EA197]">Price context will appear after loading ticker history.</p>
                    )}
                  </div>
                </div>
                <aside className="xl:col-span-4">
                  <div className="signal-glass rounded-3xl p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#A7E89A]" />
                      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#33503D] dark:text-[#CFE7CE]">Signal Summary</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      <Badge variant="purchase" className="px-3 py-1.5 text-sm">Purchases: {purchases}</Badge>
                      <Badge variant="sale" className="px-3 py-1.5 text-sm">Sales: {sales}</Badge>
                    </div>
                    <p className="mt-4 text-xl font-bold text-[#2F5D43] dark:text-[#A7E89A]">Net signal: {netSignal}</p>
                    <div className="mt-4 rounded-xl border border-[#A8C3AE] bg-[#ECF3EE] p-3 dark:border-[#35503D] dark:bg-[#111A15]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">Conviction Score</p>
                        {convictionData && (
                          <p className="text-[11px] text-[#4F675B] dark:text-[#8EA197]">{convictionData.lookback_days}d window</p>
                        )}
                      </div>
                      {isLoadingConviction ? (
                        <p className="mt-2 text-sm text-[#587063] dark:text-[#9EB2A5]">Analyzing insider conviction...</p>
                      ) : convictionError ? (
                        <p className="mt-2 text-sm text-[#E9B5B5]">{convictionError}</p>
                      ) : (
                        <>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-2xl font-bold text-[#1F3327] dark:text-[#E6ECE8]">{convictionData ? convictionData.score.toFixed(1) : '--'}</p>
                            {convictionData?.latest_buy_days_ago !== null && convictionData?.latest_buy_days_ago !== undefined && (
                              <p className="text-xs text-[#587063] dark:text-[#9EB2A5]">Latest buy {convictionData.latest_buy_days_ago}d ago</p>
                            )}
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#24352B]">
                            <div className={`h-full rounded-full transition-all ${convictionFillClass}`} style={{ width: `${Math.max(0, Math.min(100, convictionScore))}%` }} />
                          </div>
                          {convictionData?.explanation?.[0] && (
                            <p className="mt-2 text-xs text-[#5D7568] dark:text-[#A8BCB0]">{convictionData.explanation[0]}</p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-[#A8C3AE] bg-[#ECF3EE] p-3 dark:border-[#35503D] dark:bg-[#111A15]">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[#A7E89A]" />
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">What Changed Since Yesterday</p>
                      </div>
                      {isLoadingSignalDelta || isLoadingSignalExplain ? (
                        <p className="mt-2 text-sm text-[#587063] dark:text-[#9EB2A5]">Loading delta intelligence...</p>
                      ) : signalDeltaError || signalExplainError ? (
                        <p className="mt-2 text-sm text-[#E9B5B5]">{signalDeltaError || signalExplainError}</p>
                      ) : signalDelta ? (
                        <>
                          <p className="mt-2 text-sm font-semibold text-[#3E5A4B] dark:text-[#D7E8DA]">{signalDelta.summary}</p>
                          <p className="mt-1 text-xs text-[#587063] dark:text-[#9EB2A5]">
                            Score {signalDelta.score_prev.toFixed(1)} → {signalDelta.score_now.toFixed(1)} • Buyers {signalDelta.buyers_prev} → {signalDelta.buyers_now}
                          </p>
                          {signalExplain && (
                            <>
                              <p className="mt-2 text-xs font-semibold text-[#3F5A4B] dark:text-[#C6D8CB]">{signalExplain.action}</p>
                              <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">{signalExplain.one_line_explanation}</p>
                              {signalExplain.key_factors.length > 0 && (
                                <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">{signalExplain.key_factors[0]}</p>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-[#587063] dark:text-[#9EB2A5]">No delta insight available yet.</p>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-[#A8C3AE] bg-[#ECF3EE] p-3 dark:border-[#35503D] dark:bg-[#111A15]">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6659] dark:text-[#A9BCB0]">Backtest Credibility</p>
                      {isLoadingBacktest ? (
                        <p className="mt-2 text-sm text-[#587063] dark:text-[#9EB2A5]">Running lightweight backtest...</p>
                      ) : backtestError ? (
                        <p className="mt-2 text-sm text-[#E9B5B5]">{backtestError}</p>
                      ) : backtestData ? (
                        <>
                          <p className="mt-2 text-xs text-[#587063] dark:text-[#9EB2A5]">
                            {backtestData.sample_size} evaluated signals over {backtestData.lookback_days}d, horizon {backtestData.horizon_days}d.
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#3E5A4B] dark:text-[#D7E8DA]">
                            Win rate {backtestData.win_rate !== null ? `${backtestData.win_rate.toFixed(1)}%` : 'N/A'}
                            {' • '}
                            Avg return {backtestData.average_return_pct !== null ? `${backtestData.average_return_pct.toFixed(2)}%` : 'N/A'}
                          </p>
                          <p className="mt-1 text-xs text-[#4F675B] dark:text-[#8EA197]">
                            Median {backtestData.median_return_pct !== null ? `${backtestData.median_return_pct.toFixed(2)}%` : 'N/A'}
                            {' • '}
                            Best {backtestData.best_return_pct !== null ? `${backtestData.best_return_pct.toFixed(2)}%` : 'N/A'}
                            {' • '}
                            Worst {backtestData.worst_return_pct !== null ? `${backtestData.worst_return_pct.toFixed(2)}%` : 'N/A'}
                          </p>
                          <p className="mt-1 text-[11px] text-[#4A6255] dark:text-[#7D9487]">{backtestData.note}</p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-[#587063] dark:text-[#9EB2A5]">No backtest data available.</p>
                      )}
                    </div>

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
                <div className="signal-glass rounded-3xl p-4 sm:p-5" id="forecast-chart">
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

      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Dashboard;
