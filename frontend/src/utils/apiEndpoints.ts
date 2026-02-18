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
  markAlertRead: (eventId: string) => `${BASE_URL}/alerts/events/${eventId}/read`,
  markAllAlertsRead: `${BASE_URL}/alerts/events/read-all`,
  getConvictionScore: (ticker: string, lookbackDays = 30) => `${BASE_URL}/signals/conviction/${ticker}?lookback_days=${lookbackDays}`,
  getWatchlistRadar: `${BASE_URL}/signals/watchlist-radar`,
  getDailyBrief: `${BASE_URL}/signals/daily-brief`,
  login: `${BASE_URL}/auth/token`,
  signUp: `${BASE_URL}/auth/signup`,
};

export default API_ENDPOINTS;
