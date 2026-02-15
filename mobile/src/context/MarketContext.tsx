import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TimePeriod } from '../constants/companies';
import { ForecastPoint, StockPoint } from '../types/api';

interface MarketContextValue {
  selectedTicker: string;
  setSelectedTicker: (ticker: string) => void;
  selectedPeriod: TimePeriod;
  setSelectedPeriod: (period: TimePeriod) => void;
  stockSeriesByTicker: Record<string, StockPoint[]>;
  setStockSeries: (ticker: string, data: StockPoint[]) => void;
  forecastByTicker: Record<string, ForecastPoint[]>;
  setForecastSeries: (ticker: string, data: ForecastPoint[]) => void;
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1y');
  const [stockSeriesByTicker, setStockSeriesByTicker] = useState<Record<string, StockPoint[]>>({});
  const [forecastByTicker, setForecastByTicker] = useState<Record<string, ForecastPoint[]>>({});

  const setStockSeries = useCallback((ticker: string, data: StockPoint[]) => {
    setStockSeriesByTicker((prev) => ({ ...prev, [ticker]: data }));
  }, []);

  const setForecastSeries = useCallback((ticker: string, data: ForecastPoint[]) => {
    setForecastByTicker((prev) => ({ ...prev, [ticker]: data }));
  }, []);

  const value = useMemo(
    () => ({
      selectedTicker,
      setSelectedTicker,
      selectedPeriod,
      setSelectedPeriod,
      stockSeriesByTicker,
      setStockSeries,
      forecastByTicker,
      setForecastSeries,
    }),
    [selectedTicker, selectedPeriod, stockSeriesByTicker, forecastByTicker],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error('useMarket must be used within MarketProvider');
  }
  return ctx;
}
