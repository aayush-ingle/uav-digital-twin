# UAV Engine Digital Twin Backend

This project provides the FastAPI backend infrastructure for a UAV Engine Digital Twin. It handles high-frequency sensor telemetry simulation, real-time ML-based predictions (Remaining Useful Life and anomaly detection), and robust data storage and streaming capabilities using SQLite, InfluxDB, and MQTT.

## Architecture

- **FastAPI Framework**: Provides high-performance REST APIs and WebSocket handling.
- **Telemetry Service**: The orchestrator. It manages the simulation loop, integrates the engine physical models (ODE/Kalman Filters) with ML models, and dispatches data.
- **Data Persistence**:
  - **SQLite**: Stores metadata, historical engine state, flights, alerts, and maintenance records.
  - **InfluxDB**: Used for time-series telemetry storage (graceful degradation if unavailable).
- **Messaging (MQTT)**: Real-time telemetry and alert publishing (graceful degradation if unavailable).
- **WebSockets**: Allows the front-end to connect and stream telemetry directly at 10+ Hz.

## Prerequisites
- Python 3.10+
- Optional: Mosquitto MQTT Broker
- Optional: InfluxDB v2

*(Note: The system is designed to gracefully degrade. If Mosquitto or InfluxDB are not running, it logs warnings and continues operating using SQLite.)*

## Setup Instructions

1. **Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Train Models** (Assuming an external ML pipeline):
   Ensure ML models are saved in the `ML_MODELS_DIR` defined in `config.py`.

4. **Start the Server**:
   ```bash
   cd "d:\SIH project"
   python -m backend.main
   ```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/status` | Get simulation status and reading counts |
| POST | `/api/simulation/start` | Start telemetry simulation |
| POST | `/api/simulation/stop` | Stop telemetry simulation |
| POST | `/api/simulation/fault` | Inject a specific fault type |
| GET | `/api/engine/health` | Get current health summary |
| GET | `/api/engine/history` | Get recent historical readings |
| GET | `/api/engine/latest` | Get the most recent single reading |
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts/{id}/acknowledge`| Acknowledge an alert |
| GET | `/api/flights` | List flight records |
| GET | `/api/maintenance` | List maintenance records |

## WebSocket Usage Example

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/telemetry");
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Telemetry Received:", data);
};
```
