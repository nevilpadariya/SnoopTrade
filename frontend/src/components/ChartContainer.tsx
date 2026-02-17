import React, { useState, useEffect } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from './ui/card';

interface ChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  lineColor: string;
  isLogScale: boolean;
}

const ChartContainer: React.FC<ChartContainerProps> = React.memo(({
  title,
  data,
  dataKey,
  lineColor,
  isLogScale,
}) => {
  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <Card className="p-3 md:p-6 bg-card border-border shadow-md">
      <CardContent className="p-0">
        <h3 className="text-base md:text-2xl font-semibold mb-3 md:mb-6 text-card-foreground font-display">
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickFormatter={isMobile ? (v: string) => { const parts = v.split(' '); return parts.length >= 2 ? `${parts[0].substring(0,3)} ${parts[parts.length-1].substring(2)}` : v; } : undefined}
            />
            <YAxis 
              scale={isLogScale ? 'log' : 'auto'} 
              domain={isLogScale ? ['auto', 'auto'] : undefined} 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 40 : 60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--card-foreground))',
              }}
              itemStyle={{
                color: 'hsl(var(--card-foreground))',
              }}
              labelStyle={{
                color: 'hsl(var(--card-foreground))',
              }}
            />
            <Legend 
              wrapperStyle={{ 
                color: 'hsl(var(--card-foreground))',
                paddingTop: '20px',
                paddingBottom: '10px'
              }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={lineColor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;
