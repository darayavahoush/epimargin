import React, { useState, useEffect } from 'react';
import { Navbar, TabKey } from './components/Navbar';
import { SirSimulatorView } from './components/SirSimulatorView';
import { NetworkSimulatorView } from './components/NetworkSimulatorView';
import { PolicyLabView } from './components/PolicyLabView';
import { VaccineLabView } from './components/VaccineLabView';
import { RtEstimatorView } from './components/RtEstimatorView';
import { MethodologyView } from './components/MethodologyView';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabKey>('sir');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Ping backend health
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await api.checkHealth();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        backendOnline={backendOnline}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'sir' && <SirSimulatorView />}
        {currentTab === 'network' && <NetworkSimulatorView />}
        {currentTab === 'policy' && <PolicyLabView />}
        {currentTab === 'vaccine' && <VaccineLabView />}
        {currentTab === 'rt' && <RtEstimatorView />}
        {currentTab === 'methodology' && <MethodologyView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            EpiMargin Platform · Epidemiological Modeling, Policy Optimization & Bayesian Rt Estimation
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            Open-source MIT License · Built for Academic Research & Quantitative Engineering
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
