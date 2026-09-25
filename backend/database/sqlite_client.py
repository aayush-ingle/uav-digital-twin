import os
import sys
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from backend.config import SQLITE_DB_DIR, SQLITE_DB_PATH
    from backend.database.models import Base, Engine, Flight, Alert, MaintenanceRecord
except ImportError:
    from config import SQLITE_DB_DIR, SQLITE_DB_PATH
    from database.models import Base, Engine, Flight, Alert, MaintenanceRecord

class SQLiteClient:
    def __init__(self):
        if not os.path.exists(SQLITE_DB_DIR):
            os.makedirs(SQLITE_DB_DIR)
        
        self.engine = create_engine(f"sqlite:///{SQLITE_DB_PATH}", connect_args={"check_same_thread": False})
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.init_db()

    def init_db(self):
        try:
            Base.metadata.create_all(bind=self.engine)
            logging.info("SQLite tables created/verified successfully.")
        except Exception as e:
            logging.error(f"Failed to initialize SQLite: {e}")

    def add_engine(self, engine_id, hours=0.0, cycles=0):
        with self.SessionLocal() as session:
            engine = session.query(Engine).filter_by(engine_id=engine_id).first()
            if not engine:
                engine = Engine(
                    engine_id=engine_id, 
                    total_hours=hours, 
                    total_cycles=cycles,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                session.add(engine)
                session.commit()
                session.refresh(engine)
            return engine

    def get_engine(self, engine_id):
        with self.SessionLocal() as session:
            return session.query(Engine).filter_by(engine_id=engine_id).first()

    def update_engine_hours(self, engine_id, hours, cycles):
        with self.SessionLocal() as session:
            engine = session.query(Engine).filter_by(engine_id=engine_id).first()
            if engine:
                engine.total_hours = float(hours)
                engine.total_cycles = int(cycles)
                engine.updated_at = datetime.now()
                session.commit()

    def add_flight(self, engine_id, mission_type, start_time):
        with self.SessionLocal() as session:
            flight = Flight(engine_id=engine_id, mission_type=mission_type, start_time=start_time, status='in_progress')
            session.add(flight)
            session.commit()
            session.refresh(flight)
            return flight

    def end_flight(self, flight_id, end_time, status='completed'):
        with self.SessionLocal() as session:
            flight = session.query(Flight).filter_by(id=flight_id).first()
            if flight:
                flight.end_time = end_time
                flight.status = status
                if flight.start_time and flight.end_time:
                    delta = flight.end_time - flight.start_time
                    flight.duration_hours = delta.total_seconds() / 3600.0
                session.commit()

    def get_flights(self, engine_id=None, limit=50):
        with self.SessionLocal() as session:
            query = session.query(Flight)
            if engine_id:
                query = query.filter_by(engine_id=engine_id)
            return query.order_by(Flight.start_time.desc()).limit(limit).all()

    def add_alert(self, engine_id, alert_type, severity, fault_type=None, rul_hours=None, message=''):
        with self.SessionLocal() as session:
            alert = Alert(
                engine_id=engine_id,
                timestamp=datetime.now(),
                alert_type=alert_type,
                severity=severity,
                fault_type=fault_type,
                rul_hours=float(rul_hours) if rul_hours is not None else None,
                message=message
            )
            session.add(alert)
            session.commit()
            session.refresh(alert)
            return alert

    def get_alerts(self, engine_id=None, acknowledged=None, limit=100):
        with self.SessionLocal() as session:
            query = session.query(Alert)
            if engine_id:
                query = query.filter_by(engine_id=engine_id)
            if acknowledged is not None:
                query = query.filter_by(acknowledged=acknowledged)
            return query.order_by(Alert.timestamp.desc()).limit(limit).all()

    def acknowledge_alert(self, alert_id):
        with self.SessionLocal() as session:
            alert = session.query(Alert).filter_by(id=alert_id).first()
            if alert:
                alert.acknowledged = True
                session.commit()

    def add_maintenance(self, engine_id, maintenance_type, description, performed_by=None, next_due=None):
        with self.SessionLocal() as session:
            maintenance = MaintenanceRecord(
                engine_id=engine_id,
                timestamp=datetime.now(),
                maintenance_type=maintenance_type,
                description=description,
                performed_by=performed_by,
                next_due_hours=float(next_due) if next_due is not None else None
            )
            session.add(maintenance)
            session.commit()

    def get_maintenance(self, engine_id=None, limit=50):
        with self.SessionLocal() as session:
            query = session.query(MaintenanceRecord)
            if engine_id:
                query = query.filter_by(engine_id=engine_id)
            return query.order_by(MaintenanceRecord.timestamp.desc()).limit(limit).all()
