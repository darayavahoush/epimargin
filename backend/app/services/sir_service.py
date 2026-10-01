import numpy as np
from typing import Dict, Any, List
from epimargin.models import SIR, SEIR
from ..schemas import SIRSimulationRequest, SIRSimulationResponse, SIRSimulationSummary


def run_sir_simulation(req: SIRSimulationRequest) -> SIRSimulationResponse:
    seed = req.random_seed if req.random_seed is not None else 42
    np.random.seed(seed)

    days = req.days
    pop = req.population
    i0 = req.initial_infected
    r0_cnt = req.initial_recovered
    d0 = req.initial_dead
    e0 = req.initial_exposed if req.initial_exposed is not None else 0

    # 1. Primary Model Run
    if req.model_type == "SEIR":
        model = SEIR(
            name=req.name,
            population=pop,
            I0=i0,
            E0=e0,
            R0=r0_cnt,
            D0=d0,
            Rt0=req.r0,
            infectious_period=req.infectious_period,
            incubation_period=req.incubation_period,
            mortality=req.mortality_rate,
            introduction_rate=req.introduction_rate,
            CI=req.confidence_interval,
            random_seed=seed
        )
        model.run(days)
        time_vec = list(range(len(model.I)))
        S_vec = [float(x) for x in model.S]
        I_vec = [float(x) for x in model.I]
        R_vec = [float(x) for x in model.R]
        D_vec = [float(x) for x in model.D]
        E_vec = [float(x) for x in model.E]
        dT_vec = [float(x) for x in model.dT]
        Rt_vec = [float(x) for x in model.Rt]
        upper_CI = [float(x) for x in model.upper_CI]
        lower_CI = [float(x) for x in model.lower_CI]
    else:
        model = SIR(
            name=req.name,
            population=pop,
            I0=i0,
            R0=r0_cnt,
            D0=d0,
            Rt0=req.r0,
            infectious_period=req.infectious_period,
            mortality=req.mortality_rate,
            introduction_rate=req.introduction_rate,
            CI=req.confidence_interval,
            random_seed=seed
        )
        model.run(days)
        time_vec = list(range(len(model.I)))
        S_vec = [float(x) for x in model.S]
        I_vec = [float(x) for x in model.I]
        R_vec = [float(x) for x in model.R]
        D_vec = [float(x) for x in model.D]
        E_vec = None
        dT_vec = [float(x) for x in model.dT]
        Rt_vec = [float(x) for x in model.Rt]
        upper_CI = [float(x) for x in model.upper_CI]
        lower_CI = [float(x) for x in model.lower_CI]

    # 2. Monte Carlo Uncertainty Envelopes
    mc_i_runs = []
    num_mc = min(max(req.num_monte_carlo, 5), 100)
    for mc_idx in range(num_mc):
        mc_seed = seed + 1000 + mc_idx
        if req.model_type == "SEIR":
            m_mc = SEIR(
                name=f"{req.name}_mc",
                population=pop,
                I0=i0,
                E0=e0,
                R0=r0_cnt,
                D0=d0,
                Rt0=req.r0,
                infectious_period=req.infectious_period,
                incubation_period=req.incubation_period,
                mortality=req.mortality_rate,
                introduction_rate=req.introduction_rate,
                random_seed=mc_seed
            )
        else:
            m_mc = SIR(
                name=f"{req.name}_mc",
                population=pop,
                I0=i0,
                R0=r0_cnt,
                D0=d0,
                Rt0=req.r0,
                infectious_period=req.infectious_period,
                mortality=req.mortality_rate,
                introduction_rate=req.introduction_rate,
                random_seed=mc_seed
            )
        m_mc.run(days)
        mc_i_runs.append(m_mc.I)

    mc_matrix = np.array(mc_i_runs)  # shape: (num_mc, days + 1)
    p05 = np.percentile(mc_matrix, 5, axis=0).tolist()
    mean_val = np.mean(mc_matrix, axis=0).tolist()
    p95 = np.percentile(mc_matrix, 95, axis=0).tolist()

    # 3. Summary Metrics
    peak_infected = int(max(I_vec))
    peak_day = int(I_vec.index(peak_infected))
    total_cases = int(model.total_cases[-1])
    total_deaths = int(D_vec[-1])
    attack_rate = float(round(total_cases / pop, 4))
    hit = float(round(max(0.0, 1.0 - (1.0 / req.r0)), 4))

    summary = SIRSimulationSummary(
        peak_infected=peak_infected,
        peak_day=peak_day,
        total_cases=total_cases,
        total_deaths=total_deaths,
        final_attack_rate=attack_rate,
        herd_immunity_threshold=hit
    )

    return SIRSimulationResponse(
        time=time_vec,
        S=S_vec,
        I=I_vec,
        R=R_vec,
        D=D_vec,
        E=E_vec,
        dT=dT_vec,
        Rt=Rt_vec,
        upper_CI=upper_CI,
        lower_CI=lower_CI,
        monte_carlo_I_p05=p05,
        monte_carlo_I_mean=mean_val,
        monte_carlo_I_p95=p95,
        summary=summary
    )
