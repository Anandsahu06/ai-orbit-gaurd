import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import SessionLocal
from app.models.db_models import Satellite
from app.services.data_ingestion.scheduler import ingestion_scheduler
from app.services.conjunction_engine import conjunction_engine
from app.ml.train import train_and_register_model
from app.ml.model_registry import model_registry

# Route imports
from app.api.v1 import v1_router
from app.api.frontend_compat import compat_router
from app.api.routes_objects import router as objects_router
from app.api.routes_conjunctions import router as conjunctions_router
from app.api.routes_simulation import router as simulation_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_analytics import router as analytics_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OrbitalGuard AI Decision-Support Backend...")

    # 1. Initialize ML model if not already registered
    try:
        if model_registry.load_latest_model() is None:
            logger.info("Training and registering baseline Random Forest prototype model...")
            train_and_register_model()
    except Exception as e:
        logger.warning(f"ML model registration notice: {e}")

    # 2. Check database population; if empty, run initial ingestion
    try:
        db = SessionLocal()
        sat_count = db.query(Satellite).count()
        db.close()
        if sat_count == 0:
            logger.info("Database empty. Ingesting initial orbital data groups...")
            ingestion_scheduler.run_ingestion_cycle(groups=["stations"])
    except Exception as e:
        logger.warning(f"Initial ingestion check notice: {e}")

    # 3. Run initial computational conjunction screening
    try:
        conjunction_engine.run_screening()
        logger.info("Completed initial conjunction screening pass.")
    except Exception as e:
        logger.warning(f"Initial conjunction screening notice: {e}")

    logger.info("OrbitalGuard AI Backend ready.")
    yield
    logger.info("Shutting down OrbitalGuard AI Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Assisted Space Traffic Management Decision Support Platform",
    lifespan=lifespan
)

# CORS middleware to support local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Official Versioned REST API (/api/v1/...)
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)

# 2. Frontend Compatibility & Existing Routers (/api/...)
app.include_router(compat_router, prefix=settings.API_PREFIX)
app.include_router(objects_router, prefix=settings.API_PREFIX)
app.include_router(simulation_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "platform": "OrbitalGuard AI",
        "status": "OPERATIONAL",
        "role": "AI-Assisted Space Traffic Management Decision Support Platform",
        "version": settings.VERSION,
        "disclaimer": "Decision-support prototype only. Not for autonomous spacecraft control."
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "SGP4 + Scikit-Learn + PostgreSQL",
        "scientific_role": "Decision support prototype"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

