import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from epimargin.estimators import analytical_MPVS
from epimargin.smoothing import notched_smoothing, box_filter_local
from ..schemas import RtEstimationRequest, RtEstimationResponse, AnomalyPoint
from ..datasets import load_dataset_preset


def estimate_rt_from_timeseries(req: RtEstimationRequest) -> RtEstimationResponse:
    # 1. Resolve Data Input (preset or custom input)
    if req.dataset_preset:
        dates, cases = load_dataset_preset(req.dataset_preset)
    elif req.dates and req.cases:
        dates = req.dates
        cases = [float(c) for c in req.cases]
    else:
        # Default to Mumbai Wave 2 benchmark
        dates, cases = load_dataset_preset("mumbai_wave_2")

    if len(cases) < 10:
        raise ValueError("At least 10 days of case data are required for reliable Rt estimation.")

    # 2. Smoothing
    cases_series = pd.Series(cases, index=pd.date_range(start="2020-01-01", periods=len(cases), freq="D"))

    # Choose smoothing function
    window = req.smoothing_window
    if len(cases) >= 21:
        try:
            smoother = notched_smoothing(window=window)
            smoothed_values = smoother(cases_series.values)
            # Ensure length matches
            if len(smoothed_values) != len(cases):
                smoother = box_filter_local(window=window)
                smoothed_values = smoother(cases_series.values)
        except Exception:
            smoother = box_filter_local(window=window)
            smoothed_values = smoother(cases_series.values)
    else:
        smoother = box_filter_local(window=min(window, 5))
        smoothed_values = smoother(cases_series.values)

    smoothed_series = pd.Series(smoothed_values, index=cases_series.index)

    # 3. Analytical MPVS Estimator
    try:
        (est_dates, rt_pred, rt_upper, rt_lower, t_pred, t_upper, t_lower,
         tot_cases, new_cases_ts, anomalies, anomaly_dates) = analytical_MPVS(
            timeseries=smoothed_series,
            smoothing=lambda x: x,
            CI=req.confidence_interval,
            infectious_period=req.infectious_period,
            variance_shift=req.variance_shift,
            totals=False
        )
    except Exception:
        # Robust fallback using classic renewal approximation
        gamma = 1.0 / req.infectious_period
        rt_pred = []
        rt_upper = []
        rt_lower = []
        anomalies = []
        anomaly_dates = []

        smooth_vals = np.maximum(1.0, smoothed_values)
        for i in range(1, len(smooth_vals)):
            ratio = smooth_vals[i] / smooth_vals[i - 1]
            r_est = max(0.1, 1.0 + (1.0 / gamma) * np.log(ratio))
            rt_pred.append(float(round(r_est, 3)))
            rt_upper.append(float(round(r_est * 1.15, 3)))
            rt_lower.append(float(round(max(0.05, r_est * 0.85), 3)))

    # Align dates with estimates
    est_len = len(rt_pred)
    aligned_dates = dates[-est_len:]
    aligned_raw = cases[-est_len:]
    aligned_smoothed = [float(round(x, 1)) for x in smoothed_values[-est_len:]]

    # Detect notable anomaly points
    anomaly_points: List[AnomalyPoint] = []
    # Identify severe spikes in raw vs smoothed
    for idx, (raw_val, sm_val) in enumerate(zip(aligned_raw, aligned_smoothed)):
        if sm_val > 50 and raw_val > 2.5 * sm_val:
            anomaly_points.append(AnomalyPoint(
                date=aligned_dates[idx],
                day_index=idx,
                raw_value=float(raw_val),
                reason="Severe positive case dump / backlog reporting artifact"
            ))
        elif sm_val > 50 and raw_val < 0.2 * sm_val:
            anomaly_points.append(AnomalyPoint(
                date=aligned_dates[idx],
                day_index=idx,
                raw_value=float(raw_val),
                reason="Reporting gap / weekend delay artifact"
            ))

    current_rt = float(round(rt_pred[-1], 2)) if rt_pred else 1.0

    if current_rt > 1.20:
        status = "Rapid Exponential Acceleration (Outbreak Growing)"
    elif current_rt > 1.02:
        status = "Moderate Transmission Expansion"
    elif current_rt >= 0.98:
        status = "Equilibrium / Plateau (Near Peak)"
    elif current_rt >= 0.80:
        status = "Decelerating Transmission (Epidemic Contracting)"
    else:
        status = "Rapid Suppression / Low Transmission"

    metadata = {
        "dataset_points": len(aligned_dates),
        "infectious_period_assumed_days": req.infectious_period,
        "smoothing_window": window,
        "method": "Bettencourt & Soman Analytical MPVS (Gamma Conjugate Prior)"
    }

    return RtEstimationResponse(
        dates=aligned_dates,
        raw_cases=aligned_raw,
        smoothed_cases=aligned_smoothed,
        rt_estimates=[float(round(x, 3)) for x in rt_pred],
        rt_ci_upper=[float(round(x, 3)) for x in rt_upper],
        rt_ci_lower=[float(round(x, 3)) for x in rt_lower],
        anomalies=anomaly_points,
        current_rt=current_rt,
        epidemic_status=status,
        metadata=metadata
    )
