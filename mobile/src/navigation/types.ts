export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  StockDetail: { ticker: string };
};

export type TabParamList = {
  HomeTab: undefined;
  Transactions: undefined;
  Forecast: undefined;
  Account: undefined;
};
