import React from 'react';
import { BookOpen, Layers, ShieldCheck, Cpu, Database, Award } from 'lucide-react';

export const MethodologyView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto text-slate-200">
      {/* View Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Mathematical & Methodological Foundations</h2>
            <p className="text-xs text-slate-400">
              Theoretical derivations, difference equations, and peer-reviewed scientific literature underpinning the EpiMargin engine.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Stochastic Poisson SIR/SEIR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-base border-b border-slate-800 pb-2">
          <Layers className="w-4 h-4" />
          <span>1. Stochastic Forward Simulation Dynamics</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Standard deterministic ODEs assume infinite, homogeneous populations and produce smooth curves. In reality, infectious disease transmission is inherently stochastic, discrete, and subject to demographic fluctuations and external viral introductions. EpiMargin simulates transmission as coupled Poisson processes at discrete daily timesteps:
        </p>

        <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-indigo-200 border border-slate-800/80 space-y-2">
          <div>{'ΔT(t) ~ Poisson( max(0, b(t-1) · ΔT(t-1) + [1 - b(t-1) + γ · b(t-1) · R(t)] · ΔB(t) ) )'}</div>
          <div>{'b(t) = exp( γ · [R(t) - 1] ),    R(t) = R₀ · ( S(t) / N(t) )'}</div>
          <div>{'ΔD(t) ~ Poisson( m · γ · I(t) ),    ΔR(t) ~ Poisson( (1 - m) · γ · I(t) )'}</div>
          <div>{'S(t+1) = S(t) - ΔT(t),    I(t+1) = I(t) + ΔT(t) - ΔD(t) - ΔR(t)'}</div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Where γ = 1 / T_inf is the recovery rate, m is the infection fatality probability (IFR), and ΔB(t) represents exogenous migratory reservoir introductions.
        </p>
      </div>

      {/* Section 2: Spatial Metapopulation Network */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-base border-b border-slate-800 pb-2">
          <Cpu className="w-4 h-4" />
          <span>2. Spatial Metapopulation Transmission Operator</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Geographic regions are coupled via commuter and transit mobility fluxes. Inter-district transmission is governed by a normalized destination migration matrix P, derived from the classic gravity law of human mobility (Zünd et al. / Bettencourt et al.):
        </p>

        <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-indigo-200 border border-slate-800/80 space-y-2">
          <div>{'P(i, j) ∝ N(j) / [d(i, j)]^α   (for i ≠ j),     P(i, i) = 1 - μ(i)'}</div>
          <div>{'Outflux(i) ~ Poisson( μ(i) · I(i, t) )'}</div>
          <div>{'Transmissions(j, t) = Σ [ Outflux(i) · P(i, j) ]'}</div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          This captures asynchronous spatial waves where epidemics initiate in urban megacities and progressively cascade into satellite suburban and rural districts.
        </p>
      </div>

      {/* Section 3: Adaptive Control & PID Closed-Loop Regulation */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-base border-b border-slate-800 pb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>3. Adaptive Lockdown Control & PID Regulation</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Crude, prolonged lockdowns carry immense socioeconomic destruction and frequently induce sharp resurgence waves immediately upon release. EpiMargin evaluates two feedback control mechanisms:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h4 className="font-semibold text-slate-200 text-sm">Malani et al. (NBER) Adaptive Zoning</h4>
            <p className="text-slate-400 leading-relaxed">
              Districts are continuously categorized into stringency buckets based on real-time reproduction numbers:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-slate-300">
              <li>Green (Rt &lt; 1.0): Reopen, inter-green travel permitted</li>
              <li>Yellow (1.0 ≤ Rt &lt; 1.4): Light physical distancing</li>
              <li>Orange (1.4 ≤ Rt &lt; 1.9): Moderate restrictions</li>
              <li>Red (Rt ≥ 1.9): Complete containment lockdown</li>
            </ul>
            <p className="text-slate-400 text-[11px] pt-1">
              Features a <em>gradual release invariant</em>: regions are never permitted to step down more than one bucket per evaluation cycle.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h4 className="font-semibold text-slate-200 text-sm">PID Closed-Loop Controller</h4>
            <p className="text-slate-400 leading-relaxed">
              Models public health policy as an engineered feedback control loop regulating the tracking error e(t) = Rt - R_target:
            </p>
            <div className="font-mono text-[11px] text-indigo-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
              {'u(t) = k_P · e(t) + k_I · ∫ e(τ) dτ + k_D · [de(t) / dt]'}
            </div>
            <p className="text-slate-400 text-[11px] pt-1">
              Modulates non-pharmaceutical stringency dynamically to prevent hospital ICU saturation without unnecessary prolonged restriction.
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Analytical MPVS Bayesian Estimator */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-base border-b border-slate-800 pb-2">
          <Database className="w-4 h-4" />
          <span>4. Bettencourt-Soman Analytical MPVS Rt Estimator</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Estimating time-varying reproduction numbers from noisy daily case series faces severe challenges from weekly reporting lags and retrospective data dumps. EpiMargin implements the exact closed-form Bettencourt-Soman conjugate Gamma-Poisson filter:
        </p>

        <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-indigo-200 border border-slate-800/80 space-y-2">
          <div>{'α(t) = α(t-1) + ΔT(t),     β(t) = β(t-1) + ΔT(t-1)'}</div>
          <div>{'R̂(t) = 1 + (1 / γ) · ln E[ Gamma( α(t), 1 / β(t) ) ]'}</div>
          <div>{'CI_95% = [ 1 + (1 / γ) · ln Gamma_ppf(0.025),   1 + (1 / γ) · ln Gamma_ppf(0.975) ]'}</div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          When anomalous reporting dumps occur outside the negative binomial dispersion envelope, the <strong>Mean-Preserving Variance Spread (MPVS)</strong> algorithm scales parameter dispersion while strictly preserving the expected mean rate, ensuring numerical stability without destabilizing downstream policy triggers.
        </p>
      </div>

      {/* Section 5: Academic Bibliography */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-3 shadow-lg">
        <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
          <Award className="w-4 h-4 text-indigo-400" />
          <span>Key Scientific References</span>
        </h3>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-slate-100 block">
              Malani, A., Soman, S., Asher, S., Novosad, P., Imbert, C., Tandel, V., et al. (2020)
            </span>
            <span className="text-slate-400 block mt-0.5">
              <em>Adaptive control of COVID-19 outbreaks in India: Local, gradual, and trigger-based exit paths from lockdown.</em> National Bureau of Economic Research (NBER), Working Paper 27532.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-slate-100 block">
              Bubar, K. M., Reinholt, K., Kissler, S. M., Lipsitch, M., Cobey, S., Grad, Y. H., & Larremore, D. B. (2021)
            </span>
            <span className="text-slate-400 block mt-0.5">
              <em>Model-informed COVID-19 vaccine prioritization strategies by age and serostatus.</em> <strong>Science</strong>, 371(6532), 916–921.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-slate-100 block">
              Bettencourt, L. M., & Soman, S. (2020)
            </span>
            <span className="text-slate-400 block mt-0.5">
              <em>Systems Architecture for Real Time Epidemiological Prediction and Control.</em> Mansueto Institute for Urban Innovation Research Paper, No. 26.
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="font-semibold text-slate-100 block">
              Gostic, K. M., McGough, L., Baskerville, E. B., Abbott, S., Joshi, K., et al. (2020)
            </span>
            <span className="text-slate-400 block mt-0.5">
              <em>Practical considerations for measuring the effective reproductive number, Rt.</em> <strong>PLoS Computational Biology</strong>, 16(12), e1008409.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
