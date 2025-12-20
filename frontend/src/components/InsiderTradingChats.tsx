import React from 'react';
import PieChartContainer from './PieChartContainer';

interface TradeData {
  transaction_code: string;
  shares: number;
}

interface InsiderTradingChatsProps {
  tradeData: TradeData[];
}

const COLORS = ['hsl(var(--primary-strong))', 'hsl(var(--accent))', '#ef4444', '#f97316', '#3b82f6'];

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

  const sharesData = tradeData.reduce((acc: any, trade) => {
    const existingType = acc.find((item: any) => item.name === trade.transaction_code);
    if (existingType) {
      existingType.value += trade.shares;
    } else {
      acc.push({ name: trade.transaction_code, value: trade.shares });
    }
    return acc;
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <PieChartContainer
        title="Transaction Types Distribution"
        data={transactionTypeData}
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
