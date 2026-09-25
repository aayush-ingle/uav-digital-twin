from fastapi import WebSocket, WebSocketDisconnect

async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    service = websocket.app.state.telemetry_service
    service.websocket_connections.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Can process incoming commands if needed
    except WebSocketDisconnect:
        service.websocket_connections.discard(websocket)
