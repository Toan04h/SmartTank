# SmartTank ⛽

A full-stack fuel tracking and vehicle intelligence app. Log your trips, see what they actually cost using live fuel prices, track your CO2, and compare your car against others using your own real driving history.

**Live app:** [smart-tank.vercel.app](https://smart-tank.vercel.app) · **API docs:** [smarttank-production.up.railway.app/docs](https://smarttank-production.up.railway.app/docs)

---

## What it does

- **Live trip tracking** — start a trip and track it in real time with GPS, drawn on a Google Map
- **Trip logging** — log trips manually or from GPS; get real fuel cost and CO2 instantly
- **Multi-fuel support** — accurate cost and emissions for gasoline, diesel, and electric vehicles
- **Vehicle search** — search and filter 49,000+ EPA-verified vehicles by make, model, and year
- **Vehicle garage** — manage your vehicles, set a default, override MPG with real-world numbers
- **Vehicle comparison** — compare your default vehicle against another using your actual trip history, sized for mobile side-by-side viewing
- **Dashboard** — monthly spend, distance, fuel used, CO2, and recent trips at a glance
- **Route images** — save a screenshot of your route to each trip (stored privately on S3)

## How the cost calculation works

Every trip stores the fuel price *at the time it was logged*, so your history stays accurate even when prices change.

| Fuel type | Cost | CO2 |
|---|---|---|
| Gasoline | gallons × price/gal | 8.887 kg/gal |
| Diesel | gallons × price/gal | 10.18 kg/gal |
| Electric | gallon-equivalents × 33.7 kWh × price/kWh | 0 (tailpipe) |

Electric vehicles use the EPA's MPGe standard, where 1 gallon of gasoline = 33.7 kWh of energy. Fuel prices come from the EIA API and are localized to your state where data is available, falling back to the national average otherwise.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python + FastAPI |
| Database | PostgreSQL (Docker local / Railway deployed) |
| ORM & Migrations | SQLModel + Alembic |
| Frontend | React + Vite + Tailwind |
| Auth | JWT + bcrypt, database-backed refresh tokens |
| File Storage | AWS S3 (private bucket, presigned URLs) |
| Vehicle Data | EPA fuel economy database (49,927 vehicles) |
| Fuel & Energy Prices | EIA Open Data API |
| Maps | Google Maps (Places, Geocoding) |
| Hosting | Railway (backend + DB) · Vercel (frontend) |

## Architecture

The backend follows a layered **router → service → model** pattern:

```
backend/app/
├── routers/      # HTTP endpoints, auth guards, request/response handling
├── services/     # Business logic (cost calc, comparison, fuel pricing, storage)
├── models/       # SQLModel database tables
├── schemas/      # Pydantic request/response validation
├── core/         # Config, database session, dependencies, rate limiting
└── scripts/      # One-off tasks (EPA data import)
```

A few design decisions worth calling out:

- **Point-in-time pricing** — trips store the fuel price they were logged at, not a live lookup, so historical costs stay accurate.
- **Comparisons computed on read** — vehicle comparisons aren't stored; they're calculated fresh from your trips, so they can never go stale. The API accepts up to 4 comparison vehicles; the UI shows two side-by-side, which is what fits comfortably on a phone.
- **Private storage by default** — the S3 bucket blocks all public access. Images are served through short-lived presigned URLs, and the IAM policy is scoped to only this bucket.
- **API keys never reach the browser** — Google Maps Places/Geocoding calls are proxied through the backend.

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register a new user | ❌ |
| POST | `/auth/login` | Login; returns access + refresh token | ❌ |
| POST | `/auth/refresh` | Exchange refresh token for a new access token | ❌ |
| POST | `/auth/logout` | Revoke a refresh token | ❌ |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users/profile` | Current user profile | ✅ |
| PATCH | `/users/profile` | Update name, state, zip | ✅ |
| PATCH | `/users/password` | Change password | ✅ |
| GET | `/users/dashboard` | Monthly stats + recent trips | ✅ |

### Vehicles
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/vehicles/search` | Search the EPA catalog | ❌ |
| POST | `/vehicles` | Add a vehicle to your garage | ✅ |
| GET | `/vehicles/garage` | List your vehicles | ✅ |
| PATCH | `/vehicles/{id}` | Edit nickname or MPG override | ✅ |
| PATCH | `/vehicles/{id}/default` | Set default vehicle | ✅ |
| DELETE | `/vehicles/{id}` | Remove a vehicle | ✅ |
| GET | `/vehicles/{id}/stats` | Lifetime stats for one vehicle | ✅ |
| POST | `/vehicles/compare` | Compare vehicles using your trips | ✅ |

### Trips
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/trips` | Log a trip (manual or GPS) | ✅ |
| GET | `/trips` | Trip history | ✅ |
| GET | `/trips/{id}` | Single trip detail | ✅ |
| POST | `/trips/{id}/image-upload-url` | Get a presigned S3 upload URL | ✅ |
| PATCH | `/trips/{id}/image` | Save the uploaded image key | ✅ |
| GET | `/trips/{id}/image` | Get a presigned download URL | ✅ |

### Fuel & Maps
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/fuel/price` | Current gas, diesel, and electricity prices | ✅ |
| POST | `/cost/calculate` | Calculate cost for arbitrary distance/MPG | ✅ |
| GET | `/maps/autocomplete` | Address autocomplete (proxied) | ✅ |
| GET | `/maps/geocode` | Place ID → coordinates | ✅ |
| GET | `/maps/reverse-geocode` | Coordinates → address | ✅ |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker Desktop

### 1. Clone

```bash
git clone https://github.com/toan04h/SmartTank
cd SmartTank
```

### 2. Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env`:

```
EIA_API_KEY=your_key_here                  # free at eia.gov/opendata
GOOGLE_SERVICES_API_KEY=your_key_here      # Places API (New) + Geocoding API enabled
DATABASE_URL=postgresql://postgres:password@localhost:5432/smarttank
SECRET_KEY=your_secret_key                 # python -c "import secrets; print(secrets.token_hex(32))"
APP_ENV=development
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_S3_BUCKET=your_bucket_name
AWS_S3_REGION=your_bucket_region
```

And `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your_key_here     # Maps JavaScript API, referrer-restricted
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
alembic upgrade head          # create tables
uvicorn app.main:app --reload
```

### 5. Import vehicle data (first time only)

```bash
python -m app.scripts.import_epa_data
```

Loads 49,927 EPA-verified vehicles. Takes about 30 seconds.

### 6. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 7. API docs

Visit `http://127.0.0.1:8000/docs` for interactive API documentation.

## Database migrations

Schema changes are managed with Alembic — never edit tables by hand.

```bash
alembic revision --autogenerate -m "describe the change"   # generate
alembic upgrade head                                        # apply
```

## Project Status

Core features are complete and deployed. Built over Summer 2026.

**Known issues**
- Live trip tracking pauses when the phone screen turns off. GPS points stop being recorded, so the resulting route collapses to a straight line between the last point before the screen turned off and the first point after it — under-reporting distance on any trip that isn't a straight shot.
- Route image upload has intermittent errors

**Future work**
- Cascade delete for trips when a vehicle is removed
- Plug-in hybrid split-costing (currently approximated using the primary fuel type)
- S3 lifecycle rule for 90-day image retention

## Testing

```bash
cd backend
pytest
```

## Team

- [toan04h](https://github.com/toan04h) — backend, architecture, deployment
- [jtran0027](https://github.com/jtran0027) — frontend

## License

MIT