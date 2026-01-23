import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from './ui/card';

interface PieChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
}

// Transaction code to full name mapping
const TRANSACTION_NAMES: { [key: string]: string } = {
  G: 'Gift',
  S: 'Sale',
  M: 'Exercise/Conversion',
  F: 'Payment of Exercise',
  A: 'Grant/Award',
  P: 'Purchase',
  D: 'Sale to Issuer',
  I: 'Discretionary',
};

const PieChartContainer: React.FC<PieChartContainerProps> = ({
  title,
  data,
  dataKey,
  nameKey,
  colors,
}) => {
  // Custom label renderer for better positioning
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    index,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--card-foreground))"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  // Custom legend formatter to show full transaction names
  const formatLegendValue = (value: string) => {
    return TRANSACTION_NAMES[value] || value;
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-0">
        <h3 className="text-xl font-semibold mb-4 text-card-foreground font-display">
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <defs>
              {colors.map((color, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              label={renderCustomLabel}
              labelLine={{
                stroke: 'hsl(var(--muted-foreground))',
                strokeWidth: 1,
              }}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index % colors.length})`}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                color: 'hsl(var(--card-foreground))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                padding: '12px 16px',
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                TRANSACTION_NAMES[name] || name,
              ]}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={formatLegendValue}
              wrapperStyle={{
                color: 'hsl(var(--card-foreground))',
                paddingTop: '20px',
              }}
              iconType="circle"
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PieChartContainer;
