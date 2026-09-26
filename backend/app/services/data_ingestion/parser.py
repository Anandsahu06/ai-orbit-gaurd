import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

logger = logging.getLogger(__name__)

def parse_iso_epoch(epoch_str: str) -> datetime:
    """Parses ISO-8601 epoch string with or without microsecond into UTC datetime."""
    # Strip any trailing Z or offset and parse
    clean_str = epoch_str.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        # Fallback for common CelesTrak format variations
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
            try:
                dt = datetime.strptime(epoch_str[:26], fmt)
                return dt.replace(tzinfo=timezone.utc)
            except Exception:
                pass
        raise ValueError(f"Unable to parse epoch string: {epoch_str}")

def compute_tle_checksum(line_without_checksum: str) -> int:
    """Computes standard TLE modulo 10 checksum."""
    s = 0
    for char in line_without_checksum:
        if char.isdigit():
            s += int(char)
        elif char == "-":
            s += 1
    return s % 10

def format_bstar_tle(bstar: float) -> str:
    """Formats BSTAR floating value into 8-character exponential TLE notation."""
    if bstar == 0.0 or math.isnan(bstar):
        return " 00000-0"
    sign = "-" if bstar < 0 else " "
    abs_val = abs(bstar)
    exp = int(math.floor(math.log10(abs_val))) + 1
    mantissa = int(round(abs_val * (10 ** (5 - exp))))
    exp_sign = "+" if exp >= 0 else "-"
    abs_exp = abs(exp)
    return f"{sign}{mantissa:05d}{exp_sign}{abs_exp:1d}"[:8]

def synthesize_tle_lines(record: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """Synthesizes valid 2-line TLE format for 5-digit NORAD IDs if not present."""
    norad_id = int(record.get("NORAD_CAT_ID", 0))
    if norad_id <= 0 or norad_id > 99999:
        # 6-digit or higher catalog numbers cannot be directly represented in standard 5-digit TLE
        return None, None

    epoch_dt = parse_iso_epoch(record.get("EPOCH", ""))
    day_of_year = epoch_dt.timetuple().tm_yday
    fraction_of_day = (
        epoch_dt.hour * 3600 + epoch_dt.minute * 60 + epoch_dt.second + epoch_dt.microsecond * 1e-6
    ) / 86400.0
    two_digit_year = epoch_dt.year % 100
    epoch_tle = f"{two_digit_year:02d}{day_of_year + fraction_of_day:012.8f}"

    int_desig = str(record.get("OBJECT_ID", "98067A")).replace("-", "").strip()[:8].ljust(8)
    n_dot = float(record.get("MEAN_MOTION_DOT", 0.0))
    n_dot_sign = "-" if n_dot < 0 else " "
    n_dot_str = f"{n_dot_sign}.{int(abs(n_dot) * 1e8):08d}"[:10]

    bstar_str = format_bstar_tle(float(record.get("BSTAR", 0.0)))
    el_set = int(record.get("ELEMENT_SET_NO", 999)) % 1000

    line1_base = f"1 {norad_id:05d}U {int_desig} {epoch_tle} {n_dot_str}  00000-0 {bstar_str} 0 {el_set:4d}"
    line1 = f"{line1_base}{compute_tle_checksum(line1_base)}"

    inc = float(record.get("INCLINATION", 0.0))
    raan = float(record.get("RA_OF_ASC_NODE", 0.0))
    ecc = int(round(float(record.get("ECCENTRICITY", 0.0)) * 1e7))
    argp = float(record.get("ARG_OF_PERICENTER", 0.0))
    ma = float(record.get("MEAN_ANOMALY", 0.0))
    mm = float(record.get("MEAN_MOTION", 0.0))
    rev = int(record.get("REV_AT_EPOCH", 0)) % 100000

    line2_base = f"2 {norad_id:05d} {inc:8.4f} {raan:8.4f} {ecc:07d} {argp:8.4f} {ma:8.4f} {mm:11.8f}{rev:5d}"
    line2 = f"{line2_base}{compute_tle_checksum(line2_base)}"

    return line1, line2

from typing import Tuple

class OrbitalDataParser:
    """
    Parses orbital datasets (JSON/OMM, CSV, TLE) into NormalizedOrbitalRecord.
    """

    @staticmethod
    def parse_celestrak_json_item(item: Dict[str, Any], group: str = "active") -> NormalizedOrbitalRecord:
        """Parses a single CelesTrak GP JSON item into a NormalizedOrbitalRecord."""
        norad_id = int(item["NORAD_CAT_ID"])
        name = str(item.get("OBJECT_NAME", f"OBJECT-{norad_id}")).strip()
        epoch_str = item["EPOCH"]
        epoch = parse_iso_epoch(epoch_str)

        mean_motion = float(item["MEAN_MOTION"])
        eccentricity = float(item["ECCENTRICITY"])
        inclination = float(item["INCLINATION"])
        ra_of_asc_node = float(item["RA_OF_ASC_NODE"])
        arg_of_pericenter = float(item["ARG_OF_PERICENTER"])
        mean_anomaly = float(item["MEAN_ANOMALY"])
        bstar = float(item.get("BSTAR", 0.0))
        mean_motion_dot = float(item.get("MEAN_MOTION_DOT", 0.0))
        mean_motion_ddot = float(item.get("MEAN_MOTION_DDOT", 0.0))
        int_desig = item.get("OBJECT_ID")

        # Determine object type from name and group
        obj_name_upper = name.upper()
        if "DEB" in obj_name_upper or "DEBRIS" in obj_name_upper or "debris" in group.lower():
            obj_type = "DEBRIS"
        elif "R/B" in obj_name_upper or "ROCKET" in obj_name_upper:
            obj_type = "ROCKET BODY"
        elif "ISS" in obj_name_upper or "TIANGONG" in obj_name_upper or "STATION" in obj_name_upper or group == "stations":
            obj_type = "SPACE STATION"
        else:
            obj_type = "PAYLOAD"

        tle1, tle2 = synthesize_tle_lines(item)

        return NormalizedOrbitalRecord(
            norad_id=norad_id,
            name=name,
            epoch=epoch,
            mean_motion=mean_motion,
            eccentricity=eccentricity,
            inclination=inclination,
            ra_of_asc_node=ra_of_asc_node,
            arg_of_pericenter=arg_of_pericenter,
            mean_anomaly=mean_anomaly,
            bstar=bstar,
            international_designator=int_desig,
            object_type=obj_type,
            mean_motion_dot=mean_motion_dot,
            mean_motion_ddot=mean_motion_ddot,
            tle_line1=tle1,
            tle_line2=tle2,
            source="CELESTRAK",
            raw_format="JSON_GP",
            fetched_at=datetime.now(timezone.utc)
        )

    @classmethod
    def parse_celestrak_json_list(cls, items: List[Dict[str, Any]], group: str = "active") -> List[NormalizedOrbitalRecord]:
        records = []
        for it in items:
            try:
                rec = cls.parse_celestrak_json_item(it, group=group)
                records.append(rec)
            except Exception as e:
                logger.warning(f"Error parsing CelesTrak item {it.get('NORAD_CAT_ID')}: {e}")
        return records

orbital_parser = OrbitalDataParser()
