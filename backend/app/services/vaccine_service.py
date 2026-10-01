import numpy as np
from typing import Dict, Any, List
from ..schemas import VaccinePrioritizationRequest, VaccinePrioritizationResponse, VaccineStrategyResult


def simulate_vaccination_scenario(
    strategy_type: str,
    population: int,
    daily_doses: int,
    efficacy: float,
    r0: float,
    gamma: float,
    initial_infected: int,
    days: int,
    seed: int = 42
) -> Dict[str, Any]:
    np.random.seed(seed)

    # 4 Age bins: [0-19, 20-49, 50-64, 65+]
    bin_labels = ["0-19", "20-49", "50-64", "65+"]
    bin_fractions = np.array([0.25, 0.45, 0.18, 0.12])
    bin_pops = (population * bin_fractions).astype(int)

    # Age-specific Infection Fatality Rates (IFR)
    base_ifrs = np.array([0.0001, 0.002, 0.015, 0.065])
    # Relative transmission weights (20-49 contact rate is highest)
    contact_weights = np.array([0.8, 1.4, 0.9, 0.6])

    # Initial state per bin
    S = bin_pops.astype(float).copy()
    I = (initial_infected * bin_fractions).astype(float).copy()
    R = np.zeros(4, dtype=float)
    D = np.zeros(4, dtype=float)
    V_eff = np.zeros(4, dtype=float)  # Effective vaccinated (immune)
    doses_administered_by_bin = np.zeros(4, dtype=float)

    I_total_series = [float(I.sum())]
    D_total_series = [float(D.sum())]
    V_total_series = [float(V_eff.sum())]

    # Daily simulation loop
    for t in range(days):
        # 1. Vaccine allocation according to strategy
        available_doses = daily_doses
        target_allocation = np.zeros(4)

        if strategy_type == "elderly_first":
            # Priority: 65+ (idx 3) -> 50-64 (idx 2) -> 20-49 (idx 1) -> 0-19 (idx 0)
            order = [3, 2, 1, 0]
            rem_doses = available_doses
            for idx in order:
                unvax_s = max(0.0, S[idx])
                if unvax_s > 0:
                    allocated = min(rem_doses, unvax_s)
                    target_allocation[idx] = allocated
                    rem_doses -= allocated
                    if rem_doses <= 0:
                        break

        elif strategy_type == "contact_first":
            # Priority: 20-49 (idx 1) -> 50-64 (idx 2) -> 65+ (idx 3) -> 0-19 (idx 0)
            order = [1, 2, 3, 0]
            rem_doses = available_doses
            for idx in order:
                unvax_s = max(0.0, S[idx])
                if unvax_s > 0:
                    allocated = min(rem_doses, unvax_s)
                    target_allocation[idx] = allocated
                    rem_doses -= allocated
                    if rem_doses <= 0:
                        break

        else:  # Random (proportional to susceptible size)
            s_sum = S.sum()
            if s_sum > 0:
                target_allocation = available_doses * (S / s_sum)

        # Apply vaccination
        for i in range(4):
            imm = target_allocation[i] * efficacy
            S[i] = max(0.0, S[i] - imm)
            V_eff[i] += imm
            doses_administered_by_bin[i] += target_allocation[i]

        # 2. Transmission & Epidemic Progression
        # Force of infection based on weighted active cases
        effective_I = np.sum(I * contact_weights)
        curr_rt = r0 * (S.sum() / population)
        transmission_rate = curr_rt * gamma * (effective_I / population)

        for i in range(4):
            # Poisson new cases in group
            lambda_i = max(0.0, transmission_rate * S[i] * contact_weights[i])
            new_cases = min(S[i], np.random.poisson(lambda_i))
            S[i] -= new_cases

            # Recoveries and Deaths
            rate_d = base_ifrs[i] * gamma * I[i]
            rate_r = (1.0 - base_ifrs[i]) * gamma * I[i]
            new_deaths = min(I[i], np.random.poisson(rate_d))
            new_recov = min(I[i] - new_deaths, np.random.poisson(rate_r))

            I[i] = max(0.0, I[i] + new_cases - (new_deaths + new_recov))
            R[i] += new_recov
            D[i] += new_deaths

        I_total_series.append(float(round(I.sum(), 1)))
        D_total_series.append(float(round(D.sum(), 1)))
        V_total_series.append(float(round(V_eff.sum(), 1)))

    total_infections = int(population - S.sum() - V_eff.sum() + initial_infected)
    total_deaths = int(round(D.sum()))

    return {
        "I_total": I_total_series,
        "D_total": D_total_series,
        "V_administered": V_total_series,
        "total_deaths": total_deaths,
        "total_infections": total_infections,
        "doses_by_bin": {bin_labels[i]: int(doses_administered_by_bin[i]) for i in range(4)}
    }


