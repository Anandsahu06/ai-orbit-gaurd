# OrbitalGuard AI — Decision-Support Backend

OrbitalGuard AI is an AI-assisted Space Traffic Management (STM) decision-support platform designed to track orbital objects, screen close approaches, assess collision risks, simulate hypothetical avoidance maneuvers, and support operator decision-making.

> **CRITICAL SCIENTIFIC HONESTY DISCLAIMER**
> 
> OrbitalGuard AI is an **academic and research decision-support prototype**.
> - It is **NOT** an autonomous spacecraft control system.
> - It is **NOT** a replacement for NASA/ISRO/18th Space Defense Squadron (Space-Track) operational systems.
> - Orbital states are **SGP4 propagated orbital states** derived from public General Perturbations (GP) orbital data, **not live telemetry**.
> - Collision risk is evaluated as a **Prototype Risk Score**, **not a formal Probability of Collision ($P_c$)**. Formal $P_c$ requires full $6 \times 6$ covariance uncertainty ellipsoids which are not published in public GP datasets.
> - Avoidance simulations are **physics-inspired prototype simulations** intended for trade-space exploration, not flight-grade maneuver execution.

---

## 1. Product Flow

$$\text{TRACK} \longrightarrow \text{ASSESS} \longrightarrow \text{SIMULATE} \longrightarrow \text{DECIDE}$$

1. **TRACK:** Public GP orbital elements are ingested from CelesTrak, stored in PostgreSQL, and propagated using SGP4 into TEME, ECEF, and WGS84 coordinates.
2. **ASSESS:** Automated screening pipeline filters candidate pairs using orbital regime / altitude bounding boxes, samples trajectories over a 48h horizon, detects Time of Closest Approach (TCA) with Golden-Section refinement, and computes a composite Prototype Risk Score.
3. **SIMULATE:** Operators evaluate hypothetical collision avoidance burns ($\Delta v$, direction, execution lead time) using secular Gauss variational mechanics.
4. **DECIDE:** Operators review risk mitigation percentages, clearance gains, and deduplicated operational alerts.

---

## 2. System Architecture

```mermaid
graph TD
    A[CelesTrak GP API] -->|JSON/OMM| B[CelesTrakProvider]
    B --> C[Validator & Parser]
    C --> D[Ingestion Cache 2h TTL]
    D --> E[(PostgreSQL / SQLite)]
    
    E -->|Orbital Elements| F[SGP4 Orbital Engine]
    F -->|TEME -> ECEF -> WGS84| G[State & Orbit Path APIs]
    
    E --> H[Conjunction Screening Engine]
    H -->|Bounding Box Filter| I[Candidate Pairs]
    I -->|SGP4 Window Propagation| J[Sampled Minima]
    J -->|Golden-Section Search| K[Refined TCA & Rel Vel]
    
    K --> L[Modular Risk Engine]
    L -->|Physics Inputs| M[Analytical Continuum Score]
    L -->|Feature Vector| N[Random Forest Classifier]
    M --> O[Prototype Risk Tier]
    N --> O
    
    O --> P[Alert Engine with Deduplication]
    O --> Q[Avoidance Simulation Engine]
    
    G --> R[FastAPI v1 REST Endpoints]
    K --> R
    O --> R
    Q --> R
    P --> R
    R --> S[CesiumJS / React Frontend]
```

---

## 3. Technology Rationale

| Technology | Architectural Decision Rationale |
| :--- | :--- |
| **Why CelesTrak?** | Provides public, authentic General Perturbations (GP) data without requiring restricted DoD credentials. Supports modern JSON/OMM formats allowing 6-digit NORAD catalog numbers that exceed legacy 5-digit TLE limits. |
| **Why SGP4?** | Industry-standard analytic propagation theory calibrated specifically for General Perturbations (GP) mean elements, accounting for Earth oblateness ($J_2, J_3, J_4$), atmospheric drag, and lunar/solar third-body gravity. |
| **Why FastAPI?** | High-performance asynchronous Python framework with native Pydantic schema validation, OpenAPI documentation, and effortless integration with scientific computation libraries (`numpy`, `sgp4`, `scikit-learn`). |
| **Why PostgreSQL?** | ACID-compliant relational persistence with indexed queries on `norad_id`, `epoch`, `tca`, and `risk_level`. SQLAlchemy 2.0 and Alembic ensure migrations and historical orbital element retention. |
| **Why Random Forest?** | Interpretable ensemble classifier providing non-linear boundary separation across physical dimensions (miss distance, closing speed, lead time) without black-box opacity. |

---

## 4. Database Setup & Migrations

### Local PostgreSQL Setup

1. Install PostgreSQL 14+ or run via Docker:
   ```bash
   docker run --name orbitalguard-pg -e POSTGRES_USER=orbitaluser -e POSTGRES_PASSWORD=orbitalpass -e POSTGRES_DB=orbitalguard -p 5432:5432 -d postgres:16-alpine
   ```

2. Configure environment variable:
   ```env
   DATABASE_URL=postgresql+psycopg://orbitaluser:orbitalpass@localhost:5432/orbitalguard
   ```
   *(If `DATABASE_URL` is omitted, the application seamlessly defaults to SQLite `sqlite:///./orbitalguard.db` for instant local development and test runs).*

3. Run database migrations:
   ```bash
   alembic upgrade head
   ```

---

## 5. Local Backend Quickstart

1. **Create and activate virtual environment:**
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Initialize database schema:**
   ```bash
   alembic upgrade head
   ```

