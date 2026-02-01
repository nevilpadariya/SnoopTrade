import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import ChartContainer from '../components/ChartContainer';
import ForecastChartContainer from '../components/ForecastChartContainer';
import SearchBar from '../components/SearchBar';
import CompanyList from '../components/CompanyList';
import InsiderTradingChats from '../components/InsiderTradingChats';
import { Button } from '../components/ui/button';
import { fetchData } from '../utils/fetchData';
import API_ENDPOINTS from '../utils/apiEndpoints';

const TIME_PERIODS = {
  ONE_MONTH: '1m',
  THREE_MONTHS: '3m',
  SIX_MONTHS: '6m',
  ALL: '1y',
};

const COMPANIES = ['AAPL', 'META', 'NVDA'];

const COLORS = {
  price: 'hsl(var(--primary-strong))',
  volume: 'hsl(var(--accent))',
  forecast: '#ef4444',
  trend: '#f97316',
  seasonal: '#3b82f6',
};

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>(COMPANIES);
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(TIME_PERIODS.ALL);
  const [stockData, setStockData] = useState<any[]>([]);
  const [tradeData, setTradeData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [isLogScaleShares] = useState(false);
  const [isLogScalePrice] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    setFilteredCompanies(
      COMPANIES.filter((company) =>
        company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setShowCompanyList(searchTerm.length > 0);
  }, [searchTerm]);

  const handleCompanySelect = (company: string) => {
    setSelectedCompany(company);
    setSearchTerm('');
    setShowCompanyList(false);
    setShowForecast(false);
    setForecastError('');
  };

  const handleTimePeriodChange = (period: string) => {
    setSelectedTimePeriod(period);
  };

  const fetchStockData = async () => {
    if (!selectedCompany || !token) return;
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

      setStockData(formattedData);
    } catch (error: any) {
      console.error('Error fetching stock data:', error);
      if (error.message.includes('401')) {
        localStorage.removeItem('authToken');
        navigate('/login');
      }
    }
  };

  const futureForecast = async (formattedData: any[]) => {
    if (!formattedData || formattedData.length === 0) {
      console.error('No formatted data available for forecasting');
      return;
    }

    setIsPredicting(true);
    setForecastError('');
    try {
      const token = localStorage.getItem('authToken');
      const payload = formattedData.map((d: any) => ({
        date: d.dateISO ?? new Date(d.date).toISOString().split('T')[0],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      const forecastResponse = await fetch(API_ENDPOINTS.fetchFutureData, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!forecastResponse.ok) {
        const errBody = await forecastResponse.json().catch(() => ({}));
        const message = errBody.detail ?? `Error from forecast API: ${forecastResponse.statusText}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }

      const forecastData = await forecastResponse.json();
      setForecastData(forecastData);
      setShowForecast(true);
    } catch (error: any) {
      console.error('Error during forecasting:', error);
      setForecastError(error?.message ?? 'Failed to load forecast. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  };

  const fetchTradeData = async () => {
    if (!selectedCompany || !token) return;
    try {
      const url = API_ENDPOINTS.getTransactions(selectedCompany, selectedTimePeriod);
      const data = await fetchData(url, token);

      const filteredTrades = data.filter((trade: any) => {
        const transactionDate = new Date(trade.transaction_date);
        return !isNaN(transactionDate.getTime());
      });

      const formattedTrades = filteredTrades
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
        .sort((a: { date: string }, b: { date: string }) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

      setTradeData(formattedTrades);
    } catch (error) {
      console.error('Error fetching insider trade data:', error);
    }
  };

  useEffect(() => {
    if (token && selectedCompany) {
      fetchStockData();
      fetchTradeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, selectedTimePeriod, token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Dashboard | SnoopTrade</title>
      </Helmet>

      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-center mb-4 sm:mb-6 font-display text-foreground">
          Insider Trading <span className="text-primary-strong">Dashboard</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-center text-muted-foreground mb-10 sm:mb-12 md:mb-16 max-w-3xl mx-auto px-4">
          Analyze market trends and insider trading activities with real-time data and insights.
        </p>

        <div className="flex flex-col items-center mt-6 sm:mt-8 space-y-4">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
          />
          {showCompanyList && filteredCompanies.length > 0 && (
            <CompanyList
              companies={filteredCompanies}
              onSelectCompany={handleCompanySelect}
            />
          )}
          {showCompanyList && filteredCompanies.length === 0 && (
            <p className="text-muted-foreground mt-4 text-sm sm:text-base">No companies found.</p>
          )}

          {selectedCompany && (
            <div className="flex justify-center mt-6 sm:mt-8 w-full px-2">
              <div className="flex flex-wrap sm:inline-flex justify-center rounded-lg border border-border bg-muted/20 p-1 gap-1 sm:gap-0 sm:space-x-1 w-full sm:w-auto max-w-md">
                {Object.entries(TIME_PERIODS).map(([key, value]) => (
                  <Button
                    key={key}
                    onClick={() => handleTimePeriodChange(value)}
                    variant={selectedTimePeriod === value ? "default" : "ghost"}
                    className="flex-1 sm:flex-initial min-w-[100px] h-11 text-sm sm:text-base"
                  >
                    {key.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedCompany && (
          <>
            <h2 className="text-2xl sm:text-3xl font-semibold text-center mt-10 sm:mt-12 mb-6 sm:mb-8 font-display text-foreground px-4">
              Data for {selectedCompany}
            </h2>

            <div className="mb-8 sm:mb-10">
              <ChartContainer
                title="Stock Price Trends"
                data={stockData}
                dataKey="open"
                lineColor={COLORS.price}
                isLogScale={isLogScalePrice}
              />
            </div>

            <div className="flex justify-center mb-6 sm:mb-8 px-4">
              <Button
                onClick={() => futureForecast(stockData)}
                disabled={isPredicting}
                className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-auto sm:py-3 text-base sm:text-lg font-semibold"
              >
                {isPredicting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Predicting...</span>
                  </div>
                ) : (
                  'Predict Future Trends'
                )}
              </Button>
            </div>

            {forecastError && (
              <div className="mb-6 px-4 py-3 rounded-md bg-destructive/10 text-destructive text-sm text-center" role="alert">
                {forecastError}
              </div>
            )}

            {showForecast && (
              <div className="mb-8 sm:mb-10">
                <ForecastChartContainer
                  title="Predicted Stock Price Trends"
                  data={forecastData}
                  dataKey="open"
                  lineColor={COLORS.forecast}
                  isLogScale={isLogScalePrice}
                  additionalLines={[
                    { dataKey: 'trend', lineColor: COLORS.trend, title: 'Trend' },
                    { dataKey: 'seasonal', lineColor: COLORS.seasonal, title: 'Seasonal' },
                  ]}
                  areaDataKeyLower="yhat_lower"
                  areaDataKeyUpper="yhat_upper"
                />
              </div>
            )}

            <div className="mb-8 sm:mb-10">
              <ChartContainer
                title="Volume of Shares Traded"
                data={tradeData}
                dataKey="shares"
                lineColor={COLORS.volume}
                isLogScale={isLogScaleShares}
              />
            </div>

            <div className="mb-8 sm:mb-10">
              <InsiderTradingChats tradeData={tradeData} />
            </div>

            <div className="mt-10 sm:mt-12">
              <h3 className="text-2xl sm:text-3xl font-semibold text-center mb-4 sm:mb-6 font-display text-foreground px-4">
                Transaction Details
              </h3>
              <div className="overflow-x-auto">
                <DataTable
                  tradeData={tradeData}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  handleChangePage={(e, newPage) => setPage(newPage)}
                  handleChangeRowsPerPage={(e) =>
                    setRowsPerPage(parseInt(e.target.value, 10))
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