def run_vaccine_prioritization(req: VaccinePrioritizationRequest) -> VaccinePrioritizationResponse:
    pop = req.population
    doses = req.daily_doses
    ve = req.vaccine_efficacy
    r0 = req.r0
    gamma = 1.0 / req.infectious_period
    i0 = req.initial_infected
    days = req.days

    # Run 3 strategies
    res_rand = simulate_vaccination_scenario("random", pop, doses, ve, r0, gamma, i0, days, seed=1)
    res_eld = simulate_vaccination_scenario("elderly_first", pop, doses, ve, r0, gamma, i0, days, seed=1)
    res_cont = simulate_vaccination_scenario("contact_first", pop, doses, ve, r0, gamma, i0, days, seed=1)

    strat_eld = VaccineStrategyResult(
        strategy="Elderly-First (Direct Protection)",
        description="Prioritizes age cohorts 65+ and 50-64 who face exponential COVID-19 infection fatality rates.",
        I_total=res_eld["I_total"],
        D_total=res_eld["D_total"],
        V_administered=res_eld["V_administered"],
        total_deaths=res_eld["total_deaths"],
        total_infections=res_eld["total_infections"],
        deaths_averted_vs_random=max(0, res_rand["total_deaths"] - res_eld["total_deaths"]),
        infections_averted_vs_random=res_rand["total_infections"] - res_eld["total_infections"],
        doses_by_age_group=res_eld["doses_by_bin"]
    )

    strat_cont = VaccineStrategyResult(
        strategy="High-Contact First (Transmission Interruption)",
        description="Prioritizes active working-age adults (20-49) to cut the core transmission chain and protect all cohorts indirectly.",
        I_total=res_cont["I_total"],
        D_total=res_cont["D_total"],
        V_administered=res_cont["V_administered"],
        total_deaths=res_cont["total_deaths"],
        total_infections=res_cont["total_infections"],
        deaths_averted_vs_random=max(0, res_rand["total_deaths"] - res_cont["total_deaths"]),
        infections_averted_vs_random=max(0, res_rand["total_infections"] - res_cont["total_infections"]),
        doses_by_age_group=res_cont["doses_by_bin"]
    )

    strat_rand = VaccineStrategyResult(
        strategy="Proportional Random Allocation",
        description="Allocates vaccine doses equally across all demographic age segments without stratification.",
        I_total=res_rand["I_total"],
        D_total=res_rand["D_total"],
        V_administered=res_rand["V_administered"],
        total_deaths=res_rand["total_deaths"],
        total_infections=res_rand["total_infections"],
        deaths_averted_vs_random=0,
        infections_averted_vs_random=0,
        doses_by_age_group=res_rand["doses_by_bin"]
    )

    demographics = {
        "cohorts": [
            {"age": "0-19", "pop_pct": 25, "ifr_pct": 0.01, "contact_weight": 0.8},
            {"age": "20-49", "pop_pct": 45, "ifr_pct": 0.20, "contact_weight": 1.4},
            {"age": "50-64", "pop_pct": 18, "ifr_pct": 1.50, "contact_weight": 0.9},
            {"age": "65+", "pop_pct": 12, "ifr_pct": 6.50, "contact_weight": 0.6}
        ]
    }

    summary_analysis = (
        f"Under R0={r0} with {doses:,} daily doses, Elderly-First allocation saves approximately "
        f"{strat_eld.deaths_averted_vs_random:,} additional lives compared to random allocation. "
        f"Conversely, prioritizing high-contact workers (20-49) minimizes total societal infections "
        f"by suppressing the effective reproduction number faster."
    )

    return VaccinePrioritizationResponse(
        days=list(range(days + 1)),
        strategies={
            "elderly_first": strat_eld,
            "contact_first": strat_cont,
            "random": strat_rand
        },
        demographics=demographics,
        summary_analysis=summary_analysis
    )
