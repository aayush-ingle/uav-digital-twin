# PROJECT BRIEF — AI-Enabled Digital Twin for MALE UAV Piston Engines
### Drop this file in your Antigravity project root (e.g. `docs/PROJECT_BRIEF.md`) so any agent you spin up has full context from turn one.

---

## 1. What We're Building (One Paragraph)

An AI-enabled real-time Digital Twin system for a MALE UAV aero piston engine, for Smart India Hackathon. Real engine sensors (RPM, CHT, EGT, oil pressure/temp, fuel flow, vibration, battery/alternator, injection timing) stream over CAN bus to a physics-based virtual engine model kept in sync via a Kalman Filter. An AI/ML layer watches both real and virtual data to detect anomalies, classify faults, and estimate Remaining Useful Life (RUL). Results surface on a real-time dashboard, with mission replay and pre-flight go/no-go simulation capability. The goal is to move from today's reactive, threshold-based UAV engine monitoring to predictive, physics-informed diagnostics.

---

## 2. Recommended Repo Structure

```
digital-twin-uav-engine/
├── docs/
│   ├── PROJECT_BRIEF.md              # this file
│   ├── build_guide.md                # full architecture + tech stack doc
│   └── dataset_feature_dictionary.md # column-by-column schema reference
├── data/
│   ├── raw/                          # aero_piston_engine_digital_twin_5000.xlsx lives here
│   └── generator/                    # Python synthetic data generator (ODE + fault injection)
├── digital_twin_core/                # physics ODE model + Kalman filter sync
├── ml_models/                        # anomaly detection, fault classification, RUL regression
├── backend/                          # FastAPI service, MQTT ingestion, DB access
├── dashboard/                        # Streamlit (fast) or React (polished) frontend
├── simulation/                       # mission replay + environmental what-if engine
└── tests/
```

---

## 3. Architecture — Data Flow (Condensed)

```
Sensors → CAN bus → Edge DAQ (Raspberry Pi/Jetson) → MQTT → FastAPI ingestion
   → InfluxDB (time-series storage) → Digital Twin Core (ODE model + Kalman Filter sync)
   → Feature extraction (rates of change, FFT, ratios) → AI/ML layer
   (anomaly detection → fault classification → RUL estimation)
   → Dashboard (live health, alerts, RUL, mission replay)
```

---

## 4. Dataset — Already Exists, Use This As Ground Truth

File: `aero_piston_engine_digital_twin_5000.xlsx` — **5,000 rows × 59 columns**, already validated against our schema.

- **5 engines** (`ENG_001`–`005`), mixed ages (195–1,367 cumulative hours) — good fleet diversity.
- **100 missions**, 1-second sampling interval.
- **70.8% healthy rows, 29.2% faulty** across 8 balanced fault types (`misfire`, `injector_abnormality`, `cooling_degradation`, `lubrication_issue`, `sensor_drift`, `combustion_instability`, `overheating`, `vibration_anomaly`).
- **Virtual sensor redundancy confirmed working**: `is_virtual_reading_*` is `True` exactly when `sensor_status_* == dropout`, `False` otherwise — the twin correctly substitutes its own prediction during sensor dropout.
- **Known issues to fix in the generator / before training:**
  1. `residual_cht` and `residual_egt` have a positive mean bias (twin under-predicts real values slightly) — investigate whether this is fault-driven (fine) or a calibration bug (fix it).
  2. `engine_operating_hours_cumulative` and `flight_cycle_count` jump by multiple hours/cycles across consecutive 1-second-apart rows — needs either a fix (make these increment consistently with the timestamp deltas) or a documented rationale ("represents life-position at start of each mission snippet").
- Full column-by-column reference: see `docs/dataset_feature_dictionary.md`.

---

## 5. Tech Stack by Module

