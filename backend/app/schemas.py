from typing import List, Dict, Optional, Any, Literal
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Single-Region SIR / SEIR Simulation Schemas
# -------------------------------------------------------------
class SIRSimulationRequest(BaseModel):
    name: str = Field(default="Metropolitan Area", description="Name of the unit/region")
    population: int = Field(default=1_000_000, ge=100, description="Total population (N)")
    initial_infected: int = Field(default=100, ge=1, description="Initial active infections (I0)")
    initial_recovered: int = Field(default=0, ge=0, description="Initial recovered count (R0)")
    initial_dead: int = Field(default=0, ge=0, description="Initial deaths (D0)")
    initial_exposed: Optional[int] = Field(default=0, ge=0, description="Initial exposed count for SEIR (E0)")
    model_type: Literal["SIR", "SEIR"] = Field(default="SIR", description="Epidemiological compartmental model")
    r0: float = Field(default=2.4, gt=0, le=15.0, description="Basic reproduction number R0")
    infectious_period: float = Field(default=7.0, gt=0.5, le=60.0, description="Mean infectious period in days (1/gamma)")
    incubation_period: float = Field(default=5.0, gt=0.5, le=30.0, description="Mean latent/incubation period in days for SEIR (1/sigma)")
    mortality_rate: float = Field(default=0.015, ge=0.0, le=0.5, description="Infection fatality / mortality probability")
    introduction_rate: float = Field(default=2.0, ge=0.0, description="Poisson community introduction rate (lambda)")
    days: int = Field(default=120, ge=10, le=365, description="Simulation horizon in days")
    num_monte_carlo: int = Field(default=30, ge=1, le=100, description="Number of Monte Carlo stochastic runs")
    confidence_interval: float = Field(default=0.95, ge=0.5, le=0.99, description="Confidence interval level")
    random_seed: Optional[int] = Field(default=42, description="Random seed for reproducibility")


class SIRSimulationSummary(BaseModel):
    peak_infected: int
    peak_day: int
    total_cases: int
    total_deaths: int
    final_attack_rate: float
    herd_immunity_threshold: float


class SIRSimulationResponse(BaseModel):
    time: List[int]
    S: List[float]
    I: List[float]
    R: List[float]
    D: List[float]
    E: Optional[List[float]] = None
    dT: List[float]
    Rt: List[float]
    upper_CI: List[float]
    lower_CI: List[float]
    monte_carlo_I_p05: Optional[List[float]] = None
    monte_carlo_I_mean: Optional[List[float]] = None
    monte_carlo_I_p95: Optional[List[float]] = None
    summary: SIRSimulationSummary


# -------------------------------------------------------------
# Spatial Networked Metapopulation Schemas
# -------------------------------------------------------------
class NetworkNodeConfig(BaseModel):
    id: str
    name: str
    population: int
    initial_infected: int = 50
    r0: float = 2.2
    mobility_out: float = 0.02
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0


class NetworkSimulationRequest(BaseModel):
    nodes: List[NetworkNodeConfig]
    topology: Literal["gravity", "ring", "fully_connected", "hub_and_spoke", "custom"] = "gravity"
    gravity_power: float = Field(default=1.0, ge=0.1, le=3.0, description="Gravity model distance decay")
    inter_region_mobility: float = Field(default=0.03, ge=0.0, le=0.5, description="Scale of inter-regional mobility")
    custom_migrations: Optional[List[List[float]]] = None
    days: int = Field(default=90, ge=10, le=300)
    random_seed: Optional[int] = 42


class NodeSimulationResult(BaseModel):
    id: str
    name: str
    population: int
    I: List[float]
    D: List[float]
    total_cases: List[float]
    peak_infected: int
    peak_day: int
    final_deaths: int


class NetworkSimulationResponse(BaseModel):
    days: List[int]
    nodes: List[NodeSimulationResult]
    aggregate_I: List[float]
    aggregate_D: List[float]
    aggregate_total_cases: List[float]
    migration_matrix: List[List[float]]
    summary: Dict[str, Any]


