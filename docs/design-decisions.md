# SmartTank — Design Decisions & Engineering Story

A record of key technical decisions made during development, including the reasoning behind each choice and what we learned. Written for portfolio and interview reference.

---

## 1. Vehicle Data — EPA CSV Import vs Live API

**The problem:**
Initially built vehicle search using live API calls to NHTSA (vehicle validation) and the EPA fuel economy API (MPG data). This approach had multiple reliability issues:

- EPA returned `null` for recent model years (2025+)
- EPA returned a single object instead of an array when only one result existed
- NHTSA and EPA used different model naming conventions ("IS 300" vs "IS", "Camry Hybrid" vs "Camry")
- Live API calls added 2-3 seconds of latency per search
- Hybrid and EV variants were inconsistently represented

**The decision:**
Replace all live API calls with a one-time CSV import from the EPA bulk data download (`vehicles.csv`), which contains all 49,927 vehicles from 1984 to present.

**Why this is better:**
- Instant search — querying our own PostgreSQL is milliseconds vs seconds
- No external dependencies at runtime — search works even if EPA is down
- All variants included natively: trim levels (LE, SE, XLE), drivetrain (AWD/FWD/RWD), hybrid, PHEV, EV
- No naming mismatch issues — model names are consistent within one dataset
- Single annual update process when EPA releases new data

**What we learned:**
Government APIs are unreliable for production use. The EPA API had inconsistent response formats, missing data for recent years, and no rate limit documentation. Moving to a local database copy is a standard production pattern for stable reference data that doesn't change frequently.

---

## 2. Authentication — JWT with bcrypt

**The decision:**
Implemented JWT-based authentication with bcrypt password hashing rather than using a third-party auth service like Clerk or Auth0.

**Why:**
- Learning value — understanding JWT structure, signing, expiry, and validation is fundamental backend knowledge
- No external dependency for a core security feature
- Full control over token payload and expiry

**Key implementation details:**
- Passwords hashed with bcrypt before storage — never stored in plain text
- JWT contains only `sub` (user UUID) and `exp` (expiry) — no sensitive data
- Both wrong email and wrong password return identical 401 responses — prevents user enumeration attacks
- `get_current_user` dependency uses an isolated session to prevent SQLAlchemy session conflicts

**What we learned:**
Session management in SQLAlchemy is subtle. We hit a "not persistent within this Session" error caused by `get_current_user` and the endpoint sharing a session, causing objects to expire after commit. Fixed by giving `get_current_user` its own isolated session and setting `expire_on_commit=False` on the session factory.

---

## 3. Database Design — Separation of Vehicle Catalog and User Vehicles

**The decision:**
Two separate tables: `vehicle_catalog` (global EPA reference data) and `user_vehicles` (personal garage linking to the catalog).

**Why:**
- Clean separation between public reference data and user-specific data
- Users can link to a catalog entry OR enter manually if their vehicle isn't in the EPA database
- `mpg_override` on `user_vehicles` lets users correct for their real-world MPG vs EPA rating
- The catalog never changes per user — one row per EPA vehicle configuration shared across all users

**MPG resolution logic:**
if user_vehicle.mpg_override is not None:
use mpg_override      ← user's real-world experience
else:
use catalog.combined_mpg   ← EPA rating

---

## 4. Trip Data — Storing Calculated Values

**The decision:**
Store `gallons_used`, `fuel_price`, `trip_cost`, and `co2_kg` directly on the trip record rather than recalculating on read.

**Why:**
Fuel prices change daily. If we stored only distance and recalculated cost at read time, a trip from 6 months ago would show today's fuel price — historically inaccurate and misleading.

Storing calculated values at write time preserves the exact economics of when the trip happened. This is called **point-in-time accuracy** — important for any financial tracking application.

**The tradeoff:**
Slightly more storage per trip. Worth it for correctness.

---

## 5. API Design — Separation of Concerns

**The pattern:**
Every feature follows a three-layer structure:
- **Router** — handles HTTP (request/response, auth, error codes)
- **Service** — handles business logic (calculations, external calls, data transformation)
- **Model** — handles database schema

**Why:**
- Routers that contain business logic become untestable and hard to reuse
- Services can be unit tested without running a web server
- Changes to business logic don't require touching HTTP layer

**Example:**
`calculate_trip_cost` in `calculation_service.py` is a pure function — takes distance, MPG, price, returns a dict. It has no knowledge of HTTP, databases, or FastAPI. This means it can be tested with a simple `assert`, called from multiple endpoints, and understood in isolation.

---

## 6. Vehicle Search UX — Two-Step Flow

**The decision:**
Vehicle search returns all matching EPA configurations (make + model + year → list of variants). User picks one by `catalog_id` to add to their garage.

**Why this over a single-step flow:**
- The same "Toyota Camry 2023" has 10 different configurations — V6, 4cyl, AWD, FWD, Hybrid LE, Hybrid SE
- Each has significantly different MPG (22 combined for V6 vs 52 for Hybrid LE)
- Single-step would arbitrarily pick one — wrong for most users
- Two-step mirrors how every serious automotive platform works (Edmunds, CarGurus, fueleconomy.gov)
