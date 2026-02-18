const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const API_ENDPOINTS = {
  getStocks: (company: string, period: string) =>
    `${BASE_URL}/stocks/${company}?period=${period}`,
  getTransactions: (company: string, timePeriod: string) =>
    `${BASE_URL}/transactions/${company}?time_period=${timePeriod}`,
  getUserDetails: `${BASE_URL}/auth/me`,
  updateUserProfile: `${BASE_URL}/auth/me/update`,
  refreshToken: `${BASE_URL}/auth/refresh`,
  logout: `${BASE_URL}/auth/logout`,
  fetchFutureData: (ticker?: string) =>
    ticker ? `${BASE_URL}/future/${ticker}` : `${BASE_URL}/future`,
  getInsiderNews: (limit = 8) => `${BASE_URL}/news/insider?limit=${limit}`,
  trackInsiderNewsClick: `${BASE_URL}/news/insider/click`,
  getInsiderNewsStats: (days = 7) => `${BASE_URL}/news/insider/stats?days=${days}`,
  getLandingHeroMetrics: (ticker = "AAPL") => `${BASE_URL}/news/landing/hero-metrics?ticker=${ticker}`,
  login: `${BASE_URL}/auth/token`,
  signUp: `${BASE_URL}/auth/signup`,
};

export default API_ENDPOINTS;
