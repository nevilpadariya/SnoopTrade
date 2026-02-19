import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Loader2, ScanSearch, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { authFetch } from '../utils/authFetch';

type RuleType = 'large_buy' | 'repeat_buyer' | 'cluster_buying';
type MetricType = 'shares' | 'pct_float' | 'ownership_change_pct';
type ComparatorType = 'gte' | 'lte';
type WindowType = 'single' | 'rolling';

interface AlertRule {
  id: string;
  ticker: string;
  rule_type: RuleType;
  threshold: number;
  lookback_days: number;
  metric_type?: MetricType;
  comparator?: ComparatorType;
  window?: WindowType;
  threshold_unit?: 'shares' | 'percent';
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertEvent {
  id: string;
  rule_id: string;
  ticker: string;
  event_type: RuleType;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  occurred_at: string;
  created_at: string;
  is_read: boolean;
  details: Record<string, unknown>;
}

interface AlertsPanelProps {
  selectedCompany: string | null;
  watchlist: string[];
  onAlertsChanged?: () => void;
}

const RULE_META: Record<RuleType, { label: string; thresholdLabel: string; defaultThreshold: string }> = {
  large_buy: {
    label: 'Large Buy',
    thresholdLabel: 'Min shares',
    defaultThreshold: '10000',
  },
  repeat_buyer: {
    label: 'Repeat Buyer',
    thresholdLabel: 'Min buys by one insider',
    defaultThreshold: '2',
  },
  cluster_buying: {
    label: 'Cluster Buying',
    thresholdLabel: 'Min buy transactions',
    defaultThreshold: '3',
  },
};

const METRIC_META: Record<MetricType, { label: string; helper: string; thresholdUnit: 'shares' | 'percent' }> = {
  shares: {
    label: 'Shares',
    helper: 'Compares raw shares in each insider buy.',
    thresholdUnit: 'shares',
  },
  pct_float: {
    label: '% Float',
    helper: 'Compares each insider buy as a percentage of estimated float shares.',
    thresholdUnit: 'percent',
  },
  ownership_change_pct: {
    label: 'Ownership % Change',
    helper: 'Compares buy size to the insider’s prior holdings.',
    thresholdUnit: 'percent',
  },
};

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const AlertsPanel = ({ selectedCompany, watchlist, onAlertsChanged }: AlertsPanelProps) => {
  const tickerOptions = useMemo(() => {
    const unique = new Set<string>(['AAPL', 'MSFT', 'NVDA']);
    if (selectedCompany) unique.add(selectedCompany);
    for (const ticker of watchlist) unique.add(ticker);
    return Array.from(unique).sort();
  }, [selectedCompany, watchlist]);

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [ruleType, setRuleType] = useState<RuleType>('large_buy');
  const [ticker, setTicker] = useState<string>('AAPL');
  const [metricType, setMetricType] = useState<MetricType>('shares');
  const [comparator, setComparator] = useState<ComparatorType>('gte');
  const [windowMode, setWindowMode] = useState<WindowType>('single');
  const [threshold, setThreshold] = useState<string>(RULE_META.large_buy.defaultThreshold);
  const [lookbackDays, setLookbackDays] = useState<string>('30');
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!tickerOptions.length) return;
    if (!tickerOptions.includes(ticker)) {
      setTicker(tickerOptions[0]);
    }
  }, [tickerOptions, ticker]);

  const loadRules = async () => {
    setIsLoadingRules(true);
    try {
      const response = await authFetch(API_ENDPOINTS.getAlertRules);
      if (!response.ok) {
        throw new Error(`Unable to load rules (${response.status})`);
      }
      const payload = (await response.json()) as AlertRule[];
      setRules(payload);
    } catch (error) {
      console.error('Failed to load alert rules', error);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const response = await authFetch(API_ENDPOINTS.getAlertEvents(20, unreadOnly));
      if (!response.ok) {
        throw new Error(`Unable to load events (${response.status})`);
      }
      const payload = (await response.json()) as AlertEvent[];
      setEvents(payload);
    } catch (error) {
      console.error('Failed to load alert events', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [unreadOnly]);

  const handleRuleTypeChange = (nextType: RuleType) => {
    setRuleType(nextType);
    setThreshold(RULE_META[nextType].defaultThreshold);
    if (nextType !== 'large_buy') {
      setMetricType('shares');
      setComparator('gte');
      setWindowMode('single');
    }
  };

  const handleCreateRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setScanMessage('');

    const thresholdValue = Number(threshold);
    const lookbackValue = Number(lookbackDays);

    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      setErrorMessage('Threshold must be a valid number greater than 0.');
      return;
    }
    if (!Number.isInteger(lookbackValue) || lookbackValue < 1 || lookbackValue > 365) {
      setErrorMessage('Lookback days must be an integer between 1 and 365.');
      return;
    }

    const effectiveMetricType: MetricType = ruleType === 'large_buy' ? metricType : 'shares';
    const effectiveComparator: ComparatorType = ruleType === 'large_buy' ? comparator : 'gte';
    const effectiveWindow: WindowType = ruleType === 'large_buy' ? windowMode : 'single';
    const thresholdUnit = METRIC_META[effectiveMetricType].thresholdUnit;

    setIsCreatingRule(true);
    try {
      const response = await authFetch(API_ENDPOINTS.createAlertRule, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          rule_type: ruleType,
          threshold: thresholdValue,
          lookback_days: lookbackValue,
          metric_type: effectiveMetricType,
          comparator: effectiveComparator,
          window: effectiveWindow,
          threshold_unit: thresholdUnit,
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || `Failed to create rule (${response.status})`);
      }

      const created = (await response.json()) as AlertRule;
      setRules((prev) => [created, ...prev]);
      setScanMessage('Rule created. Run scan to generate alerts.');
      onAlertsChanged?.();
    } catch (error: any) {
      console.error('Failed to create alert rule', error);
      setErrorMessage(error?.message || 'Failed to create rule.');
    } finally {
      setIsCreatingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setErrorMessage('');
    setScanMessage('');
    try {
      const response = await authFetch(API_ENDPOINTS.deleteAlertRule(ruleId), {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete rule (${response.status})`);
      }
      setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      onAlertsChanged?.();
    } catch (error) {
      console.error('Failed to delete alert rule', error);
      setErrorMessage('Could not delete rule right now.');
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setErrorMessage('');
    setScanMessage('');
    try {
      const response = await authFetch(API_ENDPOINTS.scanAlerts, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to scan alerts (${response.status})`);
      }
      const payload = (await response.json()) as { generated: number; total_rules: number };
      setScanMessage(`Scan complete: ${payload.generated} new alert${payload.generated === 1 ? '' : 's'} from ${payload.total_rules} rule${payload.total_rules === 1 ? '' : 's'}.`);
      await loadEvents();
      onAlertsChanged?.();
    } catch (error) {
      console.error('Failed to scan alerts', error);
      setErrorMessage('Could not run scan right now.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleMarkRead = async (eventId: string) => {
    try {
      const response = await authFetch(API_ENDPOINTS.markAlertRead(eventId), {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`Failed to mark alert as read (${response.status})`);
      }
      setEvents((prev) => prev.map((item) => (item.id === eventId ? { ...item, is_read: true } : item)));
      onAlertsChanged?.();
    } catch (error) {
      console.error('Failed to mark alert as read', error);
      setErrorMessage('Could not mark alert as read.');
    }
  };

  const thresholdStep = ruleType === 'large_buy' && metricType !== 'shares' ? '0.01' : '1';
  const thresholdMin = thresholdStep === '0.01' ? '0.01' : '1';

  return (
    <section className="signal-glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Alerts Engine</p>
          <h2 className="mt-1 text-2xl font-extrabold text-[#EAF5EC]">Realtime Alerts</h2>
        </div>
        <Button
          type="button"
          onClick={handleScan}
          disabled={isScanning || rules.length === 0}
          className="signal-cta h-10 rounded-xl px-4 text-sm font-bold disabled:opacity-60"
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4" />
              Scan Now
            </span>
          )}
        </Button>
      </div>

      <form onSubmit={handleCreateRule} className="mt-5 grid gap-3 rounded-2xl border border-[#35503D] bg-[#111A15] p-4 sm:grid-cols-2 lg:grid-cols-8">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          Ticker
          <select
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold"
          >
            {tickerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          Rule
          <select
            value={ruleType}
            onChange={(event) => handleRuleTypeChange(event.target.value as RuleType)}
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold"
          >
            {Object.entries(RULE_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          Metric
          <select
            value={metricType}
            onChange={(event) => setMetricType(event.target.value as MetricType)}
            disabled={ruleType !== 'large_buy'}
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {Object.entries(METRIC_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          Comparator
          <select
            value={comparator}
            onChange={(event) => setComparator(event.target.value as ComparatorType)}
            disabled={ruleType !== 'large_buy'}
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="gte">Greater or equal</option>
            <option value="lte">Less or equal</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          Window
          <select
            value={windowMode}
            onChange={(event) => setWindowMode(event.target.value as WindowType)}
            disabled={ruleType !== 'large_buy'}
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="single">Single transaction</option>
            <option value="rolling">Rolling window</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          {RULE_META[ruleType].thresholdLabel}
          <Input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            type="number"
            min={thresholdMin}
            step={thresholdStep}
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8EA197]">
          Lookback (days)
          <Input
            value={lookbackDays}
            onChange={(event) => setLookbackDays(event.target.value)}
            type="number"
            min="1"
            max="365"
            className="signal-input h-10 rounded-xl px-3 text-sm font-semibold"
          />
        </label>

        <div className="flex items-end">
          <Button type="submit" disabled={isCreatingRule} className="signal-cta h-10 w-full rounded-xl text-sm font-bold">
            {isCreatingRule ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Rule'
            )}
          </Button>
        </div>
      </form>

      {ruleType === 'large_buy' && (
        <p className="mt-2 text-xs text-[#8EA197]">
          Metric detail: {METRIC_META[metricType].helper}
        </p>
      )}

      {(scanMessage || errorMessage) && (
        <div className="mt-3 space-y-2">
          {scanMessage && (
            <p className="rounded-xl border border-[#35503D] bg-[#18291F] px-3 py-2 text-sm font-medium text-[#BEE6BE]">{scanMessage}</p>
          )}
          {errorMessage && (
            <p className="rounded-xl border border-[#603333] bg-[#2B1717] px-3 py-2 text-sm font-medium text-[#F7D1D1]">{errorMessage}</p>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#35503D] bg-[#111A15] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8EA197]">Rules</p>
            {isLoadingRules && <Loader2 className="h-4 w-4 animate-spin text-[#8EA197]" />}
          </div>
          {rules.length === 0 ? (
            <p className="text-sm text-[#8EA197]">No rules yet. Create your first alert rule above.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <article key={rule.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#2E4638] bg-[#142119] p-3">
                  <div>
                    <p className="text-sm font-bold text-[#EAF5EC]">{rule.name}</p>
                    <p className="mt-1 text-xs text-[#9FB1A5]">
                      {rule.ticker} • {RULE_META[rule.rule_type].label} • {RULE_META[rule.rule_type].thresholdLabel}: {rule.threshold}
                      {' '}
                      {(rule.threshold_unit ?? 'shares') === 'percent' ? '%' : 'shares'}
                      {' • '}
                      {rule.metric_type ?? 'shares'}
                      {' • '}
                      {rule.comparator ?? 'gte'}
                      {' • '}
                      {rule.lookback_days}d
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="rounded-lg border border-[#603333] bg-[#2B1717] p-2 text-[#F6CCCC] transition hover:bg-[#341D1D]"
                    aria-label="Delete alert rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#35503D] bg-[#111A15] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8EA197]">Recent Alerts</p>
            <button
              type="button"
              onClick={() => setUnreadOnly((value) => !value)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                unreadOnly
                  ? 'border-[#91D88C] bg-[#1F3325] text-[#DFF0DF]'
                  : 'border-[#35503D] bg-[#18241D] text-[#AFC0B3] hover:bg-[#1E2D23]'
              }`}
            >
              {unreadOnly ? 'Unread only' : 'All alerts'}
            </button>
          </div>

          {isLoadingEvents ? (
            <div className="flex items-center gap-2 text-sm text-[#8EA197]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading alerts...
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-[#8EA197]">No alerts yet. Run a scan after creating rules.</p>
          ) : (
            <div className="space-y-2">
              {events.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.is_read ? 'border-[#2E4638] bg-[#132019]/70' : 'border-[#3E5C49] bg-[#16261D]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BellRing className={`h-4 w-4 ${item.is_read ? 'text-[#8EA197]' : 'text-[#A7E89A]'}`} />
                        <p className="text-sm font-bold text-[#EAF5EC]">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-[#C7D0CA]">{item.message}</p>
                      <p className="mt-1 text-xs text-[#9FB1A5]">
                        {item.ticker} • {formatRelativeDate(item.created_at)} • {item.severity}
                      </p>
                    </div>
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        className="rounded-lg border border-[#35503D] bg-[#18241D] p-2 text-[#BEE6BE] transition hover:bg-[#1E2D23]"
                        aria-label="Mark alert as read"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AlertsPanel;
