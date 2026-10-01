import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PolicyComparisonRequest, PolicyComparisonResponse } from '../types/api';
import { InteractiveChart, ChartSeries } from './InteractiveChart';
import { MetricCard } from './MetricCard';
import {
  Scale,
  Play,
  ShieldAlert,
  Sliders,
  DollarSign,
  HeartPulse,
  Activity,
  Award
} from 'lucide-react';

export const PolicyLabView: React.FC = () => {
  const [population, setPopulation] = useState<number>(1_000_000);
  const [initialInfected, setInitialInfected] = useState<number>(100);
  const [r0Baseline, setR0Baseline] = useState<number>(2.4);
  const [r0Lockdown, setR0Lockdown] = useState<number>(0.85);
  const [days, setDays] = useState<number>(150);
  const [lockdownStart, setLockdownStart] = useState<number>(25);
  const [lockdownDuration, setLockdownDuration] = useState<number>(45);
  const [hospitalCapacity, setHospitalCapacity] = useState<number>(8_000);
  const [pidTargetRt, setPidTargetRt] = useState<number>(0.95);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolicyComparisonResponse | null>(null);

  const runComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: PolicyComparisonRequest = {
        population,
        initial_infected: initialInfected,
        r0_baseline: r0Baseline,
        r0_lockdown: r0Lockdown,
        infectious_period: 7.0,
        mortality_rate: 0.015,
        days,
        lockdown_start_day: lockdownStart,
        lockdown_duration: lockdownDuration,
        adaptive_eval_period: 14,
        pid_target_rt: pidTargetRt,
        pid_kp: 0.08,
        pid_ki: 0.02,
        pid_kd: 0.01,
        hospital_capacity: hospitalCapacity
      };
      const res = await api.comparePolicies(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Policy comparison failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runComparison();
  }, []);

  const trajectories = result?.trajectories;

  // Chart 1: Active Cases with Hospital Capacity Limit
  const activeSeries: ChartSeries[] = trajectories
    ? [
        { id: 'baseline', name: 'Baseline (Do Nothing)', data: trajectories.baseline.I, color: '#94a3b8', strokeWidth: 2, dashed: true },
        { id: 'lockdown', name: `Fixed Lockdown (${lockdownDuration}d)`, data: trajectories.hard_lockdown.I, color: '#f59e0b', strokeWidth: 2.2 },
        { id: 'adaptive', name: 'Adaptive Zoning (Malani et al.)', data: trajectories.adaptive_control.I, color: '#10b981', strokeWidth: 2.8 },
        { id: 'pid', name: 'PID Feedback Control', data: trajectories.pid_controller.I, color: '#6366f1', strokeWidth: 2.5 }
      ]
    : [];

  // Chart 2: Cumulative Deaths
  const deathSeries: ChartSeries[] = trajectories
    ? [
        { id: 'd_base', name: 'Baseline Deaths', data: trajectories.baseline.D, color: '#94a3b8', strokeWidth: 2, dashed: true },
        { id: 'd_lock', name: 'Fixed Lockdown Deaths', data: trajectories.hard_lockdown.D, color: '#f59e0b', strokeWidth: 2 },
        { id: 'd_adapt', name: 'Adaptive Zoning Deaths', data: trajectories.adaptive_control.D, color: '#10b981', strokeWidth: 2.5 },
        { id: 'd_pid', name: 'PID Control Deaths', data: trajectories.pid_controller.D, color: '#6366f1', strokeWidth: 2.5 }
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-400" />
            <span>Policy Lab & Closed-Loop Control Evaluation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Empirical evaluation of non-pharmaceutical interventions (NPIs): Compare the trade-offs between crude lockdowns, Malani et al.'s trigger-based adaptive zoning, and closed-loop PID control.
          </p>
        </div>

        <button
          onClick={runComparison}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Evaluating Scenarios...' : 'Run Policy Benchmark'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Parameters */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
          <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" /> Policy Configurations
          </h3>

          {/* Hospital Bed Threshold */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Healthcare / ICU Bed Capacity</span>
              <span className="font-mono text-rose-400 font-semibold">{hospitalCapacity.toLocaleString()} beds</span>
            </div>
            <input
              type="range"
              min="2000"
              max="25000"
              step="500"
              value={hospitalCapacity}
              onChange={e => setHospitalCapacity(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Lockdown Start Day */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Fixed Lockdown Start Day</span>
              <span className="font-mono text-slate-200 font-semibold">Day {lockdownStart}</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={lockdownStart}
              onChange={e => setLockdownStart(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Lockdown Duration */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Fixed Lockdown Duration</span>
              <span className="font-mono text-slate-200 font-semibold">{lockdownDuration} days</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={lockdownDuration}
              onChange={e => setLockdownDuration(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Strictness Stringency (R_lockdown) */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Lockdown Transmission (R_lockdown)</span>
              <span className="font-mono text-amber-400 font-semibold">{r0Lockdown.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              value={r0Lockdown}
              onChange={e => setR0Lockdown(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* PID Target Rt */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>PID Controller Target Rt</span>
              <span className="font-mono text-emerald-400 font-semibold">{pidTargetRt.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.80"
              max="1.10"
              step="0.01"
              value={pidTargetRt}
              onChange={e => setPidTargetRt(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Key Insights Box */}
          <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-1.5 mt-2">
            <span className="font-semibold text-xs flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-400" /> Research Finding:
            </span>
            <p className="text-[11px] leading-relaxed text-indigo-200/90">
              A temporary hard lockdown often triggers a severe secondary wave upon release. Adaptive control and PID feedback maintain Rt near 1.0, flattening the curve without repeated societal paralysis.
            </p>
          </div>
        </div>

        {/* Right Side: Charts & Comparison Scorecard */}
        <div className="lg:col-span-8 space-y-6">
          {/* Comparative Scorecard Table */}
          {result && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-emerald-400" />
                Intervention Benchmark Scorecard
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-medium">
                      <th className="py-2.5 px-3">Strategy</th>
                      <th className="py-2.5 px-3 text-right">Fatalities</th>
                      <th className="py-2.5 px-3 text-right">Lives Saved</th>
                      <th className="py-2.5 px-3 text-right">Peak Surge</th>
                      <th className="py-2.5 px-3 text-right">ICU Overrun</th>
                      <th className="py-2.5 px-3 text-right">Stringency Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.scorecard.map((row, idx) => {
                      const isAdaptive = row.strategy.includes('Adaptive');
                      const isPID = row.strategy.includes('PID');
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-slate-800/60 font-mono ${
                            isAdaptive || isPID ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: idx === 0 ? '#94a3b8' : idx === 1 ? '#f59e0b' : idx === 2 ? '#10b981' : '#6366f1'
                              }}
                            />
                            {row.strategy}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-200">
                            {row.total_deaths.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                            +{row.deaths_averted.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {row.peak_infected.toLocaleString()}
                            <span className="text-[10px] text-slate-500 ml-1">(-{row.peak_reduction_pct}%)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                row.icu_overrun_days === 0
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {row.icu_overrun_days} days
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-400">
                            {row.lockdown_days} d
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Cases Chart with Hospital Bed Reference Line */}
          {result && (
            <InteractiveChart
              title="Active Infections: Epidemic Curve vs Healthcare Capacity"
              subtitle="Comparing hospital surge profiles under different policy interventions"
              xLabels={result.days}
              series={activeSeries}
              referenceLine={{
                value: hospitalCapacity,
                label: 'ICU / Healthcare Capacity',
                color: '#f43f5e',
                dashed: false
              }}
              yAxisLabel="Active Infected (I)"
              xAxisLabel="Day"
              height={320}
            />
          )}

          {/* Cumulative Fatalities Chart */}
          {result && (
            <InteractiveChart
              title="Cumulative Mortality Trajectory Over Time"
              subtitle="Total deaths averted across policies"
              xLabels={result.days}
              series={deathSeries}
              yAxisLabel="Cumulative Fatalities (D)"
              xAxisLabel="Day"
              height={270}
            />
          )}
        </div>
      </div>
    </div>
  );
};
