import React, { useState, useEffect } from 'react';
import { Box, Typography, Switch, FormControlLabel } from '@mui/material';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import CompanyList from '../components/CompanyList';
import ChartContainer from '../components/ChartContainer';
import DataTable from '../components/DataTable';
import { fetchData } from '../utils/fetchData';
import InsiderTradingCharts from "../components/InsiderTradingChats";

const TIME_PERIODS = {
  ONE_MONTH: "1m",
  THREE_MONTHS: "3m",
  SIX_MONTHS: "6m",
  ALL: "1y",
};

const COMPANIES = ["AAPL", "META", "NVDA"];

const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>(COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(TIME_PERIODS.SIX_MONTHS);
  const [stockData, setStockData] = useState<any[]>([]);
  const [tradeData, setTradeData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLogScaleShares, setIsLogScaleShares] = useState(false); // Log scale for shares chart
  const [isLogScalePrice, setIsLogScalePrice] = useState(false); // Log scale for price chart
  const navigate = useNavigate();

  const token = localStorage.getItem('authToken');

  // Pagination handlers for DataTable
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const trade = tradeData.find((t: any) => t.date === data.date);
      return (
        <Box p={2} sx={{ backgroundColor: '#fff', borderRadius: 1, boxShadow: 1 }}>
          <Typography color="textPrimary">Date: {data.date}</Typography>
          <Typography color="green">Open: {data.open}</Typography>
          <Typography color="red">Close: {data.close}</Typography>
          <Typography color="orange">High: {data.high}</Typography>
          <Typography color="blue">Low: {data.low}</Typography>
          {trade && (
            <>
              <Typography fontWeight="bold" mt={1}>Trade Information:</Typography>
              <Typography>Shares: {trade.shares}</Typography>
              <Typography>Price Per Share: {trade.price_per_share}</Typography>
              <Typography>Transaction Code: {trade.transaction_code}</Typography>
              <Typography>Ownership Type: {trade.ownership_type}</Typography>
            </>
          )}
        </Box>
      );
    }
    return null;
  };

  const fetchStockData = async () => {
    if (!selectedCompany || !token) return;
    setLoading(true);
    setError('');
    try {
      const url = `http://localhost:8000/stocks/${selectedCompany}?period=${selectedTimePeriod}`;
      const data = await fetchData(url, token);

      const formattedData = data
        .map((item: any) => ({
          date: new Date(item.date).toLocaleDateString(),
          open: item.open,
          close: item.close,
          high: item.high,
          low: item.low,
        }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setStockData(formattedData);
    } catch (error: any) {
      if (error.message.includes("401")) {
        localStorage.removeItem('authToken');
        navigate('/login');
      } else {
        setError(error.message || 'Failed to fetch stock data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeData = async () => {
    if (!selectedCompany || !token) return;
    setLoading(true);
    setError('');
    try {
      const url = `http://localhost:8000/transactions/${selectedCompany}?time_period=${selectedTimePeriod}`;
      const data = await fetchData(url, token);

      const formattedTrades = data.map((trade: any) => ({
        date: new Date(trade.transaction_date).toLocaleDateString(),
        shares: Number(trade.shares),
        high: trade.high,
        low: trade.low,
        open: trade.open,
        close: trade.close,
        security_title: trade.security_title,
        transaction_code: trade.transaction_code,
        price_per_share: trade.price_per_share,
        ownership_type: trade.ownership_type,
      }));
      setTradeData(formattedTrades);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch insider trade data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStockData();
      fetchTradeData();
    } else {
      navigate('/login');
    }
  }, [selectedCompany, selectedTimePeriod, token]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="#EAEFF3">
      <Helmet><title>Dashboard | SnoopTrade</title></Helmet>

      {/* Search and Company Selection */}
      <Box display="flex" flexDirection="column" alignItems="center" p={2} width="100%" maxWidth="1200px" mt={4}>
        <SearchBar searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value.toUpperCase())} />
        {searchTerm && filteredCompanies.length > 0 && (
          <CompanyList companies={filteredCompanies} onSelectCompany={(company) => setSelectedCompany(company)} />
        )}
      </Box>

      {/* Stock Price Trend Chart */}
      {stockData.length > 0 && (
        <>
          <FormControlLabel
            control={<Switch checked={isLogScalePrice} onChange={(e) => setIsLogScalePrice(e.target.checked)} color="primary" />}
            label="Logarithmic Scale for Stock Prices"
          />
          <ChartContainer
            title="Stock Price Trend"
            data={stockData}
            dataKey="close"
            lineColor="#73C2A0"
            tooltipContent={customTooltip}
            scatterData={tradeData.filter((trade) => stockData.some((stock) => stock.date === trade.date))}
            isLogScale={isLogScalePrice} // Pass individual log scale state for this chart
          />
        </>
      )}

      {/* Volume of Shares Traded Over Time Chart */}
      {tradeData.length > 0 && (
        <>
          <FormControlLabel
            control={<Switch checked={isLogScaleShares} onChange={(e) => setIsLogScaleShares(e.target.checked)} color="primary" />}
            label="Logarithmic Scale for Volume of Shares"
          />
          <ChartContainer
            title="Volume of Shares Traded Over Time"
            data={tradeData}
            dataKey="shares"
            lineColor="#FFA500"
            tooltipContent={customTooltip}
            isLogScale={isLogScaleShares} // Pass individual log scale state for this chart
          />
        </>
      )}

      {/* High and Low Prices Over Time Chart */}
      {stockData.length > 0 && (
        <ChartContainer
          title="High and Low Prices Over Time"
          data={stockData}
          dataKey="high"
          lineColor="#FF4500"
          tooltipContent={customTooltip}
        />
      )}

      {/* Insider Trading Insights */}
      {tradeData.length > 0 && (
        <Box mt={4} width="100%" maxWidth="1200px">
          <Typography variant="h5" align="center" gutterBottom>Insider Trading Insights</Typography>
          <InsiderTradingCharts tradeData={tradeData} />
        </Box>
      )}

      {/* Data Table */}
      {tradeData.length > 0 && (
        <DataTable
          tradeData={tradeData}
          rowsPerPage={rowsPerPage}
          page={page}
          handleChangePage={handleChangePage}
          handleChangeRowsPerPage={handleChangeRowsPerPage}
        />
      )}
    </Box>
  );
};

export default Dashboard;
