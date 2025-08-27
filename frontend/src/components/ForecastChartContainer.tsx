import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ResponsiveContainer,
  Brush,
} from 'recharts';

interface LineProps {
  dataKey: string;
  lineColor: string;
  title: string;
}

interface ForecastChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  lineColor: string;
  isLogScale: boolean;
  additionalLines: LineProps[];
  areaDataKeyLower: string;
  areaDataKeyUpper: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ backgroundColor: '#73C2A0', padding: '10px', borderRadius: '8px', color: '#1A1A1A' }}>
        <Typography variant="body2">{`Date: ${label}`}</Typography>
        {payload.map((entry: any, index: number) => (
          <Typography key={`item-${index}`} variant="body2">{`${entry.name}: ${entry.value}`}</Typography>
        ))}
      </Box>
    );
  }

  return null;
};

const ForecastChartContainer: React.FC<ForecastChartContainerProps> = ({
  title,
  data,
  dataKey,
  lineColor,
  isLogScale,
  additionalLines,
  areaDataKeyLower,
  areaDataKeyUpper,
}) => {
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
          data={data}
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
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke={lineColor} />
          {additionalLines.map((line, index) => (
            <Line key={index} type="monotone" dataKey={line.dataKey} stroke={line.lineColor} name={line.title} />
          ))}
          <Line type="monotone" dataKey="yhat_lower" stroke="#FF0000" name="Possible Open Lower" />
          <Line type="monotone" dataKey="yhat_upper" stroke="#00FF00" name="Possible Open Upper" />
          <Area type="monotone" dataKey="trend_lower" stroke="none" fillOpacity={0.3} fill="#FFA500" />
          <Area type="monotone" dataKey="trend_upper" stroke="none" fillOpacity={0.3} fill="#FFA500" />
          <Area type="monotone" dataKey={areaDataKeyLower} stroke={lineColor} fillOpacity={0.3} fill={lineColor} />
          <Area type="monotone" dataKey={areaDataKeyUpper} stroke={lineColor} fillOpacity={0.3} fill={lineColor} />
          <Line type="monotone" dataKey="momentum" stroke="#FF00FF" name="Momentum" />
          <Line type="monotone" dataKey="acceleration" stroke="#00FFFF" name="Acceleration" />
          <Brush dataKey="date" height={30} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ForecastChartContainer;