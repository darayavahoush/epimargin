import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VaccinePrioritizationRequest, VaccinePrioritizationResponse } from '../types/api';
import { InteractiveChart, ChartSeries } from './InteractiveChart';
import { MetricCard } from './MetricCard';
import {
  Syringe,
  Play,
  Heart,
  Users,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

export const VaccineLabView: React.FC = () => {
  const [population, setPopulation] = useState<number>(1_000_000);
  const [dailyDoses, setDailyDoses] = useState<number>(3_500);
  const [vaccineEfficacy, setVaccineEfficacy] = useState<number>(0.85);
  const [r0, setR0] = useState<number>(2.3);
  const [days, setDays] = useState<number>(160);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VaccinePrioritizationResponse | null>(null);

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: VaccinePrioritizationRequest = {
        population,
        daily_doses: dailyDoses,
        vaccine_efficacy: vaccineEfficacy,
        r0,
        infectious_period: 7.0,
        initial_infected: 200,
        days
      };
      const res = await api.evaluateVaccines(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Vaccine evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, []);

  const strategies = result?.strategies;

  // Chart 1: Mortality trajectories
  const deathSeries: ChartSeries[] = strategies
    ? [
        {
          id: 'random_d',
          name: 'Random Proportional Allocation',
          data: strategies.random.D_total,
          color: '#94a3b8',
          strokeWidth: 2,
          dashed: true
        },
        {
          id: 'eld_d',
          name: 'Elderly-First (Direct Mortality Protection)',
          data: strategies.elderly_first.D_total,
          color: '#10b981',
          strokeWidth: 2.8
        },
        {
          id: 'cont_d',
          name: 'High-Contact First (Workforce 20-49)',
          data: strategies.contact_first.D_total,
          color: '#6366f1',
          strokeWidth: 2.2
        }
      ]
    : [];

  // Chart 2: Active Infections
  const infectionSeries: ChartSeries[] = strategies
    ? [
        {
          id: 'random_i',
          name: 'Random Allocation (Active Cases)',
          data: strategies.random.I_total,
          color: '#94a3b8',
          strokeWidth: 1.8,
          dashed: true
        },
        {
          id: 'eld_i',
          name: 'Elderly-First (Active Cases)',
          data: strategies.elderly_first.I_total,
          color: '#10b981',
          strokeWidth: 2.2
        },
        {
          id: 'cont_i',
          name: 'High-Contact First (Active Cases)',
          data: strategies.contact_first.I_total,
          color: '#6366f1',
          strokeWidth: 2.8
        }
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Syringe className="w-5 h-5 text-indigo-400" />
            <span>Age-Stratified Vaccine Allocation Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Based on Bubar et al. (Science 2021): Evaluates the fundamental epidemiological trade-off between direct mortality protection (elderly-first) versus indirect transmission interruption (contact-heavy workforce).
          </p>
        </div>

        <button
          onClick={runEvaluation}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Evaluating Strategies...' : 'Run Vaccine Evaluation'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Parameters & Demographic Table */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
            <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2">
              Rollout Parameters
            </h3>

            {/* Daily Doses */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Daily Doses Capacity</span>
                <span className="font-mono text-indigo-400 font-semibold">{dailyDoses.toLocaleString()} doses / day</span>
              </div>
              <input
                type="range"
                min="500"
                max="15000"
                step="250"
                value={dailyDoses}
                onChange={e => setDailyDoses(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Vaccine Efficacy */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Vaccine Efficacy (v_e)</span>
                <span className="font-mono text-emerald-400 font-semibold">{(vaccineEfficacy * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={vaccineEfficacy}
                onChange={e => setVaccineEfficacy(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Pathogen R0 */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Pathogen Transmissibility (R₀)</span>
                <span className="font-mono text-rose-400 font-semibold">{r0.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="1.4"
                max="4.0"
                step="0.1"
                value={r0}
                onChange={e => setR0(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Demographic Cohorts Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Demographic Cohorts & Contact Weight
            </h4>

            <div className="overflow-x-auto pt-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 px-2">Age Cohort</th>
                    <th className="py-1.5 px-2 text-right">Pop %</th>
                    <th className="py-1.5 px-2 text-right">IFR</th>
                    <th className="py-1.5 px-2 text-right">Contacts</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[11px]">
                  <tr className="border-b border-slate-800/40">
                    <td className="py-1.5 px-2 font-sans text-slate-300">0 - 19</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">25%</td>
                    <td className="py-1.5 px-2 text-right text-emerald-400">0.01%</td>
                    <td className="py-1.5 px-2 text-right text-slate-300">0.8x</td>
                  </tr>
                  <tr className="border-b border-slate-800/40">
                    <td className="py-1.5 px-2 font-sans text-slate-300">20 - 49 (Workforce)</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">45%</td>
                    <td className="py-1.5 px-2 text-right text-slate-300">0.20%</td>
                    <td className="py-1.5 px-2 text-right text-indigo-400 font-semibold">1.4x (High)</td>
                  </tr>
                  <tr className="border-b border-slate-800/40">
                    <td className="py-1.5 px-2 font-sans text-slate-300">50 - 64</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">18%</td>
                    <td className="py-1.5 px-2 text-right text-amber-400">1.50%</td>
                    <td className="py-1.5 px-2 text-right text-slate-300">0.9x</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 font-sans text-slate-300">65+ (Elderly)</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">12%</td>
                    <td className="py-1.5 px-2 text-right text-rose-400 font-semibold">6.50% (High)</td>
                    <td className="py-1.5 px-2 text-right text-slate-300">0.6x</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              Mortality escalates exponentially with age, whereas community transmission is overwhelmingly sustained by social contacts of young adults.
            </p>
          </div>
        </div>

        {/* Right Side: Charts & Analysis */}
        <div className="lg:col-span-8 space-y-6">
          {/* Key Findings Card */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <MetricCard
                label="Elderly-First Lives Saved"
                value={`+${result.strategies.elderly_first.deaths_averted_vs_random.toLocaleString()}`}
                subtext="Compared to random assignment"
                badge="Max Lives Saved"
                badgeColor="emerald"
                icon={<Heart className="w-4 h-4 text-emerald-400" />}
              />
              <MetricCard
                label="High-Contact Cases Averted"
                value={`+${Math.max(0, result.strategies.contact_first.infections_averted_vs_random).toLocaleString()}`}
                subtext="Infections stopped at source"
                badge="Transmission Break"
                badgeColor="indigo"
                icon={<Zap className="w-4 h-4 text-indigo-400" />}
              />
              <MetricCard
                label="Rollout Coverage"
                value={`${((dailyDoses * days / population) * 100).toFixed(0)}%`}
                subtext={`${(dailyDoses * days).toLocaleString()} doses administered`}
                badge="Coverage"
                badgeColor="slate"
                icon={<ShieldCheck className="w-4 h-4 text-slate-400" />}
              />
            </div>
          )}

          {/* Cumulative Deaths Chart */}
          {result && (
            <InteractiveChart
              title="Cumulative Fatalities Across Prioritization Strategies"
              subtitle="Elderly-First allocation cuts deaths directly due to the steep age-gradient in IFR"
              xLabels={result.days}
              series={deathSeries}
              yAxisLabel="Cumulative Deaths (D)"
              xAxisLabel="Day"
              height={300}
            />
          )}

          {/* Active Cases Chart */}
          {result && (
            <InteractiveChart
              title="Active Infections Over Time (Viral Spread)"
              subtitle="Workforce-First prioritization suppresses community transmission fastest"
              xLabels={result.days}
              series={infectionSeries}
              yAxisLabel="Active Infections (I)"
              xAxisLabel="Day"
              height={270}
            />
          )}

          {/* Summary Box */}
          {result && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {result.summary_analysis}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
