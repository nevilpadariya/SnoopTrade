import React from 'react';
import PieChartContainer from './PieChartContainer';
import { Box } from "@mui/material";

interface InsiderTradingChartsProps {
  tradeData: any[];
}

// Function to generate dynamic colors based on the number of types
const generateDynamicColors = (totalTypes: number): string[] => {
  const colors = [];
  for (let i = 0; i < totalTypes; i++) {
    const hue = (360 / totalTypes) * i; // Spread colors evenly across the hue spectrum
    colors.push(`hsl(${hue}, 70%, 50%)`); // Use HSL for vibrant, evenly spaced colors
  }
  return colors;
};

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

  // Generate dynamic colors based on the number of transaction types
  const colors = generateDynamicColors(Object.keys(transactionTypeData).length);

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
