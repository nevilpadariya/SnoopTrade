import React, { useEffect, useId, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from './ui/card';

interface PieChartContainerProps {
  title: string;
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
}

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
  const gradientPrefix = useId().replace(/:/g, '');
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const formatLegendValue = (value: string) => TRANSACTION_NAMES[value] || value;

  const safeData = useMemo(
    () => data.filter((item) => Number(item?.[dataKey]) > 0),
    [data, dataKey],
  );

  const isSingleSlice = safeData.length === 1;
  const chartData = safeData.length > 0 ? safeData : [{ [nameKey]: 'No data', [dataKey]: 1 }];
  const showLegend = safeData.length > 0;
  const totalValue = safeData.reduce((sum, item) => sum + Number(item?.[dataKey] ?? 0), 0);

  const legendItems = useMemo(
    () =>
      safeData.map((entry, index) => ({
        key: String(entry?.[nameKey] ?? `item-${index}`),
        label: formatLegendValue(String(entry?.[nameKey] ?? '')),
        color: colors[index % colors.length],
      })),
    [colors, nameKey, safeData],
  );

  return (
    <Card className="border-border/50 bg-card/80 p-3 shadow-lg backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl md:p-6">
      <CardContent className="p-0">
        <h3 className="mb-2 text-sm font-semibold text-card-foreground font-display md:mb-4 md:text-xl">{title}</h3>

        <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
          <PieChart margin={{ top: 4, right: 6, left: 6, bottom: 4 }}>
            <defs>
              {colors.map((color, index) => (
                <linearGradient
                  key={`${gradientPrefix}-gradient-${index}`}
                  id={`${gradientPrefix}-gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.72} />
                </linearGradient>
              ))}
            </defs>

            <Pie
              data={chartData}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy={isMobile ? '50%' : '48%'}
              innerRadius={isMobile ? 42 : 54}
              outerRadius={isMobile ? 78 : 100}
              startAngle={90}
              endAngle={-270}
              paddingAngle={isSingleSlice ? 0 : 3}
              label={false}
              labelLine={false}
              animationBegin={0}
              animationDuration={850}
              animationEasing="ease-out"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    safeData.length > 0
                      ? `url(#${gradientPrefix}-gradient-${index % colors.length})`
                      : 'hsl(var(--muted))'
                  }
                  stroke={isSingleSlice ? 'transparent' : 'hsl(var(--card))'}
                  strokeWidth={isSingleSlice ? 0 : 2}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                />
              ))}
            </Pie>

            {showLegend && (
              <>
                <text
                  x="50%"
                  y={isMobile ? '49%' : '47%'}
                  textAnchor="middle"
                  fill="hsl(var(--card-foreground))"
                  fontSize={isMobile ? 16 : 18}
                  fontWeight={700}
                >
                  {totalValue.toLocaleString()}
                </text>
                <text
                  x="50%"
                  y={isMobile ? '56%' : '54%'}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 11}
                >
                  Total
                </text>
              </>
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                color: 'hsl(var(--card-foreground))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                padding: '12px 16px',
              }}
              itemStyle={{ color: 'hsl(var(--card-foreground))' }}
              formatter={(value: number | string, name: string) => [Number(value).toLocaleString(), formatLegendValue(name)]}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {showLegend && (
          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {legendItems.map((item) => (
              <li key={item.key} className="inline-flex items-center gap-2 text-sm text-card-foreground">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="leading-none">{item.label}</span>
              </li>
            ))}
          </ul>
        )}

        {!showLegend && (
          <p className="mt-2 text-xs text-muted-foreground">No distribution data available for this selection.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PieChartContainer;
