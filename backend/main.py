import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root (parent of backend) is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from backend.config import API_TITLE, API_VERSION, API_HOST, API_PORT
    from backend.services.telemetry_service import TelemetryService
    from backend.api.routes import router
    from backend.api.websocket_handler import websocket_telemetry
except ImportError:
    from config import API_TITLE, API_VERSION, API_HOST, API_PORT
    from services.telemetry_service import TelemetryService
    from api.routes import router
    from api.websocket_handler import websocket_telemetry

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info('Starting UAV Digital Twin Backend...')
    service = TelemetryService()
    await service.initialize()
    app.state.telemetry_service = service
    logging.info('Backend ready.')
    yield
    logging.info('Shutting down...')
    await service.shutdown()

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.add_api_websocket_route('/ws/telemetry', websocket_telemetry)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.main:app', host=API_HOST, port=API_PORT, reload=True, app_dir=PROJECT_ROOT)
