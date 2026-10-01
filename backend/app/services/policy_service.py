import numpy as np
from typing import Dict, Any, List
from epimargin.models import SIR
from ..schemas import PolicyComparisonRequest, PolicyComparisonResponse, PolicyTrajectory


def run_policy_comparison(req: PolicyComparisonRequest) -> PolicyComparisonResponse:
    np.random.seed(42)
    pop = req.population
    i0 = req.initial_infected
    days = req.days
    r_base = req.r0_baseline
    r_lock = req.r0_lockdown
    gamma = 1.0 / req.infectious_period
    m = req.mortality_rate
    capacity = req.hospital_capacity

    # ---------------------------------------------------------
    # 1. Baseline: Unmitigated Transmission
    # ---------------------------------------------------------
    sir_base = SIR(
        name="Baseline",
        population=pop,
        I0=i0,
        Rt0=r_base,
        infectious_period=req.infectious_period,
        mortality=m,
        random_seed=101
    )
    sir_base.run(days)

    traj_base = PolicyTrajectory(
        label="Baseline (Unmitigated)",
        I=[float(x) for x in sir_base.I],
        D=[float(x) for x in sir_base.D],
        dT=[float(x) for x in sir_base.dT],
        Rt=[float(x) for x in sir_base.Rt],
        total_cases=int(sir_base.total_cases[-1]),
        total_deaths=int(sir_base.D[-1]),
        peak_infected=int(max(sir_base.I)),
        days_in_lockdown=0,
        hospital_overrun_days=int(sum(1 for x in sir_base.I if x > capacity))
    )

    # ---------------------------------------------------------
    # 2. Hard Lockdown (Fixed duration, then full release)
    # ---------------------------------------------------------
    sir_lock = SIR(
        name="Hard Lockdown",
        population=pop,
        I0=i0,
        Rt0=r_base,
        infectious_period=req.infectious_period,
        mortality=m,
        random_seed=102
    )
    # Pre-lockdown phase
    pre_days = min(req.lockdown_start_day, days)
    sir_lock.run(pre_days)

    # Lockdown phase
    lock_days = min(req.lockdown_duration, days - pre_days)
    sir_lock.Rt0 = r_lock
    sir_lock.run(lock_days)

    # Post-lockdown release phase
    post_days = max(0, days - pre_days - lock_days)
    sir_lock.Rt0 = r_base
    sir_lock.run(post_days)

    traj_lock = PolicyTrajectory(
        label=f"Fixed Lockdown ({req.lockdown_duration}d)",
        I=[float(x) for x in sir_lock.I],
        D=[float(x) for x in sir_lock.D],
        dT=[float(x) for x in sir_lock.dT],
        Rt=[float(x) for x in sir_lock.Rt],
        total_cases=int(sir_lock.total_cases[-1]),
        total_deaths=int(sir_lock.D[-1]),
        peak_infected=int(max(sir_lock.I)),
        days_in_lockdown=lock_days,
        hospital_overrun_days=int(sum(1 for x in sir_lock.I if x > capacity)),
        extra={"lockdown_start": pre_days, "lockdown_end": pre_days + lock_days}
    )

    # ---------------------------------------------------------
    # 3. Adaptive Control (Malani et al. NBER: Dynamic Rt Zoning)
    # ---------------------------------------------------------
    sir_adapt = SIR(
        name="Adaptive Control",
        population=pop,
        I0=i0,
        Rt0=r_base,
        infectious_period=req.infectious_period,
        mortality=m,
        random_seed=103
    )

    eval_period = req.adaptive_eval_period
    days_elapsed = 0
    # Initial phase before surveillance triggers
    init_phase = min(req.lockdown_start_day, days)
    sir_adapt.run(init_phase)
    days_elapsed += init_phase

    zones_history = ["Normal"] * init_phase
    current_category = 0  # 0: Green, 1: Yellow, 2: Orange, 3: Red
    beta_v = r_base * gamma
    beta_m = r_lock * gamma

    while days_elapsed < days:
        step = min(eval_period, days - days_elapsed)
        latest_rt = sir_adapt.Rt[-1]

        # Trigger logic based on latest Rt
        if latest_rt < 1.0:
            target_cat = 0  # Green: Open
        elif latest_rt < 1.4:
            target_cat = 1  # Yellow: Light restrictions
        elif latest_rt < 1.9:
            target_cat = 2  # Orange: Moderate restrictions
        else:
            target_cat = 3  # Red: Full containment

        # Gradual release rule (never jump from Red directly to Green)
        if target_cat < current_category - 1:
            target_cat = current_category - 1
        current_category = target_cat

        # Interpolate contact rate beta
        new_beta = beta_v - (current_category * (beta_v - beta_m) / 3.0)
        sir_adapt.Rt0 = new_beta / gamma

        sir_adapt.run(step)
        zone_name = ["Green (Open)", "Yellow (Mild)", "Orange (Moderate)", "Red (Lockdown)"][current_category]
        zones_history.extend([zone_name] * step)
        days_elapsed += step

    effective_lock_days = sum(1 for z in zones_history if "Red" in z or "Orange" in z)
    traj_adapt = PolicyTrajectory(
        label="Adaptive Rt Zoning (Malani et al.)",
        I=[float(x) for x in sir_adapt.I],
        D=[float(x) for x in sir_adapt.D],
        dT=[float(x) for x in sir_adapt.dT],
        Rt=[float(x) for x in sir_adapt.Rt],
        total_cases=int(sir_adapt.total_cases[-1]),
        total_deaths=int(sir_adapt.D[-1]),
        peak_infected=int(max(sir_adapt.I)),
        days_in_lockdown=effective_lock_days,
        hospital_overrun_days=int(sum(1 for x in sir_adapt.I if x > capacity)),
        extra={"zones_history": zones_history}
    )

    # ---------------------------------------------------------
    # 4. Closed-Loop PID Feedback Controller
    # ---------------------------------------------------------
    sir_pid = SIR(
        name="PID Controller",
        population=pop,
        I0=i0,
        Rt0=r_base,
        infectious_period=req.infectious_period,
        mortality=m,
        random_seed=104
    )

    pid_init = min(req.lockdown_start_day, days)
    sir_pid.run(pid_init)

    integral = 0.0
    prev_error = sir_pid.Rt[-1] - req.pid_target_rt
    control_efforts = [0.0] * pid_init

    for t in range(pid_init, days):
        error = sir_pid.Rt[-1] - req.pid_target_rt
        integral += error
        derivative = error - prev_error

        # PID control signal: how much to adjust transmission
        u = req.pid_kp * error + req.pid_ki * integral + req.pid_kd * derivative
        prev_error = error

        # Adjust Rt0 bounded by physical limits [r_lock, r_base]
        sir_pid.Rt0 = float(np.clip(sir_pid.Rt0 - u, r_lock, r_base))
        sir_pid.forward_epi_step()
        control_efforts.append(round(float(u), 4))

    # Stringency proxy for PID: fraction of transmission reduced
    pid_stringency = int(sum(1 for r in sir_pid.Rt if r < (r_base * 0.7)))

    traj_pid = PolicyTrajectory(
        label="Closed-Loop Feedback (PID Control)",
        I=[float(x) for x in sir_pid.I],
        D=[float(x) for x in sir_pid.D],
        dT=[float(x) for x in sir_pid.dT],
        Rt=[float(x) for x in sir_pid.Rt],
        total_cases=int(sir_pid.total_cases[-1]),
        total_deaths=int(sir_pid.D[-1]),
        peak_infected=int(max(sir_pid.I)),
        days_in_lockdown=pid_stringency,
        hospital_overrun_days=int(sum(1 for x in sir_pid.I if x > capacity)),
        extra={"control_efforts": control_efforts}
    )

    # Scorecard table
    scorecard = [
        {
            "strategy": traj_base.label,
            "total_deaths": traj_base.total_deaths,
            "deaths_averted": 0,
            "peak_infected": traj_base.peak_infected,
            "peak_reduction_pct": 0.0,
            "lockdown_days": traj_base.days_in_lockdown,
            "icu_overrun_days": traj_base.hospital_overrun_days
        },
        {
            "strategy": traj_lock.label,
            "total_deaths": traj_lock.total_deaths,
            "deaths_averted": max(0, traj_base.total_deaths - traj_lock.total_deaths),
            "peak_infected": traj_lock.peak_infected,
            "peak_reduction_pct": round((1.0 - traj_lock.peak_infected / traj_base.peak_infected) * 100, 1),
            "lockdown_days": traj_lock.days_in_lockdown,
            "icu_overrun_days": traj_lock.hospital_overrun_days
        },
        {
            "strategy": traj_adapt.label,
            "total_deaths": traj_adapt.total_deaths,
            "deaths_averted": max(0, traj_base.total_deaths - traj_adapt.total_deaths),
            "peak_infected": traj_adapt.peak_infected,
            "peak_reduction_pct": round((1.0 - traj_adapt.peak_infected / traj_base.peak_infected) * 100, 1),
            "lockdown_days": traj_adapt.days_in_lockdown,
            "icu_overrun_days": traj_adapt.hospital_overrun_days
        },
        {
            "strategy": traj_pid.label,
            "total_deaths": traj_pid.total_deaths,
            "deaths_averted": max(0, traj_base.total_deaths - traj_pid.total_deaths),
            "peak_infected": traj_pid.peak_infected,
            "peak_reduction_pct": round((1.0 - traj_pid.peak_infected / traj_base.peak_infected) * 100, 1),
            "lockdown_days": traj_pid.days_in_lockdown,
            "icu_overrun_days": traj_pid.hospital_overrun_days
        },
    ]

    return PolicyComparisonResponse(
        days=list(range(days + 1)),
        hospital_capacity=capacity,
        trajectories={
            "baseline": traj_base,
            "hard_lockdown": traj_lock,
            "adaptive_control": traj_adapt,
            "pid_controller": traj_pid
        },
        scorecard=scorecard
    )
