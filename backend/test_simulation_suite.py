import requests
import json

def test_sim(name, conj_id, dv, direction, lead):
    url = "http://127.0.0.1:8000/api/simulation"
    payload = {
        "conjunction_id": conj_id,
        "delta_v_ms": dv,
        "thrust_direction": direction,
        "execution_lead_hours": lead
    }
    r = requests.post(url, json=payload)
    if r.status_code != 200:
        print(f"FAILED {name}: status {r.status_code}, {r.text}")
        return
    data = r.json()
    print(f"=== {name} ({conj_id}) [dv={dv}m/s, dir={direction}, lead={lead}h] ===")
    print(f"Primary: {data.get('primary_name')} vs {data.get('secondary_name')} | Baseline Risk: {data.get('original_risk_score')} | Baseline Dist: {data.get('original_miss_distance_km')} km")
    for s in data.get("scenarios", []):
        print(f"  [{s['name']}] ({s['scenario_id']})")
        print(f"    dV: {s['delta_v_ms']} m/s, Dir: {s['direction']}")
        print(f"    Miss Distance: {s['miss_distance_km']} km")
        print(f"    Risk Score: {s['risk_score']}/100 | Risk Reduction: {s['risk_reduction_pct']}%")
        print(f"    Risk Level: {s['risk_level']}")
    print()

print("----------------------------------------------------------------------")
print("VERIFICATION 1: Testing Multiple Conjunctions")
print("----------------------------------------------------------------------")
test_sim("SAT-104 vs DEB-27", "CONJ-2026-0104", 30.0, "RETROGRADE", 8.0)
test_sim("STARLINK-1007 vs FENGYUN 1C", "CONJ-2026-1002", 25.0, "PROGRADE", 6.0)
test_sim("ISS (ZARYA) vs COSMOS 2251", "CONJ-2026-1000", 35.0, "RETROGRADE", 10.0)

print("----------------------------------------------------------------------")
print("VERIFICATION 2: Testing Custom Parameter Sensitivity on Same Conjunction")
print("----------------------------------------------------------------------")
test_sim("Test A: dv=20 m/s, RETROGRADE, lead=8h", "CONJ-2026-0104", 20.0, "RETROGRADE", 8.0)
test_sim("Test B: dv=40 m/s, PROGRADE, lead=12h", "CONJ-2026-0104", 40.0, "PROGRADE", 12.0)
