import React from 'react';
import { Paper, Typography } from '@mui/material';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Brush, Line, Scatter } from 'recharts';

interface ChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  lineColor: string;
  tooltipContent: any;
  scatterData?: any[];
  isLogScale?: boolean; // New prop to toggle log scale
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  data,
  dataKey,
  lineColor,
  tooltipContent,
  scatterData,
  isLogScale = false, // Default to false if not provided
}) => (
  <Paper
    elevation={3}
    sx={{
      padding: '1rem',
      width: '100%',
      maxWidth: '1200px',
      marginTop: '2rem',
      backgroundColor: '#F8FAFC',
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
    }}
  >
    <Typography variant="h5" align="center" fontWeight="bold" color="primary" gutterBottom>
      {title}
    </Typography>
    {data.length > 0 ? (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis scale={isLogScale ? 'log' : 'linear'} domain={['auto', 'auto']} /> {/* Toggle between log and linear */}
          <Tooltip content={tooltipContent} />
          <Line type="monotone" dataKey={dataKey} stroke={lineColor} activeDot={{ r: 8 }} />
          {scatterData && <Scatter data={scatterData} dataKey="date" fill="red" />}
          <Brush dataKey="date" height={30} stroke={lineColor} />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <Typography align="center">No data available</Typography>
    )}
  </Paper>
);

export default ChartContainer;
