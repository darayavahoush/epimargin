import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NetworkSimulationRequest, NetworkSimulationResponse, NetworkNodeConfig } from '../types/api';
import { InteractiveChart, ChartSeries } from './InteractiveChart';
import { MetricCard } from './MetricCard';
import {
  Network,
  Play,
  Share2,
  MapPin,
  TrendingUp,
  Activity,
  Sliders,
  Calendar
} from 'lucide-react';

const DEFAULT_NODES: NetworkNodeConfig[] = [
  { id: 'node_1', name: 'Central District (Hub)', population: 400_000, initial_infected: 150, r0: 2.5, mobility_out: 0.05, x: 0.0, y: 0.0 },
  { id: 'node_2', name: 'North Suburb', population: 150_000, initial_infected: 10, r0: 2.2, mobility_out: 0.03, x: 0.0, y: 4.0 },
  { id: 'node_3', name: 'East Commercial Town', population: 200_000, initial_infected: 25, r0: 2.3, mobility_out: 0.04, x: 4.5, y: 0.0 },
  { id: 'node_4', name: 'South Industrial Zone', population: 250_000, initial_infected: 15, r0: 2.1, mobility_out: 0.03, x: -3.5, y: -2.5 }
];

export const NetworkSimulatorView: React.FC = () => {
  const [nodes, setNodes] = useState<NetworkNodeConfig[]>(DEFAULT_NODES);
  const [topology, setTopology] = useState<'gravity' | 'ring' | 'hub_and_spoke' | 'fully_connected'>('gravity');
  const [mobilityScale, setMobilityScale] = useState<number>(0.04);
  const [gravityPower, setGravityPower] = useState<number>(1.0);
  const [days, setDays] = useState<number>(90);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NetworkSimulationResponse | null>(null);

  // Time scrubber state for map visualization
  const [scrubDay, setScrubDay] = useState<number>(30);
  const [isPlayingScrubber, setIsPlayingScrubber] = useState<boolean>(false);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: NetworkSimulationRequest = {
        nodes,
        topology,
        gravity_power: gravityPower,
        inter_region_mobility: mobilityScale,
        days,
        random_seed: 42
      };
      const res = await api.simulateNetwork(payload);
      setResult(res);
      setScrubDay(Math.min(scrubDay, res.days.length - 1));
    } catch (err: any) {
      setError(err.message || 'Network simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [topology]);

  // Scrub animation loop
  useEffect(() => {
    let interval: any;
    if (isPlayingScrubber && result) {
      interval = setInterval(() => {
        setScrubDay(prev => (prev + 1) % result.days.length);
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isPlayingScrubber, result]);

  const colors = ['#6366f1', '#ec4899', '#06b6d4', '#eab308', '#10b981'];

  // Chart series: individual district active cases + aggregate
  const series: ChartSeries[] = result
    ? [
        {
          id: 'aggregate',
          name: 'Whole Metapopulation Total',
          data: result.aggregate_I,
          color: '#f43f5e',
          strokeWidth: 3.2
        },
        ...result.nodes.map((node, idx) => ({
          id: node.id,
          name: node.name,
          data: node.I,
          color: colors[idx % colors.length],
          strokeWidth: 1.8,
          dashed: idx > 0
        }))
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <span>Spatial Networked Metapopulation Simulator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulates inter-regional transmission coupling across geographic units using gravity spatial matrices, modeling how epidemic waves cross regional borders.
          </p>
        </div>

        {/* Topology selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Topology:</span>
          <select
            value={topology}
            onChange={e => setTopology(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:border-indigo-500 outline-none"
          >
            <option value="gravity">Gravity Law Matrix (Distance & Pop)</option>
            <option value="hub_and_spoke">Hub & Spoke (Metropolis & Commuters)</option>
            <option value="ring">Circular Ring (Adjacent Neighbors)</option>
            <option value="fully_connected">Fully Connected Uniform</option>
          </select>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Parameters & Matrix */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 text-xs">
            <h3 className="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> Metapopulation Settings
            </h3>

            {/* Mobility Scale Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Inter-District Mobility (Transit Flux)</span>
                <span className="font-mono text-indigo-400 font-semibold">{(mobilityScale * 100).toFixed(1)}% / day</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.15"
                step="0.005"
                value={mobilityScale}
                onChange={e => setMobilityScale(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Gravity Power */}
            {topology === 'gravity' && (
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Distance Decay Exponent (α)</span>
                  <span className="font-mono text-indigo-400 font-semibold">{gravityPower.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={gravityPower}
                  onChange={e => setGravityPower(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {/* Simulation Horizon */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Simulation Horizon (Days)</span>
                <span className="font-mono text-slate-200 font-semibold">{days} days</span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="5"
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg text-xs transition cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Computing Metapopulation...' : 'Recalculate Network'}
            </button>
          </div>

          {/* Migration Flow Matrix Heatmap */}
          {result && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-indigo-400" /> Migration Transmission Matrix (P)
              </h4>
              <p className="text-[11px] text-slate-400">
                P[i, j] defines destination probability flow of infectious individuals between regions.
              </p>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-[11px] text-center font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="p-1.5 text-left text-[10px]">From \ To</th>
                      {result.nodes.map((n, i) => (
                        <th key={i} className="p-1.5 text-[10px] truncate max-w-[50px]">
                          N{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.migration_matrix.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/40">
                        <td className="p-1.5 text-left text-slate-400 text-[10px] font-sans font-medium truncate max-w-[80px]">
                          N{i + 1} ({result.nodes[i].name.split(' ')[0]})
                        </td>
                        {row.map((val, j) => {
                          const intensity = i === j ? 0.15 : Math.min(1, val * 15);
                          return (
                            <td
                              key={j}
                              className="p-1.5 rounded transition-all"
                              style={{
                                backgroundColor: i === j ? '#1e293b' : `rgba(99, 102, 241, ${intensity})`,
                                color: i === j ? '#94a3b8' : '#e2e8f0'
                              }}
                            >
                              {(val * 100).toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Map Scrubber & Time-Series */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary Metric Cards */}
          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <MetricCard
                label="Total Population"
                value={result.summary.total_population.toLocaleString()}
                subtext={`${result.nodes.length} connected districts`}
                badge="Network"
                badgeColor="slate"
                icon={<MapPin className="w-4 h-4 text-slate-400" />}
              />
              <MetricCard
                label="System Peak Load"
                value={result.summary.peak_active_cases.toLocaleString()}
                subtext={`Occurs on Day ${result.summary.peak_day}`}
                badge="Peak Surge"
                badgeColor="rose"
                icon={<Activity className="w-4 h-4 text-rose-400" />}
              />
              <MetricCard
                label="Network Attack Rate"
                value={`${(result.summary.attack_rate * 100).toFixed(1)}%`}
                subtext="Overall infected proportion"
                badge="Spread"
                badgeColor="indigo"
                icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
              />
              <MetricCard
                label="Total Fatalities"
                value={result.summary.total_fatalities.toLocaleString()}
                subtext="Across all districts"
                badge="Mortality"
                badgeColor="amber"
                icon={<Activity className="w-4 h-4 text-amber-400" />}
              />
            </div>
          )}

          {/* Interactive Spatial Map & Day Scrubber */}
          {result && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    Spatial Epidemic Wave Visualization
                  </h3>
                  <p className="text-xs text-slate-400">
                    Day {scrubDay}: Node radius indicates active case volume, color represents localized epidemic intensity.
                  </p>
                </div>

                {/* Scrubber Play / Pause Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingScrubber(!isPlayingScrubber)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition shadow"
                  >
                    <Play className={`w-3.5 h-3.5 ${isPlayingScrubber ? 'rotate-90' : ''}`} />
                    <span>{isPlayingScrubber ? 'Pause' : 'Play Timeline'}</span>
                  </button>
                </div>
              </div>

              {/* Scrubber Slider */}
              <div className="flex items-center gap-3 mb-4 px-2">
                <span className="text-xs font-mono text-slate-400 min-w-[50px]">Day {scrubDay}</span>
                <input
                  type="range"
                  min="0"
                  max={result.days.length - 1}
                  value={scrubDay}
                  onChange={e => setScrubDay(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 min-w-[50px]">Day {result.days.length - 1}</span>
              </div>

              {/* SVG 2D Topology Canvas */}
              <div className="w-full h-64 bg-slate-950/80 rounded-xl border border-slate-800/80 relative flex items-center justify-center p-4">
                <svg viewBox="-6 -5 12 10" className="w-full h-full">
                  {/* Transmission links between nodes */}
                  {result.nodes.map((n1, i) => {
                    const c1 = nodes[i] || { x: 0, y: 0 };
                    return result.nodes.map((n2, j) => {
                      if (i >= j) return null;
                      const c2 = nodes[j] || { x: 0, y: 0 };
                      const flux = result.migration_matrix[i]?.[j] || 0.01;
                      return (
                        <line
                          key={`${i}-${j}`}
                          x1={c1.x || 0}
                          y1={c1.y || 0}
                          x2={c2.x || 0}
                          y2={c2.y || 0}
                          stroke="#334155"
                          strokeWidth={Math.max(0.04, flux * 1.5)}
                          strokeDasharray="0.1 0.1"
                        />
                      );
                    });
                  })}

                  {/* Node circles */}
                  {result.nodes.map((n, i) => {
                    const coord = nodes[i] || { x: 0, y: 0 };
                    const activeNow = n.I[scrubDay] || 0;
                    const popRatio = n.population / 400_000;
                    const radius = Math.max(0.4, Math.min(1.2, 0.4 + (activeNow / (n.population * 0.1)) * 0.7));

                    // Color based on infection rate
                    const rate = activeNow / n.population;
                    const fill = rate > 0.05 ? '#f43f5e' : rate > 0.015 ? '#f59e0b' : '#10b981';

                    return (
                      <g key={n.id} transform={`translate(${coord.x || 0}, ${coord.y || 0})`}>
                        {/* Pulse effect if high rate */}
                        {rate > 0.03 && (
                          <circle r={radius * 1.4} fill={fill} opacity={0.25} />
                        )}
                        <circle
                          r={radius}
                          fill={fill}
                          stroke="#0f172a"
                          strokeWidth="0.1"
                          className="transition-all duration-200"
                        />
                        <text
                          y={radius + 0.45}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="0.45"
                          fontWeight="bold"
                          className="font-sans select-none"
                        >
                          {n.name.split(' ')[0]}
                        </text>
                        <text
                          y={radius + 0.85}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="0.35"
                          className="font-mono select-none"
                        >
                          {Math.round(activeNow).toLocaleString()} active
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Time Series Multi-Line Chart */}
          {result && (
            <InteractiveChart
              title="Metapopulation Active Infections Over Time"
              subtitle="Comparison of disease propagation trajectories across individual connected regions"
              xLabels={result.days}
              series={series}
              yAxisLabel="Active Infected (I)"
              xAxisLabel="Day"
              height={320}
            />
          )}
        </div>
      </div>
    </div>
  );
};
