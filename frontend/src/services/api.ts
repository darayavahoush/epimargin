import type {
  SIRSimulationRequest,
  SIRSimulationResponse,
  NetworkSimulationRequest,
  NetworkSimulationResponse,
  PolicyComparisonRequest,
  PolicyComparisonResponse,
  VaccinePrioritizationRequest,
  VaccinePrioritizationResponse,
  RtEstimationRequest,
  RtEstimationResponse,
  DatasetPreset
} from '../types/api';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let detail = `Error ${res.status}: ${res.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.detail) detail = parsed.detail;
    } catch {
      if (errorText) detail = errorText;
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  checkHealth: async (): Promise<{ status: string; version: string }> => {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  getPresets: async (): Promise<DatasetPreset[]> => {
    const res = await fetch(`${API_BASE}/presets`);
    return handleResponse(res);
  },

  getPresetData: async (presetKey: string): Promise<{ id: string; name: string; dates: string[]; cases: number[] }> => {
    const res = await fetch(`${API_BASE}/presets/${presetKey}`);
    return handleResponse(res);
  },

  simulateSIR: async (req: SIRSimulationRequest): Promise<SIRSimulationResponse> => {
    const res = await fetch(`${API_BASE}/simulate/sir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res);
  },

  simulateNetwork: async (req: NetworkSimulationRequest): Promise<NetworkSimulationResponse> => {
    const res = await fetch(`${API_BASE}/simulate/network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res);
  },

  comparePolicies: async (req: PolicyComparisonRequest): Promise<PolicyComparisonResponse> => {
    const res = await fetch(`${API_BASE}/policy/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res);
  },

  evaluateVaccines: async (req: VaccinePrioritizationRequest): Promise<VaccinePrioritizationResponse> => {
    const res = await fetch(`${API_BASE}/vaccine/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res);
  },

  estimateRt: async (req: RtEstimationRequest): Promise<RtEstimationResponse> => {
    const res = await fetch(`${API_BASE}/rt/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse(res);
  }
};
