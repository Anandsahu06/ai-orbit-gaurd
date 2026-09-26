import requests
import json

def test_recalculate(name, conj_id, dv, direction, lead):
    url = "http://127.0.0.1:8000/api/simulation"
    payload = {
        "conjunction_id": conj_id,
        "delta_v": dv,
        "direction": direction,
        "lead_time_hours": lead
    }
    r = requests.post(url, json=payload)
    if r.status_code != 200:
        print(f"FAILED: {name} (status {r.status_code}): {r.text}")
        return None
    data = r.json()
    custom = [s for s in data["scenarios"] if s["scenario_id"] == "SCEN-CUSTOM"][0]
    print(f"=== {name} ===")
    print(f"  Inputs: Delta-V={dv} m/s, Direction={direction}, Lead Time={lead}h")
    print(f"  Custom Scenario: {custom['name']}")
    print(f"  Miss Distance: {custom['miss_distance_km']} km")
    print(f"  Risk Score: {custom['risk_score']}/100")
    print(f"  Risk Level: {custom['risk_level']}")
    print(f"  Risk Reduction: {custom['risk_reduction_pct']}%")
    print(f"  Recommendation: {data['recommendation']}")
    print()
    return custom

print("--------------------------------------------------------------------------------")
print("TESTING SECTION 23: INPUT SENSITIVITY (SAT-104 vs DEB-27)")
print("--------------------------------------------------------------------------------")
resA = test_recalculate("Test A", "CONJ-2026-0104", 20.0, "RETROGRADE", 6.0)
resB = test_recalculate("Test B", "CONJ-2026-0104", 40.0, "PROGRADE", 6.0)
resC = test_recalculate("Test C", "CONJ-2026-0104", 40.0, "PROGRADE", 12.0)

# Verify differences
assert resA["miss_distance_km"] != resB["miss_distance_km"], "Test A and Test B miss distance must differ"
assert resB["miss_distance_km"] != resC["miss_distance_km"], "Test B and Test C miss distance must differ"
assert resA["risk_score"] != resB["risk_score"], "Test A and Test B risk score must differ"
assert resB["risk_score"] != resC["risk_score"], "Test B and Test C risk score must differ"
print(">>> ALL 3 INPUT SENSITIVITY TESTS PRODUCED DISTINCT, DETERMINISTIC RESULTS! <<<\n")

print("--------------------------------------------------------------------------------")
print("TESTING SECTION 22: MULTIPLE CONJUNCTION TESTS WITH CUSTOM INPUTS")
print("--------------------------------------------------------------------------------")
test_recalculate("STARLINK-1007 vs FENGYUN 1C", "CONJ-2026-1002", 50.0, "PROGRADE", 8.0)
test_recalculate("ISS (ZARYA) vs COSMOS 2251", "CONJ-2026-1000", 30.0, "RETROGRADE", 10.0)
