import os
import sys
import json
import logging
from datetime import datetime
import numpy as np
import paho.mqtt.client as mqtt

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from backend.config import (
        MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_KEEPALIVE, 
        MQTT_CLIENT_ID, MQTT_TOPIC_TELEMETRY, MQTT_TOPIC_ALERTS, 
        MQTT_TOPIC_COMMANDS, MQTT_QOS
    )
except ImportError:
    from config import (
        MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_KEEPALIVE, 
        MQTT_CLIENT_ID, MQTT_TOPIC_TELEMETRY, MQTT_TOPIC_ALERTS, 
        MQTT_TOPIC_COMMANDS, MQTT_QOS
    )

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

class MQTTClient:
    def __init__(self):
        self.is_connected = False
        self.client = mqtt.Client(client_id=MQTT_CLIENT_ID)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info("Connected to MQTT broker")
            self.is_connected = True
        else:
            logging.warning(f"Failed to connect to MQTT broker, return code {rc}")
            self.is_connected = False

    def _on_disconnect(self, client, userdata, rc):
        logging.info("Disconnected from MQTT broker")
        self.is_connected = False

    def connect(self):
        try:
            logging.info(f"Connecting to MQTT broker at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}...")
            self.client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_KEEPALIVE)
            self.client.loop_start()
            self.is_connected = True
        except Exception as e:
            logging.warning(f"MQTT connection failed: {e}. Graceful degradation active.")
            self.is_connected = False
    
    def disconnect(self):
        if self.is_connected:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False
    
    def publish_telemetry(self, data: dict):
        if self.is_connected:
            try:
                payload = json.dumps(data, default=json_serial)
                self.client.publish(MQTT_TOPIC_TELEMETRY, payload, qos=MQTT_QOS)
            except Exception as e:
                logging.error(f"Failed to publish telemetry: {e}")
    
    def publish_alert(self, alert: dict):
        if self.is_connected:
            try:
                payload = json.dumps(alert, default=json_serial)
                self.client.publish(MQTT_TOPIC_ALERTS, payload, qos=MQTT_QOS)
            except Exception as e:
                logging.error(f"Failed to publish alert: {e}")
    
    def subscribe_commands(self, callback):
        if self.is_connected:
            self.client.subscribe(MQTT_TOPIC_COMMANDS, qos=MQTT_QOS)
            self.client.message_callback_add(MQTT_TOPIC_COMMANDS, callback)
