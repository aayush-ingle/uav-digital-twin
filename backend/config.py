"""
Central configuration for the UAV Engine Digital Twin Backend.
All settings can be overridden via environment variables.
"""

import os

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# ─── MQTT (Eclipse Mosquitto) ────────────────────────────────────────────────
MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_KEEPALIVE = 60
MQTT_CLIENT_ID = "uav-digital-twin-backend"
MQTT_TOPIC_TELEMETRY = "uav/engine/telemetry"
MQTT_TOPIC_ALERTS = "uav/engine/alerts"
MQTT_TOPIC_COMMANDS = "uav/engine/commands"
MQTT_QOS = 1

# ─── InfluxDB ────────────────────────────────────────────────────────────────
INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8086")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "my-super-secret-auth-token")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "uav-digital-twin")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "engine_telemetry")
INFLUXDB_TIMEOUT = 10_000

# ─── SQLite (metadata / relational) ─────────────────────────────────────────
SQLITE_DB_DIR = os.path.join(BASE_DIR, "data")
SQLITE_DB_PATH = os.path.join(SQLITE_DB_DIR, "metadata.db")

# ─── Simulation ─────────────────────────────────────────────────────────────
SIMULATION_INTERVAL_SEC = float(os.getenv("SIM_INTERVAL", "1.0"))
HISTORY_MAX_SIZE = 1000
DEFAULT_ENGINE_ID = "ENGINE_001"

# ─── ML Models ──────────────────────────────────────────────────────────────
ML_MODELS_DIR = os.path.join(BASE_DIR, "ml", "trained")

# ─── Dataset ────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(
    PROJECT_ROOT, "docs",
    "aero_piston_engine_digital_twin_5000.xlsx"
)

# ─── Server ─────────────────────────────────────────────────────────────────
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_TITLE = "AREON UAV Engine Digital Twin API"
API_VERSION = "1.0.0"
