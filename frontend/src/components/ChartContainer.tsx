import React, { useEffect, useState } from 'react';
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mobileMql = window.matchMedia('(max-width: 767px)');
    const tabletMql = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const mobileHandler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const tabletHandler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mobileMql.addEventListener('change', mobileHandler);
    tabletMql.addEventListener('change', tabletHandler);
    return () => {
      mobileMql.removeEventListener('change', mobileHandler);
      tabletMql.removeEventListener('change', tabletHandler);
    };
  }, []);

  const formatAxisDate = (value: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', isMobile ? { month: 'numeric', day: 'numeric' } : { month: 'short', day: 'numeric' });
    }
    if (!isMobile) return value;
    const parts = value.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].slice(0, 3)} ${parts[parts.length - 1].slice(-2)}`;
    }
    return value;
  };

  return (
    <Card className="border-border bg-card p-2 shadow-md md:p-6">
      <CardContent className="p-0">
        <h3 className="mb-2 text-base font-semibold text-card-foreground font-display md:mb-6 md:text-2xl">
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 290 : isTablet ? 340 : 400}>
          <LineChart
            data={data}
            margin={{
              top: isMobile ? 6 : 8,
              right: isMobile ? 6 : 16,
              left: isMobile ? -14 : 0,
              bottom: isMobile ? 0 : 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={!isMobile} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickFormatter={formatAxisDate}
              minTickGap={isMobile ? 26 : 14}
              tickMargin={isMobile ? 6 : 8}
              interval="preserveStartEnd"
            />
            <YAxis
              scale={isLogScale ? 'log' : 'auto'}
              domain={isLogScale ? ['auto', 'auto'] : undefined}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 34 : 60}
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
            {!isMobile && (
              <Legend
                wrapperStyle={{
                  color: 'hsl(var(--card-foreground))',
                  paddingTop: '20px',
                  paddingBottom: '10px'
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={isMobile ? 2.4 : 2}
              dot={false}
              activeDot={isMobile ? { r: 4 } : { r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;
