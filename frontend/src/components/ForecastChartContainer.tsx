import React from 'react';
import { 
  LineChart, 
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Area 
} from 'recharts';
import { Card, CardContent } from './ui/card';

interface AdditionalLine {
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
  additionalLines?: AdditionalLine[];
  areaDataKeyLower?: string;
  areaDataKeyUpper?: string;
}

const ForecastChartContainer: React.FC<ForecastChartContainerProps> = ({
  title,
  data,
  dataKey,
  lineColor,
  isLogScale,
  additionalLines = [],
  areaDataKeyLower,
  areaDataKeyUpper,
}) => {
  return (
    <Card className="p-6 bg-card border-border shadow-md">
      <CardContent className="p-0">
        <h3 className="text-2xl font-semibold mb-6 text-card-foreground font-display">
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              scale={isLogScale ? 'log' : 'auto'} 
              domain={isLogScale ? ['auto', 'auto'] : undefined} 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
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
            
            {areaDataKeyLower && areaDataKeyUpper && (
              <Area
                type="monotone"
                dataKey={areaDataKeyLower}
                stackId="1"
                stroke="none"
                fill={lineColor}
                fillOpacity={0.3}
              />
            )}
            
            <Line type="monotone" dataKey={dataKey} stroke={lineColor} strokeWidth={3} dot={false} />
            
            {additionalLines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.lineColor}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ForecastChartContainer;
