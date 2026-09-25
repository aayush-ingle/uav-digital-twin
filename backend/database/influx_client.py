import os
import sys
import logging
from influxdb_client import InfluxDBClient as InfluxClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from backend.config import INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET
except ImportError:
    from config import INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET

class InfluxDBClient:
    def __init__(self):
        self.is_connected = False
        self.client = None
        self.write_api = None
        self.query_api = None

    def connect(self):
        try:
            self.client = InfluxClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG, timeout=10000)
            health = self.client.health()
            if health.status == "pass":
                self.is_connected = True
                self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
                self.query_api = self.client.query_api()
                logging.info("Connected to InfluxDB")
            else:
                logging.warning("InfluxDB health check failed. Graceful degradation active.")
        except Exception as e:
            logging.warning(f"InfluxDB connection failed: {e}. Graceful degradation active.")
            self.is_connected = False

    def write_telemetry(self, data: dict):
        if not self.is_connected or not self.write_api:
            return
        
        try:
            point = Point("engine_sensors") \
                .tag("engine_id", data.get("engine_id", "unknown")) \
                .tag("flight_phase", data.get("flight_phase", "unknown")) \
                .tag("fault_type", data.get("fault_type", "none"))
            
            for key, value in data.items():
                if isinstance(value, (int, float)):
                    point.field(key, float(value))
            
            self.write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
        except Exception as e:
            logging.error(f"Failed to write to InfluxDB: {e}")

    def query_recent(self, engine_id: str, minutes: int = 5) -> list:
        if not self.is_connected or not self.query_api:
            return []
        
        query = f'''
        from(bucket: "{INFLUXDB_BUCKET}")
          |> range(start: -{minutes}m)
          |> filter(fn: (r) => r._measurement == "engine_sensors" and r.engine_id == "{engine_id}")
        '''
        try:
            result = self.query_api.query(org=INFLUXDB_ORG, query=query)
            return self._parse_result(result)
        except Exception as e:
            logging.error(f"Failed to query InfluxDB: {e}")
            return []

    def query_range(self, engine_id: str, start: str, stop: str) -> list:
        if not self.is_connected or not self.query_api:
            return []
        
        query = f'''
        from(bucket: "{INFLUXDB_BUCKET}")
          |> range(start: {start}, stop: {stop})
          |> filter(fn: (r) => r._measurement == "engine_sensors" and r.engine_id == "{engine_id}")
        '''
        try:
            result = self.query_api.query(org=INFLUXDB_ORG, query=query)
            return self._parse_result(result)
        except Exception as e:
            logging.error(f"Failed to query InfluxDB: {e}")
            return []
            
    def _parse_result(self, result):
        points = []
        for table in result:
            for record in table.records:
                points.append({
                    "time": record.get_time().isoformat(),
                    "field": record.get_field(),
                    "value": record.get_value(),
                    "engine_id": record.values.get("engine_id")
                })
        return points

    def close(self):
        if self.client:
            self.client.close()
            self.is_connected = False
