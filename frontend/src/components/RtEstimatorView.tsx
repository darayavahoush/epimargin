import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RtEstimationRequest, RtEstimationResponse, DatasetPreset } from '../types/api';
import { InteractiveChart, ChartSeries } from './InteractiveChart';
import { MetricCard } from './MetricCard';
import {
  LineChart,
  Play,
  Database,
  Sliders,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  FileText
} from 'lucide-react';

export const RtEstimatorView: React.FC = () => {
  const [presets, setPresets] = useState<DatasetPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('mumbai_wave_2');
  const [smoothingWindow, setSmoothingWindow] = useState<number>(7);
  const [infectiousPeriod, setInfectiousPeriod] = useState<number>(7.0);
  const [confidenceInterval, setConfidenceInterval] = useState<number>(0.95);

  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customCsvInput, setCustomCsvInput] = useState<string>(
    '25, 32, 40, 55, 70, 95, 120, 160, 210, 280, 360, 480, 620, 780, 950, 1100, 1250, 1320, 1290, 1180, 1020, 890, 740, 610, 500, 420, 350, 300'
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RtEstimationResponse | null>(null);

  useEffect(() => {
    api.getPresets().then(setPresets).catch(() => {});
  }, []);

  const runEstimation = async () => {
    setLoading(true);
    setError(null);
    try {
      let payload: RtEstimationRequest = {
        infectious_period: infectiousPeriod,
        smoothing_window: smoothingWindow,
        confidence_interval: confidenceInterval,
        variance_shift: 0.99
      };

      if (customMode) {
        const parsed = customCsvInput
          .split(/[\n,]+/)
          .map(s => parseFloat(s.trim()))
          .filter(n => !isNaN(n));
        if (parsed.length < 10) {
          throw new Error('Please provide at least 10 daily case numbers.');
        }
        const dates = parsed.map((_, i) => `Day ${i + 1}`);
        payload.dates = dates;
        payload.cases = parsed;
      } else {
        payload.dataset_preset = selectedPreset;
      }

      const res = await api.estimateRt(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Rt estimation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEstimation();
  }, [selectedPreset, customMode]);

  // Chart 1: Raw Cases vs Smoothed
  const casesSeries: ChartSeries[] = result
    ? [
        {
          id: 'raw',
          name: 'Raw Reported Daily Cases',
          data: result.raw_cases,
          color: '#94a3b8',
          strokeWidth: 1.5,
          dashed: true
        },
        {
          id: 'smoothed',
          name: 'Notch-Filtered / Smoothed Cases',
          data: result.smoothed_cases,
          color: '#6366f1',
          strokeWidth: 2.8
        }
      ]
    : [];

  // Chart 2: Estimated Rt with 95% Credible Interval
  const rtSeries: ChartSeries[] = result
    ? [
        {
          id: 'rt',
          name: 'Estimated Reproduction Number (Rt)',
          data: result.rt_estimates,
          color: '#38bdf8',
          strokeWidth: 2.8
        }
      ]
    : [];

  const confidenceBand = result
    ? {
        upper: result.rt_ci_upper,
        lower: result.rt_ci_lower,
        color: '#38bdf8',
        label: '95% Bayesian Credible Interval'
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-indigo-400" />
            <span>Empirical Rt Estimation Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Bettencourt & Soman MPVS
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Calculates time-varying reproduction numbers ($R_t$) from surveillance time series with Gamma conjugate prior filtering, negative binomial anomaly detection, and variance annealing.
          </p>
        </div>

        {/* Input Mode Switch */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setCustomMode(false)}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition ${
              !customMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Curated Presets
          </button>
          <button
            onClick={() => setCustomMode(true)}
            className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition ${
              customMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom CSV Input
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Data Selector & Filter Controls */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
          <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" /> Dataset & Filter Settings
          </h3>

          {!customMode ? (
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Select Empirical Outbreak Dataset</label>
              <select
                value={selectedPreset}
                onChange={e => setSelectedPreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:border-indigo-500 outline-none"
              >
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {presets.find(p => p.id === selectedPreset)?.description}
              </p>
            </div>
          ) : (
            <div>
              <label className="text-slate-300 block mb-1 font-medium">Paste Daily Cases (Comma or Newline)</label>
              <textarea
                rows={5}
                value={customCsvInput}
                onChange={e => setCustomCsvInput(e.target.value)}
                placeholder="e.g. 10, 15, 22, 35, 50, 75, 110, ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:border-indigo-500 outline-none resize-none"
              />
            </div>
          )}

          {/* Smoothing Window */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Filter Smoothing Window</span>
              <span className="font-mono text-indigo-400 font-semibold">{smoothingWindow} days</span>
            </div>
            <input
              type="range"
              min="3"
              max="14"
              step="1"
              value={smoothingWindow}
              onChange={e => setSmoothingWindow(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500">
              Notched filter removes 7-day and 3.5-day weekend testing cycles.
            </span>
          </div>

          {/* Assumed Infectious Period */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Serial / Infectious Interval (1/γ)</span>
              <span className="font-mono text-slate-200 font-semibold">{infectiousPeriod.toFixed(1)} days</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="14.0"
              step="0.5"
              value={infectiousPeriod}
              onChange={e => setInfectiousPeriod(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <button
            onClick={runEstimation}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Estimating Bayesian Rt...' : 'Re-estimate Rt'}
          </button>

          {/* Anomaly Alerts */}
          {result && result.anomalies.length > 0 && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Detected Data Reporting Anomalies ({result.anomalies.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {result.anomalies.map((anom, idx) => (
                  <div key={idx} className="text-[11px] bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
                    <span className="font-mono font-medium text-amber-200">{anom.date}</span>: {anom.reason} ({Math.round(anom.raw_value).toLocaleString()} cases)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Charts & Status */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status KPI Cards */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <MetricCard
                label="Current Reproduction No."
                value={`Rt = ${result.current_rt.toFixed(2)}`}
                subtext="Latest estimated value"
                badge={result.current_rt > 1.0 ? 'Accelerating' : 'Decelerating'}
                badgeColor={result.current_rt > 1.0 ? 'rose' : 'emerald'}
                icon={result.current_rt > 1.0 ? <TrendingUp className="w-4 h-4 text-rose-400" /> : <TrendingDown className="w-4 h-4 text-emerald-400" />}
              />
              <MetricCard
                label="Epidemic Status"
                value={result.current_rt > 1.0 ? 'Expanding' : 'Contracting'}
                subtext={result.epidemic_status}
                badge="Diagnostic"
                badgeColor={result.current_rt > 1.0 ? 'amber' : 'emerald'}
                icon={<Activity className="w-4 h-4 text-indigo-400" />}
              />
              <MetricCard
                label="Timeseries Length"
                value={`${result.dates.length} days`}
                subtext={`Window: ${smoothingWindow}d notched filter`}
                badge="Surveillance"
                badgeColor="slate"
                icon={<Database className="w-4 h-4 text-slate-400" />}
              />
            </div>
          )}

          {/* Chart 1: Estimated Rt with Credible Interval */}
          {result && (
            <InteractiveChart
              title="Time-Varying Reproduction Number (Rt) with 95% Credible Interval"
              subtitle="Analytical MPVS posterior distribution: epidemic expands when Rt > 1.0"
              xLabels={result.dates}
              series={rtSeries}
              confidenceBand={confidenceBand}
              referenceLine={{
                value: 1.0,
                label: 'Critical Threshold Rt = 1.0',
                color: '#f43f5e',
                dashed: false
              }}
              yAxisLabel="Reproduction Rate (Rt)"
              xAxisLabel="Date / Day"
              height={310}
            />
          )}

          {/* Chart 2: Raw vs Smoothed Cases */}
          {result && (
            <InteractiveChart
              title="Reported Incident Cases & Filtered Signal"
              subtitle="Raw surveillance reports vs 7-day notch-filtered signal removing day-of-week reporting artifacts"
              xLabels={result.dates}
              series={casesSeries}
              yAxisLabel="Daily Case Count"
              xAxisLabel="Date / Day"
              height={270}
            />
          )}
        </div>
      </div>
    </div>
  );
};