# -------------------------------------------------------------
# Policy Evaluation Schemas (Lockdown vs Adaptive vs PID)
# -------------------------------------------------------------
class PolicyComparisonRequest(BaseModel):
    population: int = Field(default=1_000_000, ge=1000)
    initial_infected: int = Field(default=100, ge=1)
    r0_baseline: float = Field(default=2.4, ge=1.0, le=5.0)
    r0_lockdown: float = Field(default=0.85, ge=0.2, le=1.5)
    infectious_period: float = Field(default=7.0, ge=1.0, le=20.0)
    mortality_rate: float = Field(default=0.015, ge=0.001, le=0.2)
    days: int = Field(default=150, ge=30, le=365)
    lockdown_start_day: int = Field(default=25, ge=0)
    lockdown_duration: int = Field(default=45, ge=5)
    adaptive_eval_period: int = Field(default=14, ge=7, le=30)
    pid_target_rt: float = Field(default=0.95, ge=0.5, le=1.5)
    pid_kp: float = Field(default=0.08, ge=0.0, le=1.0)
    pid_ki: float = Field(default=0.02, ge=0.0, le=1.0)
    pid_kd: float = Field(default=0.01, ge=0.0, le=1.0)
    hospital_capacity: int = Field(default=8_000, ge=100)


class PolicyTrajectory(BaseModel):
    label: str
    I: List[float]
    D: List[float]
    dT: List[float]
    Rt: List[float]
    total_cases: int
    total_deaths: int
    peak_infected: int
    days_in_lockdown: int
    hospital_overrun_days: int
    extra: Optional[Dict[str, Any]] = None


class PolicyComparisonResponse(BaseModel):
    days: List[int]
    hospital_capacity: int
    trajectories: Dict[str, PolicyTrajectory]
    scorecard: List[Dict[str, Any]]


# -------------------------------------------------------------
# Vaccine Prioritization Schemas (Age-Structured SIRVD)
# -------------------------------------------------------------
class VaccinePrioritizationRequest(BaseModel):
    population: int = Field(default=1_000_000, ge=10_000)
    daily_doses: int = Field(default=3_500, ge=100, le=50_000)
    vaccine_efficacy: float = Field(default=0.85, ge=0.1, le=1.0)
    r0: float = Field(default=2.3, ge=1.0, le=5.0)
    infectious_period: float = Field(default=7.0, ge=2.0, le=20.0)
    initial_infected: int = Field(default=200, ge=1)
    days: int = Field(default=160, ge=30, le=365)


class VaccineStrategyResult(BaseModel):
    strategy: str
    description: str
    I_total: List[float]
    D_total: List[float]
    V_administered: List[float]
    total_deaths: int
    total_infections: int
    deaths_averted_vs_random: int
    infections_averted_vs_random: int
    doses_by_age_group: Dict[str, int]


class VaccinePrioritizationResponse(BaseModel):
    days: List[int]
    strategies: Dict[str, VaccineStrategyResult]
    demographics: Dict[str, Any]
    summary_analysis: str


# -------------------------------------------------------------
# Empirical Rt Estimation Schemas
# -------------------------------------------------------------
class RtEstimationRequest(BaseModel):
    dates: Optional[List[str]] = None
    cases: Optional[List[float]] = None
    dataset_preset: Optional[str] = Field(default=None, description="Preset name: 'mumbai_wave_2', 'nyc_winter_wave', 'canonical_outbreak'")
    infectious_period: float = Field(default=7.0, ge=2.0, le=20.0)
    smoothing_window: int = Field(default=7, ge=3, le=21)
    confidence_interval: float = Field(default=0.95, ge=0.5, le=0.99)
    variance_shift: float = Field(default=0.99, ge=0.8, le=0.999)


class AnomalyPoint(BaseModel):
    date: str
    day_index: int
    raw_value: float
    reason: str


class RtEstimationResponse(BaseModel):
    dates: List[str]
    raw_cases: List[float]
    smoothed_cases: List[float]
    rt_estimates: List[float]
    rt_ci_upper: List[float]
    rt_ci_lower: List[float]
    anomalies: List[AnomalyPoint]
    current_rt: float
    epidemic_status: str
    metadata: Dict[str, Any]
