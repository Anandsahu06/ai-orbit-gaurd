import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

logger = logging.getLogger(__name__)

class CacheEntry:
    def __init__(self, group: str, records: List[NormalizedOrbitalRecord]):
        now = datetime.now(timezone.utc)
        self.group = group
        self.records = records
        self.fetched_at = now
        self.last_successful_fetch = now
        self.record_count = len(records)
        self.source = "CELESTRAK"

    @property
    def age_hours(self) -> float:
        now = datetime.now(timezone.utc)
        diff = (now - self.fetched_at).total_seconds()
        return round(diff / 3600.0, 2)

    @property
    def status(self) -> str:
        # If age is under 2.5 hours, it is FRESH
        if self.age_hours <= settings.DATA_REFRESH_INTERVAL_HOURS + 0.5:
            return "FRESH"
        return "STALE"

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "group": self.group,
            "record_count": self.record_count,
            "fetched_at": self.fetched_at.isoformat(),
            "last_updated": self.last_successful_fetch.isoformat(),
            "age_hours": self.age_hours,
            "status": self.status
        }

class IngestionCache:
    """
    In-memory and persistent cache layer to prevent redundant queries
    to external providers like CelesTrak.
    """
    def __init__(self):
        self._entries: Dict[str, CacheEntry] = {}
        self._last_global_fetch: Optional[datetime] = None

    def get(self, group: str) -> Optional[List[NormalizedOrbitalRecord]]:
        entry = self._entries.get(group.lower())
        if entry is None:
            return None
        # Check freshness
        if entry.status == "FRESH":
            return entry.records
        return None  # Stale, needs refresh if possible

    def get_any(self, group: str) -> Optional[List[NormalizedOrbitalRecord]]:
        """Returns cached data even if stale (fallback)."""
        entry = self._entries.get(group.lower())
        return entry.records if entry else None

    def put(self, group: str, records: List[NormalizedOrbitalRecord]) -> None:
        entry = CacheEntry(group=group.lower(), records=records)
        self._entries[group.lower()] = entry
        self._last_global_fetch = datetime.now(timezone.utc)
        logger.info(f"IngestionCache updated for group '{group}': {len(records)} records.")

    def is_fresh(self, group: str) -> bool:
        entry = self._entries.get(group.lower())
        return entry is not None and entry.status == "FRESH"

    def get_metadata(self, group: Optional[str] = None) -> Dict[str, Any]:
        if group and group.lower() in self._entries:
            return self._entries[group.lower()].get_metadata()

        # Global aggregate metadata
        total_records = sum(e.record_count for e in self._entries.values())
        min_age = min((e.age_hours for e in self._entries.values()), default=999.0)
        overall_status = "FRESH" if min_age <= settings.DATA_REFRESH_INTERVAL_HOURS + 0.5 and total_records > 0 else (
            "STALE" if total_records > 0 else "UNAVAILABLE"
        )
        last_up = self._last_global_fetch.isoformat() if self._last_global_fetch else None

        return {
            "source": "CELESTRAK",
            "total_cached_records": total_records,
            "active_groups": list(self._entries.keys()),
            "last_updated": last_up,
            "fetched_at": last_up,
            "age_hours": min_age if min_age < 999 else None,
            "status": overall_status
        }

ingestion_cache = IngestionCache()
