import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import MobileBottomNav from '../components/MobileBottomNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

type EventBusStatusPayload = {
  backend?: string;
  running?: boolean;
  topics?: string[];
  queue_size?: number;
  dead_letters_failed?: number;
  dead_letters_retry_failed?: number;
  dead_letters_republished?: number;
  bootstrap_servers?: string;
  group_id?: string;
};

type DeadLetterItem = {
  id: string;
  topic: string;
  handler: string;
  backend: string;
  status: string;
  error: string;
  attempts: number;
  retry_count: number;
  created_at: string;
  updated_at: string;
  payload: Record<string, unknown>;
};

type OpsEventItem = {
  id: string;
  dataset: string;
  ticker: string;
  status: string;
  source: string;
  cik?: string | null;
  error?: string | null;
  duration_ms: number;
  started_at: string;
  finished_at: string;
  created_at: string;
};

function formatTs(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function adminFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  return authFetch(
    url,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    },
    token,
  );
}

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  } catch {
    // Ignore JSON parsing errors and fall back to generic message.
  }
  return fallback;
}

const AdminEventBus = () => {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();

  const [statusData, setStatusData] = useState<EventBusStatusPayload | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>([]);
  const [opsEvents, setOpsEvents] = useState<OpsEventItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [deadLetterLimit, setDeadLetterLimit] = useState(50);
  const [deadLetterSearch, setDeadLetterSearch] = useState('');
  const [deadLetterPage, setDeadLetterPage] = useState(1);
  const [deadLetterPageSize, setDeadLetterPageSize] = useState(15);
  const [opsDatasetFilter, setOpsDatasetFilter] = useState('');
  const [opsStatusFilter, setOpsStatusFilter] = useState('');
  const [opsTickerFilter, setOpsTickerFilter] = useState('');
  const [opsLimit, setOpsLimit] = useState(100);
  const [opsSearch, setOpsSearch] = useState('');
  const [opsPage, setOpsPage] = useState(1);
  const [opsPageSize, setOpsPageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchRetrying, setIsBatchRetrying] = useState(false);
  const [isTriggeringRetry, setIsTriggeringRetry] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    navigate('/login', { replace: true });
  }, [navigate, setToken]);

  const loadData = useCallback(async () => {
    if (!token) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const [statusRes, deadRes, opsRes] = await Promise.all([
        adminFetch(API_ENDPOINTS.adminEventBusStatus, token),
        adminFetch(API_ENDPOINTS.adminEventBusDeadLetters(deadLetterLimit, statusFilter || undefined), token),
        adminFetch(
          API_ENDPOINTS.adminEventBusOpsEvents(
            opsLimit,
            opsDatasetFilter || undefined,
            opsTickerFilter || undefined,
            opsStatusFilter || undefined,
          ),
          token,
        ),
      ]);

      if (statusRes.status === 401 || deadRes.status === 401 || opsRes.status === 401) {
        handleUnauthorized();
        return;
      }
      if (statusRes.status === 403 || deadRes.status === 403 || opsRes.status === 403) {
        setError('Admin access required for this page.');
        return;
      }
      if (!statusRes.ok || !deadRes.ok || !opsRes.ok) {
        throw new Error(`Load failed (${statusRes.status}/${deadRes.status}/${opsRes.status})`);
      }

      const statusBody = await statusRes.json();
      const deadBody = await deadRes.json();
      const opsBody = await opsRes.json();

      setStatusData((statusBody?.event_bus ?? null) as EventBusStatusPayload | null);
      setDeadLetters((deadBody?.items ?? []) as DeadLetterItem[]);
      setOpsEvents((opsBody?.items ?? []) as OpsEventItem[]);
      setMessage('Admin event-bus data refreshed.');
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load admin event-bus data.');
    } finally {
      setIsLoading(false);
    }
  }, [deadLetterLimit, handleUnauthorized, opsDatasetFilter, opsLimit, opsStatusFilter, opsTickerFilter, statusFilter, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredDeadLetters = useMemo(() => {
    const term = deadLetterSearch.trim().toLowerCase();
    if (!term) return deadLetters;
    return deadLetters.filter((item) => {
      const payloadText = JSON.stringify(item.payload || {}).toLowerCase();
      return [
        item.topic,
        item.status,
        item.error,
        item.handler,
        payloadText,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [deadLetterSearch, deadLetters]);

  const deadLetterTotalPages = Math.max(1, Math.ceil(filteredDeadLetters.length / deadLetterPageSize));
  const deadLetterCurrentPage = Math.min(deadLetterPage, deadLetterTotalPages);
  const deadLetterStart = (deadLetterCurrentPage - 1) * deadLetterPageSize;
  const pagedDeadLetters = filteredDeadLetters.slice(deadLetterStart, deadLetterStart + deadLetterPageSize);

  const filteredOpsEvents = useMemo(() => {
    const term = opsSearch.trim().toLowerCase();
    if (!term) return opsEvents;
    return opsEvents.filter((item) =>
      [item.dataset, item.ticker, item.status, item.source, item.error || '', item.cik || '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [opsEvents, opsSearch]);

  const opsTotalPages = Math.max(1, Math.ceil(filteredOpsEvents.length / opsPageSize));
  const opsCurrentPage = Math.min(opsPage, opsTotalPages);
  const opsStart = (opsCurrentPage - 1) * opsPageSize;
  const pagedOpsEvents = filteredOpsEvents.slice(opsStart, opsStart + opsPageSize);

  useEffect(() => {
    setDeadLetterPage(1);
  }, [deadLetterSearch, statusFilter, deadLetterPageSize, deadLetterLimit]);

  useEffect(() => {
    setOpsPage(1);
  }, [opsSearch, opsDatasetFilter, opsStatusFilter, opsTickerFilter, opsPageSize, opsLimit]);

  const retryDeadLetter = useCallback(
    async (deadLetterId: string) => {
      if (!token) {
        setError('Not authenticated. Please log in again.');
        return;
      }

      setRetryingId(deadLetterId);
      setError('');
      setMessage('');
      try {
        const response = await adminFetch(API_ENDPOINTS.adminRetryDeadLetter(deadLetterId), token, {
          method: 'POST',
        });
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        if (response.status === 403) {
          setError('Admin access required for this action.');
          return;
        }
        if (!response.ok) {
          throw new Error(await parseError(response, `Retry failed (${response.status})`));
        }
        const body = await response.json();
        setMessage(body?.reason ? `Dead letter retry: ${body.reason}` : 'Dead letter retry requested.');
        await loadData();
      } catch (retryError: any) {
        setError(retryError?.message || 'Failed to retry dead letter.');
      } finally {
        setRetryingId(null);
      }
    },
    [handleUnauthorized, loadData, token],
  );

  const retryDeadLettersBatch = useCallback(async () => {
    if (!token) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    setIsBatchRetrying(true);
    setError('');
    setMessage('');
    try {
      const response = await adminFetch(API_ENDPOINTS.adminRetryFailedDeadLetters(50, true), token, {
        method: 'POST',
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        setError('Admin access required for this action.');
        return;
      }
      if (!response.ok) {
        throw new Error(await parseError(response, `Batch retry failed (${response.status})`));
      }
      const body = await response.json();
      setMessage(
        `Batch retry completed: attempted=${body?.attempted ?? 0}, republished=${body?.republished ?? 0}, retry_failed=${body?.retry_failed ?? 0}.`,
      );
      await loadData();
    } catch (retryError: any) {
      setError(retryError?.message || 'Failed to run batch dead-letter retry.');
    } finally {
      setIsBatchRetrying(false);
    }
  }, [handleUnauthorized, loadData, token]);

  const triggerDlqRetryJob = useCallback(async () => {
    if (!token) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    setIsTriggeringRetry(true);
    setError('');
    setMessage('');
    try {
      const response = await adminFetch(API_ENDPOINTS.adminTriggerEventBusDlqRetry, token, {
        method: 'POST',
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        setError('Admin access required for this action.');
        return;
      }
      if (!response.ok) {
        throw new Error(await parseError(response, `Trigger failed (${response.status})`));
      }
      const body = await response.json();
      setMessage(body?.message || 'DLQ retry trigger sent.');
    } catch (triggerError: any) {
      setError(triggerError?.message || 'Failed to trigger DLQ retry job.');
    } finally {
      setIsTriggeringRetry(false);
    }
  }, [handleUnauthorized, token]);

  return (
    <div className="signal-surface min-h-screen text-[#E6ECE8]">
      <Helmet>
        <title>Admin Event Bus - SnoopTrade</title>
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#E6ECE8] sm:text-2xl">
            SnoopTrade
          </Link>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
          >
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="signal-grid-overlay">
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <section className="signal-glass rounded-3xl p-6">
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-sm text-[#9BAEA1]">Authenticated admin monitoring console</p>
              <Button
                type="button"
                onClick={() => void loadData()}
                disabled={isLoading}
                className="signal-cta h-11 rounded-xl px-4 text-sm font-bold"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void retryDeadLettersBatch()}
                disabled={isBatchRetrying}
                className="h-11 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
              >
                {isBatchRetrying ? 'Retrying...' : 'Retry Failed DLQ'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void triggerDlqRetryJob()}
                disabled={isTriggeringRetry}
                className="h-11 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
              >
                {isTriggeringRetry ? 'Triggering...' : 'Trigger DLQ Job'}
              </Button>
            </div>

            {message && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#35503D] bg-[#18291F] px-4 py-3 text-sm text-[#BEE6BE]">
                <CheckCircle2 className="h-4 w-4" />
                <span>{message}</span>
              </div>
            )}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#603333] bg-[#2B1717] px-4 py-3 text-sm text-[#F5CACA]">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </section>

          <section className="signal-glass rounded-3xl p-6">
            <h2 className="text-xl font-bold text-[#EAF5EC]">Event Bus Status</h2>
            {statusData ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[#35503D] bg-[#111A15] p-3">
                  <p className="text-xs text-[#8EA197]">Backend</p>
                  <p className="mt-1 text-lg font-semibold text-[#DCEADA]">{statusData.backend || 'unknown'}</p>
                </div>
                <div className="rounded-xl border border-[#35503D] bg-[#111A15] p-3">
                  <p className="text-xs text-[#8EA197]">Running</p>
                  <p className="mt-1 text-lg font-semibold text-[#DCEADA]">{statusData.running ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-xl border border-[#35503D] bg-[#111A15] p-3">
                  <p className="text-xs text-[#8EA197]">DLQ Failed</p>
                  <p className="mt-1 text-lg font-semibold text-[#DCEADA]">{statusData.dead_letters_failed ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#35503D] bg-[#111A15] p-3">
                  <p className="text-xs text-[#8EA197]">Republished</p>
                  <p className="mt-1 text-lg font-semibold text-[#DCEADA]">{statusData.dead_letters_republished ?? 0}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#9BAEA1]">Load data to view event bus status.</p>
            )}
          </section>

          <section className="signal-glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#EAF5EC]">Dead Letters</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={deadLetterSearch}
                  onChange={(event) => setDeadLetterSearch(event.target.value)}
                  placeholder="Search dead letters"
                  className="signal-input h-10 w-44 rounded-xl border"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="signal-input h-10 rounded-xl border px-3 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="failed">failed</option>
                  <option value="retry_failed">retry_failed</option>
                  <option value="republished">republished</option>
                </select>
                <select
                  value={deadLetterLimit}
                  onChange={(event) => setDeadLetterLimit(Number(event.target.value) || 50)}
                  className="signal-input h-10 rounded-xl border px-3 text-sm"
                >
                  <option value={25}>Fetch 25</option>
                  <option value={50}>Fetch 50</option>
                  <option value={100}>Fetch 100</option>
                  <option value={200}>Fetch 200</option>
                </select>
                <select
                  value={deadLetterPageSize}
                  onChange={(event) => setDeadLetterPageSize(Number(event.target.value) || 15)}
                  className="signal-input h-10 rounded-xl border px-3 text-sm"
                >
                  <option value={10}>10/page</option>
                  <option value={15}>15/page</option>
                  <option value={25}>25/page</option>
                </select>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2D4035] text-[#8EA197]">
                    <th className="px-2 py-2 font-semibold">Created</th>
                    <th className="px-2 py-2 font-semibold">Topic</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Attempts</th>
                    <th className="px-2 py-2 font-semibold">Retry Count</th>
                    <th className="px-2 py-2 font-semibold">Error</th>
                    <th className="px-2 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDeadLetters.length > 0 ? (
                    pagedDeadLetters.map((item) => (
                      <tr key={item.id} className="border-b border-[#22352B] text-[#D4E2D6]">
                        <td className="px-2 py-2">{formatTs(item.created_at)}</td>
                        <td className="px-2 py-2">{item.topic}</td>
                        <td className="px-2 py-2">{item.status}</td>
                        <td className="px-2 py-2">{item.attempts}</td>
                        <td className="px-2 py-2">{item.retry_count}</td>
                        <td className="max-w-[280px] truncate px-2 py-2 text-[#B6C8BC]" title={item.error}>
                          {item.error || 'n/a'}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void retryDeadLetter(item.id)}
                            disabled={retryingId === item.id}
                            className="h-8 rounded-lg border-[#35503D] bg-[#18241D] px-3 text-xs font-semibold text-[#D4E2D6] hover:bg-[#203027]"
                          >
                            {retryingId === item.id ? (
                              <span className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Retrying
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                Retry
                              </span>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-2 py-3 text-sm text-[#9BAEA1]">
                        No dead letters for current filter/search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[#9BAEA1]">
              <span>
                Showing {pagedDeadLetters.length} of {filteredDeadLetters.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deadLetterCurrentPage <= 1}
                  onClick={() => setDeadLetterPage((page) => Math.max(1, page - 1))}
                  className="h-8 rounded-lg border-[#35503D] bg-[#18241D] px-3 text-xs font-semibold text-[#D4E2D6] hover:bg-[#203027]"
                >
                  Prev
                </Button>
                <span>
                  Page {deadLetterCurrentPage} / {deadLetterTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={deadLetterCurrentPage >= deadLetterTotalPages}
                  onClick={() => setDeadLetterPage((page) => Math.min(deadLetterTotalPages, page + 1))}
                  className="h-8 rounded-lg border-[#35503D] bg-[#18241D] px-3 text-xs font-semibold text-[#D4E2D6] hover:bg-[#203027]"
                >
                  Next
                </Button>
              </div>
            </div>
          </section>

          <section className="signal-glass rounded-3xl p-6">
            <div className="flex flex-wrap items-end gap-3">
              <h2 className="text-xl font-bold text-[#EAF5EC]">Ops Events</h2>
              <Input
                value={opsSearch}
                onChange={(event) => setOpsSearch(event.target.value)}
                placeholder="Search ops events"
                className="signal-input h-10 w-44 rounded-xl border"
              />
              <select
                value={opsDatasetFilter}
                onChange={(event) => setOpsDatasetFilter(event.target.value)}
                className="signal-input h-10 rounded-xl border px-3 text-sm"
              >
                <option value="">All datasets</option>
                <option value="stock">stock</option>
                <option value="sec">sec</option>
              </select>
              <select
                value={opsStatusFilter}
                onChange={(event) => setOpsStatusFilter(event.target.value)}
                className="signal-input h-10 rounded-xl border px-3 text-sm"
              >
                <option value="">All statuses</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
              </select>
              <Input
                value={opsTickerFilter}
                onChange={(event) => setOpsTickerFilter(event.target.value.toUpperCase())}
                placeholder="Ticker filter"
                className="signal-input h-10 max-w-[180px] rounded-xl border"
              />
              <select
                value={opsLimit}
                onChange={(event) => setOpsLimit(Number(event.target.value) || 100)}
                className="signal-input h-10 rounded-xl border px-3 text-sm"
              >
                <option value={50}>Fetch 50</option>
                <option value={100}>Fetch 100</option>
                <option value={200}>Fetch 200</option>
                <option value={500}>Fetch 500</option>
              </select>
              <select
                value={opsPageSize}
                onChange={(event) => setOpsPageSize(Number(event.target.value) || 15)}
                className="signal-input h-10 rounded-xl border px-3 text-sm"
              >
                <option value={10}>10/page</option>
                <option value={15}>15/page</option>
                <option value={25}>25/page</option>
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2D4035] text-[#8EA197]">
                    <th className="px-2 py-2 font-semibold">Created</th>
                    <th className="px-2 py-2 font-semibold">Dataset</th>
                    <th className="px-2 py-2 font-semibold">Ticker</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Duration</th>
                    <th className="px-2 py-2 font-semibold">Source</th>
                    <th className="px-2 py-2 font-semibold">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOpsEvents.length > 0 ? (
                    pagedOpsEvents.map((item) => (
                      <tr key={item.id} className="border-b border-[#22352B] text-[#D4E2D6]">
                        <td className="px-2 py-2">{formatTs(item.created_at)}</td>
                        <td className="px-2 py-2">{item.dataset}</td>
                        <td className="px-2 py-2">{item.ticker || '-'}</td>
                        <td className="px-2 py-2">{item.status}</td>
                        <td className="px-2 py-2">{item.duration_ms} ms</td>
                        <td className="px-2 py-2">{item.source}</td>
                        <td className="max-w-[280px] truncate px-2 py-2 text-[#B6C8BC]" title={item.error || ''}>
                          {item.error || 'n/a'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-2 py-3 text-sm text-[#9BAEA1]">
                        No ops events for current filter/search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[#9BAEA1]">
              <span>
                Showing {pagedOpsEvents.length} of {filteredOpsEvents.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={opsCurrentPage <= 1}
                  onClick={() => setOpsPage((page) => Math.max(1, page - 1))}
                  className="h-8 rounded-lg border-[#35503D] bg-[#18241D] px-3 text-xs font-semibold text-[#D4E2D6] hover:bg-[#203027]"
                >
                  Prev
                </Button>
                <span>
                  Page {opsCurrentPage} / {opsTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={opsCurrentPage >= opsTotalPages}
                  onClick={() => setOpsPage((page) => Math.min(opsTotalPages, page + 1))}
                  className="h-8 rounded-lg border-[#35503D] bg-[#18241D] px-3 text-xs font-semibold text-[#D4E2D6] hover:bg-[#203027]"
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default AdminEventBus;
