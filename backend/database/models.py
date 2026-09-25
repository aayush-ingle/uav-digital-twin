from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Engine(Base):
    __tablename__ = 'engines'
    id = Column(Integer, primary_key=True)
    engine_id = Column(String(50), unique=True, nullable=False)
    total_hours = Column(Float, default=0.0)
    total_cycles = Column(Integer, default=0)
    status = Column(String(20), default='operational')  # operational, maintenance, retired
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class Flight(Base):
    __tablename__ = 'flights'
    id = Column(Integer, primary_key=True)
    engine_id = Column(String(50), nullable=False)
    mission_type = Column(String(50))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    duration_hours = Column(Float)
    status = Column(String(20))  # completed, aborted, in_progress
    notes = Column(Text)

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True)
    engine_id = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    alert_type = Column(String(50))  # anomaly, fault, rul_warning
    severity = Column(String(20))    # low, medium, high, critical
    fault_type = Column(String(50))
    rul_hours = Column(Float)
    message = Column(Text)
    acknowledged = Column(Boolean, default=False)

class MaintenanceRecord(Base):
    __tablename__ = 'maintenance_records'
    id = Column(Integer, primary_key=True)
    engine_id = Column(String(50), nullable=False)
    timestamp = Column(DateTime)
    maintenance_type = Column(String(100))
    description = Column(Text)
    performed_by = Column(String(100))
    next_due_hours = Column(Float)
