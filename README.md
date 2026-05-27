# SmartTank ⛽

A full-stack fuel tracking and vehicle intelligence app that helps drivers monitor real fuel costs, track CO2 emissions, compare vehicles by fuel efficiency, and make smarter vehicle decisions.

## What it does

- **Trip logging** — log a trip, get real fuel cost and CO2 instantly using live EIA fuel prices
- **Vehicle search** — search 49,000+ EPA-verified vehicles with trim, engine, and drivetrain variants
- **Vehicle garage** — manage your personal vehicles with real-world MPG overrides
- **Fuel cost calculation** — cost based on your car's actual MPG and current local fuel prices
- **CO2 tracking** — per-trip and cumulative emissions using EPA constants
- **Vehicle comparison** — compare fuel costs across different models and fuel types *(in progress)*
- **ML-powered insights** — intelligent recommendations based on your real driving data *(in progress)*

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python + FastAPI |
| Database | PostgreSQL (Docker local / Railway deployed) |
| Vehicle Data | EPA fuel economy database (49,927 vehicles) |
| Fuel Prices | EIA Open Data API (live national averages) |
| ML | Python + scikit-learn |
| Frontend | React + Vite |
| Auth | JWT + bcrypt |
| Hosting | Railway |

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /auth/register | Register a new user | ❌ |
| POST | /auth/login | Login, returns JWT | ❌ |
| GET | /fuel/price | Live national fuel price | ❌ |
| POST | /vehicles/search | Search EPA vehicle catalog | ❌ |
| POST | /vehicles | Add vehicle to garage | ✅ |
| GET | /vehicles/garage | List user's vehicles | ✅ |
| PATCH | /vehicles/{id}/default | Set default vehicle | ✅ |
| DELETE | /vehicles/{id} | Remove vehicle | ✅ |
| POST | /trips | Log a trip | ✅ |
| GET | /trips | Get trip history | ✅ |
| POST | /cost/calculate | Calculate trip cost | ✅ |

## Project Status

🚧 Active development — Summer 2026

**Done:** Auth, vehicle catalog (49,927 vehicles), trip logging, fuel price integration, CO2 tracking

**In progress:** Vehicle comparison, ML insights, frontend, Railway deployment

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker Desktop

### 1. Clone and setup

```bash
git clone https://github.com/toan04h/SmartTank
cd SmartTank
```

### 2. Environment variables

```bash
cp backend/.env.example backend/.env
```

Fill in your values in `backend/.env`:
EIA_API_KEY=your_key_here        # free at eia.gov/opendata
DATABASE_URL=postgresql://postgres:password@localhost:5432/smarttank
SECRET_KEY=your_secret_key       # python -c "import secrets; print(secrets.token_hex(32))"
APP_ENV=development

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
uvicorn app.main:app --reload
```

### 5. Import vehicle data (first time only)

```bash
python -m app.scripts.import_epa_data
```

Loads 49,927 EPA-verified vehicles into the database. Takes about 30 seconds.

### 6. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 7. API docs

Visit `http://127.0.0.1:8000/docs` for the full interactive API documentation.

## Team

- [toan04h](https://github.com/toan04h)
- [jtran0027](https://github.com/jtran0027)

## License

MIT