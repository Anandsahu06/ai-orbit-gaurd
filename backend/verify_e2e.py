import requests
import json

def verify_all():
    print("==================================================")
    print("ORBITALGUARD AI: END-TO-END VERIFICATION SUITE")
    print("==================================================")

    # 1. Frontend Server check
    r_front = requests.get("http://127.0.0.1:5173/")
    assert r_front.status_code == 200
    assert "OrbitalGuard AI" in r_front.text
    print("[PASS] Frontend HTTP Server serving index.html on :5173")

    # 2. Vite Proxy to Backend API check
    dash = requests.get("http://127.0.0.1:5173/api/dashboard/summary").json()
    assert dash["system_status"] == "System Ready"
    print(f"[PASS] Proxy /api/dashboard/summary: {dash['tracked_objects_count']} tracked objects, {dash['active_conjunctions_count']} active conjunctions, System Status: {dash['system_status']}")

    # 3. Tracked Objects Telemetry API check
    objs = requests.get("http://127.0.0.1:5173/api/objects").json()
    assert len(objs) >= 15
    sat104 = next((o for o in objs if o["norad_id"] == "100104"), None)
    assert sat104 is not None
    print(f"[PASS] Proxy /api/objects: SAT-104 telemetry lat={sat104['latitude']}, lon={sat104['longitude']}, alt={sat104['altitude_km']} km, vel={sat104['velocity_kms']} km/s")

    # 4. Trajectory calculation API check
    traj = requests.get("http://127.0.0.1:5173/api/objects/100104/trajectory").json()
    assert len(traj["points"]) >= 36
    print(f"[PASS] Proxy /api/objects/100104/trajectory: {len(traj['points'])} 3D polyline points calculated")

    # 5. Conjunction Screening API check
    conjs = requests.get("http://127.0.0.1:5173/api/conjunctions").json()
    assert len(conjs) >= 5
    demo_conj = conjs[0]
    assert demo_conj["primary_name"] == "SAT-104"
    assert demo_conj["secondary_name"] == "DEB-27"
    assert demo_conj["miss_distance_km"] == 0.42
    assert demo_conj["risk_score"] == 82.0
    assert demo_conj["risk_level"] == "HIGH"
    assert len(demo_conj["risk_factors"]) >= 3
    print(f"[PASS] Proxy /api/conjunctions: Demo close approach {demo_conj['primary_name']} vs {demo_conj['secondary_name']}: Miss={demo_conj['miss_distance_km']} km, Risk={demo_conj['risk_score']} ({demo_conj['risk_level']})")
    for f in demo_conj["risk_factors"]:
        print(f"       Factor: {f}")

    # 6. Maneuver Simulation API check
    sim_res = requests.post(
        "http://127.0.0.1:5173/api/simulation/evaluate",
        json={"conjunction_id": "CONJ-2026-0104", "delta_v_ms": 40.0, "direction": "RETROGRADE", "timing_offset_hours": 6.0}
    ).json()
    assert len(sim_res["scenarios"]) == 4 # Baseline, A, B, Custom
    print(f"[PASS] Proxy /api/simulation/evaluate: {len(sim_res['scenarios'])} scenarios evaluated successfully")
    for s in sim_res["scenarios"]:
        print(f"       -> {s['name']}: Delta-V={s['delta_v_ms']} m/s, Miss={s['miss_distance_km']} km, Risk={s['risk_score']} ({s['risk_level']}), Reduction={s['risk_reduction_pct']}%")

    # 7. Analytics API check
    analytics = requests.get("http://127.0.0.1:5173/api/analytics/summary").json()
    assert analytics["fleet_status"]["total"] >= 15
    assert len(analytics["anomaly_timeline"]) >= 5
    assert len(analytics["critical_events"]) >= 1
    print(f"[PASS] Proxy /api/analytics/summary: Fleet breakdown {analytics['fleet_status']}, Risk distribution {analytics['risk_distribution']}")

    print("==================================================")
    print("ALL END-TO-END CRITERIA VERIFIED AND OPERATIONAL!")
    print("==================================================")

if __name__ == "__main__":
    verify_all()
