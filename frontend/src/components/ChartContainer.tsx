import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface ChartContainerProps {
  title: string;
  data: Record<string, any>[]; // Flexible to support varied data structures
  dataKey: string; // The key to access data in each record
  lineColor: string; // Color for the line in the chart
  isLogScale?: boolean; // Option for logarithmic scale
}

// Custom Tooltip Renderer
const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload || {}; // Access data point details

    return (
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          padding: '10px',
          borderRadius: '8px',
          color: '#000000',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
          border: '1px solid #E0E0E0',
        }}
      >
        <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
          Date: {label || 'N/A'}
        </Typography>
        {payload.map((item, index) => (
          <Typography variant="body2" key={index}>
            <strong>{item.name}</strong>: {item.value || 'N/A'}
          </Typography>
        ))}
      </Box>
    );
  }

  return null;
};

// Chart Container Component
const ChartContainer: React.FC<ChartContainerProps> = ({ title, data, dataKey, lineColor, isLogScale }) => {
  // Filter out invalid data (e.g., missing or invalid date) and sort by date
  const validData = data
    .filter((item) => {
      const date = new Date(item.date);
      return !isNaN(date.getTime()); // Ensure the date is valid
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date

  return (
    <Box
      mb={6}
      sx={{
        background: 'linear-gradient(135deg, #2E3440, #3B4252)',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          color: '#ECEFF4',
          fontWeight: 600,
          marginBottom: '10px',
        }}
      >
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={validData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4C566A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#ECEFF4', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#ECEFF4' }}
          />
          <YAxis
            scale={isLogScale ? 'log' : 'auto'}
            tick={{ fill: '#ECEFF4', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#ECEFF4' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={3}
            dot={{ fill: lineColor, r: 5 }}
            activeDot={{ fill: '#FFFFFF', stroke: lineColor, r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ChartContainer;
