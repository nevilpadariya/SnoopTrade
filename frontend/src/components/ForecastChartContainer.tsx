import React, { useState, useEffect, useMemo } from 'react';
import { 
  ComposedChart,
  Line, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Area,
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

const ForecastChartContainer: React.FC<ForecastChartContainerProps> = React.memo(({
  title,
  data,
  dataKey,
  lineColor,
  isLogScale,
  additionalLines = [],
  areaDataKeyLower,
  areaDataKeyUpper,
}) => {
  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Compute summary stats
  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;

    const first = data[0];
    const last = data[data.length - 1];
    const startPrice = first?.[dataKey] ?? 0;
    const endPrice = last?.[dataKey] ?? 0;
    const pctChange = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
    const direction = pctChange > 1 ? 'bullish' : pctChange < -1 ? 'bearish' : 'neutral';
    const insiderSignal = first?.insider_signal ?? 0;
    const insiderLabel = insiderSignal > 0.2 ? 'Insider Buying' : insiderSignal < -0.2 ? 'Insider Selling' : 'Neutral';

    return {
      startPrice: startPrice.toFixed(2),
      endPrice: endPrice.toFixed(2),
      pctChange: pctChange.toFixed(1),
      direction,
      insiderLabel,
      insiderSignal,
      days: data.length,
    };
  }, [data, dataKey]);

  // Prepare chart data — compute band height for the shaded area
  const chartData = useMemo(() => {
    if (!data || !areaDataKeyLower || !areaDataKeyUpper) return data;
    return data.map((d: any) => ({
      ...d,
      _bandRange: [d[areaDataKeyLower], d[areaDataKeyUpper]],
    }));
  }, [data, areaDataKeyLower, areaDataKeyUpper]);

  const directionColor = summary?.direction === 'bullish'
    ? '#22c55e'
    : summary?.direction === 'bearish'
      ? '#ef4444'
      : 'hsl(var(--muted-foreground))';

  return (
    <Card className="p-3 md:p-6 bg-card border-border shadow-md">
      <CardContent className="p-0">
        <h3 className="text-base md:text-2xl font-semibold mb-2 md:mb-4 text-card-foreground font-display">
          {title}
        </h3>

        {/* Summary stats bar */}
        {summary && (
          <div className="flex flex-wrap gap-3 md:gap-6 mb-3 md:mb-5 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Predicted:</span>
              <span className="font-semibold text-card-foreground">${summary.endPrice}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Change:</span>
              <span className="font-semibold" style={{ color: directionColor }}>
                {Number(summary.pctChange) > 0 ? '+' : ''}{summary.pctChange}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: directionColor }}
              />
              <span className="font-medium capitalize" style={{ color: directionColor }}>
                {summary.direction}
              </span>
            </div>
            {summary.insiderSignal !== 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Insider:</span>
                <span className="font-medium" style={{
                  color: summary.insiderSignal > 0 ? '#22c55e' : '#ef4444'
                }}>
                  {summary.insiderLabel}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{summary.days}-day forecast</span>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={isMobile ? 320 : 400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickFormatter={isMobile ? (v: string) => { const parts = v.split(' '); return parts.length >= 2 ? `${parts[0].substring(0,3)} ${parts[parts.length-1].substring(2)}` : v; } : undefined}
            />
            <YAxis 
              scale={isLogScale ? 'log' : 'auto'} 
              domain={isLogScale ? ['auto', 'auto'] : ['dataMin - 5', 'dataMax + 5']} 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 50 : 70}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
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
              formatter={(value: number, name: string) => {
                const label = name === dataKey ? 'Predicted' : name === 'trend' ? 'Trend' : name;
                return [`$${value.toFixed(2)}`, label];
              }}
            />
            <Legend 
              wrapperStyle={{ 
                color: 'hsl(var(--card-foreground))',
                paddingTop: '20px',
                paddingBottom: '10px'
              }}
            />
            
            {/* Confidence band — shaded area between lower and upper bounds */}
            {areaDataKeyLower && areaDataKeyUpper && (
              <>
                <Area
                  type="monotone"
                  dataKey={areaDataKeyUpper}
                  stroke="none"
                  fill={lineColor}
                  fillOpacity={0.12}
                  name="Upper Bound"
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey={areaDataKeyLower}
                  stroke="none"
                  fill="hsl(var(--card))"
                  fillOpacity={1}
                  name="Lower Bound"
                  legendType="none"
                />
              </>
            )}
            
            {/* Main prediction line */}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={3}
              dot={false}
              name="Predicted Price"
            />
            
            {/* Additional lines (trend, etc.) */}
            {additionalLines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.lineColor}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={line.title}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

ForecastChartContainer.displayName = 'ForecastChartContainer';

export default ForecastChartContainer;
