import React from 'react';
import {
  Activity,
  Network,
  Scale,
  Syringe,
  LineChart,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  GitBranch
} from 'lucide-react';

export type TabKey = 'sir' | 'network' | 'policy' | 'vaccine' | 'rt' | 'methodology';

interface NavbarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  backendOnline: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  backendOnline
}) => {
  const tabs = [
    { key: 'sir', label: 'SIR / SEIR Studio', icon: Activity },
    { key: 'network', label: 'Spatial Network', icon: Network },
    { key: 'policy', label: 'Policy Lab (Adaptive/PID)', icon: Scale },
    { key: 'vaccine', label: 'Vaccine Allocator', icon: Syringe },
    { key: 'rt', label: 'Empirical Rt Engine', icon: LineChart },
    { key: 'methodology', label: 'Research & Papers', icon: BookOpen }
  ] as const;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">EpiMargin</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v1.0 Research
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Epidemiological Modeling & Policy Simulation Engine
              </p>
            </div>
          </div>

          {/* Right Status & Meta */}
          <div className="flex items-center gap-3">
            {backendOnline === true && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                API Connected
              </span>
            )}
            {backendOnline === false && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                API Offline (Start Backend)
              </span>
            )}

            <a
              href="https://github.com/COVID-IWG/epimargin"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Research Repo</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = currentTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onSelectTab(t.key as TabKey)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
