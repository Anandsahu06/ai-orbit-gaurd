import logging
from fastapi import APIRouter
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics (v1)"])
logger = logging.getLogger(__name__)

@router.get("")
def get_analytics():
    """
    Returns dynamic fleet metrics, risk distributions, and regime statistics calculated from the database.
    """
    return analytics_service.get_comprehensive_analytics()
