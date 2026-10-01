# EpiMargin: Epidemiological Simulation & Policy Intelligence Platform

[![CI](https://github.com/COVID-IWG/epimargin/actions/workflows/ci.yml/badge.svg)](https://github.com/COVID-IWG/epimargin/actions/workflows/ci.yml)
[![Python Version](https://img.shields.io/badge/python-3.11%20%7C%203.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.142+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**EpiMargin** is a peer-reviewed, research-grade epidemiological modeling, spatial simulation, and policy optimization engine. Built with modern high-performance Python (FastAPI, NumPy, SciPy) and an interactive React 19 + TypeScript dashboard, it translates complex theoretical biostatistics and non-pharmaceutical intervention (NPI) control theory into an intuitive, publication-ready platform for researchers, public health decision-makers, and quantitative engineers.

Grounded in foundational literature from **Science** (Bubar et al., 2021), **NBER** (Malani et al., 2020), **PLoS Computational Biology** (Gostic et al., 2020), and the **Mansueto Institute for Urban Innovation** (Bettencourt & Soman, 2020).

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EpiMargin Platform UI                          │
│               React 19 · TypeScript · Tailwind CSS · SVG Charts        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (/api/*)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       FastAPI Backend Engine                           │
│     Pydantic v2 Schemas · Asynchronous Routes · OpenAPI Swagger Docs    │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
┌──────────────▼──────┐ ┌───────────▼────────┐ ┌─────────▼──────────────┐
│  Compartmental Core │ │  Spatial & Network │ │   Empirical Inference  │
│  - Stochastic SIR   │ │  - Gravity Matrix  │ │  - Notched Filtering   │
│  - Latent SEIR      │ │  - Metapopulation  │ │  - Analytical MPVS     │
│  - Monte Carlo CI   │ │  - Transit Flux    │ │  - Anomaly Annealing   │
└──────────────┬──────┘ └───────────┬────────┘ └─────────┬──────────────┘
               │                    │                    │
┌──────────────▼────────────────────▼────────────────────▼──────────────┐
│                       Policy & Control Lab                             │
│   - Malani et al. Adaptive Rt Zoning (Green/Yellow/Orange/Red)         │
│   - Closed-Loop Proportional-Integral-Derivative (PID) Regulation      │
│   - Age-Stratified Demographic Vaccine Prioritization (Age_SIRVD)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Core Capabilities

### 1. Stochastic Compartmental Simulation (SIR & SEIR)
- **Discrete Stochastic Transitions**: Replaces over-simplified continuous ODEs with coupled daily Poisson event transitions capturing demographic stochasticity and discrete integer counts.
- **Latent Incubation Dynamics (SEIR)**: Explicitly tracks exposed pre-symptomatic viral carriers ($E$).
- **Monte Carlo Envelopes**: Automated simulation replicates generating 5th, 50th, and 95th percentile confidence bands around active infectious loads.
- **Theoretical Invariants**: Real-time calculation of Herd Immunity Thresholds ($\text{HIT} = 1 - 1/R_0$), Peak Surge Timing, and Final Attack Rates ($1 - S_\infty / N$).

### 2. Spatial Metapopulation Network Model
- **Coupled Metapopulations**: Connects $N$ discrete geographic units via commuter and inter-district travel flows.
- **Gravity Law Migration Operator**:
  $$P_{ij} \propto \frac{N_j}{d_{ij}^\alpha} \quad (i \neq j), \qquad P_{ii} = 1 - \mu_i$$
- **Interactive Scrubber Canvas**: Scrub through the epidemic timeline and visualize spatial viral propagation waves crossing regional borders.
- **Migration Matrix Heatmaps**: Real-time inspection of transmission coupling probabilities $P$.

### 3. Policy Lab: Fixed Lockdown vs Adaptive Control vs PID
- **Fixed Hard Lockdowns**: Simulates the socioeconomic impacts of fixed-duration stay-at-home orders, highlighting rebound surges upon lifting.
- **Malani et al. (NBER) Adaptive Zoning**:
  - Dynamically stratifies regions into Green ($R_t < 1.0$), Yellow ($1.0 \le R_t < 1.4$), Orange ($1.4 \le R_t < 1.9$), and Red ($R_t \ge 1.9$).
  - Implements a *gradual release invariant* preventing destabilizing sudden exits from containment.
- **Closed-Loop PID Feedback Controller**:
  - Regulates non-pharmaceutical interventions via an engineered control loop:
    $$u(t) = k_P \, e(t) + k_I \int_0^t e(\tau)\,d\tau + k_D \frac{de(t)}{dt}, \quad e(t) = R_t - R_{\text{target}}$$
- **Healthcare Capacity Stress-Testing**: Visualizes ICU and hospital bed capacity overrun days and cumulative stringency costs.

### 4. Age-Stratified Vaccine Allocation Lab (Age_SIRVD)
- **Demographic Cohorts**: Strata across children (0-19), workforce (20-49), older adults (50-64), and elderly (65+).
- **Direct vs Indirect Protection Trade-Off**:
  - **Elderly-First Strategy**: Maximizes direct lives saved by targeting high infection fatality rate (IFR) cohorts.
  - **High-Contact Workforce Strategy**: Maximizes infections averted by severing transmission trees at highest-contact age cohorts.
  - **Proportional Random Allocation**: Serves as the control benchmark.

### 5. Empirical $R_t$ Estimation Engine
- **Bettencourt & Soman Analytical MPVS**: Closed-form Gamma conjugate posterior update avoiding costly and non-reproducible MCMC sampling:
  $$\alpha_t = \alpha_{t-1} + \Delta T_t, \qquad \beta_t = \beta_{t-1} + \Delta T_{t-1}$$
  $$\hat{R}_t = 1 + \frac{1}{\gamma} \ln \mathbb{E}\left[\text{Gamma}\left(\alpha_t, \frac{1}{\beta_t}\right)\right]$$
- **Notched Periodic Filtering**: Eliminates 7-day and 3.5-day day-of-week reporting artifacts.
- **Anomaly Detection with Mean-Preserving Variance Spread (MPVS)**: Detects batch data dumps and reporting backlogs, widening credible intervals while strictly preserving the underlying mean.
- **Curated Benchmark Datasets**: Includes historical surveillance records from the Mumbai Delta Surge (Spring 2021) and the NYC Omicron Surge (Winter 2021-22).

---

## 🚀 Quickstart & Installation

### Option A: Local Development Setup

#### 1. Clone the repository
```bash
git clone https://github.com/COVID-IWG/epimargin.git
cd epimargin
```

#### 2. Set up Python backend (3.11+)
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install fastapi uvicorn pydantic scipy pandas pytest httpx

# Run test suite to verify installation
pytest
```

#### 3. Start the FastAPI backend
```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation and interactive Swagger UI will be available at: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs).

#### 4. Set up and launch React frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to interact with the dashboard.

---

### Option B: Unified Production Deployment via Docker

Run the entire full-stack application (FastAPI backend + compiled React frontend) with a single command:

```bash
docker compose up --build
```
Navigate to [http://localhost:8000](http://localhost:8000) to access the integrated production app.

---

## 🧪 Testing & Verification

The test suite covers both unit logic and API endpoints across the compartmental, spatial, and estimation modules:

```bash
# Run all tests with verbose output
pytest -v

# Run with test coverage report
pytest --cov=epimargin --cov=backend/app
```

---

## 📚 Key Scientific Literature & References

1. **Adaptive Control Policies**:
   > Malani, A., Soman, S., Asher, S., Novosad, P., Imbert, C., Tandel, V., et al. (2020). *Adaptive control of COVID-19 outbreaks in India: Local, gradual, and trigger-based exit paths from lockdown.* National Bureau of Economic Research (NBER), Working Paper 27532. DOI: [10.3386/w27532](https://doi.org/10.3386/w27532)

2. **Vaccine Prioritization Modeling**:
   > Bubar, K. M., Reinholt, K., Kissler, S. M., Lipsitch, M., Cobey, S., Grad, Y. H., & Larremore, D. B. (2021). *Model-informed COVID-19 vaccine prioritization strategies by age and serostatus.* **Science**, 371(6532), 916–921. DOI: [10.1126/science.abe6959](https://doi.org/10.1126/science.abe6959)

3. **Reproduction Number Estimation & Control**:
   > Bettencourt, L. M., & Soman, S. (2020). *Systems Architecture for Real Time Epidemiological Prediction and Control.* Mansueto Institute for Urban Innovation Research Paper, No. 26. SSRN: [3748704](https://doi.org/10.2139/ssrn.3748704)

4. **Epidemiological Metrics Evaluation**:
   > Gostic, K. M., McGough, L., Baskerville, E. B., Abbott, S., Joshi, K., et al. (2020). *Practical considerations for measuring the effective reproductive number, Rt.* **PLoS Computational Biology**, 16(12), e1008409. DOI: [10.1371/journal.pcbi.1008409](https://doi.org/10.1371/journal.pcbi.1008409)

---

## 📄 License
This project is licensed under the terms of the [MIT License](license.txt).
Developed by the COVID International Working Group and academic collaborators.
