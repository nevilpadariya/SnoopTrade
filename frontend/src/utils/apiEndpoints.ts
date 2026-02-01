const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://cmpe272teamsnooptrade.us-west-2.elasticbeanstalk.com";

const API_ENDPOINTS = {
  getStocks: (company: string, period: string) =>
    `${BASE_URL}/stocks/${company}?period=${period}`,
  getTransactions: (company: string, timePeriod: string) =>
    `${BASE_URL}/transactions/${company}?time_period=${timePeriod}`,
  getUserDetails: `${BASE_URL}/auth/me`,
  updateUserProfile: `${BASE_URL}/auth/me/update`,
  fetchFutureData: `${BASE_URL}/future`,
  login: `${BASE_URL}/auth/token`,
  signUp: `${BASE_URL}/auth/signup`,
};

export default API_ENDPOINTS;
