import os
import sys
import asyncio
import logging
import json
from collections import deque
from datetime import datetime
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from backend.config import SIMULATION_INTERVAL_SEC, HISTORY_MAX_SIZE, DEFAULT_ENGINE_ID, ML_MODELS_DIR
    from backend.mqtt.client import MQTTClient
    from backend.database.influx_client import InfluxDBClient
    from backend.database.sqlite_client import SQLiteClient
    from backend.sensor.producer import EngineSensorProducer
    from backend.ml.predictor import EnginePredictor
except ImportError:
    from config import SIMULATION_INTERVAL_SEC, HISTORY_MAX_SIZE, DEFAULT_ENGINE_ID, ML_MODELS_DIR
    from mqtt.client import MQTTClient
    from database.influx_client import InfluxDBClient
    from database.sqlite_client import SQLiteClient
    from sensor.producer import EngineSensorProducer
    from ml.predictor import EnginePredictor

def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.bool_):
        return bool(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

class TelemetryService:
    def __init__(self):
        self.sensor = None
        self.predictor = None
        self.mqtt_client = None
        self.influx_client = None
        self.sqlite_client = None
        
        self.is_running = False
        self.history = deque(maxlen=HISTORY_MAX_SIZE)
        self.websocket_connections = set()
        self.current_fault = 'none'
        self.current_engine_id = DEFAULT_ENGINE_ID
        self._task = None
        self.latest_reading = None
    
    async def initialize(self):
        logging.info("Initializing Telemetry Service...")
        
        self.mqtt_client = MQTTClient()
        self.mqtt_client.connect()
        
        self.influx_client = InfluxDBClient()
        self.influx_client.connect()
        
        self.sqlite_client = SQLiteClient()
        
        self.sensor = EngineSensorProducer(self.current_engine_id, use_digital_twin=True)
        self.predictor = EnginePredictor(models_dir=ML_MODELS_DIR)
        
        self.sqlite_client.add_engine(self.current_engine_id)
        
        logging.info("Telemetry Service initialized.")
    
    async def start_simulation(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._simulation_loop())
            logging.info("Simulation started.")
    
    async def stop_simulation(self):
        if self.is_running:
            self.is_running = False
            if self._task:
                self._task.cancel()
            logging.info("Simulation stopped.")
    
    async def _simulation_loop(self):
        while self.is_running:
            try:
                reading = self.sensor.generate_reading()
                
                if self.predictor.is_loaded:
                    predictions = self.predictor.predict_all(reading)
                    reading.update(predictions)
                
                reading['timestamp'] = datetime.now().isoformat()
                
                self.mqtt_client.publish_telemetry(reading)
                self.influx_client.write_telemetry(reading)
                
                anomaly = reading.get('anomaly', 0)
                rul = reading.get('rul_hours', 999)
                predicted_fault = reading.get('fault_type', 'unknown')
                
                if anomaly == 1:
                    severity = 'high' if rul < 100 else 'medium'
                    self.sqlite_client.add_alert(
                        engine_id=self.current_engine_id,
                        alert_type='anomaly',
                        severity=severity,
                        fault_type=predicted_fault,
                        rul_hours=rul,
                        message=f"Anomaly detected: {predicted_fault}"
                    )
                    self.mqtt_client.publish_alert({
                        'engine_id': self.current_engine_id,
                        'fault_type': predicted_fault,
                        'rul_hours': rul,
                        'severity': severity,
                        'timestamp': datetime.now().isoformat()
                    })
                
                self.latest_reading = reading
                self.history.append(reading)
                
                await self._broadcast_websocket(reading)
                
                self.sqlite_client.update_engine_hours(
                    self.current_engine_id,
                    reading.get('engine_operating_hours_cumulative', 0),
                    reading.get('flight_cycle_count', 0)
                )
                
            except Exception as e:
                logging.error(f'Simulation loop error: {e}', exc_info=True)
            
            await asyncio.sleep(SIMULATION_INTERVAL_SEC)
    
    async def _broadcast_websocket(self, data):
        if not self.websocket_connections:
            return
            
        message = json.dumps(data, default=json_serial)
        disconnected = set()
        
        for ws in self.websocket_connections:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.add(ws)
                
        for ws in disconnected:
            self.websocket_connections.discard(ws)
    
    def set_fault(self, fault_type: str):
        self.current_fault = fault_type
        self.sensor.set_fault(fault_type)
        logging.info(f"Fault set to: {fault_type}")
    
    def get_health_summary(self) -> dict:
        if not self.latest_reading:
            return {"status": "no data"}
            
        return {
            "engine_id": self.current_engine_id,
            "rul_hours": self.latest_reading.get("rul_hours"),
            "fault_type": self.latest_reading.get("fault_type"),
            "anomaly": self.latest_reading.get("anomaly"),
            "timestamp": self.latest_reading.get("timestamp")
        }
    
    def get_history(self, n: int = 100) -> list:
        return list(self.history)[-n:]
    
    async def shutdown(self):
        logging.info("Shutting down Telemetry Service...")
        await self.stop_simulation()
        if self.mqtt_client:
            self.mqtt_client.disconnect()
        if self.influx_client:
            self.influx_client.close()
        logging.info("Telemetry Service shut down.")