4. **Launch development server:**
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Access Interactive Docs:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

---

## 6. CelesTrak Ingestion & Usage Policy Compliance

To strictly adhere to [CelesTrak's Usage Policy](https://celestrak.org/usage-policy.php):
- **Download only required data:** Configurable via `CELESTRAK_GROUPS=stations,active,starlink,cosmos-2251-debris,fengyun-1c-debris`.
- **Caching & Freshness:** 2-hour TTL cache prevents polling CelesTrak repeatedly.
- **Backoff & Protection:** Retries with exponential backoff on HTTP 50x; immediately halts on 403/429 rate limits.
- **Offline / Test Resiliency:** In offline or rate-limited environments, verified public seed orbital elements populate the database automatically.

---

## 7. Mathematical & Computational Pipelines

### SGP4 Coordinate Transformations
1. **TEME $\rightarrow$ ECEF:** Rotated using Greenwich Mean Sidereal Time (GMST):
   $$\theta_{\text{GMST}} = 18.697374558 + 24.06570982441908 \cdot (JD - 2451545.0 + fr)$$
   $$\begin{pmatrix} x_{\text{ECEF}} \\ y_{\text{ECEF}} \\ z_{\text{ECEF}} \end{pmatrix} = \begin{pmatrix} \cos\theta & \sin\theta & 0 \\ -\sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{pmatrix} \begin{pmatrix} x_{\text{TEME}} \\ y_{\text{TEME}} \\ z_{\text{TEME}} \end{pmatrix}$$

2. **ECEF $\rightarrow$ Geodetic (WGS84):** Bowring's closed-form algorithm:
   $$p = \sqrt{x^2 + y^2}, \quad \theta = \text{atan2}(z \cdot a, p \cdot b)$$
   $$\phi = \text{atan2}(z + e'^2 b \sin^3\theta, p - e^2 a \cos^3\theta), \quad \lambda = \text{atan2}(y, x)$$

### Conjunction Screening & TCA Minimization
1. **$O(1)$ Candidate Altitude Filter:**
   $$r_p = a(1 - e) - R_E, \quad r_a = a(1 + e) - R_E$$
   Objects are screened only if altitude intervals $[r_{p,A} - D, r_{a,A} + D]$ and $[r_{p,B} - D, r_{a,B} + D]$ overlap.
2. **Trajectory Propagation:** SGP4 position sampling over 48h window with 300s coarse step.
3. **Golden-Section Search:** Golden-section local minimization refines TCA down to $\le 2$ second precision.

### Avoidance Maneuver Simulation
Hypothetical in-plane thrust perturbing semi-major axis produces secular along-track displacement $\Delta s$:
$$\Delta s \approx 3 \cdot \Delta v \cdot \Delta t_{\text{lead}}$$
Updated TCA miss distance:
$$d_{\text{new}} = \sqrt{d_{\text{orig}}^2 + \Delta s^2}$$

---

## 8. REST API Reference

### Official Versioned Endpoints (`/api/v1/`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health and operational role |
| `GET` | `/api/v1/satellites` | List tracked satellites with propagated state |
| `GET` | `/api/v1/satellites/{norad_id}` | Metadata and latest orbital parameters |
| `GET` | `/api/v1/satellites/{norad_id}/state` | SGP4 propagated state (WGS84 lat/lon/alt, velocity) |
| `GET` | `/api/v1/satellites/{norad_id}/orbit` | Sampled 3D orbital trajectory for CesiumJS |
| `GET` | `/api/v1/conjunctions` | Screened close approach events |
| `GET` | `/api/v1/conjunctions/{id}` | Conjunction physical geometry and TCA details |
| `GET` | `/api/v1/risk/{conjunction_id}` | Modular risk assessment with ML classification |
| `POST` | `/api/v1/simulations` | Simulate avoidance maneuver ($\Delta v$, direction, lead time) |
| `GET` | `/api/v1/simulations/{id}` | Baseline vs preset avoidance scenarios |
| `GET` | `/api/v1/alerts` | Deduplicated operational notifications |
| `GET` | `/api/v1/analytics` | Dynamic fleet breakdown and risk distributions |
| `POST` | `/api/v1/admin/data/refresh` | **Protected**: Trigger on-demand CelesTrak sync (`X-Admin-Key`) |
| `GET` | `/api/v1/admin/data/status` | **Protected**: Upstream provider health and cache metadata |

### Frontend Compatibility Endpoints (`/api/`)
Preserved endpoints supporting the existing React/Next.js frontend without requiring frontend refactors:
- `GET /api/status`
- `GET /api/dashboard/summary`
- `GET /api/satellites` & `/api/satellites/{id}`
- `GET /api/orbits/tracks`
- `GET /api/conjunctions` & `/api/conjunctions/{id}`
- `GET /api/risk/{conjunction_id}`
- `GET /api/simulations/{conjunction_id}` & `POST /api/simulations`
- `GET /api/analytics`
- `GET /api/alerts`

---

## 9. Automated Test Suite

Run unit and integration tests:
```bash
pytest tests -v
```

All 36 tests cover:
- Modern CelesTrak JSON & 6-digit NORAD ID parsing
- Orbital physical parameter validation
- SQLAlchemy database repository operations
- SGP4 propagation, GMST rotation, and Bowring WGS84 conversions
- Candidate bounding-box screening and Golden-Section TCA refinement
- Random Forest model training, evaluation metrics, and risk tier inference
- Avoidance maneuver simulation and risk reduction computation
- REST API v1 endpoints and admin security enforcement