| Module | Stack |
|---|---|
| Sensors/DAQ | Thermocouples, pressure transducers, MEMS accelerometer, Hall RPM sensor; CAN bus via `python-can` |
| Edge compute | Raspberry Pi 4/5 or NVIDIA Jetson Nano |
| Messaging | MQTT (Eclipse Mosquitto) |
| Backend API | Python FastAPI, WebSockets for live push |
| Time-series DB | InfluxDB or TimescaleDB |
| Relational DB | PostgreSQL / SQLite |
| Physics model | Python NumPy/SciPy ODE solvers (`solve_ivp`); optionally OpenModelica |
| State sync | Kalman Filter via `filterpy` |
| ML/AI | scikit-learn, PyTorch/TensorFlow, `shap` for explainability |
| Edge AI | TensorFlow Lite / ONNX Runtime |
| Dashboard | Streamlit (fastest to demo) or React + Recharts/D3.js (more polished) |
| Containerization | Docker |

---

## 6. Differentiating Features — Build These, In Priority Order

1. **Pre-Flight Mission Go/No-Go Advisor** — simulate a planned mission profile forward through the twin against current engine health; output a go/no-go recommendation with reasoning. Directly answers "mission reliability" in the problem title.
2. **Self-Calibrating Digital Twin with live Fidelity Score** — already partially proven in the dataset (`twin_fidelity_score`); wire this to auto-adjust physics model parameters when fidelity drifts.
3. **Virtual Sensor Redundancy** — already validated in the dataset; make sure the live system visibly demos this (inject a dropout live, show the twin filling the gap).
4. **Conversational AI Copilot** — chat box on the dashboard that answers "why is this engine flagged?" using SHAP outputs + trend data, in plain English.

(Secondary, mention in roadmap even if not fully built: uncertainty-aware RUL bands, counterfactual mission replay, auto-generated flight debrief reports, fleet-level benchmarking.)

---

## 7. Build Phases (Use As Agent Task List)

1. **Synthetic Data Generator** — Python ODE-based physics model + fault injection logic, reproducing (and fixing the known issues in) the existing dataset schema.
2. **Backend Pipeline** — MQTT broker → FastAPI ingestion → InfluxDB storage, streaming the generator's output as simulated live telemetry.
3. **Digital Twin Core** — ODE model + Kalman Filter synchronization against incoming data; validate twin tracks "real" data closely.
4. **AI/ML Layer** — train anomaly detection (Isolation Forest → LSTM autoencoder), fault classification, and RUL regression on the dataset.
5. **Dashboard** — live gauges, health index, fault alerts, RUL display, wired via WebSocket.
6. **Simulation & Replay** — mission replay slider + environmental what-if mode + Go/No-Go Advisor.
7. **Polish & Docs** — Docker packaging, demo video, technical documentation, deployment roadmap.

---

## 8. Suggested First Prompts to Give the Antigravity Agent

Copy-paste one of these as your first task, adjusting scope to how much autonomy you want to grant:

> **Task 1 (Phase 1):** "Read `docs/PROJECT_BRIEF.md` and `docs/dataset_feature_dictionary.md`. Build a Python synthetic data generator in `data/generator/` that reproduces this schema using an ODE-based thermodynamic engine model with injected faults for all 8 fault types listed. Fix the two known issues: eliminate the CHT/EGT residual bias unless fault-driven, and make `engine_operating_hours_cumulative`/`flight_cycle_count` increment consistently with the 1-second timestamp deltas. Validate the output against `data/raw/aero_piston_engine_digital_twin_5000.xlsx` for statistical similarity."

> **Task 2 (Phase 2, after Task 1):** "Set up the backend pipeline in `backend/`: a FastAPI service that ingests simulated telemetry from the generator via MQTT and writes it to InfluxDB, with a WebSocket endpoint for live streaming to the dashboard."

> **Task 3 (Phase 3):** "In `digital_twin_core/`, implement the physics-based ODE engine model and a Kalman Filter that synchronizes it against incoming sensor data in real time, producing `twin_predicted_*` and `residual_*` values matching the dataset schema."

Run these one at a time in **Planning mode** (agent proposes a plan, pauses for your approval, then executes) rather than full autonomy, since correctness of the physics model matters for your judging credibility.
