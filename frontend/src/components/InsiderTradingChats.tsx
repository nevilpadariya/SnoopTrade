import React from 'react';
import PieChartContainer from './PieChartContainer';

interface TradeData {
  transaction_code: string;
  shares: number;
}

interface InsiderTradingChatsProps {
  tradeData: TradeData[];
}

// Cohesive green palette that matches the dark theme
const COLORS = [
  'hsl(142, 70%, 45%)',   // Bright green
  'hsl(160, 55%, 40%)',   // Teal green
  'hsl(142, 45%, 35%)',   // Medium green
  'hsl(175, 50%, 38%)',   // Cyan-green
  'hsl(130, 50%, 45%)',   // Lime green
  'hsl(155, 60%, 32%)',   // Dark teal
  'hsl(140, 40%, 55%)',   // Light green
];

const InsiderTradingChats: React.FC<InsiderTradingChatsProps> = ({ tradeData }) => {
  const transactionTypeData = tradeData.reduce((acc: any, trade) => {
    const existingType = acc.find((item: any) => item.name === trade.transaction_code);
    if (existingType) {
      existingType.value += 1;
    } else {
      acc.push({ name: trade.transaction_code, value: 1 });
    }
    return acc;
  }, []);
  const totalTransactions = tradeData.length;

  const groupedTransactionTypeData = transactionTypeData
    .reduce((acc: any[], item: any) => {
      const ratio = totalTransactions > 0 ? item.value / totalTransactions : 0;
      if (ratio < 0.04) {
        const others = acc.find((entry) => entry.name === 'Others');
        if (others) {
          others.value += item.value;
        } else {
          acc.push({ name: 'Others', value: item.value });
        }
      } else {
        acc.push(item);
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.value - a.value);

  const totalShares = tradeData.reduce((sum, trade) => sum + trade.shares, 0);
  
  const rawSharesData = tradeData.reduce((acc: any, trade) => {
    const existingType = acc.find((item: any) => item.name === trade.transaction_code);
    if (existingType) {
      existingType.value += trade.shares;
    } else {
      acc.push({ name: trade.transaction_code, value: trade.shares });
    }
    return acc;
  }, []);

  // Group small values into "Others" to match the cleaner look of the left chart
  const sharesData = rawSharesData.reduce((acc: any[], item: any) => {
    // If value is less than 3% of total, group it
    if (totalShares > 0 && item.value / totalShares < 0.03) {
      const others = acc.find(i => i.name === 'Others');
      if (others) {
        others.value += item.value;
      } else {
        acc.push({ name: 'Others', value: item.value });
      }
    } else {
      acc.push(item);
    }
    return acc;
  }, []).sort((a: any, b: any) => b.value - a.value); // Sort descending for better visual layout

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <PieChartContainer
        title="Transaction Types Distribution"
        data={groupedTransactionTypeData}
        dataKey="value"
        nameKey="name"
        colors={COLORS}
      />
      <PieChartContainer
        title="Shares Distribution"
        data={sharesData}
        dataKey="value"
        nameKey="name"
        colors={COLORS}
      />
    </div>
  );
};

export default InsiderTradingChats;
