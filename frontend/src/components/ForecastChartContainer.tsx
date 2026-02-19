import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

type Direction = 'bullish' | 'bearish' | 'neutral';

function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatCurrency(value: number | null): string {
  if (value === null) return '--';
  return `$${value.toFixed(2)}`;
}

function formatAxisDate(value: string, isMobile: boolean): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', isMobile ? { month: 'numeric', day: 'numeric' } : { month: 'short', day: 'numeric' });
  }
  if (!isMobile) return value;
  const parts = value.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return value;
}

function formatTooltipDate(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return 'Unknown date';
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAxisCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const chartId = useId().replace(/:/g, '');

  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((row) => row && typeof row === 'object');
  }, [data]);

  const summary = useMemo(() => {
    if (!chartData.length) return null;

    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    const startPrice = toNumber(first?.[dataKey]);
    const endPrice = toNumber(last?.[dataKey]);
    if (startPrice === null || endPrice === null || startPrice <= 0) return null;

    const pctChange = ((endPrice - startPrice) / startPrice) * 100;
    const direction: Direction = pctChange > 1 ? 'bullish' : pctChange < -1 ? 'bearish' : 'neutral';

    const lower = areaDataKeyLower ? toNumber(last?.[areaDataKeyLower]) : null;
    const upper = areaDataKeyUpper ? toNumber(last?.[areaDataKeyUpper]) : null;
    const bandWidthPct =
      lower !== null && upper !== null && endPrice > 0 ? Math.abs(((upper - lower) / endPrice) * 100) : null;

    const insiderSignal = toNumber(last?.insider_signal ?? first?.insider_signal ?? 0) ?? 0;
    const insiderLabel =
      insiderSignal > 0.2 ? 'Insider Buying' : insiderSignal < -0.2 ? 'Insider Selling' : 'Neutral Insider';

    return {
      startPrice,
      endPrice,
      pctChange,
      direction,
      lower,
      upper,
      bandWidthPct,
      horizonDays: chartData.length,
      insiderSignal,
      insiderLabel,
      endDate: String(last?.date ?? ''),
    };
  }, [areaDataKeyLower, areaDataKeyUpper, chartData, dataKey]);

  const directionColor =
    summary?.direction === 'bullish' ? '#22c55e' : summary?.direction === 'bearish' ? '#ef4444' : '#f59e0b';

  const yDomain = useMemo<[number, number]>(() => {
    const values: number[] = [];

    chartData.forEach((row) => {
      const main = toNumber(row?.[dataKey]);
      if (main !== null) values.push(main);

      if (areaDataKeyLower) {
        const lower = toNumber(row?.[areaDataKeyLower]);
        if (lower !== null) values.push(lower);
      }
      if (areaDataKeyUpper) {
        const upper = toNumber(row?.[areaDataKeyUpper]);
        if (upper !== null) values.push(upper);
      }

      additionalLines.forEach((line) => {
        const extra = toNumber(row?.[line.dataKey]);
        if (extra !== null) values.push(extra);
      });
    });

    if (!values.length) return [0, 100];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, max * 0.08, 1);
    const pad = span * 0.18;

    return [Math.max(0, min - pad), max + pad];
  }, [additionalLines, areaDataKeyLower, areaDataKeyUpper, chartData, dataKey]);

  const legendItems = useMemo(() => {
    const base: Array<{ label: string; color: string; dashed?: boolean; band?: boolean }> = [
      { label: 'Predicted', color: lineColor },
    ];

    additionalLines.forEach((line) => {
      base.push({ label: line.title, color: line.lineColor, dashed: true });
    });

    if (areaDataKeyLower && areaDataKeyUpper) {
      base.push({ label: 'Confidence Band', color: directionColor, band: true });
    }

    return base;
  }, [additionalLines, areaDataKeyLower, areaDataKeyUpper, directionColor, lineColor]);

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !Array.isArray(payload) || payload.length === 0) return null;

    const row = payload[0]?.payload ?? {};
    const predicted = toNumber(row?.[dataKey]);
    const trendValue = toNumber(row?.trend);
    const seasonalValue = toNumber(row?.seasonal);
    const lower = areaDataKeyLower ? toNumber(row?.[areaDataKeyLower]) : null;
    const upper = areaDataKeyUpper ? toNumber(row?.[areaDataKeyUpper]) : null;

    return (
      <div className="rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-xs text-card-foreground shadow-xl backdrop-blur">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {formatTooltipDate(label)}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-5">
            <span className="text-muted-foreground">Predicted</span>
            <span className="font-semibold">{formatCurrency(predicted)}</span>
          </div>
          {trendValue !== null && (
            <div className="flex items-center justify-between gap-5">
              <span className="text-muted-foreground">Trend</span>
              <span>{formatCurrency(trendValue)}</span>
            </div>
          )}
          {seasonalValue !== null && (
            <div className="flex items-center justify-between gap-5">
              <span className="text-muted-foreground">Seasonal</span>
              <span>{formatCurrency(seasonalValue)}</span>
            </div>
          )}
          {lower !== null && upper !== null && (
            <div className="flex items-center justify-between gap-5">
              <span className="text-muted-foreground">Range</span>
              <span>{formatCurrency(lower)} - {formatCurrency(upper)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const endDateLabel = summary?.endDate ? formatTooltipDate(summary.endDate) : '--';

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/90 p-3 shadow-lg backdrop-blur md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/15 to-transparent" />
      <CardContent className="relative p-0">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3 md:mb-4">
          <h3 className="text-base font-semibold text-card-foreground md:text-2xl">{title}</h3>
          {summary && (
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                borderColor: `${directionColor}55`,
                color: directionColor,
                backgroundColor: `${directionColor}14`,
              }}
            >
              {summary.direction.toUpperCase()} FORECAST
            </span>
          )}
        </div>

        {summary && (
          <div className="mb-3 grid grid-cols-2 gap-2 md:mb-5 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Predicted</p>
              <p className="mt-1 text-sm font-semibold text-card-foreground">{formatCurrency(summary.endPrice)}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Change</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: directionColor }}>
                {summary.pctChange >= 0 ? '+' : ''}{summary.pctChange.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Horizon</p>
              <p className="mt-1 text-sm font-semibold text-card-foreground">{summary.horizonDays} days</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Target Date</p>
              <p className="mt-1 text-sm font-semibold text-card-foreground">{endDateLabel}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Band Width</p>
              <p className="mt-1 text-sm font-semibold text-card-foreground">
                {summary.bandWidthPct !== null ? `${summary.bandWidthPct.toFixed(1)}%` : '--'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Insider Signal</p>
              <p className="mt-1 text-sm font-semibold" style={{ color: summary.insiderSignal > 0 ? '#16a34a' : summary.insiderSignal < 0 ? '#dc2626' : 'hsl(var(--card-foreground))' }}>
                {summary.insiderLabel}
              </p>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={isMobile ? 340 : 430}>
          <ComposedChart data={chartData} margin={{ top: 16, right: 18, left: isMobile ? 0 : 4, bottom: 8 }}>
            <defs>
              <linearGradient id={`forecastStroke-${chartId}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.9} />
                <stop offset="100%" stopColor={directionColor} stopOpacity={0.95} />
              </linearGradient>
              <linearGradient id={`forecastArea-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={directionColor} stopOpacity={0.2} />
                <stop offset="85%" stopColor={directionColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`confidenceFill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={directionColor} stopOpacity={0.26} />
                <stop offset="95%" stopColor={directionColor} stopOpacity={0.04} />
              </linearGradient>
              <filter id={`forecastGlow-${chartId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickMargin={8}
              minTickGap={isMobile ? 18 : 12}
              tickFormatter={(value: string) => formatAxisDate(value, isMobile)}
            />

            <YAxis
              scale={isLogScale ? 'log' : 'auto'}
              domain={isLogScale ? ['auto', 'auto'] : yDomain}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 46 : 66}
              tickFormatter={formatAxisCurrency}
            />

            <Tooltip
              content={renderTooltip}
              cursor={{
                stroke: 'hsl(var(--primary-strong))',
                strokeWidth: 1.2,
                strokeDasharray: '4 4',
                strokeOpacity: 0.8,
              }}
            />

            {areaDataKeyLower && areaDataKeyUpper && (
              <>
                <Area
                  type="monotone"
                  dataKey={areaDataKeyUpper}
                  stroke="none"
                  fill={`url(#confidenceFill-${chartId})`}
                  fillOpacity={1}
                  legendType="none"
                  isAnimationActive
                  animationDuration={700}
                />
                <Area
                  type="monotone"
                  dataKey={areaDataKeyLower}
                  stroke="none"
                  fill="hsl(var(--card))"
                  fillOpacity={1}
                  legendType="none"
                  isAnimationActive
                  animationDuration={700}
                />
              </>
            )}

            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="none"
              fill={`url(#forecastArea-${chartId})`}
              fillOpacity={1}
              legendType="none"
              isAnimationActive
              animationDuration={700}
            />

            {summary && (
              <ReferenceLine
                y={summary.startPrice}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.55}
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            )}

            {summary?.endDate && (
              <ReferenceLine
                x={summary.endDate}
                stroke="hsl(var(--primary-strong))"
                strokeOpacity={0.25}
                strokeDasharray="3 5"
                ifOverflow="extendDomain"
              />
            )}

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={`url(#forecastStroke-${chartId})`}
              strokeWidth={3.2}
              dot={false}
              name="Predicted"
              isAnimationActive
              animationDuration={900}
              filter={`url(#forecastGlow-${chartId})`}
              activeDot={{ r: isMobile ? 4 : 5, fill: directionColor, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
            />

            {additionalLines.map((line, index) => (
              <Line
                key={`${line.dataKey}-${index}`}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.lineColor}
                strokeWidth={1.9}
                strokeDasharray={index === 0 ? '6 4' : '4 4'}
                strokeOpacity={0.9}
                dot={false}
                name={line.title}
                isAnimationActive
                animationDuration={750}
              />
            ))}

            {summary && chartData.length > 0 && (
              <ReferenceDot
                x={chartData[chartData.length - 1]?.date}
                y={summary.endPrice}
                r={isMobile ? 4 : 5}
                fill={directionColor}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                label={
                  isMobile
                    ? undefined
                    : {
                        value: formatCurrency(summary.endPrice),
                        position: 'top',
                        fill: 'hsl(var(--card-foreground))',
                        fontSize: 11,
                        fontWeight: 600,
                      }
                }
                ifOverflow="extendDomain"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground md:text-sm">
          {legendItems.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <span
                className={`inline-block ${item.band ? 'h-2.5 w-5 rounded-sm' : 'h-[3px] w-6 rounded-full'} ${item.dashed ? 'ring-1 ring-offset-1 ring-offset-transparent' : ''}`}
                style={{
                  background: item.band
                    ? `${item.color}33`
                    : item.color,
                  border: item.band ? `1px solid ${item.color}88` : 'none',
                }}
              />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

ForecastChartContainer.displayName = 'ForecastChartContainer';

export default ForecastChartContainer;
