// src/components/PieChartContainer.tsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Box, Typography } from '@mui/material';

interface PieChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
}

const PieChartContainer: React.FC<PieChartContainerProps> = ({ title, data, dataKey, nameKey, colors }) => {
  return (
    <Box width="100%" maxWidth="500px" m={2}>
      <Typography variant="h6" align="center" gutterBottom>{title}</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PieChartContainer;
