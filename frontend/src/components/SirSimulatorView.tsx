import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SIRSimulationRequest, SIRSimulationResponse, ModelType } from '../types/api';
import { InteractiveChart, ChartSeries } from './InteractiveChart';
import { MetricCard } from './MetricCard';
import {
  Play,
  RotateCcw,
  Download,
  Users,
  AlertCircle,
  ShieldCheck,
  Skull,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export const SirSimulatorView: React.FC = () => {
  const [modelType, setModelType] = useState<ModelType>('SIR');
  const [population, setPopulation] = useState<number>(1_000_000);
  const [initialInfected, setInitialInfected] = useState<number>(100);
  const [initialExposed, setInitialExposed] = useState<number>(250);
  const [r0, setR0] = useState<number>(2.4);
  const [infectiousPeriod, setInfectiousPeriod] = useState<number>(7.0);
  const [incubationPeriod, setIncubationPeriod] = useState<number>(5.0);
  const [mortalityRate, setMortalityRate] = useState<number>(0.015);
  const [introductionRate, setIntroductionRate] = useState<number>(2.0);
  const [days, setDays] = useState<number>(120);
  const [numMc, setNumMc] = useState<number>(25);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SIRSimulationResponse | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: SIRSimulationRequest = {
        name: 'Metropolitan Region',
        population,
        initial_infected: initialInfected,
        initial_recovered: 0,
        initial_dead: 0,
        initial_exposed: modelType === 'SEIR' ? initialExposed : 0,
        model_type: modelType,
        r0,
        infectious_period: infectiousPeriod,
        incubation_period: incubationPeriod,
        mortality_rate: mortalityRate,
        introduction_rate: introductionRate,
        days,
        num_monte_carlo: numMc,
        confidence_interval: 0.95
      };
      const res = await api.simulateSIR(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation failed to run.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [modelType]);

  const applyPreset = (preset: 'wuhan' | 'delta' | 'omicron' | 'flu') => {
    if (preset === 'wuhan') {
      setModelType('SIR');
      setR0(2.4);
      setInfectiousPeriod(8.0);
      setMortalityRate(0.02);
      setIntroductionRate(2.0);
    } else if (preset === 'delta') {
      setModelType('SEIR');
      setR0(5.0);
      setInfectiousPeriod(6.0);
      setIncubationPeriod(4.0);
      setMortalityRate(0.018);
      setIntroductionRate(5.0);
    } else if (preset === 'omicron') {
      setModelType('SEIR');
      setR0(8.2);
      setInfectiousPeriod(5.0);
      setIncubationPeriod(3.0);
      setMortalityRate(0.003);
      setIntroductionRate(10.0);
    } else if (preset === 'flu') {
      setModelType('SIR');
      setR0(1.4);
      setInfectiousPeriod(4.0);
      setMortalityRate(0.001);
      setIntroductionRate(1.0);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const headers = ['day', 'S', 'I', 'R', 'D', 'dT', 'Rt'];
    if (result.E) headers.splice(2, 0, 'E');

    const rows = result.time.map((t, idx) => {
      const row = [
        t,
        Math.round(result.S[idx]),
        Math.round(result.I[idx]),
        Math.round(result.R[idx]),
        Math.round(result.D[idx]),
        Math.round(result.dT[idx]),
        result.Rt[idx]?.toFixed(3) ?? ''
      ];
      if (result.E) row.splice(2, 0, Math.round(result.E[idx]));
      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `epimargin_${modelType.toLowerCase()}_simulation.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare chart series
  const mainSeries: ChartSeries[] = result
    ? [
        { id: 'I', name: 'Infected (Active I)', data: result.I, color: '#f43f5e', strokeWidth: 2.8 },
        ...(result.E ? [{ id: 'E', name: 'Exposed (E)', data: result.E, color: '#f59e0b', strokeWidth: 2 }] : []),
        { id: 'S', name: 'Susceptible (S)', data: result.S, color: '#6366f1', strokeWidth: 2 },
        { id: 'R', name: 'Recovered (R)', data: result.R, color: '#10b981', strokeWidth: 2 },
        { id: 'D', name: 'Fatalities (D)', data: result.D, color: '#94a3b8', strokeWidth: 2 }
      ]
    : [];

  const confidenceBand = result?.monte_carlo_I_p95 && result?.monte_carlo_I_p05
    ? {
        upper: result.monte_carlo_I_p95,
        lower: result.monte_carlo_I_p05,
        color: '#f43f5e',
        label: '95% Monte Carlo Range (Infected)'
      }
    : undefined;

  const rtSeries: ChartSeries[] = result
    ? [
        { id: 'Rt', name: 'Effective Rt', data: result.Rt, color: '#38bdf8', strokeWidth: 2.5 },
        { id: 'dT', name: 'Daily New Cases', data: result.dT, color: '#eab308', strokeWidth: 1.8, dashed: true }
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* View Header with Presets */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Stochastic Compartmental Model Studio</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {modelType} Architecture
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulates nonlinear transmission dynamics with Poisson stochastic transitions, external viral introductions, and Monte Carlo confidence envelopes.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium mr-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Presets:
          </span>
          <button
            onClick={() => applyPreset('wuhan')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            SARS-CoV-2 (2020)
          </button>
          <button
            onClick={() => applyPreset('delta')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Delta Variant
          </button>
          <button
            onClick={() => applyPreset('omicron')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Omicron Surge
          </button>
          <button
            onClick={() => applyPreset('flu')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Influenza
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls, Right Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Sidebar */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-200 text-sm">Model Parameters</h3>
            {/* Model Type Toggle */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setModelType('SIR')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
                  modelType === 'SIR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SIR
              </button>
              <button
                onClick={() => setModelType('SEIR')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
                  modelType === 'SEIR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                SEIR
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Population */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Total Population (N)</span>
                <span className="font-mono text-indigo-400 font-semibold">{population.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="10000000"
                step="50000"
                value={population}
                onChange={e => setPopulation(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Basic Reproduction Number R0 */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Basic Reproduction No. (R₀)</span>
                <span className="font-mono text-rose-400 font-semibold">{r0.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="10.0"
                step="0.1"
                value={r0}
                onChange={e => setR0(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Infectious Period */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Infectious Period (1/γ days)</span>
                <span className="font-mono text-slate-200 font-semibold">{infectiousPeriod.toFixed(1)} d</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="21.0"
                step="0.5"
                value={infectiousPeriod}
                onChange={e => setInfectiousPeriod(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Incubation Period (SEIR only) */}
            {modelType === 'SEIR' && (
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Latent / Incubation Period (1/σ days)</span>
                  <span className="font-mono text-amber-400 font-semibold">{incubationPeriod.toFixed(1)} d</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="14.0"
                  step="0.5"
                  value={incubationPeriod}
                  onChange={e => setIncubationPeriod(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}

            {/* Mortality Probability */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Case Fatality / Mortality (m)</span>
                <span className="font-mono text-slate-200 font-semibold">{(mortalityRate * 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.08"
                step="0.001"
                value={mortalityRate}
                onChange={e => setMortalityRate(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Initial Seed Infections */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Initial Seed Infected (I₀)</span>
                <span className="font-mono text-slate-200 font-semibold">{initialInfected}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5000"
                step="10"
                value={initialInfected}
                onChange={e => setInitialInfected(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* External Introductions Lambda */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Community Intro Rate (λ / day)</span>
                <span className="font-mono text-slate-200 font-semibold">{introductionRate.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={introductionRate}
                onChange={e => setIntroductionRate(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Horizon & Monte Carlo */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
              <div>
                <label className="text-slate-400 block mb-1">Horizon (Days)</label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">MC Iterations</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={numMc}
                  onChange={e => setNumMc(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Simulating...' : 'Run Simulation'}
            </button>
            <button
              onClick={exportCSV}
              disabled={!result}
              title="Export CSV data"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Right Charts and Summary KPI Cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary KPI Cards */}
          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <MetricCard
                label="Peak Active (I)"
                value={result.summary.peak_infected.toLocaleString()}
                subtext={`Occurs on Day ${result.summary.peak_day}`}
                badge="Max Surge"
                badgeColor="rose"
                icon={<AlertCircle className="w-4 h-4 text-rose-400" />}
              />
              <MetricCard
                label="Attack Rate"
                value={`${(result.summary.final_attack_rate * 100).toFixed(1)}%`}
                subtext={`${result.summary.total_cases.toLocaleString()} cumulative cases`}
                badge="Total Infected"
                badgeColor="indigo"
                icon={<Users className="w-4 h-4 text-indigo-400" />}
              />
              <MetricCard
                label="Herd Immunity"
                value={`${(result.summary.herd_immunity_threshold * 100).toFixed(1)}%`}
                subtext="1 - 1/R₀ threshold"
                badge="Critical Barrier"
                badgeColor="emerald"
                icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
              />
              <MetricCard
                label="Total Fatalities"
                value={result.summary.total_deaths.toLocaleString()}
                subtext={`IFR ~ ${(mortalityRate * 100).toFixed(2)}%`}
                badge="Mortality"
                badgeColor="slate"
                icon={<Skull className="w-4 h-4 text-slate-400" />}
              />
            </div>
          )}

          {/* Primary Compartmental Chart */}
          {result && (
            <InteractiveChart
              title={`Epidemic Progression (${modelType})`}
              subtitle="Stochastic compartmental trajectories with 95% Monte Carlo uncertainty band"
              xLabels={result.time}
              series={mainSeries}
              confidenceBand={confidenceBand}
              yAxisLabel="Population Count"
              xAxisLabel="Day"
              height={320}
            />
          )}

          {/* Secondary Rt and Daily Incident Cases Chart */}
          {result && (
            <InteractiveChart
              title="Effective Reproduction Number (Rt) & Daily Incidence (ΔT)"
              subtitle="Transmission velocity over time: Rt drops below 1.0 as susceptible pool exhausts"
              xLabels={result.time}
              series={rtSeries}
              referenceLine={{ value: 1.0, label: 'Critical Threshold Rt = 1.0', color: '#10b981', dashed: true }}
              yAxisLabel="Reproduction / Cases"
              xAxisLabel="Day"
              height={260}
            />
          )}
        </div>
      </div>
    </div>
  );
};
