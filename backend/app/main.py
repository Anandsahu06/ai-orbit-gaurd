import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.services.tle_service import tle_service
from app.services.conjunction_engine import conjunction_engine
from app.api.routes_objects import router as objects_router
from app.api.routes_conjunctions import router as conjunctions_router
from app.api.routes_simulation import router as simulation_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_analytics import router as analytics_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OrbitalGuard AI Backend Engine...")
    # Optionally try to refresh live TLEs from CelesTrak in background
    try:
        tle_service.fetch_live_celestrak(group="stations")
    except Exception as e:
        logger.warning(f"Background CelesTrak sync failed ({e}). Proceeding with verified dataset.")
    conjunction_engine.run_screening()
    logger.info("OrbitalGuard AI Backend Engine ready.")
    yield
    logger.info("Shutting down OrbitalGuard AI Backend Engine.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Assisted Space Traffic Management Platform Prototype API",
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

# Register API routers
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(objects_router, prefix=settings.API_PREFIX)
app.include_router(conjunctions_router, prefix=settings.API_PREFIX)
app.include_router(simulation_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "platform": "OrbitalGuard AI",
        "status": "OPERATIONAL",
        "role": "AI-Assisted Space Traffic Management Decision Support Prototype",
        "version": settings.VERSION,
        "disclaimer": "Prototype decision-support platform. Not for operational spacecraft control."
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "engine": "SGP4 + Scikit-Learn"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
