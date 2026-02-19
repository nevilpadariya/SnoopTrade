const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const API_ENDPOINTS = {
  getStocks: (company: string, period: string) =>
    `${BASE_URL}/stocks/${company}?period=${period}`,
  getTransactions: (company: string, timePeriod: string) =>
    `${BASE_URL}/transactions/${company}?time_period=${timePeriod}`,
  getUserDetails: `${BASE_URL}/auth/me`,
  updateUserProfile: `${BASE_URL}/auth/me/update`,
  getUserWatchlist: `${BASE_URL}/auth/watchlist`,
  updateUserWatchlist: `${BASE_URL}/auth/watchlist`,
  refreshToken: `${BASE_URL}/auth/refresh`,
  logout: `${BASE_URL}/auth/logout`,
  fetchFutureData: (ticker?: string) =>
    ticker ? `${BASE_URL}/future/${ticker}` : `${BASE_URL}/future`,
  getInsiderNews: (limit = 8) => `${BASE_URL}/news/insider?limit=${limit}`,
  getWatchlistNews: `${BASE_URL}/news/insider/watchlist`,
  trackInsiderNewsClick: `${BASE_URL}/news/insider/click`,
  getInsiderNewsStats: (days = 7) => `${BASE_URL}/news/insider/stats?days=${days}`,
  getLandingHeroMetrics: (ticker = "AAPL") => `${BASE_URL}/news/landing/hero-metrics?ticker=${ticker}`,
  getAlertRules: `${BASE_URL}/alerts/rules`,
  createAlertRule: `${BASE_URL}/alerts/rules`,
  deleteAlertRule: (ruleId: string) => `${BASE_URL}/alerts/rules/${ruleId}`,
  scanAlerts: `${BASE_URL}/alerts/scan`,
  getAlertSummary: (limit = 5) => `${BASE_URL}/alerts/summary?limit=${limit}`,
  getAlertEvents: (limit = 25, unreadOnly = false) => `${BASE_URL}/alerts/events?limit=${limit}&unread_only=${unreadOnly}`,
  getAlertFeed: (limit = 25, unreadOnly = true) => `${BASE_URL}/alerts/feed?limit=${limit}&unread_only=${unreadOnly}`,
  markAlertRead: (eventId: string) => `${BASE_URL}/alerts/events/${eventId}/read`,
  markAllAlertsRead: `${BASE_URL}/alerts/events/read-all`,
  getConvictionScore: (ticker: string, lookbackDays = 30) => `${BASE_URL}/signals/conviction/${ticker}?lookback_days=${lookbackDays}`,
  getTodaySignals: (
    watchlistOnly = true,
    limit = 5,
    lookbackDays = 30,
    watchlistGroup?: string,
  ) =>
    `${BASE_URL}/signals/today?watchlist_only=${watchlistOnly}&limit=${limit}&lookback_days=${lookbackDays}${
      watchlistGroup ? `&watchlist_group=${encodeURIComponent(watchlistGroup)}` : ''
    }`,
  getSignalDelta: (ticker: string, lookbackDays = 30) =>
    `${BASE_URL}/signals/delta/${ticker}?lookback_days=${lookbackDays}`,
  getSignalExplain: (ticker: string, lookbackDays = 30) =>
    `${BASE_URL}/signals/explain/${ticker}?lookback_days=${lookbackDays}`,
  getSignalBacktest: (
    ticker: string,
    lookbackDays = 365,
    horizonDays = 20,
    minShares = 0,
    maxSignals = 120,
  ) =>
    `${BASE_URL}/signals/backtest/${ticker}?lookback_days=${lookbackDays}&horizon_days=${horizonDays}&min_shares=${minShares}&max_signals=${maxSignals}`,
  getWatchlistRadar: `${BASE_URL}/signals/watchlist-radar`,
  getDailyBrief: `${BASE_URL}/signals/daily-brief`,
  postUserOutcome: `${BASE_URL}/users/outcomes`,
  getUserOutcomes: (limit = 50, ticker?: string) =>
    ticker
      ? `${BASE_URL}/users/outcomes?limit=${limit}&ticker=${encodeURIComponent(ticker)}`
      : `${BASE_URL}/users/outcomes?limit=${limit}`,
  getPersonalizationSettings: `${BASE_URL}/users/personalization-settings`,
  updatePersonalizationSettings: `${BASE_URL}/users/personalization-settings`,
  getNotificationPreferences: `${BASE_URL}/notifications/preferences`,
  updateNotificationPreferences: `${BASE_URL}/notifications/preferences`,
  registerPushToken: `${BASE_URL}/notifications/push-token`,
  removePushToken: (token: string) => `${BASE_URL}/notifications/push-token?token=${encodeURIComponent(token)}`,
  sendNotificationTest: `${BASE_URL}/notifications/test`,
  sendDailyDigestNow: `${BASE_URL}/notifications/digest/send`,
  getNotificationDispatchLog: (limit = 20) => `${BASE_URL}/notifications/dispatch-log?limit=${limit}`,
  adminEventBusStatus: `${BASE_URL}/admin/event-bus`,
  adminEventBusDeadLetters: (limit = 25, status?: string) =>
    `${BASE_URL}/admin/event-bus/dead-letters?limit=${limit}${status ? `&status=${encodeURIComponent(status)}` : ''}`,
  adminRetryDeadLetter: (deadLetterId: string) => `${BASE_URL}/admin/event-bus/dead-letters/${encodeURIComponent(deadLetterId)}/retry`,
  adminRetryFailedDeadLetters: (limit = 20, includeRetryFailed = true) =>
    `${BASE_URL}/admin/event-bus/dead-letters/retry-failed?limit=${limit}&include_retry_failed=${includeRetryFailed}`,
  adminEventBusOpsEvents: (
    limit = 50,
    dataset?: string,
    ticker?: string,
    status?: string,
  ) =>
    `${BASE_URL}/admin/event-bus/ops-events?limit=${limit}${
      dataset ? `&dataset=${encodeURIComponent(dataset)}` : ''
    }${ticker ? `&ticker=${encodeURIComponent(ticker)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}`,
  adminTriggerEventBusDlqRetry: `${BASE_URL}/admin/trigger/event-bus-dlq-retry`,
  login: `${BASE_URL}/auth/token`,
  signUp: `${BASE_URL}/auth/signup`,
};

export default API_ENDPOINTS;
