from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix='/api', tags=['Engine Digital Twin'])

class FaultRequest(BaseModel):
    fault_type: str

class SimulationStatus(BaseModel):
    is_running: bool
    engine_id: str
    current_fault: str
    readings_count: int

@router.get('/status')
async def get_status(request: Request) -> SimulationStatus:
    service = request.app.state.telemetry_service
    return SimulationStatus(
        is_running=service.is_running,
        engine_id=service.current_engine_id,
        current_fault=service.current_fault,
        readings_count=len(service.history)
    )

@router.post('/simulation/start')
async def start_simulation(request: Request):
    service = request.app.state.telemetry_service
    await service.start_simulation()
    return {"status": "Simulation started"}

@router.post('/simulation/stop')
async def stop_simulation(request: Request):
    service = request.app.state.telemetry_service
    await service.stop_simulation()
    return {"status": "Simulation stopped"}

@router.post('/simulation/fault')
async def set_fault(request: Request, body: FaultRequest):
    service = request.app.state.telemetry_service
    try:
        service.set_fault(body.fault_type)
        return {"status": f"Fault set to {body.fault_type}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/engine/health')
async def get_health(request: Request):
    service = request.app.state.telemetry_service
    return service.get_health_summary()

@router.get('/engine/history')
async def get_history(request: Request, n: int = 100):
    service = request.app.state.telemetry_service
    return service.get_history(n)

@router.get('/engine/latest')
async def get_latest(request: Request):
    service = request.app.state.telemetry_service
    if not service.latest_reading:
        raise HTTPException(status_code=404, detail="No readings yet")
    return service.latest_reading

@router.get('/alerts')
async def get_alerts(request: Request, limit: int = 50):
    service = request.app.state.telemetry_service
    alerts = service.sqlite_client.get_alerts(limit=limit)
    return [
        {
            "id": a.id,
            "engine_id": a.engine_id,
            "timestamp": a.timestamp.isoformat(),
            "alert_type": a.alert_type,
            "severity": a.severity,
            "fault_type": a.fault_type,
            "rul_hours": a.rul_hours,
            "message": a.message,
            "acknowledged": a.acknowledged
        } for a in alerts
    ]

@router.post('/alerts/{alert_id}/acknowledge')
async def acknowledge_alert(request: Request, alert_id: int):
    service = request.app.state.telemetry_service
    service.sqlite_client.acknowledge_alert(alert_id)
    return {"status": "Alert acknowledged"}

@router.get('/flights')
async def get_flights(request: Request, limit: int = 50):
    service = request.app.state.telemetry_service
    flights = service.sqlite_client.get_flights(limit=limit)
    return [
        {
            "id": f.id,
            "engine_id": f.engine_id,
            "mission_type": f.mission_type,
            "start_time": f.start_time.isoformat() if f.start_time else None,
            "end_time": f.end_time.isoformat() if f.end_time else None,
            "duration_hours": f.duration_hours,
            "status": f.status,
            "notes": f.notes
        } for f in flights
    ]

@router.get('/maintenance')
async def get_maintenance(request: Request, limit: int = 50):
    service = request.app.state.telemetry_service
    records = service.sqlite_client.get_maintenance(limit=limit)
    return [
        {
            "id": r.id,
            "engine_id": r.engine_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "maintenance_type": r.maintenance_type,
            "description": r.description,
            "performed_by": r.performed_by,
            "next_due_hours": r.next_due_hours
        } for r in records
    ]

@router.get('/engine/explain')
async def get_explanation(request: Request):
    service = request.app.state.telemetry_service
    if not service.latest_reading:
        raise HTTPException(status_code=404, detail="No telemetry available yet to explain")
    explanations = service.predictor.explain_fault(service.latest_reading)
    return {
        "fault_type": service.latest_reading.get("fault_type", "none"),
        "anomaly": service.latest_reading.get("anomaly", 0),
        "explanations": explanations
    }

@router.get('/mission/replay-data')
async def get_replay_data(request: Request, limit: int = 200):
    service = request.app.state.telemetry_service
    # Returns the history points or simulated historical points for timeline scrubbing
    history = list(service.history)
    if len(history) < 20:
        # Generate initial realistic slice if history is short
        slice_data = []
        for _ in range(30):
            r = service.sensor.generate_reading()
            preds = service.predictor.predict_all(r)
            r.update(preds)
            slice_data.append(r)
        return slice_data
    return history[-limit:]

@router.get('/fault-types')
async def get_fault_types(request: Request):
    service = request.app.state.telemetry_service
    if service.sensor:
        return service.sensor.get_fault_types()
    return []
