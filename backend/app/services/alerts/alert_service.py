import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.db_models import Alert as DBAlert
from app.models.schemas import ConjunctionEvent

logger = logging.getLogger(__name__)

class AlertService:
    """
    Operational Alert Engine with temporal and risk-level deduplication.
    Generates actionable STM notifications for HIGH and CRITICAL risk close approaches.
    """

    def process_conjunction_alerts(
        self,
        db: Session,
        events: List[ConjunctionEvent],
        dedup_window_hours: float = 24.0
    ) -> List[DBAlert]:
        """
        Evaluates screened conjunction events and emits alerts with deduplication.
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=dedup_window_hours)
        created_alerts: List[DBAlert] = []

        for ev in events:
            if ev.risk_level not in ["HIGH", "CRITICAL"]:
                continue

            # Deduplication check: Has an alert for this conjunction and risk level been created within the cutoff window?
            existing = db.query(DBAlert).filter(
                DBAlert.conjunction_id == ev.id,
                DBAlert.severity == ev.risk_level,
                DBAlert.created_at >= cutoff
            ).first()

            if existing:
                continue

            title = f"{ev.risk_level} Risk Conjunction: {ev.primary_name} vs {ev.secondary_name}"
            msg = (
                f"Predicted close approach at {ev.tca}. "
                f"Miss distance: {ev.miss_distance_km:.2f} km, "
                f"Relative velocity: {ev.relative_velocity_kms:.2f} km/s. "
                f"Prototype Risk Score: {ev.risk_score:.1f}."
            )

            alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
            alert = DBAlert(
                id=alert_id,
                conjunction_id=ev.id,
                severity=ev.risk_level,
                title=title,
                message=msg,
                is_read=False,
                created_at=now
            )
            db.add(alert)
            created_alerts.append(alert)
            logger.info(f"Generated operational alert {alert_id} for conjunction {ev.id}")

        if created_alerts:
            db.commit()

        return created_alerts

    def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            alerts = db.query(DBAlert).order_by(DBAlert.created_at.desc()).limit(limit).all()
            return [
                {
                    "id": a.id,
                    "conjunction_id": a.conjunction_id,
                    "severity": a.severity,
                    "title": a.title,
                    "message": a.message,
                    "is_read": a.is_read,
                    "created_at": a.created_at.isoformat() if a.created_at else None
                }
                for a in alerts
            ]
        finally:
            db.close()

alert_service = AlertService()
