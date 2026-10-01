export type ModelType = 'SIR' | 'SEIR';

export interface SIRSimulationRequest {
  name: string;
  population: number;
  initial_infected: number;
  initial_recovered: number;
  initial_dead: number;
  initial_exposed?: number;
  model_type: ModelType;
  r0: number;
  infectious_period: number;
  incubation_period: number;
  mortality_rate: number;
  introduction_rate: number;
  days: number;
  num_monte_carlo: number;
  confidence_interval: number;
  random_seed?: number;
}

export interface SIRSimulationSummary {
  peak_infected: number;
  peak_day: number;
  total_cases: number;
  total_deaths: number;
  final_attack_rate: number;
  herd_immunity_threshold: number;
}

export interface SIRSimulationResponse {
  time: number[];
  S: number[];
  I: number[];
  R: number[];
  D: number[];
  E?: number[];
  dT: number[];
  Rt: number[];
  upper_CI: number[];
  lower_CI: number[];
  monte_carlo_I_p05?: number[];
  monte_carlo_I_mean?: number[];
  monte_carlo_I_p95?: number[];
  summary: SIRSimulationSummary;
}

export interface NetworkNodeConfig {
  id: string;
  name: string;
  population: number;
  initial_infected: number;
  r0: number;
  mobility_out: number;
  x?: number;
  y?: number;
}

export interface NetworkSimulationRequest {
  nodes: NetworkNodeConfig[];
  topology: 'gravity' | 'ring' | 'fully_connected' | 'hub_and_spoke' | 'custom';
  gravity_power: number;
  inter_region_mobility: number;
  custom_migrations?: number[][];
  days: number;
  random_seed?: number;
}

export interface NodeSimulationResult {
  id: string;
  name: string;
  population: number;
  I: number[];
  D: number[];
  total_cases: number[];
  peak_infected: number;
  peak_day: number;
  final_deaths: number;
}

export interface NetworkSimulationResponse {
  days: number[];
  nodes: NodeSimulationResult[];
  aggregate_I: number[];
  aggregate_D: number[];
  aggregate_total_cases: number[];
  migration_matrix: number[][];
  summary: {
    total_population: number;
    peak_active_cases: number;
    peak_day: number;
    total_fatalities: number;
    attack_rate: number;
  };
}

export interface PolicyComparisonRequest {
  population: number;
  initial_infected: number;
  r0_baseline: number;
  r0_lockdown: number;
  infectious_period: number;
  mortality_rate: number;
  days: number;
  lockdown_start_day: number;
  lockdown_duration: number;
  adaptive_eval_period: number;
  pid_target_rt: number;
  pid_kp: number;
  pid_ki: number;
  pid_kd: number;
  hospital_capacity: number;
}

export interface PolicyTrajectory {
  label: string;
  I: number[];
  D: number[];
  dT: number[];
  Rt: number[];
  total_cases: number;
  total_deaths: number;
  peak_infected: number;
  days_in_lockdown: number;
  hospital_overrun_days: number;
  extra?: {
    lockdown_start?: number;
    lockdown_end?: number;
    zones_history?: string[];
    control_efforts?: number[];
  };
}

export interface ScorecardEntry {
  strategy: string;
  total_deaths: number;
  deaths_averted: number;
  peak_infected: number;
  peak_reduction_pct: number;
  lockdown_days: number;
  icu_overrun_days: number;
}

export interface PolicyComparisonResponse {
  days: number[];
  hospital_capacity: number;
  trajectories: Record<string, PolicyTrajectory>;
  scorecard: ScorecardEntry[];
}

export interface VaccinePrioritizationRequest {
  population: number;
  daily_doses: number;
  vaccine_efficacy: number;
  r0: number;
  infectious_period: number;
  initial_infected: number;
  days: number;
}

export interface VaccineStrategyResult {
  strategy: string;
  description: string;
  I_total: number[];
  D_total: number[];
  V_administered: number[];
  total_deaths: number;
  total_infections: number;
  deaths_averted_vs_random: number;
  infections_averted_vs_random: number;
  doses_by_age_group: Record<string, number>;
}

export interface VaccinePrioritizationResponse {
  days: number[];
  strategies: Record<string, VaccineStrategyResult>;
  demographics: {
    cohorts: Array<{
      age: string;
      pop_pct: number;
      ifr_pct: number;
      contact_weight: number;
    }>;
  };
  summary_analysis: string;
}

export interface AnomalyPoint {
  date: string;
  day_index: number;
  raw_value: number;
  reason: string;
}

export interface RtEstimationRequest {
  dates?: string[];
  cases?: number[];
  dataset_preset?: string;
  infectious_period: number;
  smoothing_window: number;
  confidence_interval: number;
  variance_shift: number;
}

export interface RtEstimationResponse {
  dates: string[];
  raw_cases: number[];
  smoothed_cases: number[];
  rt_estimates: number[];
  rt_ci_upper: number[];
  rt_ci_lower: number[];
  anomalies: AnomalyPoint[];
  current_rt: number;
  epidemic_status: string;
  metadata: Record<string, any>;
}

export interface DatasetPreset {
  id: string;
  name: string;
  description: string;
}
