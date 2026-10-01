import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_presets_endpoints():
    res = client.get("/api/presets")
    assert res.status_code == 200
    presets = res.json()
    assert len(presets) >= 3
    preset_id = presets[0]["id"]

    res_item = client.get(f"/api/presets/{preset_id}")
    assert res_item.status_code == 200
    item_data = res_item.json()
    assert "dates" in item_data
    assert "cases" in item_data
    assert len(item_data["cases"]) > 10


def test_simulate_sir_api():
    payload = {
        "name": "Test City",
        "population": 100_000,
        "initial_infected": 50,
        "model_type": "SIR",
        "r0": 2.2,
        "infectious_period": 7.0,
        "days": 40,
        "num_monte_carlo": 10
    }
    res = client.post("/api/simulate/sir", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["I"]) == 41
    assert "summary" in data
    assert data["summary"]["peak_infected"] > 0
    assert data["summary"]["herd_immunity_threshold"] > 0


def test_simulate_seir_api():
    payload = {
        "name": "Test SEIR City",
        "population": 100_000,
        "initial_infected": 50,
        "initial_exposed": 100,
        "model_type": "SEIR",
        "r0": 2.4,
        "days": 30,
        "num_monte_carlo": 10
    }
    res = client.post("/api/simulate/sir", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "E" in data
    assert len(data["E"]) == 31


def test_simulate_network_api():
    payload = {
        "nodes": [
            {"id": "node_1", "name": "District A", "population": 100_000, "initial_infected": 50, "r0": 2.2, "x": 0.0, "y": 0.0},
            {"id": "node_2", "name": "District B", "population": 50_000, "initial_infected": 10, "r0": 2.0, "x": 5.0, "y": 0.0}
        ],
        "topology": "gravity",
        "days": 30
    }
    res = client.post("/api/simulate/network", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["nodes"]) == 2
    assert len(data["aggregate_I"]) == 31
    assert len(data["migration_matrix"]) == 2


def test_policy_compare_api():
    payload = {
        "population": 200_000,
        "initial_infected": 50,
        "r0_baseline": 2.2,
        "r0_lockdown": 0.8,
        "days": 60,
        "lockdown_start_day": 15,
        "lockdown_duration": 20
    }
    res = client.post("/api/policy/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "trajectories" in data
    assert "baseline" in data["trajectories"]
    assert "hard_lockdown" in data["trajectories"]
    assert "adaptive_control" in data["trajectories"]
    assert "pid_controller" in data["trajectories"]
    assert len(data["scorecard"]) == 4


def test_vaccine_evaluate_api():
    payload = {
        "population": 100_000,
        "daily_doses": 1_000,
        "r0": 2.2,
        "days": 50
    }
    res = client.post("/api/vaccine/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "elderly_first" in data["strategies"]
    assert "contact_first" in data["strategies"]
    assert "random" in data["strategies"]


def test_rt_estimation_api():
    payload = {
        "dataset_preset": "mumbai_wave_2",
        "infectious_period": 7.0,
        "smoothing_window": 7
    }
    res = client.post("/api/rt/estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["rt_estimates"]) > 0
    assert len(data["smoothed_cases"]) > 0
    assert "current_rt" in data
    assert "epidemic_status" in data
