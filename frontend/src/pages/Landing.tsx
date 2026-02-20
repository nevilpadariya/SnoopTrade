import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronLeft, ChevronRight, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import API_ENDPOINTS from '../utils/apiEndpoints';

interface InsiderNewsItem {
  title: string;
  link: string;
  source: string;
  source_url?: string | null;
  published_at?: string | null;
}

interface LandingHeroMetrics {
  ticker: string;
  price_change_percent_30d: number | null;
  sparkline_prices: number[];
  daily_transactions_24h: number;
  average_filing_lag_days: number | null;
  lag_sample_size: number;
  generated_at: string;
}

const NEWS_SESSION_STORAGE_KEY = 'snooptrade.news_session_id';

function getNewsSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = localStorage.getItem(NEWS_SESSION_STORAGE_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `news-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(NEWS_SESSION_STORAGE_KEY, generated);
  return generated;
}

function formatRelativeTime(dateValue?: string | null): string {
  if (!dateValue) return 'Recent';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Recent';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Live data unavailable';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}% 30D move`;
}

function formatLatency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(1)}d`;
}

function formatSampleSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'n/a';
  return value.toLocaleString();
}

function buildSparklinePointString(points: number[], width = 640, height = 220): string {
  if (points.length < 2) return '10,190 630,70';

  const padding = 10;
  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;
  const minPrice = Math.min(...points);
  const maxPrice = Math.max(...points);
  const range = maxPrice - minPrice || 1;

  return points
    .map((price, index) => {
      const x = padding + (index * drawableWidth) / (points.length - 1);
      const y = padding + ((maxPrice - price) / range) * drawableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildTrendlinePointString(points: number[], width = 640, height = 220): string {
  if (points.length < 2) return '10,206 630,102';

  const padding = 10;
  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;
  const minPrice = Math.min(...points);
  const maxPrice = Math.max(...points);
  const range = maxPrice - minPrice || 1;
  const first = points[0];
  const last = points[points.length - 1];
  const firstY = padding + ((maxPrice - first) / range) * drawableHeight;
  const lastY = padding + ((maxPrice - last) / range) * drawableHeight;
  return `${padding},${firstY.toFixed(1)} ${padding + drawableWidth},${lastY.toFixed(1)}`;
}

const Landing = () => {
  const [newsItems, setNewsItems] = useState<InsiderNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [heroMetrics, setHeroMetrics] = useState<LandingHeroMetrics | null>(null);
  const [loadingHeroMetrics, setLoadingHeroMetrics] = useState(true);
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [lastNewsRefreshAt, setLastNewsRefreshAt] = useState<Date | null>(null);
  const [newsSessionId] = useState<string>(() => getNewsSessionId());

  useEffect(() => {
    let cancelled = false;
    const loadNews = async (initial = false) => {
      if (initial) setLoadingNews(true);
      try {
        const response = await fetch(API_ENDPOINTS.getInsiderNews(8));
        if (!response.ok) {
          throw new Error(`News endpoint returned ${response.status}`);
        }
        const payload = (await response.json()) as InsiderNewsItem[];
        if (cancelled) return;
        setNewsItems(payload);
        setNewsError('');
        setLastNewsRefreshAt(new Date());
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load insider news', error);
        setNewsError('Live feed is temporarily unavailable.');
      } finally {
        if (!cancelled) {
          setLoadingNews(false);
        }
      }
    };

    void loadNews(true);
    const refreshTimer = window.setInterval(() => {
      void loadNews(false);
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadHeroMetrics = async (initial = false) => {
      if (initial) setLoadingHeroMetrics(true);
      try {
        const response = await fetch(API_ENDPOINTS.getLandingHeroMetrics('AAPL'));
        if (!response.ok) {
          throw new Error(`Hero metrics endpoint returned ${response.status}`);
        }
        const payload = (await response.json()) as LandingHeroMetrics;
        if (cancelled) return;
        setHeroMetrics(payload);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load landing hero metrics', error);
      } finally {
        if (!cancelled) {
          setLoadingHeroMetrics(false);
        }
      }
    };

    void loadHeroMetrics(true);
    const refreshTimer = window.setInterval(() => {
      void loadHeroMetrics(false);
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (newsItems.length < 2) return;
    const autoplay = window.setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % newsItems.length);
    }, 5200);
    return () => window.clearInterval(autoplay);
  }, [newsItems.length]);

  useEffect(() => {
    if (activeNewsIndex >= newsItems.length) {
      setActiveNewsIndex(0);
    }
  }, [activeNewsIndex, newsItems.length]);

  const hasNews = newsItems.length > 0;
  const activeNews = hasNews ? newsItems[activeNewsIndex] : null;
  const refreshLabel = useMemo(() => formatRelativeTime(lastNewsRefreshAt?.toISOString()), [lastNewsRefreshAt]);
  const heroTicker = heroMetrics?.ticker || 'AAPL';
  const heroHeadline = formatSignedPercent(heroMetrics?.price_change_percent_30d ?? null);
  const sparklinePoints = buildSparklinePointString(heroMetrics?.sparkline_prices ?? []);
  const trendlinePoints = buildTrendlinePointString(heroMetrics?.sparkline_prices ?? []);
  const dailyTransactionsLabel =
    heroMetrics?.daily_transactions_24h !== undefined ? heroMetrics.daily_transactions_24h.toLocaleString() : 'N/A';
  const latencyLabel = formatLatency(heroMetrics?.average_filing_lag_days ?? null);
  const heroUpdatedLabel = formatRelativeTime(heroMetrics?.generated_at ?? null);
  const lagSampleLabel = formatSampleSize(heroMetrics?.lag_sample_size ?? 0);
  const secSourceUrl = `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(`form 4 ${heroTicker}`)}`;
  const marketSourceUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(heroTicker)}/history`;

  const goPrev = () => {
    if (!newsItems.length) return;
    setActiveNewsIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length);
  };

  const goNext = () => {
    if (!newsItems.length) return;
    setActiveNewsIndex((prev) => (prev + 1) % newsItems.length);
  };

  const trackNewsClick = useCallback(
    (item: InsiderNewsItem, clickTarget: 'story' | 'source') => {
      const payload = {
        title: item.title,
        link: item.link,
        source: item.source,
        source_url: item.source_url ?? null,
        published_at: item.published_at ?? null,
        click_target: clickTarget,
        position: activeNewsIndex,
        total_items: newsItems.length,
        page: 'landing',
        session_id: newsSessionId,
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
        console.warn('Failed to track insider-news click', error);
      });
    },
    [activeNewsIndex, newsItems.length, newsSessionId],
  );

  return (
    <>
      <Helmet>
        <title>SnoopTrade - Insider Trading Platform</title>
        <meta
          name="description"
          content="Track insider behavior before market reactions with realtime filings, confidence signals, and clean portfolio-ready workflows."
        />
        <link rel="canonical" href="https://snooptrade.com" />
      </Helmet>

      <div className="signal-surface signal-page text-[#E6ECE8]">
        <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="text-2xl font-bold tracking-tight text-[#E6ECE8]">
              SnoopTrade
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link to="/features" className="text-sm font-semibold text-[#A7B7AC] transition hover:text-[#E6ECE8]">
                Features
              </Link>
              <Link to="/about" className="text-sm font-semibold text-[#A7B7AC] transition hover:text-[#E6ECE8]">
                About
              </Link>
              <Link to="/login" className="text-sm font-semibold text-[#A7B7AC] transition hover:text-[#E6ECE8]">
                Login
              </Link>
            </nav>
            <Button asChild className="signal-cta h-10 rounded-xl px-4 text-sm font-bold">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </header>

        <main className="signal-grid-overlay">
          <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="lg:col-span-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#4F675B] dark:text-[#8EA197]">
                Insider Intelligence Platform
              </p>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                Find Meaningful Insider Moves
                <span className="block text-[#A7E89A]">In Minutes, Not Hours</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#C7D0CA] sm:text-xl">
                Daily watchlist alerts, explainable conviction signals, and fast context from SEC Form 4 activity.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button asChild className="signal-cta h-12 rounded-2xl px-8 text-base font-bold">
                  <Link to="/signup">Start Free</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl border-[#35503D] bg-[#18241D] px-8 text-base font-semibold text-[#D6E2D8] hover:bg-[#1E2C24]"
                >
                  <Link to="/login">View Dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="signal-glass rounded-3xl p-5 sm:p-7 lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4F675B] dark:text-[#8EA197]">{heroTicker} Live Signal</p>
              <p className="mt-3 font-mono text-2xl font-bold text-[#CFF1C7] sm:text-3xl">
                {loadingHeroMetrics ? 'Loading live metrics...' : heroHeadline}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#4F675B] dark:text-[#8EA197]">
                Updated {heroUpdatedLabel}
              </p>
              <div className="mt-4 grid gap-2 rounded-2xl border border-[#35503D] bg-[#111A15] p-3 sm:grid-cols-2">
                <a
                  href={secSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold tracking-[0.12em] text-[#B8C8BC] transition hover:bg-[#18241D]"
                >
                  <ShieldCheck className="h-4 w-4 text-[#A7E89A]" />
                  Data source: SEC Form 4 filings
                  <ExternalLink className="h-3.5 w-3.5 opacity-70 transition group-hover:opacity-100" />
                </a>
                <a
                  href={marketSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold tracking-[0.12em] text-[#B8C8BC] transition hover:bg-[#18241D]"
                >
                  <BarChart3 className="h-4 w-4 text-[#A7E89A]" />
                  Market source: Yahoo daily close
                  <ExternalLink className="h-3.5 w-3.5 opacity-70 transition group-hover:opacity-100" />
                </a>
              </div>
              <div className="mt-6 rounded-2xl bg-[#142119] p-4">
                <div className="relative h-52 overflow-hidden rounded-xl bg-[#111A15]">
                  <svg className="h-full w-full" viewBox="0 0 640 220" fill="none">
                    <polyline
                      points={sparklinePoints}
                      stroke="#A7E89A"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={trendlinePoints}
                      stroke="#3B5A45"
                      strokeWidth="2"
                      strokeDasharray="8 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#34503E] bg-[#122019] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F675B] dark:text-[#8EA197]">24h Transactions</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#D7E8D8]">{dailyTransactionsLabel}</p>
                </div>
                <div className="rounded-xl border border-[#34503E] bg-[#122019] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F675B] dark:text-[#8EA197]">Avg Filing Lag</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#D7E8D8]">{latencyLabel}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4F675B] dark:text-[#8EA197]">Sample {lagSampleLabel}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
            <div className="signal-glass rounded-3xl p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4F675B] dark:text-[#8EA197]">Live Insider Pulse</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-[#EAF5EC] sm:text-3xl">Realtime Insider Trade News</h2>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F675B] dark:text-[#8EA197]">Updated {refreshLabel}</p>
              </div>

              {loadingNews ? (
                <div className="mt-5 h-44 animate-pulse rounded-2xl border border-[#35503D] bg-[#111A15]" />
              ) : newsError && !hasNews ? (
                <div className="mt-5 rounded-2xl border border-[#603333] bg-[#2B1717] p-4 text-sm font-semibold text-[#F6CCCC]">
                  {newsError}
                </div>
              ) : activeNews ? (
                <div className="mt-5 rounded-2xl border border-[#35503D] bg-[#111A15] p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#4F675B] dark:text-[#8EA197]">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#8FE78E]" />
                    <span>{activeNews.source}</span>
                    <span aria-hidden>•</span>
                    <span>{formatRelativeTime(activeNews.published_at)}</span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold leading-tight text-[#EAF5EC] sm:text-2xl">{activeNews.title}</h3>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#35503D] bg-[#18241D] text-[#D6E2D8] transition hover:bg-[#203027]"
                        aria-label="Previous headline"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#35503D] bg-[#18241D] text-[#D6E2D8] transition hover:bg-[#203027]"
                        aria-label="Next headline"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {activeNews.source_url && (
                        <a
                          href={activeNews.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackNewsClick(activeNews, 'source')}
                          className="inline-flex h-10 items-center rounded-xl border border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D6E2D8] transition hover:bg-[#203027]"
                        >
                          Source Site
                        </a>
                      )}
                      <a
                        href={activeNews.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackNewsClick(activeNews, 'story')}
                        className="signal-cta inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold"
                      >
                        Read Full Story
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>

                  {newsItems.length > 1 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {newsItems.map((item, index) => (
                        <button
                          key={`${item.link}-${index}`}
                          type="button"
                          onClick={() => setActiveNewsIndex(index)}
                          className={`h-1.5 rounded-full transition ${
                            index === activeNewsIndex ? 'w-8 bg-[#9BEA95]' : 'w-3 bg-[#35503D] hover:bg-[#4A6853]'
                          }`}
                          aria-label={`Open headline ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[#35503D] bg-[#111A15] p-4 text-sm text-[#B8C8BC]">
                  No headlines found right now. Please check again shortly.
                </div>
              )}
            </div>
          </section>

          <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              {
                title: 'SEC Sync',
                copy: 'Fresh Form 4 ingestion with resilient retries and scheduling.',
              },
              {
                title: 'Signal Quality',
                copy: 'Confidence-weighted trend scoring with explainable context.',
              },
              {
                title: 'Actionable Views',
                copy: 'Data-rich dashboard designed for daily review on any screen.',
              },
            ].map((item) => (
              <article key={item.title} className="signal-glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#E6ECE8]">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#B8C8BC]">{item.copy}</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </>
  );
};

export default Landing;
