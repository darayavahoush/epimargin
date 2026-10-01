import numpy as np
from typing import List, Dict, Any
from scipy.spatial import distance_matrix
from epimargin.models import SIR, NetworkedSIR
from ..schemas import NetworkSimulationRequest, NetworkSimulationResponse, NodeSimulationResult


def build_migration_matrix(
    coords: np.ndarray,
    populations: np.ndarray,
    topology: str,
    gravity_power: float,
    mobility_scale: float
) -> np.ndarray:
    n = len(populations)
    if n <= 1:
        return np.ones((1, 1))

    if topology == "gravity":
        dist_mat = distance_matrix(coords, coords)
        # Avoid division by zero on diagonal
        with np.errstate(divide='ignore'):
            inv_dist = np.where(dist_mat > 0, dist_mat ** (-gravity_power), 0.0)
        # Weight by destination population (gravity law)
        P = inv_dist * populations[:, None]
        col_sums = P.sum(axis=0, keepdims=True)
        col_sums[col_sums == 0] = 1.0
        P = (P / col_sums) * mobility_scale
        # Set diagonal to retention rate
        np.fill_diagonal(P, 1.0 - mobility_scale)
        return P

    elif topology == "ring":
        P = np.zeros((n, n))
        for i in range(n):
            left = (i - 1) % n
            right = (i + 1) % n
            P[left, i] = mobility_scale / 2.0
            P[right, i] = mobility_scale / 2.0
            P[i, i] = 1.0 - mobility_scale
        return P

    elif topology == "hub_and_spoke":
        # Node 0 is the central hub
        P = np.zeros((n, n))
        for i in range(1, n):
            # Commuting to hub and back
            P[0, i] = mobility_scale * 0.8
            P[i, 0] = (mobility_scale / (n - 1)) * 0.8
            P[i, i] = 1.0 - P[0, i]
        P[0, 0] = 1.0 - np.sum(P[1:, 0])
        return P

    elif topology == "fully_connected":
        off_diag = mobility_scale / max(1, n - 1)
        P = np.full((n, n), off_diag)
        np.fill_diagonal(P, 1.0 - mobility_scale)
        return P

    else:
        # Default symmetric uniform
        P = np.eye(n)
        return P


def run_network_simulation(req: NetworkSimulationRequest) -> NetworkSimulationResponse:
    seed = req.random_seed if req.random_seed is not None else 42
    np.random.seed(seed)

    n_nodes = len(req.nodes)
    if n_nodes == 0:
        raise ValueError("At least one node is required for network simulation.")

    names = [node.name for node in req.nodes]
    populations = np.array([node.population for node in req.nodes], dtype=float)
    initial_infections = [node.initial_infected for node in req.nodes]
    r0_values = [node.r0 for node in req.nodes]

    # Node coordinates for gravity calculation
    coords = []
    for i, node in enumerate(req.nodes):
        if node.x != 0.0 or node.y != 0.0:
            coords.append([node.x, node.y])
        else:
            # Place in a ring circle if coordinates not explicitly given
            angle = 2.0 * np.pi * i / n_nodes
            radius = 5.0
            coords.append([radius * np.cos(angle), radius * np.sin(angle)])
    coords = np.array(coords)

    # Build Migration Transmission Matrix
    if req.topology == "custom" and req.custom_migrations:
        P = np.array(req.custom_migrations, dtype=float)
    else:
        P = build_migration_matrix(
            coords=coords,
            populations=populations,
            topology=req.topology,
            gravity_power=req.gravity_power,
            mobility_scale=req.inter_region_mobility
        )

    # Initialize SIR units
    units = []
    for i, node in enumerate(req.nodes):
        sir_unit = SIR(
            name=node.name,
            population=int(node.population),
            I0=int(initial_infections[i]),
            Rt0=float(r0_values[i]),
            mobility=float(node.mobility_out),
            random_seed=seed + i
        )
        units.append(sir_unit)

    # Run Networked SIR
    net_model = NetworkedSIR(units, np.matrix(P), random_seed=seed)
    net_model.run(req.days)

    days_vec = list(range(req.days + 1))

    # Collect per-node trajectories and summaries
    results: List[NodeSimulationResult] = []
    for i, unit in enumerate(units):
        i_series = [float(x) for x in unit.I]
        d_series = [float(x) for x in unit.D]
        total_cases = [float(x) for x in unit.total_cases]
        peak_infected = int(max(i_series))
        peak_day = int(i_series.index(peak_infected))
        final_deaths = int(d_series[-1])

        results.append(NodeSimulationResult(
            id=req.nodes[i].id,
            name=unit.name,
            population=int(unit.pop0),
            I=i_series,
            D=d_series,
            total_cases=total_cases,
            peak_infected=peak_infected,
            peak_day=peak_day,
            final_deaths=final_deaths
        ))

    # Aggregates across all nodes
    agg_I = [sum(results[node_idx].I[t] for node_idx in range(n_nodes)) for t in days_vec]
    agg_D = [sum(results[node_idx].D[t] for node_idx in range(n_nodes)) for t in days_vec]
    agg_total_cases = [sum(results[node_idx].total_cases[t] for node_idx in range(n_nodes)) for t in days_vec]

    summary = {
        "total_population": int(populations.sum()),
        "peak_active_cases": int(max(agg_I)),
        "peak_day": int(agg_I.index(max(agg_I))),
        "total_fatalities": int(agg_D[-1]),
        "attack_rate": round(agg_total_cases[-1] / populations.sum(), 4)
    }

    return NetworkSimulationResponse(
        days=days_vec,
        nodes=results,
        aggregate_I=agg_I,
        aggregate_D=agg_D,
        aggregate_total_cases=agg_total_cases,
        migration_matrix=P.tolist(),
        summary=summary
    )
