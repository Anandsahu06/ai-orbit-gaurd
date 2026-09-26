import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "OrbitalGuard AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database Configuration (PostgreSQL primary, SQLite fallback for seamless local/test environments)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./orbitalguard.db"
    )

    # CelesTrak Configuration (Usage-policy compliant: 2h refresh, modern JSON/OMM format)
    CELESTRAK_BASE_URL: str = os.getenv("CELESTRAK_BASE_URL", "https://celestrak.org/NORAD/elements/gp.php")
    CELESTRAK_GROUPS: str = os.getenv(
        "CELESTRAK_GROUPS",
        "stations,active,starlink,cosmos-2251-debris,fengyun-1c-debris"
    )
    DATA_REFRESH_INTERVAL_HOURS: float = 2.0
    CELESTRAK_TIMEOUT_SECONDS: int = 15
    CELESTRAK_MAX_RETRIES: int = 3

    # Admin Security
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "orbitalguard-admin-secret-key")

    # Screening parameters
    DEFAULT_SCREENING_THRESHOLD_KM: float = 25.0
    CRITICAL_RISK_THRESHOLD_KM: float = 2.0
    HIGH_RISK_THRESHOLD_KM: float = 5.0
    MEDIUM_RISK_THRESHOLD_KM: float = 12.0
    DEFAULT_SCREENING_WINDOW_HOURS: float = 48.0
    SCREENING_TIME_STEP_SECONDS: int = 300  # 5 minutes coarse step

    # Demo Mode settings
    ENABLE_FALLBACK_DEMO_DATA: bool = True

    @property
    def celestrak_group_list(self) -> List[str]:
        return [g.strip() for g in self.CELESTRAK_GROUPS.split(",") if g.strip()]

settings = Settings()

