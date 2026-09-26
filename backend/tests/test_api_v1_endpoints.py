import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_health_endpoints():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_v1 = client.get("/api/v1/health")
    assert res_v1.status_code == 200
    assert res_v1.json()["api_version"] == "v1"

def test_satellites_v1_endpoints():
    # 1. List satellites
    res = client.get("/api/v1/satellites?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first_norad = data[0]["norad_id"]

    # 2. Get single satellite
    res_sat = client.get(f"/api/v1/satellites/{first_norad}")
    assert res_sat.status_code == 200
    assert res_sat.json()["norad_id"] == first_norad

    # 3. Propagated state
    res_state = client.get(f"/api/v1/satellites/{first_norad}/state")
    assert res_state.status_code == 200
    state = res_state.json()
    assert "latitude" in state
    assert "longitude" in state
    assert "altitude_km" in state
    assert state["origin"] == "SGP4 propagated orbital state"

    # 4. Orbit path
    res_orbit = client.get(f"/api/v1/satellites/{first_norad}/orbit?duration_minutes=30&step_seconds=120")
    assert res_orbit.status_code == 200
    orbit = res_orbit.json()
    assert "points" in orbit
    assert len(orbit["points"]) > 0

def test_conjunctions_v1_endpoints():
    res = client.get("/api/v1/conjunctions")
    assert res.status_code == 200
    conjs = res.json()
    assert isinstance(conjs, list)
    assert len(conjs) > 0

    first_id = conjs[0]["id"]
    res_single = client.get(f"/api/v1/conjunctions/{first_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == first_id

def test_risk_v1_endpoint():
    res_conjs = client.get("/api/v1/conjunctions")
    first_id = res_conjs.json()[0]["id"]

    res_risk = client.get(f"/api/v1/risk/{first_id}")
    assert res_risk.status_code == 200
    risk = res_risk.json()
    assert "risk_score" in risk
    assert "risk_level" in risk
    assert "Formal Pc: Not available in current prototype" in risk["formal_pc"]

def test_simulations_v1_endpoints():
    res_conjs = client.get("/api/v1/conjunctions")
    first_id = res_conjs.json()[0]["id"]

    # GET scenarios
    res_get = client.get(f"/api/v1/simulations/{first_id}")
    assert res_get.status_code == 200
    assert len(res_get.json()["scenarios"]) >= 3

    # POST custom simulation
    payload = {
        "conjunction_id": first_id,
        "delta_v_ms": 18.5,
        "direction": "RETROGRADE",
        "timing_offset_hours": 6.0
    }
    res_post = client.post("/api/v1/simulations", json=payload)
    assert res_post.status_code == 200
    assert res_post.json()["conjunction_id"] == first_id

def test_alerts_v1_endpoint():
    res = client.get("/api/v1/alerts")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_analytics_v1_endpoint():
    res = client.get("/api/v1/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "fleet" in data
    assert "risk_distribution" in data

def test_admin_endpoint_security():
    # Without header -> 403 Forbidden
    res_unauth = client.get("/api/v1/admin/data/status")
    assert res_unauth.status_code == 403

    # With header -> 200 OK
    headers = {"X-Admin-Key": settings.ADMIN_API_KEY}
    res_auth = client.get("/api/v1/admin/data/status", headers=headers)
    assert res_auth.status_code == 200
    assert "upstream_provider" in res_auth.json()

def test_frontend_compatibility_endpoints():
    # Frontend calls /api/status, /api/satellites, /api/conjunctions, /api/orbits/tracks
    res_status = client.get("/api/status")
    assert res_status.status_code == 200
    assert "connected" in res_status.json()

    res_sats = client.get("/api/satellites")
    assert res_sats.status_code == 200
    assert isinstance(res_sats.json(), list)

    res_tracks = client.get("/api/orbits/tracks")
    assert res_tracks.status_code == 200
    assert isinstance(res_tracks.json(), list)
