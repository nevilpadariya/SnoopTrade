import { Bar } from 'react-chartjs-2';
import { Component } from "react";

interface TradeData {
  filing_date: string;
  issuer_name: string;
  issuer_cik: string;
  trading_symbol: string;
  reporting_owner_name: string;
  reporting_owner_cik: string;
  transaction_date: string;
  security_title: string;
  transaction_code: string;
  shares: string;
  price_per_share: string;
  ownership_type: string;
}

class TradeChart extends Component<{ tradeData: TradeData[] }> {
  render() {
    const { tradeData } = this.props;

    // Map and reverse the data for recent trades first
    const labels = tradeData.map((trade) => trade.transaction_date).reverse();
    const shares = tradeData.map((trade) => parseFloat(trade.shares)).reverse(); // Convert shares to a number and reverse the order

    const data = {
      labels,
      datasets: [
        {
          label: 'Shares Traded',
          data: shares,
          backgroundColor: 'orange',
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: 'Insider Trades - Shares Traded' },
      },
      scales: {
        y: { beginAtZero: true },
      },
    };

    return <Bar data={data} options={options} />;
  }
}

export default TradeChart;
