import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Button,
  ButtonGroup,
  CircularProgress,
} from '@mui/material';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DataTable from '../components/DataTable';
import ChartContainer from '../components/ChartContainer';
import ForecastChartContainer from '../components/ForecastChartContainer';
import SearchBar from '../components/SearchBar';
import CompanyList from '../components/CompanyList';
import InsiderTradingChats from '../components/InsiderTradingChats';
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
  primary: '#00D09C',
  secondary: '#1A1A1A',
  accent: '#73C2A0',
  background: {
    main: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9))',
    paper: 'rgba(115, 194, 160, 0.1)',
    card: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.8)',
    muted: 'rgba(255, 255, 255, 0.7)',
  },
  chart: {
    price: '#73C2A0',
    volume: '#A8E6CF',
    forecast: '#FF0000', // Red color for forecast
    trend: '#FFA500', // Orange color for trend
    seasonal: '#0000FF', // Blue color for seasonal
  },
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
  const [isLogScaleShares, setIsLogScaleShares] = useState(false);
  const [isLogScalePrice, setIsLogScalePrice] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false); // Loading state for prediction
  const [showForecast, setShowForecast] = useState(false); // State to manage forecast chart visibility
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
    setShowForecast(false); // Hide forecast chart when a new company is selected
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
        .map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          open: item.open ?? 0,
          close: item.close ?? 0,
          high: item.high ?? 0,
          low: item.low ?? 0,
        }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStockData(formattedData);
      console.log('Stock data:', formattedData);
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

    setIsPredicting(true); // Start loading
    try {
      const token = localStorage.getItem('authToken'); // Retrieve the token from local storage

      const forecastResponse = await fetch(API_ENDPOINTS.fetchFutureData, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Include the token in the headers
        },
        body: JSON.stringify(formattedData), // Send formatted data directly
      });
      console.log("Forecast response:", forecastResponse);
      if (!forecastResponse.ok) {
        throw new Error(`Error from forecast API: ${forecastResponse.statusText}`);
      }

      const forecastData = await forecastResponse.json();
      console.log("Forecast data:", forecastData);

      setForecastData(forecastData); // Store forecast data
      setShowForecast(true); // Show forecast chart
    } catch (error: any) {
      console.error('Error during forecasting:', error);
    } finally {
      setIsPredicting(false); // Stop loading
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
  }, [selectedCompany, selectedTimePeriod, token]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: COLORS.background.main,
        color: COLORS.text.primary,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 30%, rgba(115, 194, 160, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Helmet>
        <title>Dashboard | SnoopTrade</title>
      </Helmet>

      <Navbar />
      <Container maxWidth="lg" sx={{ pt: 8, pb: 8 }}>
        <Typography
          variant="h1"
          align="center"
          sx={{
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            fontWeight: 800,
            color: COLORS.text.primary,
            mb: 3,
            '& span': {
              background: 'linear-gradient(45deg, #73C2A0 30%, #A8E6CF 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            },
          }}
        >
          Insider Trading <span>Dashboard</span>
        </Typography>
        <Typography
          variant="h6"
          align="center"
          sx={{
            color: COLORS.text.secondary,
            mb: 8,
            maxWidth: '800px',
            mx: 'auto',
          }}
        >
          Analyze market trends and insider trading activities with real-time data and insights.
        </Typography>

        <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
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
            <Typography variant="body1" sx={{ color: COLORS.text.muted, mt: 2 }}>
              No companies found.
            </Typography>
          )}

          {selectedCompany && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <ButtonGroup>
                {Object.entries(TIME_PERIODS).map(([key, value]) => (
                  <Button
                    key={key}
                    onClick={() => handleTimePeriodChange(value)}
                    sx={{
                      backgroundColor: selectedTimePeriod === value ? COLORS.accent : 'transparent',
                      color: selectedTimePeriod === value ? COLORS.secondary : COLORS.text.primary,
                      border: `1px solid ${COLORS.accent}`,
                      textTransform: 'none',
                      px: 4,
                      py: 1,
                      '&:hover': {
                        backgroundColor: COLORS.accent,
                        color: COLORS.secondary,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out',
                      },
                    }}
                  >
                    {key.replace('_', ' ')}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
          )}
        </Box>

        {selectedCompany && (
          <>
            <Typography
              variant="h5"
              align="center"
              sx={{
                mt: 6,
                mb: 4,
                color: COLORS.text.primary,
                fontWeight: 600,
              }}
            >
              Data for {selectedCompany}
            </Typography>

            <Box sx={{
              mb: 6,
              background: COLORS.background.card,
              p: 4,
              borderRadius: '16px',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}>
              <ChartContainer
                title="Stock Price Trends"
                data={stockData}
                dataKey="open"
                lineColor={COLORS.chart.price}
                isLogScale={isLogScalePrice}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Button
                onClick={() => futureForecast(stockData)}
                disabled={isPredicting}
                sx={{
                  backgroundColor: COLORS.accent,
                  color: COLORS.secondary,
                  textTransform: 'none',
                  px: 4,
                  py: 1,
                  '&:hover': {
                    backgroundColor: COLORS.accent,
                    color: COLORS.secondary,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out',
                  },
                }}
              >

                {isPredicting ? 'Predicting...' : 'Predict Future Trends'}
              </Button>
            </Box>

            {isPredicting && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {showForecast && (
              <Box sx={{
                mb: 6,
                background: COLORS.background.card,
                p: 4,
                borderRadius: '16px',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}>
                <ForecastChartContainer
                  title="Predicted Stock Price Trends"
                  data={forecastData}
                  dataKey="open"
                  lineColor={COLORS.chart.forecast}
                  isLogScale={isLogScalePrice}
                  additionalLines={[
                    { dataKey: 'trend', lineColor: COLORS.chart.trend, title: 'Trend' },
                    { dataKey: 'seasonal', lineColor: COLORS.chart.seasonal, title: 'Seasonal' },
                  ]}
                  areaDataKeyLower="yhat_lower"
                  areaDataKeyUpper="yhat_upper"
                />
              </Box>
            )}

            <Box sx={{
              mb: 6,
              background: COLORS.background.card,
              p: 4,
              borderRadius: '16px',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}>
              <ChartContainer
                title="Volume of Shares Traded"
                data={tradeData}
                dataKey="shares"
                lineColor={COLORS.chart.volume}
                isLogScale={isLogScaleShares}
              />
            </Box>

            <Box sx={{
              mb: 6,
              background: COLORS.background.card,
              p: 4,
              borderRadius: '16px',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
              },
            }}>
              <InsiderTradingChats tradeData={tradeData} />
            </Box>

            <Box mt={6}>
              <Typography
                variant="h5"
                align="center"
                gutterBottom
                sx={{ color: COLORS.text.primary }}
              >
                Transaction Details
              </Typography>
              <Box sx={{
                background: COLORS.background.card,
                p: 4,
                borderRadius: '16px',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}>
                <DataTable
                  tradeData={tradeData}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  handleChangePage={(e, newPage) => setPage(newPage)}
                  handleChangeRowsPerPage={(e) =>
                    setRowsPerPage(parseInt(e.target.value, 10))
                  }
                />
              </Box>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;
