# SmartTank — Project Brief

## What is SmartTank?

SmartTank is a fuel tracking and vehicle intelligence platform that helps drivers understand the true cost of their driving. Unlike general expense apps, SmartTank is purpose-built for vehicle owners — combining real-time fuel prices, EPA-verified vehicle data, and personal driving history to turn every trip into actionable financial insight.

## The Problem

Most drivers have no idea what they actually spend on fuel. Gas prices fluctuate, every car gets different real-world mileage, and CO2 emissions are invisible. Existing expense apps treat fuel as just another transaction — they don't connect cost to distance, vehicle efficiency, or driving behavior.

SmartTank closes that gap.

## Target Users

**Primary — everyday drivers** who want to track and reduce fuel expenses, similar to how Rocket Money or Mint handles general spending.

**Secondary — gig economy drivers** (Uber, DoorDash, Lyft) who need to calculate realized profit after fuel costs. A driver earning $200 on a shift but spending $45 in fuel has a very different picture than their gross earnings suggest.

**Future — automotive advertisers and dealers** who want to reach users actively comparing vehicle fuel costs.

## Core Features

### Built
- **Trip logging** — log any trip, get instant fuel cost and CO2 calculation using live EIA prices
- **Vehicle catalog** — search 49,927 EPA-verified vehicles with trim, drivetrain, and engine variants
- **Personal garage** — manage your vehicles with real-world MPG overrides
- **Fuel cost calculation** — based on your car's actual MPG and current local prices
- **CO2 tracking** — per-trip and cumulative emissions
- **User auth** — secure accounts with JWT authentication

### In Progress
- **Vehicle comparison** — compare fuel costs across models and fuel types to support buying decisions
- **ML-powered insights** — intelligent recommendations based on real driving data
- **Dashboard** — monthly spend, annual projections, driving trends
- **Frontend UI** — React web interface

### Future
- **Mobile app** — required for Bluetooth OBD-II integration (real-time fuel consumption tracking)
- **Gig economy mode** — net profit calculator for rideshare and delivery drivers
- **Trip export** — IRS-compliant mileage logs for tax deduction tracking

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python + FastAPI |
| Database | PostgreSQL |
| Vehicle Data | EPA fuel economy database (49,927 vehicles) |
| Fuel Prices | EIA Open Data API |
| ML | Python + scikit-learn |
| Frontend | React + Vite |
| Auth | JWT + bcrypt |
| Hosting | Railway |

## Team

- [toan04h](https://github.com/toan04h) — backend, database, ML
- [jtran0027](https://github.com/jtran0027) — frontend, testing

## Timeline

12-week summer project — June to August 2026