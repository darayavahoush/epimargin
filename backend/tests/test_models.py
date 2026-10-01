import pytest
import numpy as np
from epimargin.models import SIR, SEIR, NetworkedSIR
from epimargin.estimators import analytical_MPVS
from epimargin.smoothing import notched_smoothing, box_filter_local
import pandas as pd


def test_sir_basic_run():
    sir = SIR(name="TestRegion", population=50_000, I0=20, Rt0=2.0, infectious_period=7, random_seed=42)
    sir.run(30)
    assert len(sir.I) == 31
    assert sir.I[-1] >= 0
    assert sir.S[-1] <= 50_000
    assert sir.total_cases[-1] >= 20
    assert sir.D[-1] >= 0


def test_seir_basic_run():
    seir = SEIR(name="TestSEIR", population=50_000, I0=10, E0=20, Rt0=2.2, infectious_period=7, incubation_period=5, random_seed=42)
    seir.run(30)
    assert len(seir.I) == 31
    assert len(seir.E) == 31
    assert seir.I[-1] >= 0
    assert seir.E[-1] >= 0


def test_networked_sir():
    pops = [10_000, 20_000]
    units = [SIR(name=f"Unit{i}", population=pop, I0=10, Rt0=2.0, random_seed=i) for i, pop in enumerate(pops)]
    # 2x2 migration matrix
    mig = np.matrix([[0.95, 0.05], [0.05, 0.95]])
    net = NetworkedSIR(units, mig, random_seed=42)
    net.run(20)

    assert len(net) == 2
    assert len(net[0].I) == 21
    assert len(net[1].I) == 21
    agg = net.aggregate(["I", "D"])
    assert len(agg["I"]) == 21


def test_smoothing_box_filter():
    data = [10.0, 12.0, 14.0, 18.0, 25.0, 30.0, 40.0, 35.0]
    smoother = box_filter_local(window=3)
    smoothed = smoother(data)
    assert len(smoothed) == len(data)
    assert smoothed[0] >= 0


def test_analytical_mpvs_estimator():
    # Simple simulated exponential rise
    cases = [10, 12, 15, 20, 26, 34, 45, 60, 80, 105, 140, 180, 230, 290, 370]
    series = pd.Series(cases, index=pd.date_range("2021-01-01", periods=len(cases)))
    
    (dates, rt_pred, rt_upper, rt_lower, *_) = analytical_MPVS(
        timeseries=series,
        smoothing=lambda x: x,
        infectious_period=7,
        totals=False
    )
    assert len(rt_pred) > 0
    # Reproduction rate should be above 1.0 for growing cases
    assert rt_pred[-1] > 1.0
