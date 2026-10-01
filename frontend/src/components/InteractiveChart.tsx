import React, { useState, useMemo } from 'react';

export interface ChartSeries {
  id: string;
  name: string;
  data: number[];
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
}

export interface ConfidenceBand {
  upper: number[];
  lower: number[];
  color: string;
  label?: string;
}

interface InteractiveChartProps {
  title: string;
  subtitle?: string;
  xLabels: (string | number)[];
  series: ChartSeries[];
  confidenceBand?: ConfidenceBand;
  referenceLine?: { value: number; label: string; color?: string; dashed?: boolean };
  yAxisLabel?: string;
  xAxisLabel?: string;
  height?: number;
  formatY?: (val: number) => string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  title,
  subtitle,
  xLabels,
  series,
  confidenceBand,
  referenceLine,
  yAxisLabel,
  xAxisLabel = 'Days',
  height = 360,
  formatY = (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}k` : v.toLocaleString()
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [disabledSeries, setDisabledSeries] = useState<Set<string>>(new Set());

  const activeSeries = useMemo(() => {
    return series.filter(s => !disabledSeries.has(s.id));
  }, [series, disabledSeries]);

  const toggleSeries = (id: string) => {
    setDisabledSeries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculate Bounds
  const { minVal, maxVal, len } = useMemo(() => {
    let min = 0;
    let max = 1;

    activeSeries.forEach(s => {
      s.data.forEach(val => {
        if (!isNaN(val) && val !== null) {
          if (val > max) max = val;
          if (val < min) min = val;
        }
      });
    });

    if (confidenceBand) {
      confidenceBand.upper.forEach(val => { if (val > max) max = val; });
      confidenceBand.lower.forEach(val => { if (val < min) min = val; });
    }

    if (referenceLine) {
      if (referenceLine.value > max) max = referenceLine.value * 1.1;
      if (referenceLine.value < min) min = referenceLine.value * 0.9;
    }

    // Add 8% ceiling padding
    max = max * 1.08;
    const l = Math.max(1, xLabels.length);

    return { minVal: min, maxVal: max, len: l };
  }, [activeSeries, confidenceBand, referenceLine, xLabels]);

  // Layout constants
  const padLeft = 65;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;
  const chartWidth = 800; // viewBox internal coordinate space

  const scaleX = (i: number) => {
    if (len <= 1) return padLeft;
    return padLeft + (i / (len - 1)) * (chartWidth - padLeft - padRight);
  };

  const scaleY = (val: number) => {
    if (maxVal === minVal) return height / 2;
    const norm = (val - minVal) / (maxVal - minVal);
    return height - padBottom - norm * (height - padTop - padBottom);
  };

  // Generate paths
  const seriesPaths = useMemo(() => {
    return activeSeries.map(s => {
      const pts = s.data.map((val, i) => `${scaleX(i).toFixed(1)},${scaleY(val).toFixed(1)}`);
      return {
        ...s,
        pathD: `M ${pts.join(' L ')}`
      };
    });
  }, [activeSeries, scaleX, scaleY]);

  // Confidence area path
  const confidencePath = useMemo(() => {
    if (!confidenceBand || confidenceBand.upper.length === 0) return null;
    const upperPts = confidenceBand.upper.map((val, i) => `${scaleX(i).toFixed(1)},${scaleY(val).toFixed(1)}`);
    const lowerPts = [...confidenceBand.lower].reverse().map((val, i) => {
      const idx = confidenceBand.lower.length - 1 - i;
      return `${scaleX(idx).toFixed(1)},${scaleY(val).toFixed(1)}`;
    });
    return `M ${upperPts.join(' L ')} L ${lowerPts.join(' L ')} Z`;
  }, [confidenceBand, scaleX, scaleY]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const val = minVal + (i / count) * (maxVal - minVal);
      ticks.push({
        val,
        y: scaleY(val)
      });
    }
    return ticks;
  }, [minVal, maxVal, scaleY]);

  // X-axis ticks (sample 6 evenly spaced)
  const xTicks = useMemo(() => {
    if (len <= 1) return [];
    const count = Math.min(6, len);
    const step = Math.floor((len - 1) / (count - 1));
    const result = [];
    for (let i = 0; i < len; i += step) {
      result.push({ idx: i, label: String(xLabels[i]), x: scaleX(i) });
      if (result.length >= count) break;
    }
    return result;
  }, [len, xLabels, scaleX]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm flex flex-col">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend Series Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {confidenceBand && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: confidenceBand.color, opacity: 0.35 }} />
              {confidenceBand.label || '95% Uncertainty Band'}
            </span>
          )}
          {series.map(s => {
            const isOff = disabledSeries.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSeries(s.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer border ${
                  isOff
                    ? 'bg-slate-800/40 text-slate-500 border-slate-800/80 opacity-60 line-through'
                    : 'bg-slate-800 text-slate-200 border-slate-700/80 shadow-sm'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const approxIdx = Math.round(relX * (len - 1));
            setHoverIndex(Math.max(0, Math.min(len - 1, approxIdx)));
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={confidenceBand?.color || '#6366f1'} stopOpacity={0.25} />
              <stop offset="100%" stopColor={confidenceBand?.color || '#6366f1'} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={t.y}
                x2={chartWidth - padRight}
                y2={t.y}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padLeft - 10}
                y={t.y + 4}
                textAnchor="end"
                className="text-[11px] fill-slate-400 font-mono"
              >
                {formatY(t.val)}
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {xTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x}
                y1={height - padBottom}
                x2={t.x}
                y2={height - padBottom + 5}
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x={t.x}
                y={height - padBottom + 18}
                textAnchor="middle"
                className="text-[11px] fill-slate-400 font-mono"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          {yAxisLabel && (
            <text
              transform={`rotate(-90)`}
              x={-((height - padTop - padBottom) / 2 + padTop)}
              y={16}
              textAnchor="middle"
              className="text-[11px] fill-slate-500 font-medium tracking-wide uppercase"
            >
              {yAxisLabel}
            </text>
          )}

          {/* Confidence Area */}
          {confidencePath && (
            <path d={confidencePath} fill="url(#bandGrad)" />
          )}

          {/* Reference Line */}
          {referenceLine && (
            <g>
              <line
                x1={padLeft}
                y1={scaleY(referenceLine.value)}
                x2={chartWidth - padRight}
                y2={scaleY(referenceLine.value)}
                stroke={referenceLine.color || '#ef4444'}
                strokeWidth="1.5"
                strokeDasharray={referenceLine.dashed !== false ? '6 4' : undefined}
              />
              <text
                x={chartWidth - padRight}
                y={scaleY(referenceLine.value) - 6}
                textAnchor="end"
                fill={referenceLine.color || '#ef4444'}
                className="text-[10px] font-semibold tracking-wide"
              >
                {referenceLine.label} ({formatY(referenceLine.value)})
              </text>
            </g>
          )}

          {/* Series Curves */}
          {seriesPaths.map(s => (
            <path
              key={s.id}
              d={s.pathD}
              fill="none"
              stroke={s.color}
              strokeWidth={s.strokeWidth || 2.2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              className="transition-all duration-150"
            />
          ))}

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < len && (
            <g>
              <line
                x1={scaleX(hoverIndex)}
                y1={padTop}
                x2={scaleX(hoverIndex)}
                y2={height - padBottom}
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {activeSeries.map(s => {
                const val = s.data[hoverIndex];
                if (val === undefined || isNaN(val)) return null;
                return (
                  <circle
                    key={s.id}
                    cx={scaleX(hoverIndex)}
                    cy={scaleY(val)}
                    r="4.5"
                    fill={s.color}
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Tooltip Box */}
        {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < len && (
          <div
            className="absolute top-2 pointer-events-none bg-slate-950/95 border border-slate-700/80 rounded-lg p-3 shadow-2xl backdrop-blur-md text-xs z-20 min-w-[170px]"
            style={{
              left: `${Math.min(78, Math.max(18, (scaleX(hoverIndex) / chartWidth) * 100))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-1.5 flex justify-between items-center">
              <span>{xAxisLabel}: {xLabels[hoverIndex]}</span>
              <span className="text-[10px] text-slate-500 font-mono">idx: {hoverIndex}</span>
            </div>
            <div className="space-y-1">
              {activeSeries.map(s => {
                const val = s.data[hoverIndex];
                if (val === undefined || isNaN(val)) return null;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}:
                    </span>
                    <span className="font-mono font-medium text-slate-100">
                      {formatY(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
