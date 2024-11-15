// src/components/InsiderTradingCharts.tsx
import React from 'react';
import PieChartContainer from './PieChartContainer';
import {Box} from "@mui/material";

interface InsiderTradingChartsProps {
  tradeData: any[];
}

const InsiderTradingCharts: React.FC<InsiderTradingChartsProps> = ({ tradeData }) => {
  // Transform the trade data for pie chart insights (e.g., transaction codes breakdown)
  const transactionTypeData = tradeData.reduce((acc: any, trade: any) => {
    const type = trade.transaction_code;
    acc[type] = acc[type] ? acc[type] + 1 : 1;
    return acc;
  }, {});

  const pieData = Object.entries(transactionTypeData).map(([name, value]) => ({
    name,
    value,
  }));

  const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <PieChartContainer
        title="Transaction Types Breakdown"
        data={pieData}
        dataKey="value"
        nameKey="name"
        colors={colors}
      />
      {/* Additional charts (e.g., bar chart or line chart for ownership type) can go here */}
    </Box>
  );
};

export default InsiderTradingCharts;
