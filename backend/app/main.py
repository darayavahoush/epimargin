import os
import sys
from pathlib import Path

# Ensure workspace root is in sys.path so epimargin package is discoverable
workspace_root = Path(__file__).resolve().parent.parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

from backend.app.schemas import (
    SIRSimulationRequest, SIRSimulationResponse,
    NetworkSimulationRequest, NetworkSimulationResponse,
    PolicyComparisonRequest, PolicyComparisonResponse,
    VaccinePrioritizationRequest, VaccinePrioritizationResponse,
    RtEstimationRequest, RtEstimationResponse
)
from backend.app.datasets import DATASETS, load_dataset_preset
from backend.app.services.sir_service import run_sir_simulation
from backend.app.services.network_service import run_network_simulation
from backend.app.services.policy_service import run_policy_comparison
from backend.app.services.vaccine_service import run_vaccine_prioritization
from backend.app.services.estimator_service import estimate_rt_from_timeseries


app = FastAPI(
    title="EpiMargin Simulation & Policy Intelligence Engine",
    description="""
    Advanced epidemiological modeling toolkit for forward stochastic simulation,
    networked metapopulation transmission, dynamic adaptive lockdown control,
    age-structured vaccine allocation, and Bayesian empirical Rt estimation.
    Based on research from Bettencourt & Ribeiro, Malani et al., and Bubar et al.
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS configuration to allow React frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "EpiMargin Simulation Engine",
        "version": "1.0.0",
        "engine": "Python 3.14 + FastAPI + NumPy/SciPy"
    }


@app.get("/api/presets")
async def list_dataset_presets() -> List[Dict[str, str]]:
    """Return available curated real-world and synthetic benchmark epidemic curves."""
    return [
        {"id": key, "name": name, "description": desc}
        for key, (name, desc) in DATASETS.items()
    ]


@app.get("/api/presets/{preset_key}")
async def get_preset_data(preset_key: str) -> Dict[str, Any]:
    """Retrieve raw time series for a specific benchmark dataset."""
    try:
        dates, cases = load_dataset_preset(preset_key)
        name, desc = DATASETS[preset_key]
        return {
            "id": preset_key,
            "name": name,
            "description": desc,
            "dates": dates,
            "cases": cases
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/simulate/sir", response_model=SIRSimulationResponse)
async def simulate_sir(req: SIRSimulationRequest) -> SIRSimulationResponse:
    """Run stochastic SIR or SEIR compartmental forward simulation with Monte Carlo confidence envelopes."""
    try:
        return run_sir_simulation(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Simulation error: {str(e)}")


@app.post("/api/simulate/network", response_model=NetworkSimulationResponse)
async def simulate_network(req: NetworkSimulationRequest) -> NetworkSimulationResponse:
    """Run spatial metapopulation simulation across interconnected regions with gravity/custom migration matrix."""
    try:
        return run_network_simulation(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Network simulation error: {str(e)}")


@app.post("/api/policy/compare", response_model=PolicyComparisonResponse)
async def compare_policies(req: PolicyComparisonRequest) -> PolicyComparisonResponse:
    """Benchmark 4 public health strategies: Baseline, Fixed Lockdown, Adaptive Rt-Zoning, and PID Feedback Control."""
    try:
        return run_policy_comparison(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Policy comparison error: {str(e)}")


@app.post("/api/vaccine/evaluate", response_model=VaccinePrioritizationResponse)
async def evaluate_vaccine_strategies(req: VaccinePrioritizationRequest) -> VaccinePrioritizationResponse:
    """Simulate age-structured vaccine allocation: Elderly-First vs High-Contact Workforce vs Random Distribution."""
    try:
        return run_vaccine_prioritization(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Vaccine evaluation error: {str(e)}")


@app.post("/api/rt/estimate", response_model=RtEstimationResponse)
async def estimate_rt(req: RtEstimationRequest) -> RtEstimationResponse:
    """Estimate empirical time-varying reproduction number (Rt) using Bettencourt-Soman analytical Gamma-Poisson filtering."""
    try:
        return estimate_rt_from_timeseries(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Rt estimation error: {str(e)}")


# Mount frontend production build if available
frontend_dist = workspace_root / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
