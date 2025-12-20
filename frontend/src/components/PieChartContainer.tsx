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

const PieChartContainer: React.FC<PieChartContainerProps> = ({
  title,
  data,
  dataKey,
  nameKey,
  colors,
}) => {
  return (
    <Card className="p-6 bg-card border-border shadow-md">
      <CardContent className="p-0">
        <h3 className="text-2xl font-semibold mb-6 text-card-foreground font-display">
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--card-foreground))',
              }}
            />
            <Legend 
              wrapperStyle={{ 
                color: 'hsl(var(--card-foreground))' 
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PieChartContainer;
