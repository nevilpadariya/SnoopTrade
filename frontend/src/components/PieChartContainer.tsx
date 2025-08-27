import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

// Mapping of transaction codes to descriptions
const transactionDescriptions: { [key: string]: string } = {
  M: 'Transactions related to monetary transfers, such as cash payments or transfers.',
  S: 'Stock transactions, including buying or selling company shares.',
  A: 'Transactions involving asset management, such as property or equipment.',
  F: 'Fee-related transactions, such as commissions or fines.',
  G: 'Transactions involving grants or special adjustments, such as bonuses or subsidies.',
};

interface PieChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
}

const PieChartContainer: React.FC<PieChartContainerProps> = ({
  title,
  data,
  dataKey,
  nameKey,
  colors,
}) => {
  const theme = useTheme();

  // Custom tooltip to display transaction details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const description = transactionDescriptions[name] || 'No description available';
      return (
        <Box
          p={2}
          bgcolor={theme.palette.background.default}
          boxShadow={3}
          borderRadius={4}
          border={`1px solid ${theme.palette.divider}`}
        >
          <Typography variant="subtitle1" fontWeight="bold" color={theme.palette.text.primary}>
            {name}
          </Typography>
          <Typography variant="body2" color={theme.palette.text.secondary}>
            {description}
          </Typography>
          <Typography variant="body2" fontWeight="bold" color={theme.palette.text.primary}>
            Value: {value}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box
      width="100%"
      maxWidth="500px"
      m={3}
      p={2}
      boxShadow={3}
      borderRadius={4}
      bgcolor={theme.palette.background.paper}
    >
      <Typography
        variant="h5"
        align="center"
        gutterBottom
        fontWeight="bold"
        color={theme.palette.text.primary}
      >
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60}
            paddingAngle={5}
            fill="#8884d8"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                stroke={theme.palette.divider}
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{
              marginTop: 10,
              textAlign: 'center',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PieChartContainer;
