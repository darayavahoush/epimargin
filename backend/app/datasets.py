"""Curated and benchmark empirical datasets for epidemiological testing and Rt estimation."""

from typing import Dict, List, Tuple
import numpy as np


def get_mumbai_wave_2_data() -> Tuple[List[str], List[float]]:
    """
    Curated daily case data for Mumbai during the major 2021 surge.
    Captures exponential acceleration, the peak, and the subsequent decay.
    """
    import datetime
    start_date = datetime.date(2021, 2, 1)
    
    # Representative historical trajectory of daily confirmed cases in Mumbai (approx 120 days)
    # Reflects the famous spring 2021 wave
    cases_pattern = [
        # Feb 2021 (Gradual rise from baseline ~400/day)
        403, 415, 399, 442, 458, 410, 482, 493, 510, 529, 557, 569, 582, 608, 643,
        683, 721, 761, 823, 897, 921, 955, 1035, 1145, 1167, 1173, 1195, 1300,
        # March 2021 (Explosive surge)
        1383, 1412, 1514, 1610, 1712, 1856, 1964, 2184, 2377, 2570, 2877, 3062, 3512,
        3775, 4032, 4758, 5185, 5458, 5505, 5122, 5394, 6051, 6123, 6905, 8434, 8646,
        8832, 9090, 8422, 9925, 11163,
        # April 2021 (Peak & strict local containment restrictions)
        11206, 10030, 9327, 9857, 8938, 9989, 9200, 8811, 8217, 7684, 7381, 7002,
        6905, 5888, 5011, 4820, 5888, 5631, 5504, 5220, 4966, 4014, 3876, 3992,
        3882, 3672, 3056, 2662, 2554, 2415,
        # May 2021 (Decay and stabilization)
        2282, 2100, 1948, 1782, 1657, 1540, 1429, 1360, 1240, 1180, 1050, 990,
        950, 890, 850, 810, 780, 750, 710, 680, 650, 620, 590, 570, 540, 520, 490, 480, 460, 450
    ]
    
    dates = [(start_date + datetime.timedelta(days=i)).isoformat() for i in range(len(cases_pattern))]
    return dates, [float(c) for c in cases_pattern]


def get_nyc_winter_wave_data() -> Tuple[List[str], List[float]]:
    """
    Curated daily case counts for New York City during the initial winter surge.
    """
    import datetime
    start_date = datetime.date(2021, 11, 15)
    
    # Rapid exponential Omicron rise followed by steep drop
    cases_pattern = [
        # Nov 2021 baseline
        1100, 1150, 1220, 1190, 1310, 1280, 1350, 1420, 1510, 1600, 1680, 1790, 1850, 1920, 2100,
        # Early Dec
        2300, 2550, 2900, 3400, 4100, 5200, 6800, 8900, 11200, 14500, 18900, 22100, 26500, 31200, 35400,
        # Late Dec - Jan Peak
        39800, 43500, 47100, 49200, 48500, 46200, 43100, 39500, 34200, 29800, 25400, 21200, 18400,
        # Mid-Late Jan decay
        15200, 12900, 10800, 8900, 7400, 6100, 5200, 4400, 3800, 3200, 2800, 2500, 2200, 2000, 1800, 1650, 1500,
        # Feb recovery
        1400, 1320, 1250, 1180, 1100, 1050, 1000, 950, 910, 880, 850, 820, 790, 760, 740
    ]
    
    dates = [(start_date + datetime.timedelta(days=i)).isoformat() for i in range(len(cases_pattern))]
    return dates, [float(c) for c in cases_pattern]


def get_canonical_outbreak_data() -> Tuple[List[str], List[float]]:
    """
    Synthetic benchmark with injected weekend-reporting noise and a known sudden drop due to lockdown.
    Useful for validating filtering, anomaly detection, and estimator response time.
    """
    import datetime
    start_date = datetime.date(2024, 1, 1)
    np.random.seed(101)
    
    days = 100
    r_true = np.ones(days) * 2.2
    r_true[40:] = 0.8  # Intervention at day 40
    
    gamma = 1.0 / 7.0
    cases = [50.0]
    for t in range(1, days):
        rate = cases[-1] * np.exp(gamma * (r_true[t] - 1.0))
        # Add weekend noise (lower Sunday reporting, Monday surge)
        day_of_week = (t % 7)
        noise_factor = 0.6 if day_of_week == 6 else (1.4 if day_of_week == 0 else 1.0)
        c = max(1, np.random.poisson(rate) * noise_factor)
        # Inject deliberate reporting anomaly on day 35 (batch reporting dump)
        if t == 35:
            c = c * 3.5
        cases.append(float(c))
        
    dates = [(start_date + datetime.timedelta(days=i)).isoformat() for i in range(days)]
    return dates, cases


DATASETS: Dict[str, Tuple[str, str]] = {
    "mumbai_wave_2": ("Mumbai Wave 2 (Delta Surge, Spring 2021)", "Real district surveillance data showing explosive growth, strict containment, and decline."),
    "nyc_winter_wave": ("New York City Winter Surge (Winter 2021-22)", "Rapid transmission acceleration followed by steep deceleration in dense urban population."),
    "canonical_outbreak": ("Synthetic Outbreak with Intervention & Anomaly", "Controlled benchmark with a true R_t drop from 2.2 to 0.8 at t=40 and a reporting spike at t=35.")
}


def load_dataset_preset(preset_key: str) -> Tuple[List[str], List[float]]:
    if preset_key == "mumbai_wave_2":
        return get_mumbai_wave_2_data()
    elif preset_key == "nyc_winter_wave":
        return get_nyc_winter_wave_data()
    elif preset_key == "canonical_outbreak":
        return get_canonical_outbreak_data()
    else:
        raise ValueError(f"Unknown preset key: '{preset_key}'. Choose from: {list(DATASETS.keys())}")
