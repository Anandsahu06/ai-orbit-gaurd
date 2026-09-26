from fastapi import APIRouter
from app.api.v1.satellites import router as satellites_router
from app.api.v1.conjunctions import router as conjunctions_router
from app.api.v1.risk import router as risk_router
from app.api.v1.simulations import router as simulations_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.admin import router as admin_router

v1_router = APIRouter()

v1_router.include_router(satellites_router)
v1_router.include_router(conjunctions_router)
v1_router.include_router(risk_router)
v1_router.include_router(simulations_router)
v1_router.include_router(analytics_router)
v1_router.include_router(alerts_router)
v1_router.include_router(admin_router)

@v1_router.get("/health", tags=["Health"])
def v1_health():
    return {
        "status": "healthy",
        "api_version": "v1",
        "engine": "SGP4 + Scikit-Learn + PostgreSQL"
    }

__all__ = ["v1_router"]
