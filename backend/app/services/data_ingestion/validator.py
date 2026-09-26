import math
import logging
from datetime import datetime, timezone
from typing import Tuple, Optional
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

logger = logging.getLogger(__name__)

class OrbitalDataValidator:
    """
    Validates ingested orbital records against physical constraints
    and format specifications before database persistence.
    """

    @staticmethod
    def validate_record(record: NormalizedOrbitalRecord) -> Tuple[bool, Optional[str]]:
        # 1. NORAD ID check
        if not isinstance(record.norad_id, int) or record.norad_id <= 0:
            return False, f"Invalid NORAD ID: {record.norad_id}. Must be a positive integer."

        if record.norad_id > 9999999:
            return False, f"NORAD ID exceeds allowable catalog range: {record.norad_id}"

        # 2. Name check
        if not record.name or not record.name.strip():
            return False, "Missing or blank object name."

        # 3. Epoch check
        if not isinstance(record.epoch, datetime):
            return False, f"Invalid epoch type: {type(record.epoch)}. Must be a datetime."

        # Epoch sanity check: not in deep past (before 1957 Sputnik) or far future (> 5 years)
        current_year = datetime.now(timezone.utc).year
        if record.epoch.year < 1957 or record.epoch.year > current_year + 5:
            return False, f"Epoch year out of reasonable range: {record.epoch.year}"

        # 4. Eccentricity: closed Earth orbits require 0.0 <= e < 1.0
        if math.isnan(record.eccentricity) or record.eccentricity < 0.0 or record.eccentricity >= 1.0:
            return False, f"Invalid eccentricity: {record.eccentricity}. Must be in [0, 1)."

        # 5. Inclination: 0.0 <= inc <= 180.0
        if math.isnan(record.inclination) or record.inclination < 0.0 or record.inclination > 180.0:
            return False, f"Invalid inclination: {record.inclination}. Must be in [0, 180] deg."

        # 6. Mean motion: must be strictly positive (Earth satellites typically 0.05 to 20 revs/day)
        if math.isnan(record.mean_motion) or record.mean_motion <= 0.0 or record.mean_motion > 40.0:
            return False, f"Invalid mean motion: {record.mean_motion}. Must be > 0 and <= 40 rev/day."

        # 7. Angular parameters: 0 to 360 degrees
        for param_name, param_val in [
            ("ra_of_asc_node", record.ra_of_asc_node),
            ("arg_of_pericenter", record.arg_of_pericenter),
            ("mean_anomaly", record.mean_anomaly)
        ]:
            if math.isnan(param_val) or param_val < -0.01 or param_val > 360.01:
                return False, f"Invalid {param_name}: {param_val}. Must be in [0, 360] deg."

        # 8. BSTAR sanity check: typically between -1.0 and 1.0
        if math.isnan(record.bstar) or abs(record.bstar) > 10.0:
            return False, f"BSTAR parameter out of physical range: {record.bstar}"

        return True, None

orbital_validator = OrbitalDataValidator()
