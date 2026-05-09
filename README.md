# SmartTank ⛽

A fuel tracking and route optimization app that helps drivers monitor fuel usage, calculate real trip costs, compare fuel-efficient routes, and predict monthly expenses.

## Features

- 🗺️ Fuel-optimized route comparison
- 💰 Real-time trip cost calculation based on local fuel prices
- 🌱 CO2 emission tracking per trip
- 📊 Monthly expense dashboard and annual projections
- 🤖 ML-based fuel expense forecasting

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + FastAPI |
| Frontend | React + Vite |
| Database | PostgreSQL |
| ML | Python + Prophet |
| Hosting | Railway |

## Project Status

🚧 In development — Summer 2026

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL
- Docker Desktop

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Team

- [toan04h](https://github.com/toan04h)
- Teammate (link when they join)

## License
MIT